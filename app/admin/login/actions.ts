"use server";

// Login + first-time setup server actions — Phase 4 (BACKEND-PLAN.md §5).
// Setup is TOKEN-GATED: /admin was being probed before this phase existed, so
// an empty database must never mean "first visitor becomes admin". The
// SETUP_TOKEN lives only in Vercel env / local .env; completing setup requires
// it, and once a password hash exists the setup path is dead.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  K_PASSWORD_HASH,
  K_TOTP_SECRET,
  clearFailures,
  createSession,
  getSetting,
  hashPassword,
  lockedForMs,
  registerFailure,
  requirePendingTotp,
  safeTokenEqual,
  setSetting,
  verifyPassword,
} from "@/lib/admin/auth";
import { clientIpFromHeaders, rateDampen } from "@/lib/admin/ratelimit";
import { verifyTotp } from "@/lib/admin/totp";

export type AuthFormState = {
  error?: string;
  /** "totp" = password accepted, show the 6-digit code step. */
  stage?: "totp";
};

const PASSWORD_MIN = 12;
const PASSWORD_MAX = 200; // cap scrypt input (DoS guard)

function field(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v : "";
}

async function dampened(bucket: string): Promise<boolean> {
  const ip = await clientIpFromHeaders(await headers());
  return rateDampen(bucket, ip, 10, 10 * 60 * 1000); // 10 attempts / 10 min / IP
}

async function lockoutMessage(): Promise<string | null> {
  const ms = await lockedForMs();
  if (ms <= 0) return null;
  return `Locked after repeated failures. Try again in ${Math.ceil(ms / 60000)} minute(s).`;
}

// ---- First-time setup (token-gated, single-use by construction) -------------

export async function setupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (await dampened("admin-setup")) return { error: "Too many attempts. Wait a few minutes." };

  if (await getSetting(K_PASSWORD_HASH)) {
    return { error: "Setup is already complete. Sign in with your password instead." };
  }

  const expected = process.env.SETUP_TOKEN;
  const token = field(formData, "token").trim();
  if (!expected || !token || !safeTokenEqual(token, expected)) {
    return { error: "Invalid setup token." };
  }

  const password = field(formData, "password");
  const confirm = field(formData, "confirm");
  if (password.length < PASSWORD_MIN) {
    return { error: `Password must be at least ${PASSWORD_MIN} characters.` };
  }
  if (password.length > PASSWORD_MAX) return { error: "Password is too long." };
  if (password !== confirm) return { error: "Passwords do not match." };

  await setSetting(K_PASSWORD_HASH, await hashPassword(password));
  await clearFailures();
  await createSession("full");
  redirect("/admin");
}

// ---- Login step 1: password -------------------------------------------------

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (await dampened("admin-login")) return { error: "Too many attempts. Wait a few minutes." };

  const hash = await getSetting(K_PASSWORD_HASH);
  if (!hash) return { error: "No admin password exists yet. Complete first-time setup." };

  const locked = await lockoutMessage();
  if (locked) return { error: locked };

  const password = field(formData, "password");
  if (!password || password.length > PASSWORD_MAX || !(await verifyPassword(password, hash))) {
    await registerFailure();
    return { error: "Sign-in failed." };
  }

  await clearFailures();

  if (await getSetting(K_TOTP_SECRET)) {
    // Two-step: short-lived pending session between password and code.
    await createSession("totp");
    return { stage: "totp" };
  }

  await createSession("full");
  redirect("/admin");
}

// ---- Login step 2: TOTP code --------------------------------------------------

export async function totpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (await dampened("admin-totp")) return { error: "Too many attempts. Wait a few minutes.", stage: "totp" };

  if (!(await requirePendingTotp())) {
    return { error: "That took too long. Enter your password again." };
  }

  const locked = await lockoutMessage();
  if (locked) return { error: locked, stage: "totp" };

  const secret = await getSetting(K_TOTP_SECRET);
  if (!secret) {
    // 2FA was disabled between the two steps; the password already verified.
    await createSession("full");
    redirect("/admin");
  }

  const code = field(formData, "code");
  if (!verifyTotp(secret!, code)) {
    await registerFailure();
    return { error: "That code didn't match.", stage: "totp" };
  }

  await clearFailures();
  await createSession("full");
  redirect("/admin");
}
