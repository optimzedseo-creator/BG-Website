// ADMIN-IQ — shared metric machinery (DATA-SPEC §7.1). ONE copy, runs on BOTH
// the live and (Wave 4) demo sources, so guardrails cannot drift between them.
//
// This file is the org's single source of truth for:
//   (a) date bucketing (America/New_York — fixes the old dashboard's UTC bug)
//   (b) N-guard suppression thresholds + helpers (counts-before-rates canon)
//   (c) SOURCE_CLASS_MAP — the versioned referrer-host → class map (B3)
//   (d) compare-period math + per-metric down-is-good flags
//   (e) the recommendations rule-engine SKELETON (rules land Wave 2, WP2.0)
//
// No PII fields anywhere. No imports from app/. Pure functions only — no
// Prisma, no I/O — so both sources and any test can call it freely.

import type {
  CompareMode,
  DeltaOrCounts,
  Filters,
  FirstEntry,
  InsightClass,
  IqInsightCard,
  IqRuleInputs,
  PeriodComparison,
  PeriodEcho,
  PeriodKind,
  RateOrCounts,
  SourceClass,
  WindowDays,
} from "./types";

export const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// (a) Date bucketing — America/New_York boundaries (DATA-SPEC §2)
// ---------------------------------------------------------------------------
// The old dashboard's dayKey() sliced UTC ISO strings, so evening EST/EDT
// traffic landed on TOMORROW's bar. bucketKey() formats through
// Intl.DateTimeFormat with timeZone "America/New_York" — Intl applies the
// correct EST/EDT offset per instant, so DST is handled without any manual
// offset math and without a new dependency.

const NY_TIME_ZONE = "America/New_York";

const nyPartsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: NY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Calendar date parts of an instant as observed in America/New_York. */
export function nyDateParts(date: Date): { y: number; m: number; d: number } {
  let y = 0;
  let m = 0;
  let d = 0;
  for (const part of nyPartsFmt.formatToParts(date)) {
    if (part.type === "year") y = Number(part.value);
    else if (part.type === "month") m = Number(part.value);
    else if (part.type === "day") d = Number(part.value);
  }
  return { y, m, d };
}

// ---------------------------------------------------------------------------
// (a-ii) NY-parts → UTC-instant (Dashboard Wave WP1). DST-safe, no dependency.
// ---------------------------------------------------------------------------

/**
 * The NY UTC-offset (ms) at a given instant — wall-clock minus UTC, so negative
 * in the Western hemisphere (EDT −4h, EST −5h). Measured through Intl, so DST
 * is exact without any offset table.
 */
const nyOffsetFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: NY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function nyOffsetMs(instant: Date): number {
  const map: Record<string, number> = {};
  for (const p of nyOffsetFmt.formatToParts(instant)) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  let hour = map.hour;
  if (hour === 24) hour = 0; // Intl hourCycle quirk: local midnight can format as "24"
  const wallAsUtc = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second);
  return wallAsUtc - instant.getTime();
}

/**
 * The UTC instant of NY-local midnight for a calendar date (DST-safe, no
 * dependency). Same discipline as windowBucketKeys: GUESS the instant with
 * Date.UTC, MEASURE the NY offset there, CORRECT once. The guess (midnight
 * numbered as UTC) lands in the prior NY evening (~19–20:00) — on the same side
 * of any 02:00 DST transition as the target midnight — so a single correction
 * is exact for day boundaries. `m` is 1-based; out-of-range m/d normalize
 * through Date.UTC (d+1 rolls the month, m-1 rolls the year), so callers can do
 * calendar arithmetic inline.
 */
export function nyStartOfDay(y: number, m: number, d: number): Date {
  const guess = Date.UTC(y, m - 1, d, 0, 0, 0);
  const offset = nyOffsetMs(new Date(guess));
  return new Date(guess - offset);
}

/** ISO-8601 week key ("2026-W29") for a calendar date (parts already tz-resolved). */
function isoWeekKey(y: number, m: number, d: number): string {
  // Standard ISO week algorithm on a UTC-constructed date built from the
  // ALREADY-timezone-resolved calendar parts (so no double conversion).
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayNum = dt.getUTCDay() || 7; // Mon=1 .. Sun=7
  dt.setUTCDate(dt.getUTCDate() + 4 - dayNum); // shift to the week's Thursday
  const isoYear = dt.getUTCFullYear();
  const yearStart = Date.UTC(isoYear, 0, 1);
  const week = Math.ceil(((dt.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${isoYear}-W${pad2(week)}`;
}

/**
 * Canonical bucket key (DATA-SPEC §2): day buckets ("2026-07-18") for 7d/30d,
 * ISO-week buckets ("2026-W29") for 90d. Boundaries in America/New_York.
 *
 * ⚠ GSC data is NEVER passed through this — chart GSC by its stored @db.Date
 * via gscDateKey() below (GSC's own day convention; the two calendars are
 * never mixed on one axis).
 */
export function bucketKey(date: Date, window: WindowDays): string {
  const { y, m, d } = nyDateParts(date);
  if (window === 90) return isoWeekKey(y, m, d);
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/**
 * Key for a GSC @db.Date value (stored as midnight UTC): the STORED date,
 * unmodified. Do not re-bucket GSC through bucketKey().
 */
export function gscDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Ordered, de-duplicated bucket keys covering the whole window ending `now` —
 * used to zero-fill trend series so empty days/weeks still render.
 *
 * Iterates NY CALENDAR DAYS (nyDateParts + Date.UTC day arithmetic), never
 * fixed 24h instants: a 23h spring-forward day can never be skipped and a 25h
 * fall-back day can never dedup the key list short (bradley-database F1 /
 * bradley-api Change 4).
 */
export function windowBucketKeys(window: WindowDays, now: Date = new Date()): string[] {
  const { y, m, d } = nyDateParts(now);
  const keys: string[] = [];
  let last: string | null = null;
  for (let i = window - 1; i >= 0; i--) {
    // Date.UTC normalizes d - i into a real calendar date; each NY calendar
    // day in the window appears exactly once, regardless of DST transitions.
    const dt = new Date(Date.UTC(y, m - 1, d - i));
    const key =
      window === 90
        ? isoWeekKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
        : `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
    if (key !== last) {
      keys.push(key);
      last = key;
    }
  }
  return keys;
}

/**
 * Tolerant ?p= querystring parser (WP2.3: parse params tolerantly) — anything
 * that isn't exactly 7/30/90 falls back to the 30-day default. ONE copy used
 * by pages, the /api/admin/iq handler, and the client period switch.
 *
 * PERIOD-UI wave: ?p= is now a DORMANT legacy fallback only. No UI emits it;
 * a legacy ?p=7/30/90 deep link still parses here, but because such links
 * carry no ?period=, parsePeriodParam resolves them to the MTD default and
 * the window value never drives a surface (contract rule 2: `window` stays
 * the required internal fallback type).
 */
export function parseWindowParam(raw: string | null | undefined): WindowDays {
  if (raw === "7") return 7;
  if (raw === "90") return 90;
  return 30;
}

const PERIOD_KINDS: readonly PeriodKind[] = ["today", "week", "month", "quarter", "year", "custom"];
const COMPARE_MODES: readonly CompareMode[] = ["prior", "year", "none"];

/** Parsed dashboard-wave URL params (WP1). `period: null` = window mode — the
 * INTERNAL fallback only since the PERIOD-UI wave (parsePeriodParam never
 * emits it anymore; the type keeps null so hand-built signals stay typable and
 * consumers keep their defensive branches). */
export interface PeriodParams {
  period: PeriodKind | null;
  compareMode: CompareMode;
  from: string | null;
  to: string | null;
  cmpFrom: string | null;
  cmpTo: string | null;
}

/**
 * Tolerant URL parser for the dashboard-wave grammar (WP1) — the sibling of
 * parseWindowParam. Grammar:
 *   ?period=today|week|month|quarter|year|custom
 *   &compare=prior|year|none
 *   &from&to&cmpFrom&cmpTo   ("YYYY-MM-DD", validated by parseDayParam)
 *
 * DEFAULTS + FALLBACK (documented, like parseWindowParam's drop-to-30):
 *  - `period` absent or unrecognized → "month" (PERIOD-UI wave: the admin
 *    default is MONTH-TO-DATE, Brad's ruling). This is the ONE defaulting
 *    seam — every page and handler that parses the grammar resolves MTD when
 *    no period params are present. Legacy ?p=7/30/90 deep links carry no
 *    ?period=, so they land on the MTD default too (?p= stays tolerated as a
 *    dormant fallback; it never drives a surface anymore).
 *  - `period=custom` with no valid from/to range → "month" (same default; a
 *    lone ?period=custom never silently resolves to nothing).
 *  - `compare` absent or unrecognized → "prior" (the historical default the
 *    dashboard has always computed).
 * from/to/cmpFrom/cmpTo are round-trip-validated NY day strings or null.
 * `period: null` (window mode) is NO LONGER producible from a URL — it
 * survives only as the internal fallback type (contract rule 2).
 */
export function parsePeriodParam(params: {
  period?: string | null;
  compare?: string | null;
  from?: string | null;
  to?: string | null;
  cmpFrom?: string | null;
  cmpTo?: string | null;
}): PeriodParams {
  const from = parseDayParam(params.from);
  const to = parseDayParam(params.to);
  const cmpFrom = parseDayParam(params.cmpFrom);
  const cmpTo = parseDayParam(params.cmpTo);
  const rawPeriod = PERIOD_KINDS.includes(params.period as PeriodKind)
    ? (params.period as PeriodKind)
    : null;
  // PERIOD-UI wave: absent/unrecognized period → the MTD default; "custom"
  // without a valid from/to range drops to the same default (a lone
  // ?period=custom never silently resolves to nothing).
  const period: PeriodKind =
    rawPeriod === null || (rawPeriod === "custom" && !parseCustomRange(from, to))
      ? "month"
      : rawPeriod;
  const compareMode: CompareMode = COMPARE_MODES.includes(params.compare as CompareMode)
    ? (params.compare as CompareMode)
    : "prior";
  // api N1 / data-analyst N1 note: the old year→prior coercion guarded
  // compare=year under period null (window mode, no calendar anchor). The
  // parser now always resolves a calendar period (MTD default), so "year"
  // always has an anchor and the coercion is retired. resolvePeriod's window
  // branch still computes plain prior-period if a hand-built Filters ever
  // pairs period:undefined with compareMode "year" — and labels it honestly
  // as "prior period".
  return { period, compareMode, from, to, cmpFrom, cmpTo };
}

/**
 * WP2 — parsed URL period params → the Filters fragment. ONE copy used by the
 * overview page AND the /admin/api/iq command handler so the two callers can
 * never disagree about which params reach the source:
 *  - `period: null` (window fallback) forwards NOTHING but compareMode — a
 *    stray ?from/?to without a preset must NOT flip the command surface onto
 *    the custom path (that lane belongs to period=custom; the lone-from/to
 *    custom behavior stays a GSC/funnel drill contract, WP3.8).
 *  - from/to/cmpFrom/cmpTo forward only under period=custom (api #9 ruling:
 *    calendar presets always derive their comparison from compareMode).
 * compareMode always forwards: ?compare=none is honest under the window
 * fallback too (resolvePeriod suppresses the comparison; cards read "n-a").
 */
export function periodFilters(
  pp: PeriodParams
): Pick<Filters, "period" | "compareMode" | "from" | "to" | "cmpFrom" | "cmpTo"> {
  if (!pp.period) return { compareMode: pp.compareMode };
  if (pp.period !== "custom") return { period: pp.period, compareMode: pp.compareMode };
  return {
    period: "custom",
    compareMode: pp.compareMode,
    from: pp.from ?? undefined,
    to: pp.to ?? undefined,
    cmpFrom: pp.cmpFrom ?? undefined,
    cmpTo: pp.cmpTo ?? undefined,
  };
}

/** Tolerant module-chip dimension parser (device/country): opaque, length-
 * capped strings — they only ever filter in-memory rows, never SQL. Control
 * characters are stripped before the cap (security hardening: these values
 * echo back into payloads/URLs and must never carry \x00-\x1f/\x7f). ONE copy
 * used by the module pages and the /admin/api/iq/* handlers. */
export function parseDimParam(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const v = raw.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 64);
  return v.trim() ? v : undefined;
}

/**
 * Site-path parser shared by the page + activity handlers AND the activity
 * server page (security C2 — one copy so the page and its handler can't drift):
 * strip control characters, cap at 512, require a leading "/". Returns null for
 * anything else (it only ever becomes an exact-match filter, never SQL).
 */
export function parsePathParam(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 512);
  return v.startsWith("/") ? v : null;
}

