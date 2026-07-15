"use server";

import { redirect } from "next/navigation";
import { destroySession, requireAdmin } from "@/lib/admin/auth";

export async function logoutAction(): Promise<void> {
  // Invariant: every admin action awaits requireAdmin() first. Logout is safe
  // either way (it only de-authorizes), but the rule stays absolute so the
  // security audit can grep for it.
  await requireAdmin();
  await destroySession();
  redirect("/admin/login");
}
