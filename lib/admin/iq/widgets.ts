// Dashboard Wave PHASE 2 · WP1 — widget registry + untrusted-layout validator.
//
// THE WIDGET CONTRACT (webdev sketch, KB 2026-07-18):
//  - WidgetKind is a closed whitelist. Every kind has exactly one WidgetDef
//    here: title, default/min grid size, the source method that feeds it, and
//    a PURE selector over that method's EXISTING payload (IqCommand today).
//    No widget introduces a new data-fetch path — a widget is a VIEW over a
//    payload the surface already computes (arch ruling: fetch fan-out is the
//    biggest Phase-2 risk; the batched endpoint dedups by sourceMethod).
//  - Layout JSON is UNTRUSTED ON READ (security ruling): it round-trips
//    through the DB and the client, so every consumer runs validateLayout().
//    Invalid entries degrade to TOMBSTONES — a keyed, sized, inert shape the
//    canvas can render as "removed widget" — never a throw, never a crash.
//  - Registry + validator live in ONE module on purpose: a new kind cannot be
//    added without the compiler demanding its selector, its sizes, and its
//    config rule (WIDGET_REGISTRY is a mapped type over WidgetDataMap).
//
// PII: selectors only ever see lib/admin/iq/types.ts payloads, which are
// PII-free by construction — nothing here can widen that surface.

import type {
  CommandKpi,
  CommandKpiId,
  FirstEntry,
  FunnelStepV2,
  IqCommand,
  IqInsightCard,
  ScorecardSlot,
  TrendBucket,
} from "./types";

// ---- KPI id whitelist (exhaustive over CommandKpiId) ------------------------
// Record<CommandKpiId, true> forces a compile error if the union ever grows
// without this list following — the favorites cap and the kpi-widget config
// validator both depend on it. (The WP3.2 kpi route keeps its own local copy;
// both derive from the same CommandKpiId union.)

const KPI_ID_SET: Record<CommandKpiId, true> = {
  visitors: true,
  pageviews: true,
  "search-clicks": true,
  briefs: true,
  bookings: true,
  subscribers: true,
};

export const COMMAND_KPI_IDS = Object.keys(KPI_ID_SET) as readonly CommandKpiId[];

/** Favorites cap — the strip is a pin row, not a second dashboard. Lives in
 * THIS (client-safe) contract module so the WP2 canvas can import it; the
 * server-only favorites module re-exports it (one copy, no drift). */
export const MAX_FAVORITE_KPIS = 6;

export function isCommandKpiId(v: unknown): v is CommandKpiId {
  // Object.hasOwn, not `in` (security F1): `in` walks the prototype chain, so
  // "toString"/"constructor"/"__proto__" would pass the whitelist.
  return typeof v === "string" && Object.hasOwn(KPI_ID_SET, v);
}

// ---- Widget kinds + per-widget data slices ---------------------------------

/** What each widget kind's selector returns — the value in the batched
 * endpoint's keyed map. Adding a kind HERE is what forces the registry entry. */
export interface WidgetDataMap {
  /** One KPI tile (config.kpiId). null = the payload had no such KPI (renders
   * as "unavailable", never throws). Carries the honest `comparison`. */
  kpi: CommandKpi | null;
  /** The Command trend series (axis granularity rides the response PeriodEcho). */
  trend: TrendBucket[];
  /** B7 unique-visitor funnel. */
  funnel: FunnelStepV2[];
  /** UX §2.7 three-slot scorecard. */
  scorecard: ScorecardSlot[];
  /** Firsts ledger + its "counting since" caption input. */
  firsts: { firsts: FirstEntry[]; countingSince: string | null };
  /** Fired insight cards + armed-rule count (the calm empty-strip card). */
  insights: { insights: IqInsightCard[]; ruleCount: number };
}

export type WidgetKind = keyof WidgetDataMap;

/** Union of all widget data slices (the batched response's map value type). */
export type WidgetData = WidgetDataMap[WidgetKind];

