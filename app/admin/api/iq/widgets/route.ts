// Dashboard Wave PHASE 2 · WP1 (+ widget-library wave) — batched widget
// endpoint:
//   POST /admin/api/iq/widgets
//   body: { widgets: [{ i, kind, config }], p?, period?, compare?, from?, to?,
//           cmpFrom?, cmpTo? }
//
// THE FAN-OUT GUARANTEE (arch ruling KB 1527): the canvas posts its whole
// widget set + the period ONCE; this handler dedups by WidgetDef.sourceMethod
// and calls each distinct source method EXACTLY ONCE over the one pooled
// connection, sequentially. Fetch count = number of DISTINCT source methods,
// never widget count.
//
// KB:1692 REFACTOR (landed with the first non-command sourceMethod, as
// pre-accepted):
//  (a) the payloads store is DISCRIMINATED — Partial<SourcePayloadMap>, each
//      method keyed to ITS OWN payload type; selection goes through the
//      contract module's selectWidgetSlice (the one sanctioned widening).
//  (b) meta + period authority are resolved ONCE by THIS HANDLER (resolvePeriod
//      + periodEcho over the one Filters object) — never plucked off whichever
//      payload happened to ride along. classifierVersions honestly union the
//      fetched payloads' versions (the versions that informed this response).
//  (c) ONE Filters object is built once and handed to every method call; each
//      source still stamps its own `now` internally (phase-1 signatures are
//      frozen) — the only drift possible is ms-level between distinct methods,
//      pre-accepted at KB:1568.
//
// Period params ride the BODY but flow through the SAME parseWindowParam /
// parsePeriodParam / periodFilters triple as the GET handler and the overview
// page — the closed parse/forward/serialize loop (api ruling KB 1627) gains no
// second grammar here. `&view=` stays RESERVED for the canvas — not consumed.
//
// Contract (mirrors /admin/api/iq exactly):
//   1. `await requireAdmin()` FIRST — before the body is read or parsed.
//   2. Exclusion list rides in via SourceOpts — no bypass path.
//   3. Payload typed from lib/admin/iq only — PII-free by construction.
//   4. `Cache-Control: private, no-store`.
//   5. Error bodies never echo internals or offending input.
//   6. Body size cap (BODY_MAX_BYTES) + widget-count cap (WIDGETS_REQUEST_MAX)
//      — checked before any JSON.parse work.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { readMode } from "@/lib/admin/iq/mode";
import {
  parsePeriodParam,
  parseWindowParam,
  periodEcho,
  periodFilters,
  resolvePeriod,
} from "@/lib/admin/iq/shared";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
import {
  WIDGET_REGISTRY,
  fetchSourcePayloads,
  parseWidgetRequest,
  selectWidgetSlice,
  type WidgetData,
} from "@/lib/admin/iq/widgets";
import { METRICS_VERSION, type Filters, type IqMeta, type PeriodEcho } from "@/lib/admin/iq/types";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

/** Request-body ceiling. A full 40-widget layout with configs serializes to
 * ~4KB; 32KB is an order of magnitude of headroom, not an invitation. */
const BODY_MAX_BYTES = 32_768;

/** The batched response: one keyed map + the single period authority. `meta`
 * and `period` are HANDLER-RESOLVED (KB:1692 condition b) — always present,
 * never dependent on which payloads the request happened to name. */
export interface IqWidgetsResponse {
  meta: IqMeta;
  period: PeriodEcho;
  widgets: Record<string, WidgetData>;
  /** Request items that failed validation, by id (or "#<index>" when the id
   * itself was unusable). Skipped, named, never silently vanished. */
  invalid: string[];
}

