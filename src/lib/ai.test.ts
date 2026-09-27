import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createOpenAI: vi.fn(),
  generateText: vi.fn(),
  providerConfig: undefined as { apiKey?: string; baseURL?: string } | undefined,
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: mocks.createOpenAI,
}));
vi.mock("ai", () => ({
  generateText: mocks.generateText,
}));

describe("analyzeMilkPacket OpenCode Go configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.OPENCODE_API_KEY = "test-opencode-key";
    process.env.OPENAI_API_KEY = "must-not-be-used";
    mocks.providerConfig = undefined;
    mocks.createOpenAI.mockImplementation(
      (config: { apiKey?: string; baseURL?: string }) => {
        mocks.providerConfig = config;
        return { responses: (modelId: string) => ({ provider: "openai.responses", modelId }) };
      },
    );
    mocks.generateText.mockResolvedValue({
      text: '{"frozenAt":"2026-07-15T10:30:00+08:00","amount_ml":120,"packets":1}',
    });
  });

  it("uses the OpenCode Go key, Responses endpoint, and GPT-6 Luna", async () => {
    const { analyzeMilkPacket } = await import("./ai");

    await analyzeMilkPacket("base64-image", "image/jpeg");

    expect(mocks.providerConfig).toEqual(
      expect.objectContaining({
        apiKey: "test-opencode-key",
        baseURL: "https://opencode.ai/zen/go/v1",
        headers: { "User-Agent": "baby-app/1.0" },
      }),
    );
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { provider: "openai.responses", modelId: "gpt-6-luna" },
        providerOptions: { openai: { reasoningEffort: "none" } },
      }),
    );
    expect(mocks.generateText.mock.calls[0][0]).not.toHaveProperty("temperature");
  });
});
