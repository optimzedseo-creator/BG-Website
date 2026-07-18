"use client";

// WP3.2 — presentation-grade line chart with the §5.11 hover readout: a
// vertical hairline snapping to the nearest bucket + a DM-Mono tooltip
// (bg3 / line-hi / radius 8). Area fill, endpoint "now" dot, and draw-in are
// CSS-driven (reduced-motion collapses them globally). Reused by Command's
// trend AND the KPI drill modal, so the interaction is identical everywhere.

import { useState } from "react";

export interface ChartSeries {
  key: string;
  label: string;
  /** Stroke class, e.g. "adm-chart-visitors" | "adm-chart-accline". */
  className: string;
  values: number[];
  /** Compare overlay — muted + dashed, not the headline. */
  dashed?: boolean;
  /** Filled area under the line (headline series only). */
  area?: boolean;
  /** Area gradient id + stop color var (headline series only). */
  areaFill?: string;
  /** Render a dot on every positive point (the wins series). */
  dotsWhenPositive?: boolean;
  /** Endpoint "now" cursor classes (headline series only). */
  endpointDotClass?: string;
  endpointHaloClass?: string;
  /** Swatch color for the tooltip/legend key (CSS var or hex). */
  swatch?: string;
}

const W = 720;
const H = 160;
const PAD = { l: 30, r: 10, t: 12, b: 24 };

export default function AdmHoverChart({
  labels,
  series,
  ariaLabel,
}: {
  labels: string[];
  series: ChartSeries[];
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const n = labels.length;
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const x = (i: number) => PAD.l + (n < 2 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const baseY = (PAD.t + ih).toFixed(1);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width; // 0..1 across full SVG width
    const plotL = PAD.l / W;
    const plotR = (W - PAD.r) / W;
    const frac = Math.min(1, Math.max(0, (rel - plotL) / (plotR - plotL)));
    setHover(Math.min(n - 1, Math.max(0, Math.round(frac * (n - 1)))));
  };

  const leftPct = hover === null ? 0 : (x(hover) / W) * 100;

  return (
    <div className="adm-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="adm-chart" role="img" aria-label={ariaLabel}>
        <defs>
          {series
            .filter((s) => s.area && s.areaFill)
            .map((s) => (
              <linearGradient key={s.areaFill} id={s.areaFill!} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={s.swatch ?? "var(--acc)"} stopOpacity="0.22" />
                <stop offset="1" stopColor={s.swatch ?? "var(--acc)"} stopOpacity="0" />
              </linearGradient>
            ))}
        </defs>

        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(max * f)} y2={y(max * f)} className="adm-chart-grid" />
            <text x={PAD.l - 6} y={y(max * f) + 3.5} textAnchor="end" className="adm-chart-tick">
              {Math.round(max * f)}
            </text>
          </g>
        ))}

        {series.map((s) => {
          const line = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
          const area =
            s.area && s.areaFill
              ? `${line} ${x(n - 1).toFixed(1)},${baseY} ${x(0).toFixed(1)},${baseY}`
              : null;
          return (
            <g key={s.key}>
              {area && (
                <polygon points={area} fill={`url(#${s.areaFill})`} className="adm-chart-late" stroke="none" />
              )}
              <polyline
                points={line}
                className={`${s.className} adm-chart-draw${s.dashed ? " adm-chart-compare" : ""}`}
                fill="none"
                pathLength={1}
              />
              {s.dotsWhenPositive &&
                s.values.map((v, i) =>
                  v > 0 ? <circle key={i} cx={x(i)} cy={y(v)} r={3} className="adm-chart-windot adm-chart-late" /> : null
                )}
              {s.endpointDotClass && n > 0 && (
                <g className="adm-chart-late">
                  <circle cx={x(n - 1)} cy={y(s.values[n - 1])} r={10} className={s.endpointHaloClass} />
                  <circle cx={x(n - 1)} cy={y(s.values[n - 1])} r={4} className={s.endpointDotClass} />
                </g>
              )}
            </g>
          );
        })}

        {labels.map((lab, i) =>
          i % Math.max(1, Math.ceil(n / 9)) === 0 ? (
            <text key={`${lab}-${i}`} x={x(i)} y={H - 6} textAnchor="middle" className="adm-chart-tick">
              {lab.length > 5 ? lab.slice(5) : lab}
            </text>
          ) : null
        )}

        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} className="adm-chart-hairline" />
        )}

        {/* Invisible capture layer for the hover readout. */}
        <rect
          x={0}
          y={0}
          width={W}
          height={H}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>

      {hover !== null && (
        <div
          className="adm-chart-tip"
          style={{ left: `${leftPct}%` }}
          role="status"
        >
          <span className="adm-chart-tip-date">{labels[hover]}</span>
          {series.map((s) => (
            <span key={s.key} className="adm-chart-tip-row">
              <span className="adm-chart-tip-key" style={{ background: s.swatch ?? "var(--acc)" }} />
              {s.label}: <b>{s.values[hover]}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
