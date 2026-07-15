import type { Metadata } from "next";
import NewsletterSignup from "@/components/NewsletterSignup";
import { jsonLd } from "@/lib/jsonld";
import {
  writingPosts,
  displayDate,
  WRITING_URL,
  OG_IMAGE,
  PERSON_ID,
} from "@/lib/writing-posts";
import "@/app/styles/writing.css";

const TITLE = "Writing - Bradley Griffin";
const DESCRIPTION =
  "Notes on making marketing measurable. Systems-first writing on growth, attribution, and why most marketing problems aren't marketing problems, from Bradley Griffin.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: WRITING_URL },
  openGraph: {
    siteName: "Bradley Griffin",
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: WRITING_URL,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

/* Blog + BreadcrumbList JSON-LD, rendered from the SAME data as the list. */
const listJsonLd = jsonLd({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Blog",
      "@id": WRITING_URL + "#blog",
      url: WRITING_URL,
      name: "Writing - Bradley Griffin",
      description: DESCRIPTION,
      author: { "@type": "Person", "@id": PERSON_ID, name: "Bradley Griffin" },
      blogPost: writingPosts.map((p) => ({
        "@type": "BlogPosting",
        headline: p.title,
        description: p.dek,
        url: WRITING_URL + "/" + p.slug,
        datePublished: p.datePublished,
        dateModified: p.dateModified,
        author: { "@type": "Person", "@id": PERSON_ID, name: "Bradley Griffin" },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.bradleygriffin.us/" },
        { "@type": "ListItem", position: 2, name: "Writing", item: WRITING_URL },
      ],
    },
  ],
});

export default function WritingIndexPage() {
  return (
    <div className="page-writing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: listJsonLd }} />

      {/* ======= HERO ======= */}
      <section className="w-hero">
        <div className="wrap">
          <span className="microlabel">Writing</span>
          <h1>Notes on making marketing <em>measurable.</em></h1>
          <p className="lede">
            Most growth problems get blamed on marketing. Most of them aren&rsquo;t. What follows is
            how I actually think about it: fix the business, trust the raw numbers, and build systems
            that hold up on a bad week. Plain, and occasionally uncomfortable.
          </p>
        </div>
      </section>

      {/* ======= LIST ======= */}
      <section className="w-list">
        <div className="wrap">
          {writingPosts.map((p) => (
            <a className="w-item" href={`/writing/${p.slug}`} key={p.slug}>
              <div className="w-meta">
                <span>{displayDate(p.datePublished)}</span>
                <span className="dot">&middot;</span>
                <span>{p.readingMins} min read</span>
              </div>
              <h2>{p.title}</h2>
              <p>{p.dek}</p>
              <span className="w-more">Read it <span className="arr">&rarr;</span></span>
            </a>
          ))}
        </div>
      </section>

      {/* ======= SUBSCRIBE ======= */}
      <section className="w-sub">
        <div className="wrap reveal">
          <span className="microlabel">Field notes</span>
          <h2>Get new writing by <em>email.</em></h2>
          <p>A short note when I publish something new, plus the occasional read on making marketing measurable. No spam, unsubscribe anytime.</p>
          <NewsletterSignup heading="" blurb="" source="writing" cta="Subscribe" />
        </div>
      </section>

      {/* ======= FINALE ======= */}
      <section className="finale">
        <div className="wrap reveal">
          <span className="microlabel">Reading isn&rsquo;t fixing</span>
          <h2>Bring me the problem. <em>I&rsquo;ll bring the math.</em></h2>
          <p>If a line here landed a little too close to home, that&rsquo;s usually a good sign it&rsquo;s worth a conversation.</p>
          <div className="fin-ctas">
            <a className="btn btn-solid" href="/contact">Get in Touch <span className="arr">&rarr;</span></a>
            <a className="btn btn-gold cal-link" href="https://calendly.com/optimzedseo/30min" target="_blank" rel="noopener">Schedule a Call <span className="arr">&rarr;</span></a>
          </div>
        </div>
      </section>
    </div>
  );
}
