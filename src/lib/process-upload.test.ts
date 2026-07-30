import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  analyzeMilkPacket: vi.fn(),
  appendActivity: vi.fn(),
  appendToSheet: vi.fn(),
  currentSgtISO: vi.fn(),
  generateImgproxySrcSet: vi.fn(),
  generateImgproxyUrl: vi.fn(),
  saveUpload: vi.fn(),
  notifyMilkEntryCreated: vi.fn(),
  getDatabase: vi.fn(() => ({ db: {} })),
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
vi.mock("./notification-service", () => ({
  notifyMilkEntryCreated: mocks.notifyMilkEntryCreated,
  DEFAULT_NOTIFICATION_PAYLOAD: {
    title: "Baby Tracker",
    body: "A new frozen milk entry was added.",
    url: "/storage",
  },
}));
vi.mock("./db", () => ({ getDatabase: mocks.getDatabase }));

import { processBatchUpload, processUpload } from "./process-upload";

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
    mocks.notifyMilkEntryCreated.mockResolvedValue({ status: "sent" });
  });

  it("logs a frozen-milk activity for every packet row it creates", async () => {
    const result = await processBatchUpload(new File(["image"], "packet.jpg"), 2, "device-1");

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
    expect(mocks.notifyMilkEntryCreated).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ deviceId: "device-1", sourceEntryIds: ["packet-1", "packet-2"] }),
    );
  });

  it("notifies for the confirmed subset when a later batch append fails", async () => {
    mocks.appendToSheet.mockReset();
    mocks.appendToSheet.mockResolvedValueOnce({ id: "packet-1" }).mockRejectedValueOnce(new Error("sheet unavailable"));

    await expect(processBatchUpload(new File(["image"], "packet.jpg"), 2, "device-1")).rejects.toThrow("sheet unavailable");

    expect(mocks.notifyMilkEntryCreated).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ deviceId: "device-1", sourceEntryIds: ["packet-1"] }),
    );
  });

  it("notifies after a successful single-photo append", async () => {
    mocks.appendToSheet.mockReset().mockResolvedValue({ id: "single-packet" });

    const result = await processUpload(new File(["image"], "packet.jpg"), "device-1");

    expect(result.id).toBe("single-packet");
    expect(mocks.notifyMilkEntryCreated).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ deviceId: "device-1", sourceEntryIds: ["single-packet"] }),
    );
  });
});