/**
 * WP3.6 — GSC query-text parser. The query is attacker-supplied TEXT used ONLY
 * as an exact-match filter (never interpolated into SQL, same discipline as
 * parsePathParam): strip control characters, cap at 200 chars. Returns null for
 * empty/blank input. Mirrors liveSearch's exact-match query aggregation.
 */
export function parseQueryParam(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 200);
  return v.trim() ? v : null;
}

/**
 * WP3.7 — strict NY-day-key parser ("YYYY-MM-DD"). Anything not matching the
 * exact shape returns null (it only ever becomes an equality filter on a day
 * bucket, never SQL).
 */
export function parseDayParam(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  // Security C1: the regex admits impossible dates (2026-13-45, 2026-02-30)
  // which would pass the handler 400 gate then throw 500 in Prisma. Confirm the
  // date round-trips (a real calendar day) before returning it.
  const d = new Date(`${raw}T00:00:00Z`);
  return d.toISOString().slice(0, 10) === raw ? raw : null;
}

/** WP3.8 — the largest custom range we will resolve, in days (guards a runaway
 * fetch-then-aggregate window; ~1 year is far beyond any real drill need). */
export const CUSTOM_RANGE_MAX_DAYS = 366;

/**
 * WP3.8 — validate a custom from/to range. Both must be "YYYY-MM-DD", from must
 * be <= to (ISO dates sort lexically), and the span must not exceed
 * CUSTOM_RANGE_MAX_DAYS. Returns the normalized pair or null (caller falls back
 * to `window`). Additive to the wire contract — never replaces `window`.
 */
export function parseCustomRange(
  from: string | null | undefined,
  to: string | null | undefined
): { from: string; to: string } | null {
  const f = parseDayParam(from);
  const t = parseDayParam(to);
  if (!f || !t || f > t) return null;
  const spanDays = Math.round((Date.parse(`${t}T00:00:00Z`) - Date.parse(`${f}T00:00:00Z`)) / DAY_MS) + 1;
  // Security C2: a NaN span (impossible-but-parseable input) must fall back to
  // window, not slip through as a bad pair (NaN > MAX is false, NaN < 1 is false).
  if (Number.isNaN(spanDays) || spanDays < 1 || spanDays > CUSTOM_RANGE_MAX_DAYS) return null;
  return { from: f, to: t };
}

/**
 * WP3.8 — resolve a concrete period from Filters. A valid custom range (from+to)
 * wins and uses UTC calendar-day boundaries (since = 00:00 of `from`, until =
 * end of `to`); otherwise the rolling `window` period ending `now` is returned.
 * The second value tells callers whether a custom range applied (for the `range`
 * echo on payloads).
 */
// ---------------------------------------------------------------------------
// Dashboard Wave WP1 — calendar period + comparison engine (America/New_York).
// LOCKED DECISIONS (Brad): weeks START SUNDAY; quarters = Jan/Apr/Jul/Oct; year
// = Jan–Dec; current presets are PARTIAL/to-date (until = now). resolvePeriod()
// keeps `window` as the required default + fallback (contract rule 2).
// ---------------------------------------------------------------------------

/** Trend bucket granularity for a resolved period. */
export type BucketGranularity = "hour" | "day" | "week" | "month";

/** Bucket granularity per calendar preset (WP1): today→hour, week/month→day,
 * quarter→week, year→month. Custom derives from its span (rangeGranularity). */
export const PERIOD_GRANULARITY: Record<Exclude<PeriodKind, "custom">, BucketGranularity> = {
  today: "hour",
  week: "day",
  month: "day",
  quarter: "week",
  year: "month",
};

interface Anchor {
  y: number;
  m: number; // 1-based
  d: number;
}

/** Normalize (y, m, d) through Date.UTC as PURE CALENDAR MATH (not an instant),
 * so m=0 rolls to Dec of y-1, m=13 rolls to Jan of y+1, d=0/32 roll the month. */
