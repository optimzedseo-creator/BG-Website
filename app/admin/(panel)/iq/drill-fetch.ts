"use client";

// WP3.1 — shared drill fetch. Same session-expiry + no-store discipline the
// module islands use (api A1): a 307 into /admin/login bounces the whole tab
// instead of rendering login HTML as a permanent error. One in-flight request
// per url; unmount cancels the state write.

import { useEffect, useState } from "react";
import { parseWindowParam } from "@/lib/admin/iq/shared";
import type { WindowDays } from "@/lib/admin/iq/types";

export interface DrillState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** The active global period from the querystring (drills open at the current window). */
export function currentPeriod(): WindowDays {
  if (typeof window === "undefined") return 30;
  return parseWindowParam(new URLSearchParams(window.location.search).get("p"));
}

export function useDrill<T>(url: string): DrillState<T> {
  const [state, setState] = useState<DrillState<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let live = true;
    setState({ data: null, loading: true, error: null });
    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        if (res.redirected && new URL(res.url).pathname.startsWith("/admin/login")) {
          window.location.assign("/admin/login");
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const payload = (await res.json()) as T;
        if (live) setState({ data: payload, loading: false, error: null });
      })
      .catch(() => {
        if (live) setState({ data: null, loading: false, error: "Could not load this drill-down." });
      });
    return () => {
      live = false;
    };
  }, [url]);

  return state;
}
