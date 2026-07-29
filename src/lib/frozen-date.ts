const SGT_TIME_ZONE = "Asia/Singapore";

function sgtDateParts(date: Date): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: SGT_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

function sgtParts(frozenAt: string): Record<string, string> | null {
  const date = new Date(frozenAt);
  return Number.isNaN(date.getTime()) ? null : sgtDateParts(date);
}

/** Current time as an ISO 8601 datetime in Singapore time. */
export function currentSgtISO(): string {
  const parts = sgtDateParts(new Date());
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+08:00`;
}

/** Format frozenAt as DD-Mon-YY in Singapore time. */
export function formatFrozenDate(entry: { frozenAt: string }): string {
  const parts = sgtParts(entry.frozenAt);
  if (!parts) return "—";
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: SGT_TIME_ZONE,
    month: "short",
  }).format(new Date(entry.frozenAt));
  return `${parts.day}-${month}-${parts.year.slice(-2)}`;
}

/** Format frozenAt as HH:mm in Singapore time. */
export function formatFrozenTime(entry: { frozenAt: string }): string {
  const parts = sgtParts(entry.frozenAt);
  return parts ? `${parts.hour}:${parts.minute}` : "—";
}

export function formatFrozenDateTime(entry: { frozenAt: string }): string {
  return `${formatFrozenDate(entry)} ${formatFrozenTime(entry)}`;
}

/** Format a usedAt timestamp as DD-Mon-YY HH:mm in Singapore time. */
export function formatUsedAt(usedAt: string): string {
  const parts = sgtParts(usedAt);
  if (!parts) return "—";
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: SGT_TIME_ZONE,
    month: "short",
  }).format(new Date(usedAt));
  return `${parts.day}-${month}-${parts.year.slice(-2)} ${parts.hour}:${parts.minute}`;
}

/** A YYYY-MM-DD value suitable for a native date input, in Singapore time. */
export function frozenDateInput(entry: { frozenAt: string }): string {
  const parts = sgtParts(entry.frozenAt);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : "";
}

/** An HH:mm value suitable for a native time input, in Singapore time. */
export function frozenTimeInput(entry: { frozenAt: string }): string {
  const parts = sgtParts(entry.frozenAt);
  return parts ? `${parts.hour}:${parts.minute}` : "";
}

/** Combine date/time form values into a valid ISO 8601 datetime in SGT. */
export function toFrozenAt(date: string, time: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("A valid frozen date and time are required");
  }
  return `${date}T${time}:00+08:00`;
}

/** Get the freeze instant in milliseconds. */
export function getFrozenMs(entry: { frozenAt: string }): number {
  return Date.parse(entry.frozenAt);
}
