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

// ---- Wave 2: Command payload (WP2.2b / WP2.3) ----

export type CommandKpiId =
  | "visitors"
  | "pageviews"
  | "search-clicks"
  | "briefs"
  | "bookings"
  | "subscribers";

/** One KPI-strip tile: current-window count + prior-window count. Deltas render
 * as COUNTS ("+3 vs prior 30d"), never % (UX §2 ruling). */
export interface CommandKpi {
  id: CommandKpiId;
  label: string;
  n: number;
  prior: number;
}

/** B7 unique-visitor funnel step: distinct visitors + raw event count shown
 * alongside. The visitors step carries pageview count as its `events`. */
export interface FunnelStepV2 {
  key: "visitors" | "chooser_click" | "cta_click" | "form_submit" | "booking";
  label: string;
  visitors: number;
  events: number;
}

export type InsightClass = "act" | "signal" | "milestone";

/** A fired insight card (§6b canon). triggerMath renders on hover/expand.
 * href null = LINKLESS (IR3, IR11 site firsts/records) — renders visually
 * non-interactive, per canon. Copy always carries its counts; never PII. */
export interface IqInsightCard {
  ruleId: string;
  cls: InsightClass;
  priority: number;
  copy: string;
  triggerMath: string;
  href: string | null;
}

/** One firsts-catalog row (IR11 + the Command ledger — one list, two renderings). */
export interface FirstEntry {
  id: string;
  label: string;
  /** ISO date achieved, or null = hollow "not yet" row. */
  achievedAt: string | null;
  detail: string | null;
}

/** Three-number scorecard slot (UX §2.7). Gated slots render a progress meter
 * with the unlock rule in words (§7) — emptiness reads as a bar filling. */
export interface ScorecardSlot {
  id: "in-fit-inquiries" | "branded-clicks" | "channel-mix";
  label: string;
  /** Always-visible qualifier, e.g. "trailing 90 days". */
  note: string;
  unlocked: boolean;
  /** Unlocked number slots. */
  n?: number;
  /** Unlocked channel-mix slot: first-touch channel counts + visible denominator. */
  mix?: BreakdownRow[];
  mixDenominator?: number;
  /** Gated slots: the unlock rule in words + meter progress. */
  gateCopy?: string;
  progress?: number;
  target?: number;
}

/** The full Command payload — one response drives the whole surface (DATA §4.1). */
export interface IqCommand {
  meta: IqMeta;
  window: WindowDays;
  /** Window start (inclusive), ISO string. */
  since: string;
  /** Prior-window start (inclusive), ISO string. */
  priorSince: string;
  generatedAt: string;
  kpis: CommandKpi[];
  /** Latest GscDaily date ("YYYY-MM-DD") — the "through {date}" label; null before first ingest. */
  gscThrough: string | null;
  /** ALL fired insights — the surface applies INSIGHTS_MAX_COMMAND (§6b strip behavior). */
  insights: IqInsightCard[];
  /** Number of armed rules (the calm empty-strip card). */
  ruleCount: number;
  trend: TrendBucket[];
  funnel: FunnelStepV2[];
  scorecard: ScorecardSlot[];
  firsts: FirstEntry[];
  /** ISO date of the first post-exclusion pageview — "counting since {date}" captions; null = no data yet. */
  countingSince: string | null;
}

// ---- Wave 2: module-entry landing payload (WP2.2a) ----

export type ModuleId = "overview" | "traffic" | "search" | "leads" | "content" | "security";

/** One landing module card: live teaser stat, 14-day micro-sparkline, latest fact.
 * All strings PII-free (no lead names, ever). */
export interface ModuleTeaser {
  module: ModuleId;
  /** DM Mono teaser line, e.g. "16 visitors · 30d". */
  stat: string;
  /** 14 daily values, oldest first. Empty for Security (no analytics chrome). */
  spark: number[];
  /** One-line "Latest: ..." fact; null when nothing has happened yet. */
  latest: string | null;
}

export interface IqLanding {
  meta: IqMeta;
  window: WindowDays;
  since: string;
  /** Header sub-line inputs. visitors/pageviews/leadsWindow are WINDOWED —
   * the sub-line says "last N days", so every number in it must be (factcheck
   * FC1). leadsTotal stays all-time for the leads teaser, which labels itself. */
  visitors: number;
  pageviews: number;
  leadsWindow: number;
  leadsTotal: number;
  teasers: ModuleTeaser[];
}

// ---- Wave 2: rule-engine inputs (§6b canon — computed by the source,
//      evaluated by the ONE shared engine so live and demo cannot drift) ----

export interface SlaLeadRef {
  id: string;
  days: number;
}

export interface RecentLeadRef {
  id: string;
  status: string;
  /** visitorId stitched AND at least one visible (post-exclusion) pageview. */
  attributed: boolean;
  /** visitorId is non-null — stitched to a visitor, whether or not any views
   * survive the internal exclusion. stitched && !attributed = the "stitched
   * but no visible views" state (database B2 — never say "no cookie" there). */
  stitched: boolean;
  sourceClass: SourceClass | null;
  firstPath: string | null;
  pages: number;
  visits: number;
}

