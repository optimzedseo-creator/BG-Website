import type { Metadata } from "next";

const TITLE = "Fractional CMO for Founder-Led Companies - Bradley Griffin";
const DESCRIPTION =
  "Fractional CMO for founder-led and mid-market companies. I install the demand engine, attribution, and cadence - proven by a NASDAQ exit and two founded-and-sold companies.";
const URL = "https://www.bradleygriffin.us/fractional";
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

/* JSON-LD carried over VERBATIM from the legacy page (byte-identical). */
const fractionalJsonLd =
  '{"@context": "https://schema.org", "@graph": [{"@type": "Service", "name": "Fractional CMO Services", "description": "Senior marketing leadership on a fractional engagement: demand generation, attribution, CRM and automation, inside-sales playbooks, and operating cadence.", "url": "https://www.bradleygriffin.us/fractional", "provider": {"@type": "Person", "@id": "https://www.bradleygriffin.us/#person", "name": "Bradley Griffin"}, "serviceType": "Fractional CMO Services", "areaServed": "United States", "audience": {"@type": "Audience", "audienceType": "Founder-led and mid-market companies"}}, {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.bradleygriffin.us/"}, {"@type": "ListItem", "position": 2, "name": "Fractional CMO", "item": "https://www.bradleygriffin.us/fractional"}]}]}';

