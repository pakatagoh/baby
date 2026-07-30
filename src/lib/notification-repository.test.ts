import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { createDatabase } from "./db";
import {
  createMilkEntryOutbox,
  disablePushSubscription,
  disablePushSubscriptionsForDevice,
  getActiveSubscriptionsForUser,
  registerPushSubscriptionForDatabase,
  upsertDeviceProfile,
  upsertPushSubscription,
} from "./notification-repository";
import type { DeviceUser } from "./notification-schema";

const handles: Array<ReturnType<typeof createDatabase>> = [];

function setupDatabase() {
  const handle = createDatabase(":memory:");
  handles.push(handle);
  handle.sqlite.exec(`
    CREATE TABLE device_profiles (
      id TEXT PRIMARY KEY NOT NULL,
      user TEXT NOT NULL CHECK (user IN ('pakata', 'isabel')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE push_subscriptions (
      id TEXT PRIMARY KEY NOT NULL,
      device_profile_id TEXT NOT NULL UNIQUE REFERENCES device_profiles(id),
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_success_at TEXT,
      invalidated_at TEXT,
      invalid_reason TEXT
    );
    CREATE TABLE notification_outbox (
      id TEXT PRIMARY KEY NOT NULL,
      event_type TEXT NOT NULL,
      source_entry_ids_json TEXT NOT NULL,
      actor_user TEXT NOT NULL,
      recipient_user TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      payload_version INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sent_at TEXT,
      last_error TEXT
    );
  `);
  return handle;
}

afterEach(() => {
  for (const handle of handles.splice(0)) handle.close();
});

describe("notification repository", () => {
  it("upserts a device profile and replaces its browser subscription", () => {
    const handle = setupDatabase();
    const now = "2026-07-29T00:00:00.000Z";
    upsertDeviceProfile(handle.db, { id: "device-1", user: "pakata", now });

    const first = upsertPushSubscription(handle.db, {
      deviceProfileId: "device-1",
      endpoint: "https://push.example/1",
      p256dh: "p256dh-1",
      auth: "auth-1",
      now,
    });
    const second = upsertPushSubscription(handle.db, {
      deviceProfileId: "device-1",
      endpoint: "https://push.example/2",
      p256dh: "p256dh-2",
      auth: "auth-2",
      now: "2026-07-29T00:01:00.000Z",
    });

    expect(first.id).toBe(second.id);
    expect(getActiveSubscriptionsForUser(handle.db, "pakata")).toEqual([
      expect.objectContaining({ endpoint: "https://push.example/2" }),
    ]);
  });

  it("registers a subscription for a known device", () => {
    const handle = setupDatabase();
    upsertDeviceProfile(handle.db, { id: "device-1", user: "pakata", now: "2026-07-29T00:00:00.000Z" });

    const subscription = registerPushSubscriptionForDatabase(handle.db, {
      deviceId: "device-1",
      endpoint: "https://push.example/1",
      p256dh: "p256dh-1",
      auth: "auth-1",
    });

    expect(subscription).toEqual(
      expect.objectContaining({
        deviceProfileId: "device-1",
        endpoint: "https://push.example/1",
        p256dh: "p256dh-1",
        auth: "auth-1",
      }),
    );
    expect(handle.sqlite.prepare("SELECT COUNT(*) AS count FROM push_subscriptions").get()).toEqual({ count: 1 });
  });

  it("rejects an unknown device without creating a subscription", () => {
    const handle = setupDatabase();

    expect(() =>
      registerPushSubscriptionForDatabase(handle.db, {
        deviceId: "unknown-device",
        endpoint: "https://push.example/1",
        p256dh: "p256dh-1",
        auth: "auth-1",
      }),
    ).toThrow("Unknown device profile");

    expect(handle.sqlite.prepare("SELECT COUNT(*) AS count FROM push_subscriptions").get()).toEqual({ count: 0 });
  });

  it("creates one deterministic outbox row for a sorted batch and deduplicates repeats", () => {
    const handle = setupDatabase();
    const input = {
      sourceEntryIds: ["entry-b", "entry-a"],
      actorUser: "isabel" as DeviceUser,
      recipientUser: "pakata" as DeviceUser,
      payload: { title: "Baby Tracker", body: "A new frozen milk entry was added.", url: "/storage" },
      now: "2026-07-29T00:00:00.000Z",
    };
    const expectedKey = createHash("sha256")
      .update("milk-entry-created:v1:entry-a,entry-b:pakata")
      .digest("hex");

    const first = createMilkEntryOutbox(handle.db, input);
    const second = createMilkEntryOutbox(handle.db, input);

    expect(first.idempotencyKey).toBe(expectedKey);
    expect(second.id).toBe(first.id);
    expect(second.sourceEntryIdsJson).toBe('["entry-a","entry-b"]');
  });

  it("disables a subscription without deleting it", () => {
    const handle = setupDatabase();
    upsertDeviceProfile(handle.db, { id: "device-1", user: "pakata", now: "2026-07-29T00:00:00.000Z" });
    const subscription = upsertPushSubscription(handle.db, {
      deviceProfileId: "device-1",
      endpoint: "https://push.example/1",
      p256dh: "p256dh-1",
      auth: "auth-1",
      now: "2026-07-29T00:00:00.000Z",
    });

    disablePushSubscription(handle.db, subscription.id, "gone", "2026-07-29T00:02:00.000Z");

    expect(getActiveSubscriptionsForUser(handle.db, "pakata")).toEqual([]);
    expect(handle.sqlite.prepare("SELECT enabled, invalid_reason FROM push_subscriptions WHERE id = ?").get(subscription.id)).toEqual({
      enabled: 0,
      invalid_reason: "gone",
    });
  });

  it("disables all subscriptions for a device while retaining their rows", () => {
    const handle = setupDatabase();
    upsertDeviceProfile(handle.db, { id: "device-1", user: "pakata", now: "2026-07-29T00:00:00.000Z" });
    upsertPushSubscription(handle.db, {
      deviceProfileId: "device-1",
      endpoint: "https://push.example/1",
      p256dh: "p256dh-1",
      auth: "auth-1",
      now: "2026-07-29T00:00:00.000Z",
    });

    disablePushSubscriptionsForDevice(handle.db, "device-1", "disabled_by_user", "2026-07-29T00:02:00.000Z");

    expect(getActiveSubscriptionsForUser(handle.db, "pakata")).toEqual([]);
    expect(handle.sqlite.prepare("SELECT enabled, invalid_reason FROM push_subscriptions").all()).toEqual([
      { enabled: 0, invalid_reason: "disabled_by_user" },
    ]);
  });
});
