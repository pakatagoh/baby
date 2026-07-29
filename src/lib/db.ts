import { constants, accessSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { notificationSchema } from "./notification-schema";

export interface DatabaseHandle {
  sqlite: Database.Database;
  db: BetterSQLite3Database<typeof notificationSchema>;
  close: () => void;
}

let singleton: DatabaseHandle | undefined;

function resolveDatabasePath(databasePath?: string): string {
  const resolved = databasePath ?? process.env.DATABASE_PATH;
  if (!resolved) {
    throw new Error("DATABASE_PATH is required to open the SQLite database");
  }
  return resolved;
}

export function createDatabase(databasePath?: string): DatabaseHandle {
  const resolvedPath = resolveDatabasePath(databasePath);

  if (resolvedPath !== ":memory:") {
    try {
      accessSync(dirname(resolvedPath), constants.W_OK);
    } catch (error) {
      throw new Error(`SQLite database directory is not writable: ${dirname(resolvedPath)}`, { cause: error });
    }
  }

  let sqlite: Database.Database;
  try {
    sqlite = new Database(resolvedPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    sqlite.pragma("busy_timeout = 5000");
  } catch (error) {
    throw new Error(`Unable to open SQLite database at ${resolvedPath}`, { cause: error });
  }

  const db = drizzle(sqlite, { schema: notificationSchema });
  let closed = false;
  return {
    sqlite,
    db,
    close: () => {
      if (!closed) {
        closed = true;
        sqlite.close();
      }
    },
  };
}

export function getDatabase(): DatabaseHandle {
  singleton ??= createDatabase();
  return singleton;
}

export function closeDatabase(): void {
  singleton?.close();
  singleton = undefined;
}
