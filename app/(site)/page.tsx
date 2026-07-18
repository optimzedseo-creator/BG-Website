import type { Metadata } from "next";
import NewsletterSignup from "@/components/NewsletterSignup";

const TITLE = "Bradley Griffin - Chief Marketing Officer & Growth Executive";
const DESCRIPTION =
  "CMO and growth executive - two successful exits, a NASDAQ acquisition, a #1-performing region on a national platform. Executive roles, fractional CMO, AI consulting, and keynotes.";
const URL = "https://www.bradleygriffin.us/";
const OG_IMAGE = "https://www.bradleygriffin.us/assets/bradley-griffin-og.jpg";

/*
 * NOTE: canonical + og:url are rendered manually inside the page (React
 * hoists <link>/<meta> to <head>) because the legacy homepage uses the
 * trailing-slash form "https://www.bradleygriffin.us/" and Next's metadata
 * resolver strips the trailing slash on the root path. Do not re-add them
 * to this metadata object — you'd get duplicates.
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    siteName: "Bradley Griffin",
    type: "profile",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

/* JSON-LD carried over VERBATIM from the legacy page (byte-identical):
   WebSite + Person (sameAs: LinkedIn) + ProfilePage graph. */
const homeJsonLd =
  '{"@context": "https://schema.org", "@graph": [{"@type": "WebSite", "@id": "https://www.bradleygriffin.us/#website", "name": "Bradley Griffin", "url": "https://www.bradleygriffin.us/", "publisher": {"@type": "Person", "@id": "https://www.bradleygriffin.us/#person", "name": "Bradley Griffin"}}, {"@type": "Person", "@id": "https://www.bradleygriffin.us/#person", "name": "Bradley Griffin", "alternateName": "Brad Griffin", "jobTitle": "Chief Marketing Officer & Growth Executive", "description": "CMO and growth marketing executive with 20+ years scaling B2C brands, SaaS platforms, and multi-location operations - two founded-and-sold companies and a NASDAQ acquisition. U.S. Army 75th Ranger Regiment veteran.", "url": "https://www.bradleygriffin.us/", "image": "https://www.bradleygriffin.us/assets/bradley-griffin-portrait.jpg", "sameAs": ["https://www.linkedin.com/in/brad-w-griffin/"], "address": {"@type": "PostalAddress", "addressRegion": "MI", "addressCountry": "US"}, "alumniOf": [{"@type": "CollegeOrUniversity", "name": "Auburn University"}, {"@type": "CollegeOrUniversity", "name": "Central Michigan University"}], "knowsAbout": ["Growth Marketing", "Demand Generation", "Fractional CMO Leadership", "SEO", "AI Overviews (AIO)", "AI Marketing Operations", "Marketing Automation", "CRM Architecture", "Attribution Modeling", "Paid Media", "Go-to-Market Strategy"]}, {"@type": "ProfilePage", "url": "https://www.bradleygriffin.us/", "mainEntity": {"@type": "Person", "@id": "https://www.bradleygriffin.us/#person", "name": "Bradley Griffin"}, "isPartOf": {"@id": "https://www.bradleygriffin.us/#website"}}]}';