function normParts(y: number, m: number, d: number): Anchor {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

/** The Sunday that starts the week containing (y,m,d). getUTCDay() on a pure
 * Date.UTC calendar value equals the calendar weekday (Sun=0), so no tz mixing. */
function sundayWeekStart(y: number, m: number, d: number): Anchor {
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  return normParts(y, m, d - dow);
}

/** Start-anchor of the calendar preset containing `now` (NY). */
function periodAnchor(kind: Exclude<PeriodKind, "custom">, now: Date): Anchor {
  const { y, m, d } = nyDateParts(now);
  switch (kind) {
    case "today":
      return { y, m, d };
    case "week":
      return sundayWeekStart(y, m, d);
    case "month":
      return { y, m, d: 1 };
    case "quarter":
      return { y, m: m - ((m - 1) % 3), d: 1 }; // 1..12 → 1,4,7,10
    case "year":
      return { y, m: 1, d: 1 };
  }
}

/** Anchor of the calendar unit immediately AFTER the one starting at `a`. */
function nextUnitAnchor(kind: Exclude<PeriodKind, "custom">, a: Anchor): Anchor {
  switch (kind) {
    case "today":
      return normParts(a.y, a.m, a.d + 1);
    case "week":
      return normParts(a.y, a.m, a.d + 7);
    case "month":
      return normParts(a.y, a.m + 1, 1);
    case "quarter":
      return normParts(a.y, a.m + 3, 1);
    case "year":
      return { y: a.y + 1, m: 1, d: 1 };
  }
}

/** Anchor of the calendar unit immediately BEFORE the one starting at `a`. */
function prevUnitAnchor(kind: Exclude<PeriodKind, "custom">, a: Anchor): Anchor {
  switch (kind) {
    case "today":
      return normParts(a.y, a.m, a.d - 1);
    case "week":
      return normParts(a.y, a.m, a.d - 7);
    case "month":
      return normParts(a.y, a.m - 1, 1);
    case "quarter":
      return normParts(a.y, a.m - 3, 1);
    case "year":
      return { y: a.y - 1, m: 1, d: 1 };
  }
}

function shiftYear(a: Anchor, delta: number): Anchor {
  return normParts(a.y + delta, a.m, a.d);
}

// ---- Bucket keys per granularity (adds hour + month; day + Sunday-week here) --
// NOTE: the legacy 7/30/90 rolling window still buckets via bucketKey()/
// windowBucketKeys() (ISO/Monday weeks for 90d). These Sunday-anchored keys are
// the CALENDAR-period series machinery (Brad's Sunday ruling); they do not
// touch the legacy window path, so shipped 90d charts are unchanged.

/** NY hour bucket key ("2026-07-18T14"). */
export function hourBucketKey(date: Date): string {
  const wall = new Date(date.getTime() + nyOffsetMs(date)); // NY wall clock, read via getUTC*
  return `${wall.getUTCFullYear()}-${pad2(wall.getUTCMonth() + 1)}-${pad2(
    wall.getUTCDate()
  )}T${pad2(wall.getUTCHours())}`;
}

/** NY calendar-day bucket key ("2026-07-18"). */
export function dayBucketKey(date: Date): string {
  const { y, m, d } = nyDateParts(date);
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Sunday-anchored NY week bucket key ("wk-2026-07-12" = the starting Sunday).
 * Brad's ruling: weeks start Sunday, NOT ISO Monday. Distinct on purpose from
 * isoWeekKey() (which the legacy 90d window keeps). */
export function sundayWeekKey(date: Date): string {
  const { y, m, d } = nyDateParts(date);
  const s = sundayWeekStart(y, m, d);
  return `wk-${s.y}-${pad2(s.m)}-${pad2(s.d)}`;
}

/** NY month bucket key ("2026-07"). */
export function monthBucketKey(date: Date): string {
  const { y, m } = nyDateParts(date);
  return `${y}-${pad2(m)}`;
}

/** Bucket key for an instant at a given granularity (WP1 dispatcher). */
export function bucketKeyFor(date: Date, granularity: BucketGranularity): string {
  switch (granularity) {
    case "hour":
      return hourBucketKey(date);
    case "day":
      return dayBucketKey(date);
    case "week":
      return sundayWeekKey(date);
    case "month":
      return monthBucketKey(date);
  }
}

/**
 * Ordered, de-duplicated bucket keys spanning [since, until) at `granularity` —
 * the WP1 zero-fill list for calendar/custom trend series (the calendar analogue
 * of windowBucketKeys). Walks NY calendar days/hours, never fixed spans, so a
 * DST transition never skips or duplicates a bucket.
 */
export function periodBucketKeys(
  since: Date,
  until: Date,
  granularity: BucketGranularity
): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const push = (k: string) => {
    if (!seen.has(k)) {
      seen.add(k);
      keys.push(k);
    }
  };
  const untilMs = until.getTime();

  if (granularity === "hour") {
    const HOUR = 60 * 60 * 1000;
    for (let t = since.getTime(); t < untilMs; t += HOUR) push(hourBucketKey(new Date(t)));
    return keys;
  }
  // day / week / month: walk NY calendar days from `since`, key each, and let
  // the Set collapse a day-walk into week/month buckets.
  const { y, m, d } = nyDateParts(since);
  for (let i = 0; i < 4000; i++) {
    const dayStart = nyStartOfDay(y, m, d + i);
    if (dayStart.getTime() >= untilMs) break;
    push(bucketKeyFor(dayStart, granularity));
  }
  return keys;
}

/** Bucket granularity for a custom span: hour ≤2d, day ≤45d, week ≤180d, else month. */
function rangeGranularity(since: Date, until: Date): BucketGranularity {
  const days = Math.round((until.getTime() - since.getTime()) / DAY_MS);
  if (days <= 2) return "hour";
  if (days <= 45) return "day";
  if (days <= 180) return "week";
  return "month";
}

const UNIT_LABEL: Record<Exclude<PeriodKind, "custom">, string> = {
  today: "day",
  week: "week",
  month: "month",
  quarter: "quarter",
  year: "year",
};

function comparisonLabel(
  kind: PeriodKind | "window",
  mode: Exclude<CompareMode, "none">
): string {
  if (mode === "year") {
    if (kind === "year") return "prior year";
    if (kind === "today") return "same day last year";
    if (kind === "custom" || kind === "window") return "same dates last year";
    // F5: a year-shifted week/day range compares the same DATES last year (the
    // weekday alignment differs — it is NOT "the same week"), so say so.
    // Feb 29 in the shifted range rolls to Mar 1 in a non-leap year (normParts).
    if (kind === "week") return "same dates last year";
    return `same ${UNIT_LABEL[kind]} last year`;
  }
  // prior
  if (kind === "today") return "yesterday";
  if (kind === "custom" || kind === "window") return "prior period";
  return `prior ${UNIT_LABEL[kind]}`;
}

/** The resolved comparison window (the honest "vs" span). */
export interface ResolvedComparison {
  since: Date;
  until: Date;
  kind: Exclude<CompareMode, "none">;
  /** The current period is still running → this is its EQUAL-ELAPSED slice
   * (priorEnd = priorStart + elapsed), not a full prior period. */
  partial: boolean;
  /** Elapsed whole days of the running period when partial; null when full. */
  elapsedDays: number | null;
  /** Factcheck W2: the M1 clamp fired — the prior slice is the full (shorter)
   * prior unit, NOT an equal-elapsed span; "same N days" would overclaim. */
  clamped: boolean;
  /** Names what the comparison is against ("prior month", "same day last year"). */
  label: string;
}

/** Everything a source needs to compute a period + its honest comparison. */
export interface ResolvedPeriod {
  period: Period;
  /** null when compareMode is "none". */
  comparison: ResolvedComparison | null;
  /** Echoed custom range (from/to), else null. */
  range: { from: string; to: string } | null;
  /** What drove resolution: a preset, "custom", or "window" (the fallback). */
  kind: PeriodKind | "window";
  granularity: BucketGranularity;
  /** The current period is to-date (still running). */
  partial: boolean;
}

/** Concrete since/until for a custom range at the requested day boundary. */
function customPeriod(custom: { from: string; to: string }, boundary: "ny" | "utc"): Period {
  const [fy, fm, fd] = custom.from.split("-").map(Number);
  const [ty, tm, td] = custom.to.split("-").map(Number);
  if (boundary === "utc") {
    // GSC population: stored @db.Date is midnight UTC, so UTC day boundaries are
    // correct here (bradley-database tripwire — do NOT NY-shift GSC ranges).
    return {
      since: new Date(Date.UTC(fy, fm - 1, fd)),
      until: new Date(Date.UTC(ty, tm - 1, td + 1)),
    };
  }
  // Visitor surfaces: NY day boundaries (the seam fix — every non-GSC metric
  // buckets in America/New_York, so a custom range must too).
  return { since: nyStartOfDay(fy, fm, fd), until: nyStartOfDay(ty, tm, td + 1) };
}

/** Equal-elapsed prior slice for a RUNNING period (data-analyst M — the custom
 * branch mirrors calendarComparison exactly): give the prior range the same
 * elapsed span as the still-running current period, clamped to the prior
 * range's own full end (never overlap, never overclaim), with the honest
 * elapsed-day count and the W2 clamped flag. Full-vs-full when not partial. */
function elapsedSlice(
  priorSince: Date,
  fullUntil: Date,
  periodSince: Date,
  partial: boolean,
  now: Date
): { until: Date; elapsedDays: number | null; clamped: boolean; partial: boolean } {
  if (!partial) return { until: fullUntil, elapsedDays: null, clamped: false, partial: false };
  const elapsedMs = Math.max(0, now.getTime() - periodSince.getTime());
  const rawUntil = priorSince.getTime() + elapsedMs;
  const clamped = rawUntil > fullUntil.getTime();
  const until = new Date(Math.min(rawUntil, fullUntil.getTime()));
  const elapsedDays = Math.max(1, Math.round((until.getTime() - priorSince.getTime()) / DAY_MS));
  return { until, elapsedDays, clamped, partial: true };
}

function customComparison(
  custom: { from: string; to: string },
  mode: Exclude<CompareMode, "none">,
  filters: { cmpFrom?: string; cmpTo?: string },
  boundary: "ny" | "utc",
  periodSince: Date,
  partial: boolean,
  now: Date
): ResolvedComparison {
  // Explicit compare range wins when both bounds validate. It stays a
  // full-range comparison even under a running current period — the user
  // picked those exact dates, and slicing them would second-guess the pick.
  const explicit = parseCustomRange(filters.cmpFrom, filters.cmpTo);
  if (explicit) {
    const cp = customPeriod(explicit, boundary);
    return {
      since: cp.since,
      until: cp.until,
      kind: mode,
      partial: false,
      elapsedDays: null,
      clamped: false,
      // api N4: this renders as "vs {label}" / "· {label}" — "the compare
      // range" read as "vs the compare range". "custom range" composes cleanly.
      label: "custom range",
    };
  }
  const [fy, fm, fd] = custom.from.split("-").map(Number);
  const [ty, tm, td] = custom.to.split("-").map(Number);
  if (mode === "year") {
    const cp =
      boundary === "utc"
        ? { since: new Date(Date.UTC(fy - 1, fm - 1, fd)), until: new Date(Date.UTC(ty - 1, tm - 1, td + 1)) }
        : { since: nyStartOfDay(fy - 1, fm, fd), until: nyStartOfDay(ty - 1, tm, td + 1) };
    const slice = elapsedSlice(cp.since, cp.until, periodSince, partial, now);
    return { since: cp.since, until: slice.until, kind: "year", partial: slice.partial, elapsedDays: slice.elapsedDays, clamped: slice.clamped, label: "same dates last year" };
  }
  // prior: the immediately-preceding range of the SAME NUMBER OF CALENDAR DAYS,
  // derived by calendar-day arithmetic like the year branch (database L1 — an
  // ms-subtraction of the period length skews the boundary by 1h across a DST
  // transition; day arithmetic through normParts + the boundary resolver is
  // DST-exact, and prior.until lands precisely on period.since).
  const spanDays =
    Math.round(
      (Date.parse(`${custom.to}T00:00:00Z`) - Date.parse(`${custom.from}T00:00:00Z`)) / DAY_MS
    ) + 1;
  const pf = normParts(fy, fm, fd - spanDays);
  const pt = normParts(fy, fm, fd - 1);
  const cp = customPeriod(
    { from: `${pf.y}-${pad2(pf.m)}-${pad2(pf.d)}`, to: `${pt.y}-${pad2(pt.m)}-${pad2(pt.d)}` },
    boundary
  );
  const slice = elapsedSlice(cp.since, cp.until, periodSince, partial, now);
  return {
    since: cp.since,
    until: slice.until,
    kind: "prior",
    partial: slice.partial,
    elapsedDays: slice.elapsedDays,
    clamped: slice.clamped,
    label: "prior period",
  };
}

function calendarComparison(
  kind: Exclude<PeriodKind, "custom">,
  anchor: Anchor,
  period: Period,
  partial: boolean,
  mode: Exclude<CompareMode, "none">,
  now: Date
): ResolvedComparison {
  const startAnchor = mode === "year" ? shiftYear(anchor, -1) : prevUnitAnchor(kind, anchor);
  // Natural full end of the prior period: for prior-mode it is exactly where the
  // current period starts; for year-mode it is next-unit-anchor a year back.
  // (Feb 29 note: shifting a Feb-29 anchor by -1 year lands on a nonexistent
  // date in a non-leap year; normParts rolls it to Mar 1 — deterministic, and
  // the label stays "same dates last year".)
  const fullEndAnchor = mode === "year" ? shiftYear(nextUnitAnchor(kind, anchor), -1) : anchor;
  const priorSince = nyStartOfDay(startAnchor.y, startAnchor.m, startAnchor.d);
  const fullUntil = nyStartOfDay(fullEndAnchor.y, fullEndAnchor.m, fullEndAnchor.d);

  let until: Date;
  let elapsedDays: number | null;
  let clamped = false;
  if (partial) {
    // EQUAL-ELAPSED SLICE: give the prior period the SAME elapsed span as the
    // still-running current period (month-to-date vs same-elapsed-of-last-month)
    // — CLAMPED to the prior unit's own full end (database M1): when elapsed
    // exceeds the prior unit's length (Mar 29-31 to-date vs 28-day Feb; day 31
    // vs a 30-day month; a fall-back evening), an unclamped slice would spill
    // past period.since and double-count rows in both slices. In prior mode
    // fullUntil === period.since, so the clamp is exactly "never overlap".
    const elapsedMs = now.getTime() - period.since.getTime();
    const rawUntil = priorSince.getTime() + elapsedMs;
    // Factcheck W2: when the clamp bites, the slices are NOT the same length —
    // the flag travels to the wire so the card never says "same N days".
    clamped = rawUntil > fullUntil.getTime();
    until = new Date(Math.min(rawUntil, fullUntil.getTime()));
    // Days actually covered by the prior slice: equals the current period's
    // elapsed days normally; SHORTER when the clamp bit (then the comparison is
    // effectively vs the full, shorter prior unit — the honest count to render).
    elapsedDays = Math.max(1, Math.round((until.getTime() - priorSince.getTime()) / DAY_MS));
  } else {
    // Completed period: full-vs-full.
    until = fullUntil;
    elapsedDays = null;
  }
  return { since: priorSince, until, kind: mode, partial, elapsedDays, clamped, label: comparisonLabel(kind, mode) };
}

/**
 * Resolve a concrete period + its honest comparison + custom-range echo from
 * Filters (Dashboard Wave WP1). Precedence:
 *  1. CUSTOM — explicit period=custom, OR a lone valid from/to with no preset
 *     (preserves the WP3.8 GSC/funnel contract). NY day boundaries by default;
 *     `boundary="utc"` for the GSC population (see customPeriod).
 *  2. CALENDAR PRESET — today/week(Sun)/month/quarter/year, NY, partial while
 *     the current period is still running.
 *  3. WINDOW FALLBACK — `window` stays the required default (contract rule 2);
 *     comparison = the immediately preceding equal-length window, exactly the
 *     legacy `priorSince = now − 2·window` behavior.
 * compareMode defaults to "prior" (the historical default). Second/third return
 * fields (comparison, granularity, kind, partial) are additive — existing
 * callers that destructure { period, range } are unaffected.
 *
 * ⚠ `boundary`: NEW CALLERS MUST NOT PASS "utc" DIRECTLY. Every visitor-scoped
 * surface uses the "ny" default; the ONE population keyed on UTC dates (GSC
 * @db.Date) goes through resolveGscPeriod() below, which is the single
 * sanctioned "utc" call site (api #7 / database L2 guard).
 */
export function resolvePeriod(
  filters: {
    window: WindowDays;
    period?: PeriodKind;
    compareMode?: CompareMode;
    from?: string;
    to?: string;
    cmpFrom?: string;
    cmpTo?: string;
  },
  now: Date = new Date(),
  boundary: "ny" | "utc" = "ny"
): ResolvedPeriod {
  const mode: CompareMode = filters.compareMode ?? "prior";
  const custom = parseCustomRange(filters.from, filters.to);
  const kind = filters.period;

  const resolved: ResolvedPeriod = (() => {
    // ---- 1. CUSTOM --------------------------------------------------------
    if (custom && (kind === "custom" || kind === undefined)) {
      const picked = customPeriod(custom, boundary);
      // Data-analyst M: a custom range whose `to` has not finished yet is a
      // RUNNING period — mirror the preset branch exactly: partial:true, until
      // clamped to now (never claim a full range while its days are still
      // arriving), and an equal-elapsed prior (customComparison mirrors
      // calendarComparison via elapsedSlice, so the elapsed label renders).
      // Granularity stays the PICKED range's — the axis describes the range
      // the user chose, not the elapsed slice.
      const partial = now.getTime() < picked.until.getTime();
      const period: Period = partial
        ? { since: picked.since, until: new Date(Math.max(now.getTime(), picked.since.getTime())) }
        : picked;
      const comparison =
        mode === "none"
          ? null
          : customComparison(custom, mode, filters, boundary, period.since, partial, now);
      return {
        period,
        comparison,
        range: custom,
        kind: "custom" as const,
        granularity: rangeGranularity(picked.since, picked.until),
        partial,
      };
    }

    // ---- 2. CALENDAR PRESET -----------------------------------------------
    if (kind && kind !== "custom") {
      const anchor = periodAnchor(kind, now);
      const since = nyStartOfDay(anchor.y, anchor.m, anchor.d);
      const fullEnd = (() => {
        const na = nextUnitAnchor(kind, anchor);
        return nyStartOfDay(na.y, na.m, na.d);
      })();
      const partial = now.getTime() < fullEnd.getTime();
      const period: Period = { since, until: partial ? now : fullEnd };
      const comparison =
        mode === "none" ? null : calendarComparison(kind, anchor, period, partial, mode, now);
      return { period, comparison, range: null, kind, granularity: PERIOD_GRANULARITY[kind], partial };
    }

    // ---- 3. WINDOW FALLBACK (contract rule 2) -----------------------------
    const period = currentPeriod(filters.window, now);
    const comparison: ResolvedComparison | null =
      mode === "none"
        ? null
        : {
            // The immediately preceding equal-length window — byte-identical to
            // the legacy priorSince = now − 2·window / until = since.
            since: new Date(period.since.getTime() - filters.window * DAY_MS),
            until: period.since,
            kind: "prior",
            partial: false,
            elapsedDays: null,
            clamped: false,
            label: "prior period",
          };
    return {
      period,
      comparison,
      range: null,
      kind: "window" as const,
      granularity: (filters.window === 90 ? "week" : "day") as BucketGranularity,
      partial: false,
    };
  })();

  // INVARIANT (data-analyst M, enforced ONCE — not per-branch): a period whose
  // `until` extends past `now` is by definition still running. Every branch
  // above already clamps/flags; this is the net that keeps any future branch
  // honest without relying on it remembering to.
  if (resolved.period.until.getTime() > now.getTime()) resolved.partial = true;
  return resolved;
}

/**
 * PERIOD-UI wave — the ONE serialized PeriodEcho builder. Every payload that
 * carries a `period` echo builds it here so the honesty rules can never drift
 * per-surface:
 *  - factcheck W1: a custom range echoes the INCLUSIVE "YYYY-MM-DD" day
 *    strings the user picked (resolved.range, non-null exactly when kind is
 *    "custom") — period.until is the EXCLUSIVE boundary (start of to+1), and
 *    a client fmtDay on it would print a day the range does not contain.
 *  - compareLabel is the resolved comparison's own label (null when compare
 *    is off or the surface computes none) — server-authoritative, never a
 *    client re-derivation.
 */
export function periodEcho(resolved: ResolvedPeriod): PeriodEcho {
  return {
    kind: resolved.kind,
    from: resolved.range ? resolved.range.from : resolved.period.since.toISOString(),
    to: resolved.range ? resolved.range.to : resolved.period.until.toISOString(),
    granularity: resolved.granularity,
    partial: resolved.partial,
    compareLabel: resolved.comparison ? resolved.comparison.label : null,
  };
}

/** PERIOD-UI wave — the compact to-date label per period kind (top-bar segment
 * vocabulary, Brad's exact labels; also the landing teaser stat suffix). */
export const PERIOD_SHORT_LABEL: Record<PeriodKind, string> = {
  today: "today",
  week: "WTD",
  month: "MTD",
  quarter: "QTD",
  year: "YTD",
  custom: "custom range",
};

/**
 * The ONLY sanctioned "utc"-boundary period resolver — for the GSC population
 * exclusively (stored @db.Date is midnight UTC, so UTC day boundaries are
 * correct there and NY boundaries would shift every shipped custom range).
 * Everything else calls resolvePeriod() and takes the NY default; do NOT pass
 * boundary="utc" anywhere else (api #7 / database L2).
 */
export function resolveGscPeriod(
  filters: {
    window: WindowDays;
    period?: PeriodKind;
    compareMode?: CompareMode;
    from?: string;
    to?: string;
    cmpFrom?: string;
    cmpTo?: string;
  },
  now: Date = new Date()
): ResolvedPeriod {
  return resolvePeriod(filters, now, "utc");
}

/**
 * WP1 — build the honest four-state PeriodComparison for a KPI. REUSES
 * deltaOrCounts (it decides delta-vs-counts) and ADDS the "new" state (the
 * prior period predates the first data → never a fake delta vs an empty prior;
 * this generalizes the priorWindowPredatesData guard for every preset) and the
 * "n-a" state (comparison off). Carries absolute (current − prior), the partial
 * flag, and the priorLabel from the resolved comparison.
 */
export function buildPeriodComparison(
  current: number,
  prior: number,
  comparison: ResolvedComparison | null,
  opts: { priorPredatesData: boolean; metricId?: string }
): PeriodComparison {
  if (!comparison) return { kind: "n-a", current };
  const { partial, label, elapsedDays, clamped } = comparison;
  if (opts.priorPredatesData) {
    return { kind: "new", current, partial, elapsedDays, priorLabel: label };
  }
  const doc = deltaOrCounts(current, prior, opts.metricId);
  if (doc.kind === "delta") {
    return {
      kind: "delta",
      current,
      prior,
      absolute: current - prior,
      pct: doc.pct,
      downIsGood: doc.downIsGood,
      partial,
      elapsedDays,
      clamped,
      priorLabel: label,
    };
  }
  return {
    kind: "counts",
    current,
    prior,
    absolute: current - prior,
    downIsGood: doc.downIsGood,
    partial,
    elapsedDays,
    clamped,
    priorLabel: label,
    reason: doc.reason,
  };
}

const SOURCE_CLASS_VALUES: readonly SourceClass[] = [
  "direct",
  "search",
  "social",
  "ai-referrer",
  "other",
];

/** Tolerant ?source= parser — unknown values drop to undefined (no cut). */
export function parseSourceClassParam(raw: string | null | undefined): SourceClass | undefined {
  return SOURCE_CLASS_VALUES.includes(raw as SourceClass) ? (raw as SourceClass) : undefined;
}

/**
 * Period-stable href (ux U5, PERIOD-UI wave): appends the active period
 * GRAMMAR (?period&compare&from&to&cmpFrom&cmpTo) to a content link (insight
 * cards, leads "show all", rail links) so deep links never silently reset to
 * the MTD default. Defaults are omitted via buildIqQuery — an MTD + prior link
 * gains nothing. `window` is forced to 30 so ?p= (the dormant fallback) never
 * re-enters a URL from a link. Replaces the retired ?p=-only withPeriod().
 */
export function withPeriodGrammar(href: string, pp: PeriodParams | null): string {
  const qs = buildIqQuery(30, {}, pp);
  if (!qs) return href;
  return `${href}${href.includes("?") ? "&" : "?"}${qs}`;
}

/** Module-local cuts an island puts on the wire (subset per module). */
export interface IslandCuts {
  device?: string | null;
  country?: string | null;
  source?: string | null;
}

/**
 * ONE canonical island querystring builder (api A5): ?p= (omitted at the 30d
 * default) + whichever module-local cuts are active. Used by the island fetch
 * AND its success-path history.replaceState, so the URL a refetch writes is
 * exactly the URL it fetched.
 *
 * WP2 (Dashboard Wave): the optional `pp` appends the calendar-period grammar
 * (?period&compare&from&to&cmpFrom&cmpTo, mirroring parsePeriodParam) —
 * defaults are OMITTED (compare=prior, like p=30) so window-mode URLs are
 * byte-identical to the pre-WP2 builder. `?p=` always rides along as the
 * documented fallback if the period params are stripped. `&view=` is RESERVED
 * for the Phase-2 canvas — this builder must never write or consume it.
 */
export function buildIqQuery(p: WindowDays, cuts: IslandCuts, pp?: PeriodParams | null): string {
  const q = new URLSearchParams();
  if (p !== 30) q.set("p", String(p));
  if (pp) {
    // PERIOD-UI wave: "month" (MTD) is the admin default — omitted, exactly
    // like p=30 and compare=prior, so the default admin URL stays "" (the
    // byte-identity rule the URL-grammar harness asserts). parsePeriodParam
    // resolves the omission back to month; the loop stays closed.
    if (pp.period && pp.period !== "month") q.set("period", pp.period);
    if (pp.compareMode !== "prior") q.set("compare", pp.compareMode);
    if (pp.period === "custom" && pp.from && pp.to) {
      q.set("from", pp.from);
      q.set("to", pp.to);
      if (pp.cmpFrom && pp.cmpTo) {
        q.set("cmpFrom", pp.cmpFrom);
        q.set("cmpTo", pp.cmpTo);
      }
    }
  }
  if (cuts.device) q.set("device", cuts.device);
  if (cuts.country) q.set("country", cuts.country);
  if (cuts.source) q.set("source", cuts.source);
  return q.toString();
}

/**
 * The last `n` NY calendar-day keys ending today — used for fixed-length
 * micro-sparklines (landing cards are always 14 days regardless of the global
 * window). Same DST-safe day arithmetic as windowBucketKeys().
 */
export function lastNDayKeys(n: number, now: Date = new Date()): string[] {
  const { y, m, d } = nyDateParts(now);
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(Date.UTC(y, m - 1, d - i));
    keys.push(`${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`);
  }
  return keys;
}

