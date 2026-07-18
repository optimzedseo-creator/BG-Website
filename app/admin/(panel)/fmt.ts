// Tiny presentation formatters shared by the module surfaces (Build B).
// Pure functions — safe on server and client.

/** ISO string → "YYYY-MM-DD". */
export function fmtDay(iso: string): string {
  return iso.slice(0, 10);
}

/** Seconds → "42s" / "3m 05s". Null-safe for missing durations. */
export function fmtSeconds(s: number | null): string {
  if (s === null) return "–";
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
