// WP2.5 → PERIOD-UI wave — Content module handler:
// GET /admin/api/iq/content?period=&compare=&from=&to=&cmpFrom=&cmpTo=&device=&country=
// (?p= tolerated as the dormant legacy fallback; no params = MTD default)
//
// Same contract as /admin/api/iq/traffic (gate first, exclusion threading,
// PII-free typed payload, no-store, clean error bodies). Content chips are
// device/country only — there is deliberately NO ?source= here (module scope
// ruling), and an unexpected ?source= is simply ignored (tolerant parsing).

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { readMode } from "@/lib/admin/iq/mode";
import {
  parseDimParam,
  parsePeriodParam,
  parseWindowParam,
  periodFilters,
} from "@/lib/admin/iq/shared";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
import type { IqContent } from "@/lib/admin/iq/types";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

export async function GET(req: Request): Promise<NextResponse> {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  try {
    const url = new URL(req.url);
    // PERIOD-UI wave: the SAME parsePeriodParam→periodFilters triple as the
    // page (closed loop — no second grammar).
    const pp = parsePeriodParam({
      period: url.searchParams.get("period"),
      compare: url.searchParams.get("compare"),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      cmpFrom: url.searchParams.get("cmpFrom"),
      cmpTo: url.searchParams.get("cmpTo"),
    });
    const payload: IqContent = await getSource(await readMode()).content(
      {
        window: parseWindowParam(url.searchParams.get("p")),
        ...periodFilters(pp),
        device: parseDimParam(url.searchParams.get("device")),
        country: parseDimParam(url.searchParams.get("country")),
      },
      { internalVisitorIds: await readInternalVisitorIds() }
    );
    return NextResponse.json(payload, { headers: NO_STORE });
  } catch (err) {
    console.error("[/admin/api/iq/content]", err); // server log only
    return NextResponse.json(
      { error: "Could not compute the payload." },
      { status: 500, headers: NO_STORE }
    );
  }
}