// ---------------------------------------------------------------------------
// (b) N-guard suppression — NAMED CONSTANTS, the org's one source of truth
//     (DATA-SPEC §1 conventions; BUILD-PLAN governance "honest-N canon")
// ---------------------------------------------------------------------------

/** Rates need a denominator of at least this; below it, show counts only. */
export const RATE_MIN_DENOM = 30;

/** Period-over-period % deltas need a prior-period value of at least this; below it, show both counts, no %. */
export const DELTA_MIN_PRIOR = 10;

/** GSC query-level rows below this many impressions/window are suppressed (but still counted in totals). */
export const GSC_MIN_IMPRESSIONS = 30;

// ---- §6b insight-rule constants (values stated ONCE, referenced by name) ----

/** Max insight cards on the Command strip (evaluateRules returns ALL fired; the surface caps). */
export const INSIGHTS_MAX_COMMAND = 3;
/** IR1: a lead in status "new" older than this many days breaches SLA. Also drives the leads-list amber threshold. */
export const RULE_LEAD_SLA_DAYS = 3;
/** IR3: funnel-break fires when a step has at least this many distinct visitors and the next step has 0. */
export const RULE_FUNNEL_MIN_STEP = 10;
/** IR8: evaluator = pageviews on at least this many distinct calendar days... */
export const RULE_EVALUATOR_MIN_DAYS = 3;
/** IR8: ...within this trailing window (days). */
export const RULE_EVALUATOR_WINDOW_D = 14;
/** IR9: branded-echo needs at least this many branded clicks in the current 28d. */
export const RULE_BRANDED_ECHO_MIN_CLICKS = 5;
/** IR5: a GSC page needs at least this many impressions (with 0 clicks) to flag. */
export const RULE_ZERO_CTR_MIN_IMPRESSIONS = 100;
/** IR10: referrer-spike needs at least this many views on a path in 7d... */
export const RULE_REFERRER_SPIKE_MIN_VIEWS = 5;
/** IR10: ...with at least this share from one external host (trigger math only, never rendered as a %). */
export const RULE_REFERRER_SPIKE_SHARE = 0.6;
/** IR6 V1: data-quality flag when GSC classifiable share drops below this. */
export const RULE_DQ_CLASSIFIABLE_LT = 0.5;
/** IR6 V2: data-quality flag when pageview duration coverage drops below this. */
export const RULE_DQ_DURATION_COVERAGE_LT = 0.4;