export default function HomePage() {
  return (
    <div className="pg-home">
      <link rel="canonical" href={URL} />
      <meta property="og:url" content={URL} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: homeJsonLd }} />

      {/* ======= HERO ======= */}
      <section className="hero" id="top">
        <div className="wrap hero-grid">
          <div>
            <span className="microlabel">Growth executive &amp; fractional CMO</span>
            <h1>I Build <em>Systems</em> That Unlock <em>Growth</em></h1>
            <p className="lede">
              I&rsquo;m Bradley Griffin. Most companies can&rsquo;t tell what&rsquo;s actually
              working in their marketing, so growth runs hot then cold. I read the raw source
              data, find the waste, and build the systems that make growth predictable and keep
              it that way.
            </p>
            <div className="hero-ctas">
              <a className="btn btn-solid" href="/contact">Get in Touch <span className="arr">&rarr;</span></a>
              <a className="btn btn-bronze cal-link" href="https://calendly.com/optimzedseo/30min" target="_blank" rel="noopener">Schedule a Call <span className="arr">&rarr;</span></a>
            </div>
          </div>
          <figure className="portrait">
            <img src="/assets/bradley-griffin-portrait.jpg" alt="Bradley Griffin" />
          </figure>
        </div>
      </section>

      {/* ======= PROBLEM -> METHOD SPINE ======= */}
      <section className="spine" id="method">
        <div className="wrap">
          <div className="spine-head reveal">
            <span className="microlabel">The problem I solve</span>
            <h2>Your marketing runs <em>hot then cold</em>. You can&rsquo;t tell what&rsquo;s actually working.</h2>
            <p>
              Reports look busy. Leads swing month to month. The dashboard says one thing, the
              bank says another. When you can&rsquo;t see what&rsquo;s driving results, you
              can&rsquo;t repeat them, so good months feel like luck and bad months feel like a
              mystery. And that guesswork costs you: wasted spend, uneven sales, and thinner
              margins than the business should earn.
            </p>
            <p className="spine-line">Bring me the problem. I&rsquo;ll bring the math.</p>
          </div>
          <ol className="method reveal">
            <li>
              <div className="step-head">
                <span className="step-n">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
                  </svg>
                </span>
                <span className="step-num">01</span>
              </div>
              <h3>Raw source data</h3>
              <p>I start at the source, not a summary slide. The raw numbers before anyone summarized them.</p>
            </li>
            <li>
              <div className="step-head">
                <span className="step-n">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                    <circle cx="10.5" cy="10.5" r="6" />
                    <path d="M15 15l5.5 5.5" />
                    <path d="M9 12V10M11.5 12V8.5" />
                  </svg>
                </span>
                <span className="step-num">02</span>
              </div>
              <h3>Quantitative audit</h3>
              <p>I find the waste, and I find the opportunity. Then I attach the math to every finding.</p>
            </li>
            <li>
              <div className="step-head">
                <span className="step-n">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                    <path d="M3.5 7.5l1.8 1.8L8.5 6" />
                    <path d="M11.5 8h8" />
                    <path d="M3.5 13.5l1.8 1.8L8.5 12" />
                    <path d="M11.5 14h8" />
                  </svg>
                </span>
                <span className="step-num">03</span>
              </div>
              <h3>Blueprint</h3>
              <p>A clear picture of the actions that fix it: what to keep, what to cut, what to build.</p>
            </li>
            <li>
              <div className="step-head">
                <span className="step-n">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                    <path d="M4.5 19c4.5 0 3.5-6 8-6s2.5-6 7-6" />
                    <circle cx="4.5" cy="19" r="1.5" />
                    <circle cx="19.5" cy="7" r="1.5" />
                  </svg>
                </span>
                <span className="step-num">04</span>
              </div>
              <h3>Roadmap</h3>
              <p>A ranked plan in the order that compounds, so the work builds on itself.</p>
            </li>
            <li>
              <div className="step-head">
                <span className="step-n">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                    <path d="M4 17l6-5 4-2 5.5-4" />
                    <path d="M15.5 6h4v4" />
                  </svg>
                </span>
                <span className="step-num">05</span>
              </div>
              <h3>Predictable growth</h3>
              <p>Systems that hold. Growth you can repeat, not chase.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* ======= THE ROUTER ======= */}
      <section className="chooser" id="work">
        <div className="wrap">
          <div className="chooser-head reveal">
            <span className="microlabel">Ways to work together</span>
            <h2>What are you looking for?</h2>
            <p>Pick the path that fits. Each one goes straight to the details.</p>
          </div>
          <div className="cards">
            <a className="card reveal" href="/fractional">
              <span className="kicker">Part-time &amp; ongoing</span>
              <h3>Hire me fractionally</h3>
              <p>Executive marketing leadership on a part-time, ongoing basis &mdash; I embed with your team, own the growth agenda month after month, at a fraction of the cost of a full-time hire.</p>
              <span className="go"><span className="lt">Explore fractional leadership</span> <span className="arr">&rarr;</span></span>
            </a>
            <a className="card reveal" href="/consulting">
              <span className="kicker">One-time projects, defined scope</span>
              <h3>Hire me for a project</h3>
              <p>Need one thing done well? An audit built from your raw platform data, or an AI build &mdash; an automation, a dashboard, software you own &mdash; scoped as a single project with a clear deliverable and a clear quote.</p>
              <span className="go"><span className="lt">Explore project work</span> <span className="arr">&rarr;</span></span>
            </a>
            <a className="card reveal" href="/speaking">
              <span className="kicker">Conferences, trade shows &amp; events</span>
              <h3>Book me to speak</h3>
              <p>Bring me to your stage. Market strategy, competition, and AI &mdash; delivered with composure, from a sell-out expo session to a statewide PBS debate stage.</p>
              <span className="go"><span className="lt">Keynotes &amp; speaking</span> <span className="arr">&rarr;</span></span>
            </a>
            <a className="card reveal" href="/executive">
              <span className="kicker">CMO, CEO &amp; executive roles</span>
              <h3>Hire me full-time</h3>
              <p>Hiring a CMO, CEO, or senior growth leader? I bring twenty years of P&amp;L-accountable leadership to the whole picture &mdash; revenue, team, budget, and results that hold up under scrutiny.</p>
              <span className="go"><span className="lt">Explore executive roles</span> <span className="arr">&rarr;</span></span>
            </a>
          </div>
        </div>
      </section>

      {/* ======= PROOF STRIP ======= */}
      <section className="proof" id="results">
        <div className="wrap">
          <div className="proof-head reveal">
            <span className="microlabel">Selected results</span>
            <h2>A track record that speaks first</h2>
            <p>Real companies, real numbers, and the systems behind them.</p>
          </div>
          <div className="results">
            <div className="result reveal">
              <div className="stat">Sold</div>
              <h3>From two years of decline to a NASDAQ exit</h3>
              <p>AcreValue&rsquo;s revenue had fallen two years straight. I rebuilt the go-to-market from the sales calls out, returned it to growth &mdash; and CoStar Group bought the company.</p>
            </div>
            <div className="result reveal">
              <div className="stat">490%</div>
              <h3>Inbound calls, rebuilt</h3>
              <p>At Vertex Roofing, drove inbound calls up 490% and lifted booking rate from 16% to 59% in three quarters.</p>
            </div>
            <div className="result reveal">
              <div className="stat">#1</div>
              <h3>The Midwest region</h3>
              <p>Full ownership of Midwest marketing across a national platform &mdash; now the #1 performing region, with double-digit year-over-year sales growth.</p>
            </div>
          </div>
          <div className="proof-more reveal">
            <a href="/case-studies"><span className="lt">Read the full case studies</span> <span className="arr">&rarr;</span></a>
          </div>
        </div>
      </section>

      {/* ======= BOOK BANNER ======= */}
      <section className="bookbar" id="book">
        <div className="wrap bookbar-grid">
          <div className="reveal">
            <span className="microlabel">New book &middot; Coming soon</span>
            <h2>It&rsquo;s Not a <em>Marketing</em> Problem</h2>
            <p className="booksub">Hard truths for companies that want to grow.</p>
            <p className="bookdesc">Twenty years of blunt lessons from the field &mdash; why your business isn&rsquo;t as different as you think, why tactics can&rsquo;t save a bad strategy, and why the answer is in your data, not your slogan. No fluff. No platitudes. Just the conversations most consultants are too polite to have.</p>
            <a className="btn btn-gold" href="/contact">Be first to know <span className="arr">&rarr;</span></a>
          </div>
          <div className="bookcover-wrap reveal">
            <div className="bookcover">
              <span className="bk-label">Coming soon</span>
              <span className="bk-title">It&rsquo;s Not a <em>Marketing</em> Problem</span>
              <span className="bk-sub">Hard truths for companies that want to grow</span>
              <span className="bk-author">Bradley Griffin</span>
            </div>
          </div>
        </div>
      </section>

      {/* ======= ABOUT + TESTIMONIAL ======= */}
      <section className="about">
        <div className="wrap about-grid">
          <div className="reveal">
            <span className="microlabel">About</span>
            <h2>Twenty years of building growth that holds</h2>
            <p>
              I&rsquo;m a marketing, AI, and data-analysis operator. I&rsquo;ve built two companies
              from zero to a successful exit and rebuilt growth for brands that had stalled. Before
              any of that, I served in the 75th Ranger Regiment, where I learned to plan when the
              cost of being wrong is absolute. That same standard shows up in how I work now:
              prepared, precise, and accountable to the numbers.
            </p>
            <a className="plain" href="/story"><span className="lt">Read my story</span> <span className="arr">&rarr;</span></a>
          </div>
          <figure className="testimonial reveal">
            <span className="qmark">&ldquo;</span>
            <blockquote>He excels at setting clear goals and consistently delivering results. He is a valuable asset to any team.</blockquote>
            <div className="who">
              <div className="nm">Michael Loomus</div>
              <div className="rl">Inside Sales &amp; Customer Service Leader &mdash; reported to Bradley</div>
            </div>
          </figure>
        </div>
      </section>

      {/* ======= NEWSLETTER ======= */}
      <section className="newsletter" id="newsletter">
        <div className="wrap reveal">
          <span className="microlabel">Field notes</span>
          <h2>Occasional notes on making marketing <em>measurable</em></h2>
          <p>How to read your own data, cut the waste, and build growth you can repeat. No fluff, no spam.</p>
          <NewsletterSignup heading="" blurb="" source="site" />
        </div>
      </section>

      {/* ======= CONTACT CTA ======= */}
      <section className="finale" id="contact">
        <div className="wrap reveal">
          <span className="microlabel">Start a conversation</span>
          <h2>The next win is <em>a conversation away.</em></h2>
          <p>Tell me what you&rsquo;re building &mdash; a role to fill, a growth problem to solve, or a stage that needs a speaker &mdash; and I&rsquo;ll tell you how I&rsquo;d approach it.</p>
          <div className="fin-ctas"><a className="btn btn-solid" href="/contact">Get in Touch <span className="arr">&rarr;</span></a>
          <a className="btn btn-gold cal-link" href="https://calendly.com/optimzedseo/30min" target="_blank" rel="noopener">Schedule a Call <span className="arr">&rarr;</span></a></div>
        </div>
      </section>
    </div>
  );
}
