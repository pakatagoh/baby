import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL(".", import.meta.url);
const readSource = (path: string) =>
  readFileSync(new URL(path, root), "utf8");

describe("bottom navigation layout contract", () => {
  it("renders the batch action directly above the bottom nav without an independent bottom offset", () => {
    const styles = readSource("styles.css");
    const bottomNav = readSource("components/BottomNav.tsx");
    const batchActionBar = readSource("pages/storage/BatchActionBar.tsx");
    const rootRoute = readSource("routes/__root.tsx");

    expect(styles).toContain("--bottom-nav-height: 4rem;");
    expect(styles).toContain("--bottom-nav-height: 6rem;");
    expect(styles).not.toContain("--batch-action-bottom");
    expect(bottomNav).toContain('id="bottom-nav-batch-action-slot"');
    expect(bottomNav).toContain("absolute bottom-full left-0 right-0");
    expect(batchActionBar).toContain('createPortal(content, target)');
    expect(batchActionBar).not.toContain("fixed bottom-");
    expect(rootRoute).toContain("pb-(--bottom-nav-height)");
  });
});
