import { analyzeMilkPacket, type MilkPacketResult } from "./ai";
import { saveUpload, generateImgproxyUrl } from "./images";
import { generateImgproxySrcSet } from "./imgproxy-url";
import { appendToSheet } from "./sheets";
import { appendActivity } from "./activity-log";
import { currentSgtISO } from "./frozen-date";

const sgtISO = currentSgtISO;

async function enqueueNewEntryNotification(
  deviceId: string | undefined,
  sourceEntryIds: string[],
  details: { amountMl: number; packetCount: number; frozenAt: string },
): Promise<void> {
  if (!deviceId || sourceEntryIds.length === 0) return;
  try {
    const [{ getDatabase }, { notifyMilkEntryCreated }] = await Promise.all([
      import("./db"),
      import("./notification-service"),
    ]);
    await notifyMilkEntryCreated(getDatabase().db, {
      deviceId,
      sourceEntryIds,
      details,
    });
  } catch (error) {
    console.error(
      "[notifications] enqueue failed:",
      error instanceof Error ? error.message : "unknown error",
    );
  }
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

/** Save, analyze, and append a single photographed milk packet. */

export async function processUpload(file: File, deviceId?: string): Promise<UploadResult> {
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

  await enqueueNewEntryNotification(deviceId, [id], {
    amountMl: result.amount_ml,
    packetCount: result.packets,
    frozenAt: result.frozenAt,
  });

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
  deviceId?: string,
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
  try {
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
      await appendActivity({
        eventType: "milk_frozen",
        frozenMilkEntryId: id,
      });
    }
  } catch (error) {
    await enqueueNewEntryNotification(deviceId, ids, {
      amountMl: result.amount_ml,
      packetCount: ids.length,
      frozenAt: result.frozenAt,
    });
    throw error;
  }
  console.log("[process-upload] batch: sheet done, ids:", ids);
  await enqueueNewEntryNotification(deviceId, ids, {
    amountMl: result.amount_ml,
    packetCount: ids.length,
    frozenAt: result.frozenAt,
  });

  return { ids, previewUrl, srcSetThumb, result };
}
