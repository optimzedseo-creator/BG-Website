import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import RichText from "@/components/RichText";
import { jsonLd } from "@/lib/jsonld";
import {
  posts as allPosts,
  getPillar,
  getPost,
  postGraph,
  postUrl,
} from "@/lib/insights";

const OG_IMAGE = "https://www.bradleygriffin.us/assets/bradley-griffin-og.jpg";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
/** Format an ISO date's calendar day without timezone drift. */
function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function generateStaticParams() {
  return allPosts.map((p) => ({ pillar: p.pillarSlug, post: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pillar: string; post: string }>;
}): Promise<Metadata> {
  const { pillar: pillarSlug, post: postSlug } = await params;
  const post = getPost(pillarSlug, postSlug);
  if (!post) return {};
  const title = `${post.title} - Bradley Griffin`;
  const description = post.dek;
  const url = postUrl(pillarSlug, post.slug);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      siteName: "Bradley Griffin",
      type: "article",
      title,
      description,
      url,
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ pillar: string; post: string }>;
}) {
  const { pillar: pillarSlug, post: postSlug } = await params;
  const pillar = getPillar(pillarSlug);
  const post = getPost(pillarSlug, postSlug);
  if (!pillar || !post) notFound();

  return (
    <div className="page-post">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(postGraph(post, pillar)) }} />

      {/* ======= HERO ======= */}
      <section className="art-hero">
        <div className="wrap">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Insights", href: "/insights" },
              { name: pillar.label, href: `/insights/${pillar.slug}` },
              { name: post.title },
            ]}
          />
          <div className="art-meta">
            {pillar.label} <span className="dot">&middot;</span> {formatDate(post.datePublished)}
          </div>
          <h1>{post.title}</h1>
          <p className="dek">{post.dek}</p>
        </div>
      </section>

      {/* ======= BODY ======= */}
      <section className="art-body">
        <div className="wrap">
          {post.body.map((para, i) => (
            <p key={i}>
              <RichText text={para} />
            </p>
          ))}
        </div>
        <div className="art-related">
          <p>
            <RichText text={post.related} />
          </p>
        </div>
      </section>

      {/* ======= FINALE CTA ======= */}
      <section className="finale">
        <div className="wrap reveal">
          <span className="microlabel">Before your next budget call</span>
          <h2>
            Bring me the symptom. <em>I&rsquo;ll read the data.</em>
          </h2>
          <p>I read the raw data under your reports and tell you what is actually working.</p>
          <div className="fin-ctas">
            <Link className="btn btn-solid" href={post.cta.href}>
              {post.cta.label} <span className="arr">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
