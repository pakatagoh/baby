import { analyzeMilkPacket, type MilkPacketResult } from "./ai";
import { saveUpload, generateImgproxyUrl } from "./images";
import { appendToSheet } from "./sheets";

export interface UploadResult {
  previewUrl: string;
  result: MilkPacketResult;
}

/**
 * Serialize uploads through a single in-process queue.
 *
 * The old job worker processed one image at a time, which kept Google Sheets
 * row allocation race-free — `appendToSheet` reads the last used row and then
 * writes the next one, so two concurrent appends would both pick the same row
 * and clobber each other. The UI now fires uploads concurrently (so the user
 * can keep snapping), so this queue restores that one-at-a-time guarantee on
 * the server while each client entry still shows its own independent status.
 *
 * NOTE: this only serializes within a single server process. If you ever run
 * multiple replicas, switch `appendToSheet` to the Sheets `values.append` API
 * (atomic end-of-table insert) instead of relying on this queue.
 */
let chain: Promise<unknown> = Promise.resolve();

export function processUpload(file: File): Promise<UploadResult> {
  const run = chain.then(async () => {
    const { storedPath, optimizedBase64 } = await saveUpload(file, "milk");
    const previewUrl = generateImgproxyUrl(storedPath, 400, 400);

    const result = await analyzeMilkPacket(optimizedBase64, "image/jpeg");

    await appendToSheet({
      date: result.date,
      time: result.time,
      amount: result.amount_ml,
      packets: result.packets,
      totalFrozen: 0,
      totalUsed: 0,
      notes: result.notes || "",
      imageUrl: previewUrl,
    });

    return { previewUrl, result };
  });

  // Keep the chain alive even if a step rejects, so one failure doesn't stall
  // every subsequent upload.
  chain = run.catch(() => {});
  return run;
}
