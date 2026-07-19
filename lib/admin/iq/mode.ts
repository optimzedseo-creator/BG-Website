// ADMIN-IQ — demo/live MODE selection (DATA-SPEC §7.2, Wave 4 Stage A).
//
// Mode is a SERVER-SIDE, httpOnly cookie — never an env var (no silent prod
// flip), never client-injected. `getSource(readMode())` picks the live-Prisma
// or the in-memory demo dataset; both return the SAME PII-free payload shapes,
// so a screen can flip between real numbers and a showable demo behind login.
//
// ⚠ SECURITY INVARIANT (mirrors internal.ts / source-live.ts): these helpers do
// NOT gate. The cookie is Brad presenting his OWN screen, so it is meaningful
// ONLY after authentication. EVERY caller (server component, server action,
// /api/admin/* route handler) MUST await requireAdmin() FIRST-LINE before it
// reads or writes this cookie. A caller that reads the mode before the gate is
// a rejected change, not a fixable one.
//
// FAIL-SAFE TO LIVE: readMode() returns "demo" ONLY when the cookie value is
// exactly "demo". Anything else — absent, tampered, stale, empty — resolves to
// "live", so real numbers are the default and demo is always an explicit opt-in.
//
// Stage A builds the helper only. Stage B wires pages/actions/handlers to it.

import "server-only";
import { cookies } from "next/headers";
import type { IqMode } from "./types";

/** The demo/live selection cookie. Scoped to /admin like the session cookie. */
export const MODE_COOKIE = "bg_iq_mode";

/** Session-ish lifetime: 12h. A demo presentation is one sitting; it should not
 * outlive the day, and it never outlives the 12h admin session either. */
const MODE_MAX_AGE_S = 12 * 60 * 60;

/**
 * Resolve the active mode from the httpOnly cookie. "demo" ONLY on an exact
 * match; every other state fails safe to "live". Caller MUST have passed
 * requireAdmin() before invoking (see header invariant).
 */
export async function readMode(): Promise<IqMode> {
  const value = (await cookies()).get(MODE_COOKIE)?.value;
  return value === "demo" ? "demo" : "live";
}

/**
 * Set the mode cookie (Server Action / Route Handler only — Next forbids cookie
 * writes during RSC render). httpOnly + secure + sameSite lax + path "/admin",
 * matching the session cookie's posture (auth.ts createSession).
 */
export async function setModeCookie(mode: IqMode): Promise<void> {
  (await cookies()).set(MODE_COOKIE, mode, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/admin",
    maxAge: MODE_MAX_AGE_S,
  });
}

/** Clear the mode cookie (return to live). Same attributes, maxAge 0. */
export async function clearModeCookie(): Promise<void> {
  (await cookies()).set(MODE_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/admin",
    maxAge: 0,
  });
}
