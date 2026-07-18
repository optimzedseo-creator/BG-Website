import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { parseDimParam, parseWindowParam } from "@/lib/admin/iq/shared";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
import ContentView from "./ContentView";

export const dynamic = "force-dynamic";

/*
 * Content module (WP2.5) — "pages". Server component renders the initial
 * payload (gate first); ContentView (client island) handles period flips and
 * the device/country chips without navigation through GET /admin/api/iq/content.
 */
export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; device?: string; country?: string }>;
}) {
  if (!(await requireAdmin())) redirect("/admin/login");

  const { p, device, country } = await searchParams;
  const internalVisitorIds = await readInternalVisitorIds();
  const initial = await getSource("live").content(
    {
      window: parseWindowParam(p),
      device: parseDimParam(device),
      country: parseDimParam(country),
    },
    { internalVisitorIds }
  );

  return <ContentView initial={initial} />;
}
