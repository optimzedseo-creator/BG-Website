"use server";

// Dashboard Wave PHASE 2 · WP1 — dashboard + favorites server actions.
// The WP2 canvas UI calls these; nothing else should (server pages can read
// the lib helpers directly AFTER their own requireAdmin gate).
//
// Every action awaits requireAdmin() FIRST-LINE — the invariant the security
// audit greps for. All argument values are UNTRUSTED (they arrive over the
// server-action wire): ids go through isDashboardId, names through
// sanitizeDashboardName, layouts through the validator, favorite lists through
// the KPI whitelist — all inside the lib helpers. Error strings stay generic;
// nothing echoes internals or the offending value.

import { requireAdmin } from "@/lib/admin/auth";
import { readFavoriteKpis, writeFavoriteKpis } from "@/lib/admin/iq/favorites";
import {
  deleteDashboardRecord,
  listDashboardRecords,
  saveDashboardRecord,
  setDefaultDashboardRecord,
  type DashboardRecord,
  type SaveDashboardResult,
  type SimpleResult,
} from "@/lib/admin/iq/dashboards";
import type { CommandKpiId } from "@/lib/admin/iq/types";

const UNAUTHORIZED = { error: "Unauthorized" } as const;

// ---- Favorites (Setting K/V "admin_favorite_kpis", cap 6) -------------------

/** Current pinned KPIs. Unauthenticated → [] (nothing to show, nothing leaked). */
export async function getFavoriteKpis(): Promise<CommandKpiId[]> {
  if (!(await requireAdmin())) return [];
  return readFavoriteKpis();
}

/** Replace the pinned-KPI list. The stored (whitelisted, deduped, capped) list
 * echoes back so client state can never drift from the row. */
export async function setFavoriteKpis(
  ids: unknown
): Promise<{ ok: true; favorites: CommandKpiId[] } | { error: string }> {
  if (!(await requireAdmin())) return UNAUTHORIZED;
  try {
    return { ok: true, favorites: await writeFavoriteKpis(ids) };
  } catch {
    return { error: "Could not save favorites." };
  }
}

// ---- Dashboard CRUD (Dashboard table — layouts validated on every read) -----

export async function listDashboards(): Promise<DashboardRecord[]> {
  if (!(await requireAdmin())) return [];
  return listDashboardRecords();
}

/** Create (omit id) or rename/re-layout (with id) a dashboard. */
export async function saveDashboard(
  name: unknown,
  layout: unknown,
  id?: unknown
): Promise<SaveDashboardResult> {
  if (!(await requireAdmin())) return UNAUTHORIZED;
  try {
    return await saveDashboardRecord(name, layout, id);
  } catch {
    return { error: "Could not save the dashboard." };
  }
}

export async function deleteDashboard(id: unknown): Promise<SimpleResult> {
  if (!(await requireAdmin())) return UNAUTHORIZED;
  try {
    return await deleteDashboardRecord(id);
  } catch {
    return { error: "Could not delete the dashboard." };
  }
}

/** Single-default invariant enforced in the lib transaction (write path). */
export async function setDefaultDashboard(id: unknown): Promise<SimpleResult> {
  if (!(await requireAdmin())) return UNAUTHORIZED;
  try {
    return await setDefaultDashboardRecord(id);
  } catch {
    return { error: "Could not set the default dashboard." };
  }
}
