"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/*
 * ADMIN-IQ top bar (DESIGN-SPEC §5.1). Client component ONLY so the active
 * nav link can carry aria-current="page" (the accent-underline styling hook)
 * and so the header itself picks up the current module's accent via data-acc
 * (§1b). No data, no fetching — the Sign out server-action form is passed in
 * as children from the server layout.
 */

const NAV = [
  { href: "/admin", label: "Dashboard", emoji: "📊" },
  { href: "/admin/leads", label: "Leads", emoji: "🤝" },
  { href: "/admin/security", label: "Security", emoji: "🛡️" },
] as const;

function sectionFor(pathname: string): "overview" | "leads" | "security" {
  if (pathname.startsWith("/admin/leads")) return "leads";
  if (pathname.startsWith("/admin/security")) return "security";
  return "overview";
}

export default function AdminTopBar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/admin";
  const section = sectionFor(pathname);

  return (
    <header className="adm-top" data-acc={section}>
      <div className="adm-top-inner">
        <span className="adm-brand">
          <b>BG</b>
          <span className="adm-brand-suffix"> · Admin</span>
        </span>
        <nav aria-label="Admin">
          {NAV.map((item) => {
            const active =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
                <span aria-hidden="true">{item.emoji} </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        {children}
      </div>
    </header>
  );
}