/** In-fit inquiry types for the scorecard (UX §2.7: fractional, consulting/project,
 * executive — the "right people raised a hand" number). Values are the contact
 * form's EXACT stored strings (app/(site)/contact/ContactForm.tsx). */
export const IN_FIT_INQUIRY_TYPES: readonly string[] = [
  "Full-Time Executive Role",
  "Fractional Leadership",
  "Project (Audit / AI Build)",
];

/** ALL inquiry types the contact form can store (ContactForm.tsx TYPE_OPTIONS,
 * exact strings) — the leads donut's slice order. Anything else in the column
 * (legacy rows, empty strings) rolls into the "Other / unset" residue slice —
 * never an invented category. */
export const INQUIRY_TYPE_VALUES: readonly string[] = [
  ...IN_FIT_INQUIRY_TYPES,
  "Speaking Engagement",
  "Something Else",
];

/** Residue-slice label for inquiry types outside INQUIRY_TYPE_VALUES. */
export const INQUIRY_TYPE_OTHER_LABEL = "Other / unset";

/** B2 engaged-visitor duration floor (seconds). Also the Content module's
 * duration threshold coloring boundary — one canonical number, no invented
 * ramp values. */
export const ENGAGED_MIN_DURATION_S = 10;

/** Display-side per-view duration cap (seconds): 30 minutes. The write-time
 * clamp (app/api/track/duration, 6h) admits parked tabs that would swamp a
 * ~150-view window's average; every per-view duration is clamped to this cap
 * before entering an average or a journey total, and the Traffic caption
 * states the cap plainly (bradley-database B1). */
