import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import InsightsFilter, { type InsightNote, type InsightChip } from "@/components/InsightsFilter";
import { jsonLd } from "@/lib/jsonld";
import {
  posts,
  getPillar,
  getPillars,
  getFeaturedPost,
  getPostsNewestFirst,
  populatedPillars,
  readingTimeMinutes,
  indexGraph,
} from "@/lib/insights";

const TITLE = "Insights - Bradley Griffin";
const DESCRIPTION =
  "Field notes from twenty years of finding the real problem behind the symptom. Bradley Griffin on reading the raw data before you spend against the wrong fix.";
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

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
/** "2026-07-24…" -> "Jul 2026" without timezone drift. */
function monthYear(iso: string): string {
  const [y, m] = iso.slice(0, 10).split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${y}`;
}

export default function InsightsIndexPage() {
  const total = posts.length;
  const featured = getFeaturedPost();
  const featuredPillar = featured ? getPillar(featured.pillarSlug) : undefined;

  // Numbered index: all posts newest-first, minus the featured keystone.
  const notes: InsightNote[] = getPostsNewestFirst()
    .filter((p) => !p.featured)
    .map((p) => {
      const pillar = getPillar(p.pillarSlug);
      return {
        slug: p.slug,
        href: `/insights/${p.pillarSlug}/${p.slug}`,
        pillarSlug: p.pillarSlug,
        pillarLabel: pillar ? pillar.label : p.pillarSlug,
        title: p.title,
        dek: p.dek,
        dateLabel: monthYear(p.datePublished),
        readMin: readingTimeMinutes(p),
      };
    });

  // Chips: one per pillar; populated pillars are interactive, empty ones "· soon".
  const populated = new Set(populatedPillars().map((p) => p.slug));
  const chips: InsightChip[] = getPillars().map((p) => ({
    slug: p.slug,
    label: p.label,
    populated: populated.has(p.slug),
  }));

  return (
    <div className="page-insights">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(indexGraph()) }} />

      {/* ======= MASTHEAD ======= */}
      <section className="ix-hero">
        <div className="wrap">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Insights" }]} />
          <span className="microlabel">Insights</span>
          <h1>
            I&rsquo;ve seen how growth breaks, <em>so you don&rsquo;t have to.</em>
          </h1>
          <p className="lede">
            The patterns I&rsquo;ve picked up across twenty years and hundreds of engagements, so you
            can name the real problem before it gets expensive.
          </p>
          <p className="ix-thesis">
            {total} field notes <span className="dot">&middot;</span> one running argument{" "}
            <span className="dot">&middot;</span> start with the data
          </p>
        </div>
      </section>

      {/* ======= FEATURED "START HERE" (the keystone post) ======= */}
      {featured && featuredPillar && (
        <section className="ix-featured">
          <div className="wrap">
            <Link className="ix-feat" href={`/insights/${featured.pillarSlug}/${featured.slug}`}>
              <span className="ix-feat-main">
                <span className="ix-feat-pill">Start here</span>
                <span className="ix-feat-kicker">
                  {featuredPillar.numeral} <span className="dot">&middot;</span> {featuredPillar.label}
                </span>
                <span className="ix-feat-title">{featured.title}</span>
                <span className="ix-feat-dek">{featured.dek}</span>
                <span className="ix-feat-cue">
                  Read the field note <span className="arr">&rarr;</span>
                </span>
              </span>
              <span className="ix-feat-motif" aria-hidden="true">
                <span className="ix-motif-line" />
                <span className="ix-motif-line" />
                <span className="ix-motif-line is-mark" />
                <span className="ix-motif-line" />
                <span className="ix-motif-line" />
              </span>
            </Link>
          </div>
        </section>
      )}

      {/* ======= FILTER CHIPS + NUMBERED FIELD-NOTES INDEX (client island) ======= */}
      <section className="ix-index">
        <div className="wrap">
          <InsightsFilter notes={notes} chips={chips} total={total} />
        </div>
      </section>
    </div>
  );
}
