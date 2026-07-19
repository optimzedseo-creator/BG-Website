"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IqMode } from "@/lib/admin/iq/types";
import PeriodSwitch from "./PeriodSwitch";
import ModePill from "./ModePill";

/*
 * ADMIN-IQ top bar (WP2.1 slots): brand doorplate (links home to the module
 * landing) · global period filter (7/30/90, ?p=) · mode-pill placeholder slot
 * (EMPTY until Wave 4 — layout space reserved, nothing rendered) · sign out
 * (passed in as children from the server layout). Module nav lives in the
 * left rail / bottom tab bar now (AdminRail).
 *
 * Deliberate WP2.1 deviations (manager ruling — the no-dead-control rule
 * outranks the slot list): no "Custom" period option (no DateRangeModal until
 * Wave 3) and no compare toggle (nothing consumes it until Wave 3 overlays;
 * KPI deltas are always-on counts vs prior period per UX §2).
 */

function sectionFor(pathname: string): string {
  if (pathname.startsWith("/admin/traffic")) return "traffic";
  if (pathname.startsWith("/admin/search")) return "search";
  if (pathname.startsWith("/admin/leads")) return "leads";
  if (pathname.startsWith("/admin/content")) return "content";
  if (pathname.startsWith("/admin/security")) return "security";
  return "overview";
}

export default function AdminTopBar({
  mode,
  children,
}: {
  mode: IqMode;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/admin";

  return (
    <header className="adm-top" data-acc={sectionFor(pathname)}>
      <div className="adm-top-inner">
        <Link href="/admin" className="adm-brand">
          <b>BG</b>
          <span className="adm-brand-suffix"> · Admin</span>
        </Link>
        <div className="adm-top-spacer" />
        <Suspense fallback={null}>
          <PeriodSwitch />
        </Suspense>
        {/* Wave 4 LIVE/DEMO toggle (was a reserved empty slot). */}
        <span className="adm-modeslot">
          <ModePill mode={mode} />
        </span>
        {children}
      </div>
    </header>
  );
}
