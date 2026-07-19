// Dashboard Wave PHASE 2 · WP1 — Dashboard persistence (the saved-layout CRUD).
//
// Storage: the Dashboard table (its OWN table — security ruling: never the
// Setting table, which holds auth secrets). `layout` is UNTRUSTED ON READ:
// every read here returns it through validateLayout() (invalid entries →
// tombstones, never a crash); every write stores cleanLayoutForWrite() output
// only (tombstones and junk are dropped before they ever hit the row).
//
// Single-default invariant: `isDefault` is enforced in the WRITE PATH
// (setDefault runs a transaction that clears every other row first) — there is
// no DB constraint, so ALL default flips must go through setDefaultDashboard.
//
// ⚠ SECURITY INVARIANT: these helpers do NOT gate. Every caller (the
// dashboard-actions server actions, any WP2 server page) MUST await
// requireAdmin() first-line before touching this module.

import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  cleanLayoutForWrite,
  validateLayout,
  type DashboardLayout,
} from "./widgets";

/** Prisma's InputJsonValue rejects interface types (no implicit index
 * signature). The cleaned layout is plain JSON by construction (string/number/
 * boolean leaves only — see LayoutWidget), so this cast is a type-system
 * formality, not a data conversion. */
function toJsonInput(layout: ReturnType<typeof cleanLayoutForWrite>): Prisma.InputJsonValue {
  return layout as unknown as Prisma.InputJsonValue;
}

/** Name bounds — Brad-typed display text, rendered as JSX text (never HTML). */
export const DASHBOARD_NAME_MAX = 60;

/** Row cap. The spec expects <10; the cap only bounds runaway automation. */
export const MAX_DASHBOARDS = 20;

/** cuid-shaped id gate (tolerant: lowercase alphanumeric, sane length). Keeps
 * junk out of Prisma where-clauses; a miss just means "not found". */
const DASHBOARD_ID_RE = /^[a-z0-9]{10,40}$/;

export function isDashboardId(v: unknown): v is string {
  return typeof v === "string" && DASHBOARD_ID_RE.test(v);
}

/** Strip control characters, collapse whitespace runs, trim, cap. Returns null
 * when nothing renderable remains. */
export function sanitizeDashboardName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, DASHBOARD_NAME_MAX)
    .trim();
  return v ? v : null;
}

/** One dashboard, layout already validated. ISO strings on the wire (standing
 * rule — these shapes cross the server-action boundary). */
export interface DashboardRecord {
  id: string;
  name: string;
  isDefault: boolean;
  layout: DashboardLayout;
  createdAt: string;
  updatedAt: string;
}

type DashboardRow = {
  id: string;
  name: string;
  isDefault: boolean;
  layout: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(row: DashboardRow): DashboardRecord {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.isDefault,
    layout: validateLayout(row.layout), // untrusted on read — always
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** All dashboards, oldest first (stable order for a picker). */
export async function listDashboardRecords(): Promise<DashboardRecord[]> {
  const rows = await prisma.dashboard.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toRecord);
}

/**
 * THE default-reader (Ph2-WP2 binding condition 1, QA gate KB:1711 / database
 * ruling KB:1704): deterministic under drift — if a hand-edited row set ever
 * carries two isDefault flags, the OLDEST wins (stable render, no flapping).
 * Zero defaults → null, and the surface falls back to the built-in Command
 * layout (deleting the default deliberately leaves no default).
 */
export async function getDefaultDashboardRecord(): Promise<DashboardRecord | null> {
  const row = await prisma.dashboard.findFirst({
    where: { isDefault: true },
    orderBy: { createdAt: "asc" },
  });
  return row ? toRecord(row) : null;
}

export type SaveDashboardResult = { ok: true; dashboard: DashboardRecord } | { error: string };

/**
 * Create (no id) or update (id) a dashboard. The stored layout is ALWAYS the
 * cleaned validator output — never the raw client value. Update never touches
 * isDefault (that flip is setDefaultDashboardRecord's transaction only).
 */
export async function saveDashboardRecord(
  rawName: unknown,
  rawLayout: unknown,
  id?: unknown
): Promise<SaveDashboardResult> {
  const name = sanitizeDashboardName(rawName);
  if (!name) return { error: "Give the dashboard a name." };
  const layout = cleanLayoutForWrite(rawLayout);

  if (id !== undefined) {
    if (!isDashboardId(id)) return { error: "Unknown dashboard." };
    try {
      const row = await prisma.dashboard.update({
        where: { id },
        data: { name, layout: toJsonInput(layout) },
      });
      return { ok: true, dashboard: toRecord(row) };
    } catch {
      return { error: "Unknown dashboard." }; // opaque — covers not-found and DB errors alike
    }
  }

  const n = await prisma.dashboard.count();
  if (n >= MAX_DASHBOARDS) return { error: `Limit of ${MAX_DASHBOARDS} dashboards reached.` };
  const row = await prisma.dashboard.create({ data: { name, layout: toJsonInput(layout) } });
  return { ok: true, dashboard: toRecord(row) };
}

export type SimpleResult = { ok: true } | { error: string };

/** Delete a dashboard. Deleting the default leaves NO default — the surface
 * falls back to the built-in Command layout (ux: strong default view). */
export async function deleteDashboardRecord(id: unknown): Promise<SimpleResult> {
  if (!isDashboardId(id)) return { error: "Unknown dashboard." };
  const res = await prisma.dashboard.deleteMany({ where: { id } });
  return res.count === 1 ? { ok: true } : { error: "Unknown dashboard." };
}

/** Make `id` the single default — transaction clears every other row's flag
 * first, so two defaults can never coexist (the invariant lives HERE). */
export async function setDefaultDashboardRecord(id: unknown): Promise<SimpleResult> {
  if (!isDashboardId(id)) return { error: "Unknown dashboard." };
  const found = await prisma.dashboard.count({ where: { id } });
  if (found !== 1) return { error: "Unknown dashboard." };
  await prisma.$transaction([
    prisma.dashboard.updateMany({ where: { id: { not: id } }, data: { isDefault: false } }),
    prisma.dashboard.update({ where: { id }, data: { isDefault: true } }),
  ]);
  return { ok: true };
}
