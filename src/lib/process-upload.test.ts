import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  analyzeMilkPacket: vi.fn(),
  appendActivity: vi.fn(),
  appendToSheet: vi.fn(),
  currentSgtISO: vi.fn(),
  generateImgproxySrcSet: vi.fn(),
  generateImgproxyUrl: vi.fn(),
  saveUpload: vi.fn(),
}));

vi.mock("./ai", () => ({ analyzeMilkPacket: mocks.analyzeMilkPacket }));
vi.mock("./images", () => ({
  generateImgproxyUrl: mocks.generateImgproxyUrl,
  saveUpload: mocks.saveUpload,
}));
vi.mock("./imgproxy-url", () => ({
  generateImgproxySrcSet: mocks.generateImgproxySrcSet,
}));
vi.mock("./sheets", () => ({ appendToSheet: mocks.appendToSheet }));
vi.mock("./activity-log", () => ({ appendActivity: mocks.appendActivity }));
vi.mock("./frozen-date", () => ({ currentSgtISO: mocks.currentSgtISO }));

import { processBatchUpload } from "./process-upload";

describe("processBatchUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveUpload.mockResolvedValue({
      storedPath: "milk/2026-07/packet.jpg",
      optimizedBase64: "image-data",
    });
    mocks.generateImgproxyUrl.mockReturnValue("https://img.example/packet.jpg");
    mocks.generateImgproxySrcSet.mockReturnValue("srcset");
    mocks.analyzeMilkPacket.mockResolvedValue({
      frozenAt: "2026-07-26T10:00:00+08:00",
      amount_ml: 120,
      packets: 2,
    });
    mocks.currentSgtISO.mockReturnValue("2026-07-26T10:01:00+08:00");
    mocks.appendToSheet
      .mockResolvedValueOnce({ id: "packet-1" })
      .mockResolvedValueOnce({ id: "packet-2" });
    mocks.appendActivity.mockResolvedValue({});
  });

  it("logs a frozen-milk activity for every packet row it creates", async () => {
    const result = await processBatchUpload(new File(["image"], "packet.jpg"), 2);

    expect(result.ids).toEqual(["packet-1", "packet-2"]);
    expect(mocks.appendActivity).toHaveBeenCalledTimes(2);
    expect(mocks.appendActivity).toHaveBeenNthCalledWith(1, {
      eventType: "milk_frozen",
      frozenMilkEntryId: "packet-1",
    });
    expect(mocks.appendActivity).toHaveBeenNthCalledWith(2, {
      eventType: "milk_frozen",
      frozenMilkEntryId: "packet-2",
    });
  });
});
