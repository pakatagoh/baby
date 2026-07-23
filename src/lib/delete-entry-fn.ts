import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { parseStoredPathFromUrl } from "./imgproxy-url";

const ORIGINALS = process.env.IMAGE_ORIGINALS_DIR || "/images/originals";

const DeleteEntrySchema = z.object({
  rowIndex: z.number().int().positive(),
  imageUrl: z.string().optional(),
});

export const deleteMilkEntry = createServerFn({ method: "POST" })
  .validator((body: unknown) => {
    return DeleteEntrySchema.parse(body);
  })
  .handler(async ({ data }) => {
    // 1. Delete the image file from the local filesystem first
    if (data.imageUrl) {
      const storedPath = parseStoredPathFromUrl(data.imageUrl);
      if (storedPath) {
        const fullPath = path.join(ORIGINALS, storedPath);
        try {
          await unlink(fullPath);
        } catch (err: unknown) {
          // File already gone or never existed — not a blocker.
          // Only re-throw if it's something other than ENOENT.
          const code = (err as NodeJS.ErrnoException)?.code;
          if (code && code !== "ENOENT") {
            console.error("[delete-entry] Failed to unlink image:", fullPath, err);
          }
        }
      }
    }

    // 2. Delete the row from Google Sheets
    const { deleteEntry } = await import("./sheets");
    await deleteEntry(data.rowIndex);
  });
