import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const publicDir = resolve(".output/public");
const workerPath = resolve(publicDir, "sw.js");
const manifestPath = resolve(publicDir, "manifest.webmanifest");
const registrationPath = resolve(publicDir, "registerSW.js");

await Promise.all([
  access(workerPath),
  access(manifestPath),
  access(registrationPath),
]);

const [worker, manifest, registration] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(manifestPath, "utf8"),
  readFile(registrationPath, "utf8"),
]);

assert.doesNotThrow(() => JSON.parse(manifest), "manifest.webmanifest must parse as JSON");
assert.match(registration, /\/sw\.js/, "registerSW.js must register /sw.js");
assert.match(registration, /scope:\s*["']\/["']/, "registerSW.js must use the root scope");
assert.doesNotMatch(worker, /self\.define/, "sw.js must be the bundled custom worker, not generateSW output");
assert.doesNotMatch(worker, /self\.__WB_MANIFEST/, "sw.js must have an injected precache manifest");
assert.match(worker, /manifest\.webmanifest/, "sw.js must precache the web manifest");
const rootPrecacheEntry = worker.match(/\{[^{}]*["']url["']:\s*["']\/["'][^{}]*\}/)?.[0];
assert.ok(rootPrecacheEntry, "sw.js must precache the root app shell");
assert.match(
  rootPrecacheEntry,
  /["']revision["']:\s*["'][^"']+["']/,
  "the root app shell precache entry must have a non-empty revision",
);
assert.match(worker, /assets\/[^"']+\.css/, "sw.js must precache a CSS asset");
assert.match(worker, /assets\/[^"']+\.js/, "sw.js must precache a JavaScript asset");
assert.doesNotMatch(worker, /addEventListener\(["']push["']/, "Phase 1 worker must not have a push handler");

console.log("PWA build artifacts verified.");
