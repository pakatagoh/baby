import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createOpenAI: vi.fn(),
  generateText: vi.fn(),
  providerConfig: undefined as { apiKey?: string } | undefined,
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: mocks.createOpenAI,
}));
vi.mock("ai", () => ({
  generateText: mocks.generateText,
}));

describe("analyzeMilkPacket OpenAI configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-openai-key";
    mocks.providerConfig = undefined;
    mocks.createOpenAI.mockImplementation((config: { apiKey?: string }) => {
      mocks.providerConfig = config;
      return (modelId: string) => ({ provider: "openai.chat", modelId });
    });
    mocks.generateText.mockResolvedValue({
      text: '{"frozenAt":"2026-07-15T10:30:00+08:00","amount_ml":120,"packets":1}',
    });
  });

  it("uses the OpenAI API key and a vision-capable OpenAI model", async () => {
    const { analyzeMilkPacket } = await import("./ai");

    await analyzeMilkPacket("base64-image", "image/jpeg");

    expect(mocks.providerConfig).toEqual({ apiKey: "test-openai-key" });
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { provider: "openai.chat", modelId: "gpt-6-luna" },
        providerOptions: { openai: { reasoningEffort: "none" } },
      }),
    );
  });
});
