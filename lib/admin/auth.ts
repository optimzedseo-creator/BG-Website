// Admin auth core — Phase 4 (BACKEND-PLAN.md §5, Griffin Opus pattern).
// scrypt password hashing + jose HS256 JWT session + Setting-based lockout.
// Server-only: imported by server actions, route handlers, and layouts.
//
// THE NON-NEGOTIABLE RULE (documented incident source at Griffin Opus):
// requireAdmin() must be awaited at the TOP of EVERY admin server action and
// admin route handler. Middleware alone is insufficient — server actions are
// public POST endpoints and re-verify independently.

import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { prisma } from "@/lib/db";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

export const SESSION_COOKIE = "bg_admin";
const SESSION_MAX_AGE_S = 12 * 60 * 60; // 12h full session
const PENDING_MAX_AGE_S = 5 * 60; // 5min between password and TOTP code

// Lockout policy: 5 failed logins (password OR TOTP) → 15-minute lock.
const LOCKOUT_MAX_FAILS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

// Setting keys (single source of truth — schema comment mirrors these).
export const K_PASSWORD_HASH = "admin_password_hash";
export const K_TOTP_SECRET = "admin_totp_secret";
export const K_TOTP_PENDING = "admin_totp_pending";
export const K_LOCKOUT = "admin_lockout";

// ---- Setting helpers --------------------------------------------------------

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row ? row.value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

export async function deleteSetting(key: string): Promise<void> {
  await prisma.setting.deleteMany({ where: { key } });
}

// ---- Password hashing (scrypt, per-hash random salt) ------------------------

const SCRYPT_KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, SCRYPT_KEYLEN);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const derived = await scrypt(password, Buffer.from(saltHex, "hex"), SCRYPT_KEYLEN);
  const expected = Buffer.from(hashHex, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/** Constant-time compare for the one-time SETUP_TOKEN. */
export function safeTokenEqual(supplied: string, expected: string): boolean {
  const a = Buffer.from(supplied, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ---- Session JWT (jose HS256, httpOnly cookie) ------------------------------

function sessionSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    // Fail closed: no secret → no sessions can be created OR verified.
    throw new Error("ADMIN_SESSION_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

type Stage = "full" | "totp";

async function signSession(stage: Stage, maxAgeS: number): Promise<string> {
  return new SignJWT({ stage })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("admin")
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAgeS)
    .sign(sessionSecret());
}

/** Issue the session cookie. stage "totp" = password ok, awaiting 2FA code. */
export async function createSession(stage: Stage): Promise<void> {
  const maxAge = stage === "full" ? SESSION_MAX_AGE_S : PENDING_MAX_AGE_S;
  const token = await signSession(stage, maxAge);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/admin",
    maxAge,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/admin",
    maxAge: 0,
  });
}

async function verifySessionToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;
  }
}

/**
 * THE gate. Await at the top of EVERY admin server action / route handler /
 * layout. Returns the JWT payload for a fully authenticated admin session,
 * or null (caller must stop: redirect to /admin/login or return an error).
 */
export async function requireAdmin(): Promise<JWTPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload || payload.sub !== "admin" || payload.stage !== "full") return null;
  return payload;
}

/** Pending (password-verified, TOTP outstanding) session — login step 2 only. */
export async function requirePendingTotp(): Promise<JWTPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload || payload.sub !== "admin" || payload.stage !== "totp") return null;
  return payload;
}

// ---- Lockout (Setting-based counters, like Griffin Opus) --------------------

type LockoutState = { fails: number; until: number };

async function readLockout(): Promise<LockoutState> {
  const raw = await getSetting(K_LOCKOUT);
  if (!raw) return { fails: 0, until: 0 };
  try {
    const parsed = JSON.parse(raw) as Partial<LockoutState>;
    return { fails: Number(parsed.fails) || 0, until: Number(parsed.until) || 0 };
  } catch {
    return { fails: 0, until: 0 };
  }
}

/** Milliseconds until the lock lifts, or 0 if not locked. */
export async function lockedForMs(): Promise<number> {
  const { until } = await readLockout();
  const remaining = until - Date.now();
  return remaining > 0 ? remaining : 0;
}

/** Record a failed password/TOTP attempt; 5th failure starts a 15-min lock. */
export async function registerFailure(): Promise<void> {
  const state = await readLockout();
  const fails = state.fails + 1;
  const until = fails >= LOCKOUT_MAX_FAILS ? Date.now() + LOCKOUT_WINDOW_MS : state.until;
  await setSetting(K_LOCKOUT, JSON.stringify({ fails: fails >= LOCKOUT_MAX_FAILS ? 0 : fails, until }));
}

export async function clearFailures(): Promise<void> {
  await deleteSetting(K_LOCKOUT);
}
