// Email-list capture — book-launch list (BOOK-PLAN.md Phase 0).
// POST /api/subscribe { email, source?, _gotcha? } → stores a Subscriber.
// Hardening mirrors /api/contact + /api/track (established patterns):
//   bot-UA filter, per-IP rate dampening, payload cap, honeypot, email regex.
// Idempotent: re-subscribing the same email is a no-op success. The response
// NEVER reveals whether the address already existed (no enumeration signal).
// Deliverability: this endpoint only STORES subscribers — it sends nothing.
// No welcome/confirm email is wired yet (no lib/email helper exists, and the
// RESEND_API_KEY is sensitive/unretrievable — see the TODO block below).
// PRIVACY: subscriber emails are PII — NEVER log them.

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { isBot, clean } from "@/lib/track";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 4 * 1024; // an email + source is tiny — cap hard
const ALLOWED_SOURCES = new Set(["site", "book", "writing", "event"]);

// Per-instance rate dampening (same caveat as /api/contact and /api/track:
// serverless instances don't share state — this slows floods, not a hard limit).
const RATE_MAX = 5; // submissions...
const RATE_WINDOW_MS = 10 * 60 * 1000; // ...per 10 minutes per IP
const recentHits = new Map<string, number[]>();

function rateLimited(req: Request): boolean {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = typeof fwd === "string" && fwd.length ? fwd.split(",")[0].trim() : "unknown";
  const now = Date.now();
  const fresh = (recentHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (fresh.length >= RATE_MAX) {
    recentHits.set(ip, fresh);
    return true;
  }
  fresh.push(now);
  recentHits.set(ip, fresh);
  if (recentHits.size > 500) {
    for (const [k, v] of recentHits) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) recentHits.delete(k);
    }
  }
  return false;
}

// Garbage / abuse resolve to a neutral 200 {ok:true} so bots learn nothing and
// the UI stays gentle. Only genuine user-fixable input (bad email) returns 400.
function ok(): NextResponse {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  // Bot filter + rate dampening first — cheap, and they never leak a signal.
  if (isBot(req.headers.get("user-agent"))) return ok();
  if (rateLimited(req)) return ok();

  const declaredLen = parseInt(req.headers.get("content-length") || "0", 10);
  if (declaredLen > MAX_BODY_BYTES) return ok();

  let data: Record<string, unknown> = {};
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return ok();
    data = JSON.parse(raw || "{}");
  } catch {
    return ok();
  }
  if (!data || typeof data !== "object") return ok();

  // Honeypot: real people leave it empty; bots fill it. Silently accept + drop.
  if (typeof data._gotcha === "string" && data._gotcha.trim()) return ok();

  const rawEmail = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const email = rawEmail.slice(0, 320);
  // Bad email is the one case worth surfacing so the visitor can fix it.
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "That email address doesn't look right." },
      { status: 400 }
    );
  }

  const sourceRaw = clean(data.source, 40) || "site";
  const source = ALLOWED_SOURCES.has(sourceRaw) ? sourceRaw : "site";

  try {
    // Idempotent upsert. New rows get a confirmToken (double-opt-in ready);
    // existing rows are a true no-op so createdAt/source stay put and the
    // response can't reveal whether the address was already on the list.
    await prisma.subscriber.upsert({
      where: { email },
      update: {},
      create: { email, source, confirmToken: randomUUID() },
      select: { id: true },
    });
  } catch (err) {
    // NO PII in logs — never log the email. Fail soft: the visitor sees success
    // regardless (retry-safe because the upsert is idempotent).
    console.error("subscribe write failed");
    void err;
  }

  // TODO(deliverability, owed before ANY list send): welcome / double-opt-in
  // confirm email. No lib/email helper exists yet and RESEND_API_KEY is
  // sensitive/unretrievable, so nothing is sent here — do NOT add a test blast.
  // When wired: send a confirm link using confirmToken, then a
  // /api/subscribe/confirm route flips `confirmed` true (double opt-in).
  // TODO(CAN-SPAM, owed): a working unsubscribe route + link. Real identity +
  // one-click unsubscribe must exist and be honored before the list mails.

  return ok();
}
