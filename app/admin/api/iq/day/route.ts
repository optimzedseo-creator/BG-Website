// WP3.7 — Day-detail drill handler: GET /admin/api/iq/day?d=YYYY-MM-DD&p=7|30|90
//
// Under /admin/api/* (cookie path scope). Contract identical to the other IQ
// handlers: requireAdmin() first-line, exclusion via SourceOpts (the day's
// visitors/pages/events are visitor-scoped), PII-free typed payload, no-store,
// clean error bodies. `d` is regex-validated to a strict "YYYY-MM-DD" NY day
// (parseDayParam) before any Prisma access — it only ever becomes a day-bucket
// equality filter, never SQL.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { parseDayParam, parseWindowParam } from "@/lib/admin/iq/shared";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
import type { IqDayDetail } from "@/lib/admin/iq/types";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

export async function GET(req: Request): Promise<NextResponse> {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  try {
    const url = new URL(req.url);
    const dayKey = parseDayParam(url.searchParams.get("d"));
    if (!dayKey) {
      return NextResponse.json({ error: "A valid day (YYYY-MM-DD) is required." }, { status: 400, headers: NO_STORE });
    }
    const payload: IqDayDetail = await getSource("live").dayDetail(
      dayKey,
      { window: parseWindowParam(url.searchParams.get("p")) },
      { internalVisitorIds: await readInternalVisitorIds() }
    );
    return NextResponse.json(payload, { headers: NO_STORE });
  } catch (err) {
    console.error("[/admin/api/iq/day]", err); // server log only
    return NextResponse.json(
      { error: "Could not compute the payload." },
      { status: 500, headers: NO_STORE }
    );
  }
}
