// GSC daily pull — WP4 (ANALYTICS-BUILD-PLAN §WP4, INTEGRATIONS-SETUP Runbook 1).
// GET /api/cron/gsc, triggered by Vercel Cron (vercel.json `crons`), which sends
// `Authorization: Bearer ${CRON_SECRET}` automatically when the env var is set.
//
// Contract:
//   auth     — Bearer CRON_SECRET (timing-safe compare). Missing env = fail
//              closed. Anything else → 401, no body detail.
//   input    — none (window is computed server-side; no client input at all).
//   work     — decode GSC_SA_KEY_B64 IN MEMORY (never written to disk, never
//              logged), mint a Google OAuth2 access token via RS256 JWT grant
//              (jose — already a dep, no SDK added), scope webmasters.readonly,
//              then pull a sliding 5-day window ending 2 days back (GSC lags
//              2–3 days; overlap is safe because every write is an upsert on a
//              unique key). Three cuts: [date,query,page] rows pre-tagged at
//              ingest (lib/gsc-classify), [date] totals (the "% classifiable"
//              denominator — GSC anonymizes rare queries), [date,country]
//              (the honest geo cut).
//   success  — 200 { ok:true, window, queryRows, dailyRows, countryRows,
//              classifierVersion }.
//   failure  — LOUD: 500 { ok:false, error } + console.error, never a silent
//              pass (a silently-rotting cron banks no trend). Error strings
//              carry statuses/messages only — never key material or tokens.
//   secrets  — GSC_SA_KEY_B64 / GSC_PROPERTY / CRON_SECRET are Production-only
//              Vercel env vars; this route cannot run locally by design.
//   PII      — none expected (search query strings); defensively control-char
//              stripped + length-capped anyway. No raw IPs, nothing touches
//              the CRM tables.

import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { importPKCS8, SignJWT } from "jose";
import { prisma } from "@/lib/db";
import {
  GSC_CLASSIFIER_VERSION,
  classifyQuery,
  cleanGscString,
} from "@/lib/gsc-classify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const ROW_LIMIT = 25000; // API max per request; paginate via startRow
const WINDOW_DAYS = 5; // sliding window, re-upserted daily (overlap-safe)
const LAG_DAYS = 2; // GSC data is 2–3 days in arrears
const MAX_QUERY_LEN = 1024; // caps agreed with bradley-database (btree ceiling)
const MAX_PAGE_LEN = 2048;
const UPSERT_CHUNK = 50;

// Timing-safe bearer check. Hashing first equalizes lengths so timingSafeEqual
// never throws and comparison time is constant regardless of input.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed: unset secret = route disabled
  const presented = createHash("sha256")
    .update(req.headers.get("authorization") ?? "")
    .digest();
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(presented, expected);
}

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

function loadServiceAccount(): ServiceAccountKey {
  const b64 = process.env.GSC_SA_KEY_B64;
  if (!b64) throw new Error("GSC_SA_KEY_B64 is not set");
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  } catch {
    throw new Error("GSC_SA_KEY_B64 did not decode to valid JSON");
  }
  const sa = parsed as Partial<ServiceAccountKey>;
  if (typeof sa.client_email !== "string" || typeof sa.private_key !== "string") {
    throw new Error("service-account JSON missing client_email/private_key");
  }
  // Defensive: tolerate a key pasted with literal \n escapes.
  return {
    client_email: sa.client_email,
    private_key: sa.private_key.replace(/\\n/g, "\n"),
  };
}

async function mintAccessToken(sa: ServiceAccountKey): Promise<string> {
  const key = await importPKCS8(sa.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: GSC_SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    // Google's error body names the failure class (e.g. invalid_grant) without
    // secret material — safe and necessary for prod diagnosis.
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`Google token endpoint ${res.status}: ${detail}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("token response missing access_token");
  return data.access_token;
}

interface GscApiRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  position?: number;
}

async function searchAnalytics(
  token: string,
  property: string,
  body: Record<string, unknown>,
): Promise<GscApiRow[]> {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    property,
  )}/searchAnalytics/query`;
  const rows: GscApiRow[] = [];
  let startRow = 0;
  for (;;) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ ...body, rowLimit: ROW_LIMIT, startRow }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      throw new Error(`Search Analytics query ${res.status}: ${detail}`);
    }
    const page = (await res.json()) as { rows?: GscApiRow[] };
    const got = page.rows ?? [];
    rows.push(...got);
    if (got.length < ROW_LIMIT) return rows;
    startRow += ROW_LIMIT; // defensive pagination; unlikely at this volume
  }
}

