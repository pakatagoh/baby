import type { NotificationDb } from "./notification-repository";
import {
  createMilkEntryOutbox,
  disablePushSubscription,
  ensureNotificationDeliveries,
  getActiveSubscriptionsForUser,
  getDeviceProfileUser,
  getNotificationDeliveryStatuses,
  markPushSubscriptionSuccess,
  updateNotificationDelivery,
  updateNotificationOutbox,
  type NotificationPayload,
} from "./notification-repository";
import { getConfiguredPushClient, sendPushNotification, type PushClient } from "./push-sender";
import type { DeviceUser } from "./notification-schema";
import { formatFrozenDate, formatFrozenTime } from "./frozen-date";

export type NotificationPushClient = PushClient;

export const DEFAULT_NOTIFICATION_TITLE = "Frozen milk entry added";
export const DEFAULT_NOTIFICATION_URL = "/storage";

export interface NewEntryNotificationDetails {
  amountMl: number;
  packetCount: number;
  frozenAt: string;
}

export function createNewEntryNotificationPayload(
  details: NewEntryNotificationDetails,
): NotificationPayload {
  const packetLabel = details.packetCount === 1 ? "packet" : "packets";
  const verb = details.packetCount === 1 ? "was" : "were";
  return {
    title: DEFAULT_NOTIFICATION_TITLE,
    body: `${details.packetCount} ${packetLabel} of ${details.amountMl} ml ${verb} added, frozen on ${formatFrozenDate({ frozenAt: details.frozenAt })} at ${formatFrozenTime({ frozenAt: details.frozenAt })}.`,
    url: DEFAULT_NOTIFICATION_URL,
  };
}

export interface MilkEntryNotificationInput {
  deviceId: string;
  sourceEntryIds: string[];
  details: NewEntryNotificationDetails;
  now?: string;
}

export interface NotificationServiceDependencies {
  pushClient?: PushClient;
}

export interface NotificationServiceResult {
  outboxId: string;
  status: "sent" | "failed" | "skipped";
  sourceEntryIds: string[];
  delivered: number;
  permanentlyInvalid: number;
  retryableFailures: number;
}

function recipientFor(actorUser: DeviceUser): DeviceUser {
  return actorUser === "pakata" ? "isabel" : "pakata";
}

function sourceIdsFromJson(value: string): string[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === "string")) {
    throw new Error("Invalid source entry IDs in notification outbox");
  }
  return parsed;
}

export async function notifyMilkEntryCreated(
  db: NotificationDb,
  input: MilkEntryNotificationInput,
  dependencies: NotificationServiceDependencies = {},
): Promise<NotificationServiceResult> {
  if (input.sourceEntryIds.length === 0) {
    throw new Error("At least one confirmed Sheet entry is required");
  }

  const actorUser = getDeviceProfileUser(db, input.deviceId);
  if (!actorUser) throw new Error("Unknown device profile");
  const recipientUser = recipientFor(actorUser);
  const outbox = createMilkEntryOutbox(db, {
    sourceEntryIds: input.sourceEntryIds,
    actorUser,
    recipientUser,
    payload: createNewEntryNotificationPayload(input.details),
    now: input.now,
  });
  const sourceEntryIds = sourceIdsFromJson(outbox.sourceEntryIdsJson);

  if (outbox.status === "sent" || outbox.status === "skipped") {
    return {
      outboxId: outbox.id,
      status: outbox.status,
      sourceEntryIds,
      delivered: 0,
      permanentlyInvalid: 0,
      retryableFailures: 0,
    };
  }

  const subscriptions = getActiveSubscriptionsForUser(db, recipientUser);
  if (subscriptions.length === 0) {
    updateNotificationOutbox(db, outbox.id, {
      status: "skipped",
      attempts: outbox.attempts,
      lastError: null,
      now: input.now,
    });
    return {
      outboxId: outbox.id,
      status: "skipped",
      sourceEntryIds,
      delivered: 0,
      permanentlyInvalid: 0,
      retryableFailures: 0,
    };
  }

  ensureNotificationDeliveries(db, outbox.id, subscriptions, input.now);
  updateNotificationOutbox(db, outbox.id, {
    status: "sending",
    attempts: outbox.attempts + 1,
    lastError: null,
    now: input.now,
  });

  const pushClient = dependencies.pushClient ?? (await getConfiguredPushClient());
  const persistedPayload = outbox.payloadJson;
  const completedDeliveries = new Map(
    getNotificationDeliveryStatuses(db, outbox.id).map(({ subscriptionId, status }) => [subscriptionId, status]),
  );
  const subscriptionsToSend = subscriptions.filter((subscription) => {
    const status = completedDeliveries.get(subscription.id);
    return status !== "sent" && status !== "permanent_failure";
  });
  let delivered = 0;
  let permanentlyInvalid = 0;
  let retryableFailures = 0;

  for (const subscription of subscriptionsToSend) {
    const result = await sendPushNotification(pushClient, subscription, persistedPayload);
    if (result.outcome === "sent") {
      delivered += 1;
      markPushSubscriptionSuccess(db, subscription.id, input.now);
      updateNotificationDelivery(db, outbox.id, subscription.id, "sent", result.statusCode, "success", input.now);
    } else if (result.outcome === "permanent_failure") {
      permanentlyInvalid += 1;
      disablePushSubscription(db, subscription.id, "push_endpoint_invalid", input.now);
      updateNotificationDelivery(db, outbox.id, subscription.id, "permanent_failure", result.statusCode, "permanent_failure", input.now);
    } else {
      retryableFailures += 1;
      updateNotificationDelivery(db, outbox.id, subscription.id, "retryable_failure", result.statusCode, "retryable_failure", input.now);
    }
  }

  const status = retryableFailures > 0 ? "failed" : "sent";
  updateNotificationOutbox(db, outbox.id, {
    status,
    attempts: outbox.attempts + 1,
    lastError: retryableFailures > 0 ? "One or more Push deliveries failed temporarily" : null,
    sentAt: status === "sent" ? input.now ?? new Date().toISOString() : null,
    now: input.now,
  });

  return {
    outboxId: outbox.id,
    status,
    sourceEntryIds,
    delivered,
    permanentlyInvalid,
    retryableFailures,
  };
}
