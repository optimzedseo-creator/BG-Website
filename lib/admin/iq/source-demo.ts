// ADMIN-IQ — DEMO DataSource (DATA-SPEC §7.1/§7.3, Wave 4 Stage A).
//
// A deterministic, in-memory implementation of AdminIqSource. Panels/components
// are written against the interface and CANNOT tell they got demo data. Every
// payload carries meta.mode "demo"; the UI renders a persistent "DEMO DATA"
// badge (Stage B) so a screenshot can never masquerade as real numbers.
//
// ⚠ HARD RULE — NO DATABASE, EVER. This file imports NOTHING from @/lib/db (or
// @prisma/client at runtime). It is structurally incapable of touching the DB,
// so a demo row can never land in production. (Verified by review + grep.)
// The only cross-module imports are ./shared (pure guardrail machinery, no I/O),
// ./types (type-only), and ../../insights (pure content data). The pillars
// import is deliberately RELATIVE (not "@/lib/insights") to keep this module's
// dependency graph alias-free and DB-free so it can be executed and verified in
// isolation — insights.ts imports nothing and is pure data.
//
// PII firewall (DATA-SPEC §4.4): the AdminIqSource METHODS emit ONLY PII-free
// shapes (LeadAnalyticsRef etc.), EXACTLY as source-live reads the real Lead
// table but returns PII-free. The raw synthetic Lead/Activity/Booking entities
// DO carry names/emails (obviously-fictional, RFC-2606) so the SEPARATE CRM demo
// lane (lib/admin/crm/source-demo.ts) can consume them — but no PII field ever
// crosses an AdminIqSource return value here.
//
// Guardrail parity: every method routes bucketing/suppression/classification/
// insights through the SAME ./shared helpers source-live uses, so demo honesty
// behavior (denominators, "n too small", suppression, the §6b rules) is
// IDENTICAL to production and cannot drift.
//
// Determinism: a mulberry32 PRNG with a FIXED seed (DEMO_SEED). No Math.random
// anywhere. The dataset SHAPE is fully seed-determined; only the absolute
// timestamps float so the window always ends "today". Generated once, lazily,
// cached per module instance — same seed → identical dataset every cold start,
// every environment.

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
  classifySource,
  evaluateRules,
  gscDateKey,
  lastNDayKeys,
  ledgerFromFirsts,
  nyDateParts,
  priorPeriod,
  referrerHost,
  resolvePeriod,
  windowBucketKeys,
} from "./shared";
import type { Period } from "./shared";
import { pillars } from "../../insights";

// ===========================================================================
// Raw synthetic entity shapes (mirror the Prisma models' field types; Date, not
// ISO, so the copied live-semantics aggregation runs unchanged). LOCAL types —
// no @prisma/client import. Names/emails on Lead are the CRM lane's business;
// the AdminIqSource methods below never surface them.
// ===========================================================================

export interface DemoPageView {
  id: string;
  path: string;
  visitorId: string;
  referrer: string | null;
  device: string | null;
  browser: string | null;
  duration: number | null;
  country: string | null;
  createdAt: Date;
}

export interface DemoEvent {
  id: string;
  name: string; // chooser_click | cta_click | form_submit | booking
  path: string;
  visitorId: string | null;
  meta: unknown;
  createdAt: Date;
}

export interface DemoLead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  inquiryType: string;
  message: string;
  status: string;
  visitorId: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DemoActivity {
  id: string;
  leadId: string;
  type: string; // brief | booking | note | status
  body: string;
  createdAt: Date;
}

export interface DemoBooking {
  id: string;
  calendlyEventUri: string | null;
  calendlyInviteeUri: string | null;
  visitorId: string | null;
  leadId: string | null;
  scheduledAt: Date;
  createdAt: Date;
}

export interface DemoSubscriber {
  id: string;
  email: string;
  source: string;
  confirmed: boolean;
  confirmToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DemoGscQuery {
  id: string;
  date: Date;
  query: string;
  page: string;
  impressions: number;
  clicks: number;
  position: number;
  isBranded: boolean;
  brandedAmbiguous: boolean;
  isCollision: boolean;
  intentBucket: string | null;
  isGeo: boolean;
  classifierVersion: string;
}

export interface DemoGscDaily {
  id: string;
  date: Date;
  impressions: number;
  clicks: number;
}

export interface DemoGscCountryDaily {
  id: string;
  date: Date;
  country: string;
  impressions: number;
  clicks: number;
}

export interface DemoDataset {
  now: Date;
  pageViews: DemoPageView[]; // asc by createdAt
  events: DemoEvent[]; // asc by createdAt
  leads: DemoLead[]; // asc by createdAt
  activities: DemoActivity[]; // asc by createdAt
  bookings: DemoBooking[]; // asc by createdAt
  subscribers: DemoSubscriber[]; // asc by createdAt
  gscQueries: DemoGscQuery[]; // asc by date
  gscDaily: DemoGscDaily[]; // asc by date
  gscCountryDaily: DemoGscCountryDaily[]; // asc by date
}

// ===========================================================================
// Deterministic PRNG (mulberry32) + fixed seed. NO Math.random anywhere.
// ===========================================================================

/** Fixed seed — the spec date. Same seed → identical dataset, every environment. */
const DEMO_SEED = 20260718;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ===========================================================================
// Generation config (§7.6 density knob — not user-exposed; a code change under
// the same seed discipline).
// ===========================================================================

const DAYS = 120;
/** cta_click / bulk conversions are suppressed inside this trailing band so the
 *  last 7 days have ZERO cta_click — that is what makes IR3 (funnel break,
 *  chooser→cta) fire at window 7 against the recent chooser burst. An 8-day
 *  margin keeps sub-day timestamp jitter from leaking a cta into the 7d window. */
const CTA_CUTOFF_T = DAYS - 9;

const SITE_URL = "https://www.bradleygriffin.us";

const SITE_PATHS = [
  "/",
  "/executive",
  "/fractional",
  "/consulting",
  "/speaking",
  "/story",
  "/case-studies",
  "/credentials",
  "/faq",
  "/contact",
  "/insights",
  "/insights/data-analytics",
  "/insights/data-analytics/audit-is-a-blood-test",
  "/insights/digital-marketing",
  "/insights/ai-automation",
  "/insights/sales-conversion",
];

const CHOOSER_CARDS = ["executive", "fractional", "consulting", "speaking"];

// Obviously-fictional identities (DATA §7.4 / factcheck ethics gate).
const DEMO_NAMES = [
  "Dana Demo",
  "Sam Sample",
  "Riley Roleplay",
  "Casey Placeholder",
  "Alex Example",
  "Jordan Mockart",
  "Morgan Testcase",
  "Taylor Standin",
  "Jamie Fixture",
  "Quinn Sandbox",
  "Avery Dummey",
  "Robin Stubbs",
  "Skyler Fauxman",
  "Reese Prototype",
  "Frankie Filler",
  "Harley Lorem",
  "Devon Ipsum",
  "Emerson Placeholder",
  "Marlowe Sample",
  "Sidney Mockart",
  "Rowan Example",
  "Blair Testcase",
  "Kai Sandbox",
  "Lane Fixture",
  "Nico Dummey",
  "Parker Stubbs",
  "Sage Fauxman",
  "Toby Prototype",
  "Wren Filler",
  "Zara Lorem",
  "Cameron Ipsum",
  "Drew Placeholder",
  "Elliot Sample",
  "Finley Mockart",
  "Gray Testcase",
  "Hollis Sandbox",
  "Iris Fixture",
  "June Dummey",
  "Kit Stubbs",
  "Lux Fauxman",
];

const DEMO_COMPANIES: (string | null)[] = [
  "Acme Anvil Co. (Demo)",
  "Placeholder Plumbing (Demo)",
  "Example Excavation (Demo)",
  "Sample Software (Demo)",
  "Mock Manufacturing (Demo)",
  "Fixture Financial (Demo)",
  "Sandbox Systems (Demo)",
  "Dummy Dynamics (Demo)",
  "Stub Solutions (Demo)",
  "Lorem Logistics (Demo)",
  "Ipsum Industries (Demo)",
  "Faux Foods (Demo)",
  "Testcase Textiles (Demo)",
  "Prototype Partners (Demo)",
  null,
  null,
];

const DEMO_MESSAGE = "This is sample inquiry text for the demo dataset.";
const DEMO_MESSAGE_ALT =
  "Placeholder message body. Evaluating help with growth for the demo dataset.";

/** Weighted status pattern that guarantees all six statuses appear across bulk
 *  leads (new/contacted/call_booked/qualified/won/lost). */
const STATUS_CYCLE = [
  "contacted",
  "won",
  "lost",
  "qualified",
  "call_booked",
  "contacted",
  "new",
  "won",
  "qualified",
  "contacted",
  "lost",
  "call_booked",
];

const LEAD_STATUS_ORDER = ["new", "contacted", "call_booked", "qualified", "won", "lost"] as const;

// GSC classifier versions — the 2 synthetic versions (§7.3). Older GSC dates
// carry v1, newer carry v2; both fall inside the trailing-90d window so command
// reports classifierVersions = [v1, v2].
const GSC_CLASSIFIER_V1 = "v1-2026-04-01";
const GSC_CLASSIFIER_V2 = "v2-2026-07-18";

// GSC query catalog (its own population). page is a FULL URL so gscPagePath()
// resolves it exactly like live. intentBucket values are the schema's allowed
// set: hire-fractional | consulting | cost | speaking | book | informational | exec | null.
interface GscSpec {
  q: string;
  path: string;
  branded?: boolean;
  amb?: boolean;
  coll?: boolean;
  geo?: boolean;
  intent: string | null;
  imprLo: number;
  imprHi: number;
  ctr: number; // click-through rate applied to impressions (0 → never clicks)
  posLo: number;
  posHi: number;
  /** appears only every day when true; else intermittent (~55% of days). */
  daily?: boolean;
  /** total-window impressions kept tiny (< threshold) to exercise below-threshold rollups. */
  rare?: boolean;
}

const GSC_CATALOG: GscSpec[] = [
  // Branded (drives IR9 branded-echo + scorecard branded slot). Its clicks are
  // overridden by the branded-echo schedule below.
  // "bradley griffin" is the SOLE branded-click producer (ctr 0 here; its clicks
  // come from the branded-echo schedule below). The other two branded queries
  // stay click-free so ALL branded clicks are schedule-controlled and IR9's
  // 2x-echo ratio is exact.
  { q: "bradley griffin", path: "/", branded: true, intent: "informational", imprLo: 4, imprHi: 9, ctr: 0, posLo: 1, posHi: 3, daily: true },
  { q: "bradleygriffin", path: "/", branded: true, intent: "informational", imprLo: 2, imprHi: 5, ctr: 0, posLo: 1, posHi: 4, daily: true },
  { q: "bradley griffin fractional cmo", path: "/fractional", branded: true, intent: "hire-fractional", imprLo: 1, imprHi: 4, ctr: 0, posLo: 2, posHi: 6 },
  // Ambiguous + collision tags (never folded into branded/non-branded lines).
  { q: "bradley", path: "/", amb: true, intent: "informational", imprLo: 2, imprHi: 6, ctr: 0.03, posLo: 5, posHi: 20 },
  { q: "griffin marketing consultant", path: "/", coll: true, intent: "consulting", imprLo: 1, imprHi: 4, ctr: 0.02, posLo: 8, posHi: 25 },
  // Cost intent (drives IR4: >= 30 impressions in 28d).
  { q: "fractional cmo cost", path: "/rates", intent: "cost", imprLo: 2, imprHi: 4, ctr: 0.02, posLo: 4, posHi: 10, daily: true },
  { q: "fractional cmo pricing", path: "/rates", intent: "cost", imprLo: 1, imprHi: 3, ctr: 0.02, posLo: 5, posHi: 12, daily: true },
  // Zero-click page (drives IR5: /speaking >= 100 impressions, 0 clicks in 28d).
  { q: "corporate event speaker", path: "/speaking", intent: "speaking", imprLo: 2, imprHi: 5, ctr: 0, posLo: 6, posHi: 15, daily: true },
  { q: "keynote speaker michigan", path: "/speaking", geo: true, intent: "speaking", imprLo: 1, imprHi: 4, ctr: 0, posLo: 8, posHi: 18, daily: true },
  { q: "leadership keynote speaker", path: "/speaking", intent: "speaking", imprLo: 1, imprHi: 3, ctr: 0, posLo: 10, posHi: 22, daily: true },
  // Non-branded informational (first non-branded impression is one of these).
  { q: "what is a fractional cmo", path: "/insights/data-analytics/audit-is-a-blood-test", intent: "informational", imprLo: 3, imprHi: 8, ctr: 0.04, posLo: 4, posHi: 12, daily: true },
  { q: "how to increase booking rate", path: "/insights/sales-conversion", intent: "informational", imprLo: 2, imprHi: 6, ctr: 0.05, posLo: 5, posHi: 14 },
  { q: "marketing leadership advice", path: "/insights", intent: "informational", imprLo: 1, imprHi: 4, ctr: 0.03, posLo: 8, posHi: 20 },
  // Hire-fractional (geo variant tags isGeo).
  { q: "fractional cmo michigan", path: "/fractional", geo: true, intent: "hire-fractional", imprLo: 1, imprHi: 4, ctr: 0.06, posLo: 3, posHi: 9 },
  { q: "fractional chief marketing officer", path: "/fractional", intent: "hire-fractional", imprLo: 2, imprHi: 5, ctr: 0.05, posLo: 4, posHi: 11, daily: true },
  // Consulting.
  { q: "marketing audit consultant", path: "/consulting", intent: "consulting", imprLo: 2, imprHi: 6, ctr: 0.05, posLo: 4, posHi: 12, daily: true },
  { q: "data analytics audit", path: "/consulting", intent: "consulting", imprLo: 1, imprHi: 5, ctr: 0.04, posLo: 5, posHi: 14 },
  { q: "ai automation consultant", path: "/consulting", intent: "consulting", imprLo: 1, imprHi: 4, ctr: 0.03, posLo: 6, posHi: 16 },
  // Exec.
  { q: "chief marketing officer hire", path: "/executive", intent: "exec", imprLo: 1, imprHi: 4, ctr: 0.04, posLo: 5, posHi: 13 },
  { q: "interim cmo", path: "/executive", intent: "exec", imprLo: 1, imprHi: 3, ctr: 0.03, posLo: 6, posHi: 15 },
  // Book intent — kept rare so its bucket lands BELOW threshold (exercises the
  // intents below-threshold rollup).
  { q: "marketing leadership book", path: "/story", intent: "book", imprLo: 1, imprHi: 1, ctr: 0.02, posLo: 20, posHi: 40, rare: true },
];

// ===========================================================================
// The generator (§7.3). One pass, deterministic, in-memory.
// ===========================================================================

function generate(): DemoDataset {
  const rnd = mulberry32(DEMO_SEED);
  const rint = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  const chance = (p: number) => rnd() < p;
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];

