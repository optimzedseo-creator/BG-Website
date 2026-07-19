"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { destroySession, requireAdmin } from "@/lib/admin/auth";
import { clearModeCookie, setModeCookie } from "@/lib/admin/iq/mode";
import type { IqMode } from "@/lib/admin/iq/types";

export async function logoutAction(): Promise<void> {
  // Invariant: every admin action awaits requireAdmin() first. Logout is safe
  // either way (it only de-authorizes), but the rule stays absolute so the
  // security audit can grep for it.
  await requireAdmin();
  await destroySession();
  redirect("/admin/login");
}

/**
 * Wave 4 Stage B — flip the session data mode (the LIVE/DEMO pill submits here).
 * requireAdmin() FIRST-LINE (the cookie is meaningful only behind the gate);
 * "demo" sets the httpOnly cookie, anything else clears it (fail-safe to live).
 * Then revalidate the whole admin layout so every server-rendered surface
 * repaints in the new mode with no wrong-mode flash. Mode NEVER goes in the URL.
 */
export async function setModeAction(mode: IqMode): Promise<{ ok?: true; error?: string }> {
  if (!(await requireAdmin())) return { error: "Unauthorized" };
  if (mode === "demo") await setModeCookie("demo");
  else await clearModeCookie();
  revalidatePath("/admin", "layout");
  return { ok: true };
}