/** Per-widget config. Only `kpi` uses it today (which KPI the tile shows);
 * every other kind normalizes to {}. Unknown keys are DROPPED on validation —
 * config is persisted JSON and must never become a junk drawer. */
export interface WidgetConfig {
  kpiId?: CommandKpiId;
}

/** Source methods the batched endpoint may call. The initial widget set all
 * rides `command` (one payload already drives the whole surface, DATA §4.1);
 * this union grows in later WPs (traffic, search, …) and the endpoint's
 * dedup-by-method guarantee is what keeps that growth safe. */
export type WidgetSourceMethod = "command";

export interface WidgetSize {
  w: number;
  h: number;
}

/**
 * One widget definition. `select` is PURE: payload in, slice out — no I/O, no
 * clock, no mutation (the endpoint calls each source method once and fans the
 * one payload out to every widget that rides it).
 */
export interface WidgetDef<K extends WidgetKind = WidgetKind> {
  kind: K;
  title: string;
  /** Grid units — 12-col canvas, coarse row unit (design spec KB 1540). */
  defaultSize: WidgetSize;
  /** Advisory minimum for the WP2 canvas edit mode (KPI-class 3 cols,
   * module-class 4). validateLayout does NOT enforce these — they are UI
   * ergonomics, not safety bounds. */
  minSize: WidgetSize;
  sourceMethod: WidgetSourceMethod;
  select(payload: IqCommand, config: WidgetConfig): WidgetDataMap[K];
}

/** The registry — mapped over WidgetDataMap so it is EXHAUSTIVE by
 * construction: a new WidgetKind without a def (or a def whose selector
 * returns the wrong slice) is a compile error. */
export const WIDGET_REGISTRY: { [K in WidgetKind]: WidgetDef<K> } = {
  kpi: {
    kind: "kpi",
    title: "KPI tile",
    defaultSize: { w: 3, h: 1 },
    minSize: { w: 3, h: 1 },
    sourceMethod: "command",
    select: (payload, config) => payload.kpis.find((k) => k.id === config.kpiId) ?? null,
  },
  trend: {
    kind: "trend",
    title: "Visitors trend",
    defaultSize: { w: 8, h: 3 },
    minSize: { w: 4, h: 2 },
    sourceMethod: "command",
    select: (payload) => payload.trend,
  },
  funnel: {
    kind: "funnel",
    title: "Funnel",
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 4, h: 2 },
    sourceMethod: "command",
    select: (payload) => payload.funnel,
  },
  scorecard: {
    kind: "scorecard",
    title: "Scorecard",
    defaultSize: { w: 6, h: 2 },
    minSize: { w: 4, h: 2 },
    sourceMethod: "command",
    select: (payload) => payload.scorecard,
  },
  firsts: {
    kind: "firsts",
    title: "Firsts ledger",
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 4, h: 2 },
    sourceMethod: "command",
    select: (payload) => ({ firsts: payload.firsts, countingSince: payload.countingSince }),
  },
  insights: {
    kind: "insights",
    title: "Insights",
    defaultSize: { w: 6, h: 2 },
    minSize: { w: 4, h: 2 },
    sourceMethod: "command",
    select: (payload) => ({ insights: payload.insights, ruleCount: payload.ruleCount }),
  },
};

export const WIDGET_KINDS = Object.keys(WIDGET_REGISTRY) as readonly WidgetKind[];

export function isWidgetKind(v: unknown): v is WidgetKind {
  // Object.hasOwn, not `in` (security F1): a "constructor" kind must never
  // pass validateLayout and persist.
  return typeof v === "string" && Object.hasOwn(WIDGET_REGISTRY, v);
}

// ---- Layout shape + bounds --------------------------------------------------

/** 12-col grid (design spec KB 1540 — module-card rhythm). */
export const GRID_COLS = 12;
/** Hard per-layout widget cap — bounds validator work and canvas render cost. */
export const LAYOUT_MAX_WIDGETS = 40;
/** Vertical ceiling in row units (y + h must fit under it). Generous — a real
 * layout is ~10 rows; this only exists so hostile JSON can't demand a
 * million-row canvas. */
