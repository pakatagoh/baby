import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEntries } from "@/lib/entries-fn";
import { PeriodSummaryCard } from "@/pages/stats/PeriodSummaryCard";
import { DailyFrozenChart } from "@/pages/stats/DailyFrozenChart";
import { MonthlyFrozenChart } from "@/pages/stats/MonthlyFrozenChart";
import { FrozenUsedChart } from "@/pages/stats/FrozenUsedChart";
import { TotalFrozenOverTimeChart } from "@/pages/stats/TotalFrozenOverTimeChart";
import { getFrozenMs } from "@/lib/frozen-date";
import { combineDailyEventData, combineMonthlyEventData, getDailyEventData, getFrozenRemainingData, getMonthlyEventData } from "@/pages/stats/stats-data";

/** Get Monday 00:00 of the week `offset` weeks from now (0 = current, -1 = last week). */
function getWeekMonday(offset: number): Date {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + offset * 7);
  return monday;
}

/** Check if timestamp falls within a specific week. */
function isInWeek(ts: number, monday: Date): boolean {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return ts >= monday.getTime() && ts <= sunday.getTime();
}

/** Get the first day of the month `offset` months from now. */
function getMonthStart(offset: number): Date {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return date;
}

/** Check if timestamp falls within a specific month. */
function isInMonth(ts: number, start: Date): boolean {
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
  return ts >= start.getTime() && ts <= end.getTime();
}

