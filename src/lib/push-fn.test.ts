import { describe, expect, it } from "vitest";
import { publicVapidKeyResponse, parseDeviceProfileInput, parsePushSubscriptionInput, parseDisablePushInput } from "./push-fn";

describe("publicVapidKeyResponse", () => {
  it("returns exactly the public VAPID key field", () => {
    expect(publicVapidKeyResponse("public-key")).toEqual({
      vapidPublicKey: "public-key",
    });
  });

  it("does not include private configuration fields", () => {
    const response = publicVapidKeyResponse("public-key");
    expect(Object.keys(response)).toEqual(["vapidPublicKey"]);
    expect(response).not.toHaveProperty("vapidPrivateKey");
    expect(response).not.toHaveProperty("vapidSubject");
  });
});

describe("parseDeviceProfileInput", () => {
  it("accepts only a device ID and supported user", () => {
    expect(parseDeviceProfileInput({ deviceId: "device-1", user: "pakata" })).toEqual({
      deviceId: "device-1",
      user: "pakata",
    });
  });

  it("rejects a missing device ID or unsupported user", () => {
    expect(() => parseDeviceProfileInput({ user: "pakata" })).toThrow("deviceId is required");
    expect(() => parseDeviceProfileInput({ deviceId: "device-1", user: "someone-else" })).toThrow(
      "user must be pakata or isabel",
    );
  });
});

describe("parsePushSubscriptionInput", () => {
  it("accepts the exact subscription registration shape", () => {
    expect(
      parsePushSubscriptionInput({
        deviceId: "device-1",
        endpoint: "https://push.example/1",
        p256dh: "public-key",
        auth: "auth-secret",
      }),
    ).toEqual({
      deviceId: "device-1",
      endpoint: "https://push.example/1",
      p256dh: "public-key",
      auth: "auth-secret",
    });
  });

  it("rejects missing subscription fields", () => {
    expect(() => parsePushSubscriptionInput({ deviceId: "device-1" })).toThrow(
      "endpoint is required",
    );
  });
});

describe("parseDisablePushInput", () => {
  it("accepts a device ID", () => {
    expect(parseDisablePushInput({ deviceId: "device-1" })).toEqual({ deviceId: "device-1" });
  });

  it("rejects a missing device ID", () => {
    expect(() => parseDisablePushInput({})).toThrow("deviceId is required");
  });
});
