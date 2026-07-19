// Dashboard Wave PHASE 2 · WP1 — batched widget endpoint:
//   POST /admin/api/iq/widgets
//   body: { widgets: [{ i, kind, config }], p?, period?, compare?, from?, to?,
//           cmpFrom?, cmpTo? }
//
// THE FAN-OUT GUARANTEE (arch ruling KB 1527): the canvas posts its whole
// widget set + the period ONCE; this handler dedups by WidgetDef.sourceMethod
// and calls each source method EXACTLY ONCE over the one pooled connection.
// Fetch count = number of DISTINCT source methods, never widget count — today
// the whole initial set rides `command`, so a 12-widget dashboard costs the
// same one payload the Command surface already costs.
//
// Period params ride the BODY but flow through the SAME parseWindowParam /
// parsePeriodParam / periodFilters triple as the GET handler and the overview
// page — the closed parse/forward/serialize loop (api ruling KB 1627) gains no
// second grammar here. One Filters object is built once and handed to every
// deduped source call, so all widgets answer for the same resolved period; the
// response carries the command payload's PeriodEcho as the single authority.
// `&view=` stays RESERVED for the WP2 canvas — not consumed here.
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
import { parsePeriodParam, parseWindowParam, periodFilters } from "@/lib/admin/iq/shared";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
import {
  WIDGET_REGISTRY,
  parseWidgetRequest,
  type WidgetData,
  type WidgetSourceMethod,
} from "@/lib/admin/iq/widgets";
import type { Filters, IqCommand, IqMeta, PeriodEcho } from "@/lib/admin/iq/types";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

/** Request-body ceiling. A full 40-widget layout with configs serializes to
 * ~4KB; 32KB is an order of magnitude of headroom, not an invitation. */
const BODY_MAX_BYTES = 32_768;

/** The batched response: one keyed map + the single period authority. `meta` /
 * `period` come from the deduped `command` payload (null only when the request
 * named zero command-fed widgets — with today's registry, zero widgets). */
export interface IqWidgetsResponse {
  meta: IqMeta | null;
  period: PeriodEcho | null;
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
    const src = getSource(await readMode());

    // Dedup by source method; call each ONCE. Sequential on purpose — one
    // pooled connection, no parallel fan-out (with one distinct method today
    // there is nothing to parallelize anyway). Each source resolves its own
    // `now` internally; because every method runs once off the same Filters,
    // the only drift possible is ms-level BETWEEN distinct methods (api seat
    // pre-accepted this; revisit if a second sourceMethod ever joins).
    const methods = [...new Set(valid.map((w) => WIDGET_REGISTRY[w.kind].sourceMethod))];
    const payloads = new Map<WidgetSourceMethod, IqCommand>();
    for (const m of methods) {
      payloads.set(m, await src[m](filters, opts));
    }

    // Object.create(null), not {} (security F2/api F1): on a plain object
    // literal a widget id like "__proto__" silently refuses assignment — the
    // widget would vanish from the map, violating this route's own "named,
    // never silently vanished" contract. A null-prototype map has no such ids.
    const widgets: Record<string, WidgetData> = Object.create(null);
    for (const w of valid) {
      const def = WIDGET_REGISTRY[w.kind];
      const payload = payloads.get(def.sourceMethod);
      if (payload) widgets[w.i] = def.select(payload, w.config);
    }

    const command = payloads.get("command") ?? null;
    const res: IqWidgetsResponse = {
      meta: command?.meta ?? null,
      period: command?.period ?? null,
      widgets,
      invalid,
    };
    return NextResponse.json(res, { headers: NO_STORE });
  } catch (err) {
    console.error("[/admin/api/iq/widgets]", err); // server log only — body stays clean
    return NextResponse.json(
      { error: "Could not compute the payload." },
      { status: 500, headers: NO_STORE }
    );
  }
}
