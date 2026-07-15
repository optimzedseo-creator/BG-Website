import type { Metadata } from "next";

const TITLE = "Rates & Engagement Models - Bradley Griffin";
const DESCRIPTION =
  "How engagements with Bradley Griffin are structured - fractional CMO, consulting retainer, hourly sessions, and custom arrangements. Every engagement is scoped individually; reach out for a customized quote.";
const OG_DESCRIPTION =
  "How engagements are structured - fractional CMO, consulting retainer, hourly sessions, and custom arrangements. Reach out for a customized quote.";
const URL = "https://www.bradleygriffin.us/rates";
const OG_IMAGE = "https://www.bradleygriffin.us/assets/bradley-griffin-og.jpg";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: "noindex", // unlisted page — settled decision, keep out of the index
  alternates: { canonical: URL },
  openGraph: {
    siteName: "Bradley Griffin",
    type: "website",
    title: TITLE,
    description: OG_DESCRIPTION,
    url: URL,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: OG_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

/* JSON-LD carried over VERBATIM from the legacy page (byte-identical). */
const ratesJsonLd =
  '{"@context": "https://schema.org", "@graph": [{"@type": "WebPage", "url": "https://www.bradleygriffin.us/rates", "name": "Rates & Engagement Models - Bradley Griffin", "description": "How engagements with Bradley Griffin are structured - fractional CMO, consulting retainer, hourly sessions, and custom arrangements.", "isPartOf": {"@id": "https://www.bradleygriffin.us/#website"}, "about": {"@id": "https://www.bradleygriffin.us/#person"}}, {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.bradleygriffin.us/"}, {"@type": "ListItem", "position": 2, "name": "Rates", "item": "https://www.bradleygriffin.us/rates"}]}]}';

export default function RatesPage() {
  return (
    <div className="page-rates">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ratesJsonLd }} />

      {/* ======= HERO ======= */}
      <section className="rates-hero" id="top">
        <div className="wrap">
          <span className="microlabel">Rates &amp; engagement models</span>
          <h1>Structured around <em>what you need.</em></h1>
          <p className="lede">
            No two engagements are the same, so I don&rsquo;t publish one-size-fits-all prices.
            These are the four ways we typically work together &mdash; pick the shape that fits,
            reach out, and you&rsquo;ll get a customized quote scoped to your situation.
          </p>
        </div>
      </section>

      {/* ======= TIERS ======= */}
      <section className="tiers">
        <div className="wrap">
          <div className="cards">
            <div className="card reveal">
              <span className="kicker">Tier 1 &middot; Monthly engagement</span>
              <h3>Fractional CMO</h3>
              <p>Executive marketing leadership, embedded in your business on a monthly cadence. I take ownership of the growth agenda &mdash; the strategy, the systems, and the team &mdash; without the cost of a full-time hire.</p>
              <ul>
                <li>A defined monthly commitment, scoped to your stage</li>
                <li>Owns strategy, demand, attribution, and operating rhythm</li>
                <li>Built to hand you the keys, not create dependence</li>
              </ul>
              <div className="cta-row"><a className="btn btn-solid btn-sm" href="/contact?type=fractional">Get a fractional quote <span className="arr">&rarr;</span></a></div>
            </div>

            <div className="card reveal">
              <span className="kicker">Tier 2 &middot; Ongoing advisory</span>
              <h3>Consulting retainer</h3>
              <p>A standing seat at your table. Strategy, AI, and marketing-operations counsel on retainer &mdash; so when the expensive decisions come up, you already have someone who knows your business in the room.</p>
              <ul>
                <li>Ongoing access, structured around a monthly retainer</li>
                <li>Strategy, AI adoption, data, and operations counsel</li>
                <li>Priority response when something can&rsquo;t wait</li>
              </ul>
              <div className="cta-row"><a className="btn btn-solid btn-sm" href="/contact?type=consulting">Discuss a retainer <span className="arr">&rarr;</span></a></div>
            </div>

            <div className="card reveal">
              <span className="kicker">Tier 3 &middot; Targeted help</span>
              <h3>Hourly sessions</h3>
              <p>Focused working time on a single problem &mdash; an audit, a teardown, a plan you want pressure-tested, or a decision that needs a second set of experienced eyes before you commit.</p>
              <ul>
                <li>Billed by the hour, no long-term commitment</li>
                <li>Best for audits, reviews, and specific questions</li>
                <li>Starts as fast as the calendar allows</li>
              </ul>
              <div className="cta-row"><a className="btn btn-solid btn-sm cal-link" href="https://calendly.com/optimzedseo/30min" target="_blank" rel="noopener">Book a session <span className="arr">&rarr;</span></a></div>
            </div>

            <div className="card custom reveal">
              <span className="kicker">Tier 4 &middot; Built to fit</span>
              <h3>Custom &amp; hybrid</h3>
              <p>Your situation doesn&rsquo;t fit a neat box &mdash; a blend of the tiers above, a defined project, or something with very specific requirements. We&rsquo;ll design a structure that matches the work, then price it to fit.</p>
              <ul>
                <li>Any blend of fractional, retainer, and project work</li>
                <li>Scoped together, priced against your actual needs</li>
                <li>The right choice when the work is truly specific</li>
              </ul>
              <div className="cta-row"><a className="btn btn-solid btn-sm" href="/contact">Request a custom quote <span className="arr">&rarr;</span></a></div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= NOTE ======= */}
      <section className="rates-note">
        <div className="wrap">
          <div className="note-box reveal">
            <h2>Why no prices on this page?</h2>
            <p>
              Because every job is unique &mdash; the honest answer to &ldquo;what does it cost?&rdquo; depends on
              scope, urgency, and what&rsquo;s already in place. Tell me what you&rsquo;re working with and
              you&rsquo;ll get a real number, not a range with an asterisk. More questions? <a href="/faq">Read the FAQ</a>.
            </p>
          </div>
        </div>
      </section>

      {/* ======= FINALE ======= */}
      <section className="finale">
        <div className="wrap reveal">
          <span className="microlabel">Get your quote</span>
          <h2>Tell me the job. <em>I&rsquo;ll price it straight.</em></h2>
          <p>Send a short brief on what you need &mdash; you&rsquo;ll hear back with a customized quote and a recommended structure, not a sales sequence.</p>
          <div className="fin-ctas"><a className="btn btn-solid" href="/contact">Request a quote <span className="arr">&rarr;</span></a>
          <a className="btn btn-gold cal-link" href="https://calendly.com/optimzedseo/30min" target="_blank" rel="noopener">Schedule a Call <span className="arr">&rarr;</span></a></div>
        </div>
      </section>
    </div>
  );
}
