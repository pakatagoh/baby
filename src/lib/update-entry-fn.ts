import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const UpdateEntrySchema = z.object({
  rowIndex: z.number().int().positive(),
  frozenAt: z.string().datetime({ offset: true }).optional(),
  amount: z.number().int().positive().optional(),
  packets: z.number().int().positive().optional(),
  totalUsed: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  used: z.boolean().optional(),
  usedAt: z.string().optional(),
  entryId: z.string().optional(),
  deviceId: z.string().trim().min(1).optional(),
  notifyUsed: z.boolean().optional(),
});

export const updateEntry = createServerFn({ method: "POST" })
  .validator((body: unknown) => {
    return UpdateEntrySchema.parse(body);
  })
  .handler(async ({ data }) => {
    const sheets = await import("./sheets");
    let previousUsed: boolean | undefined;
    if (data.used !== undefined && data.entryId) {
      const existing = (await sheets.getAllEntries()).find((entry) => entry.id === data.entryId);
      previousUsed = existing?.used;
    }

    const { updateEntry } = sheets;
    await updateEntry(data.rowIndex, data);

    const usedChanged =
      data.used !== undefined &&
      data.entryId &&
      previousUsed !== undefined &&
      data.used !== previousUsed;
    if (usedChanged) {
      const { appendActivity } = await import("./activity-log");
      const eventType = data.used ? "entry_used" : "entry_unused";
      await appendActivity({
        eventType,
        frozenMilkEntryId: data.entryId,
      });
    }

    if (
      data.used === true &&
      data.notifyUsed !== false &&
      data.deviceId &&
      data.entryId &&
      previousUsed === false
    ) {
      const [{ getDatabase }, { notifyEntriesUsed }] = await Promise.all([
        import("./db"),
        import("./notification-service"),
      ]);
      try {
        await notifyEntriesUsed(getDatabase().db, {
          deviceId: data.deviceId,
          sourceEntryIds: [data.entryId],
          details: {
            packetCount: 1,
            amountMl: data.amount,
            usedAt: data.usedAt || new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error(
          "[notifications] used-entry enqueue failed:",
          error instanceof Error ? error.message : "unknown error",
        );
      }
    }

    return { usedTransition: data.used === true && previousUsed === false };
  });

export const notifyUsedEntries = createServerFn({ method: "POST" })
  .validator((body: unknown) =>
    z.object({
      deviceId: z.string().trim().min(1),
      sourceEntryIds: z.array(z.string().min(1)).min(1),
      packetCount: z.number().int().positive(),
      usedAt: z.string().datetime({ offset: true }),
    }).parse(body),
  )
  .handler(async ({ data }) => {
    const [{ getDatabase }, { notifyEntriesUsed: notify }] = await Promise.all([
      import("./db"),
      import("./notification-service"),
    ]);
    try {
      return await notify(getDatabase().db, {
        deviceId: data.deviceId,
        sourceEntryIds: data.sourceEntryIds,
        details: { packetCount: data.packetCount, usedAt: data.usedAt },
      });
    } catch (error) {
      console.error(
        "[notifications] used-entry enqueue failed:",
        error instanceof Error ? error.message : "unknown error",
      );
      return null;
    }
  });
