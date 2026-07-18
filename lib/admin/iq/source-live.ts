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
import type {
  AdminIqSource,
  BreakdownRow,
  Filters,
  IqSummary,
  SourceOpts,
  TrendBucket,
} from "./types";
import { METRICS_VERSION } from "./types";
import {
  DAY_MS,
  bucketKey,
  classifySource,
  referrerHost,
  windowBucketKeys,
} from "./shared";

// Row caps (DATA-SPEC §5.1): fetch-then-aggregate stays acceptable to ~50k
// rows/window; these caps keep a runaway window from degrading unbounded.
// Current scale is ~150 pageviews/30d — the caps are a ceiling, not a limit
// anyone hits today.
const PAGEVIEW_ROW_CAP = 50_000;
const EVENT_ROW_CAP = 50_000;
const BOOKING_ROW_CAP = 10_000;

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

export const liveSource: AdminIqSource = {
  summary: liveSummary,
};
