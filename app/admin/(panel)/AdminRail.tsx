"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { LeadStatusCount, WindowDays } from "@/lib/admin/iq/types";
import { parseWindowParam, watchPeriod } from "./period-bus";

/*
 * WP2.1 nav shell — persistent left rail (desktop; icon-collapse ≤1024px) and
 * bottom tab bar (mobile ≤640px, UX §10: Command, Traffic, Search, Leads +
 * "More" holding Content/Security). Each item carries its module accent via
 * data-acc (DESIGN §1b); the active item is accent-marked.
 *
 * Brad addendum (Builder Prime pattern): the Leads item expands with status
 * sub-items — "All leads" + one row per status with a LIVE COUNT chip. Counts
 * arrive as props from the gated server layout (PII-free groupBy through
 * lib/admin/iq). Statuses with 0 still render — honest, hollow chip.
 */

interface RailModule {
  href: string;
  acc: string;
  label: string;
  emoji: string;
}

const MODULES: RailModule[] = [
  { href: "/admin/overview", acc: "overview", label: "Command", emoji: "📊" },
  { href: "/admin/traffic", acc: "traffic", label: "Traffic", emoji: "📈" },
  { href: "/admin/search", acc: "search", label: "Search", emoji: "🔍" },
  { href: "/admin/leads", acc: "leads", label: "Leads", emoji: "🤝" },
  { href: "/admin/content", acc: "content", label: "Content", emoji: "✍️" },
  { href: "/admin/security", acc: "security", label: "Security", emoji: "🛡️" },
];

// WP3.9/3.10 utility surfaces — desktop rail (below the modules) + the mobile
// "More" sheet. Kept out of the primary bottom tab bar so it stays at four.
const UTILITY: RailModule[] = [
  { href: "/admin/activity", acc: "traffic", label: "Activity", emoji: "🗒️" },
  { href: "/admin/reports", acc: "overview", label: "Reports", emoji: "📁" },
];

const BOTTOM = MODULES.filter((m) => m.acc !== "content" && m.acc !== "security");
const MORE = [...MODULES.filter((m) => m.acc === "content" || m.acc === "security"), ...UTILITY];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminRail({ leadCounts }: { leadCounts: LeadStatusCount[] }) {
  const pathname = usePathname() ?? "/admin";
  const searchParams = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Mirror the live period into nav links so navigation keeps ?p= (WP2.1:
  // deep links shareable). replaceState flips on /admin/overview don't update
  // useSearchParams, so the rail also listens on the period bus.
  const urlPeriod = parseWindowParam(searchParams.get("p"));
  const [period, setPeriod] = useState<WindowDays>(urlPeriod);
  useEffect(() => setPeriod(urlPeriod), [urlPeriod]);
  // WP2 bus upgrade: the signal carries the full period object; rail links
  // mirror only the `window` fallback (they speak ?p= exclusively).
  useEffect(() => watchPeriod((s) => setPeriod(s.window)), []);
  const withPeriod = (href: string, extra?: string) => {
    const params = new URLSearchParams(extra);
    if (period !== 30) params.set("p", String(period));
    const qs = params.toString();
    return qs ? `${href}?${qs}` : href;
  };

  useEffect(() => setMoreOpen(false), [pathname]);

  // U3: the More sheet closes on Escape and on any pointer-down outside it —
  // listeners exist only while the sheet is open.
  useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  const activeStatus = isActive(pathname, "/admin/leads") ? searchParams.get("status") : null;

  const railItem = (m: (typeof MODULES)[number]) => {
    const active = isActive(pathname, m.href);
    return (
      <li key={m.href} data-acc={m.acc}>
        <Link
          href={withPeriod(m.href)}
          className={`adm-rail-link${active ? " on" : ""}`}
          aria-current={active ? "page" : undefined}
        >
          <span className="adm-rail-emoji" aria-hidden="true">{m.emoji}</span>
          <span className="adm-rail-label">{m.label}</span>
        </Link>
        {m.acc === "leads" && (
          <ul className="adm-rail-sub">
            <li>
              <Link
                href={withPeriod("/admin/leads")}
                className={`adm-rail-sublink${active && !activeStatus ? " on" : ""}`}
                aria-current={active && !activeStatus ? "page" : undefined}
              >
                <span className="adm-rail-sublabel">All leads</span>
                <span className={`adm-rail-chip${leadCounts.reduce((a, c) => a + c.n, 0) === 0 ? " zero" : ""}`}>
                  {leadCounts.reduce((a, c) => a + c.n, 0)}
                </span>
              </Link>
            </li>
            {leadCounts.map((c) => {
              const on = active && activeStatus === c.status;
              return (
                <li key={c.status}>
                  <Link
                    href={withPeriod("/admin/leads", `status=${c.status}`)}
                    className={`adm-rail-sublink${on ? " on" : ""}`}
                    aria-current={on ? "page" : undefined}
                  >
                    <span className="adm-rail-sublabel">{c.status.replace("_", " ")}</span>
                    <span className={`adm-rail-chip${c.n === 0 ? " zero" : ""}`}>{c.n}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      <aside className="adm-rail">
        <nav aria-label="Modules">
          <ul>{MODULES.map(railItem)}</ul>
          <ul className="adm-rail-utility">{UTILITY.map(railItem)}</ul>
        </nav>
      </aside>

      <nav className="adm-tabbar" aria-label="Modules">
        {BOTTOM.map((m) => {
          const active = isActive(pathname, m.href);
          return (
            <Link
              key={m.href}
              href={withPeriod(m.href)}
              data-acc={m.acc}
              className={`adm-tab${active ? " on" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span aria-hidden="true">{m.emoji}</span>
              <span className="adm-tab-label">{m.label}</span>
            </Link>
          );
        })}
        <div className="adm-tab-more" ref={moreRef}>
          <button
            type="button"
            className={`adm-tab${MORE.some((m) => isActive(pathname, m.href)) ? " on" : ""}`}
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
          >
            <span aria-hidden="true">⋯</span>
            <span className="adm-tab-label">More</span>
          </button>
          {moreOpen && (
            <div className="adm-tab-sheet">
              {MORE.map((m) => {
                const active = isActive(pathname, m.href);
                return (
                  <Link
                    key={m.href}
                    href={withPeriod(m.href)}
                    data-acc={m.acc}
                    className={`adm-tab-sheet-link${active ? " on" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span aria-hidden="true">{m.emoji} </span>
                    {m.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
