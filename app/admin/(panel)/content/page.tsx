import { redirect } from "next/navigation";
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
import ContentView from "./ContentView";

export const dynamic = "force-dynamic";

/*
 * Content module (WP2.5 → PERIOD-UI wave) — "pages". Server component renders
 * the initial payload (gate first); ContentView (client island) handles
 * period/compare flips and the device/country chips without navigation through
 * GET /admin/api/iq/content. Grammar parses via the SAME parsePeriodParam +
 * periodFilters pair as the handler (closed loop); no params = MTD default.
 */
export default async function ContentPage({
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
  }>;
}) {
  if (!(await requireAdmin())) redirect("/admin/login");

  const sp = await searchParams;
  const windowDays = parseWindowParam(sp.p);
  const pp = parsePeriodParam(sp);
  const internalVisitorIds = await readInternalVisitorIds();
  const initial = await getSource(await readMode()).content(
    {
      window: windowDays,
      ...periodFilters(pp),
      device: parseDimParam(sp.device),
      country: parseDimParam(sp.country),
    },
    { internalVisitorIds }
  );

  return <ContentView initial={initial} initialParams={{ window: windowDays, ...pp }} />;
}
