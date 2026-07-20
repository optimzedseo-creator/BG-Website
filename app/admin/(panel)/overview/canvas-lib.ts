// Dashboard Wave PHASE 2 · WP2 — canvas library: the built-in Command layout,
// the add-widget gallery catalog, and the PURE grid math (collision, push-down,
// vertical compaction, first-open-slot). No React, no I/O — everything here is
// harness-testable and shared by the server page and the client island.
//
// CONTRACT (Ph2-WP2 binding condition 3): every kind/size/config rule is
// IMPORTED from lib/admin/iq/widgets — nothing is re-declared here. This module
// only ARRANGES contract shapes; it never widens them.

import {
  COMMAND_KPI_IDS,
  GRID_COLS,
  LAYOUT_MAX_ROWS,
  WIDGET_MAX_H,
  WIDGET_REGISTRY,
  type LayoutEntry,
  type LayoutWidget,
  type WidgetConfig,
  type WidgetKind,
  type WidgetRequestItem,
} from "@/lib/admin/iq/widgets";
import type { CommandKpiId } from "@/lib/admin/iq/types";

// ---- request-item helpers (shared: server page initial fetch, client island) --

/** Synthetic request-id prefix for favorites-strip KPIs (not layout members). */
export const FAV_PREFIX = "fav-";

export function layoutItems(entries: LayoutEntry[]): WidgetRequestItem[] {
  return entries
    .filter((e): e is LayoutWidget => e.kind !== "tombstone")
    .map((e) => ({ i: e.i, kind: e.kind, config: e.config }));
}

export function favItems(favs: readonly CommandKpiId[]): WidgetRequestItem[] {
  return favs.map((k) => ({ i: `${FAV_PREFIX}${k}`, kind: "kpi" as const, config: { kpiId: k } }));
}

/** Module accent per widget kind (the [data-acc] lever, §1b): a module-fed
 * widget wears its module's accent on the canvas and in the gallery. null =
 * inherit the Overview blue. */
export const WIDGET_MODULE_ACC: Record<WidgetKind, string | null> = {
  kpi: null,
  trend: null,
  funnel: null,
  scorecard: null,
  firsts: null,
  insights: null,
  "leads-donut": "leads",
  "top-pages": "content",
  sources: "traffic",
  "gsc-queries": "search",
  "activity-recent": null,
};

// ---- per-metric accents + descriptions (shared: KPI tiles, gallery) ---------
// (Moved from CommandView so the gallery and the renderers read ONE copy.)

export const KPI_ACCENTS: Record<string, string> = {
  visitors: "adm-kpi--blue",
  pageviews: "adm-kpi--cyan",
  "search-clicks": "adm-kpi--purple",
  briefs: "adm-kpi--pink",
  bookings: "adm-kpi--green",
  subscribers: "adm-kpi--amber",
};

export const KPI_TOOLTIPS: Record<string, string> = {
  visitors: "Distinct visitor ids with a pageview in the period. Internal traffic excluded.",
  pageviews: "Pageviews in the period. Internal traffic excluded.",
  "search-clicks":
    "Google Search Console property-level clicks, charted by their stored date. The data lags about 2 days.",
  briefs: "Server-recorded contact-form submissions (form_submit). The trusted win.",
  bookings: "Calendly bookings captured in the period, by capture time, not meeting time.",
  subscribers: "New subscriber rows in the period.",
};

/** Display names for the KPI gallery entries (match the payload labels the
 * live source emits — source-live.ts kpis array). */
export const KPI_NAMES: Record<CommandKpiId, string> = {
  visitors: "Visitors",
  pageviews: "Pageviews",
  "search-clicks": "Search clicks",
  briefs: "Briefs",
  bookings: "Bookings",
  subscribers: "Subscribers",
};

// ---- the built-in Command layout ---------------------------------------------
// MUST reproduce today's Command surface content exactly (WP2 brief): the
// six-tile KPI strip, then Insights, Daily trend, Wins funnel, Scorecard,
// Firsts as full-width cards, in that reading order. A fresh DB (zero
// Dashboard rows) renders THIS — the current dashboard, unchanged.
//
// Geometry notes: KPI tiles ride w=2 (6 across on the 12-col grid — today's
// strip). That is BELOW the registry's advisory minSize (w=3, gallery-add
// default); the resize floor honors "min(minSize, current)" so the built-in
// tiles stay legal (minSize is advisory by design, KB:1667). The stack is
// compaction-stable: compact() returns it byte-identical.

