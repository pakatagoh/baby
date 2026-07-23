import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export { generateImgproxyUrl, parseStoredPathFromUrl, generateImgproxySrcSet } from "./imgproxy-url";

const ORIGINALS = process.env.IMAGE_ORIGINALS_DIR || "/images/originals";
const MAX_DIM = 2000;
const JPEG_QUALITY = 82;

export async function saveUpload(
  file: File,
  category: "milk" | "general" | "profile",
): Promise<{ storedPath: string; optimizedBase64: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  console.log("[images] saveUpload buffer size:", `${(buffer.length / 1024).toFixed(1)} KB`);

  const optimized = await sharp(buffer)
    .rotate()
    .resize(MAX_DIM, MAX_DIM, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
  console.log("[images] sharp optimized size:", `${(optimized.length / 1024).toFixed(1)} KB`);

  const id = crypto.randomUUID();
  const datePath = new Date().toISOString().slice(0, 7);
  const relativePath = `${category}/${datePath}/${id}.jpg`;
  const fullPath = path.join(ORIGINALS, relativePath);

  mkdirSync(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, optimized);

  return {
    storedPath: relativePath,
    optimizedBase64: optimized.toString("base64"),
  };
}
