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

export function getFrozenRemainingData(
  entries: MilkSheetEntry[],
  range: "week" | "month",
  anchor: Date,
  offset = 0,
) {
  const start = new Date(anchor);
  if (range === "week") {
    start.setHours(0, 0, 0, 0);
  } else {
    const halfStart = anchor.getMonth() < 6 ? 0 : 6;
    start.setMonth(halfStart + offset * 6, 1);
    start.setHours(0, 0, 0, 0);
  }

  const events: Array<{ timestamp: number; delta: number }> = [];
  for (const entry of entries) {
    const frozenMs = getEventMs(entry, "frozen");
    if (!Number.isNaN(frozenMs)) events.push({ timestamp: frozenMs, delta: entry.amount });
    const usedMs = getEventMs(entry, "used");
    if (!Number.isNaN(usedMs)) events.push({ timestamp: usedMs, delta: -entry.amount });
  }
  events.sort((a, b) => a.timestamp - b.timestamp);

  let remaining = events
    .filter((event) => event.timestamp < start.getTime())
    .reduce((total, event) => total + event.delta, 0);
  const points = range === "week" ? 7 : 6;

  return Array.from({ length: points }, (_, index) => {
    const bucketStart = new Date(start);
    if (range === "week") bucketStart.setDate(start.getDate() + index);
    else bucketStart.setMonth(start.getMonth() + index);
    const bucketEnd = new Date(bucketStart);
    if (range === "week") bucketEnd.setDate(bucketStart.getDate() + 1);
    else bucketEnd.setMonth(bucketStart.getMonth() + 1);

    for (const event of events) {
      if (event.timestamp >= bucketStart.getTime() && event.timestamp < bucketEnd.getTime()) {
        remaining += event.delta;
      }
    }

    return {
      date: range === "week"
        ? `${DAYS[(bucketStart.getDay() + 6) % 7]} ${bucketStart.getDate()}/${bucketStart.getMonth() + 1}`
        : MONTHS[bucketStart.getMonth()],
      totalMl: remaining,
    };
  });
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

export function combineDailyEventData(
  frozenData: Array<{ day: string; label: string; ml: number }>,
  usedData: Array<{ day: string; label: string; ml: number }>,
) {
  return frozenData.map((frozen, index) => ({
    day: frozen.day,
    label: frozen.label,
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
