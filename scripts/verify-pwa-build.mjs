import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const publicDir = resolve(".output/public");
const workerPath = resolve(publicDir, "sw.js");
const manifestPath = resolve(publicDir, "manifest.webmanifest");
const assetsDir = resolve(publicDir, "assets");
const nitroServerPath = resolve(".output/server/index.mjs");

await Promise.all([access(workerPath), access(manifestPath), access(assetsDir), access(nitroServerPath)]);

const [worker, manifest, assetFilenames, nitroServer, workerStats] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(manifestPath, "utf8"),
  readdir(assetsDir),
  readFile(nitroServerPath, "utf8"),
  stat(workerPath),
]);
const clientAssets = await Promise.all(
  assetFilenames
    .filter((filename) => filename.endsWith(".js"))
    .map((filename) => readFile(resolve(assetsDir, filename), "utf8")),
);
const clientBundle = clientAssets.join("\n");

assert.doesNotThrow(() => JSON.parse(manifest), "manifest.webmanifest must parse as JSON");
assert.match(
  clientBundle,
  /serviceWorker\.register/,
  "a built client asset must register the service worker",
);
assert.match(clientBundle, /\/sw\.js/, "the client registration must target /sw.js");
assert.match(clientBundle, /scope:\s*[`"']\/[`"']/, "the client registration must use root scope");
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

const nitroWorkerAsset = nitroServer.match(/"\/sw\.js":\s*\{[^}]*"size":\s*(\d+)/s);
assert.ok(nitroWorkerAsset, "Nitro must include /sw.js in its public-asset manifest");
assert.equal(
  Number(nitroWorkerAsset[1]),
  workerStats.size,
  "Nitro's /sw.js metadata size must match the final worker bytes",
);
await assert.doesNotReject(
  execFileAsync(process.execPath, ["--check", workerPath]),
  "the final worker must be valid JavaScript",
);

console.log("PWA build artifacts verified.");
