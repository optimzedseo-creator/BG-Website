// ADMIN-CRM — DataSource entry point (Wave 4 Stage A). The two /admin/leads
// pages call getCrmSource(mode) and are written against AdminCrmSource — they
// cannot tell which implementation they got. Mode is resolved server-side AFTER
// requireAdmin() (lib/admin/iq/mode.ts); this factory never gates.

import type { AdminCrmSource } from "./types";
import type { IqMode } from "../iq/types";
import { liveCrmSource } from "./source-live";
import { demoCrmSource } from "./source-demo";

export function getCrmSource(mode: IqMode): AdminCrmSource {
  return mode === "demo" ? demoCrmSource : liveCrmSource;
}

export type {
  AdminCrmSource,
  CrmActivityRow,
  CrmBookingRow,
  CrmLeadDetail,
  CrmLeadListOpts,
  CrmLeadRow,
  CrmSortKey,
} from "./types";