  const now = new Date();
  const nowMs = now.getTime();

  const pageViews: DemoPageView[] = [];
  const events: DemoEvent[] = [];
  const leads: DemoLead[] = [];
  const activities: DemoActivity[] = [];
  const bookings: DemoBooking[] = [];
  const subscribers: DemoSubscriber[] = [];
  const gscQueries: DemoGscQuery[] = [];
  const gscDaily: DemoGscDaily[] = [];
  const gscCountryDaily: DemoGscCountryDaily[] = [];

  let vSeq = 0;
  let pvSeq = 0;
  let evSeq = 0;
  let leadSeq = 0;
  let actSeq = 0;
  let bkSeq = 0;
  const vid = () => `demo-visitor-${String(++vSeq).padStart(6, "0")}`; // 19 chars, matches VISITOR_ID_RE
  const lid = () => `demolead${String(++leadSeq).padStart(12, "0")}`; // 20 chars [a-z0-9], matches lead-id route regex

  // Day anchor: dayAnchorMs(t) is the reference instant for day index t
  // (t=DAYS-1 = today ≈ now). Sessions land at least 1h before the anchor so a
  // multi-page session never produces a future timestamp on "today".
  const dayAnchorMs = (t: number) => nowMs - (DAYS - 1 - t) * DAY_MS;
  const sessionStart = (t: number) => dayAnchorMs(t) - 3_600_000 - Math.floor(rnd() * DAY_MS * 0.8);

  const DEVICES: [string, number][] = [
    ["desktop", 0.55],
    ["mobile", 0.38],
    ["tablet", 0.07],
  ];
  const BROWSERS = ["Chrome", "Safari", "Firefox", "Edge", "Chrome", "Safari"];
  const REFERRERS: [string | null, number][] = [
    [null, 0.34],
    ["https://www.google.com/", 0.3],
    ["https://www.linkedin.com/feed/", 0.13],
    ["https://chatgpt.com/", 0.05],
    ["https://www.bing.com/", 0.06],
    ["https://duckduckgo.com/", 0.04],
    ["https://t.co/abc123", 0.04],
    ["https://www.perplexity.ai/", 0.04],
  ];
  const weightedPick = <T>(rows: [T, number][]): T => {
    const r = rnd();
    let acc = 0;
    for (const [val, w] of rows) {
      acc += w;
      if (r < acc) return val;
    }
    return rows[rows.length - 1][0];
  };

  const addView = (
    visitorId: string,
    t: number,
    path: string,
    atMs: number,
    device: string,
    browser: string,
    country: string,
    referrer: string | null
  ): DemoPageView => {
    const view: DemoPageView = {
      id: `demo-pv-${String(++pvSeq).padStart(7, "0")}`,
      path,
      visitorId,
      referrer,
      device,
      browser,
      // ~70% of pageviews report a duration → coverage ~0.70 (shows the coverage
      // label; stays well above the 40% floor so IR6 V2 never nags).
      duration: chance(0.7) ? rint(6, 240) : null,
      country,
      createdAt: new Date(atMs),
    };
    pageViews.push(view);
    return view;
  };

  const addEvent = (name: string, path: string, visitorId: string | null, atMs: number, meta: unknown) => {
    events.push({
      id: `demo-ev-${String(++evSeq).padStart(7, "0")}`,
      name,
      path,
      visitorId,
      meta,
      createdAt: new Date(atMs),
    });
  };

  // A single visitor session: a coherent journey (source → 2..n pageviews →
  // optional chooser → optional cta → optional brief). Returns pageviews count.
  interface SessionSpec {
    t: number;
    country?: string;
    referrer?: string | null;
    pathSeq?: string[];
    chooser?: boolean;
    cta?: boolean;
    brief?: boolean;
    device?: string;
  }
  const runSession = (visitorId: string, s: SessionSpec): { firstPath: string; briefAtMs: number | null } => {
    const device = s.device ?? weightedPick(DEVICES);
    const browser = pick(BROWSERS);
    const country = s.country ?? "US";
    const referrer = s.referrer !== undefined ? s.referrer : weightedPick(REFERRERS);
    const seq = s.pathSeq ?? (() => {
      const n = rint(1, 5);
      const out: string[] = [pick(SITE_PATHS)];
      for (let i = 1; i < n; i++) out.push(pick(SITE_PATHS));
      return out;
    })();
    let atMs = sessionStart(s.t);
    const firstPath = seq[0];
    for (const p of seq) {
      addView(visitorId, s.t, p, atMs, device, browser, country, referrer);
      atMs += rint(20, 300) * 1000;
    }
    if (s.chooser) {
      addEvent("chooser_click", firstPath, visitorId, atMs, { card: pick(CHOOSER_CARDS) });
      atMs += rint(20, 180) * 1000;
    }
    if (s.cta) {
      addEvent("cta_click", "/contact", visitorId, atMs, { cta: chance(0.5) ? "book-a-call" : "get-in-touch" });
      atMs += rint(20, 180) * 1000;
    }
    let briefAtMs: number | null = null;
    if (s.brief) {
      briefAtMs = atMs;
      addEvent("form_submit", "/contact", visitorId, atMs, { inquiry: "brief" });
    }
    return { firstPath, briefAtMs };
  };

  const inquiryFor = (i: number): string => {
    // Cycle the stored form values (incl. "Something Else"); one legacy value
    // seeds the donut's "Other / unset" residue slice.
    if (i === 5) return "General question"; // outside INQUIRY_TYPE_VALUES → residue
    return INQUIRY_TYPE_VALUES[i % INQUIRY_TYPE_VALUES.length];
  };

  let leadIdx = 0;
  const addLead = (opts: {
    createdAtMs: number;
    status: string;
    inquiryType?: string;
    visitorId: string | null;
    withBookingChance?: number;
  }): DemoLead => {
    const i = leadIdx++;
    const name = DEMO_NAMES[i % DEMO_NAMES.length];
    const [first, last] = name.toLowerCase().split(" ");
    const domain = chance(0.5) ? "example.com" : "example.org";
    const company = DEMO_COMPANIES[i % DEMO_COMPANIES.length];
    const phone = chance(0.5) ? `(555) 555-01${String(rint(0, 99)).padStart(2, "0")}` : null;
    const createdAt = new Date(opts.createdAtMs);
    const lead: DemoLead = {
      id: lid(),
      name,
      email: `${first}.${last}@${domain}`,
      phone,
      company,
      inquiryType: opts.inquiryType ?? inquiryFor(i),
      message: chance(0.5) ? DEMO_MESSAGE : DEMO_MESSAGE_ALT,
      status: opts.status,
      visitorId: opts.visitorId,
      source: "contact_form",
      createdAt,
      updatedAt: createdAt,
    };
    leads.push(lead);

    // Activities: always an initial "brief"; sometimes a note / status / booking.
    activities.push({
      id: `demo-act-${String(++actSeq).padStart(6, "0")}`,
      leadId: lead.id,
      type: "brief",
      body: "Contact form submitted (demo).",
      createdAt,
    });
    if (opts.status !== "new") {
      activities.push({
        id: `demo-act-${String(++actSeq).padStart(6, "0")}`,
        leadId: lead.id,
        type: "note",
        body: "Sample follow-up note for the demo dataset.",
        createdAt: new Date(opts.createdAtMs + rint(1, 40) * 3_600_000),
      });
      activities.push({
        id: `demo-act-${String(++actSeq).padStart(6, "0")}`,
        leadId: lead.id,
        type: "status",
        body: `Status set to ${opts.status.replace("_", " ")} (demo).`,
        createdAt: new Date(opts.createdAtMs + rint(41, 90) * 3_600_000),
      });
    }

    // Matched booking for some leads.
    if (opts.visitorId && chance(opts.withBookingChance ?? 0)) {
      const bkMs = opts.createdAtMs + rint(2, 96) * 3_600_000;
      bookings.push({
        id: `demo-bk-${String(++bkSeq).padStart(4, "0")}`,
        calendlyEventUri: `https://api.calendly.com/scheduled_events/demo-${bkSeq}`,
        calendlyInviteeUri: `https://api.calendly.com/scheduled_events/demo-${bkSeq}/invitees/demo`,
        visitorId: opts.visitorId,
        leadId: lead.id,
        scheduledAt: new Date(bkMs),
        createdAt: new Date(bkMs),
      });
      activities.push({
        id: `demo-act-${String(++actSeq).padStart(6, "0")}`,
        leadId: lead.id,
        type: "booking",
        body: "Calendly booking captured (demo).",
        createdAt: new Date(bkMs),
      });
    }
    return lead;
  };

