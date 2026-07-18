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
  DeltaOrCounts,
  RateOrCounts,
  IqSummary,
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
// (e) Recommendations rule engine — SKELETON ONLY (DATA-SPEC §6)
// ---------------------------------------------------------------------------
// Rules R1–R8 land in Wave 2 AFTER the WP2.0 canon merge with UX's I1–I6
// (BUILD-PLAN reconciliation #1). Do NOT implement rule copy here before that
// merge — two competing rule sets is exactly the drift WP2.0 exists to stop.

/** A fired insight. triggerMath renders on hover/expand — the honesty pattern. */
export interface IqInsight {
  ruleId: string;
  /** Lower = shown first. Max 4 render at once (DATA-SPEC §6). */
  priority: number;
  copy: string;
  triggerMath: string;
}

export interface IqRule {
  id: string;
  /** Returns an insight when the trigger fires, null otherwise. All rules respect internal exclusion (they read post-exclusion payloads). */
  evaluate(summary: IqSummary): IqInsight | null;
}

/** Empty until WP2.0 merges the R1–R8 / I1–I6 canon (Wave 2). */
export const IQ_RULE_REGISTRY: readonly IqRule[] = [];

/** Run the registry against a summary; priority-sorted, capped at 4 (DATA-SPEC §6). */
export function evaluateRules(summary: IqSummary): IqInsight[] {
  const fired: IqInsight[] = [];
  for (const rule of IQ_RULE_REGISTRY) {
    const insight = rule.evaluate(summary);
    if (insight) fired.push(insight);
  }
  return fired.sort((a, b) => a.priority - b.priority).slice(0, 4);
}
