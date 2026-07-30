import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  handleNotificationClick,
  handlePush,
} from "./sw-handlers";

const workerPath = resolve("src/sw.ts");
const viteConfigPath = resolve("vite.config.ts");
const rootRoutePath = resolve("src/routes/__root.tsx");

describe("Phase 1 service worker", () => {
  it("preserves the PWA lifecycle and app-shell routing contract", async () => {
    const [worker, viteConfig] = await Promise.all([
      readFile(workerPath, "utf8"),
      readFile(viteConfigPath, "utf8"),
    ]);

    expect(worker).toContain("self.skipWaiting();");
    expect(worker).toContain("clientsClaim();");
    expect(worker).toContain("precacheAndRoute(self.__WB_MANIFEST);");
    expect(worker).toContain("cleanupOutdatedCaches();");
    expect(worker).toContain('createHandlerBoundToURL("/")');
    expect(worker).toContain("/^\\/api(?:\\/|$)/");
    expect(worker).toContain("/^\\/img(?:\\/|$)/");
    expect(viteConfig).toContain(
      'additionalManifestEntries: [{ url: "/", revision: APP_SHELL_REVISION }]',
    );
  });

  it("mounts a client-side service-worker registration component", async () => {
    const rootRoute = await readFile(rootRoutePath, "utf8");

    expect(rootRoute).toContain("ServiceWorkerRegistration");
    expect(rootRoute).toContain("<ServiceWorkerRegistration />");
  });
});

describe("Phase 5 service-worker push UI", () => {
  it("registers push and notification-click listeners in the custom worker", async () => {
    const worker = await readFile(workerPath, "utf8");

    expect(worker).toContain('self.addEventListener("push"');
    expect(worker).toContain('self.addEventListener("notificationclick"');
    expect(worker).toContain("handlePush(event, self.registration)");
    expect(worker).toContain(
      "handleNotificationClick(event, self.clients, self.location.origin)",
    );
  });

  it("shows the generic notification for an empty or malformed push payload", async () => {
    const waits: Promise<unknown>[] = [];
    const event = {
      data: {
        json: () => {
          throw new SyntaxError("invalid JSON");
        },
      },
      waitUntil: (promise: Promise<unknown>) => waits.push(promise),
    };
    const showNotification = async (
      title: string,
      options: NotificationOptions,
    ) => {
      expect(title).toBe("Frozen milk entry added");
      expect(options).toMatchObject({
        body: "A frozen milk entry was added.",
        tag: "baby-new-entry",
        data: { url: "/storage" },
      });
    };

    handlePush(event, { showNotification });

    expect(waits).toHaveLength(1);
    await waits[0];
  });

  it("focuses an existing Baby window when a notification is clicked", async () => {
    const waits: Promise<unknown>[] = [];
    let closed = false;
    let focused = false;
    let openedUrl: string | undefined;
    const event = {
      notification: {
        close: () => {
          closed = true;
        },
        data: { url: "/storage" },
      },
      waitUntil: (promise: Promise<unknown>) => waits.push(promise),
    };
    const existingWindow = {
      url: "https://baby.pakatagoh.com/",
      focus: async () => {
        focused = true;
      },
    };

    handleNotificationClick(
      event,
      {
        matchAll: async () => [existingWindow],
        openWindow: async (url: string) => {
          openedUrl = url;
          return null;
        },
      },
      "https://baby.pakatagoh.com",
    );

    expect(closed).toBe(true);
    expect(waits).toHaveLength(1);
    await waits[0];
    expect(focused).toBe(true);
    expect(openedUrl).toBeUndefined();
  });

  it("opens storage when a notification is clicked without an existing window", async () => {
    const waits: Promise<unknown>[] = [];
    let openedUrl: string | undefined;
    const event = {
      notification: {
        close: () => undefined,
        data: { url: "/storage" },
      },
      waitUntil: (promise: Promise<unknown>) => waits.push(promise),
    };

    handleNotificationClick(
      event,
      {
        matchAll: async () => [],
        openWindow: async (url: string) => {
          openedUrl = url;
          return null;
        },
      },
      "https://baby.pakatagoh.com",
    );

    expect(waits).toHaveLength(1);
    await waits[0];
    expect(openedUrl).toBe("/storage");
  });
});
