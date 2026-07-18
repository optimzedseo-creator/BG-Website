// ADMIN-IQ — payload type contract (DATA-SPEC §7.1, metricsVersion iq-v1).
//
// STRUCTURAL PII FIREWALL (DATA-SPEC §4.4): no type in this file may carry
// name / email / phone / company / message fields. Leads appear in analytics
// payloads ONLY as LeadAnalyticsRef ({ id, status, createdAt, hasVisitorId })
// plus derived facts (B4/B5). CRM types (the PII surface) are deliberately
// NOT in this module — they live with the gated /admin/leads views. Adding a
// PII field here is a spec violation, not a style choice.

// STANDING RULE (bradley-api Change 1): payload types carry ISO-8601 STRINGS,
// never Date. These shapes cross HTTP in Wave 2 (/api/admin/iq), where a Date
// silently JSON-serializes to a string and the client-side type would lie.
// Sources call .toISOString() at the boundary; consumers parse when they need
// date math.

/** Payload-contract version (DATA-SPEC header). Definition changes bump this — never silently redefine. */
export const METRICS_VERSION = "iq-v1" as const;

export type IqMode = "live" | "demo";

export type WindowDays = 7 | 30 | 90;

export type SourceClass = "direct" | "search" | "social" | "ai-referrer" | "other";

/** /insights pillar slugs (lib/insights.ts). */
export type Pillar = "data-analytics" | "digital-marketing" | "ai-automation" | "sales-conversion";

/**
 * ONE filter set recomputes everything (DATA-SPEC §2). GSC dims are a separate
 * population and never live on this object.
 */
export interface Filters {
  window: WindowDays;
  compare?: boolean;
  device?: string;
  country?: string;
  sourceClass?: SourceClass;
  path?: string;
  pillar?: Pillar;
}

/**
 * Per-invocation source options. internalVisitorIds is the read-time internal
 * exclusion list (DATA-SPEC §5.3) — the exclusion is part of every visitor-
 * scoped metric's DEFINITION, so the parameter exists from day one. Phase 2
 * wires the Setting read (`internal_visitor_ids`); until then callers pass [].
 */
export interface SourceOpts {
  internalVisitorIds: string[];
}

/** §4.5 metadata envelope — carried by every payload so honesty metadata renders on screen. */
export interface IqMeta {
  metricsVersion: typeof METRICS_VERSION;
  /** Distinct GscQuery.classifierVersion values in range; [] when the payload has no GSC panel. */
  classifierVersions: string[];
  /** Length of the applied internal-exclusion list ("n internal visitors excluded"). */
  internalExcluded: number;
  mode: IqMode;
}

// ---- N-guard result shapes (helpers live in shared.ts — one threshold source) ----

export type RateOrCounts =
  | { kind: "rate"; value: number; numerator: number; denominator: number }
  | { kind: "counts"; numerator: number; denominator: number; reason: string };

export type DeltaOrCounts =
  | { kind: "delta"; pct: number; current: number; prior: number; downIsGood: boolean }
  | { kind: "counts"; current: number; prior: number; downIsGood: boolean; reason: string };

// ---- Summary surface payloads (current dashboard, computed through the shared module) ----

export interface KpiValue {
  label: string;
  n: number;
}

/** One bucket of the trend series — key comes from shared.bucketKey() (America/New_York). */
export interface TrendBucket {
  key: string;
  visitors: number;
  wins: number;
}

export interface FunnelStep {
  label: string;
  n: number;
}

export interface BreakdownRow {
  label: string;
  n: number;
}

export interface LeadStatusCount {
  status: string;
  n: number;
}

/**
 * The ONLY lead shape permitted in analytics payloads (DATA-SPEC §4.4).
 * No name, no email, no phone, no company, no message — ever.
 */
export interface LeadAnalyticsRef {
  id: string;
  status: string;
  /** ISO-8601 string (wire rule above) — sources emit .toISOString(). */
  createdAt: string;
  hasVisitorId: boolean;
}

export interface IqSummary {
  meta: IqMeta;
  window: WindowDays;
  /** Window start (inclusive) — ISO-8601 string (wire rule above). */
  since: string;
  kpis: KpiValue[];
  /** Zero-filled buckets over the window: day buckets (7/30d), ISO weeks (90d). */
  trend: TrendBucket[];
  funnel: FunnelStep[];
  breakdowns: {
    topPages: BreakdownRow[];
    topReferrers: BreakdownRow[];
    devices: BreakdownRow[];
    countries: BreakdownRow[];
  };
  /** All-time lead counts by status (counts only — no PII, matches the current dashboard). */
  leadsByStatus: LeadStatusCount[];
  /** Total pageviews after filters — the visible denominator for breakdown bars. */
  pageviews: number;
}

// ---- DataSource boundary (DATA-SPEC §7.1) ----

/**
 * One interface, two implementations (live via Prisma, demo in-memory —
 * Wave 4). Panels are written against this and cannot tell which they got.
 * Wave 3 extends it with pageDetail / visitorJourney / gscDetail /
 * funnelStep / recommendations.
 */
export interface AdminIqSource {
  summary(filters: Filters, opts: SourceOpts): Promise<IqSummary>;
}
