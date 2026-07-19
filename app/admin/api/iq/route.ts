// WP2.3 — aggregated ADMIN-IQ handler: GET /admin/api/iq?p=7|30|90
//
// ROUTE DEVIATION (logged): the spec names /api/admin/iq, but the bg_admin
// session cookie is deliberately scoped to path=/admin (Wave-1 security
// posture — the cookie never travels outside the admin surface). A handler
// outside /admin can therefore never authenticate. Moving the handler under
// /admin/api/iq preserves the cookie scope instead of widening it; it also
// puts the handler behind the /admin middleware wall (defense-in-depth).
//
// One invocation, one pooled connection, the FULL Command payload in one
// response (DATA §4.1). Contract (standing security/api review conditions):
//   1. `await requireAdmin()` is the FIRST line — before a single param is
//      parsed. NOTE: in practice the /admin middleware 307s unauthenticated
//      requests to /admin/login BEFORE this handler runs, so an expired
//      session sees a redirect (which fetch follows into login HTML — the
//      islands detect res.redirected and bounce to login); the in-handler
//      401 is defense-in-depth for any path that bypasses the middleware.
//   2. The exclusion list rides in via SourceOpts like every caller — no
//      bypass path to source-live.
//   3. The payload is typed from lib/admin/iq/types.ts ONLY — PII-free by
//      construction (a CRM field in an IQ payload is an automatic FAIL).
//   4. No caching: `Cache-Control: private, no-store` (private data behind
//      auth must never be CDN-cacheable).
//   5. Error bodies never echo internals.
// Params parse tolerantly (future params ignored; bad ?p= falls back to 30).

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { readMode } from "@/lib/admin/iq/mode";
import { parseWindowParam } from "@/lib/admin/iq/shared";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
import type { IqCommand } from "@/lib/admin/iq/types";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

export async function GET(req: Request): Promise<NextResponse> {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  try {
    const url = new URL(req.url);
    const window = parseWindowParam(url.searchParams.get("p"));
    const internalVisitorIds = await readInternalVisitorIds();
    const payload: IqCommand = await getSource(await readMode()).command(
      { window },
      { internalVisitorIds }
    );
    return NextResponse.json(payload, { headers: NO_STORE });
  } catch (err) {
    console.error("[/admin/api/iq]", err); // server log only — body stays clean
    return NextResponse.json(
      { error: "Could not compute the payload." },
      { status: 500, headers: NO_STORE }
    );
  }
}
