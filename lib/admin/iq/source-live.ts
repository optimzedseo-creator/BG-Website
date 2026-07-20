// ADMIN-IQ — live DataSource (DATA-SPEC §7.1): the current dashboard's
// metrics, extracted from app/admin/(panel)/page.tsx and computed through the
// shared module (bucketKey America/New_York, versioned source classes,
// internal exclusion as part of every visitor-scoped metric's definition).
//
// ⚠ SECURITY INVARIANT (lib/admin/auth.ts): this module does NOT call
// requireAdmin() itself — it is called FROM gated surfaces. EVERY caller
// (server component page, server action, /api/admin/iq* route handler —
// including demo mode) MUST await requireAdmin() first-line before invoking
// anything here. A caller without the gate is a rejected PR, not a fixable
// one (BUILD-PLAN governance).
//
// PII firewall (DATA-SPEC §4.4): nothing returned from this file carries
// name/email/phone/company/message — enforced structurally by the types in
// ./types.ts. Lead data appears only as status counts here.

import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { pillars } from "@/lib/insights";
import type {
  ActivityKind,
  ActivityRow,
  AdminIqSource,
  AppliedCuts,
  BelowThresholdRollup,
  BreakdownRow,
  ChipOptions,
  CommandKpi,
  CommandKpiId,
  ContentPageRow,
  DayEventRow,
  DayVisitorRow,
  DurationStat,
  EvaluatorRef,
  Filters,
  FirstEntry,
  FunnelEventRow,
  FunnelPair,
  FunnelPersonRow,
  FunnelStepKey,
  FunnelStepV2,
  GscClassifiablePoint,
  GscCountryRow,
  GscDetailKind,
  GscQueryDayPoint,
  GscQueryPageRow,
  GscQueryRow,
  GscTrendPoint,
  IntentBucketRow,
  IqActivity,
  IqCommand,
  IqContent,
  IqDayDetail,
  IqFunnelStep,
  IqGscDetail,
  IqGscIntentBucket,
  IqKpiDetail,
  IqLanding,
  IqMeta,
  IqPageDetail,
  IqRuleInputs,
  IqSearch,
  IqSummary,
  IqTraffic,
  IqVisitorJourney,
  JourneyItem,
  JourneyKind,
  JourneySession,
  KpiSeriesPoint,
  LeadStatusCount,
  ModuleTeaser,
  PageSearchRow,
  PageSourceRow,
  PillarRow,
  RecentLeadRef,
  RecordWeek,
  ReferrerSpike,
  ScorecardSlot,
  SeriesPoint,
  SlaLeadRef,
  SourceClass,
  SourceOpts,
  TrendBucket,
  VisitorLogRow,
  ZeroClickPage,
} from "./types";
import { METRICS_VERSION } from "./types";
import {
  ACTIVITY_ROWS,
  CONTENT_PAGES_MAX,
  DAY_MS,
  DURATION_DISPLAY_CAP_S,
  ENGAGED_MIN_DURATION_S,
  GSC_COUNTRY_ROWS_MAX,
  GSC_MIN_IMPRESSIONS,
  GSC_QUERY_ROWS_MAX,
  IN_FIT_INQUIRY_TYPES,
  INQUIRY_TYPE_OTHER_LABEL,
  INQUIRY_TYPE_VALUES,
  IQ_RULE_REGISTRY,
  JOURNEY_ITEM_CAP,
  PAGE_SEARCH_ROWS,
  PAGE_SOURCE_ROWS,
  PAGE_VISITOR_ROWS,
  RATE_MIN_DENOM,
  RULE_EVALUATOR_MIN_DAYS,
  RULE_EVALUATOR_WINDOW_D,
  RULE_LEAD_SLA_DAYS,
  RULE_REFERRER_SPIKE_MIN_VIEWS,
  RULE_REFERRER_SPIKE_SHARE,
  RULE_ZERO_CTR_MIN_IMPRESSIONS,
  SCORECARD_BRANDED_GATE_IMPRESSIONS,
  SCORECARD_CHANNEL_GATE,
  SCORECARD_INFIT_GATE,
  SESSION_GAP_MINUTES,
  VISITOR_LOG_PATHS_MAX,
  VISITOR_LOG_ROWS,
  bucketKey,
  bucketKeyFor,
  buildPeriodComparison,
  classifySource,
  dayBucketKey,
  evaluateRules,
  gscDateKey,
  lastNDayKeys,
  ledgerFromFirsts,
  nyDateParts,
  periodBucketKeys,
  periodEcho,
  PERIOD_SHORT_LABEL,
  priorPeriod,
  referrerHost,
  resolveGscPeriod,
  resolvePeriod,
  windowBucketKeys,
} from "./shared";
import type { Period } from "./shared";
import { K_TOTP_SECRET } from "@/lib/admin/auth";

// Row caps (DATA-SPEC §5.1): fetch-then-aggregate stays acceptable to ~50k
// rows/window; these caps keep a runaway window from degrading unbounded.
// Current scale is ~150 pageviews/30d — the caps are a ceiling, not a limit
// anyone hits today.
const PAGEVIEW_ROW_CAP = 50_000;
const EVENT_ROW_CAP = 50_000;
const BOOKING_ROW_CAP = 10_000;
// bradley-database B3 — every findMany in this module carries a take:
const LEAD_ROW_CAP = 10_000;
const GSC_DAILY_ROW_CAP = 2_000; // ~5.5 years of daily rows
const GSC_QUERY_ROW_CAP = 50_000;
const GSC_COUNTRY_ROW_CAP = 20_000;

const LEAD_STATUS_ORDER = ["new", "contacted", "call_booked", "qualified", "won", "lost"] as const;

function topCounts(values: (string | null | undefined)[], fallback: string, top = 8): BreakdownRow[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = v && v.trim() ? v.trim() : fallback;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, n]) => ({ label, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, top);
}

/** Raw-referrer label for the breakdown card: external host, or a truncated raw string for unparseable referrers. */
function referrerLabel(ref: string | null): string | null {
  if (!ref) return null;
  const host = referrerHost(ref);
  if (host) return host;
  try {
    new URL(ref);
    return null; // parseable but internal — counts as direct
  } catch {
    return ref.slice(0, 60); // unparseable junk: show it truncated, like the old dashboard
  }
}

/**
 * Internal exclusion (DATA-SPEC §5.3) for a REQUIRED visitorId column.
 * Applied read-time so Brad's past self-visits clean out of history the
 * moment his id lands on the list; rows are never deleted.
 */
function excludeInternal(internal: string[]): Prisma.PageViewWhereInput {
  return internal.length ? { visitorId: { notIn: internal } } : {};
}

/**
 * Internal exclusion for a NULLABLE visitorId column (Event, Booking).
 * SQL NOT IN drops NULL rows, and anonymous server-side rows (e.g. a
 * form_submit with no cookie) must NOT vanish when the list is non-empty —
 * so null explicitly stays in.
 */
function excludeInternalNullable(internal: string[]): { OR: [{ visitorId: null }, { visitorId: { notIn: string[] } }] } | Record<string, never> {
  return internal.length ? { OR: [{ visitorId: null }, { visitorId: { notIn: internal } }] } : {};
}