  // ---- Bulk organic traffic + conversions, day by day ----------------------
  let bulkLeadCount = 0;
  for (let t = 0; t < DAYS; t++) {
    const target = (() => {
      const base = 22;
      const trend = 0.13;
      const ampWeek = 6;
      const ampMonth = 5;
      const phi = 1.1;
      const v =
        base +
        trend * t +
        ampWeek * Math.sin((2 * Math.PI * t) / 7) +
        ampMonth * Math.sin((2 * Math.PI * t) / 30 + phi) +
        (rnd() * 2 - 1) * 4;
      return Math.max(3, Math.round(v));
    })();

    let produced = 0;
    let guard = 0;
    while (produced < target && guard++ < 200) {
      const before = pvSeq;
      const roll = rnd();
      const engaged = roll < 0.18;
      const browser = roll >= 0.18 && roll < 0.5;
      const allowCta = t <= CTA_CUTOFF_T;
      runSession(vid(), {
        t,
        chooser: engaged || (browser && chance(0.5)),
        cta: engaged && allowCta,
        brief: false,
      });
      produced += pvSeq - before;
    }

    // ~One converter on ~28% of eligible (older-than-8-day) days → ~31 bulk leads.
    if (t <= CTA_CUTOFF_T && chance(0.28)) {
      const converter = vid();
      const { briefAtMs } = runSession(converter, {
        t,
        pathSeq: [pick(SITE_PATHS), pick(["/fractional", "/consulting", "/executive"]), "/contact"],
        chooser: true,
        cta: true,
        brief: true,
      });
      const status = STATUS_CYCLE[bulkLeadCount % STATUS_CYCLE.length];
      bulkLeadCount++;
      addLead({
        createdAtMs: briefAtMs ?? dayAnchorMs(t),
        status,
        visitorId: converter,
        withBookingChance: 0.5,
      });
    }
  }

  // ---- Subscribers: 14 spread across the window (first + tenth achieved) ----
  const subDayIdx: number[] = [];
  for (let k = 0; k < 14; k++) {
    subDayIdx.push(Math.min(DAYS - 4, Math.floor(((k + 0.5) / 14) * (DAYS - 4)) + rint(0, 3)));
  }
  subDayIdx.sort((a, b) => a - b);
  subDayIdx.forEach((t, k) => {
    const ms = dayAnchorMs(t) - Math.floor(rnd() * DAY_MS * 0.6);
    subscribers.push({
      id: `demo-sub-${String(k + 1).padStart(3, "0")}`,
      email: `subscriber.${k + 1}@example.org`,
      source: pick(["site", "book", "writing", "event"]),
      confirmed: chance(0.7),
      confirmToken: null,
      createdAt: new Date(ms),
      updatedAt: new Date(ms),
    });
  });

  // ---- Targeted cohorts for guaranteed rule coverage -----------------------

  // IR1 (SLA): a "new" lead aged 5 days (> 3-day threshold). Attributed: its
  // visitor has pageviews + a brief (no cta — inside the recent no-cta band).
  {
    const v = vid();
    const t = DAYS - 6; // ~5 days ago
    const { briefAtMs } = runSession(v, {
      t,
      referrer: "https://www.google.com/",
      pathSeq: ["/", "/fractional", "/contact"],
      chooser: true,
      cta: false,
      brief: true,
    });
    addLead({ createdAtMs: briefAtMs ?? dayAnchorMs(t), status: "new", inquiryType: "Fractional Leadership", visitorId: v });
  }

  // IR7 (new-lead signal) — three states in the trailing 7 days:
  //  A) attributed: stitched visitor WITH visible pre-brief pageviews.
  {
    const v = vid();
    const t = DAYS - 3; // ~2 days ago
    const { briefAtMs } = runSession(v, {
      t,
      referrer: "https://www.linkedin.com/feed/",
      pathSeq: ["/", "/consulting", "/case-studies", "/contact"],
      chooser: true,
      cta: false, // still no cta inside the 7d band (protects IR3)
      brief: true,
    });
    addLead({ createdAtMs: briefAtMs ?? dayAnchorMs(t), status: "contacted", inquiryType: "Project (Audit / AI Build)", visitorId: v });
  }
  //  B) stitched but NO visible views (visitorId set, zero pageviews for it).
  {
    const orphan = vid(); // deliberately never given any pageview/event
    addLead({ createdAtMs: nowMs - Math.floor(1.2 * DAY_MS), status: "new", inquiryType: "Full-Time Executive Role", visitorId: orphan });
  }
  //  C) cookieless: visitorId null.
  addLead({ createdAtMs: nowMs - Math.floor(1.5 * DAY_MS), status: "new", inquiryType: "Speaking Engagement", visitorId: null });

  // IR8 (evaluator): one non-lead visitor active on 4 distinct days in the last
  // 14, no brief.
  {
    const v = vid();
    for (const daysAgo of [2, 5, 9, 12]) {
      const t = DAYS - 1 - daysAgo;
      runSession(v, {
        t,
        referrer: daysAgo % 2 ? "https://www.google.com/" : null,
        pathSeq: [pick(["/fractional", "/consulting"]), pick(["/case-studies", "/story", "/credentials"])],
        chooser: chance(0.5),
        cta: false,
        brief: false,
      });
    }
  }

  // IR10 (referrer spike): a DEDICATED post path (NOT in the bulk SITE_PATHS
  // pool, so bulk traffic can't dilute the host share) gets 8 views in the last
  // 4 days, 7 of them from linkedin.com → 7/8 = 0.875 >= 0.6.
  {
    const path = "/insights/sales-conversion/booking-rate-playbook";
    for (let i = 0; i < 8; i++) {
      const v = vid();
      const t = DAYS - 1 - rint(1, 4);
      const fromLinkedIn = i < 7; // 7 of 8 from linkedin
      runSession(v, {
        t,
        referrer: fromLinkedIn ? "https://www.linkedin.com/posts/demo-booking-rate" : "https://www.google.com/",
        pathSeq: [path],
        chooser: chance(0.3),
        cta: false,
        brief: false,
      });
    }
  }

  // IR3 (funnel break at window 7): a recent chooser burst — ~12 new visitors
  // in the last 5 days who click the chooser but never a CTA (none exists in
  // 7d) and never a brief. chooser(7d) >= 12, cta(7d) = 0 → chooser→cta breaks.
  {
    for (let i = 0; i < 12; i++) {
      const v = vid();
      const t = DAYS - 1 - rint(1, 5);
      runSession(v, {
        t,
        referrer: weightedPick(REFERRERS),
        pathSeq: [pick(["/", "/fractional", "/consulting", "/executive"])],
        chooser: true,
        cta: false,
        brief: false,
      });
    }
  }

  // IR11 (milestone): first NON-US visitor lands ~3 days ago. Everything before
  // is US; a small GB/CA cluster appears in the last 3 days (also the site
  // "country n < 30" honesty slice). The FIRST of these is the earliest non-US
  // pageview ever → its first lands in the trailing 7d → IR11 fires.
  {
    // Earliest non-US pageview: a single GB visitor at ~3 days ago, timed early
    // in the day so it precedes the rest of the cluster.
    const firstGb = vid();
    runSession(firstGb, {
      t: DAYS - 4,
      country: "GB",
      device: "mobile",
      referrer: "https://www.google.com/",
      pathSeq: ["/", "/fractional"],
      chooser: false,
      cta: false,
      brief: false,
    });
    // A few more non-US visitors, kept UNDER 30 total non-US pageviews.
    for (let i = 0; i < 7; i++) {
      const v = vid();
      const t = DAYS - 1 - rint(0, 2);
      runSession(v, {
        t,
        country: chance(0.5) ? "GB" : "CA",
        referrer: weightedPick(REFERRERS),
        pathSeq: [pick(SITE_PATHS)],
        chooser: chance(0.3),
        cta: false,
        brief: false,
      });
    }
  }

  // IR2 (unmatched booking): a booking in the last few days with leadId null.
  {
    const v = vid();
    const ms = nowMs - Math.floor(2.2 * DAY_MS);
    // Give it a couple of pageviews so it reads like a real (unstitched) booking.
    runSession(v, { t: DAYS - 3, pathSeq: ["/", "/contact"], chooser: false, cta: false, brief: false });
    bookings.push({
      id: `demo-bk-${String(++bkSeq).padStart(4, "0")}`,
      calendlyEventUri: `https://api.calendly.com/scheduled_events/demo-unmatched-${bkSeq}`,
      calendlyInviteeUri: `https://api.calendly.com/scheduled_events/demo-unmatched-${bkSeq}/invitees/demo`,
      visitorId: v,
      leadId: null,
      scheduledAt: new Date(ms),
      createdAt: new Date(ms),
    });
  }

  // ---- GSC synthesis (its own population; §7.3) ----------------------------
  const utcMidNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const GSC_LAG_DAYS = 2;
  const GSC_SPAN = 116;
  const gscLatestMs = utcMidNow - GSC_LAG_DAYS * DAY_MS;

  // Branded-echo click schedule (drives IR9): current-28d ≈ 9 clicks, prior-28d
  // ≈ 2 (9 >= 2×2 and >= 5, prior >= 1), older 2 (oldest ≈ first branded click).
  // Keyed by whole days-ago, and kept off the 28/56-day boundaries so timestamp
  // jitter can never move a click across the current/prior line.
  const brandedClickDaysAgo = new Set([3, 5, 7, 10, 13, 16, 19, 22, 25, 35, 50, 70, 100]);
  const brandedClicksForDaysAgo = (d: number) => (brandedClickDaysAgo.has(d) ? 1 : 0);

  let gscSeq = 0;
  let gdSeq = 0;
  let gcSeq = 0;

