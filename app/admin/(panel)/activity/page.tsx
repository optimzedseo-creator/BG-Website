import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { readMode } from "@/lib/admin/iq/mode";
import {
  parseDimParam,
  parsePathParam,
  parsePeriodParam,
  parseSourceClassParam,
  parseWindowParam,
  periodFilters,
} from "@/lib/admin/iq/shared";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
import ActivityView from "./ActivityView";

export const dynamic = "force-dynamic";

/*
 * WP3.9 Activity stream (Brad-requested) — the call-log equivalent for real
 * site data: a live, filterable, timestamped log of PageViews + Events + form
 * submissions, newest first. PERIOD-UI wave: the grammar parses via the SAME
 * parsePeriodParam + periodFilters pair as the handler (MTD default); the
 * source forces compareMode "none" (a log compares nothing). Rows drill to
 * the Journey modal. PII rule holds: {hasVisitorId} facts only.
 */
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    p?: string;
    period?: string;
    compare?: string;
    from?: string;
    to?: string;
    cmpFrom?: string;
    cmpTo?: string;
    kind?: string;
    path?: string;
    source?: string;
  }>;
}) {
  if (!(await requireAdmin())) redirect("/admin/login");

  const sp = await searchParams;
  const windowDays = parseWindowParam(sp.p);
  const pp = parsePeriodParam(sp);
  const initial = await getSource(await readMode()).activity(
    {
      window: windowDays,
      ...periodFilters(pp),
      kind: parseDimParam(sp.kind),
      path: parsePathParam(sp.path) ?? undefined,
      sourceClass: parseSourceClassParam(sp.source),
    },
    { internalVisitorIds: await readInternalVisitorIds() }
  );

  return <ActivityView initial={initial} initialParams={{ window: windowDays, ...pp }} />;
}
