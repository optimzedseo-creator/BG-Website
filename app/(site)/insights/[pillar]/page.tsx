import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import PillarIcon from "@/components/PillarIcon";
import RichText from "@/components/RichText";
import { jsonLd } from "@/lib/jsonld";
import {
  getPillars,
  getPillar,
  getPosts,
  lateralPillars,
  hubGraph,
  pillarUrl,
} from "@/lib/insights";

const OG_IMAGE = "https://www.bradleygriffin.us/assets/bradley-griffin-og.jpg";

export function generateStaticParams() {
  return getPillars().map((p) => ({ pillar: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pillar: string }>;
}): Promise<Metadata> {
  const { pillar: slug } = await params;
  const pillar = getPillar(slug);
  if (!pillar) return {};
  const title = `${pillar.h1} - Insights - Bradley Griffin`;
  const description = pillar.thesis;
  const url = pillarUrl(pillar.slug);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      siteName: "Bradley Griffin",
      type: "website",
      title,
      description,
      url,
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
  };
}

export default async function PillarHubPage({
  params,
}: {
  params: Promise<{ pillar: string }>;
}) {
  const { pillar: slug } = await params;
  const pillar = getPillar(slug);
  if (!pillar) notFound();

  const hubPosts = getPosts(pillar.slug);
  const others = lateralPillars(pillar.slug);

  return (
    <div className="page-pillar" data-pillar={pillar.slug}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(hubGraph(pillar)) }} />

      {/* ======= HERO ======= */}
      <section className="h-hero">
        <div className="wrap">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Insights", href: "/insights" },
              { name: pillar.label },
            ]}
          />
          <span className="h-eyebrow">
            <span className="h-num">{pillar.numeral}</span>
            <span className="h-icon">
              <PillarIcon icon={pillar.icon} />
            </span>
            <span className="microlabel">{pillar.eyebrow}</span>
          </span>
          <h1>{pillar.h1}</h1>
          <p className="h-thesis">{pillar.thesis}</p>
        </div>
      </section>

      {/* ======= DIAGNOSIS THREAD (only if present) ======= */}
      {pillar.diagnosis.length > 0 && (
        <section className="h-diag">
          <div className="wrap">
            {pillar.diagnosis.map((para, i) => (
              <p key={i}>
                <RichText text={para} />
              </p>
            ))}
          </div>
        </section>
      )}

      {/* ======= OVERVIEW ======= */}
      <section className="h-overview">
        <div className="wrap">
          {pillar.overview.map((para, i) => (
            <p key={i}>
              <RichText text={para} />
            </p>
          ))}
        </div>
      </section>

      {/* ======= POSTS ======= */}
      <section className="h-posts">
        <div className="wrap">
          <p className="h-posts-label">Articles</p>
          {hubPosts.length > 0 ? (
            hubPosts.map((post) => (
              <Link key={post.slug} className="w-item" href={`/insights/${pillar.slug}/${post.slug}`}>
                <h2>{post.title}</h2>
                <p>{post.dek}</p>
                <span className="w-more">
                  Read <span className="arr">&rarr;</span>
                </span>
              </Link>
            ))
          ) : (
            <div className="h-empty">
              <p className="h-empty-lead">First posts coming.</p>
              <p>
                This pillar is next in the writing queue. In the meantime, the flagship{" "}
                <Link href="/insights/data-analytics">data and analytics</Link> pillar has live articles.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ======= LATERAL PILLAR ROW ======= */}
      <section className="h-lateral">
        <div className="wrap">
          <span className="microlabel">More insights</span>
          <div className="lat-row">
            {others.map((o) => (
              <Link key={o.slug} className="lat" href={`/insights/${o.slug}`}>
                <span className="lat-num">{o.numeral}</span>
                <span className="lat-icon">
                  <PillarIcon icon={o.icon} />
                </span>
                <span className="lat-name">{o.h1}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ======= FINALE CTA ======= */}
      <section className="finale">
        <div className="wrap reveal">
          <span className="microlabel">Bring me the problem</span>
          <h2>
            You bring the symptom. <em>I&rsquo;ll find the cause.</em>
          </h2>
          <p>Tell me what feels off, and I&rsquo;ll read the raw data to tell you what&rsquo;s actually broken.</p>
          <div className="fin-ctas">
            <Link className="btn btn-solid" href={pillar.cta.href}>
              {pillar.cta.label} <span className="arr">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