function bodyString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  try {
    // Size cap: declared length first (cheap reject), actual length second
    // (Content-Length is client-asserted and may lie).
    const declared = Number(req.headers.get("content-length") ?? "0");
    if (declared > BODY_MAX_BYTES) {
      return NextResponse.json({ error: "Request too large." }, { status: 413, headers: NO_STORE });
    }
    const text = await req.text();
    // Byte length, not UTF-16 code units (fix 6): the cap is named in BYTES,
    // and multi-byte characters would otherwise under-count by up to 4x.
    if (Buffer.byteLength(text, "utf8") > BODY_MAX_BYTES) {
      return NextResponse.json({ error: "Request too large." }, { status: 413, headers: NO_STORE });
    }

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Bad request." }, { status: 400, headers: NO_STORE });
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Bad request." }, { status: 400, headers: NO_STORE });
    }
    const b = body as Record<string, unknown>;

    const parsed = parseWidgetRequest(b.widgets);
    if (parsed === null) {
      return NextResponse.json({ error: "Bad request." }, { status: 400, headers: NO_STORE });
    }
    const { valid, invalid } = parsed;

    // ONE Filters object through the ONE shared parser pair — identical
    // treatment to GET /admin/api/iq (?p= fallback included), so a widget can
    // never disagree with the Command surface about what "this month" means.
    const pp = parsePeriodParam({
      period: bodyString(b.period),
      compare: bodyString(b.compare),
      from: bodyString(b.from),
      to: bodyString(b.to),
      cmpFrom: bodyString(b.cmpFrom),
      cmpTo: bodyString(b.cmpTo),
    });
    const filters: Filters = { window: parseWindowParam(bodyString(b.p)), ...periodFilters(pp) };
    const opts = { internalVisitorIds: await readInternalVisitorIds() };
    const mode = await readMode();
    const src = getSource(mode);

    // KB:1692 (b): THE period authority — resolved once, here, from the same
    // Filters every source call receives. periodEcho() is the one shared echo
    // builder (the W1 inclusive-custom rule lives inside it).
    const period: PeriodEcho = periodEcho(resolvePeriod(filters));

    // KB:1692 (a) + api N1: the fan-out is built ONCE in the contract module
    // (compiler-exhaustive over WidgetSourceMethod) and shared with the
    // overview server page. Dedup by method, each called ONCE, sequential —
    // one pooled connection, no parallel amplification. The store is keyed by
    // the CLOSED method union (registry-derived from whitelisted kinds, never
    // a client string).
    const methods = [...new Set(valid.map((w) => WIDGET_REGISTRY[w.kind].sourceMethod))];
    const payloads = await fetchSourcePayloads(src, filters, opts, methods);

    // Honest meta: union the classifier versions of every payload that
    // informed this response (LeadsSnapshot carries no meta and contributes
    // none); the rest of the envelope is handler-known.
    const versions = new Set<string>();
    for (const m of methods) {
      const p = payloads[m];
      if (p && "meta" in p) for (const v of p.meta.classifierVersions) versions.add(v);
    }
    const meta: IqMeta = {
      metricsVersion: METRICS_VERSION,
      classifierVersions: [...versions].sort(),
      internalExcluded: opts.internalVisitorIds.length,
      mode,
    };

    // Object.create(null), not {} (security F2/api F1): on a plain object
    // literal a widget id like "__proto__" silently refuses assignment — the
    // widget would vanish from the map, violating this route's own "named,
    // never silently vanished" contract. A null-prototype map has no such ids.
    const widgets: Record<string, WidgetData> = Object.create(null);
    for (const w of valid) {
      const slice = selectWidgetSlice(w.kind, payloads, w.config);
      if (slice !== undefined) widgets[w.i] = slice;
    }

    const res: IqWidgetsResponse = { meta, period, widgets, invalid };
    return NextResponse.json(res, { headers: NO_STORE });
  } catch (err) {
    console.error("[/admin/api/iq/widgets]", err); // server log only — body stays clean
    return NextResponse.json(
      { error: "Could not compute the payload." },
      { status: 500, headers: NO_STORE }
    );
  }
}
