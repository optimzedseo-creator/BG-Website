import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { readMode } from "@/lib/admin/iq/mode";
import { parsePeriodParam, parseWindowParam, periodFilters } from "@/lib/admin/iq/shared";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
import {
  getDefaultDashboardRecord,
  isDashboardId,
  listDashboardRecords,
} from "@/lib/admin/iq/dashboards";
import { readFavoriteKpis } from "@/lib/admin/iq/favorites";
import {
  WIDGET_REGISTRY,
  fetchSourcePayloads,
  selectWidgetSlice,
  type WidgetData,
} from "@/lib/admin/iq/widgets";
import { BUILT_IN_COMMAND_LAYOUT, favItems, layoutItems } from "./canvas-lib";
import CommandView from "./CommandView";

export const dynamic = "force-dynamic";

/*
 * WP2.2b — COMMAND at /admin/overview (absorbs the old /admin dashboard).
 * Server-renders the full payload through the shared source; the client island
 * refetches through the batched POST /admin/api/iq/widgets on period flips
 * WITHOUT navigation (Dashboard Wave Ph2-WP2).
 *
 * Period grammar (?period&compare&from&to&cmpFrom&cmpTo) parses through the
 * SAME parsePeriodParam + periodFilters pair as the /admin/api/iq handlers —
 * deep link and refetch can never resolve differently. ?p= stays the fallback.
 *
 * `&view=` (Ph2-WP2): a LAYOUT SELECTOR, not a period param — it validates via
 * isDashboardId ONLY (condition 5; it never joins parsePeriodParam) and falls
 * back silently to the default view on any miss. The default view resolves via
 * the condition-1 reader (oldest isDefault row, zero-default → built-in
 * Command layout — resolved client-side from defaultId=null).
 */
export default async function CommandPage({
  searchParams,
}: {
  searchParams: Promise<{
    p?: string;
    period?: string;
    compare?: string;
    from?: string;
    to?: string;
    cmpFrom?: string;
    cmpTo?: string;
    view?: string;
  }>;
}) {
  if (!(await requireAdmin())) redirect("/admin/login");

  const sp = await searchParams;
  const windowDays = parseWindowParam(sp.p);
  const pp = parsePeriodParam(sp);
  const [internalVisitorIds, dashboards, defaultRecord, favorites] = await Promise.all([
    readInternalVisitorIds(),
    listDashboardRecords(),
    getDefaultDashboardRecord(),
    readFavoriteKpis(),
  ]);
  const src = getSource(await readMode());
  const filters = { window: windowDays, ...periodFilters(pp) };
  const opts = { internalVisitorIds };
  const payload = await src.command(filters, opts);

  // ?view= gate: isDashboardId + existence, nothing else. A miss is silent —
  // the surface renders the default view (no error, no redirect).
  const requestedView = isDashboardId(sp.view) ? sp.view : null;
  const activeViewId =
    requestedView && dashboards.some((d) => d.id === requestedView) ? requestedView : null;

  // Widget-library wave: run the registry selectors server-side over every
  // payload the ACTIVE layout needs, so the first paint is complete even for
  // non-command widgets. Same discipline as the batched endpoint: ONE Filters
  // object, dedup by sourceMethod, each distinct method called ONCE,
  // sequentially over the one pooled connection. The default layout is all
  // command-fed, so a fresh DB costs exactly the one payload it always did.
  const activeRecord =
    (activeViewId ? dashboards.find((d) => d.id === activeViewId) : null) ?? defaultRecord ?? null;
  const entries = activeRecord ? activeRecord.layout.widgets : BUILT_IN_COMMAND_LAYOUT;
  const items = [...layoutItems(entries), ...favItems(favorites)];
  // api N1: the ONE shared fan-out from the contract module (same code path
  // as the batched endpoint); the already-fetched command payload seeds it.
  const payloads = await fetchSourcePayloads(
    src,
    filters,
    opts,
    items.map((it) => WIDGET_REGISTRY[it.kind].sourceMethod),
    { command: payload }
  );
  const initialData: [string, WidgetData][] = [];
  for (const it of items) {
    const slice = selectWidgetSlice(it.kind, payloads, it.config);
    if (slice !== undefined) initialData.push([it.i, slice]);
  }

  return (
    <CommandView
      initial={payload}
      initialData={initialData}
      initialParams={{ window: windowDays, ...pp }}
      dashboards={dashboards}
      activeViewId={activeViewId}
      defaultId={defaultRecord?.id ?? null}
      favorites={favorites}
    />
  );
}
