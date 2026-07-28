import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workerPath = resolve("src/sw.ts");

describe("Phase 1 service worker", () => {
  it("preserves the PWA lifecycle and app-shell routing contract", async () => {
    const worker = await readFile(workerPath, "utf8");

    expect(worker).toContain("self.skipWaiting();");
    expect(worker).toContain("clientsClaim();");
    expect(worker).toContain("precacheAndRoute(self.__WB_MANIFEST);");
    expect(worker).toContain("cleanupOutdatedCaches();");
    expect(worker).toContain('createHandlerBoundToURL("index.html")');
    expect(worker).toContain("/^\\/api(?:\\/|$)/");
    expect(worker).toContain("/^\\/img(?:\\/|$)/");
  });
});
