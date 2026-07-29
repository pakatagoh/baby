import { createHash, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  deviceProfiles,
  notificationOutbox,
  notificationSchema,
  pushSubscriptions,
  type DeviceUser,
} from "./notification-schema";

export type NotificationDb = BetterSQLite3Database<typeof notificationSchema>;

export interface DeviceProfileInput {
  id: string;
  user: DeviceUser;
  now?: string;
}

export interface PushSubscriptionInput {
  deviceProfileId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  now?: string;
}

export interface PushSubscriptionRecord {
  id: string;
  deviceProfileId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  url: string;
}

export interface MilkEntryOutboxInput {
  sourceEntryIds: string[];
  actorUser: DeviceUser;
  recipientUser: DeviceUser;
  payload: NotificationPayload;
  now?: string;
}

function timestamp(now?: string): string {
  return now ?? new Date().toISOString();
}

export function upsertDeviceProfile(db: NotificationDb, input: DeviceProfileInput): void {
  const now = timestamp(input.now);
  db.insert(deviceProfiles)
    .values({ id: input.id, user: input.user, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: deviceProfiles.id,
      set: { user: input.user, updatedAt: now },
    })
    .run();
}

export function deviceProfileExists(db: NotificationDb, id: string): boolean {
  return Boolean(
    db.select({ id: deviceProfiles.id }).from(deviceProfiles).where(eq(deviceProfiles.id, id)).get(),
  );
}

export function upsertPushSubscription(
  db: NotificationDb,
  input: PushSubscriptionInput,
): PushSubscriptionRecord {
  const now = timestamp(input.now);
  const byDevice = db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.deviceProfileId, input.deviceProfileId))
    .get();
  const byEndpoint = db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, input.endpoint))
    .get();
  const id = byDevice?.id ?? byEndpoint?.id ?? randomUUID();

  db.insert(pushSubscriptions)
    .values({
      id,
      deviceProfileId: input.deviceProfileId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      enabled: true,
      createdAt: now,
      updatedAt: now,
      lastSuccessAt: null,
      invalidatedAt: null,
      invalidReason: null,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.id,
      set: {
        deviceProfileId: input.deviceProfileId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        enabled: true,
        updatedAt: now,
        invalidatedAt: null,
        invalidReason: null,
      },
    })
    .run();

  return {
    id,
    deviceProfileId: input.deviceProfileId,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
  };
}

export function getActiveSubscriptionsForUser(
  db: NotificationDb,
  user: DeviceUser,
): PushSubscriptionRecord[] {
  return db
    .select({
      id: pushSubscriptions.id,
      deviceProfileId: pushSubscriptions.deviceProfileId,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .innerJoin(deviceProfiles, eq(pushSubscriptions.deviceProfileId, deviceProfiles.id))
    .where(and(eq(deviceProfiles.user, user), eq(pushSubscriptions.enabled, true)))
    .all();
}

export function disablePushSubscription(
  db: NotificationDb,
  id: string,
  reason: string,
  now = new Date().toISOString(),
): void {
  db.update(pushSubscriptions)
    .set({ enabled: false, invalidatedAt: now, invalidReason: reason, updatedAt: now })
    .where(eq(pushSubscriptions.id, id))
    .run();
}

export function disablePushSubscriptionsForDevice(
  db: NotificationDb,
  deviceProfileId: string,
  reason = "disabled_by_user",
  now = new Date().toISOString(),
): void {
  db.update(pushSubscriptions)
    .set({ enabled: false, invalidatedAt: now, invalidReason: reason, updatedAt: now })
    .where(eq(pushSubscriptions.deviceProfileId, deviceProfileId))
    .run();
}

export function createMilkEntryOutbox(
  db: NotificationDb,
  input: MilkEntryOutboxInput,
) {
  if (input.sourceEntryIds.length === 0) throw new Error("At least one source entry ID is required");
  if (input.actorUser === input.recipientUser) throw new Error("Actor and recipient must differ");

  const sourceEntryIds = [...new Set(input.sourceEntryIds)].sort();
  const canonical = sourceEntryIds.join(",");
  const idempotencyKey = createHash("sha256")
    .update(`milk-entry-created:v1:${canonical}:${input.recipientUser}`)
    .digest("hex");
  const existing = db
    .select()
    .from(notificationOutbox)
    .where(eq(notificationOutbox.idempotencyKey, idempotencyKey))
    .get();
  if (existing) return existing;

  const now = timestamp(input.now);
  const row = {
    id: randomUUID(),
    eventType: "milk_entry_created",
    sourceEntryIdsJson: JSON.stringify(sourceEntryIds),
    actorUser: input.actorUser,
    recipientUser: input.recipientUser,
    idempotencyKey,
    status: "pending" as const,
    payloadJson: JSON.stringify(input.payload),
    payloadVersion: 1,
    attempts: 0,
    createdAt: now,
    updatedAt: now,
    sentAt: null,
    lastError: null,
  };
  db.insert(notificationOutbox).values(row).run();
  return row;
}