export const DURATION_DISPLAY_CAP_S = 1800;

/** Traffic visitor-log size (UX §4: "last ~20 visitor journeys"). */
export const VISITOR_LOG_ROWS = 20;

/** Path-chip cap per visitor-log row; the remainder renders as plain text. */
export const VISITOR_LOG_PATHS_MAX = 8;

/** Row caps for module tables (nothing unbounded goes over the wire, DATA §3). */
export const CONTENT_PAGES_MAX = 50;
export const GSC_QUERY_ROWS_MAX = 50;
export const GSC_COUNTRY_ROWS_MAX = 12;

// ---- Wave 3 drill caps + heuristics (DATA §3 row caps; §3.2 session gap) ----

/** Session boundary (UX §3.3): a gap larger than this starts a new session. */
export const SESSION_GAP_MINUTES = 30;
/** Per-visitor timeline item cap (DATA §3.2 caps pageviews+events at 500 each). */
export const JOURNEY_ITEM_CAP = 500;
/** Page-detail "Visitors" tab: last ~20 journeys touching the path (UX §3.2). */
export const PAGE_VISITOR_ROWS = 20;
/** Page-detail Sources / GSC row caps. */
export const PAGE_SOURCE_ROWS = 12;
export const PAGE_SEARCH_ROWS = 30;
/** Activity stream row cap after windowing + filtering (DATA §3 discipline). */
export const ACTIVITY_ROWS = 200;

// ---- Scorecard unlock gates (UX §2.7 + §7 progress meters — named here so
//      the meter, the gate copy, and the unlock check share one number) ----

/** Branded-clicks slot unlocks at this many branded impressions in trailing 90d (UX §7 example). */
export const SCORECARD_BRANDED_GATE_IMPRESSIONS = 50;
/** In-fit slot unlocks at the first in-fit inquiry (trailing 90d). */
export const SCORECARD_INFIT_GATE = 1;
/** Channel-mix slot unlocks at the first lead with a stitched visitor id. */
export const SCORECARD_CHANNEL_GATE = 1;

/**
 * Counts-before-rates: returns a rate only when the denominator clears
 * RATE_MIN_DENOM; otherwise counts with an explicit suppression reason the UI
 * renders verbatim ("n too small for a rate").
 */
export function rateOrCounts(numerator: number, denominator: number): RateOrCounts {
  if (denominator >= RATE_MIN_DENOM) {
    return { kind: "rate", value: numerator / denominator, numerator, denominator };
  }
  return {
    kind: "counts",
    numerator,
    denominator,
    reason: `n too small for a rate (denominator ${denominator} < ${RATE_MIN_DENOM})`,
  };
}

/**
 * Delta suppression: a % delta only when the prior-period value clears
 * DELTA_MIN_PRIOR; otherwise both raw counts, no %. Carries the per-metric
 * down-is-good flag so compare coloring is decided in one place.
 */
export function deltaOrCounts(current: number, prior: number, metricId?: string): DeltaOrCounts {
  const downIsGood = metricId ? isDownGood(metricId) : false;
  if (prior >= DELTA_MIN_PRIOR) {
    return { kind: "delta", pct: ((current - prior) / prior) * 100, current, prior, downIsGood };
  }
  return {
    kind: "counts",
    current,
    prior,
    downIsGood,
    reason: `prior period too small for a % delta (${prior} < ${DELTA_MIN_PRIOR})`,
  };
}

// ---------------------------------------------------------------------------
// (c) Source classification — versioned host → class map (DATA-SPEC B3)
// ---------------------------------------------------------------------------
// VERSIONING IS BINDING: any host added/moved below MUST bump
// SOURCE_CLASS_VERSION (definition drift = fake trend). The version travels
// in payloads wherever source-class cuts render.
//
// Honesty label baked into B3: "direct" is a RESIDUE bucket, not a finding —
// LinkedIn app taps, DMs, and QR scans all land there.

export const SOURCE_CLASS_VERSION = "scm-v1-2026-07-18";

/**
 * Host → class. Matching walks the subdomain chain most-specific-first, so
 * "gemini.google.com" (ai-referrer) wins over "google.com" (search).
 * The site's own host is handled in classifySource() — bradleygriffin.us is
 * NEVER a source.
 */
export const SOURCE_CLASS_MAP: Readonly<Record<string, Exclude<SourceClass, "direct" | "other">>> = {
  // ai-referrer (DATA-SPEC B3 / B15 — the on-site proof AIO pays off)
  "chatgpt.com": "ai-referrer",
  "chat.openai.com": "ai-referrer",
  "perplexity.ai": "ai-referrer",
  "claude.ai": "ai-referrer",
  "gemini.google.com": "ai-referrer",
  "copilot.microsoft.com": "ai-referrer",
  // search
  "google.com": "search",
  "bing.com": "search",
  "duckduckgo.com": "search",
  "yahoo.com": "search",
  "ecosia.org": "search",
  "brave.com": "search",
  "startpage.com": "search",
  // social
  "linkedin.com": "social",
  "lnkd.in": "social",
  "facebook.com": "social",
  "t.co": "social",
  "x.com": "social",
  "twitter.com": "social",
  "instagram.com": "social",
  "youtube.com": "social",
  "reddit.com": "social",
};

