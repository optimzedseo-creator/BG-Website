// WP3.9 — Activity stream handler: GET /admin/api/iq/activity?p=&kind=&path=&source=
//
// Under /admin/api/* (cookie path scope). Contract: requireAdmin() first-line,
// exclusion via SourceOpts, PII-free typed payload (form/booking rows carry
// {hasVisitorId} facts only — no lead name/email/message), no-store, clean
// error bodies. Params parse tolerantly (shared parsers); kind is an opaque
// length-capped string that only filters in-memory rows.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { parseDimParam, parsePathParam, parseSourceClassParam, parseWindowParam } from "@/lib/admin/iq/shared";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
import type { IqActivity } from "@/lib/admin/iq/types";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

export async function GET(req: Request): Promise<NextResponse> {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  try {
    const url = new URL(req.url);
    const payload: IqActivity = await getSource("live").activity(
      {
        window: parseWindowParam(url.searchParams.get("p")),
        kind: parseDimParam(url.searchParams.get("kind")),
        path: parsePathParam(url.searchParams.get("path")) ?? undefined,
        sourceClass: parseSourceClassParam(url.searchParams.get("source")),
      },
      { internalVisitorIds: await readInternalVisitorIds() }
    );
    return NextResponse.json(payload, { headers: NO_STORE });
  } catch (err) {
    console.error("[/admin/api/iq/activity]", err); // server log only
    return NextResponse.json(
      { error: "Could not compute the payload." },
      { status: 500, headers: NO_STORE }
    );
  }
}
