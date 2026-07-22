import type { Metadata } from "next";

const TITLE = "Marketing Strategy & AI Consulting - Bradley Griffin";
const DESCRIPTION =
  "Marketing strategy & AI consulting - AI operations, automation, AIO/SEO, MarTech architecture, attribution. Built by an operator who has run it, not read about it.";
const URL = "https://www.bradleygriffin.us/consulting";
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
const consultingJsonLd =
  '{"@context": "https://schema.org", "@graph": [{"@type": "Service", "name": "Marketing Strategy & AI Consulting", "description": "Consulting in AI marketing operations, automation (N8N, Make, Zapier), AI Overviews and technical SEO, MarTech and CRM architecture, attribution and BI, and go-to-market strategy.", "url": "https://www.bradleygriffin.us/consulting", "provider": {"@type": "Person", "@id": "https://www.bradleygriffin.us/#person", "name": "Bradley Griffin"}, "serviceType": "Marketing Strategy & AI Consulting", "areaServed": "United States", "audience": {"@type": "Audience", "audienceType": "Business owners and operators"}}, {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.bradleygriffin.us/"}, {"@type": "ListItem", "position": 2, "name": "Strategy & AI Consulting", "item": "https://www.bradleygriffin.us/consulting"}]}]}';

/*
 * QUIET C1 (P2). Copy verbatim minus the em-dash sweep (C1-CONTENT-MAP §2).
 * ONE trust-peak CTA sits directly after "The difference" section (the
 * page's strongest earned moment, "I've run it" - §1.4), routed to
 * /contact?type=consulting. The proof-band "1,000%" / "10+ industries"
 * stat tiles are CARRIED live claims on Brad's 9-item confirm/kill (§6,
 * item 5): preserved verbatim, not spread to any new surface. Hero/finale
 * pairs and every ?type= link preserved exactly.
 */
