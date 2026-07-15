"use server";

// /admin/security server actions: TOTP enrollment (QR + code confirmation so
// Brad can never lock himself out with an unscanned secret), 2FA disable
// (requires a valid current code), and password change (requires the current
// password). Every action starts with requireAdmin() — the invariant.

import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import {
  K_PASSWORD_HASH,
  K_TOTP_PENDING,
  K_TOTP_SECRET,
  deleteSetting,
  getSetting,
  hashPassword,
  requireAdmin,
  setSetting,
  verifyPassword,
} from "@/lib/admin/auth";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "@/lib/admin/totp";

const PASSWORD_MIN = 12;
const PASSWORD_MAX = 200;

function field(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v : "";
}

export type EnrollStart = { error?: string; qr?: string; secret?: string };

/** Step 1: mint a pending secret and return the QR + manual-entry code. */
export async function beginTotpEnroll(): Promise<EnrollStart> {
  if (!(await requireAdmin())) return { error: "Unauthorized" };

  if (await getSetting(K_TOTP_SECRET)) return { error: "Two-factor is already enabled." };

  const secret = generateTotpSecret();
  await setSetting(K_TOTP_PENDING, secret);
  // data: URL — img-src already allows data: in the CSP.
  const qr = await QRCode.toDataURL(otpauthUrl(secret), { margin: 4, width: 256, errorCorrectionLevel: "M" });
  return { qr, secret };
}

export type FormResult = { error?: string; ok?: boolean };

/** Step 2: 2FA only turns ON after a valid code proves the scan worked. */
export async function confirmTotpEnroll(_prev: FormResult, formData: FormData): Promise<FormResult> {
  if (!(await requireAdmin())) return { error: "Unauthorized" };

  const pending = await getSetting(K_TOTP_PENDING);
  if (!pending) return { error: "No enrollment in progress — generate a QR code first." };

  if (!verifyTotp(pending, field(formData, "code"))) {
    return { error: "That code didn't match. Check your authenticator and try again." };
  }

  await setSetting(K_TOTP_SECRET, pending);
  await deleteSetting(K_TOTP_PENDING);
  revalidatePath("/admin/security");
  return { ok: true };
}

/** Disable 2FA — requires a valid current code (no code = use the documented
 *  DB recovery: delete the admin_totp_secret Setting row via Neon). */
export async function disableTotp(_prev: FormResult, formData: FormData): Promise<FormResult> {
  if (!(await requireAdmin())) return { error: "Unauthorized" };

  const secret = await getSetting(K_TOTP_SECRET);
  if (!secret) return { error: "Two-factor is not enabled." };

  if (!verifyTotp(secret, field(formData, "code"))) {
    return { error: "That code didn't match." };
  }

  await deleteSetting(K_TOTP_SECRET);
  revalidatePath("/admin/security");
  return { ok: true };
}

export async function changePassword(_prev: FormResult, formData: FormData): Promise<FormResult> {
  if (!(await requireAdmin())) return { error: "Unauthorized" };

  const hash = await getSetting(K_PASSWORD_HASH);
  if (!hash) return { error: "No password is set." };

  const current = field(formData, "current");
  if (!current || current.length > PASSWORD_MAX || !(await verifyPassword(current, hash))) {
    return { error: "Current password is incorrect." };
  }

  const next = field(formData, "password");
  const confirm = field(formData, "confirm");
  if (next.length < PASSWORD_MIN) return { error: `New password must be at least ${PASSWORD_MIN} characters.` };
  if (next.length > PASSWORD_MAX) return { error: "New password is too long." };
  if (next !== confirm) return { error: "New passwords do not match." };

  await setSetting(K_PASSWORD_HASH, await hashPassword(next));
  return { ok: true };
}
