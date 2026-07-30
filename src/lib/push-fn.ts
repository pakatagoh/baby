import { createServerFn } from "@tanstack/react-start";
import { deviceUsers, type DeviceUser } from "./notification-schema";

export interface PublicVapidKeyResponse {
  vapidPublicKey: string;
}

export interface DeviceProfileInput {
  deviceId: string;
  user: DeviceUser;
}

export function parseDeviceProfileInput(data: unknown): DeviceProfileInput {
  const input = (data ?? {}) as Record<string, unknown>;
  const deviceId = requiredString(input, "deviceId");
  const user = requiredString(input, "user");
  if (!(deviceUsers as readonly string[]).includes(user)) {
    throw new Error("user must be pakata or isabel");
  }
  return { deviceId, user: user as DeviceUser };
}

export interface PushSubscriptionInput {
  deviceId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface DisablePushInput {
  deviceId: string;
}

function requiredString(input: Record<string, unknown>, name: string): string {
  const value = String(input[name] ?? "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function parsePushSubscriptionInput(data: unknown): PushSubscriptionInput {
  const input = (data ?? {}) as Record<string, unknown>;
  return {
    deviceId: requiredString(input, "deviceId"),
    endpoint: requiredString(input, "endpoint"),
    p256dh: requiredString(input, "p256dh"),
    auth: requiredString(input, "auth"),
  };
}

export function parseDisablePushInput(data: unknown): DisablePushInput {
  return { deviceId: requiredString((data ?? {}) as Record<string, unknown>, "deviceId") };
}

export function publicVapidKeyResponse(vapidPublicKey: string): PublicVapidKeyResponse {
  return { vapidPublicKey };
}

/** Return only the public VAPID key from server runtime configuration. */
export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicVapidKeyResponse> => {
    // Keep push-config out of the client graph: it contains the private-key
    // accessor and is loaded only when this server handler executes.
    const { getVapidPublicKey: readPublicKey } = await import("./push-config");
    return publicVapidKeyResponse(readPublicKey());
  },
);

/** Register the browser's household convenience identity in SQLite. */
export const registerDeviceProfile = createServerFn({ method: "POST" })
  .validator(parseDeviceProfileInput)
  .handler(async ({ data }) => {
    const [{ getDatabase }, { upsertDeviceProfile }] = await Promise.all([
      import("./db"),
      import("./notification-repository"),
    ]);
    upsertDeviceProfile(getDatabase().db, { id: data.deviceId, user: data.user });
    return data;
  });

/** Register or replace one browser push subscription. */
export const registerPushSubscription = createServerFn({ method: "POST" })
  .validator(parsePushSubscriptionInput)
  .handler(async ({ data }) => {
    const [{ getDatabase }, { registerPushSubscriptionForDatabase }] = await Promise.all([
      import("./db"),
      import("./notification-repository"),
    ]);
    return registerPushSubscriptionForDatabase(getDatabase().db, data);
  });

export const disablePushSubscription = createServerFn({ method: "POST" })
  .validator(parseDisablePushInput)
  .handler(async ({ data }) => {
    const [{ getDatabase }, { disablePushSubscriptionsForDevice }] = await Promise.all([
      import("./db"),
      import("./notification-repository"),
    ]);
    disablePushSubscriptionsForDevice(getDatabase().db, data.deviceId);
    return { deviceId: data.deviceId, enabled: false };
  });
