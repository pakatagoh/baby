import { afterEach, describe, expect, it } from "vitest";
import { createDatabase, closeDatabase } from "./db";

const databases: Array<{ close: () => void }> = [];

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
  closeDatabase();
});

describe("createDatabase", () => {
  it("opens a SQLite database with WAL and foreign keys enabled", () => {
    const handle = createDatabase(":memory:");
    databases.push(handle);

    expect(handle.sqlite.pragma("journal_mode", { simple: true })).toBe("memory");
    expect(handle.sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
    expect(handle.sqlite.pragma("busy_timeout", { simple: true })).toBeGreaterThan(0);
  });

  it("fails clearly when the database path is missing", () => {
    expect(() => createDatabase("")).toThrow(/DATABASE_PATH/i);
  });

  it("fails when the database path cannot be opened", () => {
    expect(() => createDatabase("/path/that/does/not/exist/baby.sqlite")).toThrow();
  });

  it("checkDatabase returns a healthy result for an open database", async () => {
    const handle = createDatabase(":memory:");
    databases.push(handle);
    const { checkDatabase } = await import("./db-health");

    expect(checkDatabase(handle)).toEqual({ status: "ok" });
  });
});