async function liveSummary(filters: Filters, opts: SourceOpts): Promise<IqSummary> {
  const { window } = filters;
  const internal = opts.internalVisitorIds;
  const now = new Date();
  const since = new Date(now.getTime() - window * DAY_MS);

  // Windowed queries only (createdAt >= since) + row caps — DATA-SPEC §5.1.
  const [allViews, allEvents, allBookings, leadsGrouped] = await Promise.all([
    prisma.pageView.findMany({
      where: { createdAt: { gte: since }, ...excludeInternal(internal) },
      select: { path: true, visitorId: true, referrer: true, device: true, country: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: PAGEVIEW_ROW_CAP,
    }),
    prisma.event.findMany({
      where: { createdAt: { gte: since }, ...excludeInternalNullable(internal) },
      select: { name: true, path: true, visitorId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: EVENT_ROW_CAP,
    }),
    prisma.booking.findMany({
      where: { createdAt: { gte: since }, ...excludeInternalNullable(internal) },
      select: { visitorId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: BOOKING_ROW_CAP,
    }),
    // Lead counts by status (all-time) — counts only, no PII fields selected.
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  // ---- Dimension filters (DATA-SPEC §2) ------------------------------------
  // device/country/path/pillar cut PAGEVIEWS; sourceClass cuts VISITORS by
  // their FIRST windowed pageview's class (§2 "Source class" row). When any
  // cut is active, events/bookings are restricted to the surviving visitor
  // cohort (events/bookings carry no device/country of their own).
  const firstTouchClass = new Map<string, string>();
  for (const v of allViews) {
    if (!firstTouchClass.has(v.visitorId)) firstTouchClass.set(v.visitorId, classifySource(v.referrer));
  }

  const pillarPrefix = filters.pillar ? `/insights/${filters.pillar}` : null;
  const hasCuts = Boolean(filters.device || filters.country || filters.sourceClass || filters.path || pillarPrefix);

  const views = hasCuts
    ? allViews.filter((v) => {
        if (filters.device && v.device !== filters.device) return false;
        if (filters.country && v.country !== filters.country) return false;
        if (filters.path && v.path !== filters.path) return false;
        if (pillarPrefix && v.path !== pillarPrefix && !v.path.startsWith(`${pillarPrefix}/`)) return false;
        if (filters.sourceClass && firstTouchClass.get(v.visitorId) !== filters.sourceClass) return false;
        return true;
      })
    : allViews;

  const cohort = hasCuts ? new Set(views.map((v) => v.visitorId)) : null;
  const events = cohort ? allEvents.filter((e) => e.visitorId !== null && cohort.has(e.visitorId)) : allEvents;
  const bookings = cohort ? allBookings.filter((b) => b.visitorId !== null && cohort.has(b.visitorId)) : allBookings;

  // ---- KPIs ----------------------------------------------------------------
  const visitors = new Set(views.map((v) => v.visitorId)).size;
  const eventCount = (name: string) => events.filter((e) => e.name === name).length;
  const briefs = eventCount("form_submit"); // A5 — server-recorded WIN, un-spoofable

  // ---- Trend (bucketKey — America/New_York; zero-filled) -------------------
  const visitorsByBucket = new Map<string, Set<string>>();
  for (const v of views) {
    const k = bucketKey(v.createdAt, window);
    if (!visitorsByBucket.has(k)) visitorsByBucket.set(k, new Set());
    visitorsByBucket.get(k)!.add(v.visitorId);
  }
  const winsByBucket = new Map<string, number>();
  for (const e of events) {
    if (e.name !== "form_submit") continue;
    const k = bucketKey(e.createdAt, window);
    winsByBucket.set(k, (winsByBucket.get(k) || 0) + 1);
  }
  for (const b of bookings) {
    const k = bucketKey(b.createdAt, window);
    winsByBucket.set(k, (winsByBucket.get(k) || 0) + 1);
  }
  const trend: TrendBucket[] = windowBucketKeys(window, now).map((key) => ({
    key,
    visitors: visitorsByBucket.get(key)?.size || 0,
    wins: winsByBucket.get(key) || 0,
  }));

  // ---- Funnel (event counts, matching the current dashboard) ---------------
  const funnel = [
    { label: "Chooser click", n: eventCount("chooser_click") },
    { label: "CTA click", n: eventCount("cta_click") },
    { label: "Brief (form)", n: briefs },
    { label: "Booking", n: bookings.length },
  ];

  // ---- Breakdowns ----------------------------------------------------------
  const breakdowns = {
    topPages: topCounts(views.map((v) => v.path), "(unknown)"),
    topReferrers: topCounts(views.map((v) => referrerLabel(v.referrer)), "(direct)"),
    devices: topCounts(views.map((v) => v.device), "(unknown)"),
    countries: topCounts(views.map((v) => v.country), "(unknown)"),
  };

  const leadsByStatus = LEAD_STATUS_ORDER.map((status) => ({
    status,
    n: leadsGrouped.find((r) => r.status === status)?._count._all || 0,
  }));

  return {
    meta: {
      metricsVersion: METRICS_VERSION,
      classifierVersions: [], // summary carries no GSC panel yet (GSC surfaces land Wave 2, WP2.6)
      internalExcluded: internal.length,
      mode: "live",
    },
    window,
    since: since.toISOString(), // wire rule: payload dates are ISO strings, never Date

    kpis: [
      { label: "Visitors", n: visitors },
      { label: "Pageviews", n: views.length },
      { label: "Briefs", n: briefs },
      { label: "Bookings", n: bookings.length },
    ],
    trend,
    funnel,
    breakdowns,
    leadsByStatus,
    pageviews: views.length,
  };
}

// ---------------------------------------------------------------------------
// Wave 2 — Command payload (WP2.2b / WP2.3)
// ---------------------------------------------------------------------------
// Reads ALL-TIME PageView/Event/Booking/Subscriber rows (row-capped) in one
// pass: the firsts ledger, record week, prior-period deltas, and window
// metrics all derive from the same arrays, so one fetch per table beats six
// windowed fetches at this scale (DATA §5.1 blesses fetch-then-aggregate to
// ~50k rows/window; current all-time volume is a few thousand). Revisit when
// the §5.2 rollup thresholds get near.

const LEAD_STATUS_ORDER_LIST = LEAD_STATUS_ORDER;

const FUNNEL_STEPS: { key: FunnelStepV2["key"]; label: string; spoken: string }[] = [
  { key: "visitors", label: "Visitors", spoken: "the site" },
  { key: "chooser_click", label: "Chooser click", spoken: "the chooser" },
  { key: "cta_click", label: "CTA click", spoken: "a CTA" },
  { key: "form_submit", label: "Brief (form)", spoken: "the brief" },
  { key: "booking", label: "Booking", spoken: "a booking" },
];

/** Path of a GSC page URL ("https://www.bradleygriffin.us/x" → "/x"). */
function gscPagePath(page: string): string {
  try {
    return new URL(page).pathname || "/";
  } catch {
    return page;
  }
}

/** NY calendar-day key of an instant — shorthand over bucketKey(date, 7). */
function nyDayKey(date: Date): string {
  return bucketKey(date, 7);
}

async function liveCommand(filters: Filters, opts: SourceOpts): Promise<IqCommand> {
  const { window } = filters;
  const internal = opts.internalVisitorIds;
  const now = new Date();
  // WP1 — the resolved period + honest comparison drive the KPI strip. In the
  // window-fallback path (no filters.period) `since`/`comparison` reproduce the
  // legacy `now − window` / `now − 2·window` instants byte-for-byte.
  const resolved = resolvePeriod(filters, now);
  const period = resolved.period;
  const cmp = resolved.comparison;
  const since = period.since;
  const until = period.until;
  const since7 = new Date(now.getTime() - 7 * DAY_MS);
  const since14 = new Date(now.getTime() - RULE_EVALUATOR_WINDOW_D * DAY_MS);
  const since28 = new Date(now.getTime() - 28 * DAY_MS);
  const since56 = new Date(now.getTime() - 56 * DAY_MS);
  const since90 = new Date(now.getTime() - 90 * DAY_MS);
  // bradley-database "Correction A": the KPI/comparison numbers come from a
  // fetch BOUNDED to [fetchSince, until] (winViews/winEvents/winBookings below),
  // never from the all-time scan — so a year-over-year compare can't be starved
  // by the 50k row cap. fetchSince = the earliest instant any windowed consumer
  // (the comparison window, or the ≤90d rule inputs) needs. The firsts /
  // record-week / channel-mix scans stay ALL-TIME (allViews/allEvents/…).
  const fetchSince = new Date(
    Math.min(cmp ? cmp.since.getTime() : since.getTime(), since90.getTime())
  );

  const [
    allViews,
    allEvents,
    allBookings,
    subscribers,
    leads,
    gscDaily,
    gscQueries90,
    firstNonUsImpression,
    firstNonBranded,
    firstCostQuery,
    firstBrandedClick,
    winViews,
    winEvents,
    winBookings,
  ] = await Promise.all([
    prisma.pageView.findMany({
      where: excludeInternal(internal),
      select: {
        path: true,
        visitorId: true,
        referrer: true,
        device: true,
        country: true,
        duration: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
      take: PAGEVIEW_ROW_CAP,
    }),
    prisma.event.findMany({
      where: excludeInternalNullable(internal),
      select: { name: true, path: true, visitorId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: EVENT_ROW_CAP,
    }),
    prisma.booking.findMany({
      where: excludeInternalNullable(internal),
      select: { visitorId: true, leadId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: BOOKING_ROW_CAP,
    }),
    prisma.subscriber.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
      take: BOOKING_ROW_CAP,
    }),
    // PII-free selection ONLY (id, status, dates, stitch flag, inquiry
    // category) — names/emails/messages never enter this module.
    prisma.lead.findMany({
      select: { id: true, status: true, createdAt: true, visitorId: true, inquiryType: true },
      orderBy: { createdAt: "asc" },
      take: LEAD_ROW_CAP,
    }),
    prisma.gscDaily.findMany({
      select: { date: true, impressions: true, clicks: true },
      orderBy: { date: "asc" },
      take: GSC_DAILY_ROW_CAP,
    }),
    prisma.gscQuery.findMany({
      where: { date: { gte: since90 } },
      take: GSC_QUERY_ROW_CAP,
      select: {
        date: true,
        query: true,
        page: true,
        impressions: true,
        clicks: true,
        position: true,
        isBranded: true,
        brandedAmbiguous: true,
        intentBucket: true,
        classifierVersion: true,
      },
    }),
    prisma.gscCountryDaily.findFirst({
      where: { country: { not: "usa" }, impressions: { gt: 0 } },
      orderBy: { date: "asc" },
      select: { date: true, country: true },
    }),
    prisma.gscQuery.findFirst({
      where: { isBranded: false, brandedAmbiguous: false, impressions: { gt: 0 } },
      orderBy: { date: "asc" },
      select: { date: true, query: true, intentBucket: true },
    }),
    prisma.gscQuery.findFirst({
      where: { intentBucket: "cost" },
      orderBy: { date: "asc" },
      select: { date: true, query: true },
    }),
    prisma.gscQuery.findFirst({
      where: { isBranded: true, clicks: { gt: 0 } },
      orderBy: { date: "asc" },
      select: { date: true, query: true },
    }),
    // WP1 Correction A — bounded KPI/comparison/trend/window-rules fetches.
    prisma.pageView.findMany({
      where: { createdAt: { gte: fetchSince }, ...excludeInternal(internal) },
      select: { path: true, visitorId: true, referrer: true, device: true, country: true, duration: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: PAGEVIEW_ROW_CAP,
    }),
    prisma.event.findMany({
      where: { createdAt: { gte: fetchSince }, ...excludeInternalNullable(internal) },
      select: { name: true, path: true, visitorId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: EVENT_ROW_CAP,
    }),
    prisma.booking.findMany({
      where: { createdAt: { gte: fetchSince }, ...excludeInternalNullable(internal) },
      select: { visitorId: true, leadId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: BOOKING_ROW_CAP,
    }),
  ]);

  // WP1 — window slices come from the BOUNDED fetch; the prior slice uses the
  // resolved comparison (equal-elapsed span while the current period runs).
  const inRange = (t: Date, lo: Date, hi: Date) => t >= lo && t < hi;
  const views = winViews.filter((v) => inRange(v.createdAt, since, until));
  const priorViews = cmp ? winViews.filter((v) => inRange(v.createdAt, cmp.since, cmp.until)) : [];
  const events = winEvents.filter((e) => inRange(e.createdAt, since, until));
  const priorEvents = cmp ? winEvents.filter((e) => inRange(e.createdAt, cmp.since, cmp.until)) : [];
  const bookings = winBookings.filter((b) => inRange(b.createdAt, since, until));
  const priorBookings = cmp ? winBookings.filter((b) => inRange(b.createdAt, cmp.since, cmp.until)) : [];

  const distinct = (ids: (string | null)[]) => new Set(ids.filter((v): v is string => v !== null)).size;
  const countEvents = (list: typeof winEvents, name: string) => list.filter((e) => e.name === name).length;

  // ---- KPI strip (counts + prior counts + the honest four-state comparison) --
  // M2 (database): GSC rows are @db.Date (midnight UTC). Under calendar/custom
  // periods the bounds are NY instants (04:00/05:00Z), so instant comparison
  // silently drops the period's first GSC day (00:00Z < 04:00Z). Slice GSC by
  // CALENDAR-DAY KEYS derived from the period's NY dates instead. The window
  // fallback keeps the legacy instant comparison — byte-identical to shipped.
  const isWindowKind = resolved.kind === "window";
  const gscKeySlice = (lo: Date, hi: Date) => {
    const fromKey = dayBucketKey(lo);
    const toKey = dayBucketKey(new Date(hi.getTime() - 1)); // hi is exclusive
    return gscDaily.filter((r) => {
      const k = gscDateKey(r.date);
      return k >= fromKey && k <= toKey;
    });
  };
  const gscInWindow = isWindowKind
    ? gscDaily.filter((r) => inRange(r.date, since, until))
    : gscKeySlice(since, until);
  const gscInPrior = !cmp
    ? []
    : isWindowKind
      ? gscDaily.filter((r) => inRange(r.date, cmp.since, cmp.until))
      : gscKeySlice(cmp.since, cmp.until);
  const subsInWindow = subscribers.filter((s) => inRange(s.createdAt, since, until)).length;
  const subsInPrior = cmp ? subscribers.filter((s) => inRange(s.createdAt, cmp.since, cmp.until)).length : 0;

  // Per-KPI data start for the "new" comparison guard (generalized
  // priorWindowPredatesData): the whole prior window predating first data → "new".
  const siteStart = allViews[0]?.createdAt ?? null;
  const gscStart = gscDaily[0]?.date ?? null;
  const subStart = subscribers[0]?.createdAt ?? null;
  const predates = (firstAt: Date | null): boolean =>
    cmp !== null && (firstAt === null || cmp.until.getTime() <= firstAt.getTime());
  const kpi = (
    id: CommandKpiId,
    label: string,
    n: number,
    prior: number,
    firstAt: Date | null
  ): CommandKpi => ({
    id,
    label,
    n,
    prior,
    comparison: buildPeriodComparison(n, prior, cmp, { priorPredatesData: predates(firstAt) }),
  });

  const kpis: CommandKpi[] = [
    kpi("visitors", "Visitors", distinct(views.map((v) => v.visitorId)), distinct(priorViews.map((v) => v.visitorId)), siteStart),
    kpi("pageviews", "Pageviews", views.length, priorViews.length, siteStart),
    kpi("search-clicks", "Search clicks", gscInWindow.reduce((a, r) => a + r.clicks, 0), gscInPrior.reduce((a, r) => a + r.clicks, 0), gscStart),
    kpi("briefs", "Briefs", countEvents(events, "form_submit"), countEvents(priorEvents, "form_submit"), siteStart),
    kpi("bookings", "Bookings", bookings.length, priorBookings.length, siteStart),
    kpi("subscribers", "Subscribers", subsInWindow, subsInPrior, subStart),
  ];

  const gscThrough = gscDaily.length ? gscDateKey(gscDaily[gscDaily.length - 1].date) : null;

  // ---- Trend (F1: the axis rides the RESOLVED period) ----------------------
  // Calendar/custom periods bucket by the resolved granularity (today→hour,
  // week/month→day, quarter→week[Sunday], year→month) over periodBucketKeys.
  // The window fallback keeps the LEGACY pair (bucketKey + windowBucketKeys —
  // day/day/ISO-week) so the shipped ?p=7/30/90 axis is byte-identical.
  const trendKeyOf = (d: Date) =>
    isWindowKind ? bucketKey(d, window) : bucketKeyFor(d, resolved.granularity);
  const visitorsByBucket = new Map<string, Set<string>>();
  for (const v of views) {
    const k = trendKeyOf(v.createdAt);
    if (!visitorsByBucket.has(k)) visitorsByBucket.set(k, new Set());
    visitorsByBucket.get(k)!.add(v.visitorId);
  }
  const winsByBucket = new Map<string, number>();
  for (const e of events) {
    if (e.name !== "form_submit") continue;
    const k = trendKeyOf(e.createdAt);
    winsByBucket.set(k, (winsByBucket.get(k) || 0) + 1);
  }
  for (const b of bookings) {
    const k = trendKeyOf(b.createdAt);
    winsByBucket.set(k, (winsByBucket.get(k) || 0) + 1);
  }
  const axisKeys = isWindowKind
    ? windowBucketKeys(window, now)
    : periodBucketKeys(since, until, resolved.granularity);
  const trend: TrendBucket[] = axisKeys.map((key) => ({
    key,
    visitors: visitorsByBucket.get(key)?.size || 0,
    wins: winsByBucket.get(key) || 0,
  }));

  // ---- Funnel — B7 unique-visitor based, event counts alongside ------------
  const stepVisitors = (name: string) =>
    distinct(events.filter((e) => e.name === name).map((e) => e.visitorId));
  const funnel: FunnelStepV2[] = FUNNEL_STEPS.map((s) => {
    if (s.key === "visitors") {
      return { key: s.key, label: s.label, visitors: distinct(views.map((v) => v.visitorId)), events: views.length };
    }
    if (s.key === "booking") {
      return { key: s.key, label: s.label, visitors: distinct(bookings.map((b) => b.visitorId)), events: bookings.length };
    }
    return { key: s.key, label: s.label, visitors: stepVisitors(s.key), events: countEvents(events, s.key) };
  });

  const funnelPairs: FunnelPair[] = funnel.slice(0, -1).map((step, i) => ({
    step: FUNNEL_STEPS[i].spoken,
    next: FUNNEL_STEPS[i + 1].spoken,
    n: step.visitors,
    nextN: funnel[i + 1].visitors,
  }));

  // ---- Firsts catalog + record week (all-time scan, post-exclusion) --------
  const firstWhere = <T>(list: T[], pred: (t: T) => boolean): T | undefined => list.find(pred);
  const firstView = allViews[0];
  const firstMobile = firstWhere(allViews, (v) => v.device === "mobile");
  const firstNonUs = firstWhere(allViews, (v) => Boolean(v.country) && v.country !== "US");
  const firstChooser = firstWhere(allEvents, (e) => e.name === "chooser_click");
  const firstCta = firstWhere(allEvents, (e) => e.name === "cta_click");
  const firstBrief = firstWhere(allEvents, (e) => e.name === "form_submit");
  const firstBooking = allBookings[0];
  const firstSub = subscribers[0];
  const tenthSub = subscribers[9];
  const firstGscClick = firstWhere(gscDaily, (r) => r.clicks > 0);

  // Rolling 7-NY-day distinct-visitor windows over all-time daily sets.
  const dayVisitorSets = new Map<string, Set<string>>();
  for (const v of allViews) {
    const k = nyDayKey(v.createdAt);
    if (!dayVisitorSets.has(k)) dayVisitorSets.set(k, new Set());
    dayVisitorSets.get(k)!.add(v.visitorId);
  }
  let recordWeek: RecordWeek | null = null;
  if (allViews.length) {
    const { y, m, d } = nyDateParts(now);
    const firstKey = nyDayKey(allViews[0].createdAt);
    const allDays: string[] = [];
    // Walk backward from today to the first data day (bounded by data span).
    for (let i = 0; ; i++) {
      const dt = new Date(Date.UTC(y, m - 1, d - i));
      const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(
        dt.getUTCDate()
      ).padStart(2, "0")}`;
      allDays.unshift(key);
      if (key <= firstKey) break;
    }
    let best = 0;
    let bestEnd: string | null = null;
    let prevBest = 0;
    let current = 0;
    for (let i = 0; i < allDays.length; i++) {
      const union = new Set<string>();
      for (let j = Math.max(0, i - 6); j <= i; j++) {
        for (const id of dayVisitorSets.get(allDays[j]) ?? []) union.add(id);
      }
      const n = union.size;
      if (n > best) {
        best = n;
        bestEnd = allDays[i];
      }
      // Windows fully before the trailing 7 days (end index earlier than len-7).
      if (i < allDays.length - 7 && n > prevBest) prevBest = n;
      if (i === allDays.length - 1) current = n;
    }
    recordWeek = { current, best, bestEndDate: bestEnd, prevBest };
  }

  const iso = (d: Date | undefined | null) => (d ? d.toISOString() : null);
  const achieved: FirstEntry[] = [
    { id: "first-visitor", label: "First visitor", achievedAt: iso(firstView?.createdAt), detail: firstView?.path ?? null },
    { id: "first-mobile-visitor", label: "First mobile visitor", achievedAt: iso(firstMobile?.createdAt), detail: firstMobile?.path ?? null },
    { id: "first-non-us-visitor", label: "First non-US visitor", achievedAt: iso(firstNonUs?.createdAt), detail: firstNonUs?.country ?? null },
    { id: "first-chooser-click", label: "First chooser click", achievedAt: iso(firstChooser?.createdAt), detail: firstChooser?.path ?? null },
    { id: "first-cta-click", label: "First CTA click", achievedAt: iso(firstCta?.createdAt), detail: firstCta?.path ?? null },
    { id: "first-brief", label: "First brief", achievedAt: iso(firstBrief?.createdAt), detail: firstBrief?.path ?? null },
    { id: "first-booking", label: "First booking", achievedAt: iso(firstBooking?.createdAt), detail: null },
    { id: "first-subscriber", label: "First subscriber", achievedAt: iso(firstSub?.createdAt), detail: null },
    { id: "tenth-subscriber", label: "10th subscriber", achievedAt: iso(tenthSub?.createdAt), detail: null },
    {
      id: "first-gsc-click",
      label: "First search click",
      achievedAt: firstGscClick ? gscDateKey(firstGscClick.date) : null,
      detail: firstGscClick ? `${firstGscClick.clicks} click${firstGscClick.clicks === 1 ? "" : "s"}` : null,
    },
    {
      id: "first-nonbranded-impression",
      label: "First non-branded impression",
      achievedAt: firstNonBranded ? gscDateKey(firstNonBranded.date) : null,
      detail: firstNonBranded
        ? `"${firstNonBranded.query}"${firstNonBranded.intentBucket ? ` (intent: ${firstNonBranded.intentBucket})` : ""}`
        : null,
    },
    {
      id: "first-non-us-impression",
      label: "First non-US impression",
      achievedAt: firstNonUsImpression ? gscDateKey(firstNonUsImpression.date) : null,
      detail: firstNonUsImpression?.country ?? null,
    },
    {
      id: "first-cost-query",
      label: "First cost-intent query",
      achievedAt: firstCostQuery ? gscDateKey(firstCostQuery.date) : null,
      detail: firstCostQuery ? `"${firstCostQuery.query}"` : null,
    },
    {
      id: "first-branded-click",
      label: "First branded click",
      achievedAt: firstBrandedClick ? gscDateKey(firstBrandedClick.date) : null,
      detail: firstBrandedClick ? `"${firstBrandedClick.query}"` : null,
    },
    {
      id: "best-week",
      label: "Best week",
      achievedAt: recordWeek && recordWeek.best > 0 ? recordWeek.bestEndDate : null,
      detail: recordWeek && recordWeek.best > 0 ? `${recordWeek.best} visitors` : null,
    },
  ];
  const firsts = ledgerFromFirsts(achieved);

  // ---- Scorecard (UX §2.7 — trailing 90d, meter gates per §7) --------------
  const inFit = leads.filter(
    (l) => l.createdAt >= since90 && IN_FIT_INQUIRY_TYPES.includes(l.inquiryType)
  ).length;
  const brandedRows90 = gscQueries90.filter((q) => q.isBranded);
  const brandedImpr90 = brandedRows90.reduce((a, q) => a + q.impressions, 0);
  const brandedClicks90 = brandedRows90.reduce((a, q) => a + q.clicks, 0);

  const attributedLeads = leads.filter((l) => l.visitorId !== null);
  const channelCounts = new Map<string, number>();
  for (const l of attributedLeads) {
    const firstTouch = firstWhere(allViews, (v) => v.visitorId === l.visitorId);
    if (!firstTouch) continue;
    const host = referrerHost(firstTouch.referrer);
    // First-touch channel; falls back to the referrer HOST of the first
    // PageView when the class map calls it "other" (UX §2.7 fallback).
    const cls = classifySource(firstTouch.referrer);
    const label = cls === "other" && host ? host : cls;
    channelCounts.set(label, (channelCounts.get(label) || 0) + 1);
  }
  const stitchedWithViews = [...channelCounts.values()].reduce((a, b) => a + b, 0);

  const scorecard: ScorecardSlot[] = [
    inFit >= SCORECARD_INFIT_GATE
      ? { id: "in-fit-inquiries", label: "In-fit inquiries", note: "trailing 90 days", unlocked: true, n: inFit }
      : {
          id: "in-fit-inquiries",
          label: "In-fit inquiries",
          note: "trailing 90 days",
          unlocked: false,
          gateCopy: `Unlocks at the first in-fit inquiry (fractional, project, or executive). ${inFit} so far.`,
          progress: inFit,
          target: SCORECARD_INFIT_GATE,
        },
    brandedImpr90 >= SCORECARD_BRANDED_GATE_IMPRESSIONS
      ? { id: "branded-clicks", label: "Branded search clicks", note: "trailing 90 days", unlocked: true, n: brandedClicks90 }
      : {
          id: "branded-clicks",
          label: "Branded search clicks",
          note: "trailing 90 days",
          unlocked: false,
          gateCopy: `Unlocks at ${SCORECARD_BRANDED_GATE_IMPRESSIONS} branded impressions in 90 days. ${brandedImpr90} so far.`,
          progress: brandedImpr90,
          target: SCORECARD_BRANDED_GATE_IMPRESSIONS,
        },
    stitchedWithViews >= SCORECARD_CHANNEL_GATE
      ? {
          id: "channel-mix",
          label: "First-touch channel of inquirers",
          note: "all leads with an attributable first touch",
          unlocked: true,
          mix: [...channelCounts.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n),
          mixDenominator: stitchedWithViews,
        }
      : {
          id: "channel-mix",
          label: "First-touch channel of inquirers",
          note: "all leads with an attributable first touch",
          unlocked: false,
          gateCopy: `Unlocks at the first lead with an attributable first touch. ${stitchedWithViews} so far.`,
          progress: stitchedWithViews,
          target: SCORECARD_CHANNEL_GATE,
        },
  ];

  // ---- Rule inputs (§6b) ---------------------------------------------------
  const slaLeads: SlaLeadRef[] = leads
    .filter((l) => l.status === "new" && l.createdAt < new Date(now.getTime() - RULE_LEAD_SLA_DAYS * DAY_MS))
    .map((l) => ({ id: l.id, days: Math.floor((now.getTime() - l.createdAt.getTime()) / DAY_MS) }));

  const unmatchedBookings = bookings.filter((b) => b.leadId === null).length;

  const gsc28 = gscQueries90.filter((q) => q.date >= since28);
  const gscPrior28 = gscQueries90.filter((q) => q.date >= since56 && q.date < since28);
  const costIntentImpressions28d = gsc28
    .filter((q) => q.intentBucket === "cost")
    .reduce((a, q) => a + q.impressions, 0);
  const gscDaily28 = gscDaily.filter((r) => r.date >= since28);
  const gscImpressions28d = gscDaily28.reduce((a, r) => a + r.impressions, 0);
  const visibleImpr28 = gsc28.reduce((a, q) => a + q.impressions, 0);
  const classifiableShare28d = gscImpressions28d > 0 ? visibleImpr28 / gscImpressions28d : null;

  const byPage = new Map<string, { impressions: number; clicks: number; posW: number }>();
  for (const q of gsc28) {
    const p = byPage.get(q.page) ?? { impressions: 0, clicks: 0, posW: 0 };
    p.impressions += q.impressions;
    p.clicks += q.clicks;
    p.posW += q.position * q.impressions;
    byPage.set(q.page, p);
  }
  const zeroClickPages: ZeroClickPage[] = [...byPage.entries()]
    .filter(([, p]) => p.impressions >= RULE_ZERO_CTR_MIN_IMPRESSIONS && p.clicks === 0)
    .map(([page, p]) => ({
      path: gscPagePath(page),
      impressions: p.impressions,
      avgPosition: p.impressions ? p.posW / p.impressions : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions);

  const durationCoverage =
    views.length >= RATE_MIN_DENOM
      ? views.filter((v) => v.duration !== null).length / views.length
      : null;

  // GSC ingest gaps: INTERIOR missing dates only (between the first and last
  // stored date inside the window) — the ~2-day lag and pre-connection days
  // are absence, not gaps.
  const gapDates: string[] = [];
  if (gscInWindow.length >= 2) {
    const have = new Set(gscInWindow.map((r) => gscDateKey(r.date)));
    const start = gscInWindow[0].date.getTime();
    const end = gscInWindow[gscInWindow.length - 1].date.getTime();
    for (let t = start + DAY_MS; t < end; t += DAY_MS) {
      const key = gscDateKey(new Date(t));
      if (!have.has(key)) gapDates.push(key);
    }
  }

  const leadVisitorIds = new Set(leads.map((l) => l.visitorId).filter((v): v is string => v !== null));
  const recentLeads: RecentLeadRef[] = leads
    .filter((l) => l.createdAt >= since7)
    .map((l) => {
      const stitched = l.visitorId !== null;
      const leadViews = stitched
        ? allViews.filter((v) => v.visitorId === l.visitorId && v.createdAt <= l.createdAt)
        : [];
      if (!leadViews.length) {
        // stitched && !attributed = visitorId exists but no visible views
        // (likely internal-excluded) — IR7 must NOT claim "no cookie" (B2).
        return {
          id: l.id,
          status: l.status,
          attributed: false,
          stitched,
          sourceClass: null,
          firstPath: null,
          pages: 0,
          visits: 0,
        };
      }
      const ft = leadViews[0];
      return {
        id: l.id,
        status: l.status,
        attributed: true,
        stitched,
        sourceClass: classifySource(ft.referrer),
        firstPath: ft.path,
        pages: new Set(leadViews.map((v) => v.path)).size,
        visits: new Set(leadViews.map((v) => nyDayKey(v.createdAt))).size,
      };
    });

  const views14 = winViews.filter((v) => v.createdAt >= since14);
  const byVisitor = new Map<string, { days: Set<string>; paths: { path: string; at: number }[] }>();
  for (const v of views14) {
    const rec = byVisitor.get(v.visitorId) ?? { days: new Set(), paths: [] };
    rec.days.add(nyDayKey(v.createdAt));
    rec.paths.push({ path: v.path, at: v.createdAt.getTime() });
    byVisitor.set(v.visitorId, rec);
  }
  const evaluators: EvaluatorRef[] = [...byVisitor.entries()]
    .filter(([id, rec]) => rec.days.size >= RULE_EVALUATOR_MIN_DAYS && !leadVisitorIds.has(id))
    .map(([id, rec]) => {
      const recent = [...rec.paths].sort((a, b) => b.at - a.at);
      const distinctPaths: string[] = [];
      for (const p of recent) {
        if (!distinctPaths.includes(p.path)) distinctPaths.push(p.path);
        if (distinctPaths.length === 2) break;
      }
      return { visitorId: id, days: rec.days.size, recentPaths: distinctPaths };
    });

  // F2 (data-analyst): IR10's "this week" is the trailing 7 NY days regardless
  // of the selected period — derive from the bounded fetch (like views14), not
  // the period slice, so a sub-7-day period can't silently redefine the rule.
  const views7 = winViews.filter((v) => v.createdAt >= since7);
  const byPath7 = new Map<string, { views: number; hosts: Map<string, number> }>();
  for (const v of views7) {
    const rec = byPath7.get(v.path) ?? { views: 0, hosts: new Map() };
    rec.views += 1;
    const host = referrerHost(v.referrer);
    if (host) rec.hosts.set(host, (rec.hosts.get(host) || 0) + 1);
    byPath7.set(v.path, rec);
  }
  const referrerSpikes: ReferrerSpike[] = [];
  for (const [path, rec] of byPath7) {
    if (rec.views < RULE_REFERRER_SPIKE_MIN_VIEWS) continue;
    let topHost: string | null = null;
    let topN = 0;
    for (const [host, n] of rec.hosts) {
      if (n > topN) {
        topHost = host;
        topN = n;
      }
    }
    if (topHost && topN / rec.views >= RULE_REFERRER_SPIKE_SHARE) {
      referrerSpikes.push({ path, views: rec.views, host: topHost, hostViews: topN });
    }
  }

  const brandedClicks28d = gsc28.filter((q) => q.isBranded).reduce((a, q) => a + q.clicks, 0);
  const brandedClicksPrior28d = gscPrior28.filter((q) => q.isBranded).reduce((a, q) => a + q.clicks, 0);

  const ruleInputs: IqRuleInputs = {
    window,
    slaLeads,
    unmatchedBookings,
    funnelPairs,
    costIntentImpressions28d,
    gscImpressions28d,
    classifiableShare28d,
    zeroClickPages,
    durationCoverage,
    gscGapDates: gapDates,
    recentLeads,
    evaluators,
    brandedClicks28d,
    brandedClicksPrior28d,
    referrerSpikes,
    firsts,
    recordWeek,
  };

  // Distinct classifier versions actually present in range (§4.5 honesty metadata).
  const classifierVersions = [...new Set(gscQueries90.map((q) => q.classifierVersion))].sort();

  return {
    meta: {
      metricsVersion: METRICS_VERSION,
      classifierVersions,
      internalExcluded: internal.length,
      mode: "live",
    },
    window,
    since: since.toISOString(),
    // Fix #6: null when compare is off — never echo priorSince=since as a fake anchor.
    priorSince: cmp ? cmp.since.toISOString() : null,
    // Factcheck W1 rules live in the ONE shared echo builder (PERIOD-UI wave).
    period: periodEcho(resolved),
    generatedAt: now.toISOString(),
    kpis,
    gscThrough,
    insights: evaluateRules(ruleInputs),
    ruleCount: IQ_RULE_REGISTRY.length,
    trend,
    funnel,
    scorecard,
    firsts,
    countingSince: firstView ? firstView.createdAt.toISOString() : null,
  };
}

// ---------------------------------------------------------------------------
// Wave 2 — landing teasers (WP2.2a)
// ---------------------------------------------------------------------------

const NY_WEEKDAY_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
});

async function liveLanding(filters: Filters, opts: SourceOpts): Promise<IqLanding> {
  const { window } = filters;
  const internal = opts.internalVisitorIds;
  const now = new Date();
  // PERIOD-UI wave: the landing scopes its teaser stats + header sub-line to
  // the resolved calendar period (MTD default). It computes NO comparison —
  // compareMode is forced "none" so the echo can never name a comparison this
  // surface does not render. Sparklines stay FIXED 14-day (self-labeled).
  const resolved = resolvePeriod({ ...filters, compareMode: "none" }, now);
  const { since, until } = resolved.period;
  const since14 = new Date(now.getTime() - 14 * DAY_MS);
  const fetchSince = since < since14 ? since : since14;
  // Lead fetch covers BOTH the 14d sparkline and the period sub-line count
  // (FC1: the sub-line names the period, so its leads number must match).
  const leadsFetchSince = fetchSince;

  const [views, leadsGrouped, latestLead, leadsRecent, gscDaily14, gscLatest, totpRow] =
    await Promise.all([
      prisma.pageView.findMany({
        where: { createdAt: { gte: fetchSince }, ...excludeInternal(internal) },
        select: { path: true, visitorId: true, country: true, createdAt: true },
        orderBy: { createdAt: "asc" },
        take: PAGEVIEW_ROW_CAP,
      }),
      prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.lead.findFirst({
        orderBy: { createdAt: "desc" },
        select: { status: true, createdAt: true }, // PII-free — no name, ever
      }),
      prisma.lead.findMany({
        where: { createdAt: { gte: leadsFetchSince } },
        select: { createdAt: true },
        take: LEAD_ROW_CAP,
      }),
      prisma.gscDaily.findMany({
        where: { date: { gte: since14 } },
        select: { date: true, clicks: true },
        orderBy: { date: "asc" },
        take: GSC_DAILY_ROW_CAP,
      }),
      prisma.gscDaily.findFirst({ orderBy: { date: "desc" }, select: { date: true } }),
      prisma.setting.findUnique({ where: { key: K_TOTP_SECRET }, select: { key: true } }),
    ]);

  const inWindow = views.filter((v) => v.createdAt >= since && v.createdAt < until);
  const visitors = new Set(inWindow.map((v) => v.visitorId)).size;
  const pageviews = inWindow.length;
  const leadsTotal = leadsGrouped.reduce((a, r) => a + r._count._all, 0);
  const newLeads = leadsGrouped.find((r) => r.status === "new")?._count._all ?? 0;
  // Teaser stat suffix — the compact to-date label ("MTD", "WTD", …); the
  // internal window fallback keeps its honest "Nd".
  const statLabel =
    resolved.kind === "window" ? `${window}d` : PERIOD_SHORT_LABEL[resolved.kind];

  // 14-day micro-sparklines (fixed length, NY days).
  const dayKeys = lastNDayKeys(14, now);
  const spark = (get: (key: string) => number) => dayKeys.map(get);
  const viewsByDay = new Map<string, { views: number; visitors: Set<string> }>();
  for (const v of views) {
    if (v.createdAt < since14) continue;
    const k = nyDayKey(v.createdAt);
    const rec = viewsByDay.get(k) ?? { views: 0, visitors: new Set() };
    rec.views += 1;
    rec.visitors.add(v.visitorId);
    viewsByDay.set(k, rec);
  }
  const leadsWindow = leadsRecent.filter((l) => l.createdAt >= since && l.createdAt < until).length;
  const leadsByDay = new Map<string, number>();
  for (const l of leadsRecent) {
    if (l.createdAt < since14) continue; // sparkline stays fixed at 14 days
    const k = nyDayKey(l.createdAt);
    leadsByDay.set(k, (leadsByDay.get(k) || 0) + 1);
  }
  const gscByDay = new Map<string, number>();
  for (const r of gscDaily14) gscByDay.set(gscDateKey(r.date), r.clicks);

  const lastView = views[views.length - 1];
  const gscThrough = gscLatest ? gscDateKey(gscLatest.date) : null;
  const gscClicks14 = gscDaily14.reduce((a, r) => a + r.clicks, 0);

  const pagesViewed = new Set(inWindow.map((v) => v.path)).size;
  const topPath = (() => {
    const counts = new Map<string, number>();
    for (const v of inWindow) counts.set(v.path, (counts.get(v.path) || 0) + 1);
    let best: string | null = null;
    let n = 0;
    for (const [p, c] of counts) {
      if (c > n) {
        best = p;
        n = c;
      }
    }
    return best;
  })();

  const teasers: ModuleTeaser[] = [
    {
      module: "overview",
      stat: `${visitors} visitor${visitors === 1 ? "" : "s"} · ${statLabel}`,
      spark: spark((k) => viewsByDay.get(k)?.visitors.size ?? 0),
      latest: lastView ? `Latest: ${lastView.path} · ${NY_WEEKDAY_FMT.format(lastView.createdAt)}` : null,
    },
    {
      module: "traffic",
      stat: `${pageviews} pageview${pageviews === 1 ? "" : "s"} · ${statLabel}`,
      spark: spark((k) => viewsByDay.get(k)?.views ?? 0),
      latest: lastView
        ? lastView.country
          ? `Latest: visitor from ${lastView.country} · ${NY_WEEKDAY_FMT.format(lastView.createdAt)}`
          : `Latest: visitor · ${NY_WEEKDAY_FMT.format(lastView.createdAt)}`
        : null,
    },
    {
      module: "search",
      stat: gscThrough ? `${gscClicks14} click${gscClicks14 === 1 ? "" : "s"} · 14d` : "no GSC data yet",
      spark: spark((k) => gscByDay.get(k) ?? 0),
      latest: gscThrough ? `Latest: data through ${gscThrough}` : null,
    },
    {
      module: "leads",
      stat: `${leadsTotal} lead${leadsTotal === 1 ? "" : "s"} · ${newLeads} new`,
      spark: spark((k) => leadsByDay.get(k) ?? 0),
      latest: latestLead
        ? `Latest: lead (${latestLead.status.replace("_", " ")}) · ${latestLead.createdAt.toISOString().slice(0, 10)}`
        : null,
    },
    {
      module: "content",
      stat: `${pagesViewed} page${pagesViewed === 1 ? "" : "s"} viewed · ${statLabel}`,
      spark: spark((k) => viewsByDay.get(k)?.views ?? 0),
      latest: topPath ? `Top page: ${topPath}` : null,
    },
    {
      module: "security",
      // Count label canon (manager R2 ruling): everywhere a COUNT renders it
      // reads "internal visitor(s) excluded"; "browser" stays the word for the
      // ACTION surfaces on /admin/security (FC6).
      stat: `2FA ${totpRow ? "on" : "off"} · ${internal.length} internal visitor${internal.length === 1 ? "" : "s"} excluded`,
      spark: [],
      latest: null,
    },
  ];

  return {
    meta: {
      metricsVersion: METRICS_VERSION,
      classifierVersions: [],
      internalExcluded: internal.length,
      mode: "live",
    },
    window,
    period: periodEcho(resolved),
    since: since.toISOString(),
    visitors,
    pageviews,
    leadsWindow,
    leadsTotal,
    teasers,
  };
}

async function liveLeadsByStatus(): Promise<LeadStatusCount[]> {
  const grouped = await prisma.lead.groupBy({ by: ["status"], _count: { _all: true } });
  return LEAD_STATUS_ORDER_LIST.map((status) => ({
    status,
    n: grouped.find((r) => r.status === status)?._count._all || 0,
  }));
}

// ---------------------------------------------------------------------------
// Wave 2 Build B — module payloads (WP2.4 Traffic / WP2.5 Content / WP2.6
// Search) + the leads donut groupBy. Same discipline as above: windowed
// queries, row caps, exclusion threading, ISO strings on the wire, no PII.
// ---------------------------------------------------------------------------

/** The breakdown fallback label — also the chips' "match null" sentinel. */
const UNKNOWN_LABEL = "(unknown)";

/** Chip matcher: the "(unknown)" chip matches rows whose dimension is null/empty. */
function dimMatches(value: string | null, want: string): boolean {
  return want === UNKNOWN_LABEL ? !value : value === want;
}

function durationStat(views: { duration: number | null }[]): DurationStat {
  const reported = views.filter((v) => v.duration !== null);
  if (!reported.length) return { avgSeconds: null, reported: 0, total: views.length };
  // Per-view display cap (B1): one parked tab must not swamp a small window's
  // average. The 6h write-time clamp stays untouched; this is read-side only.
  const sum = reported.reduce((a, v) => a + Math.min(v.duration ?? 0, DURATION_DISPLAY_CAP_S), 0);
  return {
    avgSeconds: Math.round(sum / reported.length),
    reported: reported.length,
    total: views.length,
  };
}

function liveMeta(internalExcluded: number, classifierVersions: string[] = []): IqMeta {
  return { metricsVersion: METRICS_VERSION, classifierVersions, internalExcluded, mode: "live" };
}

type TrafficViewRow = {
  path: string;
  visitorId: string;
  referrer: string | null;
  device: string | null;
  country: string | null;
  duration: number | null;
  createdAt: Date;
};

async function liveTraffic(filters: Filters, opts: SourceOpts): Promise<IqTraffic> {
  const { window } = filters;
  const internal = opts.internalVisitorIds;
  const now = new Date();
  // PERIOD-UI wave: the resolved calendar period (MTD default) + its honest
  // comparison drive the whole surface. ONE fetch BOUNDED to
  // [min(cmp.since, since), until) covers both slices (Correction-A pattern —
  // never an all-time scan for windowed numbers).
  const resolved = resolvePeriod(filters, now);
  const { since, until } = resolved.period;
  const cmp = resolved.comparison;
  const fetchSince = cmp && cmp.since < since ? cmp.since : since;

  const [fetchedViews, firstView] = await Promise.all([
    prisma.pageView.findMany({
      where: { createdAt: { gte: fetchSince, lt: until }, ...excludeInternal(internal) },
      select: {
        path: true,
        visitorId: true,
        referrer: true,
        device: true,
        country: true,
        duration: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
      take: PAGEVIEW_ROW_CAP,
    }),
    prisma.pageView.findFirst({
      where: excludeInternal(internal),
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  // Period slices (half-open [lo, hi) — cmp.until === since in prior mode, so
  // no seam gap/overlap).
  const inRange = (t: Date, lo: Date, hi: Date) => t >= lo && t < hi;
  const allViews = fetchedViews.filter((v) => inRange(v.createdAt, since, until));
  const priorAllViews = cmp
    ? fetchedViews.filter((v) => inRange(v.createdAt, cmp.since, cmp.until))
    : [];

  // First-touch source class per visitor — computed on the UNCUT window
  // (DATA §2: sourceClass cuts visitors by their first windowed pageview).
  const firstTouchClass = new Map<string, SourceClass>();
  for (const v of allViews) {
    if (!firstTouchClass.has(v.visitorId)) firstTouchClass.set(v.visitorId, classifySource(v.referrer));
  }
  const visitorsUnfiltered = firstTouchClass.size;

  // Chip options from the UNCUT window so applying one chip never hides the rest.
  const sourceVisitorCounts = new Map<string, number>();
  for (const cls of firstTouchClass.values()) {
    sourceVisitorCounts.set(cls, (sourceVisitorCounts.get(cls) || 0) + 1);
  }
  const chipOptions: ChipOptions = {
    devices: topCounts(allViews.map((v) => v.device), UNKNOWN_LABEL),
    countries: topCounts(allViews.map((v) => v.country), UNKNOWN_LABEL),
    sources: [...sourceVisitorCounts.entries()]
      .map(([label, n]) => ({ label, n }))
      .sort((a, b) => b.n - a.n),
  };

  const applied: AppliedCuts = {
    device: filters.device ?? null,
    country: filters.country ?? null,
    sourceClass: filters.sourceClass ?? null,
  };
  const hasCuts = Boolean(applied.device || applied.country || applied.sourceClass);
  const views: TrafficViewRow[] = hasCuts
    ? allViews.filter((v) => {
        if (applied.device && !dimMatches(v.device, applied.device)) return false;
        if (applied.country && !dimMatches(v.country, applied.country)) return false;
        if (applied.sourceClass && firstTouchClass.get(v.visitorId) !== applied.sourceClass) return false;
        return true;
      })
    : allViews;

  // Prior slice with the SAME cut applied (like-for-like: a comparison under a
  // cut must compare the cut population, never the uncut one). The sourceClass
  // cut keys on FIRST TOUCH WITHIN THE SLICE, so the prior slice gets its own
  // first-touch map — same definition, prior span.
  const priorFirstTouch = new Map<string, SourceClass>();
  for (const v of priorAllViews) {
    if (!priorFirstTouch.has(v.visitorId)) priorFirstTouch.set(v.visitorId, classifySource(v.referrer));
  }
  const priorViews: TrafficViewRow[] = hasCuts
    ? priorAllViews.filter((v) => {
        if (applied.device && !dimMatches(v.device, applied.device)) return false;
        if (applied.country && !dimMatches(v.country, applied.country)) return false;
        if (applied.sourceClass && priorFirstTouch.get(v.visitorId) !== applied.sourceClass) return false;
        return true;
      })
    : priorAllViews;

  // KPIs (post-cut) — same definitions on both slices.
  const kpiCounts = (rows: TrafficViewRow[]) => {
    const daysByVisitor = new Map<string, Set<string>>();
    for (const v of rows) {
      const set = daysByVisitor.get(v.visitorId) ?? new Set<string>();
      set.add(nyDayKey(v.createdAt));
      daysByVisitor.set(v.visitorId, set);
    }
    return {
      visitors: daysByVisitor.size,
      // B1 — pageviews on >= 2 distinct NY calendar days in the period.
      returnVisitors: [...daysByVisitor.values()].filter((s) => s.size >= 2).length,
    };
  };
  const cur = kpiCounts(views);
  const pri = kpiCounts(priorViews);
  const visitors = cur.visitors;
  const returnVisitors = cur.returnVisitors;

  // Honest four-state comparisons (the delta contract — cards read these,
  // never re-derive). "new" guard: the whole prior slice predates first data.
  const siteStart = firstView?.createdAt ?? null;
  const priorPredates =
    cmp !== null && (siteStart === null || cmp.until.getTime() <= siteStart.getTime());
  const cmpOf = (n: number, prior: number) =>
    buildPeriodComparison(n, prior, cmp, { priorPredatesData: priorPredates });
  const comparisons = {
    visitors: cmpOf(visitors, pri.visitors),
    pageviews: cmpOf(views.length, priorViews.length),
    returnVisitors: cmpOf(returnVisitors, pri.returnVisitors),
  };

  // Trend: visitors per bucket, zero-filled. F1 tripwire: calendar/custom
  // periods ride the RESOLVED granularity (bucketKeyFor + periodBucketKeys);
  // the internal window fallback keeps the legacy pair.
  const isWindowKind = resolved.kind === "window";
  const trendKeyOf = (d: Date) =>
    isWindowKind ? bucketKey(d, window) : bucketKeyFor(d, resolved.granularity);
  const visitorsByBucket = new Map<string, Set<string>>();
  for (const v of views) {
    const k = trendKeyOf(v.createdAt);
    if (!visitorsByBucket.has(k)) visitorsByBucket.set(k, new Set());
    visitorsByBucket.get(k)!.add(v.visitorId);
  }
  const axisKeys = isWindowKind
    ? windowBucketKeys(window, now)
    : periodBucketKeys(since, until, resolved.granularity);
  const trend: SeriesPoint[] = axisKeys.map((key) => ({
    key,
    n: visitorsByBucket.get(key)?.size || 0,
  }));

  // Visitor log — last ~20 journeys, most recent first. Behavior only; the
  // short id is a truncated anonymous analytics id (no PII by construction).
  const journeysByVisitor = new Map<string, TrafficViewRow[]>();
  for (const v of views) {
    const list = journeysByVisitor.get(v.visitorId) ?? [];
    list.push(v);
    journeysByVisitor.set(v.visitorId, list);
  }
  const visitorLog: VisitorLogRow[] = [...journeysByVisitor.entries()]
    .map(([id, vs]) => ({ id, vs, last: vs[vs.length - 1].createdAt.getTime() }))
    .sort((a, b) => b.last - a.last)
    .slice(0, VISITOR_LOG_ROWS)
    .map(({ id, vs }) => {
      const reported = vs.filter((v) => v.duration !== null);
      return {
        visitorId: id,
        shortId: id.slice(0, 8),
        device: vs[0].device,
        country: vs[0].country,
        paths: vs.slice(0, VISITOR_LOG_PATHS_MAX).map((v) => v.path),
        morePaths: Math.max(0, vs.length - VISITOR_LOG_PATHS_MAX),
        views: vs.length,
        // Same per-view display cap as durationStat (B1) — journey totals and
        // averages must agree on what one view can contribute.
        totalSeconds: reported.reduce((a, v) => a + Math.min(v.duration ?? 0, DURATION_DISPLAY_CAP_S), 0),
        reported: reported.length,
      };
    });

  return {
    meta: liveMeta(internal.length),
    window,
    period: periodEcho(resolved),
    comparisons,
    since: since.toISOString(),
    countingSince: firstView ? firstView.createdAt.toISOString() : null,
    applied,
    visitors,
    visitorsUnfiltered,
    pageviews: views.length,
    returnVisitors,
    avgDuration: durationStat(views),
    trend,
    devices: topCounts(views.map((v) => v.device), UNKNOWN_LABEL),
    countries: topCounts(views.map((v) => v.country), UNKNOWN_LABEL),
    referrers: topCounts(views.map((v) => referrerLabel(v.referrer)), "(direct)"),
    chipOptions,
    visitorLog,
  };
}

async function liveContent(filters: Filters, opts: SourceOpts): Promise<IqContent> {
  const { window } = filters;
  const internal = opts.internalVisitorIds;
  const now = new Date();
  // PERIOD-UI wave: resolved calendar period (MTD default) + honest head-count
  // comparisons. Views fetch is BOUNDED to [min(cmp.since, since), until)
  // (Correction-A); events stay current-period (they feed pillar engagement
  // only — no event comparison renders).
  const resolved = resolvePeriod(filters, now);
  const { since, until } = resolved.period;
  const cmp = resolved.comparison;
  const fetchSince = cmp && cmp.since < since ? cmp.since : since;

  const [fetchedViews, allEvents, firstView, firstInsightsView] = await Promise.all([
    prisma.pageView.findMany({
      where: { createdAt: { gte: fetchSince, lt: until }, ...excludeInternal(internal) },
      select: {
        path: true,
        visitorId: true,
        device: true,
        country: true,
        duration: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
      take: PAGEVIEW_ROW_CAP,
    }),
    prisma.event.findMany({
      where: { createdAt: { gte: since, lt: until }, ...excludeInternalNullable(internal) },
      select: { path: true, visitorId: true },
      take: EVENT_ROW_CAP,
    }),
    prisma.pageView.findFirst({
      where: excludeInternal(internal),
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.pageView.findFirst({
      where: { path: { startsWith: "/insights" }, ...excludeInternal(internal) },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  // Period slices (half-open; cmp.until === since in prior mode — no overlap).
  const inRange = (t: Date, lo: Date, hi: Date) => t >= lo && t < hi;
  const allViews = fetchedViews.filter((v) => inRange(v.createdAt, since, until));
  const priorAllViews = cmp
    ? fetchedViews.filter((v) => inRange(v.createdAt, cmp.since, cmp.until))
    : [];

  const visitorsUnfiltered = new Set(allViews.map((v) => v.visitorId)).size;
  const chipOptions: ChipOptions = {
    devices: topCounts(allViews.map((v) => v.device), UNKNOWN_LABEL),
    countries: topCounts(allViews.map((v) => v.country), UNKNOWN_LABEL),
    sources: [], // Content chips are device/country only (module scope ruling)
  };

  const applied: AppliedCuts = {
    device: filters.device ?? null,
    country: filters.country ?? null,
    sourceClass: null,
  };
  const hasCuts = Boolean(applied.device || applied.country);
  const cutViews = (rows: typeof allViews) =>
    hasCuts
      ? rows.filter((v) => {
          if (applied.device && !dimMatches(v.device, applied.device)) return false;
          if (applied.country && !dimMatches(v.country, applied.country)) return false;
          return true;
        })
      : rows;
  const views = cutViews(allViews);
  // Prior slice with the SAME cut (like-for-like comparison under a cut).
  const priorViews = cutViews(priorAllViews);
  const cohort = hasCuts ? new Set(views.map((v) => v.visitorId)) : null;
  const events = cohort
    ? allEvents.filter((e) => e.visitorId !== null && cohort.has(e.visitorId))
    : allEvents;

  // Entrances: the first pageview of each visitor-day marks an entrance on its
  // path (views are already ordered ascending).
  const seenVisitorDays = new Set<string>();
  const entrancesByPath = new Map<string, number>();
  for (const v of views) {
    const key = `${v.visitorId}|${nyDayKey(v.createdAt)}`;
    if (seenVisitorDays.has(key)) continue;
    seenVisitorDays.add(key);
    entrancesByPath.set(v.path, (entrancesByPath.get(v.path) || 0) + 1);
  }

  const byPath = new Map<string, { views: typeof views; visitors: Set<string> }>();
  for (const v of views) {
    const rec = byPath.get(v.path) ?? { views: [], visitors: new Set<string>() };
    rec.views.push(v);
    rec.visitors.add(v.visitorId);
    byPath.set(v.path, rec);
  }
  const pages: ContentPageRow[] = [...byPath.entries()]
    .map(([path, rec]) => ({
      path,
      views: rec.views.length,
      visitors: rec.visitors.size,
      avgDuration: durationStat(rec.views),
      entrances: entrancesByPath.get(path) || 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, CONTENT_PAGES_MAX);
  // Truncation honesty (api A2): paths beyond the cap are SAID, not vanished.
  const pagesOmitted = Math.max(0, byPath.size - CONTENT_PAGES_MAX);

  // Pillar rollup (B13): the four /insights/<slug> pillars + the index itself.
  const scopes: { slug: string; label: string; match: (p: string) => boolean }[] = [
    { slug: "index", label: "Insights index", match: (p) => p === "/insights" },
    ...pillars.map((pl) => ({
      slug: pl.slug,
      label: pl.label,
      match: (p: string) => p === `/insights/${pl.slug}` || p.startsWith(`/insights/${pl.slug}/`),
    })),
  ];
  const pillarRows: PillarRow[] = scopes.map((scope) => {
    const scopeViews = views.filter((v) => scope.match(v.path));
    const byVisitor = new Map<string, { n: number; engagedDuration: boolean }>();
    for (const v of scopeViews) {
      const rec = byVisitor.get(v.visitorId) ?? { n: 0, engagedDuration: false };
      rec.n += 1;
      if ((v.duration ?? 0) >= ENGAGED_MIN_DURATION_S) rec.engagedDuration = true;
      byVisitor.set(v.visitorId, rec);
    }
    const eventVisitors = new Set(
      events.filter((e) => e.visitorId !== null && scope.match(e.path)).map((e) => e.visitorId)
    );
    // B2 adapted to the pillar scope: engaged = duration >= 10s on a pillar
    // page OR >= 2 pillar pageviews OR any event on a pillar page.
    let engaged = 0;
    for (const [id, rec] of byVisitor) {
      if (rec.engagedDuration || rec.n >= 2 || eventVisitors.has(id)) engaged += 1;
    }
    return {
      slug: scope.slug,
      label: scope.label,
      views: scopeViews.length,
      visitors: byVisitor.size,
      engaged,
    };
  });

  // Honest four-state comparisons for the head counts (post-cut).
  const siteStart = firstView?.createdAt ?? null;
  const priorPredates =
    cmp !== null && (siteStart === null || cmp.until.getTime() <= siteStart.getTime());
  const comparisons = {
    visitors: buildPeriodComparison(
      new Set(views.map((v) => v.visitorId)).size,
      new Set(priorViews.map((v) => v.visitorId)).size,
      cmp,
      { priorPredatesData: priorPredates }
    ),
    pageviews: buildPeriodComparison(views.length, priorViews.length, cmp, {
      priorPredatesData: priorPredates,
    }),
  };

  return {
    meta: liveMeta(internal.length),
    window,
    period: periodEcho(resolved),
    comparisons,
    since: since.toISOString(),
    countingSince: firstView ? firstView.createdAt.toISOString() : null,
    applied,
    visitors: new Set(views.map((v) => v.visitorId)).size,
    visitorsUnfiltered,
    pageviews: views.length,
    pages,
    pagesOmitted,
    pillars: pillarRows,
    insightsCountingSince: firstInsightsView ? firstInsightsView.createdAt.toISOString() : null,
    chipOptions,
  };
}

async function liveSearch(filters: Filters, opts: SourceOpts): Promise<IqSearch> {
  const { window } = filters;
  const internal = opts.internalVisitorIds; // footer honesty only — GSC is its own population
  const now = new Date();
  // PERIOD-UI wave: the resolved calendar period (MTD default) drives the GSC
  // window. M2 pattern (database condition 2): GscDaily/GscQuery are @db.Date
  // (midnight UTC) while calendar boundaries are NY instants — slicing by
  // INSTANT drops the period's first GSC day. Under calendar/custom kinds we
  // slice by CALENDAR-DAY KEYS instead (custom uses the PICKED day strings —
  // timezone-free, so resolveGscPeriod stays the drills' only "utc" site; the
  // resolvePeriod NY default is correct here). The internal window fallback
  // keeps the legacy instant filter, byte-identical to shipped.
  const resolved = resolvePeriod(filters, now);
  const { since, until } = resolved.period;
  const cmp = resolved.comparison;
  const isWindowKind = resolved.kind === "window";
  const fromKey = resolved.range ? resolved.range.from : dayBucketKey(since);
  const toKey = resolved.range
    ? resolved.range.to
    : dayBucketKey(new Date(until.getTime() - 1)); // until is exclusive
  const cmpFromKey = cmp ? dayBucketKey(cmp.since) : null;
  const cmpToKey = cmp ? dayBucketKey(new Date(cmp.until.getTime() - 1)) : null;
  const keyDate = (k: string) => new Date(`${k}T00:00:00Z`); // stored dates ARE UTC midnights
  // Daily totals are fetched over the UNION span (current + prior) so the
  // property-total comparison can compute; queries/countries stay current-only.
  const dailyFetchGte = isWindowKind
    ? (cmp && cmp.since < since ? cmp.since : since)
    : keyDate(cmpFromKey && cmpFromKey < fromKey ? cmpFromKey : fromKey);
  const currentDateWhere = isWindowKind
    ? { gte: since }
    : { gte: keyDate(fromKey), lte: keyDate(toKey) };

  const [dailyFetched, queriesInWindow, countryRows, firstDaily, latestDaily] = await Promise.all([
    prisma.gscDaily.findMany({
      where: { date: isWindowKind ? { gte: dailyFetchGte } : { gte: dailyFetchGte, lte: keyDate(toKey) } },
      select: { date: true, impressions: true, clicks: true },
      orderBy: { date: "asc" },
      take: GSC_DAILY_ROW_CAP,
    }),
    prisma.gscQuery.findMany({
      where: { date: currentDateWhere },
      select: {
        date: true,
        query: true,
        impressions: true,
        clicks: true,
        position: true,
        isBranded: true,
        brandedAmbiguous: true,
        intentBucket: true,
        classifierVersion: true,
      },
      take: GSC_QUERY_ROW_CAP,
    }),
    prisma.gscCountryDaily.findMany({
      where: { date: currentDateWhere },
      select: { country: true, impressions: true, clicks: true },
      take: GSC_COUNTRY_ROW_CAP,
    }),
    prisma.gscDaily.findFirst({ orderBy: { date: "asc" }, select: { date: true } }),
    prisma.gscDaily.findFirst({ orderBy: { date: "desc" }, select: { date: true } }),
  ]);

  // Current + prior daily slices. Calendar/custom slice by day KEYS; the
  // window fallback keeps legacy instant comparison for the current slice.
  const keyOfRow = (d: Date) => gscDateKey(d);
  const dailyInWindow = isWindowKind
    ? dailyFetched.filter((r) => r.date >= since)
    : dailyFetched.filter((r) => keyOfRow(r.date) >= fromKey && keyOfRow(r.date) <= toKey);
  const dailyInPrior = !cmp
    ? []
    : isWindowKind
      ? dailyFetched.filter((r) => r.date >= cmp.since && r.date < cmp.until)
      : dailyFetched.filter(
          (r) => keyOfRow(r.date) >= (cmpFromKey as string) && keyOfRow(r.date) <= (cmpToKey as string)
        );

  const impressions = dailyInWindow.reduce((a, r) => a + r.impressions, 0);
  const clicks = dailyInWindow.reduce((a, r) => a + r.clicks, 0);
  const visibleImpressions = queriesInWindow.reduce((a, q) => a + q.impressions, 0);
  const visibleClicks = queriesInWindow.reduce((a, q) => a + q.clicks, 0);
  const brandedClicks = queriesInWindow.filter((q) => q.isBranded).reduce((a, q) => a + q.clicks, 0);
  const brandedAmbiguousClicks = queriesInWindow
    .filter((q) => q.brandedAmbiguous)
    .reduce((a, q) => a + q.clicks, 0);

  // Trend — charted by the STORED GSC date (gscDateKey), never re-bucketed
  // (DATA §2). Zero-filled across the stored-date span inside the window.
  // Branded = isBranded rows; non-branded = neither branded nor ambiguous
  // (ambiguous is reported separately, never folded into either line).
  const brandedByDate = new Map<string, { branded: number; nonBranded: number }>();
  for (const q of queriesInWindow) {
    const key = gscDateKey(q.date);
    const rec = brandedByDate.get(key) ?? { branded: 0, nonBranded: 0 };
    if (q.isBranded) rec.branded += q.clicks;
    else if (!q.brandedAmbiguous) rec.nonBranded += q.clicks;
    brandedByDate.set(key, rec);
  }
  const trend: GscTrendPoint[] = [];
  if (dailyInWindow.length) {
    const start = dailyInWindow[0].date.getTime();
    const end = dailyInWindow[dailyInWindow.length - 1].date.getTime();
    for (let t = start; t <= end; t += DAY_MS) {
      const key = gscDateKey(new Date(t));
      const rec = brandedByDate.get(key);
      trend.push({ date: key, branded: rec?.branded ?? 0, nonBranded: rec?.nonBranded ?? 0 });
    }
  }

  // Intent buckets (B14) — counts; sub-threshold buckets roll into one line,
  // counted in totals, never hidden (UX §3.5 suppression rule).
  const byBucket = new Map<string, { impressions: number; clicks: number }>();
  for (const q of queriesInWindow) {
    if (!q.intentBucket) continue;
    const rec = byBucket.get(q.intentBucket) ?? { impressions: 0, clicks: 0 };
    rec.impressions += q.impressions;
    rec.clicks += q.clicks;
    byBucket.set(q.intentBucket, rec);
  }
  const bucketRows = [...byBucket.entries()]
    .map(([bucket, r]) => ({ bucket, ...r }))
    .sort((a, b) => b.impressions - a.impressions);
  const intents: IntentBucketRow[] = bucketRows.filter((r) => r.impressions >= GSC_MIN_IMPRESSIONS);
  const intentsBelow = bucketRows.filter((r) => r.impressions < GSC_MIN_IMPRESSIONS);
  const intentsBelowThreshold: BelowThresholdRollup | null = intentsBelow.length
    ? {
        rows: intentsBelow.length,
        impressions: intentsBelow.reduce((a, r) => a + r.impressions, 0),
        clicks: intentsBelow.reduce((a, r) => a + r.clicks, 0),
      }
    : null;

  // Queries table — aggregated per query across the window; rows below
  // GSC_MIN_IMPRESSIONS roll into ONE "below threshold" line.
  type QueryAgg = {
    impressions: number;
    clicks: number;
    posW: number;
    isBranded: boolean;
    brandedAmbiguous: boolean;
    intentBucket: string | null;
  };
  const byQuery = new Map<string, QueryAgg>();
  for (const q of queriesInWindow) {
    const rec: QueryAgg = byQuery.get(q.query) ?? {
      impressions: 0,
      clicks: 0,
      posW: 0,
      isBranded: false,
      brandedAmbiguous: false,
      intentBucket: null,
    };
    rec.impressions += q.impressions;
    rec.clicks += q.clicks;
    rec.posW += q.position * q.impressions;
    rec.isBranded = rec.isBranded || q.isBranded;
    rec.brandedAmbiguous = rec.brandedAmbiguous || q.brandedAmbiguous;
    rec.intentBucket = rec.intentBucket ?? q.intentBucket;
    byQuery.set(q.query, rec);
  }
  const queryRows = [...byQuery.entries()]
    .map(([query, r]) => ({
      query,
      clicks: r.clicks,
      impressions: r.impressions,
      position: r.impressions ? r.posW / r.impressions : 0,
      isBranded: r.isBranded,
      brandedAmbiguous: r.brandedAmbiguous,
      intentBucket: r.intentBucket,
    }))
    .sort((a, b) => b.impressions - a.impressions);
  const queriesAbove = queryRows.filter((r) => r.impressions >= GSC_MIN_IMPRESSIONS);
  const queries: GscQueryRow[] = queriesAbove.slice(0, GSC_QUERY_ROWS_MAX);
  const queriesBelow = queryRows.filter((r) => r.impressions < GSC_MIN_IMPRESSIONS);
  const queriesBelowThreshold: BelowThresholdRollup | null = queriesBelow.length
    ? {
        rows: queriesBelow.length,
        impressions: queriesBelow.reduce((a, r) => a + r.impressions, 0),
        clicks: queriesBelow.reduce((a, r) => a + r.clicks, 0),
      }
    : null;
  // Truncation honesty (api A2): ABOVE-threshold rows sliced off past the row
  // cap were silently vanishing — roll them up like the below-threshold line.
  const queriesOver = queriesAbove.slice(GSC_QUERY_ROWS_MAX);
  const queriesBeyondCap: BelowThresholdRollup | null = queriesOver.length
    ? {
        rows: queriesOver.length,
        impressions: queriesOver.reduce((a, r) => a + r.impressions, 0),
        clicks: queriesOver.reduce((a, r) => a + r.clicks, 0),
      }
    : null;

  // Countries — GscCountryDaily is GSC's OWN dimension (never applied to site metrics).
  const byCountry = new Map<string, { impressions: number; clicks: number }>();
  for (const r of countryRows) {
    const rec = byCountry.get(r.country) ?? { impressions: 0, clicks: 0 };
    rec.impressions += r.impressions;
    rec.clicks += r.clicks;
    byCountry.set(r.country, rec);
  }
  const countryRowsSorted = [...byCountry.entries()]
    .map(([country, r]) => ({ country, ...r }))
    .sort((a, b) => b.impressions - a.impressions);
  const countries: GscCountryRow[] = countryRowsSorted.slice(0, GSC_COUNTRY_ROWS_MAX);
  // Truncation honesty (api A2) — hittable TODAY at 12 visible country rows.
  const countriesOver = countryRowsSorted.slice(GSC_COUNTRY_ROWS_MAX);
  const countriesBeyondCap: BelowThresholdRollup | null = countriesOver.length
    ? {
        rows: countriesOver.length,
        impressions: countriesOver.reduce((a, r) => a + r.impressions, 0),
        clicks: countriesOver.reduce((a, r) => a + r.clicks, 0),
      }
    : null;

  const classifierVersions = [...new Set(queriesInWindow.map((q) => q.classifierVersion))].sort();

  // Honest four-state comparisons for the property totals (GscDaily). "new"
  // guard: the whole prior slice predates the first stored GSC day.
  const gscStart = firstDaily?.date ?? null;
  const priorPredates =
    cmp !== null && (gscStart === null || cmp.until.getTime() <= gscStart.getTime());
  const comparisons = {
    impressions: buildPeriodComparison(
      impressions,
      dailyInPrior.reduce((a, r) => a + r.impressions, 0),
      cmp,
      { priorPredatesData: priorPredates }
    ),
    clicks: buildPeriodComparison(
      clicks,
      dailyInPrior.reduce((a, r) => a + r.clicks, 0),
      cmp,
      { priorPredatesData: priorPredates }
    ),
  };

  return {
    meta: liveMeta(internal.length, classifierVersions),
    window,
    period: periodEcho(resolved),
    comparisons,
    gscSince: firstDaily ? gscDateKey(firstDaily.date) : null,
    gscThrough: latestDaily ? gscDateKey(latestDaily.date) : null,
    impressions,
    clicks,
    brandedClicks,
    brandedAmbiguousClicks,
    visibleImpressions,
    visibleClicks,
    trend,
    intents,
    intentsBelowThreshold,
    queries,
    queriesBelowThreshold,
    queriesBeyondCap,
    countries,
    countriesBeyondCap,
  };
}

async function liveLeadsByInquiryType(): Promise<BreakdownRow[]> {
  // Counts ONLY — the donut payload never carries a lead name (PII firewall).
  const grouped = await prisma.lead.groupBy({ by: ["inquiryType"], _count: { _all: true } });
  const counts = new Map<string, number>();
  let other = 0;
  for (const g of grouped) {
    if (INQUIRY_TYPE_VALUES.includes(g.inquiryType)) {
      counts.set(g.inquiryType, (counts.get(g.inquiryType) || 0) + g._count._all);
    } else {
      other += g._count._all;
    }
  }
  // The four stored form values always render (zeros stay visible — honest);
  // the residue slice appears only when something actually falls into it.
  const rows: BreakdownRow[] = INQUIRY_TYPE_VALUES.map((label) => ({
    label,
    n: counts.get(label) || 0,
  }));
  if (other > 0) rows.push({ label: INQUIRY_TYPE_OTHER_LABEL, n: other });
  return rows;
}

// ---------------------------------------------------------------------------
// Wave 3 — drill methods (WP3.2 KPI / WP3.3 Page / WP3.4 Journey / WP3.9
// Activity). Same discipline: windowed + row-capped queries, exclusion threaded
// through SourceOpts, ISO strings on the wire, PII-free by type construction
// (visitorId is carried; lead surfaces only as hasLead + leadId).
// ---------------------------------------------------------------------------

/** Prior-window DAILY NY keys (the `window` days immediately before today's window). */
function priorDayKeys(window: Filters["window"], now: Date): string[] {
  return lastNDayKeys(2 * window, now).slice(0, window);
}

/** Per-view display cap (B1) — one parked tab never swamps a total. */
function cappedDuration(d: number | null | undefined): number {
  return Math.min(d ?? 0, DURATION_DISPLAY_CAP_S);
}

/** Event.meta → "key: value" TEXT chips (never HTML; PII-free by capture rule). */
function metaToChips(meta: unknown): string[] {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return [];
  return Object.entries(meta as Record<string, unknown>).map(([k, v]) => `${k}: ${String(v)}`);
}

function seriesFrom(map: Map<string, number>, keys: string[]): KpiSeriesPoint[] {
  return keys.map((date) => ({ date, n: map.get(date) ?? 0 }));
}

const KPI_DEFINITIONS: Record<CommandKpiId, { label: string; definition: string }> = {
  visitors: {
    label: "Visitors",
    definition:
      "Distinct visitor ids with a pageview that NY calendar day. Internal traffic excluded.",
  },
  pageviews: {
    label: "Pageviews",
    definition: "Pageviews that day. Internal traffic excluded.",
  },
  "search-clicks": {
    label: "Search clicks",
    definition:
      "Google Search Console property-level clicks, by GSC's stored date. GSC data lags about 2 days.",
  },
  briefs: {
    label: "Briefs",
    definition: "Server-recorded contact-form submissions (form_submit). The trusted win.",
  },
  bookings: {
    label: "Bookings",
    definition: "Calendly bookings captured that day, by capture time, not meeting time.",
  },
  subscribers: { label: "Subscribers", definition: "New subscriber rows that day." },
};

async function liveKpiDetail(
  kpiId: CommandKpiId,
  filters: Filters,
  opts: SourceOpts
): Promise<IqKpiDetail> {
  const { window } = filters;
  const internal = opts.internalVisitorIds;
  const now = new Date();
  const priorSince = new Date(now.getTime() - 2 * window * DAY_MS);
  const curKeys = lastNDayKeys(window, now);
  const priKeys = priorDayKeys(window, now);

  const countByDay = new Map<string, number>();
  let dataStart: string | null = null;
  let gscThrough: string | null = null;

  if (kpiId === "visitors") {
    const rows = await prisma.pageView.findMany({
      where: { createdAt: { gte: priorSince }, ...excludeInternal(internal) },
      select: { visitorId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: PAGEVIEW_ROW_CAP,
    });
    const setByDay = new Map<string, Set<string>>();
    for (const v of rows) {
      const k = nyDayKey(v.createdAt);
      if (!setByDay.has(k)) setByDay.set(k, new Set());
      setByDay.get(k)!.add(v.visitorId);
    }
    for (const [k, s] of setByDay) countByDay.set(k, s.size);
    const first = await prisma.pageView.findFirst({
      where: excludeInternal(internal),
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    dataStart = first ? first.createdAt.toISOString() : null;
  } else if (kpiId === "pageviews") {
    const rows = await prisma.pageView.findMany({
      where: { createdAt: { gte: priorSince }, ...excludeInternal(internal) },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
      take: PAGEVIEW_ROW_CAP,
    });
    for (const v of rows) {
      const k = nyDayKey(v.createdAt);
      countByDay.set(k, (countByDay.get(k) || 0) + 1);
    }
    const first = await prisma.pageView.findFirst({
      where: excludeInternal(internal),
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    dataStart = first ? first.createdAt.toISOString() : null;
  } else if (kpiId === "briefs" || kpiId === "bookings") {
    if (kpiId === "briefs") {
      const rows = await prisma.event.findMany({
        where: { name: "form_submit", createdAt: { gte: priorSince }, ...excludeInternalNullable(internal) },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
        take: EVENT_ROW_CAP,
      });
      for (const e of rows) {
        const k = nyDayKey(e.createdAt);
        countByDay.set(k, (countByDay.get(k) || 0) + 1);
      }
      const first = await prisma.event.findFirst({
        where: { name: "form_submit", ...excludeInternalNullable(internal) },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      dataStart = first ? first.createdAt.toISOString() : null;
    } else {
      const rows = await prisma.booking.findMany({
        where: { createdAt: { gte: priorSince }, ...excludeInternalNullable(internal) },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
        take: BOOKING_ROW_CAP,
      });
      for (const b of rows) {
        const k = nyDayKey(b.createdAt);
        countByDay.set(k, (countByDay.get(k) || 0) + 1);
      }
      const first = await prisma.booking.findFirst({
        where: { ...excludeInternalNullable(internal) },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      dataStart = first ? first.createdAt.toISOString() : null;
    }
  } else if (kpiId === "subscribers") {
    const rows = await prisma.subscriber.findMany({
      where: { createdAt: { gte: priorSince } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
      take: BOOKING_ROW_CAP,
    });
    for (const s of rows) {
      const k = nyDayKey(s.createdAt);
      countByDay.set(k, (countByDay.get(k) || 0) + 1);
    }
    const first = await prisma.subscriber.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });
    dataStart = first ? first.createdAt.toISOString() : null;
  } else {
    // search-clicks — keyed by GSC's stored date (never re-bucketed, DATA §2).
    const rows = await prisma.gscDaily.findMany({
      where: { date: { gte: priorSince } },
      select: { date: true, clicks: true },
      orderBy: { date: "asc" },
      take: GSC_DAILY_ROW_CAP,
    });
    for (const r of rows) countByDay.set(gscDateKey(r.date), r.clicks);
    const [firstDaily, latestDaily] = await Promise.all([
      prisma.gscDaily.findFirst({ orderBy: { date: "asc" }, select: { date: true } }),
      prisma.gscDaily.findFirst({ orderBy: { date: "desc" }, select: { date: true } }),
    ]);
    dataStart = firstDaily ? gscDateKey(firstDaily.date) : null;
    gscThrough = latestDaily ? gscDateKey(latestDaily.date) : null;
  }

  const meta = KPI_DEFINITIONS[kpiId];
  return {
    meta: liveMeta(internal.length),
    window,
    kpiId,
    label: meta.label,
    definition: meta.definition,
    dataStart,
    series: seriesFrom(countByDay, curKeys),
    priorSeries: seriesFrom(countByDay, priKeys),
    gscThrough,
  };
}

async function livePageDetail(
  path: string,
  filters: Filters,
  opts: SourceOpts
): Promise<IqPageDetail> {
  const { window } = filters;
  const internal = opts.internalVisitorIds;
  const now = new Date();
  const since = new Date(now.getTime() - window * DAY_MS);

  const [allViews, firstPathView, gscRows, latestDaily] = await Promise.all([
    prisma.pageView.findMany({
      where: { createdAt: { gte: since }, ...excludeInternal(internal) },
      select: { path: true, visitorId: true, referrer: true, device: true, country: true, duration: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: PAGEVIEW_ROW_CAP,
    }),
    prisma.pageView.findFirst({
      where: { path, ...excludeInternal(internal) },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.gscQuery.findMany({
      where: { date: { gte: since } },
      select: { date: true, query: true, page: true, impressions: true, clicks: true, position: true, isBranded: true, brandedAmbiguous: true, intentBucket: true, classifierVersion: true },
      take: GSC_QUERY_ROW_CAP,
    }),
    prisma.gscDaily.findFirst({ orderBy: { date: "desc" }, select: { date: true } }),
  ]);

  const pathViews = allViews.filter((v) => v.path === path);

  // Entrances: first pageview of each visitor-day; count the ones on this path.
  const seenVisitorDay = new Set<string>();
  let entrances = 0;
  for (const v of allViews) {
    const key = `${v.visitorId}|${nyDayKey(v.createdAt)}`;
    if (seenVisitorDay.has(key)) continue;
    seenVisitorDay.add(key);
    if (v.path === path) entrances += 1;
  }

  // Sources: referrer hosts that sent traffic to THIS path (internal excluded).
  const hostAgg = new Map<string, { n: number; sample: string | null }>();
  for (const v of pathViews) {
    const host = referrerHost(v.referrer);
    if (!host) continue;
    const rec = hostAgg.get(host) ?? { n: 0, sample: v.referrer ?? null };
    rec.n += 1;
    hostAgg.set(host, rec);
  }
  const sources: PageSourceRow[] = [...hostAgg.entries()]
    .map(([host, r]) => ({ host, n: r.n, sampleReferrer: r.sample }))
    .sort((a, b) => b.n - a.n)
    .slice(0, PAGE_SOURCE_ROWS);

  // Visitors tab: last ~20 journeys touching this path, full window sequence.
  const pathVisitorLast = new Map<string, number>();
  for (const v of pathViews) {
    pathVisitorLast.set(v.visitorId, Math.max(pathVisitorLast.get(v.visitorId) ?? 0, v.createdAt.getTime()));
  }
  const orderedVisitorIds = [...pathVisitorLast.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, PAGE_VISITOR_ROWS)
    .map(([id]) => id);
  const seqByVisitor = new Map<string, typeof allViews>();
  for (const v of allViews) {
    if (!pathVisitorLast.has(v.visitorId)) continue;
    const list = seqByVisitor.get(v.visitorId) ?? [];
    list.push(v);
    seqByVisitor.set(v.visitorId, list);
  }
  const visitorLog: VisitorLogRow[] = orderedVisitorIds.map((id) => {
    const vs = seqByVisitor.get(id) ?? [];
    const reported = vs.filter((v) => v.duration !== null);
    return {
      visitorId: id,
      shortId: id.slice(0, 8),
      device: vs[0]?.device ?? null,
      country: vs[0]?.country ?? null,
      paths: vs.slice(0, VISITOR_LOG_PATHS_MAX).map((v) => v.path),
      morePaths: Math.max(0, vs.length - VISITOR_LOG_PATHS_MAX),
      views: vs.length,
      totalSeconds: reported.reduce((a, v) => a + cappedDuration(v.duration), 0),
      reported: reported.length,
    };
  });

  // Daily visitors on this path, zero-filled.
  const visitorsByBucket = new Map<string, Set<string>>();
  for (const v of pathViews) {
    const k = bucketKey(v.createdAt, window);
    if (!visitorsByBucket.has(k)) visitorsByBucket.set(k, new Set());
    visitorsByBucket.get(k)!.add(v.visitorId);
  }
  const trend: SeriesPoint[] = windowBucketKeys(window, now).map((key) => ({
    key,
    n: visitorsByBucket.get(key)?.size || 0,
  }));

  const reportedDurations = pathViews.filter((v) => v.duration !== null).map((v) => cappedDuration(v.duration));
  const maxDurationSeconds = reportedDurations.length ? Math.max(...reportedDurations) : null;

  // Search tab: GscQuery rows whose page resolves to this path.
  const pageQueries = gscRows.filter((q) => gscPagePath(q.page) === path);
  const byQuery = new Map<string, { impressions: number; clicks: number; posW: number; isBranded: boolean; brandedAmbiguous: boolean; intentBucket: string | null }>();
  for (const q of pageQueries) {
    const rec = byQuery.get(q.query) ?? { impressions: 0, clicks: 0, posW: 0, isBranded: false, brandedAmbiguous: false, intentBucket: null };
    rec.impressions += q.impressions;
    rec.clicks += q.clicks;
    rec.posW += q.position * q.impressions;
    rec.isBranded = rec.isBranded || q.isBranded;
    rec.brandedAmbiguous = rec.brandedAmbiguous || q.brandedAmbiguous;
    rec.intentBucket = rec.intentBucket ?? q.intentBucket;
    byQuery.set(q.query, rec);
  }
  const allQueryRows = [...byQuery.entries()]
    .map(([query, r]) => ({
      query,
      clicks: r.clicks,
      impressions: r.impressions,
      position: r.impressions ? r.posW / r.impressions : 0,
      isBranded: r.isBranded,
      brandedAmbiguous: r.brandedAmbiguous,
      intentBucket: r.intentBucket,
    }))
    .sort((a, b) => b.impressions - a.impressions);
  const above = allQueryRows.filter((r) => r.impressions >= GSC_MIN_IMPRESSIONS);
  const search: PageSearchRow[] = above.slice(0, PAGE_SEARCH_ROWS);
  const below = allQueryRows.filter((r) => r.impressions < GSC_MIN_IMPRESSIONS);
  const searchBelowThreshold: BelowThresholdRollup | null = below.length
    ? {
        rows: below.length,
        impressions: below.reduce((a, r) => a + r.impressions, 0),
        clicks: below.reduce((a, r) => a + r.clicks, 0),
      }
    : null;
  // Truncation honesty (api A2) — ABOVE-threshold rows past the row cap roll up
  // like liveSearch.queriesBeyondCap instead of silently vanishing (FLAG-5).
  const searchOver = above.slice(PAGE_SEARCH_ROWS);
  const searchBeyondThreshold: BelowThresholdRollup | null = searchOver.length
    ? {
        rows: searchOver.length,
        impressions: searchOver.reduce((a, r) => a + r.impressions, 0),
        clicks: searchOver.reduce((a, r) => a + r.clicks, 0),
      }
    : null;

  return {
    // Honesty metadata: the classifier versions actually behind this page's
    // Search tag output (F6 — the Search tab exposes isBranded/intent, so the
    // footer must say what tagged it, mirroring liveSearch/liveCommand).
    meta: liveMeta(internal.length, [...new Set(pageQueries.map((q) => q.classifierVersion))].sort()),
    window,
    path,
    since: since.toISOString(),
    countingSince: firstPathView ? firstPathView.createdAt.toISOString() : null,
    views: pathViews.length,
    visitors: new Set(pathViews.map((v) => v.visitorId)).size,
    entrances,
    avgDuration: durationStat(pathViews),
    maxDurationSeconds,
    devices: topCounts(pathViews.map((v) => v.device), UNKNOWN_LABEL),
    countries: topCounts(pathViews.map((v) => v.country), UNKNOWN_LABEL),
    trend,
    sources,
    visitorLog,
    search,
    searchBelowThreshold,
    searchBeyondThreshold,
    gscThrough: latestDaily ? gscDateKey(latestDaily.date) : null,
  };
}

const JOURNEY_EVENT_KIND: Record<string, JourneyKind> = {
  chooser_click: "chooser",
  cta_click: "cta",
  form_submit: "brief",
};

function refLabel(ref: string | null): string {
  const host = referrerHost(ref);
  if (host) return `via ${host}`;
  return "direct or internal";
}

function durationDetail(s: number | null): string {
  if (!s) return "";
  const capped = cappedDuration(s);
  return capped >= 60 ? ` · ${Math.floor(capped / 60)}m ${capped % 60}s` : ` · ${capped}s`;
}

async function liveVisitorJourney(visitorId: string, opts: SourceOpts): Promise<IqVisitorJourney> {
  const [views, events, bookings, lead, pageviewCount] = await Promise.all([
    prisma.pageView.findMany({
      where: { visitorId },
      orderBy: { createdAt: "asc" },
      take: JOURNEY_ITEM_CAP,
      select: { path: true, referrer: true, duration: true, device: true, browser: true, country: true, createdAt: true },
    }),
    prisma.event.findMany({
      where: { visitorId },
      orderBy: { createdAt: "asc" },
      take: JOURNEY_ITEM_CAP,
      select: { name: true, path: true, meta: true, createdAt: true },
    }),
    prisma.booking.findMany({
      where: { visitorId },
      orderBy: { createdAt: "asc" },
      take: BOOKING_ROW_CAP,
      select: { createdAt: true },
    }),
    // PII-free: id ONLY — the lead NAME never enters an analytics payload.
    prisma.lead.findFirst({ where: { visitorId }, select: { id: true }, orderBy: { createdAt: "asc" } }),
    // Honest header count even when the timeline is capped (F4).
    prisma.pageView.count({ where: { visitorId } }),
  ]);
  // The bounded timeline hit the item cap on either stream — say so, don't lie.
  const truncated = views.length >= JOURNEY_ITEM_CAP || events.length >= JOURNEY_ITEM_CAP;

  const items: JourneyItem[] = [];
  for (const v of views) {
    items.push({
      at: v.createdAt.toISOString(),
      kind: "view",
      label: `Read ${v.path}`,
      detail: `${refLabel(v.referrer)}${durationDetail(v.duration)}${v.device ? ` · ${v.device}` : ""}${v.country ? ` · ${v.country}` : ""}`,
      metaChips: [],
    });
  }
  for (const e of events) {
    // Booking events would duplicate the authoritative Booking-table entries.
    const kind = JOURNEY_EVENT_KIND[e.name];
    if (!kind) continue;
    items.push({
      at: e.createdAt.toISOString(),
      kind,
      label: e.name.replace(/_/g, " "),
      detail: e.path,
      metaChips: metaToChips(e.meta),
    });
  }
  for (const b of bookings) {
    items.push({ at: b.createdAt.toISOString(), kind: "booking", label: "Booking captured", detail: "Calendly booking", metaChips: [] });
  }
  items.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  // Session grouping: a gap larger than SESSION_GAP_MINUTES starts a new one.
  const gapMs = SESSION_GAP_MINUTES * 60 * 1000;
  const sessions: JourneySession[] = [];
  for (const it of items) {
    const t = Date.parse(it.at);
    const last = sessions[sessions.length - 1];
    if (!last || t - Date.parse(last.items[last.items.length - 1].at) > gapMs) {
      sessions.push({ startAt: it.at, items: [it] });
    } else {
      last.items.push(it);
    }
  }

  const first = views[0] ?? null;
  const totalSeconds = views.reduce((a, v) => a + cappedDuration(v.duration), 0);
  const firstSeen = items.length ? items[0].at : null;
  const lastSeen = items.length ? items[items.length - 1].at : null;

  return {
    meta: liveMeta(opts.internalVisitorIds.length),
    visitorId,
    shortId: visitorId.slice(0, 8),
    firstSeen,
    lastSeen,
    device: first?.device ?? null,
    browser: first?.browser ?? null,
    country: first?.country ?? null,
    pageviews: pageviewCount,
    sessionCount: sessions.length,
    truncated,
    sessions,
    pagesRead: [...new Set(views.map((v) => v.path))],
    totalSeconds,
    hasLead: Boolean(lead),
    leadId: lead?.id ?? null,
  };
}

async function liveActivity(filters: Filters, opts: SourceOpts): Promise<IqActivity> {
  const { window } = filters;
  const internal = opts.internalVisitorIds;
  const now = new Date();
  // PERIOD-UI wave: the log scopes to the resolved calendar period (MTD
  // default). A log has nothing to compare — compareMode is forced "none" so
  // the echo can never name a comparison this surface does not render.
  const resolved = resolvePeriod({ ...filters, compareMode: "none" }, now);
  const { since, until } = resolved.period;

  const [views, events, bookings, firstView] = await Promise.all([
    prisma.pageView.findMany({
      where: { createdAt: { gte: since, lt: until }, ...excludeInternal(internal) },
      select: { id: true, path: true, visitorId: true, referrer: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: PAGEVIEW_ROW_CAP,
    }),
    prisma.event.findMany({
      where: { createdAt: { gte: since, lt: until }, ...excludeInternalNullable(internal) },
      select: { id: true, name: true, path: true, visitorId: true, meta: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: EVENT_ROW_CAP,
    }),
    prisma.booking.findMany({
      where: { createdAt: { gte: since, lt: until }, ...excludeInternalNullable(internal) },
      select: { id: true, visitorId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: BOOKING_ROW_CAP,
    }),
    prisma.pageView.findFirst({ where: excludeInternal(internal), orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
  ]);

  const rows: ActivityRow[] = [];
  const sourceCounts = new Map<string, number>();
  for (const v of views) {
    const cls = classifySource(v.referrer);
    sourceCounts.set(cls, (sourceCounts.get(cls) || 0) + 1);
    rows.push({
      key: `pv-${v.id}`,
      at: v.createdAt.toISOString(),
      kind: "pageview",
      path: v.path,
      visitorId: v.visitorId,
      shortId: v.visitorId.slice(0, 8),
      sourceClass: cls,
      metaChips: [],
      hasVisitorId: true,
    });
  }
  const eventKinds: ActivityKind[] = ["chooser_click", "cta_click", "form_submit"];
  for (const e of events) {
    if (!eventKinds.includes(e.name as ActivityKind)) continue; // 'booking' handled via Booking table
    rows.push({
      key: `ev-${e.id}`,
      at: e.createdAt.toISOString(),
      kind: e.name as ActivityKind,
      path: e.path,
      visitorId: e.visitorId,
      shortId: e.visitorId ? e.visitorId.slice(0, 8) : null,
      sourceClass: null,
      metaChips: metaToChips(e.meta),
      hasVisitorId: e.visitorId !== null,
    });
  }
  for (const b of bookings) {
    rows.push({
      key: `bk-${b.id}`,
      at: b.createdAt.toISOString(),
      kind: "booking",
      path: null,
      visitorId: b.visitorId,
      shortId: b.visitorId ? b.visitorId.slice(0, 8) : null,
      sourceClass: null,
      metaChips: [],
      hasVisitorId: b.visitorId !== null,
    });
  }

  // Pre-filter kind counts (the filter option list).
  const kindCounts = new Map<ActivityKind, number>();
  for (const r of rows) kindCounts.set(r.kind, (kindCounts.get(r.kind) || 0) + 1);
  const kindOrder: ActivityKind[] = ["pageview", "chooser_click", "cta_click", "form_submit", "booking"];
  const kinds = kindOrder
    .filter((k) => (kindCounts.get(k) || 0) > 0)
    .map((kind) => ({ kind, n: kindCounts.get(kind) || 0 }));
  const sources: BreakdownRow[] = [...sourceCounts.entries()]
    .map(([label, n]) => ({ label, n }))
    .sort((a, b) => b.n - a.n);

  // Apply filters. sourceClass keeps pageview rows only (events/bookings carry
  // no source) — an honest, explicit narrowing.
  const wantKind = filters.kind ?? null;
  const wantPath = filters.path ?? null;
  const wantSource = filters.sourceClass ?? null;
  let filtered = rows;
  if (wantKind) filtered = filtered.filter((r) => r.kind === wantKind);
  if (wantPath) filtered = filtered.filter((r) => r.path === wantPath);
  if (wantSource) filtered = filtered.filter((r) => r.sourceClass === wantSource);

  filtered.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const truncated = filtered.length > ACTIVITY_ROWS;
  const capped = filtered.slice(0, ACTIVITY_ROWS);

  return {
    meta: liveMeta(internal.length),
    window,
    period: periodEcho(resolved),
    since: since.toISOString(),
    countingSince: firstView ? firstView.createdAt.toISOString() : null,
    rows: capped,
    rowCap: ACTIVITY_ROWS,
    truncated,
    kinds,
    sources,
    applied: { kind: wantKind, path: wantPath, sourceClass: wantSource },
  };
}

// ---------------------------------------------------------------------------
// Wave 3b-ii drill methods (WP3.6 GSC / WP3.7 funnel-step + day). Same
// discipline: windowed + row-capped, exclusion threaded, ISO strings on the
// wire, PII-free by type construction. GSC methods are their own population
// (internal exclusion is footer honesty only; classifierVersions ride meta).
// ---------------------------------------------------------------------------

/** Raw GscQuery row shape the drill aggregators consume. */
type GscRawRow = {
  query: string;
  impressions: number;
  clicks: number;
  position: number;
  isBranded: boolean;
  brandedAmbiguous: boolean;
  intentBucket: string | null;
};

/** Aggregate GscQuery rows per query into GscQueryRow[] (impression-weighted
 * position), sorted by impressions desc — the one shared shape for every table. */
function aggregateGscQueries(rows: GscRawRow[]): GscQueryRow[] {
  const byQuery = new Map<
    string,
    { impressions: number; clicks: number; posW: number; isBranded: boolean; brandedAmbiguous: boolean; intentBucket: string | null }
  >();
  for (const q of rows) {
    const rec = byQuery.get(q.query) ?? { impressions: 0, clicks: 0, posW: 0, isBranded: false, brandedAmbiguous: false, intentBucket: null };
    rec.impressions += q.impressions;
    rec.clicks += q.clicks;
    rec.posW += q.position * q.impressions;
    rec.isBranded = rec.isBranded || q.isBranded;
    rec.brandedAmbiguous = rec.brandedAmbiguous || q.brandedAmbiguous;
    rec.intentBucket = rec.intentBucket ?? q.intentBucket;
    byQuery.set(q.query, rec);
  }
  return [...byQuery.entries()]
    .map(([query, r]) => ({
      query,
      clicks: r.clicks,
      impressions: r.impressions,
      position: r.impressions ? r.posW / r.impressions : 0,
      isBranded: r.isBranded,
      brandedAmbiguous: r.brandedAmbiguous,
      intentBucket: r.intentBucket,
    }))
    .sort((a, b) => b.impressions - a.impressions);
}

/** Counted rollup for a set of sub-threshold / over-cap rows (null when empty). */
function rollupRows(rows: { impressions: number; clicks: number }[]): BelowThresholdRollup | null {
  return rows.length
    ? { rows: rows.length, impressions: rows.reduce((a, r) => a + r.impressions, 0), clicks: rows.reduce((a, r) => a + r.clicks, 0) }
    : null;
}

/** Zero-filled daily keys across a concrete period (custom-range trend). NY
 * calendar days; consecutive duplicates collapsed. */
function nyDayKeysInPeriod(period: Period): string[] {
  const keys: string[] = [];
  let last: string | null = null;
  for (let t = period.since.getTime(); t < period.until.getTime(); t += DAY_MS) {
    const k = nyDayKey(new Date(t));
    if (k !== last) {
      keys.push(k);
      last = k;
    }
  }
  return keys;
}

async function liveGscDetail(
  kind: GscDetailKind,
  queryArg: string | null,
  filters: Filters,
  opts: SourceOpts
): Promise<IqGscDetail> {
  const { window } = filters;
  const internal = opts.internalVisitorIds; // footer honesty only — GSC is its own population
  const now = new Date();
  // GSC population keys on the stored @db.Date (midnight UTC) → the ONE
  // sanctioned UTC-boundary resolver (api #7 / database L2). Never call
  // resolvePeriod(..., "utc") directly anywhere else.
  const { period, range } = resolveGscPeriod(filters, now);
  const since = period.since;
  const until = period.until;

  const [firstDaily, latestDaily] = await Promise.all([
    prisma.gscDaily.findFirst({ orderBy: { date: "asc" }, select: { date: true } }),
    prisma.gscDaily.findFirst({ orderBy: { date: "desc" }, select: { date: true } }),
  ]);
  const base = {
    window,
    range,
    gscSince: firstDaily ? gscDateKey(firstDaily.date) : null,
    gscThrough: latestDaily ? gscDateKey(latestDaily.date) : null,
  };

  // ---- QUERY-ROW modal: one query only ----
  if (kind === "query") {
    const q = queryArg ?? "";
    const rows = await prisma.gscQuery.findMany({
      where: { query: q, date: { gte: since, lt: until } },
      select: { date: true, page: true, impressions: true, clicks: true, position: true, isBranded: true, brandedAmbiguous: true, isCollision: true, isGeo: true, intentBucket: true, classifierVersion: true },
      take: GSC_QUERY_ROW_CAP,
    });
    const daily = new Map<string, { clicks: number; impressions: number; posW: number }>();
    for (const r of rows) {
      const key = gscDateKey(r.date);
      const rec = daily.get(key) ?? { clicks: 0, impressions: 0, posW: 0 };
      rec.clicks += r.clicks;
      rec.impressions += r.impressions;
      rec.posW += r.position * r.impressions;
      daily.set(key, rec);
    }
    const dailyPoints: GscQueryDayPoint[] = [...daily.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, r]) => ({ date, clicks: r.clicks, impressions: r.impressions, position: r.impressions ? r.posW / r.impressions : 0 }));
    const byPage = new Map<string, { clicks: number; impressions: number; posW: number }>();
    for (const r of rows) {
      const path = gscPagePath(r.page);
      const rec = byPage.get(path) ?? { clicks: 0, impressions: 0, posW: 0 };
      rec.clicks += r.clicks;
      rec.impressions += r.impressions;
      rec.posW += r.position * r.impressions;
      byPage.set(path, rec);
    }
    const pages: GscQueryPageRow[] = [...byPage.entries()]
      .map(([path, r]) => ({ path, clicks: r.clicks, impressions: r.impressions, position: r.impressions ? r.posW / r.impressions : 0 }))
      .sort((a, b) => b.impressions - a.impressions);
    const clicks = rows.reduce((a, r) => a + r.clicks, 0);
    const impressions = rows.reduce((a, r) => a + r.impressions, 0);
    const posW = rows.reduce((a, r) => a + r.position * r.impressions, 0);
    return {
      kind: "query",
      meta: liveMeta(internal.length, [...new Set(rows.map((r) => r.classifierVersion))].sort()),
      ...base,
      query: q,
      clicks,
      impressions,
      position: impressions ? posW / impressions : 0,
      isBranded: rows.some((r) => r.isBranded),
      brandedAmbiguous: rows.some((r) => r.brandedAmbiguous),
      isCollision: rows.some((r) => r.isCollision),
      isGeo: rows.some((r) => r.isGeo),
      intentBucket: rows.find((r) => r.intentBucket)?.intentBucket ?? null,
      daily: dailyPoints,
      pages,
      belowThreshold: impressions < GSC_MIN_IMPRESSIONS,
    };
  }

  // ---- Common fetch for branded / classifiable / intent ----
  const [queriesInWindow, dailyInWindow] = await Promise.all([
    prisma.gscQuery.findMany({
      where: { date: { gte: since, lt: until } },
      select: { date: true, query: true, impressions: true, clicks: true, position: true, isBranded: true, brandedAmbiguous: true, isCollision: true, intentBucket: true, classifierVersion: true },
      take: GSC_QUERY_ROW_CAP,
    }),
    prisma.gscDaily.findMany({
      where: { date: { gte: since, lt: until } },
      select: { date: true, impressions: true, clicks: true },
      orderBy: { date: "asc" },
      take: GSC_DAILY_ROW_CAP,
    }),
  ]);
  const classifierVersions = [...new Set(queriesInWindow.map((q) => q.classifierVersion))].sort();
  const meta = liveMeta(internal.length, classifierVersions);

  if (kind === "branded") {
    // Branded vs non-branded CLICKS trend, zero-filled across the daily span.
    const byDate = new Map<string, { branded: number; nonBranded: number }>();
    for (const q of queriesInWindow) {
      const key = gscDateKey(q.date);
      const rec = byDate.get(key) ?? { branded: 0, nonBranded: 0 };
      if (q.isBranded) rec.branded += q.clicks;
      // Non-branded is STRICTLY disjoint (F2): exclude ambiguous AND collision
      // clicks so a possible-other-Bradley-Griffin never lands on your organic
      // line while ALSO being reported as a collision. Only ever more conservative.
      else if (!q.brandedAmbiguous && !q.isCollision) rec.nonBranded += q.clicks;
      byDate.set(key, rec);
    }
    const trend: GscTrendPoint[] = [];
    if (dailyInWindow.length) {
      const start = dailyInWindow[0].date.getTime();
      const end = dailyInWindow[dailyInWindow.length - 1].date.getTime();
      for (let t = start; t <= end; t += DAY_MS) {
        const key = gscDateKey(new Date(t));
        const rec = byDate.get(key);
        trend.push({ date: key, branded: rec?.branded ?? 0, nonBranded: rec?.nonBranded ?? 0 });
      }
    }
    // Ambiguous & collisions tab (brandedAmbiguous OR isCollision).
    const ambRaw = queriesInWindow.filter((q) => q.brandedAmbiguous || q.isCollision);
    const ambAgg = aggregateGscQueries(ambRaw);
    const ambAbove = ambAgg.filter((r) => r.impressions >= GSC_MIN_IMPRESSIONS).slice(0, GSC_QUERY_ROWS_MAX);
    const ambBelow = ambAgg.filter((r) => r.impressions < GSC_MIN_IMPRESSIONS);
    return {
      kind: "branded",
      meta,
      ...base,
      trend,
      brandedClicks: queriesInWindow.filter((q) => q.isBranded).reduce((a, q) => a + q.clicks, 0),
      nonBrandedClicks: queriesInWindow.filter((q) => !q.isBranded && !q.brandedAmbiguous && !q.isCollision).reduce((a, q) => a + q.clicks, 0),
      ambiguous: ambAbove,
      ambiguousBelowThreshold: rollupRows(ambBelow),
      brandedAmbiguousClicks: queriesInWindow.filter((q) => q.brandedAmbiguous).reduce((a, q) => a + q.clicks, 0),
      collisionClicks: queriesInWindow.filter((q) => q.isCollision).reduce((a, q) => a + q.clicks, 0),
    };
  }

  if (kind === "classifiable") {
    const visibleByDate = new Map<string, number>();
    for (const q of queriesInWindow) {
      const key = gscDateKey(q.date);
      visibleByDate.set(key, (visibleByDate.get(key) ?? 0) + q.impressions);
    }
    const points: GscClassifiablePoint[] = dailyInWindow.map((r) => {
      const key = gscDateKey(r.date);
      const visible = visibleByDate.get(key) ?? 0;
      const total = r.impressions;
      return { date: key, visible, total, anonymized: Math.max(0, total - visible) };
    });
    return {
      kind: "classifiable",
      meta,
      ...base,
      points,
      visibleImpressions: queriesInWindow.reduce((a, q) => a + q.impressions, 0),
      totalImpressions: dailyInWindow.reduce((a, r) => a + r.impressions, 0),
    };
  }

  // kind === "intent"
  const byBucket = new Map<string, GscRawRow[]>();
  for (const q of queriesInWindow) {
    if (!q.intentBucket) continue;
    const list = byBucket.get(q.intentBucket) ?? [];
    list.push(q);
    byBucket.set(q.intentBucket, list);
  }
  const bucketRows = [...byBucket.entries()].map(([bucket, rows]) => {
    const impressions = rows.reduce((a, r) => a + r.impressions, 0);
    const clicks = rows.reduce((a, r) => a + r.clicks, 0);
    const queries = aggregateGscQueries(rows).slice(0, GSC_QUERY_ROWS_MAX);
    return { bucket, impressions, clicks, queries };
  });
  bucketRows.sort((a, b) => b.impressions - a.impressions);
  const buckets: IqGscIntentBucket[] = bucketRows.filter((b) => b.impressions >= GSC_MIN_IMPRESSIONS);
  const belowBuckets = bucketRows.filter((b) => b.impressions < GSC_MIN_IMPRESSIONS);
  return {
    kind: "intent",
    meta,
    ...base,
    buckets,
    belowThreshold: rollupRows(belowBuckets),
  };
}

// ---- WP3.7 funnel-step + day ----------------------------------------------

const FUNNEL_EVENT_ROWS = 200;
const FUNNEL_PEOPLE_ROWS = 200;
const DAY_VISITOR_ROWS = 200;
const DAY_EVENT_ROWS = 200;
const DAY_PAGE_ROWS = 25;

async function liveFunnelStep(stepKey: FunnelStepKey, filters: Filters, opts: SourceOpts): Promise<IqFunnelStep> {
  const { window } = filters;
  const internal = opts.internalVisitorIds;
  const now = new Date();
  const { period, range } = resolvePeriod(filters, now);
  const prior = priorPeriod(period);

  const idx = FUNNEL_STEPS.findIndex((s) => s.key === stepKey);
  const stepDef = FUNNEL_STEPS[idx];
  const nextDef = idx >= 0 && idx < FUNNEL_STEPS.length - 1 ? FUNNEL_STEPS[idx + 1] : null;

  // Fetch prior.since .. period.until so the compare overlay has data.
  const lo = prior.since;
  const hi = period.until;
  const [views, events, bookings] = await Promise.all([
    prisma.pageView.findMany({
      where: { createdAt: { gte: lo, lt: hi }, ...excludeInternal(internal) },
      select: { visitorId: true, path: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: PAGEVIEW_ROW_CAP,
    }),
    prisma.event.findMany({
      where: { createdAt: { gte: lo, lt: hi }, name: { in: ["chooser_click", "cta_click", "form_submit"] }, ...excludeInternalNullable(internal) },
      select: { name: true, path: true, visitorId: true, meta: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: EVENT_ROW_CAP,
    }),
    prisma.booking.findMany({
      where: { createdAt: { gte: lo, lt: hi }, ...excludeInternalNullable(internal) },
      select: { visitorId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: BOOKING_ROW_CAP,
    }),
  ]);

  type StepRow = { visitorId: string | null; path: string | null; meta: unknown; at: Date };
  const rowsFor = (key: FunnelStepKey): StepRow[] => {
    if (key === "visitors") return views.map((v) => ({ visitorId: v.visitorId, path: v.path, meta: null, at: v.createdAt }));
    if (key === "booking") return bookings.map((b) => ({ visitorId: b.visitorId, path: null, meta: null, at: b.createdAt }));
    return events.filter((e) => e.name === key).map((e) => ({ visitorId: e.visitorId, path: e.path, meta: e.meta, at: e.createdAt }));
  };

  const inCur = (d: Date) => d >= period.since && d < period.until;
  const inPri = (d: Date) => d >= prior.since && d < period.since;

  const allStepRows = rowsFor(stepKey);
  const curStepRows = allStepRows.filter((r) => inCur(r.at));
  const nextVisitorSet = new Set(
    (nextDef ? rowsFor(nextDef.key).filter((r) => inCur(r.at)) : []).map((r) => r.visitorId).filter((v): v is string => v !== null)
  );

  const distinctVisitors = new Set(curStepRows.map((r) => r.visitorId).filter((v): v is string => v !== null));
  const reachedNext = nextDef ? [...distinctVisitors].filter((id) => nextVisitorSet.has(id)).length : 0;

  const perPerson = new Map<string, number>();
  for (const r of curStepRows) if (r.visitorId) perPerson.set(r.visitorId, (perPerson.get(r.visitorId) || 0) + 1);
  const peopleAll = [...perPerson.entries()].sort((a, b) => b[1] - a[1]);
  const people: FunnelPersonRow[] = peopleAll.slice(0, FUNNEL_PEOPLE_ROWS).map(([id, count]) => ({
    visitorId: id,
    shortId: id.slice(0, 8),
    count,
    reachedNext: nextDef ? nextVisitorSet.has(id) : null,
  }));

  const eventsSorted = [...curStepRows].sort((a, b) => b.at.getTime() - a.at.getTime());
  const eventsList: FunnelEventRow[] = eventsSorted.slice(0, FUNNEL_EVENT_ROWS).map((r) => ({
    at: r.at.toISOString(),
    path: r.path,
    visitorId: r.visitorId,
    shortId: r.visitorId ? r.visitorId.slice(0, 8) : null,
    metaChips: metaToChips(r.meta),
  }));

  const curKeys = range ? nyDayKeysInPeriod(period) : lastNDayKeys(window, now);
  const priKeys = range ? nyDayKeysInPeriod(prior) : priorDayKeys(window, now);
  const curCount = new Map<string, number>();
  for (const r of curStepRows) {
    const k = nyDayKey(r.at);
    curCount.set(k, (curCount.get(k) || 0) + 1);
  }
  const priCount = new Map<string, number>();
  for (const r of allStepRows) {
    if (!inPri(r.at)) continue;
    const k = nyDayKey(r.at);
    priCount.set(k, (priCount.get(k) || 0) + 1);
  }

  return {
    meta: liveMeta(internal.length),
    window,
    range,
    since: period.since.toISOString(),
    stepKey,
    label: stepDef.label,
    nextKey: nextDef?.key ?? null,
    nextLabel: nextDef?.label ?? null,
    visitors: distinctVisitors.size,
    events: curStepRows.length,
    reachedNext,
    trend: curKeys.map((k) => ({ key: k, n: curCount.get(k) || 0 })),
    priorTrend: priKeys.map((k) => ({ key: k, n: priCount.get(k) || 0 })),
    eventsList,
    people,
    eventsTruncated: eventsSorted.length > FUNNEL_EVENT_ROWS,
    peopleTruncated: peopleAll.length > FUNNEL_PEOPLE_ROWS,
  };
}

async function liveDayDetail(dayKey: string, filters: Filters, opts: SourceOpts): Promise<IqDayDetail> {
  const internal = opts.internalVisitorIds;
  // dayKey is a NY calendar day; fetch a padded instant window then filter by
  // nyDayKey so DST offsets can't clip the day. GSC matches by the same stored
  // YYYY-MM-DD (GscDaily.date is UTC midnight).
  const dayStart = new Date(Date.parse(`${dayKey}T00:00:00Z`));
  const lo = new Date(dayStart.getTime() - 2 * DAY_MS);
  const hi = new Date(dayStart.getTime() + 2 * DAY_MS);
  const [views, events, bookings, gscDaily] = await Promise.all([
    prisma.pageView.findMany({
      where: { createdAt: { gte: lo, lt: hi }, ...excludeInternal(internal) },
      select: { path: true, visitorId: true, device: true, country: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: PAGEVIEW_ROW_CAP,
    }),
    prisma.event.findMany({
      where: { createdAt: { gte: lo, lt: hi }, ...excludeInternalNullable(internal) },
      select: { name: true, path: true, visitorId: true, meta: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: EVENT_ROW_CAP,
    }),
    prisma.booking.findMany({
      where: { createdAt: { gte: lo, lt: hi }, ...excludeInternalNullable(internal) },
      select: { visitorId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: BOOKING_ROW_CAP,
    }),
    prisma.gscDaily.findFirst({ where: { date: dayStart }, select: { impressions: true, clicks: true } }),
  ]);

  const dayViews = views.filter((v) => nyDayKey(v.createdAt) === dayKey);
  const perVisitor = new Map<string, { views: number; device: string | null; country: string | null }>();
  for (const v of dayViews) {
    const rec = perVisitor.get(v.visitorId) ?? { views: 0, device: v.device, country: v.country };
    rec.views += 1;
    perVisitor.set(v.visitorId, rec);
  }
  const visitorAll = [...perVisitor.entries()].sort((a, b) => b[1].views - a[1].views);
  const visitorList: DayVisitorRow[] = visitorAll.slice(0, DAY_VISITOR_ROWS).map(([id, r]) => ({
    visitorId: id,
    shortId: id.slice(0, 8),
    views: r.views,
    device: r.device,
    country: r.country,
  }));
  const pages: BreakdownRow[] = topCounts(dayViews.map((v) => v.path), UNKNOWN_LABEL, DAY_PAGE_ROWS);

  const eventKinds: ActivityKind[] = ["chooser_click", "cta_click", "form_submit"];
  const dayEventsAll: DayEventRow[] = [];
  for (const e of events) {
    if (nyDayKey(e.createdAt) !== dayKey) continue;
    if (!eventKinds.includes(e.name as ActivityKind)) continue;
    dayEventsAll.push({
      at: e.createdAt.toISOString(),
      kind: e.name as ActivityKind,
      path: e.path,
      visitorId: e.visitorId,
      shortId: e.visitorId ? e.visitorId.slice(0, 8) : null,
      metaChips: metaToChips(e.meta),
    });
  }
  for (const b of bookings) {
    if (nyDayKey(b.createdAt) !== dayKey) continue;
    dayEventsAll.push({ at: b.createdAt.toISOString(), kind: "booking", path: null, visitorId: b.visitorId, shortId: b.visitorId ? b.visitorId.slice(0, 8) : null, metaChips: [] });
  }
  dayEventsAll.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  let gsc: IqDayDetail["gsc"] = null;
  if (gscDaily) {
    const qrows = await prisma.gscQuery.findMany({
      where: { date: dayStart },
      select: { query: true, impressions: true, clicks: true, position: true, isBranded: true, brandedAmbiguous: true, intentBucket: true },
      orderBy: { impressions: "desc" },
      take: GSC_QUERY_ROWS_MAX,
    });
    gsc = {
      impressions: gscDaily.impressions,
      clicks: gscDaily.clicks,
      queries: qrows.map((q) => ({ query: q.query, clicks: q.clicks, impressions: q.impressions, position: q.position, isBranded: q.isBranded, brandedAmbiguous: q.brandedAmbiguous, intentBucket: q.intentBucket })),
    };
  }

  return {
    meta: liveMeta(internal.length),
    dayKey,
    visitors: perVisitor.size,
    pageviews: dayViews.length,
    visitorList,
    pages,
    events: dayEventsAll.slice(0, DAY_EVENT_ROWS),
    gsc,
    truncated: visitorAll.length > DAY_VISITOR_ROWS || dayEventsAll.length > DAY_EVENT_ROWS,
  };
}

export const liveSource: AdminIqSource = {
  summary: liveSummary,
  command: liveCommand,
  landing: liveLanding,
  leadsByStatus: liveLeadsByStatus,
  traffic: liveTraffic,
  content: liveContent,
  search: liveSearch,
  leadsByInquiryType: liveLeadsByInquiryType,
  kpiDetail: liveKpiDetail,
  pageDetail: livePageDetail,
  visitorJourney: liveVisitorJourney,
  activity: liveActivity,
  gscDetail: liveGscDetail,
  funnelStep: liveFunnelStep,
  dayDetail: liveDayDetail,
};
