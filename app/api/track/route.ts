// First-party analytics capture — Phase 2 (BACKEND-PLAN.md §6).
// POST /api/track with either:
//   { kind: "pageview", path, referrer? }        → creates a PageView, returns { id }
//   { kind: "event", name, path, meta? }          → creates an Event, returns { ok }
// Sets/reads the httpOnly `bg_vid` visitor cookie. Bots and malformed payloads
// are dropped silently (204) — no signal to abusers, no DB writes.
// CSP note: same-origin endpoint; connect-src 'self' already allows it — no
// CSP change needed (verified against next.config.ts).

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  VISITOR_COOKIE,
  VISITOR_COOKIE_MAX_AGE,
  VISITOR_COOKIE_RE,
  isBot,
  parseDevice,
  parseBrowser,
  clean,
} from "@/lib/track";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 4 * 1024;

// client-spoofable names are limited to this list; form_submit is recorded
// SERVER-side only (in /api/contact) so WINS can't be faked from the client.
const CLIENT_EVENT_NAMES = new Set(["chooser_click", "cta_click", "booking"]);

// Per-instance rate dampening (same caveats as /api/contact: serverless
// instances don't share state — this slows floods, it isn't a hard limit).
const RATE_MAX = 60; // requests...
const RATE_WINDOW_MS = 60 * 1000; // ...per minute per IP
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

function drop(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: Request) {
  const ua = req.headers.get("user-agent");
  if (isBot(ua)) return drop();
  if (rateLimited(req)) return drop();

  const declaredLen = parseInt(req.headers.get("content-length") || "0", 10);
  if (declaredLen > MAX_BODY_BYTES) return drop();

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return drop();
    body = JSON.parse(raw);
  } catch {
    return drop();
  }
  if (!body || typeof body !== "object") return drop();

  const path = clean(body.path, 200);
  if (!path || !path.startsWith("/")) return drop();

  // Visitor id: read the cookie or mint a new one (set on the response below).
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(VISITOR_COOKIE_RE);
  const visitorId = match ? match[1] : randomUUID();

  let res: NextResponse;

  try {
    if (body.kind === "pageview") {
      const view = await prisma.pageView.create({
        data: {
          path,
          visitorId,
          referrer: clean(body.referrer, 300),
          device: parseDevice(ua!),
          browser: parseBrowser(ua!),
          country: clean(req.headers.get("x-vercel-ip-country"), 8), // prod-only header
        },
        select: { id: true },
      });
      res = NextResponse.json({ id: view.id });
    } else if (body.kind === "event") {
      const name = clean(body.name, 40);
      if (!name || !CLIENT_EVENT_NAMES.has(name)) return drop();
      let meta: Record<string, string> | undefined;
      if (body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)) {
        meta = {};
        for (const [k, v] of Object.entries(body.meta as Record<string, unknown>).slice(0, 6)) {
          const val = clean(v, 200);
          if (val) meta[k.slice(0, 40)] = val;
        }
      }
      await prisma.event.create({
        data: { name, path, visitorId, meta },
      });
      res = NextResponse.json({ ok: true });
    } else {
      return drop();
    }
  } catch (err) {
    console.error("track write failed", err);
    return drop();
  }

  res.cookies.set(VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: VISITOR_COOKIE_MAX_AGE,
  });
  return res;
}
