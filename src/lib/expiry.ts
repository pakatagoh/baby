import type { MilkSheetEntry } from "@/lib/sheets";
import { getFrozenMs } from "@/lib/frozen-date";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * Parse a sheet date string ("DD-Mon-YY") and add `months` offset.
 * Returns "Mon-YY" (e.g., "Oct-26") or `null` if unparseable.
 */
export function getExpiryMonth(
  entry: MilkSheetEntry,
  offsetMonths = 3,
): string | null {
  const freezeMs = getFrozenMs(entry);
  if (Number.isNaN(freezeMs)) return null;
  const d = new Date(freezeMs);

  d.setMonth(d.getMonth() + offsetMonths);

  return `${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;
}

/** "Oct-26" → "October 2026" */
export function formatExpiryMonth(key: string): string {
  const [mon, yy] = key.split("-");
  const idx = MONTHS.indexOf(mon as (typeof MONTHS)[number]);
  if (idx === -1) return key;
  const full = new Date(2000 + Number(yy), idx, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  return full;
}

/**
 * Parse a sheet date string ("DD-Mon-YY") and add `months` offset.
 * Returns "DD-Mon-YY" (e.g., "15-Oct-26") or `null` if unparseable.
 */
export function getExpiryDate(
  entry: MilkSheetEntry,
  offsetMonths = 3,
): string | null {
  const freezeMs = getFrozenMs(entry);
  if (Number.isNaN(freezeMs)) return null;
  const d = new Date(freezeMs);

  d.setMonth(d.getMonth() + offsetMonths);

  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd}-${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;
}

/** "15-Oct-26" → "15 October 2026" */
export function formatExpiryDate(dateStr: string): string {
  const m = dateStr.match(/^(\d{2})-(\w{3})-(\d{2})$/);
  if (!m) return dateStr;
  const idx = MONTHS.indexOf(m[2] as (typeof MONTHS)[number]);
  if (idx === -1) return dateStr;
  const d = new Date(2000 + Number(m[3]), idx, Number(m[1]));
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

/** "16-Oct-26" → "16 Oct 2026" */
export function formatExpiryShort(dateStr: string): string {
  const m = dateStr.match(/^(\d{1,2})-(\w{3})-(\d{2})$/);
  if (!m) return dateStr;
  return `${parseInt(m[1], 10)} ${m[2]} 20${m[3]}`;
}
