import { analyzeMilkPacket, type MilkPacketResult } from "./ai";
import { saveUpload, generateImgproxyUrl } from "./images";
import { generateImgproxySrcSet } from "./imgproxy-url";
import { appendToSheet } from "./sheets";

/** Current time as ISO 8601 in SGT (+08:00). */
function sgtISO(): string {
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return now.toISOString().replace("Z", "+08:00");
}

export interface UploadResult {
  id: string;
  previewUrl: string;
  srcSetThumb: string;
  result: MilkPacketResult;
}

export interface BatchUploadResult {
  ids: string[];
  previewUrl: string;
  srcSetThumb: string;
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
    console.log("[process-upload] starting saveUpload");
    const { storedPath, optimizedBase64 } = await saveUpload(file, "milk");
    console.log("[process-upload] saved to:", storedPath, "base64 length:", optimizedBase64.length);

    const previewUrl = generateImgproxyUrl(storedPath, 400, 400);
    const srcSetThumb = generateImgproxySrcSet(storedPath, [64, 128, 256]);
    console.log("[process-upload] previewUrl:", previewUrl);

    console.log("[process-upload] starting AI analysis");
    const result = await analyzeMilkPacket(optimizedBase64, "image/jpeg");
    console.log("[process-upload] AI result:", result);

    console.log("[process-upload] appending to sheet");
    const { id } = await appendToSheet({
      id: "",
      date: result.date,
      time: result.time,
      amount: result.amount_ml,
      packets: result.packets,
      totalFrozen: 0,
      totalUsed: 0,
      notes: "",
      imageUrl: previewUrl,
      // Metadata
      createdAt: sgtISO(),
      updatedAt: "",
      used: false,
      usedAt: "",
    });
    console.log("[process-upload] sheet append done, id:", id);

    return { id, previewUrl, srcSetThumb, result };
  });

  // Keep the chain alive even if a step rejects, so one failure doesn't stall
  // every subsequent upload.
  chain = run.catch(() => {});
  return run;
}

/**
 * Batch upload: saves the image once, runs AI analysis once, then appends
 * N rows (one per packet) to the sheet. Uses the same serialised queue to
 * prevent row clobber.
 */
export function processBatchUpload(
  file: File,
  packetCount: number,
): Promise<BatchUploadResult> {
  const run = chain.then(async () => {
    console.log("[process-upload] batch: starting saveUpload");
    const { storedPath, optimizedBase64 } = await saveUpload(file, "milk");
    console.log("[process-upload] batch: saved to:", storedPath);

    const previewUrl = generateImgproxyUrl(storedPath, 400, 400);
    const srcSetThumb = generateImgproxySrcSet(storedPath, [64, 128, 256]);
    console.log("[process-upload] batch: previewUrl:", previewUrl);

    console.log("[process-upload] batch: starting AI analysis");
    const result = await analyzeMilkPacket(optimizedBase64, "image/jpeg");
    console.log("[process-upload] batch: AI result:", result);

    console.log("[process-upload] batch: appending %d rows to sheet", packetCount);
    const ids: string[] = [];
    const now = sgtISO();
    for (let i = 0; i < packetCount; i++) {
      const { id } = await appendToSheet({
        id: "",
        date: result.date,
        time: result.time,
        amount: result.amount_ml,
        packets: 1, // always 1 per row after unrolling
        totalFrozen: 0,
        totalUsed: 0,
        notes: "",
        imageUrl: previewUrl,
        createdAt: now,
        updatedAt: "",
        used: false,
        usedAt: "",
      });
      ids.push(id);
    }
    console.log("[process-upload] batch: sheet done, ids:", ids);

    return { ids, previewUrl, srcSetThumb, result };
  });

  chain = run.catch(() => {});
  return run;
}
