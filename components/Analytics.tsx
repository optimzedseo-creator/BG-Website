"use client";

// First-party analytics beacon — Phase 2 (BACKEND-PLAN.md §6).
// Renders nothing. Capture is PRODUCTION-ONLY (build-time gate) so dev
// sessions never pollute the data.
//
// Captures:
//   1. page_view on every route change (usePathname), keepalive POST.
//   2. duration patch via sendBeacon on pagehide / tab-hide / route change.
//   3. Delegated click events: chooser card clicks (chooser_click),
//      "Get in Touch" / "Schedule a Call" CTAs (cta_click).
//   4. Calendly bookings via the popup iframe's postMessage
//      `calendly.event_scheduled` (booking) — works on any Calendly plan.
// form_submit is recorded SERVER-side in /api/contact (survives ad-blockers).
// Payloads stay lean and PII-free: paths, labels, card names — never form
// contents, emails, or names.

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const ENABLED = process.env.NODE_ENV === "production";

function post(body: Record<string, unknown>): Promise<Response> {
  return fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  });
}

function sendEvent(name: string, path: string, meta?: Record<string, string>) {
  post({ kind: "event", name, path, meta }).catch(() => {});
}

export default function Analytics() {
  const pathname = usePathname();
  // Current pageview: id (from the server) + start timestamp, for duration.
  const viewRef = useRef<{ id: string | null; start: number }>({ id: null, start: 0 });
  const firstLoad = useRef(true);

  function flushDuration() {
    const { id, start } = viewRef.current;
    if (!id) return;
    const duration = Math.round((Date.now() - start) / 1000);
    if (duration < 1) return;
    try {
      navigator.sendBeacon("/api/track/duration", JSON.stringify({ id, duration }));
    } catch {
      /* beacon unavailable — duration stays null, acceptable loss */
    }
  }

  // 1 + 2: page views and duration.
  useEffect(() => {
    if (!ENABLED) return;

    flushDuration(); // close out the previous route's view on client-side nav
    viewRef.current = { id: null, start: Date.now() };

    const referrer = firstLoad.current && document.referrer ? document.referrer : undefined;
    firstLoad.current = false;

    let cancelled = false;
    post({ kind: "pageview", path: pathname, referrer })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.id === "string") viewRef.current.id = data.id;
      })
      .catch(() => {});

    const onHide = () => {
      if (document.visibilityState === "hidden") flushDuration();
    };
    window.addEventListener("pagehide", flushDuration);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", flushDuration);
      document.removeEventListener("visibilitychange", onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // 3 + 4: delegated clicks and Calendly bookings — attached once.
  useEffect(() => {
    if (!ENABLED) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const a = target && target.closest ? (target.closest("a") as HTMLAnchorElement | null) : null;
      if (!a) return;
      const path = window.location.pathname;
      const href = a.getAttribute("href") || "";

      // Homepage router card → chooser_click { card: executive|fractional|consulting|speaking }
      if (a.matches(".chooser a.card")) {
        sendEvent("chooser_click", path, { card: href.replace(/^\//, "").split(/[?#]/)[0] });
        return;
      }
      // "Schedule a Call" (Calendly popup links, incl. header nav)
      if (a.classList.contains("cal-link")) {
        sendEvent("cta_click", path, { label: "schedule_a_call" });
        return;
      }
      // "Get in Touch" pill buttons → /contact (keeps the ?type= deep link)
      if (a.classList.contains("btn") && href.startsWith("/contact")) {
        sendEvent("cta_click", path, { label: "get_in_touch", href });
      }
    };

    const onMessage = (e: MessageEvent) => {
      const calendlyOrigin =
        e.origin === "https://calendly.com" || e.origin.endsWith(".calendly.com");
      if (!calendlyOrigin) return;
      const data = e.data as {
        event?: string;
        payload?: { event?: { uri?: string }; invitee?: { uri?: string } };
      } | null;
      if (data && data.event === "calendly.event_scheduled") {
        // Analytics event (Phase 2) — the WINS counter.
        sendEvent("booking", window.location.pathname);
        // CRM capture (Phase 3): forward the event/invitee URIs so the
        // Booking row can be enriched later. The payload has no PII (no
        // invitee email) — just Calendly API URIs.
        fetch("/api/booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: data.payload?.event?.uri,
            invitee: data.payload?.invitee?.uri,
          }),
          keepalive: true,
        }).catch(() => {});
      }
    };

    document.addEventListener("click", onClick);
    window.addEventListener("message", onMessage);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return null;
}
