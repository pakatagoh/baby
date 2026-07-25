import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ManualEntrySchema = z.object({
  frozenAt: z
    .string()
    .datetime({ offset: true })
    .refine((value) => value.endsWith("+08:00"), "Frozen time must be in Singapore time"),
  amount: z.number().int().min(1).max(1000),
  packetCount: z.number().int().min(1).max(50),
  notes: z.string().max(2_000),
});

/** Add one sheet row for each manually entered milk packet. */
export const createManualEntry = createServerFn({ method: "POST" })
  .validator((body: unknown) => ManualEntrySchema.parse(body))
  .handler(async ({ data }) => {
    const [{ appendToSheet }, { appendActivity }, { enqueueMilkWrite }, { currentSgtISO }] =
      await Promise.all([
        import("./sheets"),
        import("./activity-log"),
        import("./milk-write-queue"),
        import("./frozen-date"),
      ]);

    return enqueueMilkWrite(async () => {
      const createdAt = currentSgtISO();
      const ids: string[] = [];

      for (let i = 0; i < data.packetCount; i++) {
        const { id } = await appendToSheet({
          id: "",
          frozenAt: data.frozenAt,
          amount: data.amount,
          packets: 1,
          totalFrozen: 0,
          totalUsed: 0,
          notes: data.notes,
          imageUrl: "",
          createdAt,
          updatedAt: "",
          used: false,
          usedAt: "",
        });
        ids.push(id);
      }

      await appendActivity({
        eventType: "milk_frozen",
        frozenMilkEntryId: ids[0],
      });

      return { ids };
    });
  });
