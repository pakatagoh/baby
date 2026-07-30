import webpush from "web-push";
import type { PushSubscriptionRecord } from "./notification-repository";

export interface PushClient {
  sendNotification(subscription: WebPushSubscription, payload: string): Promise<{ statusCode?: number }>;
}

export interface WebPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export type PushSendOutcome = "sent" | "permanent_failure" | "retryable_failure";

export interface PushSendResult {
  outcome: PushSendOutcome;
  statusCode?: number;
}

function statusCodeFrom(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const value = (error as { statusCode?: unknown }).statusCode;
  return typeof value === "number" ? value : undefined;
}

export function classifyPushError(error: unknown): PushSendResult {
  const statusCode = statusCodeFrom(error);
  return {
    outcome: statusCode === 404 || statusCode === 410 ? "permanent_failure" : "retryable_failure",
    ...(statusCode === undefined ? {} : { statusCode }),
  };
}

export async function sendPushNotification(
  client: PushClient,
  subscription: PushSubscriptionRecord,
  payload: string,
): Promise<PushSendResult> {
  try {
    const response = await client.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      payload,
    );
    return {
      outcome: "sent",
      ...(response.statusCode === undefined ? {} : { statusCode: response.statusCode }),
    };
  } catch (error) {
    return classifyPushError(error);
  }
}

/** Build the configured Web Push client at request/runtime execution time. */
export async function getConfiguredPushClient(): Promise<PushClient> {
  const { getVapidConfig } = await import("./push-config");
  const config = getVapidConfig();
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return webpush;
}
