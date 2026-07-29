import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDatabase, type DatabaseHandle } from "./db";

let startupComplete = false;

export function runDatabaseMigrations(
  handle: DatabaseHandle = getDatabase(),
  migrationsFolder = "drizzle",
): void {
  if (startupComplete) return;
  migrate(handle.db, { migrationsFolder });
  startupComplete = true;
}

export function isDatabaseStartupComplete(): boolean {
  return startupComplete;
}

export function resetDatabaseStartupForTests(): void {
  startupComplete = false;
}