export const LAYOUT_MAX_ROWS = 200;
/** Tallest single widget, row units. */
export const WIDGET_MAX_H = 24;

// Leading "__" rejected (security P3): ids like "__proto__"/"__defineGetter__"
// are already neutralized by the null-proto/Map bracing everywhere they are
// keyed, but there is no legitimate id shaped like that — belt on top of
// braces. (No stored layouts predate this rule.)
const WIDGET_ID_RE = /^(?!__)[A-Za-z0-9_-]{1,64}$/;

export function isWidgetId(v: unknown): v is string {
  return typeof v === "string" && WIDGET_ID_RE.test(v);
}

/** One valid placed widget. */
export interface LayoutWidget {
  i: string;
  kind: WidgetKind;
  x: number;
  y: number;
  w: number;
  h: number;
  config: WidgetConfig;
}

/** An invalid entry, degraded — keyed and sized so the canvas can render an
 * inert "this widget could not be restored" cell instead of crashing or
 * silently losing grid space. `reason` is a short machine-ish token, safe to
 * render, never echoes the offending value. */
export interface LayoutTombstone {
  i: string;
  kind: "tombstone";
  x: number;
  y: number;
  w: number;
  h: number;
  reason: string;
}

export type LayoutEntry = LayoutWidget | LayoutTombstone;

