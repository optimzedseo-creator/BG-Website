"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * MotionEngine — the C1 parallax engine (renders null).
 *
 * The live-verified ~90-line engine from redesign-c1-parallax.html, ported
 * per C1-IMPLEMENTATION-PLAN.md §1 and C1-DESIGN-SYSTEM.md §3. House rules:
 *
 *  - Native scroll only. Zero hijack, no wheel listeners. Every offset is a
 *    pure function of element position — fast scrolling lands every element
 *    on its exact final state.
 *  - One passive scroll listener + resize listener → a SINGLE rAF → one
 *    frame() pass that writes translate3d(0, y, 0) only. No layout or paint
 *    property ever animates. will-change lives in CSS on exactly the two
 *    hero planes (app/styles/motion.css).
 *  - THE INVERSION: default CSS is the complete static site. All motion CSS
 *    hides behind `html.fx`; this component adds/removes `fx` via classList
 *    ONLY (never JSX — React 19 owns <html> in the root layout) and starts
 *    or tears down LIVE on the prefers-reduced-motion media query.
 *  - Plane vocabulary is FROZEN: plate | veil | fore | art | float | stack
 *    (+ .tl-col/.tl-item for the timeline spine). New kinds need an engine
 *    change and a Technical Guild review.
 *  - Mounted ONCE in app/(site)/layout.tsx — /admin never gets it.
 *  - Kill switch: <html data-motion="off"> (set manually in devtools/console)
 *    neutralizes all motion with zero deploys.
 *  - ≤640px: the hero plate keeps a gentle 0.14× drift; every other plane is
 *    cleared each frame and the timeline spine renders fully drawn via CSS.
 *
 * Perf contract (§3.5): per-frame getBoundingClientRect per driver is fine
 * at the verified ~26-plane count. The dev warning below fires above 40 —
 * crossing it means switching drivers to cached offsets + scrollY math, a
 * pre-agreed fallback. Do not wait for jank reports.
 */

type Kind = "plate" | "veil" | "fore" | "art" | "float" | "stack";
type Driver = { el: HTMLElement; k: Kind; d: Element };

export default function MotionEngine() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.motion === "off") return; // zero-deploy kill switch

    const mReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mSmall = window.matchMedia("(max-width: 640px)");

    let els: Driver[] = [];
    let cols: HTMLElement[] = [];
    let dots: HTMLElement[] = [];
    let raf = 0;
    let rafAt = 0;
    let on = false;
    let tick = 0;

    function collect() {
      els = Array.from(document.querySelectorAll<HTMLElement>("[data-px]")).map((el) => {
        const k = el.getAttribute("data-px") as Kind;
        let d: Element | null;
        if (k === "art") d = el.parentElement; // plate window: driven by its clipping frame
        else if (k === "plate" || k === "veil" || k === "fore") d = el.closest(".hero");
        else if (k === "stack") d = el.closest("section");
        else d = el; // floats ride their own position
        return { el, k, d: d || el };
      });
      cols = Array.from(document.querySelectorAll<HTMLElement>(".tl-col"));
      dots = Array.from(document.querySelectorAll<HTMLElement>(".tl-item"));
      if (process.env.NODE_ENV !== "production" && els.length > 40) {
        console.warn(
          `[MotionEngine] ${els.length} data-px planes on this route (verified budget ~26, hard line 40). ` +
            "Switch drivers to cached offsets + scrollY math (C1-DESIGN-SYSTEM.md §3.5) before adding more."
        );
      }
    }

    function frame() {
      raf = 0;
      if (!on) return;
      const vh = window.innerHeight;
      const vc = vh * 0.5;
      const small = mSmall.matches;
      for (let i = 0; i < els.length; i++) {
        const o = els[i];
        if (o.el.offsetParent === null) continue; // hidden element
        const r = o.d.getBoundingClientRect();
        if (r.bottom < -140 || r.top > vh + 140) continue; // offscreen: skip
        const rel = (r.top + r.height * 0.5 - vc) / vh;
        let y = 0;
        if (o.k === "plate") {
          // background plate: slowest plane (mobile: the ONLY moving plane)
          y = Math.max(0, -r.top) * (small ? 0.14 : 0.26);
          y = Math.min(y, r.height * 0.26);
        } else if (small) {
          // mobile: clear any stale desktop offset (the ≤640 resize fix — keep)
          if (o.el.style.transform) o.el.style.transform = "";
          continue;
        } else if (o.k === "veil") {
          y = Math.max(0, -r.top) * 0.1; // midground vignette
        } else if (o.k === "fore") {
          y = Math.max(0, -r.top) * -0.07; // foreground type counters, subtly
        } else if (o.k === "art") {
          // window into depth, clamped inside its over-scanned frame
          const m = r.height * 0.11;
          y = Math.max(-m, Math.min(m, rel * r.height * 0.16));
        } else if (o.k === "float") {
          y = rel * -26; // pull-quotes drift against their backdrop
        } else if (o.k === "stack") {
          y = rel * 10; // chapter content lags its plate edge
        }
        o.el.style.transform = "translate3d(0," + y.toFixed(2) + "px,0)";
      }
      if (small) {
        for (let s = 0; s < cols.length; s++) cols[s].style.removeProperty("--spine"); // CSS shows it fully drawn
      } else {
        for (let c = 0; c < cols.length; c++) {
          // timeline spine draws itself
          if (cols[c].offsetParent === null) continue;
          const cr = cols[c].getBoundingClientRect();
          const p = Math.max(0, Math.min(1, (vh * 0.82 - cr.top) / cr.height));
          cols[c].style.setProperty("--spine", p.toFixed(3));
        }
        for (let t = 0; t < dots.length; t++) {
          // dots light as the spine passes
          if (dots[t].offsetParent === null || dots[t].classList.contains("lit")) continue;
          if (dots[t].getBoundingClientRect().top < vh * 0.8) dots[t].classList.add("lit");
        }
      }
    }

    function kick() {
      const now = Date.now();
      // Stale-frame watchdog: a queued rAF older than 1s means the renderer
      // slept with a frame pending (background tab) — cancel and requeue so
      // the guard flag can never wedge.
      if (raf && now - rafAt > 1000) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      }
      if (!raf) {
        rafAt = now;
        raf = window.requestAnimationFrame(frame);
      }
    }

    function start() {
      if (on || mReduce.matches) return;
      on = true;
      root.classList.add("fx");
      collect();
      window.addEventListener("scroll", kick, { passive: true });
      window.addEventListener("resize", kick);
      tick = window.setInterval(kick, 600); // safety belt: route changes, programmatic scrolls
      kick();
    }

    function stop() {
      if (!on) return;
      on = false;
      root.classList.remove("fx");
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
      if (tick) window.clearInterval(tick);
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      // Live teardown must leave the static site byte-clean: no inline
      // transforms, no --spine residue.
      els.forEach((o) => {
        o.el.style.transform = "";
      });
      cols.forEach((c) => c.style.removeProperty("--spine"));
    }

    const onReduceChange = (e: MediaQueryListEvent) => (e.matches ? stop() : start());
    mReduce.addEventListener("change", onReduceChange);
    start();

    // Cleanup runs on unmount AND on every pathname change — client-side
    // navigation mounts new [data-px] nodes, so collect() is re-keyed by
    // simply re-running the whole effect (the 600ms belt covers stragglers).
    return () => {
      mReduce.removeEventListener("change", onReduceChange);
      stop();
    };
  }, [pathname]);

  return null;
}
