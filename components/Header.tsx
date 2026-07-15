"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CAL_URL = "https://calendly.com/optimzedseo/30min";
const LINKEDIN_URL = "https://www.linkedin.com/in/brad-w-griffin/";

/* Inline LinkedIn glyph — inherits `.nav a` / `.mobile-nav a` color via currentColor. */
function LinkedInIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.25 8h4.5v16H.25V8zm7.5 0h4.31v2.19h.06c.6-1.14 2.07-2.34 4.26-2.34 4.56 0 5.4 3 5.4 6.9V24h-4.5v-6.36c0-1.52-.03-3.47-2.11-3.47-2.11 0-2.43 1.65-2.43 3.36V24h-4.5V8z" />
    </svg>
  );
}

/**
 * Site header — ported verbatim from the legacy per-page markup.
 * Hamburger state replaces the legacy inline script; the legacy CSS keys off
 * `body.nav-open`, so we toggle that class on <body> to keep the CSS identical.
 */
export default function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("nav-open", open);
    return () => {
      document.body.classList.remove("nav-open");
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="header">
      <div className="wrap">
        <Link className="brand" href="/">Bradley Griffin</Link>
        <nav className="nav">
          <Link href="/case-studies">Case studies</Link>
          <Link href="/story">About</Link>
          <Link href="/speaking">Speaking</Link>
          <Link href="/credentials">Credentials</Link>
          <a
            className="nav-li"
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener"
            aria-label="Bradley Griffin on LinkedIn"
            style={{ display: "inline-flex", alignItems: "center" }}
          >
            <LinkedInIcon />
          </a>
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
        <Link href="/case-studies">Case studies</Link>
        <Link href="/story">About</Link>
        <Link href="/speaking">Speaking</Link>
        <Link href="/credentials">Credentials</Link>
        <a
          className="nav-li"
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener"
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          <LinkedInIcon /> LinkedIn
        </a>
        <Link className="nav-cta" href="/contact">Contact</Link>
        <a className="nav-cal cal-link" href={CAL_URL} target="_blank" rel="noopener">Schedule a Call</a>
      </div>
    </header>
  );
}
