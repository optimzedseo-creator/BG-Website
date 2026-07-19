import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { readMode } from "@/lib/admin/iq/mode";
import { parseWindowParam } from "@/lib/admin/iq/shared";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
import CommandView from "./CommandView";

export const dynamic = "force-dynamic";

/*
 * WP2.2b — COMMAND at /admin/overview (absorbs the old /admin dashboard).
 * Server-renders the full payload through the shared source (a direct load of
 * /admin/overview?p=90 server-renders 90d); the client island then refetches
 * through GET /api/admin/iq on period flips WITHOUT navigation (WP2.3).
 */
export default async function CommandPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  if (!(await requireAdmin())) redirect("/admin/login");

  const { p } = await searchParams;
  const windowDays = parseWindowParam(p);
  const internalVisitorIds = await readInternalVisitorIds();
  const payload = await getSource(await readMode()).command({ window: windowDays }, { internalVisitorIds });

  return <CommandView initial={payload} />;
}
