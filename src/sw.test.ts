import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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
