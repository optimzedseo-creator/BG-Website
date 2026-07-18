// WP3.2 — KPI drill handler: GET /admin/api/iq/kpi?id=<kpiId>&p=7|30|90
//
// Lives under /admin/api/* (NOT /api/admin/*): the bg_admin session cookie is
// path-scoped to /admin, so a handler outside it can never authenticate (route
// deviation, logged). Contract mirrors /admin/api/iq exactly:
//   1. `await requireAdmin()` FIRST — before a single param is parsed.
//   2. Exclusion list threads in via SourceOpts — no bypass path.
//   3. Payload typed from lib/admin/iq/types.ts only — PII-free by construction.
//   4. `Cache-Control: private, no-store`.
//   5. Error bodies never echo internals.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { parseWindowParam } from "@/lib/admin/iq/shared";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
import type { CommandKpiId, IqKpiDetail } from "@/lib/admin/iq/types";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

const KPI_IDS: readonly CommandKpiId[] = [
  "visitors",
  "pageviews",
  "search-clicks",
  "briefs",
  "bookings",
  "subscribers",
];

export async function GET(req: Request): Promise<NextResponse> {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  try {
    const url = new URL(req.url);
    const rawId = url.searchParams.get("id");
    const id = KPI_IDS.find((k) => k === rawId);
    if (!id) {
      return NextResponse.json({ error: "Unknown metric." }, { status: 400, headers: NO_STORE });
    }
    const payload: IqKpiDetail = await getSource("live").kpiDetail(
      id,
      { window: parseWindowParam(url.searchParams.get("p")) },
      { internalVisitorIds: await readInternalVisitorIds() }
    );
    return NextResponse.json(payload, { headers: NO_STORE });
  } catch (err) {
    console.error("[/admin/api/iq/kpi]", err); // server log only
    return NextResponse.json(
      { error: "Could not compute the payload." },
      { status: 500, headers: NO_STORE }
    );
  }
}