export function StatsPage() {
  const { data: entries = [] } = useQuery({
    queryKey: ["entries"],
    queryFn: () => getEntries(),
  });

  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [halfYearOffset, setHalfYearOffset] = useState(0);
  const [view, setView] = useState<"weekly" | "monthly">("monthly");

  const weekMonday = useMemo(() => getWeekMonday(weekOffset), [weekOffset]);
  const monthStart = useMemo(() => getMonthStart(monthOffset), [monthOffset]);
  const weeklyRemainingData = useMemo(
    () => getFrozenRemainingData(entries, "week", weekMonday),
    [entries, weekMonday],
  );
  const monthlyRemainingData = useMemo(
    () => getFrozenRemainingData(entries, "month", new Date(), halfYearOffset),
    [entries, halfYearOffset],
  );

  // ── Week period ──────────────────────────────────────────────
  const { weekAdded, weekUsed } = useMemo(() => {
    let added = 0, used = 0;
    for (const e of entries) {
      const freezeMs = getFrozenMs(e);
      if (!Number.isNaN(freezeMs) && isInWeek(freezeMs, weekMonday)) {
        added += e.amount;
      }
      if (e.used) {
        const usedMs = e.usedAt
          ? Date.parse(e.usedAt)
          : freezeMs; // fall back to freeze date if usedAt is empty
        if (!Number.isNaN(usedMs) && isInWeek(usedMs, weekMonday)) {
          used += e.amount;
        }
      }
    }
    return { weekAdded: added, weekUsed: used };
  }, [entries, weekMonday]);

  // ── Month period ─────────────────────────────────────────────
  const { monthAdded, monthUsed } = useMemo(() => {
    let added = 0, used = 0;
    for (const e of entries) {
      const freezeMs = getFrozenMs(e);
      if (!Number.isNaN(freezeMs) && isInMonth(freezeMs, monthStart)) {
        added += e.amount;
      }
      if (e.used) {
        const usedMs = e.usedAt
          ? Date.parse(e.usedAt)
          : freezeMs; // fall back to freeze date if usedAt is empty
        if (!Number.isNaN(usedMs) && isInMonth(usedMs, monthStart)) {
          used += e.amount;
        }
      }
    }
    return { monthAdded: added, monthUsed: used };
  }, [entries, monthStart]);

  // ── Daily charts (for selected week) ─────────────────────────
  const dailyData = useMemo(
    () => getDailyEventData(entries, weekMonday, "frozen"),
    [entries, weekMonday],
  );
  const dailyUsedData = useMemo(
    () => getDailyEventData(entries, weekMonday, "used"),
    [entries, weekMonday],
  );
  const dailyComparisonData = useMemo(
    () => combineDailyEventData(dailyData, dailyUsedData),
    [dailyData, dailyUsedData],
  );

  // ── Date range labels ───────────────────────────────────────
  const weekLabel = useMemo(() => {
    const sun = new Date(weekMonday);
    sun.setDate(weekMonday.getDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-SG", { day: "numeric", month: "short" });
    return `${fmt(weekMonday)} – ${fmt(sun)}`;
  }, [weekMonday]);

  const monthLabel = useMemo(() => {
    return monthStart.toLocaleDateString("en-SG", { month: "short", year: "numeric" });
  }, [monthStart]);

  const chartTitle = useMemo(() => {
    const sun = new Date(weekMonday);
    sun.setDate(weekMonday.getDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-SG", { day: "numeric", month: "short" });
    return `Daily Frozen · ${fmt(weekMonday)} – ${fmt(sun)}`;
  }, [weekMonday]);

  // ── Monthly charts (half-year window) ─────────────────────────
  const { monthlyData, monthlyUsedData, combinedData, halfYearLabel } = useMemo(() => {
    const now = new Date();
    const frozen = getMonthlyEventData(entries, halfYearOffset, now, "frozen");
    const used = getMonthlyEventData(entries, halfYearOffset, now, "used");
    const start = new Date(now.getFullYear(), (now.getMonth() < 6 ? 0 : 6) + halfYearOffset * 6, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 5, 1);
    const fmt = (date: Date) => date.toLocaleDateString("en-SG", { month: "short", year: "numeric" });
    return {
      monthlyData: frozen,
      monthlyUsedData: used,
      combinedData: combineMonthlyEventData(frozen, used),
      halfYearLabel: `Monthly Frozen · ${fmt(start)} – ${fmt(end)}`,
    };
  }, [entries, halfYearOffset]);
  const usedHalfYearLabel = halfYearLabel.replace("Monthly Frozen", "Monthly Used");

  // ── Navigation callbacks ────────────────────────────────────
  const prevWeek = useCallback(() => setWeekOffset((o) => o - 1), []);
  const nextWeek = useCallback(() => setWeekOffset((o) => o + 1), []);
  const prevMonth = useCallback(() => setMonthOffset((o) => o - 1), []);
  const nextMonth = useCallback(() => setMonthOffset((o) => o + 1), []);
  const prevHalfYear = useCallback(() => setHalfYearOffset((o) => o - 1), []);
  const nextHalfYear = useCallback(() => setHalfYearOffset((o) => o + 1), []);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6">
      <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-3 backdrop-blur">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-white p-1 shadow-sm ring-1 ring-border/50" role="group" aria-label="Stats view">
          <button
            type="button"
            aria-pressed={view === "weekly"}
            onClick={() => setView("weekly")}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              view === "weekly" ? "bg-primary text-primary-foreground" : "border border-black bg-white text-foreground"
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            aria-pressed={view === "monthly"}
            onClick={() => setView("monthly")}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              view === "monthly" ? "bg-primary text-primary-foreground" : "border border-black bg-white text-foreground"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>
      {view === "weekly" ? (
        <div className="grid grid-cols-2 gap-3">
          <PeriodSummaryCard
            title="Week"
            subtitle={weekLabel}
            added={weekAdded}
            used={weekUsed}
            onPrev={prevWeek}
            onNext={nextWeek}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <PeriodSummaryCard
            title="Month"
            subtitle={monthLabel}
            added={monthAdded}
            used={monthUsed}
            onPrev={prevMonth}
            onNext={nextMonth}
          />
        </div>
      )}

      {view === "weekly" ? (
        <TotalFrozenOverTimeChart
          title={`Frozen Milk Remaining · ${weekLabel}`}
          data={weeklyRemainingData}
          onPrev={prevWeek}
          onNext={nextWeek}
        />
      ) : (
        <TotalFrozenOverTimeChart
          title={`Frozen Milk Remaining · ${halfYearLabel.replace("Monthly Frozen · ", "")}`}
          data={monthlyRemainingData}
          onPrev={prevHalfYear}
          onNext={nextHalfYear}
        />
      )}

      {view === "weekly" && (
        <>
          {/* Daily chart */}
          <DailyFrozenChart
            title={chartTitle}
            data={dailyData}
            onPrev={prevWeek}
            onNext={nextWeek}
          />

          {/* Daily used chart */}
          <DailyFrozenChart
            title={chartTitle.replace("Daily Frozen", "Daily Used")}
            data={dailyUsedData}
            onPrev={prevWeek}
            onNext={nextWeek}
            metricLabel="Used"
          />

          {/* Weekly Frozen vs Used comparison chart */}
          <FrozenUsedChart
            title={`Frozen vs Used · ${weekLabel}`}
            data={dailyComparisonData}
            xAxisDataKey="label"
            onPrev={prevWeek}
            onNext={nextWeek}
          />
        </>
      )}

      {view === "monthly" && (
        <>
          {/* Monthly chart */}
          <MonthlyFrozenChart
            title={halfYearLabel}
            data={monthlyData}
            onPrev={prevHalfYear}
            onNext={nextHalfYear}
          />

          {/* Monthly used chart */}
          <MonthlyFrozenChart
            title={usedHalfYearLabel}
            data={monthlyUsedData}
            onPrev={prevHalfYear}
            onNext={nextHalfYear}
            metricLabel="Used"
          />

          {/* Monthly Frozen vs Used comparison chart */}
          <FrozenUsedChart
            title={halfYearLabel.replace("Monthly Frozen", "Frozen vs Used")}
            data={combinedData}
            onPrev={prevHalfYear}
            onNext={nextHalfYear}
          />
        </>
      )}
      <h1 className="sr-only">Stats</h1>
    </main>
  );
}
