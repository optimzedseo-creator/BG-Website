// WP2.4 → PERIOD-UI wave — Traffic module handler:
// GET /admin/api/iq/traffic?period=&compare=&from=&to=&cmpFrom=&cmpTo=&device=&country=&source=
// (?p= tolerated as the dormant legacy fallback; no params = MTD default)
//
// Lives under /admin/api/* (NOT /api/admin/*): the bg_admin session cookie is
// path-scoped to /admin, so a handler outside it can never authenticate
// (Build A ruling, logged). Same contract as /admin/api/iq:
//   1. `await requireAdmin()` FIRST — before a single param is parsed.
//   2. Exclusion list threads in via SourceOpts — no bypass path.
//   3. Payload typed from lib/admin/iq/types.ts only — PII-free by construction.
//   4. `Cache-Control: private, no-store`.
//   5. Error bodies never echo internals.
// Params parse tolerantly (shared parsers — one copy): bad ?p= falls back to
// 30; unknown ?source= values drop; device/country are length-capped opaque
// strings that only filter in-memory rows, never SQL.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { readMode } from "@/lib/admin/iq/mode";
import {
  parseDimParam,
  parsePeriodParam,
  parseSourceClassParam,
  parseWindowParam,
  periodFilters,
} from "@/lib/admin/iq/shared";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
import type { IqTraffic } from "@/lib/admin/iq/types";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

export async function GET(req: Request): Promise<NextResponse> {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  try {
    const url = new URL(req.url);
    // PERIOD-UI wave: the SAME parsePeriodParam→periodFilters triple as the
    // page (closed loop — no second grammar). No params = MTD default; legacy
    // ?p= is the tolerated dormant fallback.
    const pp = parsePeriodParam({
      period: url.searchParams.get("period"),
      compare: url.searchParams.get("compare"),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      cmpFrom: url.searchParams.get("cmpFrom"),
      cmpTo: url.searchParams.get("cmpTo"),
    });
    const payload: IqTraffic = await getSource(await readMode()).traffic(
      {
        window: parseWindowParam(url.searchParams.get("p")),
        ...periodFilters(pp),
        device: parseDimParam(url.searchParams.get("device")),
        country: parseDimParam(url.searchParams.get("country")),
        sourceClass: parseSourceClassParam(url.searchParams.get("source")),
      },
      { internalVisitorIds: await readInternalVisitorIds() }
    );
    return NextResponse.json(payload, { headers: NO_STORE });
  } catch (err) {
    console.error("[/admin/api/iq/traffic]", err); // server log only
    return NextResponse.json(
      { error: "Could not compute the payload." },
      { status: 500, headers: NO_STORE }
    );
  }
}
