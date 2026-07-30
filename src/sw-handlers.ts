export const DEFAULT_NOTIFICATION_TITLE = "Baby Tracker";
export const DEFAULT_NOTIFICATION_BODY = "A new frozen milk entry was added.";
export const DEFAULT_NOTIFICATION_URL = "/storage";
export const NEW_ENTRY_NOTIFICATION_TAG = "baby-new-entry";

type PushPayload = {
  title?: unknown;
  body?: unknown;
};

export interface PushEventLike {
  data?: {
    json(): unknown;
  } | null;
  waitUntil(promise: Promise<unknown>): void;
}

export interface NotificationRegistrationLike {
  showNotification(
    title: string,
    options: NotificationOptions,
  ): Promise<void> | void;
}

export interface NotificationClickEventLike {
  notification: {
    close(): void;
    data?: unknown;
  };
  waitUntil(promise: Promise<unknown>): void;
}

export interface WindowClientLike {
  url: string;
  focus(): Promise<unknown>;
}

export interface WindowClientsLike {
  matchAll(options: {
    type: "window";
    includeUncontrolled: boolean;
  }): Promise<readonly WindowClientLike[]>;
  openWindow(url: string): Promise<unknown>;
}

function readPayload(event: PushEventLike): PushPayload {
  try {
    const value = event.data?.json();
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as PushPayload;
    }
  } catch {
    // Invalid payloads use the generic notification below.
  }

  return {};
}

function stringOrFallback(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function handlePush(
  event: PushEventLike,
  registration: NotificationRegistrationLike,
): void {
  const payload = readPayload(event);
  const title = stringOrFallback(payload.title, DEFAULT_NOTIFICATION_TITLE);
  const body = stringOrFallback(payload.body, DEFAULT_NOTIFICATION_BODY);

  event.waitUntil(
    Promise.resolve(
      registration.showNotification(title, {
        body,
        tag: NEW_ENTRY_NOTIFICATION_TAG,
        data: { url: DEFAULT_NOTIFICATION_URL },
      }),
    ),
  );
}

export function handleNotificationClick(
  event: NotificationClickEventLike,
  clients: WindowClientsLike,
  origin: string,
): void {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const data = event.notification.data;
      const url =
        data &&
        typeof data === "object" &&
        "url" in data &&
        typeof data.url === "string" &&
        data.url.startsWith("/")
          ? data.url
          : DEFAULT_NOTIFICATION_URL;
      const windows = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existingBabyWindow = windows.find((client) =>
        client.url.startsWith(origin),
      );

      if (existingBabyWindow) {
        await existingBabyWindow.focus();
        return;
      }

      await clients.openWindow(url);
    })(),
  );
}
