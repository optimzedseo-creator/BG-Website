"use client";

import { useEffect, useRef, useState } from "react";
import DemoBadge from "../iq/DemoBadge";
import type { ActivityKind, IqActivity, SourceClass, WindowDays } from "@/lib/admin/iq/types";
import { subscribePeriodRefetch } from "../period-bus";
import { fmtDay } from "../fmt";
import { openDrill, visitorHash } from "../iq/hash-route";

/*
 * WP3.9 Activity stream (client island). One unified log; two no-navigation
 * triggers: the period bus and kind/source filter chips (refetch through GET
 * /admin/api/iq/activity, querystring kept shareable). Rows with a visitorId
 * drill to the Journey modal; rows without one are non-interactive (no dead
 * affordance). Form/booking rows show {hasVisitorId} facts only — never a name.
 */

const KIND_LABEL: Record<ActivityKind, string> = {
  pageview: "pageview",
  chooser_click: "chooser",
  cta_click: "cta",
  form_submit: "brief",
  booking: "booking",
};

function fmtWhen(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

interface Cuts {
  kind: ActivityKind | null;
  source: SourceClass | null;
  path: string | null;
}

function buildQs(p: WindowDays, cuts: Cuts): string {
  const q = new URLSearchParams();
  if (p !== 30) q.set("p", String(p));
  if (cuts.kind) q.set("kind", cuts.kind);
  if (cuts.source) q.set("source", cuts.source);
  if (cuts.path) q.set("path", cuts.path);
  return q.toString();
}

export default function ActivityView({ initial }: { initial: IqActivity }) {
  const [data, setData] = useState<IqActivity>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cutsRef = useRef<Cuts>({
    kind: (initial.applied.kind as ActivityKind | null) ?? null,
    source: initial.applied.sourceClass,
    path: initial.applied.path,
  });
  const periodRef = useRef<WindowDays>(initial.window);
  const seqRef = useRef(0);

  async function refetch() {
    const id = ++seqRef.current;
    setLoading(true);
    setError(null);
    const qs = buildQs(periodRef.current, cutsRef.current);
    try {
      const res = await fetch(`/admin/api/iq/activity${qs ? `?${qs}` : ""}`, { cache: "no-store" });
      if (res.redirected && new URL(res.url).pathname.startsWith("/admin/login")) {
        window.location.assign("/admin/login");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const payload = (await res.json()) as IqActivity;
      if (id !== seqRef.current) return;
      setData(payload);
      // Preserve any open modal's deep-link hash (F5).
      window.history.replaceState(null, "", `/admin/activity${qs ? `?${qs}` : ""}${window.location.hash}`);
    } catch {
      if (id !== seqRef.current) return;
      setError("Could not refresh. The log below is from the previous selection.");
    } finally {
      if (id === seqRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    return subscribePeriodRefetch((p: WindowDays) => {
      periodRef.current = p;
      void refetch();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setKind(k: ActivityKind | null) {
    cutsRef.current.kind = cutsRef.current.kind === k ? null : k;
    void refetch();
  }
  function setSource(s: SourceClass | null) {
    cutsRef.current.source = cutsRef.current.source === s ? null : s;
    void refetch();
  }
  function clearPath() {
    cutsRef.current.path = null;
    void refetch();
  }

  const cuts = cutsRef.current;
  const countingSince = data.countingSince ? fmtDay(data.countingSince) : null;

  return (
    <div data-acc="traffic" aria-busy={loading}>
      <div className="adm-head">
        <h1>🗒️ Activity</h1>
        <DemoBadge demo={data.meta.mode === "demo"} />
        <span className="adm-count">last {data.window} days</span>
      </div>

      {error && <p className="adm-error" role="status">{error}</p>}

      <div className="adm-chips" role="group" aria-label="Activity filters">
        <div className="adm-chip-group">
          <span className="adm-chip-groupname">Kind</span>
          {data.kinds.map((k) => (
            <button
              key={k.kind}
              type="button"
              className={`adm-chip${cuts.kind === k.kind ? " on" : ""}`}
              aria-pressed={cuts.kind === k.kind}
              disabled={loading}
              onClick={() => setKind(k.kind)}
            >
              {KIND_LABEL[k.kind]}
              <span className="adm-chip-n">{k.n}</span>
            </button>
          ))}
        </div>
        {data.sources.length > 0 && (
          <div className="adm-chip-group">
            <span className="adm-chip-groupname">Source</span>
            {data.sources.map((s) => (
              <button
                key={s.label}
                type="button"
                className={`adm-chip${cuts.source === s.label ? " on" : ""}`}
                aria-pressed={cuts.source === (s.label as SourceClass)}
                disabled={loading}
                onClick={() => setSource(s.label as SourceClass)}
              >
                {s.label}
                <span className="adm-chip-n">{s.n}</span>
              </button>
            ))}
          </div>
        )}
        {cuts.path && (
          <button type="button" className="adm-chip on" onClick={clearPath} disabled={loading}>
            path: {cuts.path} ✕
          </button>
        )}
      </div>

      <div className={`adm-surface${loading ? " is-loading" : ""}`}>
        <section className="adm-card adm-card-wide">
          {data.rows.length === 0 ? (
            <p className="adm-empty">
              📭 No activity in this window with these filters.
              {countingSince ? ` Counting since ${countingSince}.` : " Counting starts with the first pageview."}
            </p>
          ) : (
            <>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Kind</th>
                      <th>Path</th>
                      <th>Detail</th>
                      <th>Visitor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => {
                      const drillable = r.visitorId !== null;
                      return (
                        <tr
                          key={r.key}
                          className={drillable ? "adm-tr-drill" : undefined}
                          tabIndex={drillable ? 0 : undefined}
                          role={drillable ? "button" : undefined}
                          aria-label={drillable ? "Open visitor journey" : undefined}
                          onClick={drillable ? () => openDrill(visitorHash(r.visitorId!)) : undefined}
                          onKeyDown={
                            drillable
                              ? (e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    openDrill(visitorHash(r.visitorId!));
                                  }
                                }
                              : undefined
                          }
                        >
                          <td className="adm-mono">{fmtWhen(r.at)}</td>
                          <td>
                            <span className={`adm-qchip adm-act-${r.kind}`}>{KIND_LABEL[r.kind]}</span>
                          </td>
                          <td className="adm-path">{r.path ?? <span className="adm-unset">no path</span>}</td>
                          <td>
                            {r.metaChips.length > 0 ? (
                              <span className="adm-qtags">
                                {r.metaChips.map((c, i) => (
                                  <span key={i} className="adm-qchip">{c}</span>
                                ))}
                              </span>
                            ) : r.kind === "form_submit" || r.kind === "booking" ? (
                              <span className="adm-sub">{r.hasVisitorId ? "linked to a visitor" : "no visitor id"}</span>
                            ) : r.sourceClass ? (
                              <span className="adm-sub">{r.sourceClass}</span>
                            ) : (
                              <span className="adm-unset">none</span>
                            )}
                          </td>
                          <td className="adm-mono">
                            {r.shortId ?? <span className="adm-unset">no cookie</span>}
                            {drillable && <span className="adm-go" aria-hidden="true"> →</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="adm-caption">
                Showing {data.rows.length} row{data.rows.length === 1 ? "" : "s"}, newest first.
                {data.truncated ? ` More than the ${data.rowCap}-row cap matched; the newest ${data.rowCap} are shown.` : ""}
                {" "}Rows with a visitor id open the full journey.
              </p>
            </>
          )}
        </section>
      </div>

      <p className="adm-mono" style={{ display: "block", marginTop: 18 }}>
        {data.meta.metricsVersion} · {data.meta.mode} · {data.meta.internalExcluded} internal{" "}
        {data.meta.internalExcluded === 1 ? "visitor" : "visitors"} excluded
      </p>
    </div>
  );
}
