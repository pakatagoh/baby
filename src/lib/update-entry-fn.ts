import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const UpdateEntrySchema = z.object({
  rowIndex: z.number().int().positive(),
  date: z.string().optional(),
  time: z.string().optional(),
  amount: z.number().int().positive().optional(),
  packets: z.number().int().positive().optional(),
  totalUsed: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

export const updateEntry = createServerFn({ method: "POST" })
  .validator((body: unknown) => {
    return UpdateEntrySchema.parse(body);
  })
  .handler(async ({ data }) => {
    const { updateEntry } = await import("./sheets");
    await updateEntry(data.rowIndex, data);
  });
