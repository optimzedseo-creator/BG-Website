"use client";

import { useEffect, useRef, useState } from "react";
import DemoBadge from "../iq/DemoBadge";
import type {
  CommandKpiId,
  IqCommand,
  IqMeta,
  PeriodEcho,
} from "@/lib/admin/iq/types";
import type { DashboardRecord } from "@/lib/admin/iq/dashboards";
import { buildIqQuery } from "@/lib/admin/iq/shared";
import {
  MAX_FAVORITE_KPIS,
  WIDGETS_REQUEST_MAX,
  WIDGET_REGISTRY,
  type LayoutEntry,
  type LayoutWidget,
  type WidgetData,
  type WidgetDataMap,
  type WidgetRequestItem,
} from "@/lib/admin/iq/widgets";
import {
  deleteDashboard,
  saveDashboard,
  setDefaultDashboard,
  setFavoriteKpis,
} from "./dashboard-actions";
import { fmtDay } from "../fmt";
import { subscribePeriodRefetch, type PeriodSignal } from "../period-bus";
import ControlStrip from "./ControlStrip";
import DashboardCanvas from "./DashboardCanvas";
import AddWidgetModal from "./AddWidgetModal";
import ViewMenu from "./ViewMenu";
import {
  BUILT_IN_COMMAND_LAYOUT,
  compactLayout,
  firstOpenSlot,
  newWidgetId,
  placeWidget,
  resizeWidget,
  type GalleryItem,
} from "./canvas-lib";
import { KpiTile, PERIOD_NOUN, type WidgetCtx } from "./WidgetRenderers";
import type { IqWidgetsResponse } from "@/app/admin/api/iq/widgets/route";

/*
 * Dashboard Wave PHASE 2 · WP2 — the Command surface is now the WIDGET CANVAS.
 *
 * View mode renders the active layout (?view=<id> → that saved view; else the
 * default dashboard per the condition-1 reader; else the BUILT-IN Command
 * layout, which reproduces the pre-canvas surface exactly). Edit mode is an
 * explicit-commit draft: nothing persists until Save (Cancel restores).
 *
 * DATA PATH: one batched POST /admin/api/iq/widgets per period flip — the
 * canvas posts its whole widget set (+ favorites synthetics) and receives a
 * keyed slice map + the single PeriodEcho authority (arch KB:1527). The
 * initial render selects slices from the server-rendered payload via the SAME
 * registry selectors (condition 3 — lib/admin/iq/widgets is the one contract).
 *
 * URL: the island stays the single canonical-URL owner (api A4/A5). The writer
 * now PRESERVES &view= (condition 5) by layering it over buildIqQuery's
 * period grammar — view never joins parsePeriodParam (it is a layout selector,
 * validated server-side by isDashboardId only).
 *
 * Client id-keyed state lives in Maps (condition 4 — layout/dashboard ids
 * admit "__proto__"). Dashboard names + tombstone reasons render as JSX text
 * nodes only (condition 2).
 */

/** Synthetic request-id prefix for favorites-strip KPIs (not layout members). */
const FAV_PREFIX = "fav-";

function layoutItems(entries: LayoutEntry[]): WidgetRequestItem[] {
  return entries
    .filter((e): e is LayoutWidget => e.kind !== "tombstone")
    .map((e) => ({ i: e.i, kind: e.kind, config: e.config }));
}

function favItems(favs: readonly CommandKpiId[]): WidgetRequestItem[] {
  return favs.map((k) => ({ i: `${FAV_PREFIX}${k}`, kind: "kpi" as const, config: { kpiId: k } }));
}

/** Select every requested slice from a full command payload (initial render —
 * same selectors the batched endpoint runs). */
function selectFromPayload(payload: IqCommand, items: WidgetRequestItem[]): Map<string, WidgetData> {
  const map = new Map<string, WidgetData>();
  for (const it of items) map.set(it.i, WIDGET_REGISTRY[it.kind].select(payload, it.config));
  return map;
}

type NameDialog = { mode: "first-save" | "save-as" } | null;