export interface EvaluatorRef {
  /** Anonymous analytics id (never PII by design). */
  visitorId: string;
  /** Distinct active calendar days in the trailing window. */
  days: number;
  /** Most recent distinct paths (up to 2). */
  recentPaths: string[];
}

export interface FunnelPair {
  step: string;
  next: string;
  n: number;
  nextN: number;
}

export interface ZeroClickPage {
  path: string;
  impressions: number;
  avgPosition: number;
}

export interface ReferrerSpike {
  path: string;
  views: number;
  host: string;
  hostViews: number;
}

export interface RecordWeek {
  /** Trailing-7d distinct visitors. */
  current: number;
  /** Best-ever 7-day window (including current). */
  best: number;
  bestEndDate: string | null;
  /** Best among windows fully before the trailing 7 days. */
  prevBest: number;
}

/** Everything the §6b rules need, post-internal-exclusion. PII-free by
 * construction — leads appear as ids + derived facts only. */
export interface IqRuleInputs {
  window: WindowDays;
  slaLeads: SlaLeadRef[];
  unmatchedBookings: number;
  funnelPairs: FunnelPair[];
  costIntentImpressions28d: number;
  gscImpressions28d: number;
  classifiableShare28d: number | null;
  zeroClickPages: ZeroClickPage[];
  /** Share of windowed pageviews with non-null duration; null when views < RATE_MIN_DENOM. */
  durationCoverage: number | null;
  gscGapDates: string[];
  recentLeads: RecentLeadRef[];
  evaluators: EvaluatorRef[];
  brandedClicks28d: number;
  brandedClicksPrior28d: number;
  referrerSpikes: ReferrerSpike[];
  firsts: FirstEntry[];
  recordWeek: RecordWeek | null;
}

// ---- Wave 2 Build B: Traffic module payload (WP2.4) ----

/** B16-style duration stat with the coverage denominator VISIBLE — the UI
 * renders "avg of {reported} of {total} views that reported duration". */
export interface DurationStat {
  /** Average seconds across views that reported a duration; null when none did. */
  avgSeconds: number | null;
  /** Views that reported a duration — the visible coverage denominator. */
  reported: number;
  /** All views in scope. */
  total: number;
}

/** One point of a single-series trend (Traffic visitors line). */
export interface SeriesPoint {
  key: string;
  n: number;
}

/** One recent visitor journey row (Traffic visitor log). Behavior only —
 * shortId is a truncated anonymous analytics id, never PII. Rows carry NO
 * click affordance in Wave 2 (journeys drill in Wave 3). */
export interface VisitorLogRow {
  shortId: string;
  device: string | null;
  country: string | null;
  /** Ordered path sequence in the window (capped). */
  paths: string[];
  /** Paths beyond the cap — rendered as plain text, never a control. */
  morePaths: number;
  views: number;
  /** Sum of reported durations, seconds. */
  totalSeconds: number;
  /** Views that reported a duration (coverage for totalSeconds). */
  reported: number;
}

/** Module-local segment-chip option lists (UX §5). Always computed from the
 * UNCUT window so applying one chip never hides the other chips' options. */
export interface ChipOptions {
  devices: BreakdownRow[];
  countries: BreakdownRow[];
  /** Visitors per first-touch source class (sourceClass cuts visitors, not views). */
  sources: BreakdownRow[];
}

/** Applied module-local cuts, echoed back for URL sync ("n of m" framing). */
export interface AppliedCuts {
  device: string | null;
  country: string | null;
  sourceClass: SourceClass | null;
}

export interface IqTraffic {
  meta: IqMeta;
  window: WindowDays;
  since: string;
  /** ISO date of the first post-exclusion pageview ever; null = no data yet. */
  countingSince: string | null;
  applied: AppliedCuts;
  /** Distinct visitors AFTER cuts — the n of "n of m visitors". */
  visitors: number;
  /** Distinct visitors in the window BEFORE cuts — the m. */
  visitorsUnfiltered: number;
  pageviews: number;
  /** B1 — visitors with pageviews on >= 2 distinct NY calendar days in window. */
  returnVisitors: number;
  avgDuration: DurationStat;
  /** Visitors per bucket, zero-filled (post-cut). */
  trend: SeriesPoint[];
  devices: BreakdownRow[];
  countries: BreakdownRow[];
  referrers: BreakdownRow[];
  chipOptions: ChipOptions;
  /** Last ~20 visitor journeys (most recent first). */
  visitorLog: VisitorLogRow[];
}

// ---- Wave 2 Build B: Content module payload (WP2.5) ----

export interface ContentPageRow {
  path: string;
  views: number;
  visitors: number;
  avgDuration: DurationStat;
  /** Entrances — first pageview of a visitor-day landing on this path. */
  entrances: number;
}

