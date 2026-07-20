"use client";

// Dashboard Wave PHASE 2 · WP2 — the widget canvas. 12-col CSS Grid, lean
// pointer-event drag + snap (arch ruling KB:1528: NO react-grid-layout, no
// @dnd-kit — grid math only). Two hard modes (ux spec):
//
//  VIEW — pristine: widgets are today's cards/tiles, zero edit affordances,
//         content fully interactive (drills live). ≤640 stacks single-column
//         in reading order (pure CSS over the reading-sorted DOM order).
//  EDIT — the canvas declares itself: faint dotted placement grid, dashed
//         accent outlines, top grip = drag handle (keyboard: arrows move,
//         Shift+arrows resize), bottom-right resize corner, × remove, ☆ pin
//         on KPI tiles. Content is `inert` (no accidental drills). NOTHING
//         here persists — the parent owns the draft and the explicit commit.
//
// Geometry contract: entries are validated LayoutEntry[] (tombstones render
// the quiet "removed widget" card — reasons as JSX TEXT, condition 2). All
// candidate cells clamp to the bounds imported from lib/admin/iq/widgets
// (condition 3). Row heights are content-driven (grid-auto-rows) so view mode
// never clips today's cards; drag math measures the RESOLVED row tracks at
// drag start and extrapolates past the last row with a coarse unit.

import { useRef, useState } from "react";
import type { CommandKpi } from "@/lib/admin/iq/types";
import {
  GRID_COLS,
  LAYOUT_MAX_ROWS,
  MAX_FAVORITE_KPIS,
  WIDGET_MAX_H,
  WIDGET_REGISTRY,
  type LayoutEntry,
  type LayoutWidget,
  type WidgetData,
  type WidgetDataMap,
} from "@/lib/admin/iq/widgets";
import { KPI_ACCENTS, KPI_NAMES, WIDGET_MODULE_ACC, resizeFloor, sortReading } from "./canvas-lib";
import {
  ActivityRecentWidget,
  FirstsWidget,
  FunnelWidget,
  GscQueriesWidget,
  InsightsWidget,
  KpiTile,
  LeadsDonutWidget,
  ScorecardWidget,
  SourcesWidget,
  TopPagesWidget,
  TrendWidget,
  type WidgetCtx,
} from "./WidgetRenderers";

/** Coarse fallback row unit (px) for rows that do not exist yet (dropping
 * below the current last row) — design's ~100-120px row rhythm + 16 gap. */
const ROW_FALLBACK = 112;
const GRID_GAP = 16;

/** Tombstone reasons: validator tokens -> FIXED plain words (design P3 +
 * security note). Object.hasOwn lookup with a fixed fallback — the rendered
 * string is always one of these constants, never an echoed stored value. */
const TOMB_REASONS: Record<string, string> = {
  "not-an-object": "corrupted entry",
  "bad-id": "invalid widget id",
  "unknown-kind": "unknown widget type",
  "out-of-bounds": "invalid position or size",
  "invalid-config": "invalid widget settings",
};
function tombReason(reason: string): string {
  return Object.hasOwn(TOMB_REASONS, reason) ? TOMB_REASONS[reason] : "could not be restored";
}

interface DragState {
  id: string;
  mode: "move" | "resize";
  startPointer: { x: number; y: number };
  origin: { x: number; y: number; w: number; h: number };
  floor: { w: number; h: number };
  /** Measured at drag start: container left/top, column stride, row starts. */
  left: number;
  top: number;
  colStride: number;
  rowStarts: number[];
  offset: { x: number; y: number };
  cand: { x: number; y: number; w: number; h: number };
}

function widgetTitle(e: LayoutWidget): string {
  if (e.kind === "kpi" && e.config.kpiId) return KPI_NAMES[e.config.kpiId];
  if (e.kind === "leads-donut") {
    return e.config.by === "status" ? "Leads by status" : "Leads by inquiry type";
  }
  return WIDGET_REGISTRY[e.kind].title;
}

