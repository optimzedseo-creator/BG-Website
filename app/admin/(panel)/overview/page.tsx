import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { readMode } from "@/lib/admin/iq/mode";
import { parsePeriodParam, parseWindowParam, periodFilters } from "@/lib/admin/iq/shared";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
import CommandView from "./CommandView";

export const dynamic = "force-dynamic";

/*
 * WP2.2b — COMMAND at /admin/overview (absorbs the old /admin dashboard).
 * Server-renders the full payload through the shared source (a direct load of
 * /admin/overview?p=90 server-renders 90d); the client island then refetches
 * through GET /api/admin/iq on period flips WITHOUT navigation (WP2.3).
 *
 * Dashboard Wave WP2: the page also parses the calendar-period grammar
 * (?period&compare&from&to&cmpFrom&cmpTo) through the SAME parsePeriodParam +
 * periodFilters pair as the /admin/api/iq handler, so a deep link and a
 * refetch can never resolve differently. ?p= stays the fallback (contract
 * rule 2). `&view=` is RESERVED for the Phase-2 canvas — not consumed here.
 */
export default async function CommandPage({
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
  }>;
}) {
  if (!(await requireAdmin())) redirect("/admin/login");

  const sp = await searchParams;
  const windowDays = parseWindowParam(sp.p);
  const pp = parsePeriodParam(sp);
  const internalVisitorIds = await readInternalVisitorIds();
  const payload = await getSource(await readMode()).command(
    { window: windowDays, ...periodFilters(pp) },
    { internalVisitorIds }
  );

  return <CommandView initial={payload} initialParams={{ window: windowDays, ...pp }} />;
}
