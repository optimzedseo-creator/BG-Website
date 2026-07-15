import type { Metadata } from "next";
import { faqItems } from "@/lib/faq-data";
import { jsonLd } from "@/lib/jsonld";

const TITLE = "FAQ - Working with Bradley Griffin";
const DESCRIPTION =
  "Answers to the questions people ask before working with Bradley Griffin - start dates, pricing, remote vs. on-site, what the fee covers, and how engagements begin.";
const URL = "https://www.bradleygriffin.us/faq";
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

/* FAQPage JSON-LD — rendered from the SAME data source as the accordion. */
const faqJsonLd = jsonLd({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FAQPage",
      url: URL,
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.schemaQuestion,
        acceptedAnswer: { "@type": "Answer", text: item.schemaAnswer },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.bradleygriffin.us/" },
        { "@type": "ListItem", position: 2, name: "FAQ", item: URL },
      ],
    },
  ],
});

export default function FaqPage() {
  return (
    <div className="page-faq">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />

      {/* ======= HERO ======= */}
      <section className="faq-hero" id="top">
        <div className="wrap">
          <span className="microlabel">Frequently asked questions</span>
          <h1>Asked before. <em>Answered straight.</em></h1>
          <p className="lede">
            The questions that come up before nearly every engagement &mdash; answered the way
            I&rsquo;d answer them on a call. If yours isn&rsquo;t here, ask it directly.
          </p>
        </div>
      </section>

      {/* ======= FAQ LIST ======= */}
      <section className="faq-list">
        <div className="wrap">
          <div className="faqs">
            {faqItems.map((item) => (
              <details className="faq reveal" open={item.open} key={item.question}>
                <summary>{item.question}<span className="plus">+</span></summary>
                <div className="answer" dangerouslySetInnerHTML={{ __html: item.answerHtml }} />
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ======= FINALE ======= */}
      <section className="finale">
        <div className="wrap reveal">
          <span className="microlabel">Still have a question?</span>
          <h2>Ask it <em>directly.</em></h2>
          <p>No form-letter replies &mdash; send your question and it lands with me, not a team inbox.</p>
          <div className="fin-ctas"><a className="btn btn-solid" href="/contact">Get in Touch <span className="arr">&rarr;</span></a>
          <a className="btn btn-gold cal-link" href="https://calendly.com/optimzedseo/30min" target="_blank" rel="noopener">Schedule a Call <span className="arr">&rarr;</span></a></div>
        </div>
      </section>
    </div>
  );
}
