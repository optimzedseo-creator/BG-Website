// Calendly booking capture — Phase 3 (BACKEND-PLAN.md §3/§6 Tier 1).
// POST /api/booking with { event?, invitee? } — the URIs from the Calendly
// popup's `calendly.event_scheduled` postMessage payload. The postMessage
// does NOT include the invitee's email, so we store the URIs for later
// enrichment (needs a Calendly personal access token — deliberately not built).
//
// Hardening mirrors /api/track: bot-UA filter, per-instance rate dampening,
// 4KB cap, silent 204 on anything malformed. Same-origin only: CSP's
// connect-src 'self' covers the browser side, and we additionally drop
// cross-origin POSTs by comparing the Origin header's host to the request
// Host. The bg_vid cookie is READ only — a booking with no prior pageview
// simply lands without a visitorId (never mint ids here).
//
// If a Lead with the same visitorId already exists, the booking is linked to
// it and a "booking" Activity lands on the lead's timeline. Bookings without
// a matching lead still land — enrichment can stitch them later.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { VISITOR_COOKIE_RE, isBot, clean } from "@/lib/track";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 4 * 1024;
const CALENDLY_URI_RE = /^https:\/\/api\.calendly\.com\/[A-Za-z0-9/_-]{1,300}$/;

// Per-instance rate dampening (same caveats as /api/track: serverless
// instances don't share state — slows floods, not a hard limit). Bookings
// are rare; the ceiling is deliberately low.
const RATE_MAX = 10; // requests...
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
  if (isBot(req.headers.get("user-agent"))) return drop();
  if (rateLimited(req)) return drop();

  // Same-origin check: browsers always send Origin on POST fetches. If it's
  // present and its host doesn't match the request Host, drop silently.
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.get("host")) return drop();
    } catch {
      return drop();
    }
  }

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

  // URIs are optional (Calendly could change its payload shape) but when
  // present they must look like real Calendly API URIs — anything else drops.
  const eventUri = clean(body.event, 400);
  const inviteeUri = clean(body.invitee, 400);
  if (eventUri && !CALENDLY_URI_RE.test(eventUri)) return drop();
  if (inviteeUri && !CALENDLY_URI_RE.test(inviteeUri)) return drop();

  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(VISITOR_COOKIE_RE);
  const visitorId = match ? match[1] : null;

  try {
    // Link to an existing Lead by visitorId when possible (most recent wins).
    let leadId: string | null = null;
    if (visitorId) {
      const lead = await prisma.lead.findFirst({
        where: { visitorId },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });
      leadId = lead ? lead.id : null;
    }

    await prisma.booking.create({
      data: {
        calendlyEventUri: eventUri,
        calendlyInviteeUri: inviteeUri,
        visitorId,
        leadId,
      },
    });

    if (leadId) {
      await prisma.activity.create({
        data: {
          leadId,
          type: "booking",
          body: `Calendly booking captured${eventUri ? ` — ${eventUri}` : ""}`,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("booking write failed", err);
    return drop();
  }
}
