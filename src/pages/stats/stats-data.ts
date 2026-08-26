import type { MilkSheetEntry } from "@/lib/sheets";
import { getFrozenMs } from "@/lib/frozen-date";

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export type StatsEvent = "frozen" | "used";

/** Return the timestamp for a chart event, or NaN when the event is unavailable. */
export function getEventMs(entry: MilkSheetEntry, event: StatsEvent): number {
  if (event === "used") {
    if (!entry.used) return Number.NaN;
    if (!entry.usedAt) return getEventMs(entry, "frozen");
    const usedMs = Date.parse(entry.usedAt);
    return Number.isNaN(usedMs) ? getEventMs(entry, "frozen") : usedMs;
  }
  return getFrozenMs(entry);
}

export function getDailyEventData(
  entries: MilkSheetEntry[],
  weekMonday: Date,
  event: StatsEvent,
) {
  const daily = DAYS.map(() => 0);
  const weekEnd = new Date(weekMonday);
  weekEnd.setDate(weekMonday.getDate() + 7);

  for (const entry of entries) {
    const eventMs = getEventMs(entry, event);
    if (Number.isNaN(eventMs)) continue;
    const date = new Date(eventMs);
    if (eventMs < weekMonday.getTime() || eventMs >= weekEnd.getTime()) continue;
    const dayIndex = (date.getDay() + 6) % 7;
    daily[dayIndex] += entry.amount;
  }

  return DAYS.map((day, index) => {
    const date = new Date(weekMonday);
    date.setDate(weekMonday.getDate() + index);
    return {
      day,
      label: `${day} ${date.getDate()}/${date.getMonth() + 1}`,
      ml: daily[index],
    };
  });
}

export function getMonthlyEventData(
  entries: MilkSheetEntry[],
  halfYearOffset: number,
  now: Date,
  event: StatsEvent,
) {
  const currentHalfStart = now.getMonth() < 6 ? 0 : 6;
  const start = new Date(now.getFullYear(), currentHalfStart + halfYearOffset * 6, 1);
  const data = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    return { month: MONTHS[date.getMonth()], ml: 0 };
  });

  for (const entry of entries) {
    const eventMs = getEventMs(entry, event);
    if (Number.isNaN(eventMs)) continue;
    const date = new Date(eventMs);
    const monthIndex =
      (date.getFullYear() - start.getFullYear()) * 12 + date.getMonth() - start.getMonth();
    if (monthIndex >= 0 && monthIndex < 6) data[monthIndex].ml += entry.amount;
  }

  return data;
}

export function getWeeklyEventData(
  entries: MilkSheetEntry[],
  windowOffset: number,
  now: Date,
  event: StatsEvent,
) {
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  currentMonday.setHours(0, 0, 0, 0);
  const start = new Date(currentMonday);
  start.setDate(currentMonday.getDate() + (windowOffset * 6 - 5) * 7);
  const data = Array.from({ length: 6 }, (_, index) => {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + index * 7);
    return { week: `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()]}`, ml: 0 };
  });

  for (const entry of entries) {
    const eventMs = getEventMs(entry, event);
    if (Number.isNaN(eventMs)) continue;
    const date = new Date(eventMs);
    const weekIndex = Math.floor((eventMs - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (weekIndex >= 0 && weekIndex < 6 && date >= start) data[weekIndex].ml += entry.amount;
  }

  return data;
}

export function combineWeeklyEventData(
  frozenData: Array<{ week: string; ml: number }>,
  usedData: Array<{ week: string; ml: number }>,
) {
  return frozenData.map((frozen, index) => ({
    week: frozen.week,
    frozen: frozen.ml,
    used: usedData[index]?.ml ?? 0,
  }));
}

export function combineMonthlyEventData(
  frozenData: Array<{ month: string; ml: number }>,
  usedData: Array<{ month: string; ml: number }>,
) {
  return frozenData.map((frozen, index) => ({
    month: frozen.month,
    frozen: frozen.ml,
    used: usedData[index]?.ml ?? 0,
  }));
}
