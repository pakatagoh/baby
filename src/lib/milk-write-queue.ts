/**
 * Serialize frozen-milk writes within this server process.
 *
 * Sheet row allocation currently reads the next available row before writing,
 * so photo uploads and manual entries must share one queue to avoid choosing
 * the same row.
 */
let chain: Promise<unknown> = Promise.resolve();

export function enqueueMilkWrite<T>(operation: () => Promise<T>): Promise<T> {
  const run = chain.then(operation);
  // Keep future writes available when the current write fails.
  chain = run.catch(() => {});
  return run;
}