/** One pillar rollup row (B13). slug "index" = the /insights hub itself. */
export interface PillarRow {
  slug: string;
  label: string;
  views: number;
  visitors: number;
  /** B2-style engaged visitors within the pillar's pages. */
  engaged: number;
}

export interface IqContent {
  meta: IqMeta;
  window: WindowDays;
  since: string;
  countingSince: string | null;
  /** Content chips are device/country only — sourceClass stays null. */
  applied: AppliedCuts;
  visitors: number;
  visitorsUnfiltered: number;
  pageviews: number;
  pages: ContentPageRow[];
  /** Distinct paths beyond CONTENT_PAGES_MAX not shown in `pages` — rendered
   * as one quiet line when > 0 (api A2 truncation honesty). */
  pagesOmitted?: number;
  pillars: PillarRow[];
  /** ISO date of the first /insights pageview ever; null = none yet ("counting since" for the pillar card). */
  insightsCountingSince: string | null;
  chipOptions: ChipOptions;
}

// ---- Wave 2 Build B: Search (GSC) module payload (WP2.6) ----
// GSC dims never cross site metrics (DATA §2) — this payload carries GSC data
// ONLY, charted by GSC's stored date (gscDateKey), never re-bucketed.

export interface GscTrendPoint {
  /** Stored GSC date key ("YYYY-MM-DD"). */
  date: string;
  /** Branded CLICKS (B8 — clicks are the headline, never impressions). */
  branded: number;
  nonBranded: number;
}

export interface IntentBucketRow {
  bucket: string;
  impressions: number;
  clicks: number;
}

export interface GscQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  /** Impression-weighted average position. */
  position: number;
  isBranded: boolean;
  brandedAmbiguous: boolean;
  intentBucket: string | null;
}

/** Sub-threshold rollup — counted in totals, never hidden (UX §3.5). */
export interface BelowThresholdRollup {
  rows: number;
  impressions: number;
  clicks: number;
}

export interface GscCountryRow {
  country: string;
  impressions: number;
  clicks: number;
}

export interface IqSearch {
  meta: IqMeta;
  window: WindowDays;
  /** Earliest stored GscDaily date ever — the "GSC connected / counting since" date; null before first ingest. */
  gscSince: string | null;
  /** Latest stored GscDaily date — the "data through {date}" notice; null before first ingest. */
  gscThrough: string | null;
  /** Property totals from GscDaily (the honest denominator, B9). */
  impressions: number;
  clicks: number;
  /** From GscQuery pre-tags. brandedAmbiguous reported separately, never folded in. */
  brandedClicks: number;
  brandedAmbiguousClicks: number;
  /** Sum of visible GscQuery impressions in window — B9 numerator. */
  visibleImpressions: number;
  visibleClicks: number;
  trend: GscTrendPoint[];
  intents: IntentBucketRow[];
  intentsBelowThreshold: BelowThresholdRollup | null;
  queries: GscQueryRow[];
  queriesBelowThreshold: BelowThresholdRollup | null;
  /** ABOVE-threshold query rows sliced off past GSC_QUERY_ROWS_MAX — rolled
   * up, never silently vanished (api A2 truncation honesty). */
  queriesBeyondCap: BelowThresholdRollup | null;
  countries: GscCountryRow[];
  /** Country rows sliced off past GSC_COUNTRY_ROWS_MAX — rolled up, never
   * silently vanished (api A2; hittable today at 12 rows). */
  countriesBeyondCap: BelowThresholdRollup | null;
}

// ---- DataSource boundary (DATA-SPEC §7.1) ----

/**
 * One interface, two implementations (live via Prisma, demo in-memory —
 * Wave 4). Panels are written against this and cannot tell which they got.
 * Wave 3 extends it with pageDetail / visitorJourney / gscDetail /
 * funnelStep.
 */
export interface AdminIqSource {
  summary(filters: Filters, opts: SourceOpts): Promise<IqSummary>;
  /** Full Command payload (WP2.2b/WP2.3) — one call, one pooled connection. */
  command(filters: Filters, opts: SourceOpts): Promise<IqCommand>;
  /** Module-entry landing teasers (WP2.2a). */
  landing(filters: Filters, opts: SourceOpts): Promise<IqLanding>;
  /** PII-free lead counts by status (rail chips — counts only, all six statuses). */
  leadsByStatus(): Promise<LeadStatusCount[]>;
  /** Traffic module payload (WP2.4) — honors device/country/sourceClass cuts. */
  traffic(filters: Filters, opts: SourceOpts): Promise<IqTraffic>;
  /** Content module payload (WP2.5) — honors device/country cuts. */
  content(filters: Filters, opts: SourceOpts): Promise<IqContent>;
  /** Search (GSC) module payload (WP2.6) — GSC population only, stored dates. */
  search(filters: Filters, opts: SourceOpts): Promise<IqSearch>;
  /** PII-free lead counts by inquiry type (leads donut — counts only; the four
   * stored form values plus an "Other / unset" residue slice). */
  leadsByInquiryType(): Promise<BreakdownRow[]>;
}
