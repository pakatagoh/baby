import { join } from "node:path";
import { definePlugin } from "nitro";
import { getDatabase } from "../src/lib/db";
import { runDatabaseMigrations } from "../src/lib/db-migrations";

export default definePlugin(() => {
  runDatabaseMigrations(getDatabase(), join(process.cwd(), "drizzle"));
});
