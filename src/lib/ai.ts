import { createAnthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

const opencode = createAnthropic({
  baseURL: "https://opencode.ai/zen/go/v1",
  apiKey: process.env.OPENCODE_API_KEY!,
});

const visionModel = opencode("minimax-m3");

const MilkPacketSchema = z.object({
  frozenAt: z
    .string()
    .describe(
      "ISO 8601 datetime of the freeze time in SGT (+08:00), e.g. 2026-07-16T10:30:00+08:00",
    ),
  amount_ml: z
    .number()
    .int()
    .min(10)
    .max(500)
    .describe(
      "Amount per packet in ml, typically 80, 90, or 100",
    ),
  packets: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(1)
    .describe(
      "Number of packets photographed. Default 1 unless multiple visible.",
    ),
});

export type MilkPacketResult = z.infer<typeof MilkPacketSchema>;

export async function analyzeMilkPacket(
  imageBase64: string,
  mimeType: string,
): Promise<MilkPacketResult> {
  const { object } = await generateObject({
    model: visionModel,
    schema: MilkPacketSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "This is a photo of a frozen breast milk storage packet. " +
              "Extract the following information from the label:\n" +
              "- The date and time the milk was frozen, as an ISO 8601 datetime in SGT (+08:00) timezone. " +
              "Example: 2026-07-16T10:30:00+08:00. " +
              "If the label shows a date like \"15 Jul 2026\" and time like \"10:30 AM\", combine them.\n" +
              "- Amount in ml (typically 80, 90, or 100)\n" +
              "- Number of packets in the photo (usually 1)\n\n" +
              "If the label uses a different format (e.g. 15/7/26, 3:00 PM), convert to the ISO format. " +
              "If you're unsure about any field, make your best guess. " +
              "Never leave required fields empty.",
          },
          {
            type: "file",
            mediaType: mimeType,
            data: `data:${mimeType};base64,${imageBase64}`,
          },
        ],
      },
    ],
    temperature: 0.1,
  });

  return object;
}
