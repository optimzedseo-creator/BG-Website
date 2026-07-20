"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const CAL_URL = "https://calendly.com/optimzedseo/30min";

/**
 * Site header — C1 chrome (C1-DESIGN-SYSTEM.md §2.1) over the REAL nav IA.
 * The mockup's demo nav (Home/Story/Work-with-me/Book/Contact) is a two-view
 * artifact and would orphan /insights, /credentials and /case-studies — the
 * full IA survives, restyled. Gold surname per §2.1; active link = 2px gold
 * underline per §1.10. Hamburger + 1050px collapse survive per §5 (the CSS
 * keys off `body.nav-open`, so we toggle that class on <body>).
 */

const LINKS: Array<[string, string]> = [
  ["/case-studies", "Case studies"],
  ["/insights", "Insights"],
  ["/story", "About"],
  ["/speaking", "Speaking"],
  ["/credentials", "Credentials"],
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    document.body.classList.toggle("nav-open", open);
    return () => {
      document.body.classList.remove("nav-open");
    };
  }, [open]);

  const close = () => setOpen(false);
  const isOn = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="header">
      <div className="wrap">
        <Link className="brand" href="/">Bradley <span className="gs">Griffin</span></Link>
        <nav className="nav">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className={isOn(href) ? "on" : undefined}>{label}</Link>
          ))}
          <Link className="nav-cta" href="/contact">Contact</Link>
          <a className="nav-cal cal-link" href={CAL_URL} target="_blank" rel="noopener">Schedule a Call</a>
        </nav>
        <button
          className="menu-btn"
          aria-label="Menu"
          aria-expanded={open ? "true" : "false"}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="mi"></span><span className="mi"></span><span className="mi"></span>
        </button>
      </div>
      <div className="mobile-nav" onClick={close}>
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href}>{label}</Link>
        ))}
        <Link className="nav-cta" href="/contact">Contact</Link>
        <a className="nav-cal cal-link" href={CAL_URL} target="_blank" rel="noopener">Schedule a Call</a>
      </div>
    </header>
  );
}
