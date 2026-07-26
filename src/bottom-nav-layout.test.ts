import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL(".", import.meta.url);
const readSource = (path: string) =>
  readFileSync(new URL(path, root), "utf8");

describe("bottom navigation layout contract", () => {
  it("uses one shared height for the nav, its action bar offset, and page clearance", () => {
    const styles = readSource("styles.css");
    const bottomNav = readSource("components/BottomNav.tsx");
    const batchActionBar = readSource("pages/storage/BatchActionBar.tsx");
    const rootRoute = readSource("routes/__root.tsx");

    expect(styles).toContain("--bottom-nav-height: 4rem;");
    expect(styles).toContain("--bottom-nav-height: 6rem;");
    expect(styles).toContain("--batch-action-bottom: var(--bottom-nav-height);");
    expect(styles).toContain("@supports (bottom: env(safe-area-inset-bottom))");
    expect(styles).toContain(
      "--batch-action-bottom: calc(var(--bottom-nav-height) - env(safe-area-inset-bottom, 0px));",
    );
    expect(bottomNav).toContain("h-(--bottom-nav-height)");
    expect(batchActionBar).toContain("bottom-(--batch-action-bottom)");
    expect(rootRoute).toContain("pb-(--bottom-nav-height)");
  });
});