export const BUILT_IN_COMMAND_LAYOUT: LayoutWidget[] = [
  ...COMMAND_KPI_IDS.map((id, idx) => ({
    i: `kpi-${id}`,
    kind: "kpi" as const,
    x: idx * 2,
    y: 0,
    w: 2,
    h: 1,
    config: { kpiId: id },
  })),
  { i: "insights", kind: "insights", x: 0, y: 1, w: 12, h: 2, config: {} },
  { i: "trend", kind: "trend", x: 0, y: 3, w: 12, h: 3, config: {} },
  { i: "funnel", kind: "funnel", x: 0, y: 6, w: 12, h: 3, config: {} },
  { i: "scorecard", kind: "scorecard", x: 0, y: 9, w: 12, h: 2, config: {} },
  { i: "firsts", kind: "firsts", x: 0, y: 11, w: 12, h: 3, config: {} },
];

// ---- add-widget gallery catalog ---------------------------------------------

export interface GalleryItem {
  /** Preferred widget id (suffixed on collision — newWidgetId). */
  id: string;
  kind: WidgetKind;
  config: WidgetConfig;
  name: string;
  /** One line: what the widget shows (§5.9 gallery entry). */
  desc: string;
  /** Accent class applied to the entry's swatch (re-derives --acc via the D1
   * rule); "" inherits the module accent (overview blue). */
  accentClass: string;
  /** Module accent for the swatch's [data-acc] hook; undefined inherits. */
  acc?: string;
  group: string;
}

const OVERVIEW_DESCS: Record<
  Exclude<WidgetKind, "kpi" | "leads-donut" | "top-pages" | "sources" | "gsc-queries" | "activity-recent">,
  string
> = {
  trend: "Visitors and wins over the active period.",
  funnel: "Distinct visitors through chooser, CTA, brief and booking steps.",
  scorecard: "The three gated scorecard numbers with their meters.",
  firsts: "The firsts ledger with its counting-since caption.",
  insights: "Insight cards that fired, or the armed-rule count when quiet.",
};

function moduleEntry(kind: WidgetKind, desc: string, group: string): GalleryItem {
  return {
    id: kind,
    kind,
    config: {},
    name: WIDGET_REGISTRY[kind].title,
    desc,
    accentClass: "",
    acc: WIDGET_MODULE_ACC[kind] ?? undefined,
    group,
  };
}

/** Grouped by module accent (design §5.9). Group order is display order:
 * KPI tiles, then the lead donuts (Brad asked for these twice — they sit
 * high), then the Overview modules, then the module-fed widgets. */
export const GALLERY: GalleryItem[] = [
  ...COMMAND_KPI_IDS.map((id) => ({
    id: `kpi-${id}`,
    kind: "kpi" as const,
    config: { kpiId: id },
    name: KPI_NAMES[id],
    desc: KPI_TOOLTIPS[id] ?? "",
    accentClass: KPI_ACCENTS[id] ?? "adm-kpi--blue",
    group: "KPI tiles",
  })),
  {
    id: "leads-donut-inquiry",
    kind: "leads-donut" as const,
    config: { by: "inquiryType" as const },
    name: "Leads by inquiry type",
    desc: "Donut of every lead by what they asked for. All-time counts.",
    accentClass: "",
    acc: "leads",
    group: "Lead charts",
  },
  {
    id: "leads-donut-status",
    kind: "leads-donut" as const,
    config: { by: "status" as const },
    name: "Leads by status",
    desc: "Donut of every lead by pipeline status. All-time counts.",
    accentClass: "",
    acc: "leads",
    group: "Lead charts",
  },
  ...(Object.keys(OVERVIEW_DESCS) as (keyof typeof OVERVIEW_DESCS)[]).map((kind) =>
    moduleEntry(kind, OVERVIEW_DESCS[kind], "Overview modules")
  ),
  moduleEntry("sources", "Referrers and first-touch sources for the active period.", "Traffic"),
  moduleEntry("top-pages", "The most-viewed pages in the active period.", "Content"),
  moduleEntry(
    "gsc-queries",
    "Top Search Console queries in the active period. The data lags about 2 days.",
    "Search"
  ),
  moduleEntry("activity-recent", "The newest visitor activity in the active period.", "Activity"),
];

/** Is a widget matching this gallery entry already on the canvas? (kpi entries
 * match by kpiId and leads-donut entries by `by`, not id — a hand-edited row
 * keeps its id but still counts. Other kinds carry no config axis, where both
 * sides are undefined and the equalities hold trivially.) */
