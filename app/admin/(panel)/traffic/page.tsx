import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { parseDimParam, parseSourceClassParam, parseWindowParam } from "@/lib/admin/iq/shared";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
import TrafficView from "./TrafficView";

export const dynamic = "force-dynamic";

/*
 * Traffic module (WP2.4) — "people". Server component renders the initial
 * payload (gate first, one aggregated source call); TrafficView (client
 * island) handles period flips and module-local segment chips without
 * navigation through GET /admin/api/iq/traffic. Deep links with chips in the
 * querystring render filtered on first paint (shareable by construction).
 */
export default async function TrafficPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; device?: string; country?: string; source?: string }>;
}) {
  if (!(await requireAdmin())) redirect("/admin/login");

  const { p, device, country, source } = await searchParams;
  const internalVisitorIds = await readInternalVisitorIds();
  const initial = await getSource("live").traffic(
    {
      window: parseWindowParam(p),
      device: parseDimParam(device),
      country: parseDimParam(country),
      sourceClass: parseSourceClassParam(source),
    },
    { internalVisitorIds }
  );

  return <TrafficView initial={initial} />;
}
