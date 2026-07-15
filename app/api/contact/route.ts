// Contact endpoint — ported 1:1 from the legacy api/contact.js Vercel function.
// Receives the contact form and emails it via Resend.
// Env vars (set in Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY   (required)  your Resend API key
//   CONTACT_TO       (optional)  where leads land; default griff_brad@yahoo.com
//   CONTACT_FROM     (optional)  verified sender; default "Bradley Griffin <leads@bradleygriffin.us>"

import { NextResponse } from "next/server";

export const runtime = "nodejs";

// ---- Abuse dampening ------------------------------------------------------
// In-instance rate limiter: Map of IP -> recent submission timestamps.
// NOTE: Vercel serverless instances do NOT share state — each warm instance
// keeps its own Map, and cold starts reset it. This is abuse DAMPENING
// (slows scripted spam / Resend-quota burn), not a hard guarantee. A hard
// limit would need shared state (KV/Upstash) — deliberately out of scope
// for a portfolio contact form.
const RATE_LIMIT_MAX = 5; // max submissions...
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // ...per 10 minutes per IP
const MAX_BODY_BYTES = 10 * 1024; // 10KB payload cap — far above any real inquiry
const recentHits = new Map<string, number[]>();

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const fresh = (recentHits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (fresh.length >= RATE_LIMIT_MAX) {
    recentHits.set(ip, fresh);
    return true;
  }
  fresh.push(now);
  recentHits.set(ip, fresh);
  // Bound memory on long-lived instances: drop IPs whose entries all expired.
  if (recentHits.size > 500) {
    for (const [k, v] of recentHits) {
      if (v.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) recentHits.delete(k);
    }
  }
  return false;
}
// ---------------------------------------------------------------------------

const esc = (s: unknown): string =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export async function POST(req: Request) {
  // Payload size cap (cheap check first — declared size).
  const declaredLen = parseInt(req.headers.get("content-length") || "0", 10);
  if (declaredLen > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Message too large. Please shorten it and try again." },
      { status: 413 }
    );
  }

  // Per-IP rate limit (see note at top: per-instance dampening, not a hard guarantee).
  if (isRateLimited(clientIp(req))) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": "600" } }
    );
  }

  // Parse body — enforce the size cap on the ACTUAL bytes too (content-length can lie).
  let data: Record<string, unknown> = {};
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Message too large. Please shorten it and try again." },
        { status: 413 }
      );
    }
    data = JSON.parse(raw || "{}");
  } catch {
    data = {};
  }

  const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
  const name = str(data.name).trim();
  const email = str(data.email).trim();
  const phone = str(data.phone).trim();
  const company = str(data.company).trim();
  const type = (str(data.type) || "General inquiry").trim();
  const message = str(data.message).trim();

  // Honeypot: real people leave it empty; bots fill it. Silently accept + drop.
  if (data._gotcha) return NextResponse.json({ ok: true });

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Please complete name, email, and message." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "That email address doesn't look right." }, { status: 400 });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Email isn't configured yet. Please email directly for now." },
      { status: 503 }
    );
  }

  const to = process.env.CONTACT_TO || "griff_brad@yahoo.com";
  const from = process.env.CONTACT_FROM || "Bradley Griffin <leads@bradleygriffin.us>";
  const subject = `New inquiry — ${type} — ${name}`;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#121417;max-width:560px;margin:0 auto;">
      <div style="border-top:4px solid #B33A2B;padding:20px 0 8px;">
        <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#B33A2B;font-weight:bold;margin:0 0 6px;">New inquiry — bradleygriffin.us</p>
        <h2 style="font-size:20px;margin:0 0 4px;">${esc(type)}</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">
        <tr><td style="padding:8px 0;color:#565A60;width:120px;">Name</td><td style="padding:8px 0;font-weight:600;">${esc(name)}</td></tr>
        <tr><td style="padding:8px 0;color:#565A60;">Email</td><td style="padding:8px 0;"><a href="mailto:${esc(email)}" style="color:#B33A2B;">${esc(email)}</a></td></tr>
        <tr><td style="padding:8px 0;color:#565A60;">Phone</td><td style="padding:8px 0;">${esc(phone) || "—"}</td></tr>
        <tr><td style="padding:8px 0;color:#565A60;">Company</td><td style="padding:8px 0;">${esc(company) || "—"}</td></tr>
        <tr><td style="padding:8px 0;color:#565A60;vertical-align:top;">Message</td><td style="padding:8px 0;white-space:pre-wrap;line-height:1.6;">${esc(message)}</td></tr>
      </table>
      <p style="font-size:12px;color:#9A9FA6;margin-top:18px;border-top:1px solid #E4DDCE;padding-top:12px;">Reply directly to this email to respond to ${esc(name)}.</p>
    </div>`;

  const text =
    `New inquiry — ${type}\n\n` +
    `Name: ${name}\nEmail: ${email}\nPhone: ${phone || "—"}\nCompany: ${company || "—"}\n\n${message}\n`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: email, subject, html, text }),
    });
    if (!r.ok) {
      const detail = await r.text();
      console.error("Resend error", r.status, detail);
      return NextResponse.json({ error: "Couldn't send right now. Please try again shortly." }, { status: 502 });
    }

    // Analytics + CRM: recorded server-side AFTER the successful send.
    // Strictly additive — every failure here is logged and swallowed so the
    // email path is never affected, even if the DB is down entirely.
    const cookieHeader = req.headers.get("cookie") || "";
    const vid = cookieHeader.match(/(?:^|;\s*)bg_vid=([A-Za-z0-9-]{16,64})/);
    const visitorId = vid ? vid[1] : null;

    // Analytics WIN event (Phase 2, BACKEND-PLAN.md §6). NO PII in meta:
    // inquiry type only, never name/email/message contents.
    try {
      const { prisma } = await import("@/lib/db");
      await prisma.event.create({
        data: {
          name: "form_submit",
          path: "/contact",
          visitorId,
          meta: { type: type.slice(0, 100) },
        },
      });
    } catch (err) {
      console.error("form_submit analytics write failed", err);
    }

    // CRM capture (Phase 3, BACKEND-PLAN.md §3): upsert the Lead by email
    // (repeat contact updates details but keeps the original createdAt and
    // status — status is NEVER set from client input), then append the
    // message to the lead's timeline as a "brief" Activity.
    try {
      const { prisma } = await import("@/lib/db");
      const details = {
        name: name.slice(0, 200),
        phone: phone ? phone.slice(0, 50) : null,
        company: company ? company.slice(0, 200) : null,
        inquiryType: type.slice(0, 100),
        message: message.slice(0, 8000),
        ...(visitorId ? { visitorId } : {}),
      };
      const lead = await prisma.lead.upsert({
        where: { email: email.slice(0, 320).toLowerCase() },
        update: details,
        create: { email: email.slice(0, 320).toLowerCase(), ...details },
        select: { id: true },
      });
      await prisma.activity.create({
        data: { leadId: lead.id, type: "brief", body: message.slice(0, 8000) },
      });
    } catch (err) {
      console.error("CRM lead write failed", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("contact handler error", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
