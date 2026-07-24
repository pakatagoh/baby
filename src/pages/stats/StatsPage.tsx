import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEntries } from "@/lib/entries-fn";
import { PeriodSummaryCard } from "@/pages/stats/PeriodSummaryCard";
import { DailyFrozenChart } from "@/pages/stats/DailyFrozenChart";
import { MonthlyFrozenChart } from "@/pages/stats/MonthlyFrozenChart";

function parseSheetDate(s: string): number {
  const m = s.match(/^(\d{1,2})-(\w{3})-(\d{2})$/);
  if (!m) return NaN;
  const d = new Date(`${m[2]} ${m[1]}, 20${m[3]}`);
  return d.getTime();
}

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

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function StatsPage() {
  const { data: entries = [] } = useQuery({
    queryKey: ["entries"],
    queryFn: () => getEntries(),
  });

  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [halfYearOffset, setHalfYearOffset] = useState(0);

  const weekMonday = useMemo(() => getWeekMonday(weekOffset), [weekOffset]);
  const monthStart = useMemo(() => getMonthStart(monthOffset), [monthOffset]);

  // ── Week period ──────────────────────────────────────────────
  const { weekAdded, weekUsed } = useMemo(() => {
    let added = 0, used = 0;
    for (const e of entries) {
      const freezeMs = parseSheetDate(e.date);
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
      const freezeMs = parseSheetDate(e.date);
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

  // ── Daily frozen (for selected week) ─────────────────────────
  const dailyData = useMemo(() => {
    const daily: Record<string, number> = {};
    for (const day of DAYS) daily[day] = 0;

    for (const e of entries) {
      const freezeMs = parseSheetDate(e.date);
      if (Number.isNaN(freezeMs)) continue;
      const d = new Date(freezeMs);
      if (d.getTime() >= weekMonday.getTime()) {
        const dayIdx = (d.getDay() + 6) % 7;
        if (dayIdx >= 0 && dayIdx < 7) {
          const weekSun = new Date(weekMonday);
          weekSun.setDate(weekMonday.getDate() + 6);
          weekSun.setHours(23, 59, 59, 999);
          if (d.getTime() <= weekSun.getTime()) {
            daily[DAYS[dayIdx]] += e.amount;
          }
        }
      }
    }

    return DAYS.map((day, i) => {
      const date = new Date(weekMonday);
      date.setDate(weekMonday.getDate() + i);
      const label = `${day} ${date.getDate()}/${date.getMonth() + 1}`;
      return { day, label, ml: daily[day] };
    });
  }, [entries, weekMonday]);

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

  // ── Monthly frozen (half-year window) ─────────────────────────
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

  const { monthlyData, halfYearLabel } = useMemo(() => {
    const now = new Date();
    // Current half: Jan-Jun if month ≤ 5, else Jul-Dec
    const currentHalfStart = now.getMonth() < 6 ? 0 : 6;
    const halfStartMonth = currentHalfStart + halfYearOffset * 6;

    // Compute the year for this half
    const halfYear = now.getFullYear() + Math.floor((now.getMonth() + halfYearOffset * 6) / 12);

    const monthly: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const mIdx = (halfStartMonth + i + 12) % 12;
      monthly[MONTHS[mIdx]] = 0;
    }

    // Map for matching: "Jan" → [2026], "Feb" → [2026], etc.
    const monthYears: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const mIdx = (halfStartMonth + i + 12) % 12;
      const mYear = halfYear + Math.floor((halfStartMonth + i) / 12);
      monthYears[MONTHS[mIdx]] = mYear;
    }

    for (const e of entries) {
      const freezeMs = parseSheetDate(e.date);
      if (Number.isNaN(freezeMs)) continue;
      const d = new Date(freezeMs);
      const mName = MONTHS[d.getMonth()];
      if (monthYears[mName] === d.getFullYear()) {
        monthly[mName] = (monthly[mName] ?? 0) + e.amount;
      }
    }

    const data = Object.entries(monthly).map(([month, ml]) => ({ month, ml }));
    const first = data[0]?.month ?? "";
    const last = data[data.length - 1]?.month ?? "";
    const firstYear = monthYears[first] ?? "";
    const lastYear = monthYears[last] ?? "";
    const label = `Monthly Frozen · ${first} ${firstYear} – ${last} ${lastYear}`;

    return { monthlyData: data, halfYearLabel: label };
  }, [entries, halfYearOffset]);

  // ── Navigation callbacks ────────────────────────────────────
  const prevWeek = useCallback(() => setWeekOffset((o) => o - 1), []);
  const nextWeek = useCallback(() => setWeekOffset((o) => o + 1), []);
  const prevMonth = useCallback(() => setMonthOffset((o) => o - 1), []);
  const nextMonth = useCallback(() => setMonthOffset((o) => o + 1), []);
  const prevHalfYear = useCallback(() => setHalfYearOffset((o) => o - 1), []);
  const nextHalfYear = useCallback(() => setHalfYearOffset((o) => o + 1), []);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="sr-only">📊 Stats</h1>
      </div>

      {/* Period cards */}
      <div className="grid grid-cols-2 gap-3">
        <PeriodSummaryCard
          title="Week"
          subtitle={weekLabel}
          added={weekAdded}
          used={weekUsed}
          onPrev={prevWeek}
          onNext={nextWeek}
        />
        <PeriodSummaryCard
          title="Month"
          subtitle={monthLabel}
          added={monthAdded}
          used={monthUsed}
          onPrev={prevMonth}
          onNext={nextMonth}
        />
      </div>

      {/* Daily chart */}
      <DailyFrozenChart
        title={chartTitle}
        data={dailyData}
        onPrev={prevWeek}
        onNext={nextWeek}
      />

      {/* Monthly chart */}
      <MonthlyFrozenChart
        title={halfYearLabel}
        data={monthlyData}
        onPrev={prevHalfYear}
        onNext={nextHalfYear}
      />
    </main>
  );
}