function gridVars(b: { x: number; y: number; w: number; h: number }): React.CSSProperties {
  return {
    "--gx": b.x + 1,
    "--gw": b.w,
    "--gy": b.y + 1,
    "--gh": b.h,
  } as React.CSSProperties;
}

/** Slice renderer — the per-kind switch. `data` undefined = not fetched yet
 * (freshly added widget mid-fetch) → the quiet waiting card. */
function WidgetBody({
  entry,
  data,
  ctx,
}: {
  entry: LayoutWidget;
  data: WidgetData | undefined;
  ctx: WidgetCtx;
}) {
  if (data === undefined && entry.kind !== "kpi") {
    return (
      <section className="adm-card adm-widget-nodata">
        <h2>{widgetTitle(entry)}</h2>
        <p className="adm-empty">waiting for data</p>
      </section>
    );
  }
  switch (entry.kind) {
    case "kpi":
      // Factcheck fix 1: undefined (in-flight) passes THROUGH — KpiTile
      // renders "waiting for data", never the absent-data claim.
      return <KpiTile k={data as WidgetDataMap["kpi"] | undefined} ctx={ctx} />;
    case "trend":
      return <TrendWidget data={data as WidgetDataMap["trend"]} ctx={ctx} />;
    case "funnel":
      return <FunnelWidget data={data as WidgetDataMap["funnel"]} ctx={ctx} />;
    case "scorecard":
      return <ScorecardWidget data={data as WidgetDataMap["scorecard"]} />;
    case "firsts":
      return <FirstsWidget data={data as WidgetDataMap["firsts"]} />;
    case "insights":
      return <InsightsWidget data={data as WidgetDataMap["insights"]} ctx={ctx} />;
    case "leads-donut":
      return <LeadsDonutWidget data={data as WidgetDataMap["leads-donut"]} />;
    case "top-pages":
      return <TopPagesWidget data={data as WidgetDataMap["top-pages"]} ctx={ctx} />;
    case "sources":
      return <SourcesWidget data={data as WidgetDataMap["sources"]} />;
    case "gsc-queries":
      return <GscQueriesWidget data={data as WidgetDataMap["gsc-queries"]} />;
    case "activity-recent":
      return <ActivityRecentWidget data={data as WidgetDataMap["activity-recent"]} ctx={ctx} />;
  }
}

