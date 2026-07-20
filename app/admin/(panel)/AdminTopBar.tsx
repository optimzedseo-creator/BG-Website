"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IqMode } from "@/lib/admin/iq/types";
import PeriodSwitch from "./PeriodSwitch";
import ModePill from "./ModePill";

/*
 * ADMIN-IQ top bar (WP2.1 slots → PERIOD-UI wave): brand doorplate (links
 * home to the module landing) · the GLOBAL calendar period switch (Today ·
 * WTD · MTD · QTD · YTD · Custom — Brad's exact labels; the old 7d/30d/90d
 * window switch is retired) · LIVE/DEMO mode pill · sign out (passed in as
 * children from the server layout). Module nav lives in the left rail /
 * bottom tab bar (AdminRail).
 *
 * The top bar OWNS period selection console-wide; compare lives on the
 * per-page compare pill (CompareControl) — one obvious owner per concern.
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
