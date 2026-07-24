/** Format an ISO frozenAt datetime for display, or fall back to date+time fields. */
export function formatFrozenDate(entry: { frozenAt: string; date: string }): string {
  if (entry.frozenAt) {
    const d = new Date(entry.frozenAt);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = d.toLocaleString("en-US", { month: "short" });
      const yy = String(d.getFullYear()).slice(2);
      return `${dd}-${mm}-${yy}`;
    }
  }
  return entry.date;
}

export function formatFrozenTime(entry: { frozenAt: string; time: string }): string {
  if (entry.frozenAt) {
    const d = new Date(entry.frozenAt);
    if (!isNaN(d.getTime())) {
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    }
  }
  return entry.time;
}

export function formatFrozenDateTime(entry: { frozenAt: string; date: string; time: string }): string {
  return `${formatFrozenDate(entry)} ${formatFrozenTime(entry)}`;
}

/** Get the freeze timestamp (ms) from frozenAt, falling back to date parsing. */
export function getFrozenMs(entry: { frozenAt: string; date: string }): number {
  if (entry.frozenAt) {
    const ms = Date.parse(entry.frozenAt);
    if (!Number.isNaN(ms)) return ms;
  }
  // Fallback for old entries without frozenAt
  const m = entry.date.match(/^(\d{1,2})-(\w{3})-(\d{2})$/);
  if (!m) return NaN;
  const MONTHS: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const month = MONTHS[m[2]];
  if (month === undefined) return NaN;
  return new Date(2000 + Number(m[3]), month, Number(m[1])).getTime();
}
