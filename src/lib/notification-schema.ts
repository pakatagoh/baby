import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const deviceUsers = ["pakata", "isabel"] as const;
export type DeviceUser = (typeof deviceUsers)[number];

export const outboxStatuses = ["pending", "sending", "sent", "failed", "skipped"] as const;
export type OutboxStatus = (typeof outboxStatuses)[number];

export const deviceProfiles = sqliteTable("device_profiles", {
  id: text("id").primaryKey(),
  user: text("user", { enum: deviceUsers }).notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    deviceProfileId: text("device_profile_id")
      .notNull()
      .references(() => deviceProfiles.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    lastSuccessAt: text("last_success_at"),
    invalidatedAt: text("invalidated_at"),
    invalidReason: text("invalid_reason"),
  },
  (table) => [
    uniqueIndex("push_subscriptions_device_profile_id_unique").on(table.deviceProfileId),
    uniqueIndex("push_subscriptions_endpoint_unique").on(table.endpoint),
  ],
);

export const notificationOutbox = sqliteTable(
  "notification_outbox",
  {
    id: text("id").primaryKey(),
    eventType: text("event_type").notNull(),
    sourceEntryIdsJson: text("source_entry_ids_json").notNull(),
    actorUser: text("actor_user", { enum: deviceUsers }).notNull(),
    recipientUser: text("recipient_user", { enum: deviceUsers }).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status", { enum: outboxStatuses }).notNull(),
    payloadJson: text("payload_json").notNull(),
    payloadVersion: integer("payload_version").notNull(),
    attempts: integer("attempts").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    sentAt: text("sent_at"),
    lastError: text("last_error"),
  },
  (table) => [uniqueIndex("notification_outbox_idempotency_key_unique").on(table.idempotencyKey)],
);

export const notificationDeliveries = sqliteTable(
  "notification_deliveries",
  {
    id: text("id").primaryKey(),
    outboxId: text("outbox_id")
      .notNull()
      .references(() => notificationOutbox.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => pushSubscriptions.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    providerStatusCode: integer("provider_status_code"),
    providerResponseCategory: text("provider_response_category"),
    attemptedAt: text("attempted_at").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => [uniqueIndex("notification_deliveries_outbox_subscription_unique").on(table.outboxId, table.subscriptionId)],
);

export const notificationSchema = {
  deviceProfiles,
  pushSubscriptions,
  notificationOutbox,
  notificationDeliveries,
};
