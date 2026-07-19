import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { readMode } from "@/lib/admin/iq/mode";
import { parseDimParam, parsePathParam, parseSourceClassParam, parseWindowParam } from "@/lib/admin/iq/shared";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
import ActivityView from "./ActivityView";

export const dynamic = "force-dynamic";

/*
 * WP3.9 Activity stream (Brad-requested) — the call-log equivalent for real
 * site data: a live, filterable, timestamped log of PageViews + Events + form
 * submissions, newest first. Server component gates + renders the initial
 * payload; ActivityView (client island) handles period flips and kind/source
 * filters through GET /admin/api/iq/activity. Rows drill to the Journey modal.
 * PII rule holds: form/booking rows carry {hasVisitorId} facts only.
 */
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; kind?: string; path?: string; source?: string }>;
}) {
  if (!(await requireAdmin())) redirect("/admin/login");

  const { p, kind, path, source } = await searchParams;
  const initial = await getSource(await readMode()).activity(
    {
      window: parseWindowParam(p),
      kind: parseDimParam(kind),
      path: parsePathParam(path) ?? undefined,
      sourceClass: parseSourceClassParam(source),
    },
    { internalVisitorIds: await readInternalVisitorIds() }
  );

  return <ActivityView initial={initial} />;
}
