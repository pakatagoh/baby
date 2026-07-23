import { createServerFn } from "@tanstack/react-start";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { fetchBabyProfile, updateBabyProfile, updateProfileImage } from "./baby-profile";
import type { BabyProfile, UpdateBabyProfileInput } from "./baby-profile";
import { saveUpload, generateImgproxyUrl } from "./images";
import { parseStoredPathFromUrl } from "./imgproxy-url";

export { type BabyProfile } from "./baby-profile";

const ORIGINALS = process.env.IMAGE_ORIGINALS_DIR || "/images/originals";

/** Fetch the baby profile (metadata + latest weight) from Google Sheets. */
export const getBabyProfile = createServerFn({ method: "GET" }).handler(
  async (): Promise<BabyProfile | null> => {
    return fetchBabyProfile();
  },
);

/** Update the baby's name, DOB, and gender. */
export const saveBabyProfile = createServerFn({ method: "POST" })
  .validator((data: unknown): UpdateBabyProfileInput => {
    const d = data as Record<string, unknown>;
    const firstName = String(d.firstName || "").trim();
    const dateOfBirth = String(d.dateOfBirth || "").trim();
    const gender = String(d.gender || "").toLowerCase() === "female" ? "female" as const : "male" as const;
    if (!firstName) throw new Error("First name is required");
    if (!dateOfBirth) throw new Error("Date of birth is required");
    return { firstName, dateOfBirth, gender };
  })
  .handler(async ({ data }) => {
    await updateBabyProfile(data);
  });

/** Upload a profile photo: delete old, save new, compress, generate imgproxy URL, write to sheet. */
export const uploadProfilePhoto = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("No file provided");
    if (!file.type.startsWith("image/")) throw new Error("File must be an image");
    if (file.size > 20 * 1024 * 1024) throw new Error("File must be under 20 MB");
    return file;
  })
  .handler(async ({ data: file }) => {
    // Delete the old profile photo if one exists
    try {
      const existing = await fetchBabyProfile();
      if (existing?.imageUrl) {
        const oldPath = parseStoredPathFromUrl(existing.imageUrl);
        if (oldPath) {
          const fullPath = path.join(ORIGINALS, oldPath);
          await unlink(fullPath);
        }
      }
    } catch {
      // Non-critical — proceed with upload even if deletion fails
    }

    const { storedPath } = await saveUpload(file, "profile");
    const imageUrl = generateImgproxyUrl(storedPath, 400, 400);
    await updateProfileImage(imageUrl);
    return { imageUrl };
  });