export default function ConsultingPage() {
  return (
    <div className="c1 c1-consulting">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: consultingJsonLd }} />

      {/* ======= HERO ======= */}
      <section className="subhero" id="top">
        <div className="wrap">
          <span className="microlabel">Strategy &amp; AI consulting</span>
          <h1>AI isn&rsquo;t a tool. <em>It&rsquo;s an operating model.</em></h1>
          <p className="lede">
            I&rsquo;ve been an <strong>early and relentless AI power user</strong> since before it was a line item, and I rebuild
            marketing operations around <strong>automation, AI optimization (AIO), and data</strong>. Not a tool bolted onto a broken
            process, but the process itself, re-architected: pipelines that cut cost while compounding output, search strategy built
            for the results page that actually exists now, and reporting you can bet a budget on. <strong>Strategy first, tools second, results always.</strong>
          </p>
          <div className="subhero-ctas">
            <a className="btn btn-solid" href="/contact?type=consulting">Let&rsquo;s talk <span className="arr">&rarr;</span></a>
            <a className="btn btn-line-navy" href="#areas">See where I&rsquo;m pointed</a>
          </div>
        </div>
      </section>

      {/* ======= CONSULTING AREAS ======= */}
      <section className="section help" id="areas">
        <div className="wrap">
          <div className="section-intro reveal">
            <span className="microlabel">Where I&rsquo;m pointed</span>
            <h2>Six problems, <em>one operator</em></h2>
            <p>Costs too high, leads too few, a stack held together with duct tape, or the sense that AI is passing you by, every engagement starts with a specific problem and ends with a working system. These are the six I get hired to solve.</p>
          </div>
          <div className="areas">
            <div className="area reveal">
              <div className="a-idx">A.01</div>
              <h3>AI operations &amp; automation</h3>
              <p className="a-sys">N8N &middot; Make &middot; Zapier &middot; Prompt engineering</p>
              <p>The pipelines that cut cost while compounding output. I design, build, and hand over the automations myself, lead routing, enrichment, follow-up, reporting. Engineered around your process, not somebody&rsquo;s template.</p>
            </div>
            <div className="area reveal">
              <div className="a-idx">A.02</div>
              <h3>AI Overviews &amp; technical SEO</h3>
              <p className="a-sys">AIO &middot; Google Business Profile &middot; Local &amp; long-tail</p>
              <p>The search results page changed; most strategies didn&rsquo;t. I build for the page that exists now: AI Overviews, entity signals, Google Business Profile, and the local and long-tail plays that still convert.</p>
            </div>
            <div className="area reveal">
              <div className="a-idx">A.03</div>
              <h3>MarTech &amp; CRM architecture</h3>
              <p className="a-sys">Builder Prime &middot; Salesforce &middot; HubSpot &middot; Zoho &middot; ServiceTitan</p>
              <p>The right stack, picked for your business, then integrated, migrated, and actually adopted by the team. I&rsquo;ve run a full CRM migration myself, end to end; I don&rsquo;t recommend what I can&rsquo;t implement.</p>
            </div>
            <div className="area reveal">
              <div className="a-idx">A.04</div>
              <h3>Attribution &amp; business intelligence</h3>
              <p className="a-sys">Attribution modeling &middot; Dashboards &middot; Reporting</p>
              <p>You can&rsquo;t cut what you can&rsquo;t see. Attribution modeling from first touch to closed revenue, dashboards your leadership team will actually open, and decision-grade reporting that ends the &ldquo;what&rsquo;s working&rdquo; argument.</p>
            </div>
            <div className="area reveal">
              <div className="a-idx">A.05</div>
              <h3>Revenue architecture &amp; go-to-market</h3>
              <p className="a-sys">Market opportunity &middot; Positioning &middot; Pricing</p>
              <p>The funnel, end-to-end: where the market opportunity actually is, how you should be positioned against it, what to charge, and how the whole machine connects, from first impression to invoice.</p>
            </div>
            <div className="area reveal">
              <div className="a-idx">A.06</div>
              <h3>Competitive intelligence &amp; growth ideation</h3>
              <p className="a-sys">Market mapping &middot; Gap analysis &middot; Play design</p>
              <p>What your competitors are doing, what they&rsquo;re missing, and where the asymmetric plays are. Structured intelligence in, ranked growth ideas out, each one with the math attached.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= PROOF BAND ======= */}
      <section className="proof">
        <div className="wrap">
          <div className="proof-grid">
            <div className="pstat reveal"><div className="num">1,000%</div><div className="lbl">YoY lead growth on automation, Roofing GR</div></div>
            <div className="pstat reveal"><div className="num">+269%</div><div className="lbl">Booking rate, 16% &rarr; 59%, Vertex</div></div>
            <div className="pstat reveal"><div className="num">10+</div><div className="lbl">Industry verticals served, Optimized</div></div>
            <div className="pstat reveal"><div className="num">2</div><div className="lbl">Companies built on these systems, and sold</div></div>
          </div>
        </div>
      </section>

      {/* ======= RECENT ENGAGEMENTS ======= */}
      <section className="section" id="engagements">
        <div className="wrap">
          <div className="section-intro reveal">
            <span className="microlabel">Recent engagements</span>
            <h2>Recent work, <em>real companies</em></h2>
            <p>Client engagements stay confidential by default, identified here by industry, not by logo. The exception is the one where I own the platform relationship end-to-end.</p>
          </div>
          <div className="engagements">
            <div className="engage reveal">
              <div className="idx">01</div>
              <h3>Precision manufacturing</h3>
              <p className="span">Midwest &middot; CNC &amp; metal fabrication</p>
              <p>Business, AI, and marketing counsel for a precision manufacturer navigating a rebrand and an acquisition-era transition, repositioning the company, rebuilding the web presence, and standing up AI-assisted operations while the ground moved under it.</p>
              <p className="outcome">Scope: Positioning &middot; Web &middot; AI operations</p>
            </div>
            <div className="engage reveal">
              <div className="idx">02</div>
              <h3>Industrial controls</h3>
              <p className="span">Manufacturer &middot; Technical B2B</p>
              <p>Business, AI, and marketing consulting for an industrial controls manufacturer: demand generation for a deep technical catalog, data capture that actually feeds the funnel, and modernization of the entire marketing motion.</p>
              <p className="outcome">Scope: Demand gen &middot; Data capture &middot; Modernization</p>
            </div>
            <div className="engage reveal">
              <div className="idx">03</div>
              <h3>Griffin Opus</h3>
              <p className="span">Stationery e-commerce &middot; Named with permission</p>
              <p>I architected and built the entire commerce platform end-to-end, custom storefront, CRM, order, label, and shipping operations, analytics, and back-office, and serve as standing strategic counsel to the owner. Not advice about a system. The system.</p>
              <p className="outcome">Scope: Full platform build &middot; Standing advisory</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= ENGAGEMENT SHAPES ======= */}
      <section className="section help" id="how">
        <div className="wrap">
          <div className="section-intro reveal">
            <span className="microlabel">How we can work</span>
            <h2>Three shapes, <em>pick your problem</em></h2>
            <p>Every engagement is scoped to an outcome, not a retainer clock. Start where the pain is.</p>
          </div>
          <div className="engagements">
            <div className="engage reveal">
              <div className="idx">01</div>
              <h3>The audit</h3>
              <p className="span">2&ndash;3 weeks &middot; Diagnostic</p>
              <p>I pull the raw source data from your platforms, Google Search Console, Google and Microsoft PPC, CallRail, your CRM, and run the quantitative analysis myself. You get a blueprint of what&rsquo;s actually happening and a ranked roadmap to fix it, with the math behind every line. Take it to your team or bring me back to build it; it&rsquo;s yours either way.</p>
              <p className="outcome">Deliverable: the blueprint and the ranked roadmap</p>
            </div>
            <div className="engage reveal">
              <div className="idx">02</div>
              <h3>The build</h3>
              <p className="span">Scoped engagement &middot; Implementation</p>
              <p>Strategy decks don&rsquo;t move numbers; systems do. I architect and implement the automations, the CRM, the attribution, the search strategy, hands on keyboard, alongside your team, and I don&rsquo;t leave until your people can run it without me.</p>
              <p className="outcome">Deliverable: working systems, adopted by your team</p>
            </div>
            <div className="engage reveal">
              <div className="idx">03</div>
              <h3>The advisory</h3>
              <p className="span">Standing counsel &middot; Ongoing</p>
              <p>For the operator who wants a bench. A standing line to someone who has held the P&amp;L, spent the budget, and built the machine, for the pricing call, the vendor negotiation, the hire, the &ldquo;is this AI thing real or noise&rdquo; question at 9 p.m.</p>
              <p className="outcome">Deliverable: an executive on call, not on payroll</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= THE DIFFERENCE (DARK) - trust peak ======= */}
      <section className="section difference dark" id="difference">
        <div className="wrap diff-grid">
          <div className="diff-copy reveal">
            <span className="microlabel">The consultant&rsquo;s difference</span>
            <h2>Most consultants read about it. <em>I&rsquo;ve run it.</em></h2>
            <p>There is no shortage of people who will sell you an AI strategy assembled from the same webinars you could have watched yourself. That&rsquo;s not what this is.</p>
            <p>I&rsquo;ve sat in the CMO seat with a <strong>$25M budget</strong> and answered for every dollar of it. I&rsquo;ve founded two companies on exactly these systems and <strong>sold both</strong>. And the automations I recommend aren&rsquo;t sketches on a whiteboard. <strong>I personally built them</strong>, node by node, prompt by prompt, in the platforms I&rsquo;m recommending.</p>
            <p className="pull">You get recommendations you can hold me to, because I&rsquo;ve held the bag.</p>
            <p>When I tell you a system will cut your cost per lead, it&rsquo;s because I&rsquo;ve watched it do that with my own money and my own quarter on the line. That&rsquo;s the difference between advice and counsel.</p>
          </div>
          <div className="receipts reveal">
            <div className="receipt"><span className="tag">Operator</span><h4>CMO, $25M budget</h4><p>Owned the full marketing P&amp;L across six brands, accountable for every dollar deployed and every dollar returned.</p></div>
            <div className="receipt"><span className="tag">Founder</span><h4>Two companies, two exits</h4><p>Built on the same systems I now install for clients, bootstrapped, scaled, and sold. The playbook has been paid for.</p></div>
            <div className="receipt"><span className="tag">Builder</span><h4>Hands on the keyboard</h4><p>The N8N pipelines, the prompt libraries, the CRM migrations, built personally, not delegated to a deck.</p></div>
          </div>
        </div>
      </section>

      {/* ======= TRUST-PEAK CTA (§1.4 - after "I've run it") ======= */}
      <section className="peak-cta">
        <div className="wrap reveal">
          <a className="btn btn-solid" href="/contact?type=consulting">Bring me the problem <span className="arr">&rarr;</span></a>
        </div>
      </section>

      {/* ======= WHAT I ACTUALLY BUILD ======= */}
      <section className="section" id="build">
        <div className="wrap">
          <div className="section-intro reveal">
            <span className="microlabel">Audits &amp; AI builds</span>
            <h2>Two offers, <em>kept separate</em></h2>
            <p>Audits find the problem: quantitative analysis of your raw platform data. AI is the build tool I use to fix it. Either way, every engagement ends in something that runs without me, not a deck about it. A sample of what&rsquo;s shipped.</p>
          </div>
          <div className="areas">
            <div className="area reveal">
              <div className="a-idx">B.01</div>
              <h3>Data &amp; platform audits</h3>
              <p className="a-sys">Google Search Console &middot; Google &amp; Microsoft PPC &middot; CallRail</p>
              <p>Quantitative audits built from raw source data, not somebody&rsquo;s summary report, line by line through your platforms and spend, with the math attached to every finding.</p>
            </div>
            <div className="area reveal">
              <div className="a-idx">B.02</div>
              <h3>Automation &amp; attribution flows</h3>
              <p className="a-sys">N8N &middot; Make &middot; Zapier</p>
              <p>Production workflows built node by node, lead routing, enrichment, and attribution flows like CallRail into your CRM, so every closed job traces back to the call that started it.</p>
            </div>
            <div className="area reveal">
              <div className="a-idx">B.03</div>
              <h3>Software &amp; dashboards</h3>
              <p className="a-sys">Custom software &middot; Live data</p>
              <p>Software and dashboards built with AI, like the capacity-planning dashboards ops teams check every morning: live numbers a scheduler can act on, not last month&rsquo;s export.</p>
            </div>
            <div className="area reveal">
              <div className="a-idx">B.04</div>
              <h3>Website &amp; CRM replication</h3>
              <p className="a-sys">End &ldquo;maintenance&rdquo; fees &middot; End subscriptions</p>
              <p>Paying monthly for a website you don&rsquo;t own or software you barely use? I rebuild the site so you own it outright, and replicate the CRM so the subscription ends. The fees stop; the asset stays.</p>
            </div>
            <div className="area reveal">
              <div className="a-idx">B.05</div>
              <h3>No-hands booking</h3>
              <p className="a-sys">Calendar integration &middot; Variable-based routing</p>
              <p>Booking that lands straight on the right salesperson&rsquo;s calendar, routed by territory, job type, or whatever variables you set. No coordinator, no callback, no hands.</p>
            </div>
            <div className="area reveal">
              <div className="a-idx">B.06</div>
              <h3>Commerce platforms</h3>
              <p className="a-sys">Storefront &middot; CRM &middot; Fulfillment &middot; Analytics</p>
              <p>Full commerce platforms built with AI, storefront, CRM, order and shipping operations, and the analytics to run all of it.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= TESTIMONIAL ======= */}
      <section className="section help">
        <div className="wrap">
          <div className="section-intro reveal" style={{ margin: "0 auto 48px", textAlign: "center" }}>
            <span className="microlabel">What partners say</span>
            <h2>From the people <em>who&rsquo;ve seen the work</em></h2>
          </div>
          <figure className="quote-solo reveal">
            <span className="qmark">&ldquo;</span>
            <blockquote>He is an expert in SEO, web design, digital marketing, and lead generation, and a fantastic leader. I can confidently attest to his outstanding capabilities.</blockquote>
            <div className="who"><div className="nm">Cherie Wicks</div><div className="rl">Digital Content Marketer, Cal-Am Properties</div></div>
          </figure>
        </div>
      </section>

      {/* ======= FINAL CTA ======= */}
      <section className="finale" id="contact">
        <div className="wrap reveal">
          <span className="microlabel">Let&rsquo;s talk</span>
          <h2>Bring me the problem. <em>I&rsquo;ll provide the solution.</em></h2>
          <p>Costs too high, leads too few, a stack that fights you, or an AI opportunity you can feel slipping past, tell me what&rsquo;s broken, and I&rsquo;ll tell you exactly what I&rsquo;d build.</p>
          <div className="fin-ctas"><a className="btn btn-gold" href="/contact?type=consulting">Get in Touch <span className="arr">&rarr;</span></a>
          <a className="btn btn-line cal-link" href="https://calendly.com/optimzedseo/30min" target="_blank" rel="noopener">Schedule a Call <span className="arr">&rarr;</span></a></div>
        </div>
      </section>
    </div>
  );
}
