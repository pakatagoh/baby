import { afterEach, describe, expect, it } from "vitest";
import { createDatabase } from "./db";
import { isDatabaseStartupComplete, resetDatabaseStartupForTests, runDatabaseMigrations } from "./db-migrations";

const handles: Array<ReturnType<typeof createDatabase>> = [];

afterEach(() => {
  for (const handle of handles.splice(0)) handle.close();
  resetDatabaseStartupForTests();
});

describe("database startup", () => {
  it("applies migrations once and marks startup complete", () => {
    const handle = createDatabase(":memory:");
    handles.push(handle);

    expect(isDatabaseStartupComplete(handle)).toBe(false);
    runDatabaseMigrations(handle, "drizzle");

    expect(isDatabaseStartupComplete(handle)).toBe(true);
    expect(() => runDatabaseMigrations(handle, "drizzle")).not.toThrow();
  });
});
