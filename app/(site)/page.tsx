import type { Metadata } from "next";
import NewsletterSignup from "@/components/NewsletterSignup";
import PhotoFrame from "@/components/PhotoFrame";
import CinemaQuote from "@/components/CinemaQuote";

const TITLE = "Bradley Griffin - Fractional CMO, Advisor & Growth Operator";
const DESCRIPTION =
  "Most growth problems aren't marketing problems. Bradley Griffin is a fractional CMO and advisor who finds what's actually broken and builds growth that holds.";
const URL = "https://www.bradleygriffin.us/";
const OG_IMAGE = "https://www.bradleygriffin.us/assets/bradley-griffin-og.jpg";

/*
 * NOTE: canonical + og:url are rendered manually inside the page (React
 * hoists <link>/<meta> to <head>) because the legacy homepage uses the
 * trailing-slash form "https://www.bradleygriffin.us/" and Next's metadata
 * resolver strips the trailing slash on the root path. Do not re-add them
 * to this metadata object — you'd get duplicates.
 *
 * D1 SUPERSEDED (2026-07-23, Brad's locked decision): the home SCREEN ONE
 * now leads with the buyer's PROBLEM, not the identity line. H1 is the locked
 * verbatim "Most growth problems aren't marketing problems."; "Soldier.
 * Operator. Builder." demotes to the subordinate eyebrow tag. Title +
 * description + og/twitter re-synced to the new problem-first, fractional-lead
 * positioning for snippet-to-page coherence (name anchor kept; liftable
 * identity sentence added, closing the AIO answerability gap; NO metric claims,
 * matching the metric-free hero). JSON-LD deliberately kept BYTE-IDENTICAL:
 * it has zero H1 coupling, every Person claim (CMO/growth-exec, two exits,
 * NASDAQ, Ranger, knowsAbout incl. Fractional CMO Leadership) still appears in
 * the visible copy below, and re-titling jobTitle to "Fractional CMO" is a
 * positioning/claim call that needs factcheck + Brad — flagged, not made here.
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
  '{"@context": "https://schema.org", "@graph": [{"@type": "WebSite", "@id": "https://www.bradleygriffin.us/#website", "name": "Bradley Griffin", "url": "https://www.bradleygriffin.us/", "publisher": {"@type": "Person", "@id": "https://www.bradleygriffin.us/#person", "name": "Bradley Griffin"}}, {"@type": "Person", "@id": "https://www.bradleygriffin.us/#person", "name": "Bradley Griffin", "alternateName": "Brad Griffin", "jobTitle": ["Fractional CMO", "Growth Advisor", "Chief Marketing Officer & Growth Executive"], "description": "CMO and growth marketing executive with 20+ years scaling B2C brands, SaaS platforms, and multi-location operations - two founded-and-sold companies and a NASDAQ acquisition. U.S. Army 75th Ranger Regiment veteran.", "url": "https://www.bradleygriffin.us/", "image": "https://www.bradleygriffin.us/assets/bradley-griffin-portrait.jpg", "sameAs": ["https://www.linkedin.com/in/brad-w-griffin/"], "address": {"@type": "PostalAddress", "addressRegion": "MI", "addressCountry": "US"}, "alumniOf": [{"@type": "CollegeOrUniversity", "name": "Auburn University"}, {"@type": "CollegeOrUniversity", "name": "Central Michigan University"}], "knowsAbout": ["Growth Marketing", "Demand Generation", "Fractional CMO Leadership", "SEO", "AI Overviews (AIO)", "AI Marketing Operations", "Marketing Automation", "CRM Architecture", "Attribution Modeling", "Paid Media", "Go-to-Market Strategy"]}, {"@type": "ProfilePage", "url": "https://www.bradleygriffin.us/", "mainEntity": {"@type": "Person", "@id": "https://www.bradleygriffin.us/#person", "name": "Bradley Griffin"}, "isPartOf": {"@id": "https://www.bradleygriffin.us/#website"}}]}';

/*
 * C1 homepage (Tier F) — structure per the picked mockup + C1-CONTENT-MAP §1.1:
 * Hero (3-plane) → Arc → Proof band → Offers (the reborn chooser; trust peak
 * H1) → Method band (spine restored — home-band default, Brad decides final
 * placement at the preview) → Cinema quote (peak H2 → /story only) → Book
 * (CTA IS the capture) → Testimonial → Newsletter (restored) → Finale.
 * Copy = the audited mockup draft (em-dash-swept, claims-sanctioned).
 * Hero H1 ships the mockup's "Soldier. Operator. Builder." on the PREVIEW —
 * Brad's D1 decision point.
 */
