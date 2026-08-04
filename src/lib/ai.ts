import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { z } from "zod";

const opencode = createAnthropic({
  baseURL: "https://opencode.ai/zen/go/v1",
  apiKey: process.env.OPENCODE_API_KEY!,
});

const visionModel = opencode("minimax-m3");

const MilkPacketSchema = z.object({
  frozenAt: z.string(),
  amount_ml: z.number().int().min(10).max(500),
  packets: z.number().int().min(1).max(10).default(1),
});

export type MilkPacketResult = z.infer<typeof MilkPacketSchema>;

/**
 * Extract milk packet label info from a photo.
 *
 * Uses generateText with prompt-instructed JSON output instead of generateObject
 * because minimax-m3 via OpenCode's Anthropic-compatible API does not support
 * tool calling — the model sees the tools but responds with text about them
 * rather than invoking them, causing generateObject to fail with "No object
 * generated: the model did not return a response."
 */
export async function analyzeMilkPacket(
  imageBase64: string,
  mimeType: string,
): Promise<MilkPacketResult> {
  const { text } = await generateText({
    model: visionModel,
    system:
      "You are a label reader for frozen breast milk storage packets. " +
      "Always respond with ONLY valid JSON, no other text. " +
      "JSON schema: {\"frozenAt\": \"ISO 8601 datetime in SGT (+08:00)\", \"amount_ml\": number, \"packets\": number}. " +
      "If the label shows a date like \"15 Jul 2026\" and time like \"10:30 AM\", " +
      "combine them into e.g. 2026-07-15T10:30:00+08:00. " +
      "Convert formats like 15/7/26 or 3:00 PM to ISO. " +
      "Amount values are typically 80, 90, 100, or 120 ml. " +
      "If unsure about any field, make your best guess. " +
      "Never leave fields empty or null.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract the label info as JSON.",
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
    maxTokens: 200,
  });

  // The model may wrap JSON in markdown code fences; strip them.
  const jsonStr = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/, "")
    .trim();

  let raw: unknown;
  try {
    raw = JSON.parse(jsonStr);
  } catch {
    throw new Error(
      `Failed to parse AI response as JSON. Raw text: ${text.slice(0, 300)}`,
    );
  }

  const parsed = MilkPacketSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `AI response failed schema validation: ${parsed.error.message}. Raw text: ${text.slice(0, 300)}`,
    );
  }

  return parsed.data;
}