function toInt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function toFloat(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// GSC returns dates as YYYY-MM-DD in the property's timezone; store as a
// calendar date (UTC midnight — @db.Date drops the time component).
function toDate(v: unknown): Date | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const property = process.env.GSC_PROPERTY;
  if (!property) {
    console.error("gsc cron: GSC_PROPERTY is not set");
    return NextResponse.json(
      { ok: false, error: "GSC_PROPERTY is not set" },
      { status: 500 },
    );
  }

  // Window: [today - LAG_DAYS - WINDOW_DAYS + 1, today - LAG_DAYS], UTC.
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - LAG_DAYS);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (WINDOW_DAYS - 1));
  const startDate = isoDay(start);
  const endDate = isoDay(end);

  try {
    const token = await mintAccessToken(loadServiceAccount());

    const [queryRows, dailyRows, countryRows] = await Promise.all([
      searchAnalytics(token, property, {
        startDate,
        endDate,
        dimensions: ["date", "query", "page"],
      }),
      searchAnalytics(token, property, {
        startDate,
        endDate,
        dimensions: ["date"],
      }),
      searchAnalytics(token, property, {
        startDate,
        endDate,
        dimensions: ["date", "country"],
      }),
    ]);

    // --- [date, query, page] rows, tagged at ingest -------------------------
    let upsertedQueries = 0;
    let skippedRows = 0;
    const queryUpserts = [];
    for (const r of queryRows) {
      const date = toDate(r.keys?.[0]);
      const query = cleanGscString(r.keys?.[1], MAX_QUERY_LEN);
      const page = cleanGscString(r.keys?.[2], MAX_PAGE_LEN);
      if (!date || !query || !page) {
        skippedRows++;
        continue; // silent-but-counted rejection of malformed rows
      }
      const tags = classifyQuery(query);
      const metrics = {
        impressions: toInt(r.impressions),
        clicks: toInt(r.clicks),
        position: toFloat(r.position),
        ...tags,
        classifierVersion: GSC_CLASSIFIER_VERSION,
      };
      queryUpserts.push(
        prisma.gscQuery.upsert({
          where: { date_query_page: { date, query, page } },
          create: { date, query, page, ...metrics },
          update: metrics,
        }),
      );
      upsertedQueries++;
    }

    // --- [date] totals ------------------------------------------------------
    const dailyUpserts = [];
    for (const r of dailyRows) {
      const date = toDate(r.keys?.[0]);
      if (!date) continue;
      const totals = { impressions: toInt(r.impressions), clicks: toInt(r.clicks) };
      dailyUpserts.push(
        prisma.gscDaily.upsert({
          where: { date },
          create: { date, ...totals },
          update: totals,
        }),
      );
    }

    // --- [date, country] ----------------------------------------------------
    const countryUpserts = [];
    for (const r of countryRows) {
      const date = toDate(r.keys?.[0]);
      const country = cleanGscString(r.keys?.[1], 8);
      if (!date || !country) continue;
      const totals = { impressions: toInt(r.impressions), clicks: toInt(r.clicks) };
      countryUpserts.push(
        prisma.gscCountryDaily.upsert({
          where: { date_country: { date, country } },
          create: { date, country, ...totals },
          update: totals,
        }),
      );
    }

    // Chunked transactions: bounded batch size, and a failed chunk fails the
    // run loudly instead of half-vanishing.
    const all = [...queryUpserts, ...dailyUpserts, ...countryUpserts];
    for (let i = 0; i < all.length; i += UPSERT_CHUNK) {
      await prisma.$transaction(all.slice(i, i + UPSERT_CHUNK));
    }

    return NextResponse.json({
      ok: true,
      window: { startDate, endDate },
      queryRows: upsertedQueries,
      skippedRows,
      dailyRows: dailyUpserts.length,
      countryRows: countryUpserts.length,
      classifierVersion: GSC_CLASSIFIER_VERSION,
    });
  } catch (err) {
    // LOUD failure: non-200 + server log. Vercel cron surfaces non-2xx runs,
    // so a broken pull is visible instead of silently losing trend days.
    console.error("gsc cron failed", err);
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
