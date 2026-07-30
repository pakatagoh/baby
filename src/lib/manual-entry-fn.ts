import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ManualEntrySchema = z.object({
  frozenAt: z
    .string()
    .datetime({ offset: true })
    .refine(
      (value) => value.endsWith("+08:00"),
      "Frozen time must be in Singapore time",
    ),
  amount: z.number().int().min(1).max(1000),
  packetCount: z.number().int().min(1).max(50),
  notes: z.string().max(2_000),
  deviceId: z.string().trim().min(1).optional(),
});

/** Add one sheet row for each manually entered milk packet. */
export const createManualEntry = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    const image = form.get("image");
    const hasImage = image instanceof File && image.size > 0;

    if (hasImage && !image.type.startsWith("image/")) {
      throw new Error("Photo must be an image");
    }
    if (hasImage && image.size > 20 * 1024 * 1024) {
      throw new Error("Photo is too large (max 20MB)");
    }

    return {
      ...ManualEntrySchema.parse({
        frozenAt: form.get("frozenAt"),
        amount: Number(form.get("amount")),
        packetCount: Number(form.get("packetCount")),
        notes: form.get("notes") ?? "",
        deviceId: String(form.get("deviceId") ?? "").trim() || undefined,
      }),
      image: hasImage ? image : null,
    };
  })
  .handler(async ({ data }) => {
    const [
      { appendToSheet },
      { appendActivity },
      { currentSgtISO },
      { saveUpload, generateImgproxyUrl },
      { getDatabase },
      { notifyMilkEntryCreated },
    ] = await Promise.all([
      import("./sheets"),
      import("./activity-log"),
      import("./frozen-date"),
      import("./images"),
      import("./db"),
      import("./notification-service"),
    ]);

    let imageUrl = "";
    if (data.image) {
      const { storedPath } = await saveUpload(data.image, "milk");
      imageUrl = generateImgproxyUrl(storedPath, 400, 400);
    }

    const createdAt = currentSgtISO();
    const ids: string[] = [];

    const notifyConfirmed = async () => {
      if (!data.deviceId || ids.length === 0) return;
      try {
        await notifyMilkEntryCreated(getDatabase().db, {
          deviceId: data.deviceId,
          sourceEntryIds: ids,
          details: {
            amountMl: data.amount,
            packetCount: ids.length,
            frozenAt: data.frozenAt,
          },
        });
      } catch (error) {
        console.error(
          "[notifications] enqueue failed:",
          error instanceof Error ? error.message : "unknown error",
        );
      }
    };

    try {
      for (let i = 0; i < data.packetCount; i++) {
        const { id } = await appendToSheet({
          id: "",
          frozenAt: data.frozenAt,
          amount: data.amount,
          packets: 1,
          totalFrozen: 0,
          totalUsed: 0,
          notes: data.notes,
          imageUrl,
          createdAt,
          updatedAt: "",
          used: false,
          usedAt: "",
        });
        ids.push(id);
      }
    } catch (error) {
      await notifyConfirmed();
      throw error;
    }

    await notifyConfirmed();
    await appendActivity({
      eventType: "milk_frozen",
      frozenMilkEntryId: ids[0],
    });

    return { ids };
  });
