import { redirect } from "next/navigation";
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
import TrafficView from "./TrafficView";

export const dynamic = "force-dynamic";

/*
 * Traffic module (WP2.4 → PERIOD-UI wave) — "people". Server component renders
 * the initial payload (gate first, one aggregated source call); TrafficView
 * (client island) handles period/compare flips and module-local segment chips
 * without navigation through GET /admin/api/iq/traffic. The period grammar
 * (?period&compare&from&to&cmpFrom&cmpTo) parses via the SAME
 * parsePeriodParam + periodFilters pair as the handler (closed loop — deep
 * link and refetch can never resolve differently); no params = MTD default.
 */
export default async function TrafficPage({
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
    device?: string;
    country?: string;
    source?: string;
  }>;
}) {
  if (!(await requireAdmin())) redirect("/admin/login");

  const sp = await searchParams;
  const windowDays = parseWindowParam(sp.p);
  const pp = parsePeriodParam(sp);
  const internalVisitorIds = await readInternalVisitorIds();
  const initial = await getSource(await readMode()).traffic(
    {
      window: windowDays,
      ...periodFilters(pp),
      device: parseDimParam(sp.device),
      country: parseDimParam(sp.country),
      sourceClass: parseSourceClassParam(sp.source),
    },
    { internalVisitorIds }
  );

  return <TrafficView initial={initial} initialParams={{ window: windowDays, ...pp }} />;
}
