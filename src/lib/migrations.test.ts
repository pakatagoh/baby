import { afterEach, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDatabase } from "./db";

const handles: Array<ReturnType<typeof createDatabase>> = [];
const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

afterEach(() => {
  for (const handle of handles.splice(0)) handle.close();
});

describe("notification migrations", () => {
  it("applies the generated schema to a new SQLite database", () => {
    const handle = createDatabase(":memory:");
    handles.push(handle);

    migrate(handle.db, { migrationsFolder });

    const tables = handle.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '__drizzle%' ORDER BY name")
      .all() as Array<{ name: string }>;
    expect(tables.map(({ name }) => name)).toEqual([
      "device_profiles",
      "notification_deliveries",
      "notification_outbox",
      "push_subscriptions",
    ]);
  });
});
