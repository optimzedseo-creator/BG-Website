// WP3.6 — GSC drill handler: GET /admin/api/iq/gsc?kind=&query=&p=7|30|90&from=&to=
//
// Under /admin/api/* (cookie path scope). Contract identical to the other IQ
// handlers: requireAdmin() first-line, exclusion via SourceOpts, PII-free typed
// payload, no-store, clean error bodies. `kind` is validated against a fixed
// set; `query` is attacker-supplied TEXT (parseQueryParam: control chars
// stripped, capped, exact-match filter only — never interpolated into SQL).

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { readMode } from "@/lib/admin/iq/mode";
import { parseQueryParam, parseWindowParam } from "@/lib/admin/iq/shared";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
import type { GscDetailKind, IqGscDetail } from "@/lib/admin/iq/types";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

const GSC_KINDS: readonly GscDetailKind[] = ["branded", "classifiable", "intent", "query"];

export async function GET(req: Request): Promise<NextResponse> {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  try {
    const url = new URL(req.url);
    const rawKind = url.searchParams.get("kind");
    const kind = GSC_KINDS.find((k) => k === rawKind);
    if (!kind) {
      return NextResponse.json({ error: "Unknown search detail." }, { status: 400, headers: NO_STORE });
    }
    const query = parseQueryParam(url.searchParams.get("query"));
    if (kind === "query" && !query) {
      return NextResponse.json({ error: "A query is required." }, { status: 400, headers: NO_STORE });
    }
    const payload: IqGscDetail = await getSource(await readMode()).gscDetail(
      kind,
      query,
      {
        window: parseWindowParam(url.searchParams.get("p")),
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
      },
      { internalVisitorIds: await readInternalVisitorIds() }
    );
    return NextResponse.json(payload, { headers: NO_STORE });
  } catch (err) {
    console.error("[/admin/api/iq/gsc]", err); // server log only
    return NextResponse.json(
      { error: "Could not compute the payload." },
      { status: 500, headers: NO_STORE }
    );
  }
}