const INTERNAL_HOST = "bradleygriffin.us";

/**
 * Referrer URL → external host (www-stripped), or null for empty/internal
 * referrers. Unparseable referrer strings return null host (they carry no
 * classifiable host) — callers wanting the raw label truncate separately.
 */
export function referrerHost(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    if (host === INTERNAL_HOST || host.endsWith(`.${INTERNAL_HOST}`)) return null; // internal nav isn't a source
    return host;
  } catch {
    return null;
  }
}

/** Classify a bare host against SOURCE_CLASS_MAP (subdomain-chain walk, most specific wins). */
export function classifyHost(host: string): SourceClass {
  const parts = host.toLowerCase().split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    const candidate = parts.slice(i).join(".");
    const cls = SOURCE_CLASS_MAP[candidate];
    if (cls) return cls;
  }
  return "other";
}

/**
 * Referrer string → source class (B3). Null/empty/internal → "direct"
 * (the residue bucket); unknown external host → "other".
 */
export function classifySource(referrer: string | null | undefined): SourceClass {
  if (!referrer || !referrer.trim()) return "direct";
  const host = referrerHost(referrer);
  if (!host) return "direct"; // internal or unparseable — never a source
  return classifyHost(host);
}

// ---------------------------------------------------------------------------
// (d) Compare-period math + down-is-good flags (DATA-SPEC §2)
// ---------------------------------------------------------------------------

export interface Period {
  since: Date;
  until: Date;
}

/** The window as a concrete period ending now. */
export function currentPeriod(window: WindowDays, now: Date = new Date()): Period {
  return { since: new Date(now.getTime() - window * DAY_MS), until: now };
}

/** Compare period = the immediately preceding period of equal length (DATA-SPEC §2). */
export function priorPeriod(period: Period): Period {
  const lengthMs = period.until.getTime() - period.since.getTime();
  return { since: new Date(period.since.getTime() - lengthMs), until: period.since };
}

/**
 * Per-metric down-is-good flags (DATA-SPEC §1): default is up-is-good; the
 * only exceptions are listed here so delta coloring is decided in ONE place.
 */
export const DOWN_IS_GOOD_METRICS: ReadonlySet<string> = new Set([
  "A11", // GSC avg position — lower position is better
  "A7:lost", // leads lost
  "B5", // time-to-lead — faster decisions are better (display neutral until N≥5 leads)
]);

export function isDownGood(metricId: string): boolean {
  return DOWN_IS_GOOD_METRICS.has(metricId);
}

// ---------------------------------------------------------------------------
// (e) Firsts catalog (§6b IR11 — ONE shared catalog: seeds the Command ledger
//     AND the IR11 milestone rule; one list, two renderings)
// ---------------------------------------------------------------------------

export interface FirstsCatalogEntry {
  id: string;
  label: string;
  /** GSC firsts deep-link to /admin/search; site firsts/records are LINKLESS in Wave 2. */
  href: string | null;
}

export const FIRSTS_CATALOG: readonly FirstsCatalogEntry[] = [
  { id: "first-visitor", label: "First visitor", href: null },
  { id: "first-mobile-visitor", label: "First mobile visitor", href: null },
  { id: "first-non-us-visitor", label: "First non-US visitor", href: null },
  { id: "first-chooser-click", label: "First chooser click", href: null },
  { id: "first-cta-click", label: "First CTA click", href: null },
  { id: "first-brief", label: "First brief", href: null },
  { id: "first-booking", label: "First booking", href: null },
  { id: "first-subscriber", label: "First subscriber", href: null },
  { id: "tenth-subscriber", label: "10th subscriber", href: null },
  { id: "first-gsc-click", label: "First search click", href: "/admin/search" },
  { id: "first-nonbranded-impression", label: "First non-branded impression", href: "/admin/search" },
  { id: "first-non-us-impression", label: "First non-US impression", href: "/admin/search" },
  { id: "first-cost-query", label: "First cost-intent query", href: "/admin/search" },
  { id: "first-branded-click", label: "First branded click", href: "/admin/search" },
  { id: "best-week", label: "Best week", href: null },
];

// ---------------------------------------------------------------------------
// (f) Insight-rule engine — the §6b CANON (UX-SPEC §6b is the ONLY rule
//     source). ONE copy, runs on both sources. All rules read post-internal-
//     exclusion inputs; every copy template carries its counts; no lead name
//     ever appears in strip copy (IR1 PII ruling, permanent).
//
//     Copy note: the canon templates were written with em dashes; the site's
//     standing no-em-dash voice rule outranks punctuation, so every sentence
//     below carries the same counts and meaning with plain punctuation.
// ---------------------------------------------------------------------------

const CLASS_RANK: Record<InsightClass, number> = { act: 0, signal: 1, milestone: 2 };

export interface IqRule {
  id: string;
  cls: InsightClass;
  /** Per-rule display priority (ascending within class). */
  priority: number;
  /** May emit several cards (e.g. IR1 fires once per breaching lead). */
  evaluate(inputs: IqRuleInputs): IqInsightCard[];
}

function card(
  rule: IqRule,
  copy: string,
  triggerMath: string,
  href: string | null
): IqInsightCard {
  return { ruleId: rule.id, cls: rule.cls, priority: rule.priority, copy, triggerMath, href };
}

const IR1: IqRule = {
  id: "IR1",
  cls: "act",
  priority: 10,
  evaluate(inputs) {
    // One card per breaching lead, oldest first. No lead name in strip copy,
    // ever — the name is one click behind the re-gated lead page.
    return inputs.slaLeads.map((l) =>
      card(
        IR1,
        `A lead has waited ${l.days} day${l.days === 1 ? "" : "s"} in "new" (threshold ${RULE_LEAD_SLA_DAYS}). Follow up.`,
        `Lead status "new" and age ${l.days}d > ${RULE_LEAD_SLA_DAYS}d`,
        `/admin/leads/${l.id}`
      )
    );
  },
};

const IR2: IqRule = {
  id: "IR2",
  cls: "act",
  priority: 20,
  evaluate(inputs) {
    const n = inputs.unmatchedBookings;
    if (n <= 0) return [];
    return [
      card(
        IR2,
        `${n} Calendly booking${n === 1 ? "" : "s"} in this period ${n === 1 ? "has" : "have"} no matching lead. The invitee email isn't captured without the Calendly API token (known gap). Match manually in the CRM.`,
        `COUNT(Booking WHERE leadId IS NULL, window) = ${n} > 0`,
        "/admin/leads"
      ),
    ];
  },
};

const IR3: IqRule = {
  id: "IR3",
  cls: "act",
  priority: 30,
  evaluate(inputs) {
    // Earliest breaking adjacent pair wins; fires at most once. LINKLESS in
    // Wave 2 (sanctioned): the funnel sits on the same Command surface.
    for (const p of inputs.funnelPairs) {
      if (p.n >= RULE_FUNNEL_MIN_STEP && p.nextN === 0) {
        return [
          card(
            IR3,
            `${p.n} visitors reached ${p.step}; 0 reached ${p.next}. The break is between ${p.step} and ${p.next}.`,
            `${p.step} distinct visitors ${p.n} >= ${RULE_FUNNEL_MIN_STEP} and ${p.next} = 0`,
            null
          ),
        ];
      }
    }
    return [];
  },
};

const IR4: IqRule = {
  id: "IR4",
  cls: "act",
  priority: 40,
  evaluate(inputs) {
    const n = inputs.costIntentImpressions28d;
    if (n < GSC_MIN_IMPRESSIONS) return [];
    return [
      card(
        IR4,
        `Cost-intent queries reached ${n} impressions in 28 days. The rates page is unlisted; consider publishing it.`,
        `SUM(cost-intent impressions, 28d) = ${n} >= ${GSC_MIN_IMPRESSIONS}`,
        "/admin/search"
      ),
    ];
  },
};

const IR5: IqRule = {
  id: "IR5",
  cls: "act",
  priority: 50,
  evaluate(inputs) {
    return inputs.zeroClickPages.map((p) => {
      const share =
        inputs.classifiableShare28d !== null
          ? `, from the ${Math.round(inputs.classifiableShare28d * 100)}% of impressions GSC lets us see`
          : "";
      return card(
        IR5,
        `${p.path} earned ${p.impressions} impressions but 0 clicks in 28 days (avg position ${p.avgPosition.toFixed(1)}${share}). The title and meta are worth a look.`,
        `page impressions ${p.impressions} >= ${RULE_ZERO_CTR_MIN_IMPRESSIONS} and clicks = 0 (28d)`,
        "/admin/search"
      );
    });
  },
};