export default function CommandView({
  initial,
  initialParams,
  dashboards: initialDashboards,
  activeViewId,
  defaultId: initialDefaultId,
  favorites: initialFavorites,
}: {
  initial: IqCommand;
  initialParams: PeriodSignal;
  dashboards: DashboardRecord[];
  /** Valid ?view= id that matched a record (server-validated via isDashboardId
   * + existence); null = the default view. */
  activeViewId: string | null;
  defaultId: string | null;
  favorites: CommandKpiId[];
}) {
  // ---- period + payload-authority state (Phase 1 behavior, unchanged) ------
  const [params, setParams] = useState<PeriodSignal>(initialParams);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<IqMeta>(initial.meta);
  const [echo, setEcho] = useState<PeriodEcho>(initial.period);
  const seqRef = useRef(0);

  // ---- views + favorites + layout state ------------------------------------
  const [dashboards, setDashboards] = useState<DashboardRecord[]>(initialDashboards);
  const [viewId, setViewId] = useState<string | null>(activeViewId);
  const [defaultId, setDefaultId] = useState<string | null>(initialDefaultId);
  const [favs, setFavs] = useState<CommandKpiId[]>(initialFavorites);

  // ---- edit-mode draft (explicit commit — nothing persists until Save) -----
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<LayoutEntry[]>([]);
  const [draftFavs, setDraftFavs] = useState<CommandKpiId[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [nameDialog, setNameDialog] = useState<NameDialog>(null);
  const [nameVal, setNameVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  // api LOW-3 / ux P3-d: id of a first-save dashboard whose CREATE succeeded
  // but whose default flip failed — a retry must only re-flip, never re-create.
  const [pendingFirstSaveId, setPendingFirstSaveId] = useState<string | null>(null);

  // Period-independent payload facts, captured once (they never move with the
  // period): the counting-since date, the GSC through-date.
  const staticRef = useRef({ countingSince: initial.countingSince, gscThrough: initial.gscThrough });

  function viewEntries(list: DashboardRecord[], vid: string | null, did: string | null): LayoutEntry[] {
    const rec =
      (vid ? list.find((d) => d.id === vid) : null) ??
      (did ? list.find((d) => d.id === did) : null);
    return rec ? rec.layout.widgets : BUILT_IN_COMMAND_LAYOUT;
  }
  const activeEntries = viewEntries(dashboards, viewId, defaultId);
  const shownEntries = editing ? draft : activeEntries;

  // ---- widget data map (condition 4: a Map, never a plain object) ----------
  const [dataMap, setDataMap] = useState<Map<string, WidgetData>>(() =>
    selectFromPayload(initial, [
      ...layoutItems(viewEntries(initialDashboards, activeViewId, initialDefaultId)),
      ...favItems(initialFavorites),
    ])
  );

  // Latest state for the (single) bus subscription AND for fetchMissing
  // (api LOW-2: a fetch fired in the seq gap must ride the LATEST params).
  const stateRef = useRef({ shownEntries, favs, viewId, params });
  stateRef.current = { shownEntries, favs, viewId, params };

  // ---- canonical URL (single-owner writer; condition 5: &view= preserved) --
  function canonicalQs(s: PeriodSignal, vid: string | null): string {
    const q = new URLSearchParams(buildIqQuery(s.window, {}, s));
    if (vid) q.set("view", vid);
    return q.toString();
  }
  function writeUrl(s: PeriodSignal, vid: string | null) {
    const qs = canonicalQs(s, vid);
    window.history.replaceState(null, "", `/admin/overview${qs ? `?${qs}` : ""}${window.location.hash}`);
  }

  // ---- the batched fetch ---------------------------------------------------
  async function postWidgets(
    items: WidgetRequestItem[],
    s: PeriodSignal
  ): Promise<IqWidgetsResponse | "redirect"> {
    const res = await fetch("/admin/api/iq/widgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        widgets: items.slice(0, WIDGETS_REQUEST_MAX),
        p: String(s.window),
        period: s.period,
        compare: s.compareMode,
        from: s.from,
        to: s.to,
        cmpFrom: s.cmpFrom,
        cmpTo: s.cmpTo,
      }),
    });
    if (res.redirected && new URL(res.url).pathname.startsWith("/admin/login")) {
      window.location.assign("/admin/login");
      return "redirect";
    }
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as IqWidgetsResponse;
  }

  useEffect(() => {
    // ONE refetch path (top-bar window flips AND the strip's calendar picks):
    // one batched POST per period flip, whole-map replace on success (stale
    // slices from the previous period must never survive a flip).
    return subscribePeriodRefetch(async (s: PeriodSignal) => {
      const id = ++seqRef.current;
      setParams(s);
      setLoading(true);
      setError(null);
      const { shownEntries: entries, favs: f, viewId: vid } = stateRef.current;
      const items = [...layoutItems(entries), ...favItems(f)];
      try {
        if (items.length === 0) {
          // Empty dashboard edge: nothing to fetch, but the head sub-line still
          // needs the payload echo — ride the existing GET (same one-payload
          // cost; the batched endpoint's echo requires >=1 widget).
          const qs = buildIqQuery(s.window, {}, s);
          const res = await fetch(`/admin/api/iq${qs ? `?${qs}` : ""}`, { cache: "no-store" });
          if (res.redirected && new URL(res.url).pathname.startsWith("/admin/login")) {
            window.location.assign("/admin/login");
            return;
          }
          if (!res.ok) throw new Error(String(res.status));
          const payload = (await res.json()) as IqCommand;
          if (id !== seqRef.current) return;
          setMeta(payload.meta);
          setEcho(payload.period);
          setDataMap(new Map());
        } else {
          const payload = await postWidgets(items, s);
          if (payload === "redirect") return;
          if (id !== seqRef.current) return;
          // Object.entries reads OWN keys only — safe bridge from wire JSON to
          // the Map (condition 4).
          setDataMap(new Map(Object.entries(payload.widgets)));
          if (payload.meta) setMeta(payload.meta);
          if (payload.period) setEcho(payload.period);
        }
        writeUrl(s, stateRef.current.viewId);
      } catch {
        if (id !== seqRef.current) return;
        setError("Could not refresh. The numbers below are from the previous selection.");
      } finally {
        if (id === seqRef.current) setLoading(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Fetch slices for widgets the map does not carry yet (gallery adds, view
   * switches) under the CURRENT params; merged only if no period flip landed
   * in between (seq guard). */
  async function fetchMissing(items: WidgetRequestItem[]) {
    const missing = items.filter((it) => !dataMap.has(it.i));
    if (missing.length === 0) return;
    const startSeq = seqRef.current;
    try {
      const payload = await postWidgets(missing, stateRef.current.params);
      if (payload === "redirect" || startSeq !== seqRef.current) return;
      setDataMap((prev) => {
        const next = new Map(prev);
        for (const [k, v] of Object.entries(payload.widgets)) next.set(k, v);
        return next;
      });
    } catch {
      // Missing slices render the quiet waiting card; the next period flip
      // refetches everything anyway.
    }
  }

  // ---- view switching ------------------------------------------------------
  function selectView(vid: string | null) {
    setViewId(vid);
    writeUrl(params, vid);
    const entries = viewEntries(dashboards, vid, defaultId);
    void fetchMissing(layoutItems(entries));
  }

  // ---- edit mode -----------------------------------------------------------
  function startEdit() {
    setDraft(activeEntries.map((e) => ({ ...e })));
    setDraftFavs([...favs]);
    setEditError(null);
    setEditing(true);
  }
  function cancelEdit() {
    setEditing(false);
    setDraft([]);
    setGalleryOpen(false);
    setNameDialog(null);
    setPendingFirstSaveId(null);
    // If a period flip landed MID-EDIT, the map was refetched for the draft
    // set — widgets the draft had removed (and Cancel just restored) need
    // their slices back.
    void fetchMissing(layoutItems(activeEntries));
  }
  function addWidget(g: GalleryItem) {
    const id = newWidgetId(g.id, draft);
    const size = WIDGET_REGISTRY[g.kind].defaultSize;
    const slot = firstOpenSlot(draft, size);
    const w: LayoutWidget = { i: id, kind: g.kind, x: slot.x, y: slot.y, w: size.w, h: size.h, config: g.config };
    setDraft(compactLayout([...draft, w]));
    void fetchMissing([{ i: id, kind: g.kind, config: g.config }]);
  }
  function removeWidget(id: string) {
    setDraft(compactLayout(draft.filter((e) => e.i !== id)));
  }
  function toggleFav(kpiId: CommandKpiId) {
    setDraftFavs((prev) =>
      prev.includes(kpiId)
        ? prev.filter((k) => k !== kpiId)
        : prev.length >= MAX_FAVORITE_KPIS
          ? prev
          : [...prev, kpiId]
    );
  }

  async function commitFavorites(next: CommandKpiId[]): Promise<boolean> {
    if (next.join("|") === favs.join("|")) return true;
    const res = await setFavoriteKpis(next);
    if ("error" in res) {
      setEditError(res.error);
      return false;
    }
    setFavs(res.favorites);
    void fetchMissing(favItems(res.favorites));
    return true;
  }

  async function saveEdit() {
    setBusy(true);
    setEditError(null);
    try {
      const target =
        (viewId ? dashboards.find((d) => d.id === viewId) : null) ??
        (defaultId ? dashboards.find((d) => d.id === defaultId) : null);
      if (!target) {
        // Editing the built-in Command layout: the save NAMES it first (it
        // becomes a real dashboard and the default view).
        setNameVal("My dashboard");
        setNameDialog({ mode: "first-save" });
        return;
      }
      const res = await saveDashboard(target.name, { widgets: draft }, target.id);
      if ("error" in res) {
        setEditError(res.error);
        return;
      }
      setDashboards((prev) => prev.map((d) => (d.id === res.dashboard.id ? res.dashboard : d)));
      if (!(await commitFavorites(draftFavs))) return;
      setEditing(false);
      setGalleryOpen(false);
    } catch {
      setEditError("Could not save the dashboard.");
    } finally {
      setBusy(false);
    }
  }

  async function submitName(name: string) {
    if (!nameDialog) return;
    setBusy(true);
    setEditError(null);
    try {
      if (nameDialog.mode === "first-save") {
        let id = pendingFirstSaveId;
        if (!id) {
          const res = await saveDashboard(name, { widgets: draft });
          if ("error" in res) {
            setEditError(res.error);
            return;
          }
          id = res.dashboard.id;
          setPendingFirstSaveId(id);
          setDashboards((prev) => [...prev, res.dashboard]);
        }
        const flip = await setDefaultDashboard(id);
        if ("error" in flip) {
          // The dashboard EXISTS — keep the dialog open; the next Save
          // retries only the flip (no duplicate create).
          setEditError("Saved the view, but could not make it the default. Save again to retry.");
          return;
        }
        const savedId = id;
        setDashboards((prev) => prev.map((d) => ({ ...d, isDefault: d.id === savedId })));
        setDefaultId(savedId);
        setPendingFirstSaveId(null);
        if (!(await commitFavorites(draftFavs))) return;
        setNameDialog(null);
        setEditing(false);
        setGalleryOpen(false);
      } else {
        // Save-as: snapshot the CURRENT view-mode layout under a new name.
        const res = await saveDashboard(name, { widgets: activeEntries });
        if ("error" in res) {
          setEditError(res.error);
          return;
        }
        setDashboards((prev) => [...prev, res.dashboard]);
        setNameDialog(null);
        selectView(res.dashboard.id);
      }
    } catch {
      setEditError("Could not save the dashboard.");
    } finally {
      setBusy(false);
    }
  }

  // ---- manage actions (view menu) ------------------------------------------
  // Failures surface through editError (rendered as a status line in view
  // mode too — api LOW-4 / ux P3-a); success mirrors selectView's
  // fetchMissing so a changed active layout never strands widgets on
  // "waiting for data" (ux P2-1).
  async function renameView(id: string, name: string): Promise<boolean> {
    const rec = dashboards.find((d) => d.id === id);
    if (!rec) return false;
    setBusy(true);
    setEditError(null);
    try {
      const res = await saveDashboard(name, { widgets: rec.layout.widgets }, id);
      if ("error" in res) {
        setEditError(res.error);
        return false;
      }
      setDashboards((prev) => prev.map((d) => (d.id === id ? res.dashboard : d)));
      return true;
    } catch {
      setEditError("Could not rename the view.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function deleteView(id: string) {
    setBusy(true);
    setEditError(null);
    try {
      const res = await deleteDashboard(id);
      if ("error" in res) {
        setEditError(res.error);
        return;
      }
      const nextList = dashboards.filter((d) => d.id !== id);
      const nextDefault = defaultId === id ? null : defaultId;
      const nextView = viewId === id ? null : viewId;
      setDashboards(nextList);
      setDefaultId(nextDefault);
      if (viewId === id) {
        setViewId(null);
        writeUrl(params, null);
      }
      // Deleting the default (or the active view) changes the rendered layout.
      void fetchMissing(layoutItems(viewEntries(nextList, nextView, nextDefault)));
    } catch {
      setEditError("Could not delete the view.");
    } finally {
      setBusy(false);
    }
  }
  async function makeDefault(id: string) {
    setBusy(true);
    setEditError(null);
    try {
      const res = await setDefaultDashboard(id);
      if ("error" in res) {
        setEditError(res.error);
        return;
      }
      const nextList = dashboards.map((d) => ({ ...d, isDefault: d.id === id }));
      setDashboards(nextList);
      setDefaultId(id);
      // Viewing "Default" while promoting a different record swaps the layout.
      void fetchMissing(layoutItems(viewEntries(nextList, viewId, id)));
    } catch {
      setEditError("Could not set the default view.");
    } finally {
      setBusy(false);
    }
  }

  // ---- render --------------------------------------------------------------
  const headPeriod =
    echo.kind === "window"
      ? `last ${params.window} days`
      : echo.kind === "custom"
        ? `${fmtDay(echo.from)} to ${fmtDay(echo.to)}`
        : echo.kind === "today"
          ? "today"
          : `this ${PERIOD_NOUN[echo.kind]}${echo.partial ? " to date" : ""}`;
  const headCompare = echo.compareLabel ? ` · vs ${echo.compareLabel}` : "";

  const ctx: WidgetCtx = {
    window: params.window,
    echoKind: echo.kind,
    granularity: echo.granularity,
    countingSince: staticRef.current.countingSince,
    gscThrough: staticRef.current.gscThrough,
    interactive: !editing,
  };

  /** Favorites-strip slice: the synthetic entry, else a same-KPI layout
   * widget. Factcheck fix 1 — two DISTINCT quiet states, mirrored with
   * WidgetBody: `undefined` = slice not fetched yet (KpiTile renders "waiting
   * for data"); `null` = fetched but absent/malformed ("not in the current
   * data" — the shape-guard maps a non-KPI slice under a colliding id here,
   * api INFO, never a crash). */
  function favData(k: CommandKpiId): WidgetDataMap["kpi"] | undefined {
    const direct = dataMap.get(`${FAV_PREFIX}${k}`);
    const viaWidget =
      direct === undefined
        ? activeEntries.find((e): e is LayoutWidget => e.kind === "kpi" && e.config.kpiId === k)
        : null;
    const candidate = direct !== undefined ? direct : viaWidget ? dataMap.get(viaWidget.i) : undefined;
    if (candidate === undefined) return undefined; // in-flight — never claim absence
    return candidate !== null && typeof (candidate as { n?: unknown }).n === "number"
      ? (candidate as WidgetDataMap["kpi"])
      : null;
  }

  const favAtCap = draftFavs.length >= MAX_FAVORITE_KPIS;

  return (
    <div data-acc="overview" aria-busy={loading}>
      <div className="adm-head">
        <h1>Command</h1>
        <DemoBadge demo={meta.mode === "demo"} />
        <span className="adm-count">
          {headPeriod}
          {headCompare}
          {staticRef.current.gscThrough ? ` · Search Console through ${staticRef.current.gscThrough}` : ""}
        </span>
      </div>

      {/* View mode: the time pill + view selector + edit entry. Edit mode: the
          action bar REPLACES the strip (explicit-commit editing; time stays
          live but is set before or after an edit, not during). */}
      {!editing ? (
        <ControlStrip
          params={params}
          compareLabel={echo.compareLabel}
          loading={loading}
          viewSlot={
            <>
              <ViewMenu
                dashboards={dashboards}
                activeId={viewId}
                defaultId={defaultId}
                busy={busy}
                onSelect={selectView}
                onSaveAs={() => {
                  setNameVal("");
                  setNameDialog({ mode: "save-as" });
                }}
                onRename={renameView}
                onDelete={deleteView}
                onSetDefault={makeDefault}
              />
              <button
                type="button"
                className="adm-viewctl adm-viewctl-edit"
                aria-label="Edit dashboard"
                onClick={startEdit}
              >
                <span aria-hidden="true">✎</span> Edit
              </button>
              <span className="adm-edithint">edit on a desktop screen</span>
            </>
          }
        />
      ) : (
        <div className="adm-editbar" role="toolbar" aria-label="Dashboard editing">
          <button type="button" className="adm-btn-ghost" onClick={() => setGalleryOpen(true)}>
            + Add widget
          </button>
          <button
            type="button"
            className="adm-linkbtn"
            onClick={() => setDraft(BUILT_IN_COMMAND_LAYOUT.map((e) => ({ ...e })))}
          >
            Reset layout to default
          </button>
          <span className="adm-editbar-pins" title="Pinned KPIs show in the favorites strip">
            ★ {draftFavs.length}/{MAX_FAVORITE_KPIS} pinned
          </span>
          <span className="adm-editbar-spacer" />
          {editError && <span className="adm-editbar-err" role="status">{editError}</span>}
          <button type="button" className="adm-linkbtn" onClick={cancelEdit} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="adm-btn adm-editbar-save" onClick={saveEdit} disabled={busy}>
            Save
          </button>
        </div>
      )}

      {error && <p className="adm-error" role="status">{error}</p>}
      {/* Manage-action failures (rename/delete/default) surface here in view
          mode; the edit bar carries the same state inline while editing. */}
      {!editing && editError && <p className="adm-error" role="status">{editError}</p>}

      <div className={`adm-surface${loading ? " is-loading" : ""}`}>
        {/* Favorites strip — pinned KPIs, view mode only, renders nothing when
            empty (ux spec). */}
        {!editing && favs.length > 0 && (
          <div className="adm-favstrip" role="group" aria-label="Pinned KPIs">
            <span className="adm-favstrip-label">★ pinned</span>
            <div className="adm-favstrip-tiles">
              {favs.map((k) => (
                <KpiTile key={k} k={favData(k)} ctx={ctx} />
              ))}
            </div>
          </div>
        )}

        {shownEntries.length === 0 ? (
          <section className="adm-card adm-card-wide">
            <h2>Empty dashboard</h2>
            <p className="adm-empty">
              {editing
                ? "Nothing here yet. Add widgets, or reset to the default layout."
                : "This view has no widgets. Open Edit to add widgets or reset to the default layout."}
            </p>
          </section>
        ) : (
          <DashboardCanvas
            entries={shownEntries}
            data={dataMap}
            ctx={ctx}
            editing={editing}
            favorites={editing ? draftFavs : favs}
            favAtCap={favAtCap}
            onToggleFav={toggleFav}
            onRemove={removeWidget}
            onCommitMove={(id, x, y) => setDraft((prev) => placeWidget(prev, id, x, y))}
            onCommitResize={(id, w, h) => setDraft((prev) => resizeWidget(prev, id, w, h))}
          />
        )}
      </div>

      {galleryOpen && (
        <AddWidgetModal entries={draft} onAdd={addWidget} onClose={() => setGalleryOpen(false)} />
      )}

      {nameDialog && (
        <div className="adm-mini-overlay" onClick={() => setNameDialog(null)}>
          <div
            className="adm-mini"
            role="dialog"
            aria-label={nameDialog.mode === "first-save" ? "Save your dashboard" : "Save as new view"}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="adm-mini-title">
              {nameDialog.mode === "first-save" ? "Save your dashboard" : "Save as new view"}
            </h3>
            <p className="adm-mini-body">
              {nameDialog.mode === "first-save"
                ? "This layout becomes a saved view and your default. Give it a name."
                : "Stores the current layout as a named view you can switch to."}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const v = nameVal.trim();
                if (v) void submitName(v);
              }}
            >
              <input
                type="text"
                value={nameVal}
                maxLength={60}
                autoFocus
                aria-label="View name"
                onChange={(e) => setNameVal(e.target.value)}
              />
              {editError && <p className="adm-editbar-err" role="status">{editError}</p>}
              <div className="adm-mini-actions">
                <button type="button" className="adm-btn-ghost" onClick={() => setNameDialog(null)}>
                  Cancel
                </button>
                <button type="submit" className="adm-btn" disabled={busy || !nameVal.trim()}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* §4.5 honesty metadata — unchanged. */}
      <p className="adm-mono" style={{ display: "block", marginTop: 18 }}>
        {meta.metricsVersion} · {meta.mode} · {meta.internalExcluded} internal{" "}
        {meta.internalExcluded === 1 ? "visitor" : "visitors"} excluded
        {meta.classifierVersions.length
          ? ` · search tags ${meta.classifierVersions.join(", ")}`
          : ""}
      </p>
    </div>
  );
}
