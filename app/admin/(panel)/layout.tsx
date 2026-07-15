import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { logoutAction } from "./actions";

// Render-time guard for every authenticated admin page. Defense-in-depth:
// middleware already redirects unauthenticated /admin/* requests, and every
// server action re-verifies with requireAdmin() — this layer covers direct
// RSC renders.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await requireAdmin())) redirect("/admin/login");

  return (
    <>
      <header className="adm-top">
        <div className="adm-top-inner">
          <span className="adm-brand">BG · Admin</span>
          <nav aria-label="Admin">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/leads">Leads</Link>
            <Link href="/admin/security">Security</Link>
          </nav>
          <form action={logoutAction}>
            <button type="submit" className="adm-linkbtn">Sign out</button>
          </form>
        </div>
      </header>
      <main className="adm-main">{children}</main>
    </>
  );
}
