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

export function isDatabaseStartupComplete(handle: DatabaseHandle = getDatabase()): boolean {
  try {
    const migrationTable = handle.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'")
      .get() as { name?: string } | undefined;
    return migrationTable?.name === "__drizzle_migrations";
  } catch {
    return false;
  }
}

export function resetDatabaseStartupForTests(): void {
  startupComplete = false;
}
