import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import PillarIcon from "@/components/PillarIcon";
import { jsonLd } from "@/lib/jsonld";
import { getPillars, countLabel, indexGraph } from "@/lib/insights";

const TITLE = "Insights - Bradley Griffin";
const DESCRIPTION =
  "Most companies fix the wrong thing. How to spot the real problem before you spend more money on the wrong one. Across data, marketing, AI, and sales.";
const URL = "https://www.bradleygriffin.us/insights";
const OG_IMAGE = "https://www.bradleygriffin.us/assets/bradley-griffin-og.jpg";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: {
    siteName: "Bradley Griffin",
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: URL,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function InsightsIndexPage() {
  const pillars = getPillars();
  return (
    <div className="page-insights">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(indexGraph()) }} />

      {/* ======= HERO ======= */}
      <section className="ix-hero">
        <div className="wrap">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Insights" }]} />
          <span className="microlabel">Insights</span>
          <h1>
            Most companies fix the <em>wrong thing.</em>
          </h1>
          <p className="lede">
            How to spot the real problem before you spend more money on the wrong one. Across data,
            marketing, AI, and sales.
          </p>
        </div>
      </section>

      {/* ======= PILLAR CARDS ======= */}
      <section className="ix-grid-wrap">
        <div className="wrap">
          <div className="ix-grid">
            {pillars.map((p) => (
              <Link
                key={p.slug}
                className={`ix-card${p.order === 1 ? " flagship" : ""}`}
                href={`/insights/${p.slug}`}
              >
                <div className="ix-top">
                  <span className="ix-num">{p.numeral}</span>
                  <span className="ix-icon">
                    <PillarIcon icon={p.icon} />
                  </span>
                  <span className="ix-micro">{p.microlabel}</span>
                </div>
                <h2>{p.h1}</h2>
                <p>{p.dek}</p>
                <div className="ix-foot">
                  <span className="ix-count">{countLabel(p.slug)}</span>
                  <span className="ix-arrow">
                    Explore <span className="arr">&rarr;</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
