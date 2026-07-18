import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { VISITOR_COOKIE, addInternalVisitorId } from "@/lib/admin/iq/internal";
import { logoutAction } from "./actions";
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

  return (
    <>
      <AdminTopBar>
        <form action={logoutAction}>
          <button type="submit" className="adm-linkbtn">Sign out</button>
        </form>
      </AdminTopBar>
      <main className="adm-main">{children}</main>
    </>
  );
}
