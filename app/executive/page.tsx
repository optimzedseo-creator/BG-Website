import type { Metadata } from "next";

const TITLE = "Chief Marketing Officer & Growth Executive for Hire - Bradley Griffin";
const DESCRIPTION =
  "Hire a CMO/CEO-level growth operator: a #1-performing region, a $25M six-brand portfolio budget, +269% booking rate. Twenty years of P&L-accountable leadership.";
const URL = "https://www.bradleygriffin.us/executive";
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
const executiveJsonLd =
  '{"@context": "https://schema.org", "@graph": [{"@type": "Service", "name": "Executive Marketing Leadership", "description": "Full-time CMO / CEO / growth-executive leadership for boards, investors, and executive search.", "url": "https://www.bradleygriffin.us/executive", "provider": {"@type": "Person", "@id": "https://www.bradleygriffin.us/#person", "name": "Bradley Griffin"}, "serviceType": "Executive Marketing Leadership", "areaServed": "United States", "audience": {"@type": "Audience", "audienceType": "Boards, investors, executive search"}}, {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.bradleygriffin.us/"}, {"@type": "ListItem", "position": 2, "name": "Executive Leadership", "item": "https://www.bradleygriffin.us/executive"}]}]}';

export default function ExecutivePage() {
  return (
    <div className="page-executive">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: executiveJsonLd }} />

      {/* ======= PAGE HERO ======= */}
      <section className="hero" id="top">
        <div className="wrap">
          <span className="microlabel">Executive leadership</span>
          <h1>An operator for the <em>whole P&amp;L.</em></h1>
          <p className="lede">
            I've spent twenty-plus years scaling B2C brands, SaaS platforms, and multi-location operations &mdash;
            from <strong>startup to exit</strong>, from <strong>seed budgets to $25M+</strong>. I build revenue
            architecture that a board can interrogate line by line: attribution from first touch to closed
            revenue, teams that hit forecast, and <strong>systems that survive due diligence</strong>.
          </p>
          <div className="hero-meta">
            <span>Boards &amp; PE operating partners</span>
            <span>CEOs</span>
            <span>Retained search</span>
          </div>
        </div>
      </section>

      {/* ======= STAT BAND ======= */}
      <section className="stats">
        <div className="wrap">
          <div className="stats-grid">
            <div className="stat reveal"><div className="num">#1</div><div className="lbl">Performing region in the company &mdash; IHS Midwest</div></div>
            <div className="stat reveal"><div className="num">$25M+</div><div className="lbl">Portfolio budget &mdash; six brands, one owner</div></div>
            <div className="stat reveal"><div className="num">269%</div><div className="lbl">Booking-rate lift &mdash; 16% to 59%</div></div>
            <div className="stat reveal"><div className="num">2</div><div className="lbl">Companies founded &amp; exited</div></div>
            <div className="stat reveal"><div className="num">4</div><div className="lbl">Marketing team built &amp; led at IHS</div></div>
            <div className="stat reveal"><div className="num">20+</div><div className="lbl">Years from startup to exit</div></div>
          </div>
        </div>
      </section>

      {/* ======= WHAT I OWN ======= */}
      <section className="section" id="own">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="microlabel">Scope of ownership</span>
            <h2>What I own <em>when I take the seat.</em></h2>
            <p>Not a channel specialist with a title. I own the full revenue apparatus &mdash; demand through close, budget through board deck &mdash; end to end, accountable to one number.</p>
          </div>
          <div className="own-grid">
            <div className="own reveal">
              <span className="kicker">A / 06</span>
              <h3>Demand generation &amp; paid media</h3>
              <p>Full-funnel acquisition across every channel that earns its keep &mdash; budget allocated by contribution to closed revenue, not by habit.</p>
              <p className="stack">Google &middot; Meta &middot; LSA &middot; CTV</p>
            </div>
            <div className="own reveal">
              <span className="kicker">B / 06</span>
              <h3>CRM &amp; marketing automation</h3>
              <p>The operational backbone: pipelines, lifecycle automation, and integrations that keep sales and marketing on one source of truth. 500K-record migrations executed with zero downtime.</p>
              <p className="stack">Builder Prime &middot; Salesforce &middot; HubSpot &middot; ServiceTitan &middot; N8N / Make / Zapier</p>
            </div>
            <div className="own reveal">
              <span className="kicker">C / 06</span>
              <h3>Attribution &amp; business intelligence</h3>
              <p>First-touch-to-closed-revenue visibility. Dashboards a CFO trusts, incrementality over vanity metrics, and reporting that ends the &ldquo;what&rsquo;s working&rdquo; debate.</p>
              <p className="stack">Full-funnel attribution &middot; BI dashboards &middot; Incrementality</p>
            </div>
            <div className="own reveal">
              <span className="kicker">D / 06</span>
              <h3>Inside sales &amp; call center ops</h3>
              <p>The handoff is where revenue dies. I own the scripts, the speed-to-lead, the set rates, and the management cadence that turns marketing spend into booked appointments.</p>
              <p className="stack">Playbooks &middot; Speed-to-lead &middot; Set &amp; show rates</p>
            </div>
            <div className="own reveal">
              <span className="kicker">E / 06</span>
              <h3>Budget &amp; P&amp;L discipline</h3>
              <p>$25M+ deployed with an operator&rsquo;s scrutiny &mdash; every dollar defends itself or gets reallocated. Founder-honed cost discipline: I've signed both sides of the check.</p>
              <p className="stack">Forecasting &middot; CAC / LTV &middot; Vendor ROI</p>
            </div>
            <div className="own reveal">
              <span className="kicker">F / 06</span>
              <h3>Team building &amp; vendor management</h3>
              <p>I've hired, structured, and led in-house teams and agency benches. High standards, clear goals, no micromanagement &mdash; the people who've worked for me say so on the record.</p>
              <p className="stack">Org design &middot; Agency oversight &middot; Performance cadence</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= THE RECORD ======= */}
      <section className="section" id="record">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="microlabel">The record</span>
            <h2>Roles held. <em>Numbers delivered.</em></h2>
            <p>Every line verifiable, every result tied to a system I built and a team I led. This is the diligence file, in the open.</p>
          </div>
          <div className="record">
            <div className="rec reveal">
              <div>
                <div className="co-name">Infinity Home Services</div>
                <div className="co-role">Regional marketing &mdash; Midwest</div>
                <div className="co-when">Feb 2026 &mdash; Present</div>
              </div>
              <p>I own Midwest marketing across a national home-services platform &mdash; building a team of four on trust, agile, and change management. Deep audits built on data augmentation and quantitative analytics cut dead line items, and I align marketing goals to operational goals with the call center, HR, operations, and Brand Presidents. The region now <strong>outperforms every other region in the company</strong> &mdash; double-digit YoY growth in qualified leads, appointments, and sales.</p>
              <div className="headline">#1<span className="sub-h">Region in the company &middot; IHS Midwest</span></div>
            </div>
            <div className="rec reveal">
              <div>
                <div className="co-name">Vertex Roofing</div>
                <div className="co-role">Chief Marketing Officer</div>
              </div>
              <p>I rebuilt acquisition end to end: inbound calls <strong>+490% (108 &rarr; 637, Aug&ndash;Nov)</strong>, appointments <strong>+212%</strong>, qualified leads <strong>+20%</strong>, and booking rate <strong>16% &rarr; 59% (+269%)</strong> &mdash; on the back of a 500,000-record CRM migration executed with <strong>zero downtime</strong>.</p>
              <div className="headline">+490%<span className="sub-h">Inbound calls &middot; 108 &rarr; 637</span></div>
            </div>
            <div className="rec reveal">
              <div>
                <div className="co-name">Atrium Home Services</div>
                <div className="co-role">Head of Digital Marketing &amp; Acquisition</div>
              </div>
              <p>I directed a <strong>$25M budget across a PE-owned portfolio of six HVAC, electrical, plumbing, and air-quality brands</strong> &mdash; every brand budget rolling up to one desk &mdash; standardizing the demand engine and reporting stack while driving inbound leads <strong>+20% month over month</strong>.</p>
              <div className="headline">$25M<span className="sub-h">Budget &middot; six brands</span></div>
            </div>
            <div className="rec reveal">
              <div>
                <div className="co-name">AcreValue / Ag Analytics</div>
                <div className="co-role">Fractional CMO / Head of Sales</div>
              </div>
              <p>I repositioned a 1.5M-user platform with two straight years of declining recurring revenue, <strong>returned MRR to growth</strong>, and set the table for acquisition by <strong>CoStar Group (NASDAQ: CSGP)</strong>.</p>
              <div className="headline">Sold<span className="sub-h">Returned to growth &middot; acquired by CoStar</span></div>
            </div>
            <div className="rec reveal">
              <div>
                <div className="co-name">Wensco Sign Supply</div>
                <div className="co-role">Head of Marketing</div>
              </div>
              <p>I rebuilt the marketing operation on a <strong>$1M+ budget</strong> &mdash; cutting costs <strong>35%</strong> while growing revenue <strong>30%</strong>. Efficiency and growth aren't a trade-off when the system is right.</p>
              <div className="headline">&minus;35% / +30%<span className="sub-h">Costs down &middot; revenue up</span></div>
            </div>
            <div className="rec reveal">
              <div>
                <div className="co-name">Founder &times;2</div>
                <div className="co-role">Optimized &middot; Florida Landscaping Services</div>
              </div>
              <p>I built Optimized from a team of one into a <strong>$5M firm with 23 employees</strong> serving Fortune 500 clients, and co-founded Florida Landscaping Services &mdash; <strong>both exited successfully</strong>, Optimized to a UK equity firm expanding into the U.S.</p>
              <div className="headline">2 exits<span className="sub-h">Founded, scaled &amp; sold</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= HOW I RUN A PORTFOLIO ======= */}
      <section className="section" id="portfolio">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="microlabel">How I run a portfolio</span>
            <h2>Six brands. <em>One operating system.</em></h2>
            <p>At Atrium &mdash; a PE-owned portfolio of six HVAC, electrical, plumbing, and air-quality brands &mdash; every brand budget rolled up to me, $25M in total. Here's what portfolio-level ownership looked like in practice.</p>
          </div>
          <div className="record">
            <div className="rec reveal">
              <div>
                <div className="co-name">Consolidated spend</div>
                <div className="co-role">Payment &amp; platform leverage</div>
              </div>
              <p>I unified Google Ads payments from six per-brand credit cards into <strong>consolidated ACH</strong> &mdash; qualifying the portfolio for a <strong>corporate-level Google account with a dedicated Google advisor</strong>. Scale negotiated into leverage, not just spend.</p>
              <div className="headline">6 &rarr; 1<span className="sub-h">Payment rails &middot; corporate Google account</span></div>
            </div>
            <div className="rec reveal">
              <div>
                <div className="co-name">Cradle-to-grave tracking</div>
                <div className="co-role">Attribution standard</div>
              </div>
              <p>I implemented <strong>UTM tracking cradle-to-grave across the portfolio</strong> &mdash; every lead traceable from first click to closed job, with all six brands reporting on one standard instead of six dialects.</p>
              <div className="headline">6 / 6<span className="sub-h">Brands on one tracking standard</span></div>
            </div>
            <div className="rec reveal">
              <div>
                <div className="co-name">One P&amp;L conversation</div>
                <div className="co-role">Portfolio-level allocation</div>
              </div>
              <p>With every budget rolling up to one desk, reallocation happened at <strong>portfolio level</strong> &mdash; dollars moved to the brand and channel where returns were highest, not where habit had parked them.</p>
              <div className="headline">$25M<span className="sub-h">Rolling up to one owner</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= HOW I OPERATE (dark) ======= */}
      <section className="operate" id="operate">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="microlabel">How I operate</span>
            <h2>The operating <em>system.</em></h2>
            <p>Three principles, applied without exception. They're why the numbers repeat across industries, business models, and market cycles.</p>
          </div>
          <div className="principles reveal">
            <div className="principle">
              <div className="p-idx">01 / 03</div>
              <h3>Build systems that scale</h3>
              <p>Campaigns end; systems compound &mdash; the acquisition engine I rebuilt at Vertex took booking rate from <strong>16% to 59%</strong>.</p>
            </div>
            <div className="principle">
              <div className="p-idx">02 / 03</div>
              <h3>Create operational efficiencies wherever possible</h3>
              <p>Waste goes first: at Wensco that discipline returned <strong>30% more revenue on 35% less marketing cost</strong>.</p>
            </div>
            <div className="principle">
              <div className="p-idx">03 / 03</div>
              <h3>Always rely on data to make decisions</h3>
              <p>Every budget I&rsquo;ve run &mdash; up to <strong>$25M across six brands</strong> &mdash; was allocated by closed-revenue data, not by the loudest voice in the room.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= EDUCATION ======= */}
      <section className="section" id="education">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="microlabel">Education</span>
            <h2>Still <em>sharpening.</em></h2>
          </div>
          <div className="edu-strip reveal">
            <div className="edu">
              <div>
                <h4>Auburn University &mdash; MBA + M.S. Information Systems</h4>
                <p className="sub">Dual master&rsquo;s program, Harbert College of Business</p>
              </div>
              <span className="yr">Exp. 2027</span>
            </div>
            <div className="edu">
              <div>
                <h4>Central Michigan University &mdash; B.A.</h4>
                <p className="sub">Summa Cum Laude &middot; 3.97 GPA</p>
              </div>
              <span className="yr">2025</span>
            </div>
          </div>
        </div>
      </section>

      {/* ======= TESTIMONIAL ======= */}
      <section className="reference" id="reference">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="microlabel">From the team</span>
            <h2>Ask the people <em>who reported to me.</em></h2>
          </div>
          <figure className="testimonial reveal">
            <span className="qmark">&ldquo;</span>
            <blockquote>Brad excels at setting clear goals and consistently delivering results&hellip; When we had differing opinions he engaged in thoughtful discussions to explore each perspective. He is a valuable asset to any team.</blockquote>
            <div className="who">
              <div className="nm">Michael Loomus</div>
              <div className="rl">Inside Sales &amp; Customer Service Leader &mdash; reported to Bradley</div>
            </div>
          </figure>
        </div>
      </section>

      {/* ======= FINAL CTA ======= */}
      <section className="finale" id="contact">
        <div className="wrap reveal">
          <span className="microlabel">Start a conversation</span>
          <h2>Looking for your next <em>growth executive?</em></h2>
          <p>Board seat, C-suite search, or a portfolio company that needs an operator in the chair &mdash; send the brief. I&rsquo;ll respond with how I&rsquo;d run it, and the numbers I&rsquo;d be accountable for.</p>
          <div className="fin-ctas"><a className="btn btn-solid" href="/contact?type=executive">Get in Touch <span className="arr">&rarr;</span></a>
          <a className="btn btn-gold cal-link" href="https://calendly.com/optimzedseo/30min" target="_blank" rel="noopener">Schedule a Call <span className="arr">&rarr;</span></a></div>
        </div>
      </section>
    </div>
  );
}
