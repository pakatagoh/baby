import { createServerFn } from "@tanstack/react-start";
import { saveUpload, generateImgproxyUrl } from "./images";
import { updateProfileImage } from "./baby-profile";

export const uploadProfilePhoto = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    const file = data.get("file");
    if (!(file instanceof File)) {
      throw new Error("No file provided");
    }
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new Error("File must be under 20 MB");
    }
    return file;
  })
  .handler(async ({ data: file }) => {
    const { storedPath } = await saveUpload(file, "profile");
    const imageUrl = generateImgproxyUrl(storedPath, 400, 400);
    await updateProfileImage(imageUrl);
    return { imageUrl };
  });
