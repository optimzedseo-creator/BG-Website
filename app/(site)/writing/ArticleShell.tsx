import type { Metadata } from "next";
import { jsonLd } from "@/lib/jsonld";
import {
  getPost,
  displayDate,
  WRITING_URL,
  OG_IMAGE,
  PERSON_ID,
} from "@/lib/writing-posts";
import "@/app/styles/writing.css";

/*
 * Shared chrome for a /writing article: metadata builder, BlogPosting +
 * BreadcrumbList JSON-LD, hero, body wrapper, and the soft close.
 * Each article page supplies only its prose as children. Content is scoped
 * under .page-writing; nothing here touches another route.
 */

export function articleMetadata(slug: string): Metadata {
  const post = getPost(slug);
  if (!post) return {};
  const url = `${WRITING_URL}/${post.slug}`;
  const title = `${post.title} - Bradley Griffin`;
  return {
    title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      siteName: "Bradley Griffin",
      type: "article",
      title,
      description: post.description,
      url,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: post.description,
      images: [OG_IMAGE],
    },
  };
}

export default function ArticleShell({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const post = getPost(slug);
  if (!post) return null;
  const url = `${WRITING_URL}/${post.slug}`;

  const articleJsonLd = jsonLd({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.description,
        url,
        mainEntityOfPage: url,
        datePublished: post.datePublished,
        dateModified: post.dateModified,
        author: { "@type": "Person", "@id": PERSON_ID, name: "Bradley Griffin" },
        publisher: { "@type": "Person", "@id": PERSON_ID, name: "Bradley Griffin" },
        isPartOf: { "@id": WRITING_URL + "#blog" },
        image: OG_IMAGE,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://www.bradleygriffin.us/" },
          { "@type": "ListItem", position: 2, name: "Writing", item: WRITING_URL },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
    ],
  });

  return (
    <div className="page-writing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleJsonLd }} />

      {/* ======= HERO ======= */}
      <section className="art-hero">
        <div className="wrap">
          <a className="art-back" href="/writing"><span className="arr">&larr;</span> All writing</a>
          <div className="art-meta">
            <span>{displayDate(post.datePublished)}</span>
            <span className="dot">&middot;</span>
            <span>{post.readingMins} min read</span>
          </div>
          <h1>{post.title}</h1>
          <p className="dek">{post.dek}</p>
        </div>
      </section>

      {/* ======= BODY ======= */}
      <section className="art-body">
        <div className="wrap">{children}</div>
      </section>

      {/* ======= SIGN-OFF ======= */}
      <div className="art-sign">
        <div className="rule" />
        <p>
          Written by Bradley Griffin. This is the kind of thing the book&rsquo;s about, and the kind of
          thing I get paid to untangle. If it fits your business, <a href="/contact">get in touch</a>.
        </p>
      </div>

      {/* ======= FINALE ======= */}
      <section className="finale">
        <div className="wrap reveal">
          <span className="microlabel">Bring me the problem</span>
          <h2>I&rsquo;ll bring <em>the math.</em></h2>
          <p>No pitch deck, no jargon. A straight conversation about what&rsquo;s actually slowing the business down.</p>
          <div className="fin-ctas">
            <a className="btn btn-solid" href="/contact">Get in Touch <span className="arr">&rarr;</span></a>
            <a className="btn btn-gold cal-link" href="https://calendly.com/optimzedseo/30min" target="_blank" rel="noopener">Schedule a Call <span className="arr">&rarr;</span></a>
          </div>
        </div>
      </section>
    </div>
  );
}
