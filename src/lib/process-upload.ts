import { analyzeMilkPacket, type MilkPacketResult } from "./ai";
import { saveUpload, generateImgproxyUrl } from "./images";
import { generateImgproxySrcSet } from "./imgproxy-url";
import { appendToSheet } from "./sheets";
import { appendActivity } from "./activity-log";
import { currentSgtISO } from "./frozen-date";

const sgtISO = currentSgtISO;

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

/** Save, analyze, and append a single photographed milk packet. */

export async function processUpload(file: File): Promise<UploadResult> {
  console.log("[process-upload] starting saveUpload");
  const { storedPath, optimizedBase64 } = await saveUpload(file, "milk");
  console.log(
    "[process-upload] saved to:",
    storedPath,
    "base64 length:",
    optimizedBase64.length,
  );

  const previewUrl = generateImgproxyUrl(storedPath, 400, 400);
  const srcSetThumb = generateImgproxySrcSet(storedPath, [64, 128, 256]);
  console.log("[process-upload] previewUrl:", previewUrl);

  console.log("[process-upload] starting AI analysis");
  const result = await analyzeMilkPacket(optimizedBase64, "image/jpeg");
  console.log("[process-upload] AI result:", result);

  console.log("[process-upload] appending to sheet");
  const { id } = await appendToSheet({
    id: "",
    frozenAt: result.frozenAt,
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

  // Log the event
  await appendActivity({
    eventType: "milk_frozen",
    frozenMilkEntryId: id,
  });

  return { id, previewUrl, srcSetThumb, result };
}

/**
 * Batch upload: saves the image once, runs AI analysis once, then appends
 * one sheet row per packet.
 */
export async function processBatchUpload(
  file: File,
  packetCount: number,
): Promise<BatchUploadResult> {
  console.log("[process-upload] batch: starting saveUpload");
  const { storedPath, optimizedBase64 } = await saveUpload(file, "milk");
  console.log("[process-upload] batch: saved to:", storedPath);

  const previewUrl = generateImgproxyUrl(storedPath, 400, 400);
  const srcSetThumb = generateImgproxySrcSet(storedPath, [64, 128, 256]);
  console.log("[process-upload] batch: previewUrl:", previewUrl);

  console.log("[process-upload] batch: starting AI analysis");
  const result = await analyzeMilkPacket(optimizedBase64, "image/jpeg");
  console.log("[process-upload] batch: AI result:", result);

  console.log(
    "[process-upload] batch: appending %d rows to sheet",
    packetCount,
  );
  const ids: string[] = [];
  const now = sgtISO();
  for (let i = 0; i < packetCount; i++) {
    const { id } = await appendToSheet({
      id: "",
      frozenAt: result.frozenAt,
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

  // Log one event for the batch
  await appendActivity({
    eventType: "milk_frozen",
    frozenMilkEntryId: ids[0],
  });

  return { ids, previewUrl, srcSetThumb, result };
}
