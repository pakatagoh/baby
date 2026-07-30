import { afterEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "./db";
import { notifyMilkEntryCreated, type NotificationPushClient } from "./notification-service";
import { upsertDeviceProfile, upsertPushSubscription } from "./notification-repository";

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
    CREATE TABLE notification_deliveries (
      id TEXT PRIMARY KEY NOT NULL,
      outbox_id TEXT NOT NULL REFERENCES notification_outbox(id) ON DELETE CASCADE,
      subscription_id TEXT NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      provider_status_code INTEGER,
      provider_response_category TEXT,
      attempted_at TEXT NOT NULL,
      completed_at TEXT,
      UNIQUE(outbox_id, subscription_id)
    );
  `);
  return handle;
}

afterEach(() => {
  for (const handle of handles.splice(0)) handle.close();
});

const payload = { title: "Baby Tracker", body: "A new frozen milk entry was added.", url: "/storage" };

describe("notification service", () => {
  it("delivers to the other user's subscriptions and disables permanent failures", async () => {
    const handle = setupDatabase();
    upsertDeviceProfile(handle.db, { id: "isabel-device", user: "isabel", now: "2026-07-29T00:00:00.000Z" });
    upsertDeviceProfile(handle.db, { id: "pakata-phone", user: "pakata", now: "2026-07-29T00:00:00.000Z" });
    upsertDeviceProfile(handle.db, { id: "pakata-laptop", user: "pakata", now: "2026-07-29T00:00:00.000Z" });
    upsertPushSubscription(handle.db, { deviceProfileId: "pakata-phone", endpoint: "https://push/phone", p256dh: "p1", auth: "a1" });
    upsertPushSubscription(handle.db, { deviceProfileId: "pakata-laptop", endpoint: "https://push/laptop", p256dh: "p2", auth: "a2" });

    const sendNotification = vi.fn<NotificationPushClient["sendNotification"]>((subscription) =>
      subscription.endpoint.endsWith("laptop")
        ? Promise.reject({ statusCode: 410 })
        : Promise.resolve({ statusCode: 201 }),
    );

    const result = await notifyMilkEntryCreated(
      handle.db,
      { deviceId: "isabel-device", sourceEntryIds: ["packet-2", "packet-1"], payload, now: "2026-07-29T00:01:00.000Z" },
      { pushClient: { sendNotification } },
    );

    expect(result).toMatchObject({ status: "sent", sourceEntryIds: ["packet-1", "packet-2"], delivered: 1, permanentlyInvalid: 1 });
    expect(sendNotification).toHaveBeenCalledTimes(2);
    expect(sendNotification).not.toHaveBeenCalledWith(expect.objectContaining({ endpoint: expect.stringContaining("isabel") }), expect.any(String));
    expect(handle.sqlite.prepare("SELECT enabled FROM push_subscriptions WHERE endpoint = 'https://push/laptop'").get()).toEqual({ enabled: 0 });
    expect(handle.sqlite.prepare("SELECT status, COUNT(*) AS count FROM notification_deliveries GROUP BY status ORDER BY status").all()).toEqual([
      { status: "permanent_failure", count: 1 },
      { status: "sent", count: 1 },
    ]);
  });

  it("creates one event for a partially successful batch and deduplicates repeat invocation", async () => {
    const handle = setupDatabase();
    upsertDeviceProfile(handle.db, { id: "pakata-device", user: "pakata" });
    upsertDeviceProfile(handle.db, { id: "isabel-device", user: "isabel" });
    upsertPushSubscription(handle.db, { deviceProfileId: "isabel-device", endpoint: "https://push/isabel", p256dh: "p", auth: "a" });
    const pushClient = { sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }) };

    const input = { deviceId: "pakata-device", sourceEntryIds: ["confirmed-2", "confirmed-1"], payload };
    const first = await notifyMilkEntryCreated(handle.db, input, { pushClient });
    const second = await notifyMilkEntryCreated(handle.db, input, { pushClient });

    expect(first.outboxId).toBe(second.outboxId);
    expect(pushClient.sendNotification).toHaveBeenCalledTimes(1);
    expect(handle.sqlite.prepare("SELECT COUNT(*) AS count FROM notification_outbox").get()).toEqual({ count: 1 });
    expect(first.sourceEntryIds).toEqual(["confirmed-1", "confirmed-2"]);
  });

  it("marks the event skipped when the other user has no active subscriptions", async () => {
    const handle = setupDatabase();
    upsertDeviceProfile(handle.db, { id: "isabel-device", user: "isabel" });
    const pushClient = { sendNotification: vi.fn() };

    const result = await notifyMilkEntryCreated(handle.db, {
      deviceId: "isabel-device",
      sourceEntryIds: ["packet-1"],
      payload,
    }, { pushClient });

    expect(result.status).toBe("skipped");
    expect(pushClient.sendNotification).not.toHaveBeenCalled();
  });
});