export default function DashboardCanvas({
  entries,
  data,
  ctx,
  editing,
  favorites,
  favAtCap,
  onToggleFav,
  onRemove,
  onCommitMove,
  onCommitResize,
}: {
  entries: LayoutEntry[];
  /** Widget id → data slice. A Map on purpose (condition 4): ids are client-
   * shaped strings and a plain object would resolve "__proto__" and friends
   * through the prototype chain. */
  data: Map<string, WidgetData>;
  ctx: WidgetCtx;
  editing: boolean;
  favorites: readonly string[];
  favAtCap: boolean;
  onToggleFav: (kpiId: CommandKpi["id"]) => void;
  onRemove: (id: string) => void;
  onCommitMove: (id: string, x: number, y: number) => void;
  onCommitResize: (id: string, w: number, h: number) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const ordered = sortReading(entries);

  function measure(): { left: number; top: number; colStride: number; rowStarts: number[] } | null {
    const el = gridRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const colW = (rect.width - (GRID_COLS - 1) * GRID_GAP) / GRID_COLS;
    const tracks = cs.gridTemplateRows
      .split(" ")
      .map((t) => parseFloat(t))
      .filter((n) => Number.isFinite(n));
    const rowStarts: number[] = [0];
    for (const t of tracks) rowStarts.push(rowStarts[rowStarts.length - 1] + t + GRID_GAP);
    return { left: rect.left, top: rect.top, colStride: colW + GRID_GAP, rowStarts };
  }

  /** Pixel offset of a row start (extrapolates past the measured tracks). */
  function rowStartPx(rowStarts: number[], y: number): number {
    if (y < rowStarts.length) return rowStarts[y];
    return rowStarts[rowStarts.length - 1] + (y - rowStarts.length + 1) * ROW_FALLBACK;
  }

  /** Nearest row index for a pixel offset. */
  function nearestRow(rowStarts: number[], px: number): number {
    let best = 0;
    let bestD = Infinity;
    const MAX_EXTRA = 4; // rows past the end a drop may create
    for (let y = 0; y < rowStarts.length + MAX_EXTRA; y++) {
      const d = Math.abs(rowStartPx(rowStarts, y) - px);
      if (d < bestD) {
        bestD = d;
        best = y;
      }
    }
    return best;
  }

  function beginDrag(e: React.PointerEvent, w: LayoutWidget, mode: "move" | "resize") {
    if (!editing) return;
    const m = measure();
    if (!m) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    e.preventDefault();
    setDrag({
      id: w.i,
      mode,
      startPointer: { x: e.clientX, y: e.clientY },
      origin: { x: w.x, y: w.y, w: w.w, h: w.h },
      floor: resizeFloor(w.kind, w.w, w.h),
      left: m.left,
      top: m.top,
      colStride: m.colStride,
      rowStarts: m.rowStarts,
      offset: { x: 0, y: 0 },
      cand: { x: w.x, y: w.y, w: w.w, h: w.h },
    });
  }

  function moveDrag(e: React.PointerEvent) {
    if (!drag) return;
    const dx = e.clientX - drag.startPointer.x;
    const dy = e.clientY - drag.startPointer.y;
    if (drag.mode === "move") {
      const originLeft = drag.origin.x * drag.colStride;
      const originTop = rowStartPx(drag.rowStarts, drag.origin.y);
      const x = Math.max(
        0,
        Math.min(GRID_COLS - drag.origin.w, Math.round((originLeft + dx) / drag.colStride))
      );
      const y = Math.max(
        0,
        Math.min(LAYOUT_MAX_ROWS - drag.origin.h, nearestRow(drag.rowStarts, originTop + dy))
      );
      setDrag({ ...drag, offset: { x: dx, y: dy }, cand: { ...drag.cand, x, y } });
    } else {
      const w = Math.max(
        drag.floor.w,
        Math.min(
          GRID_COLS - drag.origin.x,
          Math.round((drag.origin.w * drag.colStride + dx) / drag.colStride)
        )
      );
      const h = Math.max(
        drag.floor.h,
        Math.min(WIDGET_MAX_H, drag.origin.h + Math.round(dy / ROW_FALLBACK))
      );
      setDrag({ ...drag, cand: { ...drag.cand, w, h } });
    }
  }

  function endDrag() {
    if (!drag) return;
    const { id, mode, cand, origin } = drag;
    setDrag(null);
    if (mode === "move") {
      if (cand.x !== origin.x || cand.y !== origin.y) onCommitMove(id, cand.x, cand.y);
    } else {
      if (cand.w !== origin.w || cand.h !== origin.h) onCommitResize(id, cand.w, cand.h);
    }
  }

  /** Keyboard placement on the grip (a11y — drag is pointer-only otherwise):
   * arrows move one cell, Shift+arrows resize one unit. */
  function gripKey(e: React.KeyboardEvent, w: LayoutWidget) {
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const s = step[e.key];
    if (!s) return;
    e.preventDefault();
    if (e.shiftKey) {
      const floor = resizeFloor(w.kind, w.w, w.h);
      const nw = Math.max(floor.w, Math.min(GRID_COLS - w.x, w.w + s[0]));
      const nh = Math.max(floor.h, Math.min(WIDGET_MAX_H, w.h + s[1]));
      if (nw !== w.w || nh !== w.h) onCommitResize(w.i, nw, nh);
    } else {
      const nx = Math.max(0, Math.min(GRID_COLS - w.w, w.x + s[0]));
      const ny = Math.max(0, Math.min(LAYOUT_MAX_ROWS - w.h, w.y + s[1]));
      if (nx !== w.x || ny !== w.y) onCommitMove(w.i, nx, ny);
    }
  }

  return (
    <div ref={gridRef} className={`adm-canvas${editing ? " is-edit" : ""}`}>
      {ordered.map((e) => {
        if (e.kind === "tombstone") {
          // Condition 2: the reason renders as a TEXT node, nothing else.
          return (
            <div key={e.i} className={`adm-widget${editing ? " is-edit" : ""}`} style={gridVars(e)}>
              <div className="adm-widget-tomb">
                <span className="adm-widget-tomb-title">Widget unavailable</span>
                <span className="adm-widget-tomb-reason">{tombReason(e.reason)}</span>
              </div>
              {editing && (
                <button
                  type="button"
                  className="adm-widget-remove"
                  aria-label="Remove this widget"
                  onClick={() => onRemove(e.i)}
                >
                  ×
                </button>
              )}
            </div>
          );
        }
        const isDragging = drag?.id === e.i && drag.mode === "move";
        // adm-widget--kpi (design P2-1): 14px radius (outline follows it) +
        // the <=1024 2-col clamp target.
        const accent =
          e.kind === "kpi"
            ? ` adm-widget--kpi ${(e.config.kpiId && KPI_ACCENTS[e.config.kpiId]) ?? ""}`
            : "";
        const title = widgetTitle(e);
        const kpiId = e.kind === "kpi" ? e.config.kpiId : undefined;
        const isFav = kpiId ? favorites.includes(kpiId) : false;
        // Module-fed widgets wear their module's accent (the [data-acc] §1b
        // lever) — the card, edit chrome and gallery swatch all agree.
        const moduleAcc = WIDGET_MODULE_ACC[e.kind] ?? undefined;
        return (
          <div
            key={e.i}
            data-acc={moduleAcc}
            className={`adm-widget${editing ? " is-edit" : ""}${isDragging ? " is-dragging" : ""}${accent}`}
            style={{
              ...gridVars(e),
              ...(isDragging
                ? { transform: `translate(${drag.offset.x}px, ${drag.offset.y}px)` }
                : undefined),
            }}
          >
            {editing && (
              <button
                type="button"
                className="adm-widget-grip"
                aria-label={`Move ${title}. Arrow keys move, Shift plus arrows resize.`}
                onPointerDown={(ev) => beginDrag(ev, e, "move")}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={(ev) => gripKey(ev, e)}
              />
            )}
            <div className="adm-widget-content" inert={editing ? true : undefined}>
              <WidgetBody entry={e} data={data.get(e.i)} ctx={ctx} />
            </div>
            {editing && kpiId && (
              <button
                type="button"
                className={`adm-widget-fav${isFav ? " is-fav" : ""}`}
                aria-pressed={isFav}
                aria-label={isFav ? `Unpin ${title} from the favorites strip` : `Pin ${title} to the favorites strip`}
                title={
                  !isFav && favAtCap
                    ? `${MAX_FAVORITE_KPIS} pinned KPIs is the cap · unpin one first`
                    : undefined
                }
                aria-disabled={!isFav && favAtCap}
                onClick={() => {
                  if (isFav || !favAtCap) onToggleFav(kpiId);
                }}
              >
                {isFav ? "★" : "☆"}
              </button>
            )}
            {editing && (
              <button
                type="button"
                className="adm-widget-remove"
                aria-label={`Remove ${title}`}
                onClick={() => onRemove(e.i)}
              >
                ×
              </button>
            )}
            {editing && (
              <span
                className="adm-widget-resize"
                aria-hidden="true"
                onPointerDown={(ev) => beginDrag(ev, e, "resize")}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />
            )}
          </div>
        );
      })}
      {drag && (
        <div className="adm-widget-ghost" style={gridVars(drag.cand)} aria-hidden="true" />
      )}
    </div>
  );
}
