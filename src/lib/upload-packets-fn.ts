import { createServerFn } from "@tanstack/react-start";

export const uploadPackets = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    const file = form.get("image") as File;
    const packetCountRaw = form.get("packetCount") as string;

    if (!file) throw new Error("No image provided");
    if (!file.type.startsWith("image/"))
      throw new Error("File must be an image");
    if (file.size > 20 * 1024 * 1024)
      throw new Error("File too large (max 20MB)");

    const packetCount = Number(packetCountRaw);
    if (!Number.isInteger(packetCount) || packetCount < 1 || packetCount > 50)
      throw new Error("Packet count must be between 1 and 50");

    return { file, packetCount };
  })
  .handler(async ({ data: { file, packetCount } }) => {
    // Dynamic import — this module uses Node builtins and runs only on the server.
    const { processBatchUpload } = await import("./process-upload");
    return processBatchUpload(file, packetCount);
  });