export default function FractionalPage() {
  return (
    <div className="page-fractional">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: fractionalJsonLd }} />

      {/* ======= HERO ======= */}
      <section className="hero" id="top">
        <div className="wrap">
          <span className="microlabel">Fractional CMO</span>
          <h1>CMO firepower, at a <em>fractional footprint.</em></h1>
          <p className="lede">
            Senior growth leadership, installed. You get the strategy, the systems, and the operating cadence of a
            <strong> $25M-budget CMO</strong> &mdash; at the fraction your stage actually needs. It&rsquo;s built for
            <strong> founder-led and mid-market companies</strong> that have outgrown their vendors but aren&rsquo;t
            ready to bet $300K+ on a full-time executive seat.
          </p>
          <div className="hero-ctas">
            <a className="btn btn-solid" href="/contact?type=fractional">Get in Touch <span className="arr">&rarr;</span></a>
            <a className="btn btn-ghost" href="#installed">See what gets installed</a>
          </div>
        </div>
      </section>

      {/* ======= THE PROBLEM ======= */}
      <section className="section">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="microlabel">The problem</span>
            <h2>You&rsquo;re in <em>the gap.</em></h2>
            <p>Too big for an agency to carry. Too early for a $300K+ executive hire. It&rsquo;s the most expensive place a growth company can sit &mdash; and most sit there for years.</p>
          </div>
          <div className="problem-grid">
            <div className="problem reveal">
              <span className="p-idx">A</span>
              <h3>Past what an agency can do</h3>
              <p>Agencies execute channels. Nobody hands an agency the revenue plan, the budget trade-offs, or the hard call on what to kill. You&rsquo;ve outgrown deliverables &mdash; you need direction.</p>
            </div>
            <div className="problem reveal">
              <span className="p-idx">B</span>
              <h3>Not ready for the $300K seat</h3>
              <p>A full-time CMO is a $300K+ bet before the first result &mdash; salary, equity, ramp time, and the risk of a bad hire. Your stage needs the firepower without the fixed cost.</p>
            </div>
            <div className="problem reveal">
              <span className="p-idx">C</span>
              <h3>Nobody owns the number</h3>
              <p>Marketing is a collection of vendors, not a system. Paid over here, SEO over there, a CRM half-configured &mdash; and when the pipeline misses, everyone has an explanation and no one has the number.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= WHAT GETS INSTALLED ======= */}
      <section className="section install" id="installed">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="microlabel">What gets installed</span>
            <h2>Not advice. <em>Infrastructure.</em></h2>
            <p>A fractional engagement isn&rsquo;t a deck and a monthly call. It&rsquo;s a working growth system, built inside your company, that keeps running after I&rsquo;m gone.</p>
          </div>
          <div className="install-grid">
            <div className="install-card reveal">
              <span className="i-num">01</span>
              <h3>Demand engine</h3>
              <p>Paid media, SEO/AIO, retargeting, and email/SMS lifecycle &mdash; architected as one funnel with one owner, not four vendors with four dashboards.</p>
            </div>
            <div className="install-card reveal">
              <span className="i-num">02</span>
              <h3>Attribution &amp; reporting</h3>
              <p>Know what every dollar returns. Full-funnel attribution from first click to closed revenue, reported in numbers a founder can act on.</p>
            </div>
            <div className="install-card reveal">
              <span className="i-num">03</span>
              <h3>CRM &amp; automation</h3>
              <p>Builder Prime, HubSpot, Salesforce &mdash; wired together with N8N, Make, and Zapier so leads route, follow-ups fire, and nothing leaks.</p>
            </div>
            <div className="install-card reveal">
              <span className="i-num">04</span>
              <h3>Inside sales playbooks</h3>
              <p>Scripts, call coaching, and lead-handling standards that turn marketing spend into set appointments &mdash; the handoff most companies fumble.</p>
            </div>
            <div className="install-card reveal">
              <span className="i-num">05</span>
              <h3>Vendor &amp; budget discipline</h3>
              <p>Every agency, tool, and contract audited against return. What performs stays, what doesn&rsquo;t goes &mdash; the same discipline that ran a $25M budget.</p>
            </div>
            <div className="install-card reveal">
              <span className="i-num">06</span>
              <h3>An operating cadence</h3>
              <p>Weekly numbers, monthly reviews, quarterly plans &mdash; a rhythm your team runs on its own after I hand over the keys.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= HOW AN ENGAGEMENT RUNS ======= */}
      <section className="section">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="microlabel">How an engagement runs</span>
            <h2>Four moves, <em>in order.</em></h2>
          </div>
          <div className="steps">
            <div className="step reveal">
              <span className="s-idx">01</span>
              <h3>Diagnose</h3>
              <p>A full audit of the funnel, the spend, the data, and the team. Where the leads die, where the dollars leak, and what the numbers actually say.</p>
            </div>
            <div className="step reveal">
              <span className="s-idx">02</span>
              <h3>Architect</h3>
              <p>The revenue plan, the channel mix, and the stack &mdash; one blueprint that connects spend to pipeline to revenue, with a number attached to every piece.</p>
            </div>
            <div className="step reveal">
              <span className="s-idx">03</span>
              <h3>Build &amp; operate</h3>
              <p>I run it. Campaigns launch, systems get wired, the sales floor gets coached &mdash; and the numbers are visible to you every single week.</p>
            </div>
            <div className="step reveal">
              <span className="s-idx">04</span>
              <h3>Hand over the keys</h3>
              <p>Documented systems, a trained team, and an operating cadence that doesn&rsquo;t need me in the room. The engine stays. The invoice doesn&rsquo;t.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= PROOF (DARK) ======= */}
      <section className="section proof-sec">
        <div className="wrap">
          <div className="reveal">
            <span className="microlabel">Fractional, proven</span>
            <h2>This model has already ended in <em>an acquisition.</em></h2>
          </div>
          <div className="proof-grid">
            <div className="proof-card reveal">
              <p className="p-co">AcreValue / Ag Analytics</p>
              <p className="p-big">I joined fractionally. <em>It exited on NASDAQ.</em></p>
              <p>I came in as a fractional leader when recurring revenue had <strong>declined two straight years</strong>. I repositioned the platform, returned <strong>MRR to growth</strong>, and opened entirely new market segments. The company was acquired by <strong>CoStar Group (NASDAQ: CSGP)</strong>.</p>
              <p className="p-tag">Fractional engagement <em>&rarr;</em> NASDAQ acquisition</p>
            </div>
            <div className="proof-card reveal">
              <p className="p-co">Roofing GR</p>
              <p className="p-big">Lead generation, <em>+1,000% YoY.</em></p>
              <p>A demand engine built on <strong>N8N, Make, and Zapier automation</strong> drove <strong>+1,000% year-over-year lead growth</strong> &mdash; while <strong>cutting operational costs</strong>. More pipeline, less overhead: the whole point of the model.</p>
              <p className="p-tag">Automation-built growth <em>&rarr;</em> at lower cost</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= WHY THIS WORKS WITH ME ======= */}
      <section className="section">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="microlabel">Why this works with me</span>
          </div>
          <div className="why-grid reveal">
            <p className="big-claim">&ldquo;I build companies <em>that sell</em>.&rdquo;</p>
            <div className="why-copy">
              <p>Optimized was founded as a team of one &mdash; <strong>the sales floor by day; SEO, PPC, social, and web development by night</strong>. It grew into a <strong>$5M firm with 23 employees, seven satellite offices, and Fortune 500 clients</strong> &mdash; then <strong>sold to an equity firm</strong> expanding into the U.S.</p>
              <p>An acquirer doesn&rsquo;t purchase hustle. It purchases systems that run without the founder &mdash; documented processes, a trained team, revenue that doesn&rsquo;t depend on one person. That&rsquo;s exactly what a fractional engagement leaves behind in your company.</p>
              <p>And because I&rsquo;ve personally done every job I now direct, nothing gets managed from a job description. When I review your paid accounts, coach your inside sales team, or rebuild your automations, I&rsquo;m inspecting work I&rsquo;ve done with my own hands.</p>
              <p className="rule-note">Founder <em>&times;2</em> &middot; Exits <em>&times;2</em></p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= TESTIMONIAL ======= */}
      <section className="section testimonial-sec">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="microlabel">From the people who worked the system</span>
          </div>
          <figure className="testimonial reveal">
            <span className="qmark">&ldquo;</span>
            <blockquote>He trusted our team, gave us the freedom to restructure campaigns, and always focused on outcomes rather than micromanagement&hellip; Any agency would value a client like him.</blockquote>
            <div className="who">
              <div className="nm">Ashish Roy</div>
              <div className="rl">CEO, SenseiDigital &amp; Cibirix</div>
            </div>
          </figure>
        </div>
      </section>

      {/* ======= CONTACT CTA ======= */}
      <section className="finale" id="contact">
        <div className="wrap reveal">
          <span className="microlabel">Start a conversation</span>
          <h2>Get the executive. <em>Skip the overhead.</em></h2>
          <p>Tell me where the pipeline stands and where it needs to be. I&rsquo;ll tell you exactly what I&rsquo;d install, in what order, and what it should return.</p>
          <div className="fin-ctas"><a className="btn btn-solid" href="/contact?type=fractional">Get in Touch <span className="arr">&rarr;</span></a>
          <a className="btn btn-gold cal-link" href="https://calendly.com/optimzedseo/30min" target="_blank" rel="noopener">Schedule a Call <span className="arr">&rarr;</span></a></div>
        </div>
      </section>
    </div>
  );
}
