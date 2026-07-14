"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    Calendly?: { initPopupWidget: (opts: { url: string }) => void };
  }
}

const CAL_POPUP_URL = "https://calendly.com/optimzedseo/30min?hide_gdpr_banner=1";

/**
 * Global page effects, ported from the legacy inline scripts:
 *  1. Reveal-on-scroll IntersectionObserver (re-runs on every route change,
 *     since client-side navigation mounts new .reveal nodes).
 *  2. Lazy-load Calendly popup on first .cal-link click; falls back to the
 *     link itself. NO primary_color param — custom colors break Calendly's
 *     date contrast (settled team decision).
 */
export default function SiteEffects() {
  const pathname = usePathname();

  // Reveal on scroll — keyed on pathname so new pages get observed too.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  // Calendly popup delegation — attach once for the whole app.
  useEffect(() => {
    function popup() {
      window.Calendly!.initPopupWidget({ url: CAL_POPUP_URL });
    }
    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      const a = target && target.closest ? (target.closest(".cal-link") as HTMLAnchorElement | null) : null;
      if (!a) return;
      e.preventDefault();
      if (typeof window.Calendly?.initPopupWidget === "function") {
        popup();
        return;
      }
      if (!document.getElementById("cal-css")) {
        const l = document.createElement("link");
        l.id = "cal-css";
        l.rel = "stylesheet";
        l.href = "https://assets.calendly.com/assets/external/widget.css";
        document.head.appendChild(l);
      }
      if (!document.getElementById("cal-js")) {
        const s = document.createElement("script");
        s.id = "cal-js";
        s.src = "https://assets.calendly.com/assets/external/widget.js";
        s.onload = popup;
        s.onerror = function () {
          window.open(a.href, "_blank", "noopener");
        };
        document.body.appendChild(s);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
