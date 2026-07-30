import { describe, expect, it, vi } from "vitest";
import { classifyPushError, sendPushNotification, type PushClient } from "./push-sender";

const subscription = {
  id: "subscription-1",
  deviceProfileId: "device-1",
  endpoint: "https://push.example/subscription",
  p256dh: "p256dh",
  auth: "auth",
};

const payload = JSON.stringify({
  title: "Frozen milk entry added",
  body: "2 packets of 120 ml were added, frozen on 29-Jul-26 at 10:30.",
  url: "/storage",
});

describe("push sender", () => {
  it("sends the persisted payload and classifies the response as sent", async () => {
    const sendNotification = vi.fn().mockResolvedValue({ statusCode: 201 });
    const client: PushClient = { sendNotification };

    const result = await sendPushNotification(client, subscription, payload);

    expect(result).toEqual({ outcome: "sent", statusCode: 201 });
    expect(sendNotification).toHaveBeenCalledWith(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      payload,
    );
  });

  it.each([404, 410])("classifies HTTP %s as permanent invalidation", async (statusCode) => {
    const client: PushClient = {
      sendNotification: vi.fn().mockRejectedValue({ statusCode }),
    };

    await expect(sendPushNotification(client, subscription, payload)).resolves.toEqual({
      outcome: "permanent_failure",
      statusCode,
    });
  });

  it("classifies a provider error without a permanent status as retryable", async () => {
    const client: PushClient = {
      sendNotification: vi.fn().mockRejectedValue({ statusCode: 503 }),
    };

    await expect(sendPushNotification(client, subscription, payload)).resolves.toEqual({
      outcome: "retryable_failure",
      statusCode: 503,
    });
  });

  it("classifies a provider error without a status as retryable", async () => {
    await expect(
      sendPushNotification(
        { sendNotification: vi.fn().mockRejectedValue(new Error("network down")) },
        subscription,
        payload,
      ),
    ).resolves.toEqual({ outcome: "retryable_failure" });
  });

  it("classifies provider status codes without exposing response bodies", () => {
    expect(classifyPushError({ statusCode: 410, body: "secret provider response" })).toEqual({
      outcome: "permanent_failure",
      statusCode: 410,
    });
  });
});
