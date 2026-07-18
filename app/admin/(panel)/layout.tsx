import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { VISITOR_COOKIE, addInternalVisitorId } from "@/lib/admin/iq/internal";
import { logoutAction } from "./actions";
import AdminRail from "./AdminRail";
import AdminTopBar from "./AdminTopBar";

// Render-time guard for every authenticated admin page. Defense-in-depth:
// middleware already redirects unauthenticated /admin/* requests, and every
// server action re-verifies with requireAdmin() — this layer covers direct
// RSC renders.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await requireAdmin())) redirect("/admin/login");

  // WP1.5 auto-capture (DATA-SPEC §5.3) — STRICTLY after the gate above: any
  // browser that authenticates as admin is internal, forever. Its bg_vid lands
  // on the read-time exclusion list; addInternalVisitorId writes only when the
  // id is new, so repeat admin requests cost one Setting read, zero writes.
  const bgVid = (await cookies()).get(VISITOR_COOKIE)?.value;
  if (bgVid) await addInternalVisitorId(bgVid);

  // Live rail chips (WP2.1 Brad addendum): PII-free lead counts by status via
  // the shared metrics module — counts only, all six statuses, zeros included.
  const leadCounts = await getSource("live").leadsByStatus();

  return (
    <>
      <AdminTopBar>
        <form action={logoutAction}>
          <button type="submit" className="adm-linkbtn">Sign out</button>
        </form>
      </AdminTopBar>
      <div className="adm-shell">
        {/* U6: the fallback reserves the rail's box (208px + border) so main
            content never reflows ~165px sideways when the rail resolves.
            D3 note: the "rail renders outside .page-admin / never resolves"
            symptom is an artifact of HIDDEN test panes only — React 19.2
            schedules the streaming reveal via requestAnimationFrame, which
            hidden tabs starve. Verified correct in a visible prod window. */}
        <Suspense fallback={<aside className="adm-rail" aria-hidden />}>
          <AdminRail leadCounts={leadCounts} />
        </Suspense>
        <main className="adm-main">{children}</main>
      </div>
    </>
  );
}
