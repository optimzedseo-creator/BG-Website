// Duration patch for a PageView — hit by navigator.sendBeacon on pagehide /
// visibilitychange, so it must accept a bare text body and always answer 204.
//   POST /api/track/duration  { id, duration }
// The id is an unguessable cuid returned by /api/track; updateMany means a
// stale/unknown id is a silent no-op, never an error.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isBot } from "@/lib/track";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 512;
const MAX_DURATION_S = 6 * 60 * 60; // cap at 6h — anything longer is a parked tab

function drop(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: Request) {
  if (isBot(req.headers.get("user-agent"))) return drop();

  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return drop();
    const body = JSON.parse(raw) as { id?: unknown; duration?: unknown };
    const id = typeof body.id === "string" && /^[a-z0-9]{20,40}$/i.test(body.id) ? body.id : null;
    const duration =
      typeof body.duration === "number" && Number.isFinite(body.duration)
        ? Math.min(Math.max(Math.round(body.duration), 0), MAX_DURATION_S)
        : null;
    if (!id || duration === null) return drop();
    await prisma.pageView.updateMany({ where: { id }, data: { duration } });
  } catch (err) {
    console.error("duration patch failed", err);
  }
  return drop();
}
