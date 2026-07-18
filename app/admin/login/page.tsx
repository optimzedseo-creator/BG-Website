import type { Metadata } from "next";
import { K_PASSWORD_HASH, getSetting } from "@/lib/admin/auth";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in · Admin",
};

// Always hit the database: the setup-vs-login decision must never be cached.
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const hasPassword = !!(await getSetting(K_PASSWORD_HASH));
  return (
    <div className="adm-auth-wrap">
      <div className="adm-auth-card">
        {/* The doorplate (DESIGN-SPEC §5.12): mono micro-label + Syne name,
            gold keyline via .adm-auth-card::before. */}
        <p className="adm-auth-micro">Ops Console</p>
        <p className="adm-auth-brand">Bradley Griffin</p>
        <LoginForm mode={hasPassword ? "login" : "setup"} />
      </div>
    </div>
  );
}
