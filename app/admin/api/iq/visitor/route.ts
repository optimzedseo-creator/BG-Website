// WP3.4 — Visitor Journey handler: GET /admin/api/iq/visitor?id=<visitorId>
//
// Under /admin/api/* (cookie path scope). Contract: requireAdmin() first-line,
// exclusion via SourceOpts, PII-free typed payload (visitorId is NOT PII; the
// lead surfaces only as hasLead + leadId — never a name), no-store, clean error
// bodies. The id is validated against the tracking contract's VISITOR_ID_RE
// (single source of truth) before it reaches Prisma.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { readInternalVisitorIds, isValidVisitorId } from "@/lib/admin/iq/internal";
import type { IqVisitorJourney } from "@/lib/admin/iq/types";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

export async function GET(req: Request): Promise<NextResponse> {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id || !isValidVisitorId(id)) {
      return NextResponse.json({ error: "A valid visitor id is required." }, { status: 400, headers: NO_STORE });
    }
    const payload: IqVisitorJourney = await getSource("live").visitorJourney(id, {
      internalVisitorIds: await readInternalVisitorIds(),
    });
    return NextResponse.json(payload, { headers: NO_STORE });
  } catch (err) {
    console.error("[/admin/api/iq/visitor]", err); // server log only
    return NextResponse.json(
      { error: "Could not compute the payload." },
      { status: 500, headers: NO_STORE }
    );
  }
}