  for (let i = 0; i < GSC_SPAN; i++) {
    const dateMs = gscLatestMs - (GSC_SPAN - 1 - i) * DAY_MS;
    const date = new Date(dateMs);
    const daysAgo = Math.round((utcMidNow - dateMs) / DAY_MS);
    const version = daysAgo > 60 ? GSC_CLASSIFIER_V1 : GSC_CLASSIFIER_V2;
    const risingScale = 0.8 + (0.4 * i) / GSC_SPAN; // mild rising trend over the span

    let dayVisibleImpr = 0;
    let dayVisibleClicks = 0;

    for (const spec of GSC_CATALOG) {
      if (!spec.daily && !chance(0.8)) continue; // intermittent queries
      const rawImpr = rint(spec.imprLo, spec.imprHi);
      const impressions = spec.rare ? spec.imprLo : Math.max(1, Math.round(rawImpr * risingScale));
      let clicks: number;
      if (spec.branded && spec.q === "bradley griffin") {
        clicks = brandedClicksForDaysAgo(daysAgo);
      } else if (spec.ctr === 0) {
        clicks = 0;
      } else {
        clicks = rnd() < spec.ctr * impressions ? 1 : 0;
      }
      const position = spec.posLo + rnd() * (spec.posHi - spec.posLo);
      gscQueries.push({
        id: `demo-gq-${String(++gscSeq).padStart(6, "0")}`,
        date,
        query: spec.q,
        page: SITE_URL + spec.path,
        impressions,
        clicks,
        position,
        isBranded: Boolean(spec.branded),
        brandedAmbiguous: Boolean(spec.amb),
        isCollision: Boolean(spec.coll),
        intentBucket: spec.intent,
        isGeo: Boolean(spec.geo),
        classifierVersion: version,
      });
      dayVisibleImpr += impressions;
      dayVisibleClicks += clicks;
    }

    // GscDaily property totals: pick the day's classifiable share in [0.44,0.49]
    // → guaranteed < 0.50, so the 28d aggregate < 0.50 and IR6 V1 fires while the
    // Search module shows the anonymized remainder. clicks = visible + a little
    // anonymized remainder.
    const share = 0.44 + rnd() * 0.05;
    const totalImpr = Math.max(dayVisibleImpr + 1, Math.ceil(dayVisibleImpr / share));
    gscDaily.push({
      id: `demo-gd-${String(++gdSeq).padStart(4, "0")}`,
      date,
      impressions: totalImpr,
      clicks: dayVisibleClicks + rint(0, 2),
    });

    // GscCountryDaily: usa dominant, gbr/can moderate (gbr from the earliest date
    // → first non-US impression), deu small, ind kept UNDER 30 total (the GSC
    // "n < 30" honesty slice) by appearing only in the last few days.
    const pushCountry = (country: string, impr: number, clk: number) => {
      if (impr <= 0) return;
      gscCountryDaily.push({
        id: `demo-gc-${String(++gcSeq).padStart(5, "0")}`,
        date,
        country,
        impressions: impr,
        clicks: clk,
      });
    };
    pushCountry("usa", Math.round(totalImpr * 0.78), Math.round(dayVisibleClicks * 0.8));
    pushCountry("gbr", Math.round(totalImpr * 0.12), rint(0, 1));
    pushCountry("can", Math.round(totalImpr * 0.07), rint(0, 1));
    if (chance(0.4)) pushCountry("deu", rint(1, 4), 0);
    if (daysAgo <= 6) pushCountry("ind", rint(1, 3), 0); // ~<30 total across window
  }

  // ---- Sort everything ascending (methods assume asc where they read [0]) ---
  const byCreated = (a: { createdAt: Date }, b: { createdAt: Date }) => a.createdAt.getTime() - b.createdAt.getTime();
  const byDate = (a: { date: Date }, b: { date: Date }) => a.date.getTime() - b.date.getTime();
  pageViews.sort(byCreated);
  events.sort(byCreated);
  leads.sort(byCreated);
  activities.sort(byCreated);
  bookings.sort(byCreated);
  subscribers.sort(byCreated);
  gscQueries.sort(byDate);
  gscDaily.sort(byDate);
  gscCountryDaily.sort(byDate);

  return { now, pageViews, events, leads, activities, bookings, subscribers, gscQueries, gscDaily, gscCountryDaily };
}

// Lazy, per-module-instance cache — generated once on first use.
let _dataset: DemoDataset | null = null;
/** The cached synthetic dataset (also consumed by the CRM demo lane — same
 *  entities, so a lead's CRM row and its analytics journey are the same person). */
export function getDemoDataset(): DemoDataset {
  return (_dataset ??= generate());
}

// ===========================================================================
// Pure helpers (copied from source-live so demo can reuse them WITHOUT importing
// that DB-bound module). Identical logic → identical output semantics.
// ===========================================================================

const UNKNOWN_LABEL = "(unknown)";

function dimMatches(value: string | null, want: string): boolean {
  return want === UNKNOWN_LABEL ? !value : value === want;
}

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

function referrerLabel(ref: string | null): string | null {
  if (!ref) return null;
  const host = referrerHost(ref);
  if (host) return host;
  try {
    new URL(ref);
    return null;
  } catch {
    return ref.slice(0, 60);
  }
}

function durationStat(views: { duration: number | null }[]): DurationStat {
  const reported = views.filter((v) => v.duration !== null);
  if (!reported.length) return { avgSeconds: null, reported: 0, total: views.length };
  const sum = reported.reduce((a, v) => a + Math.min(v.duration ?? 0, DURATION_DISPLAY_CAP_S), 0);
  return { avgSeconds: Math.round(sum / reported.length), reported: reported.length, total: views.length };
}

function gscPagePath(page: string): string {
  try {
    return new URL(page).pathname || "/";
  } catch {
    return page;
  }
}

function nyDayKey(date: Date): string {
  return bucketKey(date, 7);
}

function cappedDuration(d: number | null | undefined): number {
  return Math.min(d ?? 0, DURATION_DISPLAY_CAP_S);
}

function metaToChips(meta: unknown): string[] {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return [];
  return Object.entries(meta as Record<string, unknown>).map(([k, v]) => `${k}: ${String(v)}`);
}

function seriesFrom(map: Map<string, number>, keys: string[]): KpiSeriesPoint[] {
  return keys.map((date) => ({ date, n: map.get(date) ?? 0 }));
}

function priorDayKeys(window: Filters["window"], now: Date): string[] {
  return lastNDayKeys(2 * window, now).slice(0, window);
}

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

type GscRawRow = {
  query: string;
  impressions: number;
  clicks: number;
  position: number;
  isBranded: boolean;
  brandedAmbiguous: boolean;
  intentBucket: string | null;
};

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

function rollupRows(rows: { impressions: number; clicks: number }[]): BelowThresholdRollup | null {
  return rows.length
    ? { rows: rows.length, impressions: rows.reduce((a, r) => a + r.impressions, 0), clicks: rows.reduce((a, r) => a + r.clicks, 0) }
    : null;
}

/** Demo meta envelope: mode "demo", internalExcluded ALWAYS 0 (demo has no
 *  exclusion list), classifierVersions passed where the payload has a GSC panel. */
function demoMeta(classifierVersions: string[] = []): IqMeta {
  return { metricsVersion: METRICS_VERSION, classifierVersions, internalExcluded: 0, mode: "demo" };
}

const FUNNEL_STEPS: { key: FunnelStepV2["key"]; label: string; spoken: string }[] = [
  { key: "visitors", label: "Visitors", spoken: "the site" },
  { key: "chooser_click", label: "Chooser click", spoken: "the chooser" },
  { key: "cta_click", label: "CTA click", spoken: "a CTA" },
  { key: "form_submit", label: "Brief (form)", spoken: "the brief" },
  { key: "booking", label: "Booking", spoken: "a booking" },
];

const JOURNEY_EVENT_KIND: Record<string, JourneyKind> = {
  chooser_click: "chooser",
  cta_click: "cta",
  form_submit: "brief",
};

const KPI_DEFINITIONS: Record<CommandKpiId, { label: string; definition: string }> = {
  visitors: { label: "Visitors", definition: "Distinct visitor ids with a pageview that NY calendar day. Internal traffic excluded." },
  pageviews: { label: "Pageviews", definition: "Pageviews that day. Internal traffic excluded." },
  "search-clicks": {
    label: "Search clicks",
    definition: "Google Search Console property-level clicks, by GSC's stored date. GSC data lags about 2 days.",
  },
  briefs: { label: "Briefs", definition: "Server-recorded contact-form submissions (form_submit). The trusted win." },
  bookings: { label: "Bookings", definition: "Calendly bookings captured that day, by capture time, not meeting time." },
  subscribers: { label: "Subscribers", definition: "New subscriber rows that day." },
};

const NY_WEEKDAY_FMT = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" });

const FUNNEL_EVENT_ROWS = 200;
const FUNNEL_PEOPLE_ROWS = 200;
const DAY_VISITOR_ROWS = 200;
const DAY_EVENT_ROWS = 200;
const DAY_PAGE_ROWS = 25;

// ===========================================================================
// AdminIqSource methods — computed from the in-memory arrays with the SAME
// semantics as source-live (bucketing/suppression/rules via ./shared).
// ===========================================================================

