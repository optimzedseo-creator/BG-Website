import type { BreakdownRow, LeadStatusCount } from "@/lib/admin/iq/types";

/*
 * Leads donuts (Brad-directed, Builder Prime reference; manager ruling: NO
 * recharts, no new dependency). Hand-rolled server-renderable SVG donuts using
 * the stroke-dasharray circle technique — markpulse look per DESIGN §5.11:
 * dark card, inner radius, TOTAL count in the center, hand-rolled legend with
 * colored dots + label + count per slice.
 *
 * Honesty rules: counts on every slice and legend row, "n total" visible, NO
 * percentages (2 leads is under every N-guard). The donuts always show ALL
 * leads — they ARE the overview; the ?status= list filter drives the table
 * below, never these. Data arrives as PII-free groupBy counts (no names,
 * ever).
 *
 * Colors: status slices use the §5.6 badge color map; inquiry-type slices use
 * distinct accent-family colors. "lost" and the residue slice take the
 * neutral micro-label tone — semantic, not decorative.
 */

const R = 45;
const STROKE = 16;
const C = 2 * Math.PI * R;

/** §5.6 status badge color map (lost = neutral). */
const STATUS_COLORS: Record<string, string> = {
  new: "var(--blue)",
  contacted: "var(--cyan)",
  call_booked: "var(--purple)",
  qualified: "var(--amber)",
  won: "var(--green)",
  lost: "var(--text2)",
};

/** Inquiry-type slice colors — accent family, one hue per stored form value.
 * Keys are the EXACT stored strings (ContactForm.tsx). */
const INQUIRY_COLORS: Record<string, string> = {
  "Full-Time Executive Role": "var(--blue)",
  "Fractional Leadership": "var(--cyan)",
  "Project (Audit / AI Build)": "var(--purple)",
  "Speaking Engagement": "var(--pink)",
  "Other / unset": "var(--text2)",
};

interface Slice {
  label: string;
  n: number;
  color: string;
}

function Donut({ title, slices, emptyCopy }: { title: string; slices: Slice[]; emptyCopy: string }) {
  const total = slices.reduce((a, s) => a + s.n, 0);
  let acc = 0;

  return (
    <section className="adm-card adm-donut-card">
      <h2>{title}</h2>
      <div className="adm-donut-body">
        <svg
          viewBox="0 0 130 130"
          className="adm-donut-svg"
          role="img"
          aria-label={`${title}: ${total} total. ${slices.map((s) => `${s.label} ${s.n}`).join(", ")}.`}
        >
          <g transform="rotate(-90 65 65)">
            {/* Full chrome at zero (§7): the track ring always renders. */}
            <circle cx="65" cy="65" r={R} className="adm-donut-track" strokeWidth={STROKE} fill="none" />
            {total > 0 &&
              slices
                .filter((s) => s.n > 0)
                .map((s) => {
                  const dash = (s.n / total) * C;
                  const offset = -(acc / total) * C;
                  acc += s.n;
                  return (
                    <circle
                      key={s.label}
                      cx="65"
                      cy="65"
                      r={R}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={STROKE}
                      strokeDasharray={`${dash.toFixed(2)} ${(C - dash).toFixed(2)}`}
                      strokeDashoffset={offset.toFixed(2)}
                    />
                  );
                })}
          </g>
          <text x="65" y="63" textAnchor="middle" className="adm-donut-total">
            {total}
          </text>
          <text x="65" y="81" textAnchor="middle" className="adm-donut-sub">
            total
          </text>
        </svg>
        <ul className="adm-donut-legend">
          {slices.map((s) => (
            <li key={s.label} className={s.n === 0 ? "zero" : ""}>
              <span className="adm-donut-dot" style={{ background: s.color }} aria-hidden="true" />
              <span className="adm-donut-label">{s.label}</span>
              <span className="adm-donut-n">{s.n}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="adm-caption">{total === 0 ? emptyCopy : `${total} lead${total === 1 ? "" : "s"} · all leads, all time · counts only`}</p>
    </section>
  );
}

export default function LeadDonuts({
  byInquiryType,
  byStatus,
}: {
  byInquiryType: BreakdownRow[];
  byStatus: LeadStatusCount[];
}) {
  const inquirySlices: Slice[] = byInquiryType.map((r) => ({
    label: r.label,
    n: r.n,
    color: INQUIRY_COLORS[r.label] ?? "var(--text2)",
  }));
  const statusSlices: Slice[] = byStatus.map((r) => ({
    label: r.status.replace("_", " "),
    n: r.n,
    color: STATUS_COLORS[r.status] ?? "var(--text2)",
  }));

  return (
    <div className="adm-donut-grid">
      <Donut
        title="Leads by inquiry type"
        slices={inquirySlices}
        emptyCopy="No leads yet. Slices fill as briefs arrive; counts only, never percentages."
      />
      <Donut
        title="Leads by status"
        slices={statusSlices}
        emptyCopy="No leads yet. Statuses fill as the pipeline moves; counts only, never percentages."
      />
    </div>
  );
}
