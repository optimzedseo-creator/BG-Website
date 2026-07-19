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
import { readMode } from "@/lib/admin/iq/mode";
import { parseWindowParam } from "@/lib/admin/iq/shared";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
// P2-WP1 fix 3 (api F2): the id whitelist comes from the widget registry's
// compiler-exhaustive COMMAND_KPI_IDS (Record<CommandKpiId, true>-derived) —
// the local list this route used to carry was NOT exhaustive-checked, so a
// future CommandKpiId would have silently 400'd here.
import { isCommandKpiId } from "@/lib/admin/iq/widgets";
import type { IqKpiDetail } from "@/lib/admin/iq/types";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

export async function GET(req: Request): Promise<NextResponse> {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  try {
    const url = new URL(req.url);
    const rawId = url.searchParams.get("id");
    const id = isCommandKpiId(rawId) ? rawId : null;
    if (!id) {
      return NextResponse.json({ error: "Unknown metric." }, { status: 400, headers: NO_STORE });
    }
    const payload: IqKpiDetail = await getSource(await readMode()).kpiDetail(
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