export default function HomePage() {
  return (
    <div className="c1 c1-home">
      <link rel="canonical" href={URL} />
      <meta property="og:url" content={URL} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: homeJsonLd }} />

      {/* ======= HERO — problem-first screen one (3-plane parallax kept) =======
          Brad's 2026-07-23 decision (Clark direction): lead with the buyer's
          problem as the H1, an availability signal, and a slim four-path strip
          reachable without scrolling (Fractional primary). The identity line
          "Soldier. Operator. Builder." demotes to the subordinate eyebrow tag;
          the Storyteller arc + proof band stay below as the trust-closer.
          H1 is LOCKED verbatim (book-title framing) — do not reword. */}
      <section className="hero" id="top">
        <div className="hero-plate" data-px="plate" aria-hidden="true"></div>
        <div className="hero-veil" data-px="veil" aria-hidden="true"></div>
        <div className="hero-in" data-px="fore">
          <p className="hero-eyebrow">
            <span className="he-name">Bradley Griffin</span>
            <span className="he-tag">Fractional CMO</span>
          </p>
          <h1>Growth stalls for a reason. <em>I find it.</em></h1>
          <p className="lede">
            Marketing, the offer, positioning, business fundamentals. The cause can live anywhere. I find the right one and move on it.
          </p>
          <p className="hero-avail">
            <span className="av-dot" aria-hidden="true"></span>
            Taking select fractional and advisory work.
          </p>
          <div className="hero-paths" role="group" aria-label="Ways to work together">
            <a className="hpath is-primary" href="/fractional">
              <span className="hp-t">Fractional CMO</span>
              <span className="hp-d">Embedded growth leadership, month over month.</span>
              <span className="hp-arr" aria-hidden="true">&rarr;</span>
            </a>
            <a className="hpath" href="/consulting">
              <span className="hp-t">Advisory &amp; AI</span>
              <span className="hp-d">Audits, AI builds, one-off projects.</span>
              <span className="hp-arr" aria-hidden="true">&rarr;</span>
            </a>
            <a className="hpath" href="/speaking">
              <span className="hp-t">Keynotes</span>
              <span className="hp-d">Stages, panels, and expos.</span>
              <span className="hp-arr" aria-hidden="true">&rarr;</span>
            </a>
          </div>
          <div className="hero-tail">
            <div className="hero-ctas">
              <a className="btn btn-gold" href="/contact?type=fractional">Find what&rsquo;s broken <span className="arr">&rarr;</span></a>
              <a className="btn btn-line" href="/case-studies">See the record <span className="arr">&rarr;</span></a>
            </div>
            <a className="hpath-quiet" href="/executive">Hiring full-time? <span className="u">See executive roles</span> <span className="arr" aria-hidden="true">&rarr;</span></a>
          </div>
        </div>
        <div className="scrollcue" aria-hidden="true">The story &darr;</div>
      </section>

      {/* ======= THE ARC ======= */}
      <section className="arc" id="arc">
        <div className="wrap">
          <div className="arc-head reveal">
            <span className="microlabel">The arc</span>
            <h2>People hire people. Here is <em>mine,</em> in three chapters.</h2>
            <p>Every result on this site traces back to a standard set at Fort Benning. Follow the line from the Regiment to the boardroom, then decide if it belongs on your problem.</p>
          </div>
          <div className="arc-grid">
            <a className="arc-card reveal" href="/story#ch-01">
              <PhotoFrame
                ratio="4/3"
                tone="sepia"
                src="/assets/military-three-generations.jpg"
                alt="Bradley Griffin in Army dress uniform and beret, flanked by his father and grandfather on graduation day"
                caption={"Dress uniform · three generations"}
              />
              <div className="arc-body">
                <span className="arc-n">Chapter one</span>
                <h3>The soldier</h3>
                <p>The 75th Ranger Regiment, a parachute that opened wrong, and about twenty-five seconds. The standard survived the injury.</p>
                <span className="go">Read the chapter <span className="arr">&rarr;</span></span>
              </div>
            </a>
            <a className="arc-card reveal" href="/story#ch-03">
              {/* Interim designed frontispiece plate (Brad's call 2026-07-21):
                  the operator working-shot is the one true photo gap (shoot
                  item #2). Until it lands, this fills the slot with a designed
                  data-mark drawn ONLY from this card's own published copy
                  ("team of one to 23 employees") — no new claim, no date span
                  (the story uses "operator" for two eras). Swaps to the real
                  photo by dropping `plate` and adding `src`/`alt`. */}
              <PhotoFrame
                ratio="4/3"
                tone="navy"
                plate={
                  <div className="ph-plate" aria-hidden="true">
                    <span className="ph-plate-nums">
                      <b>1</b>
                      <i className="ph-plate-arr">&rarr;</i>
                      <b>23</b>
                    </span>
                    <span className="ph-plate-rule" />
                    <span className="ph-plate-lab">Team of one, bootstrapped</span>
                  </div>
                }
              />
              <div className="arc-body">
                <span className="arc-n">Chapter two</span>
                <h3>The operator</h3>
                <p>Sales floors first, then founder. Optimized, bootstrapped from a team of one to 23 employees and a sale to an equity firm.</p>
                <span className="go">Read the chapter <span className="arr">&rarr;</span></span>
              </div>
            </a>
            <a className="arc-card reveal" href="/story#ch-05">
              {/* Brad's call (2026-07-20): the 2018 portrait belongs on THE
                  BUILDER card (the visibly-labeled one — a placement miss put
                  it on the operator card first; corrected same day). Visually
                  neutral frame, era-label caption only. STATIC plate per
                  C1-PHOTO-MAP — the 805px re-save has no 13% bleed, so it is
                  excluded from the parallax registry (staticPlate). If the
                  camera original ever lands, re-export with bleed + drop the
                  prop and it re-enters the registry. */}
              <PhotoFrame
                ratio="4/3"
                tone="navy"
                src="/assets/campaign-downtown-2018.png"
                alt="Bradley Griffin in a gray suit and tie on a downtown main street"
                caption="The building years"
                staticPlate
              />
              <div className="arc-body">
                <span className="arc-n">Chapter three</span>
                <h3>The builder</h3>
                <p>CMO years, a NASDAQ acquisition, and a Midwest region that now leads a national platform. Systems that hold after I leave the room.</p>
                <span className="go">Read the chapter <span className="arr">&rarr;</span></span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ======= PROOF BAND ======= */}
      <section className="proofband" id="results">
        <div className="wrap">
          <div className="pb-head reveal">
            <span className="microlabel">Selected results</span>
            <h2>The chapters end in <em>numbers.</em></h2>
          </div>
          <div className="pb-grid">
            <div className="pb reveal">
              <div className="stat">Sold</div>
              <h3>From two years of decline to a NASDAQ exit</h3>
              <p>AcreValue&rsquo;s revenue had fallen two years straight. I rebuilt the go-to-market from the sales calls out and returned it to growth. CoStar Group bought the company.</p>
            </div>
            <div className="pb reveal">
              <div className="stat">490%</div>
              <h3>Inbound calls, rebuilt</h3>
              <p>At Vertex, drove inbound calls up 490% and lifted booking rate from 16% to 59% in four months.</p>
            </div>
            <div className="pb reveal">
              <div className="stat">#1</div>
              <h3>The Midwest region</h3>
              <p>Full ownership of Midwest marketing across a national platform. Now the #1 performing region, with double-digit year-over-year sales growth.</p>
            </div>
          </div>
          <div className="pb-more reveal">
            <a className="lt-link" href="/case-studies"><span className="lt">Read the full case studies</span> <span className="arr">&rarr;</span></a>
          </div>
        </div>
      </section>

      {/* ======= OFFERS — the chooser, reborn as rows (trust peak H1) ======= */}
      <section className="offers" id="work">
        <div className="wrap">
          <div className="of-head reveal">
            <span className="microlabel">Ways to work together</span>
            <h2>Now the part where the story <em>meets your problem.</em></h2>
            <p>Pick the path that fits. Each one goes straight to the details.</p>
          </div>
          <a className="of-row reveal" href="/fractional">
            <span className="of-k">Part-time &amp; ongoing</span>
            <div>
              <h3>Hire me fractionally</h3>
              <p>Executive marketing leadership on a part-time, ongoing basis. I embed with your team and own the growth agenda month after month, at a fraction of the cost of a full-time hire.</p>
            </div>
            <span className="of-go" aria-hidden="true">&rarr;</span>
          </a>
          <a className="of-row reveal" href="/consulting">
            <span className="of-k">One-time projects, defined scope</span>
            <div>
              <h3>Hire me for a project</h3>
              <p>Need one thing done well? An audit built from your raw platform data, or an AI build: an automation, a dashboard, software you own. Scoped as a single project with a clear deliverable and a clear quote.</p>
            </div>
            <span className="of-go" aria-hidden="true">&rarr;</span>
          </a>
          <a className="of-row reveal" href="/speaking">
            <span className="of-k">Conferences, trade shows &amp; events</span>
            <div>
              <h3>Book me to speak</h3>
              <p>Bring me to your stage. Market strategy, competition, and AI, delivered with composure, from a sell-out expo session to a statewide PBS debate stage.</p>
            </div>
            <span className="of-go" aria-hidden="true">&rarr;</span>
          </a>
          <a className="of-row reveal" href="/executive">
            <span className="of-k">CMO, CEO &amp; executive roles</span>
            <div>
              <h3>Hire me full-time</h3>
              <p>Hiring a CMO, CEO, or senior growth leader? I bring twenty years of P&amp;L-accountable leadership to the whole picture: revenue, team, budget, and results that hold up under scrutiny.</p>
            </div>
            <span className="of-go" aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </section>

      {/* ======= METHOD BAND — the 4-step spine, restored (home-band default; Brad decides placement at preview) ======= */}
      <section className="methodband" id="method">
        <div className="wrap">
          <div className="reveal">
            <span className="microlabel">The method</span>
            <h2>The same four steps, <em>every time.</em></h2>
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
              <h3>Blueprint &amp; roadmap</h3>
              <p>What to keep, what to cut, what to build. Ranked in the order that compounds, so the work builds on itself.</p>
            </li>
            <li>
              <div className="step-head">
                <span className="step-n">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                    <path d="M4 17l6-5 4-2 5.5-4" />
                    <path d="M15.5 6h4v4" />
                  </svg>
                </span>
                <span className="step-num">04</span>
              </div>
              <h3>Predictable growth</h3>
              <p>Systems that hold. Growth you can repeat, not chase.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* ======= CINEMA QUOTE — emotional peak; story-first, no contact CTA here ======= */}
      <CinemaQuote
        kicker="From the story"
        quote={"When the canopy rolls up at altitude, you don’t get to negotiate with the situation."}
        attribution={"Chapter two · Twenty-five seconds"}
        ctaHref="/story"
        ctaLabel="Read the whole story"
      />

      {/* ======= BOOK — "Be first to know" IS the capture (§4.4) ======= */}
      <section className="book" id="book">
        <div className="wrap book-grid">
          <div className="reveal">
            <span className="microlabel">New book &middot; Coming soon</span>
            <h2>It&rsquo;s Not a <em>Marketing</em> Problem</h2>
            <p className="booksub">Hard truths for companies that want to grow.</p>
            <p className="bookdesc">Twenty years of blunt lessons from the field. Why your business isn&rsquo;t as different as you think, why tactics can&rsquo;t save a bad strategy, and why the answer is in your data, not your slogan. No fluff. No platitudes. Just the conversations most consultants are too polite to have.</p>
            <NewsletterSignup heading="" blurb="" source="book" cta="Be first to know" />
          </div>
          <div className="reveal">
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
      <section className="testi">
        <div className="wrap testi-grid">
          <div className="reveal">
            <span className="microlabel">From the people who worked for him</span>
            <h2>The standard, seen <em>from inside the team.</em></h2>
            <p className="lede">
              I&rsquo;m a marketing, AI, and data-analysis operator. I&rsquo;ve built two companies
              from zero to a successful exit and rebuilt growth for brands that had stalled. Before
              any of that, I served in the 75th Ranger Regiment, where I learned to plan when the
              cost of being wrong is absolute. That same standard shows up in how I work now:
              prepared, precise, and accountable to the numbers.
            </p>
            <p style={{ marginTop: 18 }}><a className="lt-link" href="/story"><span className="lt">Read my story</span> <span className="arr">&rarr;</span></a></p>
          </div>
          <figure className="tcard reveal">
            <span className="qmark" aria-hidden="true">&ldquo;</span>
            <blockquote>He excels at setting clear goals and consistently delivering results. He is a valuable asset to any team.</blockquote>
            <div className="who">
              <div className="nm">Michael Loomus</div>
              <div className="rl">Inside Sales &amp; Customer Service Leader, reported to Bradley</div>
            </div>
          </figure>
        </div>
      </section>

      {/* ======= NEWSLETTER — restored pre-finale (§4.4) ======= */}
      <section className="newsletter" id="newsletter">
        <div className="wrap reveal">
          <span className="microlabel">Field notes</span>
          <h2>Occasional notes on making marketing <em>measurable</em></h2>
          <p>How to read your own data, cut the waste, and build growth you can repeat. No fluff, no spam.</p>
          <NewsletterSignup heading="" blurb="" source="site" />
        </div>
      </section>

      {/* ======= FINALE ======= */}
      <section className="finale" id="contact">
        <div className="wrap reveal">
          <span className="microlabel">Start a conversation</span>
          <h2>The next win is <em>a conversation away.</em></h2>
          <p>Tell me what you&rsquo;re building. A role to fill, a growth problem to solve, or a stage that needs a speaker, and I&rsquo;ll tell you how I&rsquo;d approach it.</p>
          <div className="fin-ctas">
            <a className="btn btn-gold" href="/contact">Get in Touch <span className="arr">&rarr;</span></a>
            <a className="btn btn-line cal-link" href="https://calendly.com/optimzedseo/30min" target="_blank" rel="noopener">Schedule a Call <span className="arr">&rarr;</span></a>
          </div>
        </div>
      </section>
    </div>
  );
}
