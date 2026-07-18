"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CAL_URL = "https://calendly.com/optimzedseo/30min";

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
          <Link href="/insights">Insights</Link>
          <Link href="/story">About</Link>
          <Link href="/speaking">Speaking</Link>
          <Link href="/credentials">Credentials</Link>
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
        <Link href="/insights">Insights</Link>
        <Link href="/story">About</Link>
        <Link href="/speaking">Speaking</Link>
        <Link href="/credentials">Credentials</Link>
        <Link className="nav-cta" href="/contact">Contact</Link>
        <a className="nav-cal cal-link" href={CAL_URL} target="_blank" rel="noopener">Schedule a Call</a>
      </div>
    </header>
  );
}