/** A validated layout — what every reader gets back, whatever was stored. */
export interface DashboardLayout {
  widgets: LayoutEntry[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function intIn(v: unknown, min: number, max: number): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null;
}

/** Per-kind config validation. Returns null when the config is invalid FOR
 * THAT KIND (→ tombstone); non-object/absent config normalizes tolerantly. */
export function validateWidgetConfig(kind: WidgetKind, raw: unknown): WidgetConfig | null {
  if (kind === "kpi") {
    if (!isRecord(raw) || !isCommandKpiId(raw.kpiId)) return null;
    return { kpiId: raw.kpiId };
  }
  // Every other kind carries no config; whatever was stored normalizes to {}.
  return {};
}

/** Clamp helper for tombstone geometry: keep the entry's footprint when it was
 * sane so the canvas doesn't reflow, else fall back to a small safe cell. */
function tombstone(i: string, raw: unknown, reason: string): LayoutTombstone {
  const r = isRecord(raw) ? raw : {};
  const x = intIn(r.x, 0, GRID_COLS - 1) ?? 0;
  let w = intIn(r.w, 1, GRID_COLS) ?? 3;
  if (x + w > GRID_COLS) w = GRID_COLS - x;
  const y = intIn(r.y, 0, LAYOUT_MAX_ROWS - 1) ?? 0;
  let h = intIn(r.h, 1, WIDGET_MAX_H) ?? 1;
  if (y + h > LAYOUT_MAX_ROWS) h = LAYOUT_MAX_ROWS - y;
  return { i, kind: "tombstone", x, y, w, h, reason };
}

/**
 * THE untrusted-layout validator (security ruling: layout JSON is untrusted on
 * read — it comes back from the DB and, on save, from the client). NEVER
 * throws. Guarantees on the result:
 *  - every entry is a LayoutWidget (whitelisted kind, integer geometry inside
 *    the grid bounds, kind-validated config) or a LayoutTombstone;
 *  - `i` values are unique, non-empty, WIDGET_ID_RE (no leading "__");
 *  - at most LAYOUT_MAX_WIDGETS entries (excess entries are DROPPED, not
 *    tombstoned — a hostile 10k-entry array must not produce 10k tombstones).
 * minSize is deliberately NOT enforced here (advisory, UI-owned).
 */
export function validateLayout(raw: unknown): DashboardLayout {
  const rawWidgets: unknown[] = isRecord(raw) && Array.isArray(raw.widgets) ? raw.widgets : [];
  const out: LayoutEntry[] = [];
  const seen = new Set<string>();

  for (let idx = 0; idx < rawWidgets.length && out.length < LAYOUT_MAX_WIDGETS; idx++) {
    const entry = rawWidgets[idx];
    // Key: the entry's own id when valid and unused, else a synthesized one —
    // a tombstone still needs a stable, unique map/react key.
    const ownId = isRecord(entry) && isWidgetId(entry.i) && !seen.has(entry.i) ? entry.i : null;
    const i = ownId ?? `entry-${idx}`;
    seen.add(i);

    if (!isRecord(entry)) {
      out.push(tombstone(i, entry, "not-an-object"));
      continue;
    }
    if (ownId === null) {
      out.push(tombstone(i, entry, "bad-id"));
      continue;
    }
    if (!isWidgetKind(entry.kind)) {
      out.push(tombstone(i, entry, "unknown-kind"));
      continue;
    }
    const x = intIn(entry.x, 0, GRID_COLS - 1);
    const y = intIn(entry.y, 0, LAYOUT_MAX_ROWS - 1);
    const w = intIn(entry.w, 1, GRID_COLS);
    const h = intIn(entry.h, 1, WIDGET_MAX_H);
    if (x === null || y === null || w === null || h === null || x + w > GRID_COLS || y + h > LAYOUT_MAX_ROWS) {
      out.push(tombstone(i, entry, "out-of-bounds"));
      continue;
    }
    const config = validateWidgetConfig(entry.kind, entry.config);
    if (config === null) {
      out.push(tombstone(i, entry, "invalid-config"));
      continue;
    }
    out.push({ i, kind: entry.kind, x, y, w, h, config });
  }
  return { widgets: out };
}

/** Write-path variant: valid widgets only. Tombstones (and anything that
 * degraded to one) are DROPPED before persisting — the DB stores only shapes
 * validateLayout would pass whole, so tombstones exist to absorb DRIFT (a kind
 * removed from the whitelist later, a hand-edited row), not to round-trip. */
export function cleanLayoutForWrite(raw: unknown): { widgets: LayoutWidget[] } {
  return { widgets: validateLayout(raw).widgets.filter((e): e is LayoutWidget => e.kind !== "tombstone") };
}

// ---- Batched-endpoint wire shapes (POST /admin/api/iq/widgets) --------------

/** Most widgets one batched request may name. A request is a VIEW of one
 * layout PLUS the favorites-strip synthetics (api LOW-1: a full 40-widget
 * layout with 6 pins must never silently truncate). */
export const WIDGETS_REQUEST_MAX = LAYOUT_MAX_WIDGETS + MAX_FAVORITE_KPIS;

/** One requested widget: which instance (i), which kind, which config.
 * Geometry never travels here — the endpoint selects data, it does not place. */
export interface WidgetRequestItem {
  i: string;
  kind: WidgetKind;
  config: WidgetConfig;
}

/**
 * Parse the request's `widgets` value. Returns null when the value is not an
 * array or exceeds WIDGETS_REQUEST_MAX (→ opaque 400: a request that oversized
 * is malformed, not a layout with a few bad entries). Individual bad items
 * land in `invalid` (by their id when it parses, else "#<index>") and are
 * skipped — the map answer stays useful for every valid widget.
 */
export function parseWidgetRequest(
  raw: unknown
): { valid: WidgetRequestItem[]; invalid: string[] } | null {
  if (!Array.isArray(raw) || raw.length > WIDGETS_REQUEST_MAX) return null;
  const valid: WidgetRequestItem[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  raw.forEach((entry, idx) => {
    if (!isRecord(entry) || !isWidgetId(entry.i) || seen.has(entry.i)) {
      // Always "#<idx>" here (fix 5): the entry's id is junk, missing, or a
      // DUPLICATE — and a duplicate's id belongs to the first occurrence,
      // which may be serving data. One id must never appear in both
      // `widgets` and `invalid`.
      invalid.push(`#${idx}`);
      return;
    }
    seen.add(entry.i);
    if (!isWidgetKind(entry.kind)) {
      invalid.push(entry.i);
      return;
    }
    const config = validateWidgetConfig(entry.kind, entry.config);
    if (config === null) {
      invalid.push(entry.i);
      return;
    }
    valid.push({ i: entry.i, kind: entry.kind, config });
  });
  return { valid, invalid };
}
