// WP3.3 — Page detail handler: GET /admin/api/iq/page?path=<enc>&p=7|30|90
//
// Under /admin/api/* (cookie path scope). Contract identical to the other IQ
// handlers: requireAdmin() first-line, exclusion via SourceOpts, PII-free typed
// payload, no-store, clean error bodies. The path param is validated (leading
// slash, length cap, control chars stripped) before it ever reaches Prisma —
// it is an exact-match filter, never interpolated into SQL.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { parsePathParam, parseWindowParam } from "@/lib/admin/iq/shared";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
import type { IqPageDetail } from "@/lib/admin/iq/types";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

export async function GET(req: Request): Promise<NextResponse> {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  try {
    const url = new URL(req.url);
    const path = parsePathParam(url.searchParams.get("path"));
    if (!path) {
      return NextResponse.json({ error: "A page path is required." }, { status: 400, headers: NO_STORE });
    }
    const payload: IqPageDetail = await getSource("live").pageDetail(
      path,
      { window: parseWindowParam(url.searchParams.get("p")) },
      { internalVisitorIds: await readInternalVisitorIds() }
    );
    return NextResponse.json(payload, { headers: NO_STORE });
  } catch (err) {
    console.error("[/admin/api/iq/page]", err); // server log only
    return NextResponse.json(
      { error: "Could not compute the payload." },
      { status: 500, headers: NO_STORE }
    );
  }
}