async function demoSummary(filters: Filters): Promise<IqSummary> {
  const ds = getDemoDataset();
  const { window } = filters;
  const now = ds.now;
  const since = new Date(now.getTime() - window * DAY_MS);

  const allViews = ds.pageViews.filter((v) => v.createdAt >= since);
  const allEvents = ds.events.filter((e) => e.createdAt >= since);
  const allBookings = ds.bookings.filter((b) => b.createdAt >= since);

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

  const visitors = new Set(views.map((v) => v.visitorId)).size;
  const eventCount = (name: string) => events.filter((e) => e.name === name).length;
  const briefs = eventCount("form_submit");

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

  const funnel = [
    { label: "Chooser click", n: eventCount("chooser_click") },
    { label: "CTA click", n: eventCount("cta_click") },
    { label: "Brief (form)", n: briefs },
    { label: "Booking", n: bookings.length },
  ];

  const breakdowns = {
    topPages: topCounts(views.map((v) => v.path), "(unknown)"),
    topReferrers: topCounts(views.map((v) => referrerLabel(v.referrer)), "(direct)"),
    devices: topCounts(views.map((v) => v.device), "(unknown)"),
    countries: topCounts(views.map((v) => v.country), "(unknown)"),
  };

  const leadsByStatus = LEAD_STATUS_ORDER.map((status) => ({
    status,
    n: ds.leads.filter((l) => l.status === status).length,
  }));

  return {
    meta: demoMeta(),
    window,
    since: since.toISOString(),
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

async function demoCommand(filters: Filters): Promise<IqCommand> {
  const ds = getDemoDataset();
  const { window } = filters;
  const now = ds.now;
  const since = new Date(now.getTime() - window * DAY_MS);
  const priorSince = new Date(now.getTime() - 2 * window * DAY_MS);
  const since7 = new Date(now.getTime() - 7 * DAY_MS);
  const since14 = new Date(now.getTime() - RULE_EVALUATOR_WINDOW_D * DAY_MS);
  const since28 = new Date(now.getTime() - 28 * DAY_MS);
  const since56 = new Date(now.getTime() - 56 * DAY_MS);
  const since90 = new Date(now.getTime() - 90 * DAY_MS);

  const allViews = ds.pageViews;
  const allEvents = ds.events;
  const allBookings = ds.bookings;
  const subscribers = ds.subscribers;
  const leads = ds.leads;
  const gscDaily = ds.gscDaily;
  const gscQueries90 = ds.gscQueries.filter((q) => q.date >= since90);

  const findFirst = <T>(arr: T[], pred: (t: T) => boolean): T | undefined => arr.find(pred);
  const firstNonUsImpression = findFirst(ds.gscCountryDaily, (r) => r.country !== "usa" && r.impressions > 0);
  const firstNonBranded = findFirst(ds.gscQueries, (q) => !q.isBranded && !q.brandedAmbiguous && q.impressions > 0);
  const firstCostQuery = findFirst(ds.gscQueries, (q) => q.intentBucket === "cost");
  const firstBrandedClick = findFirst(ds.gscQueries, (q) => q.isBranded && q.clicks > 0);

  const views = allViews.filter((v) => v.createdAt >= since);
  const priorViews = allViews.filter((v) => v.createdAt >= priorSince && v.createdAt < since);
  const events = allEvents.filter((e) => e.createdAt >= since);
  const priorEvents = allEvents.filter((e) => e.createdAt >= priorSince && e.createdAt < since);
  const bookings = allBookings.filter((b) => b.createdAt >= since);
  const priorBookings = allBookings.filter((b) => b.createdAt >= priorSince && b.createdAt < since);

  const distinct = (ids: (string | null)[]) => new Set(ids.filter((v): v is string => v !== null)).size;
  const countEvents = (list: typeof allEvents, name: string) => list.filter((e) => e.name === name).length;

  const gscInWindow = gscDaily.filter((r) => r.date >= since);
  const gscInPrior = gscDaily.filter((r) => r.date >= priorSince && r.date < since);
  const subsInWindow = subscribers.filter((s) => s.createdAt >= since).length;
  const subsInPrior = subscribers.filter((s) => s.createdAt >= priorSince && s.createdAt < since).length;

  const kpis: CommandKpi[] = [
    { id: "visitors", label: "Visitors", n: distinct(views.map((v) => v.visitorId)), prior: distinct(priorViews.map((v) => v.visitorId)) },
    { id: "pageviews", label: "Pageviews", n: views.length, prior: priorViews.length },
    { id: "search-clicks", label: "Search clicks", n: gscInWindow.reduce((a, r) => a + r.clicks, 0), prior: gscInPrior.reduce((a, r) => a + r.clicks, 0) },
    { id: "briefs", label: "Briefs", n: countEvents(events, "form_submit"), prior: countEvents(priorEvents, "form_submit") },
    { id: "bookings", label: "Bookings", n: bookings.length, prior: priorBookings.length },
    { id: "subscribers", label: "Subscribers", n: subsInWindow, prior: subsInPrior },
  ];

  const gscThrough = gscDaily.length ? gscDateKey(gscDaily[gscDaily.length - 1].date) : null;

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

  const stepVisitors = (name: string) => distinct(events.filter((e) => e.name === name).map((e) => e.visitorId));
  const funnel: FunnelStepV2[] = FUNNEL_STEPS.map((s) => {
    if (s.key === "visitors") return { key: s.key, label: s.label, visitors: distinct(views.map((v) => v.visitorId)), events: views.length };
    if (s.key === "booking") return { key: s.key, label: s.label, visitors: distinct(bookings.map((b) => b.visitorId)), events: bookings.length };
    return { key: s.key, label: s.label, visitors: stepVisitors(s.key), events: countEvents(events, s.key) };
  });
  const funnelPairs: FunnelPair[] = funnel.slice(0, -1).map((step, i) => ({
    step: FUNNEL_STEPS[i].spoken,
    next: FUNNEL_STEPS[i + 1].spoken,
    n: step.visitors,
    nextN: funnel[i + 1].visitors,
  }));

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
    for (let i = 0; ; i++) {
      const dt = new Date(Date.UTC(y, m - 1, d - i));
      const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
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
      detail: firstNonBranded ? `"${firstNonBranded.query}"${firstNonBranded.intentBucket ? ` (intent: ${firstNonBranded.intentBucket})` : ""}` : null,
    },
    {
      id: "first-non-us-impression",
      label: "First non-US impression",
      achievedAt: firstNonUsImpression ? gscDateKey(firstNonUsImpression.date) : null,
      detail: firstNonUsImpression?.country ?? null,
    },
    { id: "first-cost-query", label: "First cost-intent query", achievedAt: firstCostQuery ? gscDateKey(firstCostQuery.date) : null, detail: firstCostQuery ? `"${firstCostQuery.query}"` : null },
    { id: "first-branded-click", label: "First branded click", achievedAt: firstBrandedClick ? gscDateKey(firstBrandedClick.date) : null, detail: firstBrandedClick ? `"${firstBrandedClick.query}"` : null },
    { id: "best-week", label: "Best week", achievedAt: recordWeek && recordWeek.best > 0 ? recordWeek.bestEndDate : null, detail: recordWeek && recordWeek.best > 0 ? `${recordWeek.best} visitors` : null },
  ];
  const firsts = ledgerFromFirsts(achieved);

  const inFit = leads.filter((l) => l.createdAt >= since90 && IN_FIT_INQUIRY_TYPES.includes(l.inquiryType)).length;
  const brandedRows90 = gscQueries90.filter((q) => q.isBranded);
  const brandedImpr90 = brandedRows90.reduce((a, q) => a + q.impressions, 0);
  const brandedClicks90 = brandedRows90.reduce((a, q) => a + q.clicks, 0);

  const attributedLeads = leads.filter((l) => l.visitorId !== null);
  const channelCounts = new Map<string, number>();
  for (const l of attributedLeads) {
    const firstTouch = firstWhere(allViews, (v) => v.visitorId === l.visitorId);
    if (!firstTouch) continue;
    const host = referrerHost(firstTouch.referrer);
    const cls = classifySource(firstTouch.referrer);
    const label = cls === "other" && host ? host : cls;
    channelCounts.set(label, (channelCounts.get(label) || 0) + 1);
  }
  const stitchedWithViews = [...channelCounts.values()].reduce((a, b) => a + b, 0);

  const scorecard: ScorecardSlot[] = [
    inFit >= SCORECARD_INFIT_GATE
      ? { id: "in-fit-inquiries", label: "In-fit inquiries", note: "trailing 90 days", unlocked: true, n: inFit }
      : { id: "in-fit-inquiries", label: "In-fit inquiries", note: "trailing 90 days", unlocked: false, gateCopy: `Unlocks at the first in-fit inquiry (fractional, project, or executive). ${inFit} so far.`, progress: inFit, target: SCORECARD_INFIT_GATE },
    brandedImpr90 >= SCORECARD_BRANDED_GATE_IMPRESSIONS
      ? { id: "branded-clicks", label: "Branded search clicks", note: "trailing 90 days", unlocked: true, n: brandedClicks90 }
      : { id: "branded-clicks", label: "Branded search clicks", note: "trailing 90 days", unlocked: false, gateCopy: `Unlocks at ${SCORECARD_BRANDED_GATE_IMPRESSIONS} branded impressions in 90 days. ${brandedImpr90} so far.`, progress: brandedImpr90, target: SCORECARD_BRANDED_GATE_IMPRESSIONS },
    stitchedWithViews >= SCORECARD_CHANNEL_GATE
      ? { id: "channel-mix", label: "First-touch channel of inquirers", note: "all leads with an attributable first touch", unlocked: true, mix: [...channelCounts.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n), mixDenominator: stitchedWithViews }
      : { id: "channel-mix", label: "First-touch channel of inquirers", note: "all leads with an attributable first touch", unlocked: false, gateCopy: `Unlocks at the first lead with an attributable first touch. ${stitchedWithViews} so far.`, progress: stitchedWithViews, target: SCORECARD_CHANNEL_GATE },
  ];

  const slaLeads: SlaLeadRef[] = leads
    .filter((l) => l.status === "new" && l.createdAt < new Date(now.getTime() - RULE_LEAD_SLA_DAYS * DAY_MS))
    .map((l) => ({ id: l.id, days: Math.floor((now.getTime() - l.createdAt.getTime()) / DAY_MS) }));

  const unmatchedBookings = bookings.filter((b) => b.leadId === null).length;

  const gsc28 = gscQueries90.filter((q) => q.date >= since28);
  const gscPrior28 = gscQueries90.filter((q) => q.date >= since56 && q.date < since28);
  const costIntentImpressions28d = gsc28.filter((q) => q.intentBucket === "cost").reduce((a, q) => a + q.impressions, 0);
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
    .map(([page, p]) => ({ path: gscPagePath(page), impressions: p.impressions, avgPosition: p.impressions ? p.posW / p.impressions : 0 }))
    .sort((a, b) => b.impressions - a.impressions);

  const durationCoverage = views.length >= RATE_MIN_DENOM ? views.filter((v) => v.duration !== null).length / views.length : null;

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
      const leadViews = stitched ? allViews.filter((v) => v.visitorId === l.visitorId && v.createdAt <= l.createdAt) : [];
      if (!leadViews.length) {
        return { id: l.id, status: l.status, attributed: false, stitched, sourceClass: null, firstPath: null, pages: 0, visits: 0 };
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
    if (topHost && topN / rec.views >= RULE_REFERRER_SPIKE_SHARE) referrerSpikes.push({ path, views: rec.views, host: topHost, hostViews: topN });
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

  const classifierVersions = [...new Set(gscQueries90.map((q) => q.classifierVersion))].sort();

  return {
    meta: demoMeta(classifierVersions),
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

async function demoLanding(filters: Filters): Promise<IqLanding> {
  const ds = getDemoDataset();
  const { window } = filters;
  const now = ds.now;
  const since = new Date(now.getTime() - window * DAY_MS);
  const fetchSince = new Date(now.getTime() - Math.max(window, 14) * DAY_MS);
  const since14 = new Date(now.getTime() - 14 * DAY_MS);

  const views = ds.pageViews.filter((v) => v.createdAt >= fetchSince);
  const leadsRecent = ds.leads.filter((l) => l.createdAt >= (since < since14 ? since : since14));
  const gscDaily14 = ds.gscDaily.filter((r) => r.date >= since14);
  const gscLatest = ds.gscDaily.length ? ds.gscDaily[ds.gscDaily.length - 1] : null;
  const latestLead = ds.leads.length ? ds.leads[ds.leads.length - 1] : null;

  const inWindow = views.filter((v) => v.createdAt >= since);
  const visitors = new Set(inWindow.map((v) => v.visitorId)).size;
  const pageviews = inWindow.length;
  const leadsTotal = ds.leads.length;
  const newLeads = ds.leads.filter((l) => l.status === "new").length;

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
    if (l.createdAt < since14) continue;
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
    { module: "overview", stat: `${visitors} visitor${visitors === 1 ? "" : "s"} · ${window}d`, spark: spark((k) => viewsByDay.get(k)?.visitors.size ?? 0), latest: lastView ? `Latest: ${lastView.path} · ${NY_WEEKDAY_FMT.format(lastView.createdAt)}` : null },
    {
      module: "traffic",
      stat: `${pageviews} pageview${pageviews === 1 ? "" : "s"} · ${window}d`,
      spark: spark((k) => viewsByDay.get(k)?.views ?? 0),
      latest: lastView ? (lastView.country ? `Latest: visitor from ${lastView.country} · ${NY_WEEKDAY_FMT.format(lastView.createdAt)}` : `Latest: visitor · ${NY_WEEKDAY_FMT.format(lastView.createdAt)}`) : null,
    },
    { module: "search", stat: gscThrough ? `${gscClicks14} click${gscClicks14 === 1 ? "" : "s"} · 14d` : "no GSC data yet", spark: spark((k) => gscByDay.get(k) ?? 0), latest: gscThrough ? `Latest: data through ${gscThrough}` : null },
    { module: "leads", stat: `${leadsTotal} lead${leadsTotal === 1 ? "" : "s"} · ${newLeads} new`, spark: spark((k) => leadsByDay.get(k) ?? 0), latest: latestLead ? `Latest: lead (${latestLead.status.replace("_", " ")}) · ${latestLead.createdAt.toISOString().slice(0, 10)}` : null },
    { module: "content", stat: `${pagesViewed} page${pagesViewed === 1 ? "" : "s"} viewed · ${window}d`, spark: spark((k) => viewsByDay.get(k)?.views ?? 0), latest: topPath ? `Top page: ${topPath}` : null },
    { module: "security", stat: `2FA on · 0 internal visitors excluded`, spark: [], latest: null },
  ];

  return {
    meta: demoMeta(),
    window,
    since: since.toISOString(),
    visitors,
    pageviews,
    leadsWindow,
    leadsTotal,
    teasers,
  };
}

async function demoLeadsByStatus(): Promise<LeadStatusCount[]> {
  const ds = getDemoDataset();
  return LEAD_STATUS_ORDER.map((status) => ({ status, n: ds.leads.filter((l) => l.status === status).length }));
}

async function demoLeadsByInquiryType(): Promise<BreakdownRow[]> {
  const ds = getDemoDataset();
  const counts = new Map<string, number>();
  let other = 0;
  for (const l of ds.leads) {
    if (INQUIRY_TYPE_VALUES.includes(l.inquiryType)) counts.set(l.inquiryType, (counts.get(l.inquiryType) || 0) + 1);
    else other += 1;
  }
  const rows: BreakdownRow[] = INQUIRY_TYPE_VALUES.map((label) => ({ label, n: counts.get(label) || 0 }));
  if (other > 0) rows.push({ label: INQUIRY_TYPE_OTHER_LABEL, n: other });
  return rows;
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

async function demoTraffic(filters: Filters): Promise<IqTraffic> {
  const ds = getDemoDataset();
  const { window } = filters;
  const now = ds.now;
  const since = new Date(now.getTime() - window * DAY_MS);

  const allViews: TrafficViewRow[] = ds.pageViews.filter((v) => v.createdAt >= since);
  const firstView = ds.pageViews[0] ?? null;

  const firstTouchClass = new Map<string, SourceClass>();
  for (const v of allViews) {
    if (!firstTouchClass.has(v.visitorId)) firstTouchClass.set(v.visitorId, classifySource(v.referrer));
  }
  const visitorsUnfiltered = firstTouchClass.size;

  const sourceVisitorCounts = new Map<string, number>();
  for (const cls of firstTouchClass.values()) sourceVisitorCounts.set(cls, (sourceVisitorCounts.get(cls) || 0) + 1);
  const chipOptions: ChipOptions = {
    devices: topCounts(allViews.map((v) => v.device), UNKNOWN_LABEL),
    countries: topCounts(allViews.map((v) => v.country), UNKNOWN_LABEL),
    sources: [...sourceVisitorCounts.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n),
  };

  const applied: AppliedCuts = { device: filters.device ?? null, country: filters.country ?? null, sourceClass: filters.sourceClass ?? null };
  const hasCuts = Boolean(applied.device || applied.country || applied.sourceClass);
  const views: TrafficViewRow[] = hasCuts
    ? allViews.filter((v) => {
        if (applied.device && !dimMatches(v.device, applied.device)) return false;
        if (applied.country && !dimMatches(v.country, applied.country)) return false;
        if (applied.sourceClass && firstTouchClass.get(v.visitorId) !== applied.sourceClass) return false;
        return true;
      })
    : allViews;

  const daysByVisitor = new Map<string, Set<string>>();
  for (const v of views) {
    const set = daysByVisitor.get(v.visitorId) ?? new Set<string>();
    set.add(nyDayKey(v.createdAt));
    daysByVisitor.set(v.visitorId, set);
  }
  const visitors = daysByVisitor.size;
  const returnVisitors = [...daysByVisitor.values()].filter((s) => s.size >= 2).length;

  const visitorsByBucket = new Map<string, Set<string>>();
  for (const v of views) {
    const k = bucketKey(v.createdAt, window);
    if (!visitorsByBucket.has(k)) visitorsByBucket.set(k, new Set());
    visitorsByBucket.get(k)!.add(v.visitorId);
  }
  const trend: SeriesPoint[] = windowBucketKeys(window, now).map((key) => ({ key, n: visitorsByBucket.get(key)?.size || 0 }));

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
        totalSeconds: reported.reduce((a, v) => a + Math.min(v.duration ?? 0, DURATION_DISPLAY_CAP_S), 0),
        reported: reported.length,
      };
    });

  return {
    meta: demoMeta(),
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

async function demoContent(filters: Filters): Promise<IqContent> {
  const ds = getDemoDataset();
  const { window } = filters;
  const now = ds.now;
  const since = new Date(now.getTime() - window * DAY_MS);

  const allViews = ds.pageViews.filter((v) => v.createdAt >= since);
  const allEvents = ds.events.filter((e) => e.createdAt >= since);
  const firstView = ds.pageViews[0] ?? null;
  const firstInsightsView = ds.pageViews.find((v) => v.path.startsWith("/insights")) ?? null;

  const visitorsUnfiltered = new Set(allViews.map((v) => v.visitorId)).size;
  const chipOptions: ChipOptions = {
    devices: topCounts(allViews.map((v) => v.device), UNKNOWN_LABEL),
    countries: topCounts(allViews.map((v) => v.country), UNKNOWN_LABEL),
    sources: [],
  };

  const applied: AppliedCuts = { device: filters.device ?? null, country: filters.country ?? null, sourceClass: null };
  const hasCuts = Boolean(applied.device || applied.country);
  const views = hasCuts
    ? allViews.filter((v) => {
        if (applied.device && !dimMatches(v.device, applied.device)) return false;
        if (applied.country && !dimMatches(v.country, applied.country)) return false;
        return true;
      })
    : allViews;
  const cohort = hasCuts ? new Set(views.map((v) => v.visitorId)) : null;
  const events = cohort ? allEvents.filter((e) => e.visitorId !== null && cohort.has(e.visitorId)) : allEvents;

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
    .map(([path, rec]) => ({ path, views: rec.views.length, visitors: rec.visitors.size, avgDuration: durationStat(rec.views), entrances: entrancesByPath.get(path) || 0 }))
    .sort((a, b) => b.views - a.views)
    .slice(0, CONTENT_PAGES_MAX);
  const pagesOmitted = Math.max(0, byPath.size - CONTENT_PAGES_MAX);

  const scopes: { slug: string; label: string; match: (p: string) => boolean }[] = [
    { slug: "index", label: "Insights index", match: (p) => p === "/insights" },
    ...pillars.map((pl) => ({ slug: pl.slug, label: pl.label, match: (p: string) => p === `/insights/${pl.slug}` || p.startsWith(`/insights/${pl.slug}/`) })),
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
    const eventVisitors = new Set(events.filter((e) => e.visitorId !== null && scope.match(e.path)).map((e) => e.visitorId));
    let engaged = 0;
    for (const [id, rec] of byVisitor) if (rec.engagedDuration || rec.n >= 2 || eventVisitors.has(id)) engaged += 1;
    return { slug: scope.slug, label: scope.label, views: scopeViews.length, visitors: byVisitor.size, engaged };
  });

  return {
    meta: demoMeta(),
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

async function demoSearch(filters: Filters): Promise<IqSearch> {
  const ds = getDemoDataset();
  const { window } = filters;
  const now = ds.now;
  const since = new Date(now.getTime() - window * DAY_MS);

  const dailyInWindow = ds.gscDaily.filter((r) => r.date >= since);
  const queriesInWindow = ds.gscQueries.filter((q) => q.date >= since);
  const countryRows = ds.gscCountryDaily.filter((r) => r.date >= since);
  const firstDaily = ds.gscDaily[0] ?? null;
  const latestDaily = ds.gscDaily.length ? ds.gscDaily[ds.gscDaily.length - 1] : null;

  const impressions = dailyInWindow.reduce((a, r) => a + r.impressions, 0);
  const clicks = dailyInWindow.reduce((a, r) => a + r.clicks, 0);
  const visibleImpressions = queriesInWindow.reduce((a, q) => a + q.impressions, 0);
  const visibleClicks = queriesInWindow.reduce((a, q) => a + q.clicks, 0);
  const brandedClicks = queriesInWindow.filter((q) => q.isBranded).reduce((a, q) => a + q.clicks, 0);
  const brandedAmbiguousClicks = queriesInWindow.filter((q) => q.brandedAmbiguous).reduce((a, q) => a + q.clicks, 0);

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

  const byBucket = new Map<string, { impressions: number; clicks: number }>();
  for (const q of queriesInWindow) {
    if (!q.intentBucket) continue;
    const rec = byBucket.get(q.intentBucket) ?? { impressions: 0, clicks: 0 };
    rec.impressions += q.impressions;
    rec.clicks += q.clicks;
    byBucket.set(q.intentBucket, rec);
  }
  const bucketRows = [...byBucket.entries()].map(([bucket, r]) => ({ bucket, ...r })).sort((a, b) => b.impressions - a.impressions);
  const intents: IntentBucketRow[] = bucketRows.filter((r) => r.impressions >= GSC_MIN_IMPRESSIONS);
  const intentsBelow = bucketRows.filter((r) => r.impressions < GSC_MIN_IMPRESSIONS);
  const intentsBelowThreshold: BelowThresholdRollup | null = intentsBelow.length
    ? { rows: intentsBelow.length, impressions: intentsBelow.reduce((a, r) => a + r.impressions, 0), clicks: intentsBelow.reduce((a, r) => a + r.clicks, 0) }
    : null;

  const queryRows = aggregateGscQueries(queriesInWindow);
  const queriesAbove = queryRows.filter((r) => r.impressions >= GSC_MIN_IMPRESSIONS);
  const queries: GscQueryRow[] = queriesAbove.slice(0, GSC_QUERY_ROWS_MAX);
  const queriesBelow = queryRows.filter((r) => r.impressions < GSC_MIN_IMPRESSIONS);
  const queriesBelowThreshold = rollupRows(queriesBelow);
  const queriesBeyondCap = rollupRows(queriesAbove.slice(GSC_QUERY_ROWS_MAX));

  const byCountry = new Map<string, { impressions: number; clicks: number }>();
  for (const r of countryRows) {
    const rec = byCountry.get(r.country) ?? { impressions: 0, clicks: 0 };
    rec.impressions += r.impressions;
    rec.clicks += r.clicks;
    byCountry.set(r.country, rec);
  }
  const countryRowsSorted = [...byCountry.entries()].map(([country, r]) => ({ country, ...r })).sort((a, b) => b.impressions - a.impressions);
  const countries: GscCountryRow[] = countryRowsSorted.slice(0, GSC_COUNTRY_ROWS_MAX);
  const countriesBeyondCap = rollupRows(countryRowsSorted.slice(GSC_COUNTRY_ROWS_MAX));

  const classifierVersions = [...new Set(queriesInWindow.map((q) => q.classifierVersion))].sort();

  return {
    meta: demoMeta(classifierVersions),
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

async function demoKpiDetail(kpiId: CommandKpiId, filters: Filters): Promise<IqKpiDetail> {
  const ds = getDemoDataset();
  const { window } = filters;
  const now = ds.now;
  const priorSince = new Date(now.getTime() - 2 * window * DAY_MS);
  const curKeys = lastNDayKeys(window, now);
  const priKeys = priorDayKeys(window, now);

  const countByDay = new Map<string, number>();
  let dataStart: string | null = null;
  let gscThrough: string | null = null;

  if (kpiId === "visitors") {
    const rows = ds.pageViews.filter((v) => v.createdAt >= priorSince);
    const setByDay = new Map<string, Set<string>>();
    for (const v of rows) {
      const k = nyDayKey(v.createdAt);
      if (!setByDay.has(k)) setByDay.set(k, new Set());
      setByDay.get(k)!.add(v.visitorId);
    }
    for (const [k, s] of setByDay) countByDay.set(k, s.size);
    dataStart = ds.pageViews[0] ? ds.pageViews[0].createdAt.toISOString() : null;
  } else if (kpiId === "pageviews") {
    for (const v of ds.pageViews.filter((v) => v.createdAt >= priorSince)) {
      const k = nyDayKey(v.createdAt);
      countByDay.set(k, (countByDay.get(k) || 0) + 1);
    }
    dataStart = ds.pageViews[0] ? ds.pageViews[0].createdAt.toISOString() : null;
  } else if (kpiId === "briefs") {
    const rows = ds.events.filter((e) => e.name === "form_submit" && e.createdAt >= priorSince);
    for (const e of rows) {
      const k = nyDayKey(e.createdAt);
      countByDay.set(k, (countByDay.get(k) || 0) + 1);
    }
    const first = ds.events.find((e) => e.name === "form_submit");
    dataStart = first ? first.createdAt.toISOString() : null;
  } else if (kpiId === "bookings") {
    for (const b of ds.bookings.filter((b) => b.createdAt >= priorSince)) {
      const k = nyDayKey(b.createdAt);
      countByDay.set(k, (countByDay.get(k) || 0) + 1);
    }
    dataStart = ds.bookings[0] ? ds.bookings[0].createdAt.toISOString() : null;
  } else if (kpiId === "subscribers") {
    for (const s of ds.subscribers.filter((s) => s.createdAt >= priorSince)) {
      const k = nyDayKey(s.createdAt);
      countByDay.set(k, (countByDay.get(k) || 0) + 1);
    }
    dataStart = ds.subscribers[0] ? ds.subscribers[0].createdAt.toISOString() : null;
  } else {
    const rows = ds.gscDaily.filter((r) => r.date >= priorSince);
    for (const r of rows) countByDay.set(gscDateKey(r.date), r.clicks);
    dataStart = ds.gscDaily[0] ? gscDateKey(ds.gscDaily[0].date) : null;
    gscThrough = ds.gscDaily.length ? gscDateKey(ds.gscDaily[ds.gscDaily.length - 1].date) : null;
  }

  const meta = KPI_DEFINITIONS[kpiId];
  return {
    meta: demoMeta(),
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

async function demoPageDetail(path: string, filters: Filters): Promise<IqPageDetail> {
  const ds = getDemoDataset();
  const { window } = filters;
  const now = ds.now;
  const since = new Date(now.getTime() - window * DAY_MS);

  const allViews = ds.pageViews.filter((v) => v.createdAt >= since);
  const firstPathView = ds.pageViews.find((v) => v.path === path) ?? null;
  const gscRows = ds.gscQueries.filter((q) => q.date >= since);
  const latestDaily = ds.gscDaily.length ? ds.gscDaily[ds.gscDaily.length - 1] : null;

  const pathViews = allViews.filter((v) => v.path === path);

  const seenVisitorDay = new Set<string>();
  let entrances = 0;
  for (const v of allViews) {
    const key = `${v.visitorId}|${nyDayKey(v.createdAt)}`;
    if (seenVisitorDay.has(key)) continue;
    seenVisitorDay.add(key);
    if (v.path === path) entrances += 1;
  }

  const hostAgg = new Map<string, { n: number; sample: string | null }>();
  for (const v of pathViews) {
    const host = referrerHost(v.referrer);
    if (!host) continue;
    const rec = hostAgg.get(host) ?? { n: 0, sample: v.referrer ?? null };
    rec.n += 1;
    hostAgg.set(host, rec);
  }
  const sources: PageSourceRow[] = [...hostAgg.entries()].map(([host, r]) => ({ host, n: r.n, sampleReferrer: r.sample })).sort((a, b) => b.n - a.n).slice(0, PAGE_SOURCE_ROWS);

  const pathVisitorLast = new Map<string, number>();
  for (const v of pathViews) pathVisitorLast.set(v.visitorId, Math.max(pathVisitorLast.get(v.visitorId) ?? 0, v.createdAt.getTime()));
  const orderedVisitorIds = [...pathVisitorLast.entries()].sort((a, b) => b[1] - a[1]).slice(0, PAGE_VISITOR_ROWS).map(([id]) => id);
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

  const visitorsByBucket = new Map<string, Set<string>>();
  for (const v of pathViews) {
    const k = bucketKey(v.createdAt, window);
    if (!visitorsByBucket.has(k)) visitorsByBucket.set(k, new Set());
    visitorsByBucket.get(k)!.add(v.visitorId);
  }
  const trend: SeriesPoint[] = windowBucketKeys(window, now).map((key) => ({ key, n: visitorsByBucket.get(key)?.size || 0 }));

  const reportedDurations = pathViews.filter((v) => v.duration !== null).map((v) => cappedDuration(v.duration));
  const maxDurationSeconds = reportedDurations.length ? Math.max(...reportedDurations) : null;

  const pageQueries = gscRows.filter((q) => gscPagePath(q.page) === path);
  const allQueryRows = aggregateGscQueries(pageQueries);
  const above = allQueryRows.filter((r) => r.impressions >= GSC_MIN_IMPRESSIONS);
  const search: PageSearchRow[] = above.slice(0, PAGE_SEARCH_ROWS);
  const below = allQueryRows.filter((r) => r.impressions < GSC_MIN_IMPRESSIONS);
  const searchBelowThreshold = rollupRows(below);
  const searchBeyondThreshold = rollupRows(above.slice(PAGE_SEARCH_ROWS));

  return {
    meta: demoMeta([...new Set(pageQueries.map((q) => q.classifierVersion))].sort()),
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

async function demoVisitorJourney(visitorId: string): Promise<IqVisitorJourney> {
  const ds = getDemoDataset();
  const views = ds.pageViews.filter((v) => v.visitorId === visitorId).slice(0, JOURNEY_ITEM_CAP);
  const evts = ds.events.filter((e) => e.visitorId === visitorId).slice(0, JOURNEY_ITEM_CAP);
  const bkgs = ds.bookings.filter((b) => b.visitorId === visitorId);
  const lead = ds.leads.find((l) => l.visitorId === visitorId) ?? null;
  const pageviewCount = ds.pageViews.filter((v) => v.visitorId === visitorId).length;
  const truncated = views.length >= JOURNEY_ITEM_CAP || evts.length >= JOURNEY_ITEM_CAP;

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
  for (const e of evts) {
    const kind = JOURNEY_EVENT_KIND[e.name];
    if (!kind) continue;
    items.push({ at: e.createdAt.toISOString(), kind, label: e.name.replace(/_/g, " "), detail: e.path, metaChips: metaToChips(e.meta) });
  }
  for (const b of bkgs) {
    items.push({ at: b.createdAt.toISOString(), kind: "booking", label: "Booking captured", detail: "Calendly booking", metaChips: [] });
  }
  items.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  const gapMs = SESSION_GAP_MINUTES * 60 * 1000;
  const sessions: JourneySession[] = [];
  for (const it of items) {
    const t = Date.parse(it.at);
    const last = sessions[sessions.length - 1];
    if (!last || t - Date.parse(last.items[last.items.length - 1].at) > gapMs) sessions.push({ startAt: it.at, items: [it] });
    else last.items.push(it);
  }

  const first = views[0] ?? null;
  const totalSeconds = views.reduce((a, v) => a + cappedDuration(v.duration), 0);
  const firstSeen = items.length ? items[0].at : null;
  const lastSeen = items.length ? items[items.length - 1].at : null;

  return {
    meta: demoMeta(),
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

async function demoActivity(filters: Filters): Promise<IqActivity> {
  const ds = getDemoDataset();
  const { window } = filters;
  const now = ds.now;
  const since = new Date(now.getTime() - window * DAY_MS);

  const views = ds.pageViews.filter((v) => v.createdAt >= since);
  const evts = ds.events.filter((e) => e.createdAt >= since);
  const bkgs = ds.bookings.filter((b) => b.createdAt >= since);
  const firstView = ds.pageViews[0] ?? null;

  const rows: ActivityRow[] = [];
  const sourceCounts = new Map<string, number>();
  for (const v of views) {
    const cls = classifySource(v.referrer);
    sourceCounts.set(cls, (sourceCounts.get(cls) || 0) + 1);
    rows.push({ key: `pv-${v.id}`, at: v.createdAt.toISOString(), kind: "pageview", path: v.path, visitorId: v.visitorId, shortId: v.visitorId.slice(0, 8), sourceClass: cls, metaChips: [], hasVisitorId: true });
  }
  const eventKinds: ActivityKind[] = ["chooser_click", "cta_click", "form_submit"];
  for (const e of evts) {
    if (!eventKinds.includes(e.name as ActivityKind)) continue;
    rows.push({ key: `ev-${e.id}`, at: e.createdAt.toISOString(), kind: e.name as ActivityKind, path: e.path, visitorId: e.visitorId, shortId: e.visitorId ? e.visitorId.slice(0, 8) : null, sourceClass: null, metaChips: metaToChips(e.meta), hasVisitorId: e.visitorId !== null });
  }
  for (const b of bkgs) {
    rows.push({ key: `bk-${b.id}`, at: b.createdAt.toISOString(), kind: "booking", path: null, visitorId: b.visitorId, shortId: b.visitorId ? b.visitorId.slice(0, 8) : null, sourceClass: null, metaChips: [], hasVisitorId: b.visitorId !== null });
  }

  const kindCounts = new Map<ActivityKind, number>();
  for (const r of rows) kindCounts.set(r.kind, (kindCounts.get(r.kind) || 0) + 1);
  const kindOrder: ActivityKind[] = ["pageview", "chooser_click", "cta_click", "form_submit", "booking"];
  const kinds = kindOrder.filter((k) => (kindCounts.get(k) || 0) > 0).map((kind) => ({ kind, n: kindCounts.get(kind) || 0 }));
  const sources: BreakdownRow[] = [...sourceCounts.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);

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
    meta: demoMeta(),
    window,
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

async function demoGscDetail(kind: GscDetailKind, queryArg: string | null, filters: Filters): Promise<IqGscDetail> {
  const ds = getDemoDataset();
  const { window } = filters;
  const now = ds.now;
  const { period, range } = resolvePeriod(filters, now);
  const since = period.since;
  const until = period.until;

  const firstDaily = ds.gscDaily[0] ?? null;
  const latestDaily = ds.gscDaily.length ? ds.gscDaily[ds.gscDaily.length - 1] : null;
  const base = { window, range, gscSince: firstDaily ? gscDateKey(firstDaily.date) : null, gscThrough: latestDaily ? gscDateKey(latestDaily.date) : null };

  if (kind === "query") {
    const q = queryArg ?? "";
    const rows = ds.gscQueries.filter((r) => r.query === q && r.date >= since && r.date < until);
    const daily = new Map<string, { clicks: number; impressions: number; posW: number }>();
    for (const r of rows) {
      const key = gscDateKey(r.date);
      const rec = daily.get(key) ?? { clicks: 0, impressions: 0, posW: 0 };
      rec.clicks += r.clicks;
      rec.impressions += r.impressions;
      rec.posW += r.position * r.impressions;
      daily.set(key, rec);
    }
    const dailyPoints: GscQueryDayPoint[] = [...daily.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, r]) => ({ date, clicks: r.clicks, impressions: r.impressions, position: r.impressions ? r.posW / r.impressions : 0 }));
    const byPage = new Map<string, { clicks: number; impressions: number; posW: number }>();
    for (const r of rows) {
      const path = gscPagePath(r.page);
      const rec = byPage.get(path) ?? { clicks: 0, impressions: 0, posW: 0 };
      rec.clicks += r.clicks;
      rec.impressions += r.impressions;
      rec.posW += r.position * r.impressions;
      byPage.set(path, rec);
    }
    const pages: GscQueryPageRow[] = [...byPage.entries()].map(([path, r]) => ({ path, clicks: r.clicks, impressions: r.impressions, position: r.impressions ? r.posW / r.impressions : 0 })).sort((a, b) => b.impressions - a.impressions);
    const clicks = rows.reduce((a, r) => a + r.clicks, 0);
    const impressions = rows.reduce((a, r) => a + r.impressions, 0);
    const posW = rows.reduce((a, r) => a + r.position * r.impressions, 0);
    return {
      kind: "query",
      meta: demoMeta([...new Set(rows.map((r) => r.classifierVersion))].sort()),
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

  const queriesInWindow = ds.gscQueries.filter((q) => q.date >= since && q.date < until);
  const dailyInWindow = ds.gscDaily.filter((r) => r.date >= since && r.date < until);
  const classifierVersions = [...new Set(queriesInWindow.map((q) => q.classifierVersion))].sort();
  const meta = demoMeta(classifierVersions);

  if (kind === "branded") {
    const byDate = new Map<string, { branded: number; nonBranded: number }>();
    for (const q of queriesInWindow) {
      const key = gscDateKey(q.date);
      const rec = byDate.get(key) ?? { branded: 0, nonBranded: 0 };
      if (q.isBranded) rec.branded += q.clicks;
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
    return { kind: "classifiable", meta, ...base, points, visibleImpressions: queriesInWindow.reduce((a, q) => a + q.impressions, 0), totalImpressions: dailyInWindow.reduce((a, r) => a + r.impressions, 0) };
  }

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
  return { kind: "intent", meta, ...base, buckets, belowThreshold: rollupRows(belowBuckets) };
}

async function demoFunnelStep(stepKey: FunnelStepKey, filters: Filters): Promise<IqFunnelStep> {
  const ds = getDemoDataset();
  const { window } = filters;
  const now = ds.now;
  const { period, range } = resolvePeriod(filters, now);
  const prior = priorPeriod(period);

  const idx = FUNNEL_STEPS.findIndex((s) => s.key === stepKey);
  const stepDef = FUNNEL_STEPS[idx];
  const nextDef = idx >= 0 && idx < FUNNEL_STEPS.length - 1 ? FUNNEL_STEPS[idx + 1] : null;

  const lo = prior.since;
  const hi = period.until;
  const views = ds.pageViews.filter((v) => v.createdAt >= lo && v.createdAt < hi);
  const evts = ds.events.filter((e) => ["chooser_click", "cta_click", "form_submit"].includes(e.name) && e.createdAt >= lo && e.createdAt < hi);
  const bkgs = ds.bookings.filter((b) => b.createdAt >= lo && b.createdAt < hi);

  type StepRow = { visitorId: string | null; path: string | null; meta: unknown; at: Date };
  const rowsFor = (key: FunnelStepKey): StepRow[] => {
    if (key === "visitors") return views.map((v) => ({ visitorId: v.visitorId, path: v.path, meta: null, at: v.createdAt }));
    if (key === "booking") return bkgs.map((b) => ({ visitorId: b.visitorId, path: null, meta: null, at: b.createdAt }));
    return evts.filter((e) => e.name === key).map((e) => ({ visitorId: e.visitorId, path: e.path, meta: e.meta, at: e.createdAt }));
  };

  const inCur = (d: Date) => d >= period.since && d < period.until;
  const inPri = (d: Date) => d >= prior.since && d < period.since;

  const allStepRows = rowsFor(stepKey);
  const curStepRows = allStepRows.filter((r) => inCur(r.at));
  const nextVisitorSet = new Set((nextDef ? rowsFor(nextDef.key).filter((r) => inCur(r.at)) : []).map((r) => r.visitorId).filter((v): v is string => v !== null));

  const distinctVisitors = new Set(curStepRows.map((r) => r.visitorId).filter((v): v is string => v !== null));
  const reachedNext = nextDef ? [...distinctVisitors].filter((id) => nextVisitorSet.has(id)).length : 0;

  const perPerson = new Map<string, number>();
  for (const r of curStepRows) if (r.visitorId) perPerson.set(r.visitorId, (perPerson.get(r.visitorId) || 0) + 1);
  const peopleAll = [...perPerson.entries()].sort((a, b) => b[1] - a[1]);
  const people: FunnelPersonRow[] = peopleAll.slice(0, FUNNEL_PEOPLE_ROWS).map(([id, count]) => ({ visitorId: id, shortId: id.slice(0, 8), count, reachedNext: nextDef ? nextVisitorSet.has(id) : null }));

  const eventsSorted = [...curStepRows].sort((a, b) => b.at.getTime() - a.at.getTime());
  const eventsList: FunnelEventRow[] = eventsSorted.slice(0, FUNNEL_EVENT_ROWS).map((r) => ({ at: r.at.toISOString(), path: r.path, visitorId: r.visitorId, shortId: r.visitorId ? r.visitorId.slice(0, 8) : null, metaChips: metaToChips(r.meta) }));

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
    meta: demoMeta(),
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

async function demoDayDetail(dayKey: string, _filters: Filters): Promise<IqDayDetail> {
  const ds = getDemoDataset();
  const dayStart = new Date(Date.parse(`${dayKey}T00:00:00Z`));
  const lo = new Date(dayStart.getTime() - 2 * DAY_MS);
  const hi = new Date(dayStart.getTime() + 2 * DAY_MS);
  const views = ds.pageViews.filter((v) => v.createdAt >= lo && v.createdAt < hi);
  const evts = ds.events.filter((e) => e.createdAt >= lo && e.createdAt < hi);
  const bkgs = ds.bookings.filter((b) => b.createdAt >= lo && b.createdAt < hi);
  const gscDailyRow = ds.gscDaily.find((r) => r.date.getTime() === dayStart.getTime()) ?? null;

  const dayViews = views.filter((v) => nyDayKey(v.createdAt) === dayKey);
  const perVisitor = new Map<string, { views: number; device: string | null; country: string | null }>();
  for (const v of dayViews) {
    const rec = perVisitor.get(v.visitorId) ?? { views: 0, device: v.device, country: v.country };
    rec.views += 1;
    perVisitor.set(v.visitorId, rec);
  }
  const visitorAll = [...perVisitor.entries()].sort((a, b) => b[1].views - a[1].views);
  const visitorList: DayVisitorRow[] = visitorAll.slice(0, DAY_VISITOR_ROWS).map(([id, r]) => ({ visitorId: id, shortId: id.slice(0, 8), views: r.views, device: r.device, country: r.country }));
  const pages: BreakdownRow[] = topCounts(dayViews.map((v) => v.path), UNKNOWN_LABEL, DAY_PAGE_ROWS);

  const eventKinds: ActivityKind[] = ["chooser_click", "cta_click", "form_submit"];
  const dayEventsAll: DayEventRow[] = [];
  for (const e of evts) {
    if (nyDayKey(e.createdAt) !== dayKey) continue;
    if (!eventKinds.includes(e.name as ActivityKind)) continue;
    dayEventsAll.push({ at: e.createdAt.toISOString(), kind: e.name as ActivityKind, path: e.path, visitorId: e.visitorId, shortId: e.visitorId ? e.visitorId.slice(0, 8) : null, metaChips: metaToChips(e.meta) });
  }
  for (const b of bkgs) {
    if (nyDayKey(b.createdAt) !== dayKey) continue;
    dayEventsAll.push({ at: b.createdAt.toISOString(), kind: "booking", path: null, visitorId: b.visitorId, shortId: b.visitorId ? b.visitorId.slice(0, 8) : null, metaChips: [] });
  }
  dayEventsAll.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  let gsc: IqDayDetail["gsc"] = null;
  if (gscDailyRow) {
    const qrows = ds.gscQueries
      .filter((q) => q.date.getTime() === dayStart.getTime())
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, GSC_QUERY_ROWS_MAX);
    gsc = {
      impressions: gscDailyRow.impressions,
      clicks: gscDailyRow.clicks,
      queries: qrows.map((q) => ({ query: q.query, clicks: q.clicks, impressions: q.impressions, position: q.position, isBranded: q.isBranded, brandedAmbiguous: q.brandedAmbiguous, intentBucket: q.intentBucket })),
    };
  }

  return {
    meta: demoMeta(),
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

// The SourceOpts arg is accepted for interface parity but ignored: demo has no
// internal-exclusion list (meta.internalExcluded is always 0).
export const demoSource: AdminIqSource = {
  summary: (filters, _opts: SourceOpts) => demoSummary(filters),
  command: (filters, _opts: SourceOpts) => demoCommand(filters),
  landing: (filters, _opts: SourceOpts) => demoLanding(filters),
  leadsByStatus: () => demoLeadsByStatus(),
  traffic: (filters, _opts: SourceOpts) => demoTraffic(filters),
  content: (filters, _opts: SourceOpts) => demoContent(filters),
  search: (filters, _opts: SourceOpts) => demoSearch(filters),
  leadsByInquiryType: () => demoLeadsByInquiryType(),
  kpiDetail: (kpiId, filters, _opts: SourceOpts) => demoKpiDetail(kpiId, filters),
  pageDetail: (path, filters, _opts: SourceOpts) => demoPageDetail(path, filters),
  visitorJourney: (visitorId, _opts: SourceOpts) => demoVisitorJourney(visitorId),
  activity: (filters, _opts: SourceOpts) => demoActivity(filters),
  gscDetail: (kind, query, filters, _opts: SourceOpts) => demoGscDetail(kind, query, filters),
  funnelStep: (stepKey, filters, _opts: SourceOpts) => demoFunnelStep(stepKey, filters),
  dayDetail: (dayKey, filters, _opts: SourceOpts) => demoDayDetail(dayKey, filters),
};
