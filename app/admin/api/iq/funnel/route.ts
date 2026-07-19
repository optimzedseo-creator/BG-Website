// WP3.7 — Funnel-step drill handler: GET /admin/api/iq/funnel?step=&p=7|30|90&from=&to=
//
// Under /admin/api/* (cookie path scope). Contract identical to the other IQ
// handlers: requireAdmin() first-line, exclusion via SourceOpts (the step's
// People/Events/Trend are visitor-scoped), PII-free typed payload, no-store,
// clean error bodies. `step` is validated against the fixed FunnelStepV2 keys
// before any Prisma access.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { readMode } from "@/lib/admin/iq/mode";
import { parseWindowParam } from "@/lib/admin/iq/shared";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
import type { FunnelStepKey, IqFunnelStep } from "@/lib/admin/iq/types";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

const STEP_KEYS: readonly FunnelStepKey[] = [
  "visitors",
  "chooser_click",
  "cta_click",
  "form_submit",
  "booking",
];

export async function GET(req: Request): Promise<NextResponse> {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  try {
    const url = new URL(req.url);
    const rawStep = url.searchParams.get("step");
    const step = STEP_KEYS.find((k) => k === rawStep);
    if (!step) {
      return NextResponse.json({ error: "Unknown funnel step." }, { status: 400, headers: NO_STORE });
    }
    const payload: IqFunnelStep = await getSource(await readMode()).funnelStep(
      step,
      {
        window: parseWindowParam(url.searchParams.get("p")),
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
      },
      { internalVisitorIds: await readInternalVisitorIds() }
    );
    return NextResponse.json(payload, { headers: NO_STORE });
  } catch (err) {
    console.error("[/admin/api/iq/funnel]", err); // server log only
    return NextResponse.json(
      { error: "Could not compute the payload." },
      { status: 500, headers: NO_STORE }
    );
  }
}
