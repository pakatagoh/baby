import { sql } from "drizzle-orm";
import { getDatabase, type DatabaseHandle } from "./db";

export type DatabaseHealth = { status: "ok" };

export function checkDatabase(handle: DatabaseHandle = getDatabase()): DatabaseHealth {
  handle.db.run(sql`SELECT 1`);
  return { status: "ok" };
}