export function galleryItemPresent(entries: LayoutEntry[], item: GalleryItem): boolean {
  return entries.some(
    (e) =>
      e.kind === item.kind &&
      (e as LayoutWidget).config?.kpiId === item.config.kpiId &&
      (e as LayoutWidget).config?.by === item.config.by
  );
}

/** A free id for a new widget: the gallery id, suffixed while taken. */
export function newWidgetId(base: string, entries: LayoutEntry[]): string {
  const taken = new Set(entries.map((e) => e.i));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const id = `${base}-${n}`;
    if (!taken.has(id)) return id;
  }
}

// ---- grid math (pure) --------------------------------------------------------

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function boxesCollide(a: Box, b: Box): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

/** Reading order: top-to-bottom, then left-to-right — the ≤640 stack order and
 * the DOM order (mobile stacking is pure CSS over this order). */
export function sortReading<T extends Box>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.y - b.y || a.x - b.x);
}

/**
 * Push every entry that overlaps `moved` straight down below it, cascading
 * (classic grid gravity). O(n²) sweeps over a ≤LAYOUT_MAX_WIDGETS list —
 * bounded and cheap. Returns a NEW array (entries are copied on write).
 */
export function pushDown<T extends LayoutEntry>(entries: T[], movedId: string): T[] {
  const out = entries.map((e) => ({ ...e }));
  const moved = out.find((e) => e.i === movedId);
  if (!moved) return out;
  // Sweep until stable: any entry overlapping an already-settled entry drops
  // below it. Settle order: the moved widget first, then reading order.
  const settled: LayoutEntry[] = [moved];
  const rest = sortReading(out.filter((e) => e.i !== movedId));
  for (const e of rest) {
    let guard = 0;
    for (;;) {
      const hit = settled.find((s) => boxesCollide(s, e));
      if (!hit || guard++ > LAYOUT_MAX_ROWS) break;
      e.y = Math.min(hit.y + hit.h, LAYOUT_MAX_ROWS - e.h);
      if (e.y + e.h >= LAYOUT_MAX_ROWS) break; // floor — cannot push further
    }
    settled.push(e);
  }
  return out;
}

/** Vertical compaction: in reading order, pull every entry up as far as it
 * goes without colliding with an already-placed entry. Deterministic; the
 * built-in layout is a fixed point. Returns a NEW array. */
export function compactLayout<T extends LayoutEntry>(entries: T[]): T[] {
  const placed: Box[] = [];
  return sortReading(entries.map((e) => ({ ...e }))).map((e) => {
    let y = e.y;
    while (y > 0 && !placed.some((p) => boxesCollide(p, { ...e, y: y - 1 }))) y--;
    const next = { ...e, y };
    placed.push(next);
    return next;
  });
}

/** Move one widget to a target cell, resolve overlaps (push-down), compact. */
export function placeWidget<T extends LayoutEntry>(
  entries: T[],
  id: string,
  x: number,
  y: number
): T[] {
  const out = entries.map((e) => (e.i === id ? { ...e, x, y } : { ...e }));
  return compactLayout(pushDown(out, id));
}

/** Resize one widget (already-clamped spans), resolve overlaps, compact. */
export function resizeWidget<T extends LayoutEntry>(
  entries: T[],
  id: string,
  w: number,
  h: number
): T[] {
  const out = entries.map((e) => (e.i === id ? { ...e, w, h } : { ...e }));
  return compactLayout(pushDown(out, id));
}

/** First open slot that fits `size`, scanning rows top-down then left-right
 * (the gallery's click-to-add placement — no drag required, ux spec). */
export function firstOpenSlot(
  entries: LayoutEntry[],
  size: { w: number; h: number }
): { x: number; y: number } {
  const w = Math.min(size.w, GRID_COLS);
  const h = Math.min(size.h, WIDGET_MAX_H);
  for (let y = 0; y + h <= LAYOUT_MAX_ROWS; y++) {
    for (let x = 0; x + w <= GRID_COLS; x++) {
      const box = { x, y, w, h };
      if (!entries.some((e) => boxesCollide(e, box))) return { x, y };
    }
  }
  return { x: 0, y: LAYOUT_MAX_ROWS - h }; // unreachable in practice (cap 40)
}

/** The resize floor for one widget: the registry's ADVISORY minSize, relaxed
 * to the widget's size at drag start so below-advisory built-ins (the w=2 KPI
 * strip) never get trapped bigger than they began. */
export function resizeFloor(kind: WidgetKind, startW: number, startH: number): { w: number; h: number } {
  const min = WIDGET_REGISTRY[kind].minSize;
  return { w: Math.min(min.w, startW), h: Math.min(min.h, startH) };
}
