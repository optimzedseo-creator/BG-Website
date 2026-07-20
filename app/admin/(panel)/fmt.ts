// Tiny presentation formatters shared by the module surfaces (Build B).
// Pure functions — safe on server and client.

import type { PeriodEcho } from "@/lib/admin/iq/types";

/** ISO string → "YYYY-MM-DD". */
export function fmtDay(iso: string): string {
  return iso.slice(0, 10);
}

const HEAD_NOUN: Record<string, string> = {
  week: "week",
  month: "month",
  quarter: "quarter",
  year: "year",
};

/**
 * PERIOD-UI wave — the ONE head sub-line period label, rendered from the
 * payload PeriodEcho (server-authoritative; never client re-derivation):
 * "today" / "this month to date" / "2026-07-10 to 2026-07-16" /
 * "last 30 days" (internal window fallback only). Used by every module head
 * AND the Command surface so the same echo can never read two ways.
 */
export function periodHeadLabel(echo: PeriodEcho, windowDays: number): string {
  if (echo.kind === "window") return `last ${windowDays} days`;
  if (echo.kind === "custom") return `${fmtDay(echo.from)} to ${fmtDay(echo.to)}`;
  if (echo.kind === "today") return "today";
  return `this ${HEAD_NOUN[echo.kind]}${echo.partial ? " to date" : ""}`;
}

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Chart tick label for a trend bucket key of ANY granularity (PERIOD-UI wave —
 * the module charts now ride calendar axes): hour "2026-07-18T14" → "14:00",
 * Sunday-week "wk-2026-07-12" → "07-12", month "2026-07" → "Jul", day
 * "2026-07-18" → "07-18". Never hard-codes a cadence (TREND_ADJ house rule's
 * sibling for axis labels).
 */
export function bucketTickLabel(key: string): string {
  if (key.startsWith("wk-")) return key.slice(8);
  if (key.includes("T")) return `${key.slice(11)}:00`;
  if (key.length === 7) return MONTH_ABBR[Number(key.slice(5)) - 1] ?? key.slice(5);
  return key.slice(5);
}

/** Seconds → "42s" / "3m 05s". Null-safe for missing durations: renders the
 * honest null glyph word (DESIGN 5.17), never an en-dash. */
export function fmtSeconds(s: number | null): string {
  if (s === null) return "none yet";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m}m ${String(rest).padStart(2, "0")}s`;
}

/**
 * U4 honesty guard for KPI delta captions: true when the ENTIRE prior compare
 * window ends before data collection began (countingSince >= window start).
 * "+n vs prior Nd" against a period with no possible data is a fake
 * comparison — render "first period with data" instead. ISO strings compare
 * lexicographically, so no Date parsing is needed.
 */
export function priorWindowPredatesData(
  sinceIso: string,
  countingSinceIso: string | null
): boolean {
  return countingSinceIso !== null && countingSinceIso >= sinceIso;
}
