import { createServerFn } from "@tanstack/react-start";

export const uploadMilk = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    const file = form.get("image") as File;
    console.log("[server] validator received:", {
      name: file?.name,
      type: file?.type,
      size: file ? `${(file.size / 1024).toFixed(1)} KB` : "null",
      isFile: file instanceof File,
    });
    if (!file) throw new Error("No image provided");
    if (!file.type.startsWith("image/"))
      throw new Error("File must be an image");
    if (file.size > 20 * 1024 * 1024)
      throw new Error("File too large (max 20MB)");
    return file;
  })
  .handler(async ({ data: file }) => {
    console.log("[server] handler starting processUpload");
    // Dynamic import — this module uses Node builtins and runs only on the server.
    const { processUpload } = await import("./process-upload");
    const result = await processUpload(file);
    console.log("[server] handler done, result:", result);
    return result;
  });