const IR6: IqRule = {
  id: "IR6",
  cls: "act",
  priority: 60,
  evaluate(inputs) {
    // One id, three variants, worst wins, max one card. Order: a hole in the
    // data (V3) beats partial data (V1) beats a coverage note (V2).
    if (inputs.gscGapDates.length > 0) {
      const dates = inputs.gscGapDates.join(", ");
      return [
        card(
          IR6,
          `GSC ingest has a gap (${dates}). Search numbers for those days are missing, not zero.`,
          `missing GscDaily date(s) in window: ${inputs.gscGapDates.length}`,
          "/admin/search"
        ),
      ];
    }
    if (
      inputs.classifiableShare28d !== null &&
      inputs.gscImpressions28d >= GSC_MIN_IMPRESSIONS &&
      inputs.classifiableShare28d < RULE_DQ_CLASSIFIABLE_LT
    ) {
      const anon = Math.round((1 - inputs.classifiableShare28d) * 100);
      return [
        card(
          IR6,
          `GSC is anonymizing ${anon}% of impressions over the last 28 days. Query-level cuts are partial by design.`,
          `classifiable share ${(inputs.classifiableShare28d * 100).toFixed(0)}% < ${RULE_DQ_CLASSIFIABLE_LT * 100}% (28d, ${inputs.gscImpressions28d} impressions)`,
          "/admin/search"
        ),
      ];
    }
    if (
      inputs.durationCoverage !== null &&
      inputs.durationCoverage < RULE_DQ_DURATION_COVERAGE_LT
    ) {
      const c = Math.round(inputs.durationCoverage * 100);
      return [
        card(
          IR6,
          `Only ${c}% of pageviews reported time on page. Engaged-time numbers are an undercount.`,
          `duration coverage ${c}% < ${RULE_DQ_DURATION_COVERAGE_LT * 100}% (window)`,
          "/admin/traffic"
        ),
      ];
    }
    return [];
  },
};

const IR7: IqRule = {
  id: "IR7",
  cls: "signal",
  priority: 10,
  evaluate(inputs) {
    // Deliberately separate from IR1: celebrates/attributes vs nags. No name.
    // THREE states (database B2): attributed (stitched + visible views),
    // stitched-but-no-visible-views (likely internal-excluded — saying
    // "no cookie" there would be false), and truly cookieless.
    return inputs.recentLeads.map((l) => {
      if (l.attributed) {
        return card(
          IR7,
          `New lead (status: ${l.status}). First touch ${l.sourceClass ?? "direct"} → ${l.firstPath ?? "/"}, ${l.pages} page${l.pages === 1 ? "" : "s"} over ${l.visits} visit${l.visits === 1 ? "" : "s"} before the brief.`,
          `Lead created in trailing 7d, visitorId stitched (${l.pages} distinct pages, ${l.visits} active days)`,
          `/admin/leads/${l.id}`
        );
      }
      if (l.stitched) {
        return card(
          IR7,
          `New lead (status: ${l.status}). Stitched to a visitor, but no visible views; they may be excluded as internal.`,
          "Lead created in trailing 7d, visitorId stitched but 0 visible pageviews (still fires)",
          `/admin/leads/${l.id}`
        );
      }
      return card(
        IR7,
        `New lead (status: ${l.status}). No analytics cookie on this one; journey unavailable.`,
        "Lead created in trailing 7d, visitorId is null (still fires)",
        `/admin/leads/${l.id}`
      );
    });
  },
};

const IR8: IqRule = {
  id: "IR8",
  cls: "signal",
  priority: 20,
  evaluate(inputs) {
    return inputs.evaluators.map((e) => {
      const paths =
        e.recentPaths.length >= 2
          ? `${e.recentPaths[0]} and ${e.recentPaths[1]}`
          : e.recentPaths[0] ?? "the site";
      return card(
        IR8,
        `Someone is evaluating: visits on ${e.days} distinct days in the last ${RULE_EVALUATOR_WINDOW_D}, most recently on ${paths}. No brief yet; worth watching.`,
        `visitor active on ${e.days} distinct days >= ${RULE_EVALUATOR_MIN_DAYS} in trailing ${RULE_EVALUATOR_WINDOW_D}d, no Lead`,
        "/admin/traffic"
      );
    });
  },
};

const IR9: IqRule = {
  id: "IR9",
  cls: "signal",
  priority: 30,
  evaluate(inputs) {
    const a = inputs.brandedClicksPrior28d;
    const b = inputs.brandedClicks28d;
    // 0 -> n belongs to IR11 (firsts), not echo: prior >= 1 required.
    if (a >= 1 && b >= RULE_BRANDED_ECHO_MIN_CLICKS && b >= 2 * a) {
      return [
        card(
          IR9,
          `Branded clicks rose ${a} → ${b} over 28 days. Something made people search the name; trace the cause and repeat it.`,
          `branded clicks 28d ${b} >= 2 x prior ${a} and ${b} >= ${RULE_BRANDED_ECHO_MIN_CLICKS} and prior >= 1`,
          "/admin/search"
        ),
      ];
    }
    return [];
  },
};

const IR10: IqRule = {
  id: "IR10",
  cls: "signal",
  priority: 40,
  evaluate(inputs) {
    return inputs.referrerSpikes.map((s) =>
      card(
        IR10,
        `${s.path} got ${s.views} views this week; ${s.hostViews} of them came from ${s.host}. Post the follow-up while it's warm.`,
        `path views ${s.views} >= ${RULE_REFERRER_SPIKE_MIN_VIEWS} (7d) and ${s.hostViews}/${s.views} from ${s.host} >= ${RULE_REFERRER_SPIKE_SHARE} share`,
        "/admin/content"
      )
    );
  },
};

const IR11: IqRule = {
  id: "IR11",
  cls: "milestone",
  priority: 10,
  evaluate(inputs) {
    // Fires when a first's earliest occurrence lands in trailing 7d, or the
    // trailing-7d visitors beat the previous best window. Max ONE card, most
    // recent wins. GSC firsts link to /admin/search; site firsts/records are
    // linkless (ledger sits on the same Command surface).
    const cutoff = Date.now() - 7 * DAY_MS;
    let bestCandidate: { at: number; c: IqInsightCard } | null = null;

    for (const f of inputs.firsts) {
      if (f.id === "best-week" || !f.achievedAt) continue;
      const at = Date.parse(f.achievedAt);
      if (Number.isNaN(at) || at < cutoff) continue;
      const catalogEntry = FIRSTS_CATALOG.find((c) => c.id === f.id);
      const c = card(
        IR11,
        `${f.label}: ${f.detail ? `${f.detail} · ` : ""}${f.achievedAt.slice(0, 10)}.`,
        `earliest occurrence of "${f.label}" landed in trailing 7d`,
        catalogEntry?.href ?? null
      );
      if (!bestCandidate || at > bestCandidate.at) bestCandidate = { at, c };
    }

    const rw = inputs.recordWeek;
    if (rw && rw.prevBest >= 1 && rw.current > rw.prevBest) {
      const c = card(
        IR11,
        `New record week: ${rw.current} visitors (previous best ${rw.prevBest}).`,
        `trailing-7d visitors ${rw.current} > previous best window ${rw.prevBest}`,
        null
      );
      // A record set now is the most recent thing possible.
      bestCandidate = { at: Date.now(), c };
    }

    return bestCandidate ? [bestCandidate.c] : [];
  },
};

/** The canonical §6b registry — 11 rules, IR1..IR11. */
export const IQ_RULE_REGISTRY: readonly IqRule[] = [
  IR1,
  IR2,
  IR3,
  IR4,
  IR5,
  IR6,
  IR7,
  IR8,
  IR9,
  IR10,
  IR11,
];

/**
 * Run the registry. Returns ALL fired cards, display-sorted: class rank
 * (act → signal → milestone), then per-rule priority ascending (§6b strip
 * behavior). The SURFACE applies INSIGHTS_MAX_COMMAND — silent truncation,
 * priority-sorted so the dropped cards are least severe.
 */
export function evaluateRules(inputs: IqRuleInputs): IqInsightCard[] {
  const fired: IqInsightCard[] = [];
  for (const rule of IQ_RULE_REGISTRY) {
    fired.push(...rule.evaluate(inputs));
  }
  return fired.sort(
    (a, b) => CLASS_RANK[a.cls] - CLASS_RANK[b.cls] || a.priority - b.priority
  );
}

/** Ledger rendering helper: catalog rows merged with achieved state — used by
 * both sources so the ledger and IR11 can never disagree. */
export function ledgerFromFirsts(firsts: readonly FirstEntry[]): FirstEntry[] {
  return FIRSTS_CATALOG.map((c) => {
    const hit = firsts.find((f) => f.id === c.id);
    return hit ?? { id: c.id, label: c.label, achievedAt: null, detail: null };
  });
}
