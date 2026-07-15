import { redirect } from "next/navigation";
import { K_TOTP_SECRET, getSetting, requireAdmin } from "@/lib/admin/auth";
import { ChangePasswordForm, TotpSection } from "./SecurityForms";

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  if (!(await requireAdmin())) redirect("/admin/login");

  const totpEnabled = !!(await getSetting(K_TOTP_SECRET));

  return (
    <>
      <div className="adm-head">
        <h1>Security</h1>
      </div>
      <div className="adm-grid adm-grid-detail">
        <section className="adm-card">
          <h2>Two-factor authentication</h2>
          <TotpSection enabled={totpEnabled} />
        </section>
        <section className="adm-card">
          <h2>Change password</h2>
          <ChangePasswordForm />
        </section>
      </div>
    </>
  );
}
