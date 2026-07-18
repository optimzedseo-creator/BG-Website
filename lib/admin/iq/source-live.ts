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
  AdminIqSource,
  AppliedCuts,
  BelowThresholdRollup,
  BreakdownRow,
  ChipOptions,
  CommandKpi,
  ContentPageRow,
  DurationStat,
  EvaluatorRef,
  Filters,
  FirstEntry,
  FunnelPair,
  FunnelStepV2,
  GscCountryRow,
  GscQueryRow,
  GscTrendPoint,
  IntentBucketRow,
  IqCommand,
  IqContent,
  IqLanding,
  IqMeta,
  IqRuleInputs,
  IqSearch,
  IqSummary,
  IqTraffic,
  LeadStatusCount,
  ModuleTeaser,
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
  VISITOR_LOG_PATHS_MAX,
  VISITOR_LOG_ROWS,
  bucketKey,
  classifySource,
  evaluateRules,
  gscDateKey,
  lastNDayKeys,
  ledgerFromFirsts,
  nyDateParts,
  referrerHost,
  windowBucketKeys,
} from "./shared";
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
  const since = new Date(now.getTime() - window * DAY_MS);
  const priorSince = new Date(now.getTime() - 2 * window * DAY_MS);
  const since7 = new Date(now.getTime() - 7 * DAY_MS);
  const since14 = new Date(now.getTime() - RULE_EVALUATOR_WINDOW_D * DAY_MS);
  const since28 = new Date(now.getTime() - 28 * DAY_MS);
  const since56 = new Date(now.getTime() - 56 * DAY_MS);
  const since90 = new Date(now.getTime() - 90 * DAY_MS);

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
  ]);

  const views = allViews.filter((v) => v.createdAt >= since);
  const priorViews = allViews.filter((v) => v.createdAt >= priorSince && v.createdAt < since);
  const events = allEvents.filter((e) => e.createdAt >= since);
  const priorEvents = allEvents.filter((e) => e.createdAt >= priorSince && e.createdAt < since);
  const bookings = allBookings.filter((b) => b.createdAt >= since);
  const priorBookings = allBookings.filter((b) => b.createdAt >= priorSince && b.createdAt < since);

  const distinct = (ids: (string | null)[]) => new Set(ids.filter((v): v is string => v !== null)).size;
  const countEvents = (list: typeof allEvents, name: string) => list.filter((e) => e.name === name).length;

  // ---- KPI strip (counts + prior counts; deltas render as counts, never %) --
  const gscInWindow = gscDaily.filter((r) => r.date >= since);
  const gscInPrior = gscDaily.filter((r) => r.date >= priorSince && r.date < since);
  const subsInWindow = subscribers.filter((s) => s.createdAt >= since).length;
  const subsInPrior = subscribers.filter((s) => s.createdAt >= priorSince && s.createdAt < since).length;

  const kpis: CommandKpi[] = [
    { id: "visitors", label: "Visitors", n: distinct(views.map((v) => v.visitorId)), prior: distinct(priorViews.map((v) => v.visitorId)) },
    { id: "pageviews", label: "Pageviews", n: views.length, prior: priorViews.length },
    {
      id: "search-clicks",
      label: "Search clicks",
      n: gscInWindow.reduce((a, r) => a + r.clicks, 0),
      prior: gscInPrior.reduce((a, r) => a + r.clicks, 0),
    },
    { id: "briefs", label: "Briefs", n: countEvents(events, "form_submit"), prior: countEvents(priorEvents, "form_submit") },
    { id: "bookings", label: "Bookings", n: bookings.length, prior: priorBookings.length },
    { id: "subscribers", label: "Subscribers", n: subsInWindow, prior: subsInPrior },
  ];

  const gscThrough = gscDaily.length ? gscDateKey(gscDaily[gscDaily.length - 1].date) : null;

  // ---- Trend (identical semantics to summary()) ----------------------------
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

  const views14 = allViews.filter((v) => v.createdAt >= since14);
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

  const views7 = views.filter((v) => v.createdAt >= since7);
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
    priorSince: priorSince.toISOString(),
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
  const since = new Date(now.getTime() - window * DAY_MS);
  const fetchSince = new Date(now.getTime() - Math.max(window, 14) * DAY_MS);
  const since14 = new Date(now.getTime() - 14 * DAY_MS);
  // Lead fetch covers BOTH the 14d sparkline and the windowed sub-line count
  // (FC1: the sub-line says "last N days", so its leads number must be windowed).
  const leadsFetchSince = since < since14 ? since : since14;

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

  const inWindow = views.filter((v) => v.createdAt >= since);
  const visitors = new Set(inWindow.map((v) => v.visitorId)).size;
  const pageviews = inWindow.length;
  const leadsTotal = leadsGrouped.reduce((a, r) => a + r._count._all, 0);
  const newLeads = leadsGrouped.find((r) => r.status === "new")?._count._all ?? 0;

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
  const leadsWindow = leadsRecent.filter((l) => l.createdAt >= since).length;
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
      stat: `${visitors} visitor${visitors === 1 ? "" : "s"} · ${window}d`,
      spark: spark((k) => viewsByDay.get(k)?.visitors.size ?? 0),
      latest: lastView ? `Latest: ${lastView.path} · ${NY_WEEKDAY_FMT.format(lastView.createdAt)}` : null,
    },
    {
      module: "traffic",
      stat: `${pageviews} pageview${pageviews === 1 ? "" : "s"} · ${window}d`,
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
      stat: `${pagesViewed} page${pagesViewed === 1 ? "" : "s"} viewed · ${window}d`,
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
  const since = new Date(now.getTime() - window * DAY_MS);

  const [allViews, firstView] = await Promise.all([
    prisma.pageView.findMany({
      where: { createdAt: { gte: since }, ...excludeInternal(internal) },
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

  // KPIs (post-cut).
  const daysByVisitor = new Map<string, Set<string>>();
  for (const v of views) {
    const set = daysByVisitor.get(v.visitorId) ?? new Set<string>();
    set.add(nyDayKey(v.createdAt));
    daysByVisitor.set(v.visitorId, set);
  }
  const visitors = daysByVisitor.size;
  // B1 — pageviews on >= 2 distinct NY calendar days in the window.
  const returnVisitors = [...daysByVisitor.values()].filter((s) => s.size >= 2).length;

  // Trend: visitors per bucket, zero-filled.
  const visitorsByBucket = new Map<string, Set<string>>();
  for (const v of views) {
    const k = bucketKey(v.createdAt, window);
    if (!visitorsByBucket.has(k)) visitorsByBucket.set(k, new Set());
    visitorsByBucket.get(k)!.add(v.visitorId);
  }
  const trend: SeriesPoint[] = windowBucketKeys(window, now).map((key) => ({
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
  const since = new Date(now.getTime() - window * DAY_MS);

  const [allViews, allEvents, firstView, firstInsightsView] = await Promise.all([
    prisma.pageView.findMany({
      where: { createdAt: { gte: since }, ...excludeInternal(internal) },
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
      where: { createdAt: { gte: since }, ...excludeInternalNullable(internal) },
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
  const views = hasCuts
    ? allViews.filter((v) => {
        if (applied.device && !dimMatches(v.device, applied.device)) return false;
        if (applied.country && !dimMatches(v.country, applied.country)) return false;
        return true;
      })
    : allViews;
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

  return {
    meta: liveMeta(internal.length),
    window,
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
  const since = new Date(now.getTime() - window * DAY_MS);

  const [dailyInWindow, queriesInWindow, countryRows, firstDaily, latestDaily] = await Promise.all([
    prisma.gscDaily.findMany({
      where: { date: { gte: since } },
      select: { date: true, impressions: true, clicks: true },
      orderBy: { date: "asc" },
      take: GSC_DAILY_ROW_CAP,
    }),
    prisma.gscQuery.findMany({
      where: { date: { gte: since } },
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
      where: { date: { gte: since } },
      select: { country: true, impressions: true, clicks: true },
      take: GSC_COUNTRY_ROW_CAP,
    }),
    prisma.gscDaily.findFirst({ orderBy: { date: "asc" }, select: { date: true } }),
    prisma.gscDaily.findFirst({ orderBy: { date: "desc" }, select: { date: true } }),
  ]);

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

  return {
    meta: liveMeta(internal.length, classifierVersions),
    window,
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

export const liveSource: AdminIqSource = {
  summary: liveSummary,
  command: liveCommand,
  landing: liveLanding,
  leadsByStatus: liveLeadsByStatus,
  traffic: liveTraffic,
  content: liveContent,
  search: liveSearch,
  leadsByInquiryType: liveLeadsByInquiryType,
};
