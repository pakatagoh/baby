import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { OverviewPage } from "./OverviewPage";
import type { MilkSheetEntry } from "@/lib/sheets";

const { entries } = vi.hoisted(() => {
  const entries: MilkSheetEntry[] = [];
  return { entries };
});
vi.mock("@tanstack/react-query", () => ({ useQuery: ({ queryKey }: { queryKey: string[] }) =>
  ({ data: queryKey[0] === "entries" ? entries : queryKey[0] === "activities" ? [] : null }) }));
vi.mock("@/lib/entries-fn", () => ({ getEntries: vi.fn() }));
vi.mock("@/lib/baby-profile-fn", () => ({ getBabyProfile: vi.fn() }));
vi.mock("@/lib/activity-log-fn", () => ({ getActivities: vi.fn() }));
vi.mock("./RecentActivity", () => ({ RecentActivity: () => null }));

function packet(frozenAt: string, amount = 100, used = false): MilkSheetEntry {
  return { id: frozenAt, frozenAt, amount, used, packets: 1, totalFrozen: 1,
    totalUsed: 0, notes: "", imageUrl: "", createdAt: "", updatedAt: "", usedAt: "" };
}

afterEach(() => { vi.useRealTimers(); entries.length = 0; });

describe("home dedicated freezer timeline", () => {
  it("chooses next expiry chronologically rather than by formatted day", () => {
    entries.push(packet("2026-08-01T10:00:00+08:00"), packet("2026-07-16T10:00:00+08:00"));
    expect(renderToStaticMarkup(<OverviewPage />)).toContain("16 Jan 2027");
  });
  it("counts each active packet in exactly one remaining-shelf-life bucket", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T10:00:00+08:00"));
    entries.push(
      packet("2026-01-08T10:00:00+08:00", 10),
      packet("2026-01-15T10:00:00+08:00", 20),
      packet("2026-01-29T10:00:00+08:00", 30),
      packet("2026-04-01T10:00:00+08:00", 40),
      packet("2026-04-02T10:00:00+08:00", 50),
      packet("invalid", 999),
      packet("2026-07-01T10:00:00+08:00", 999, true),
    );
    const html = renderToStaticMarkup(<OverviewPage />);
    for (const [label, ml] of [["Within 1 week", 10], ["1–2 weeks", 20], ["2–4 weeks", 30], ["1–3 months", 40], ["3–6 months", 50]]) {
      expect(html).toContain(`${label}</span><span class="text-xs">1 bags · ${ml}ml`);
    }
    expect(html).not.toContain("999ml");
  });
  it("renders the 3–6 month row with freshly frozen milk and its six-month next expiry", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T10:00:00+08:00"));
    entries.push(packet("2026-07-01T10:00:00+08:00", 120));
    const html = renderToStaticMarkup(<OverviewPage />);
    expect(html).toContain("3–6 months");
    expect(html).toMatch(/3–6 months<\/span><span[^>]*>1 bags · 120ml/);
    expect(html).toContain("1 Jan 2027");
  });
});
