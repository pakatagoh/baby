import { createAnthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

const opencode = createAnthropic({
  baseURL: "https://opencode.ai/zen/go/v1",
  apiKey: process.env.OPENCODE_API_KEY!,
});

const visionModel = opencode("minimax-m3");

const MilkPacketSchema = z.object({
  date: z
    .string()
    .describe(
      "Date on the packet in DD-Mon-YY format, e.g. 15-Jul-26",
    ),
  time: z
    .string()
    .describe("Time in HH:MM 24-hour format, e.g. 19:30"),
  amount_ml: z
    .number()
    .int()
    .positive()
    .describe(
      "Amount per packet in ml, typically 80, 90, or 100",
    ),
  packets: z
    .number()
    .int()
    .positive()
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
              "- Date (in DD-Mon-YY format, e.g. 15-Jul-26)\n" +
              "- Time in 24-hour HH:MM format (e.g. 19:30)\n" +
              "- Amount in ml (typically 80, 90, or 100)\n" +
              "- Number of packets in the photo (usually 1)\n\n" +
              "If the date is written as numbers only (e.g. 15/7/26), convert to DD-Mon-YY format. " +
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
