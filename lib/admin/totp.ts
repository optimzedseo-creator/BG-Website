// Self-implemented RFC 6238 TOTP (HMAC-SHA1, 6 digits, 30s step, ±1 window).
// Deliberately NOT a third-party auth library — keeps the dependency surface
// minimal per BACKEND-PLAN.md §5 (Griffin Opus pattern). Server-only.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

/** RFC 4648 base32 encode (no padding — authenticator apps don't need it). */
export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** RFC 4648 base32 decode. Throws on characters outside the alphabet. */
export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error("invalid base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** New 160-bit TOTP secret (RFC 4226 recommended length for SHA-1). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** RFC 4226 HOTP: HMAC-SHA1 + dynamic truncation, 6 digits. */
function hotp(secret: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  // JS bit-ops are 32-bit; write the 64-bit counter in two halves.
  msg.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  msg.writeUInt32BE(counter >>> 0, 4);
  const mac = createHmac("sha1", secret).update(msg).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const code =
    ((mac[offset] & 0x7f) << 24) |
    (mac[offset + 1] << 16) |
    (mac[offset + 2] << 8) |
    mac[offset + 3];
  return String(code % 10 ** DIGITS).padStart(DIGITS, "0");
}

/** Current TOTP code for a base32 secret (exported for the enroll self-test). */
export function totpCode(secretB32: string, atMs = Date.now(), stepOffset = 0): string {
  const counter = Math.floor(atMs / 1000 / STEP_SECONDS) + stepOffset;
  return hotp(base32Decode(secretB32), counter);
}

/** Constant-time compare of two same-format short strings. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Verify a user-supplied 6-digit code against the secret, ±1 time step. */
export function verifyTotp(secretB32: string, code: string): boolean {
  const supplied = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(supplied)) return false;
  let ok = false;
  for (const offset of [-1, 0, 1]) {
    // No early return: check all windows so timing doesn't leak which matched.
    if (safeEqual(totpCode(secretB32, Date.now(), offset), supplied)) ok = true;
  }
  return ok;
}

/** otpauth:// enrollment URL (rendered as a QR code on /admin/security). */
export function otpauthUrl(secretB32: string): string {
  const issuer = "bradleygriffin.us";
  const label = `${issuer}:admin`;
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}
