import type { Metadata } from "next";

const TITLE = "Case Studies - Documented Marketing Results | Bradley Griffin";
const DESCRIPTION =
  "Eight documented case studies: AcreValue's turnaround to a CoStar (NASDAQ) acquisition, +490% inbound calls at Vertex, a #1 region at Infinity Home Services, 1,000% at Roofing GR, and a full e-commerce, ERP, and CRM platform built for Griffin Opus.";
const URL = "https://www.bradleygriffin.us/case-studies";
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

/* JSON-LD: CollectionPage + ItemList (eight anchored cases) + BreadcrumbList.
   Vertex entry updated 2026-07-18, name de-branded to "Vertex" and booking
   metric reconciled to "16% to 59%" to match visible copy and /insights. */
const caseStudiesJsonLd =
  '{"@context": "https://schema.org", "@graph": [{"@type": "CollectionPage", "url": "https://www.bradleygriffin.us/case-studies", "name": "Case Studies - Bradley Griffin", "about": {"@type": "Person", "@id": "https://www.bradleygriffin.us/#person", "name": "Bradley Griffin"}, "mainEntity": {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "AcreValue / Ag Analytics - turnaround through a NASDAQ acquisition", "url": "https://www.bradleygriffin.us/case-studies#acrevalue"}, {"@type": "ListItem", "position": 2, "name": "Vertex - +490% inbound calls, 16% to 59% booking rate", "url": "https://www.bradleygriffin.us/case-studies#vertex"}, {"@type": "ListItem", "position": 3, "name": "Infinity Home Services - #1 performing Midwest region", "url": "https://www.bradleygriffin.us/case-studies#ihs"}, {"@type": "ListItem", "position": 4, "name": "Optimized - bootstrapped from one person to a successful exit", "url": "https://www.bradleygriffin.us/case-studies#optimized"}, {"@type": "ListItem", "position": 5, "name": "Optimized - ranked its own site to 100 keywords at Google #1, all 192 tracked terms in the top 10", "url": "https://www.bradleygriffin.us/case-studies#optimized-seo"}, {"@type": "ListItem", "position": 6, "name": "Roofing GR - 1,000% YoY lead generation", "url": "https://www.bradleygriffin.us/case-studies#roofinggr"}, {"@type": "ListItem", "position": 7, "name": "Wensco Sign Supply - +30% revenue, -35% marketing cost", "url": "https://www.bradleygriffin.us/case-studies#wensco"}, {"@type": "ListItem", "position": 8, "name": "Griffin Opus - a custom e-commerce, ERP, and CRM platform built end to end", "url": "https://www.bradleygriffin.us/case-studies#griffin-opus"}]}}, {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.bradleygriffin.us/"}, {"@type": "ListItem", "position": 2, "name": "Case Studies", "item": "https://www.bradleygriffin.us/case-studies"}]}]}';

export default function CaseStudiesPage() {
  return (
    <div className="c1 c1-cs">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: caseStudiesJsonLd }} />

      {/* ======= PAGE HERO + INDEX OF CASES ======= */}
      <section className="subhero" id="top">
        <div className="wrap">
          <span className="microlabel">The record</span>
          <h1>A few companies, and what actually <em>changed.</em></h1>
          <p className="lede">
            Eight case files, documented the way a diligence team would want them: the situation as I found it,
            the system I built, and what it returned. <strong>Every company is named. Every claim is dated.</strong>
            Where the receipts exist as screenshots, they&rsquo;re attached as exhibits.
          </p>
          <div className="reveal">
            <span className="microlabel ix-label">Index of cases</span>
            <div className="ix">
              <a className="ix-row" href="#acrevalue">
                <span className="n">01</span>
                <span className="m">Sold</span>
                <span className="t">The turnaround behind a NASDAQ acquisition</span>
                <span className="c">AcreValue / Ag Analytics · 2023–2024</span>
                <span className="a">&darr;</span>
              </a>
              <a className="ix-row" href="#vertex">
                <span className="n">02</span>
                <span className="m">+490%</span>
                <span className="t">Inbound calls up 490% in four months</span>
                <span className="c">Vertex · 2025</span>
                <span className="a">&darr;</span>
              </a>
              <a className="ix-row" href="#ihs">
                <span className="n">03</span>
                <span className="m">#1</span>
                <span className="t">The Midwest machine</span>
                <span className="c">Infinity Home Services · 2026–Present</span>
                <span className="a">&darr;</span>
              </a>
              <a className="ix-row" href="#optimized">
                <span className="n">04</span>
                <span className="m">Founded &amp; sold</span>
                <span className="t">Every seat, earned the hard way</span>
                <span className="c">Optimized · 2011–2018</span>
                <span className="a">&darr;</span>
              </a>
              <a className="ix-row" href="#optimized-seo">
                <span className="n">05</span>
                <span className="m">100 at #1</span>
                <span className="t">Beating the agencies at their own keywords</span>
                <span className="c">Optimized · 2011–2018</span>
                <span className="a">&darr;</span>
              </a>
              <a className="ix-row" href="#roofinggr">
                <span className="n">06</span>
                <span className="m">+1,000%</span>
                <span className="t">One thousand percent</span>
                <span className="c">Roofing GR · 2021–2024</span>
                <span className="a">&darr;</span>
              </a>
              <a className="ix-row" href="#wensco">
                <span className="n">07</span>
                <span className="m">+30%</span>
                <span className="t">The record quarter</span>
                <span className="c">Wensco Sign Supply · 2019–2021</span>
                <span className="a">&darr;</span>
              </a>
              <a className="ix-row" href="#griffin-opus">
                <span className="n">08</span>
                <span className="m">Built</span>
                <span className="t">Software I built, running a real business</span>
                <span className="c">Griffin Opus · 2026–Present</span>
                <span className="a">&darr;</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ======= CASE 01, ACREVALUE ======= */}
      <section className="section cs" id="acrevalue">
        <div className="wrap">
          <div className="reveal">
            <p className="microlabel cs-eyebrow">01, Case file · AcreValue</p>
            <div className="cs-headrow">
              <div className="cs-metric">Sold</div>
              <div>
                <h2>The turnaround behind a <em>NASDAQ acquisition</em></h2>
                <p className="cs-meta">
                  <span>AcreValue / Ag Analytics</span>
                  <span>Fractional CMO &amp; Head of Sales</span>
                  <span>2023–2024</span>
                </p>
              </div>
            </div>
          </div>
          <div className="cs-cols">
            <div className="cs-block reveal">
              <span className="microlabel">Context</span>
              <p>An ag-tech SaaS platform with <strong>1.5M+ registered users across 48 states</strong>, and recurring revenue that had declined two straight years. The product had reach; the business had no clear vision and no defensible positioning.</p>
              <div className="press-clip">
                <p className="pc-label">Exhibit, Press release</p>
                <p className="pc-src">CoStar Group, Inc. &middot; Investor Relations</p>
                <h3 className="pc-head">CoStar Group acquires Ag&#8209;Analytics, augmenting Land.com services and capabilities</h3>
                <p className="pc-date">February 14, 2025 &middot; NASDAQ: CSGP</p>
                <p className="pc-body">CoStar&rsquo;s announcement cites AcreValue&rsquo;s 1.5 million registered users and data on tens of millions of parcels, in a farm real-estate asset class the company sizes at $3.4&nbsp;trillion.</p>
                <a className="pc-link" href="https://investors.costargroup.com/news-releases/news-release-details/costar-group-acquires-ag-analytics-augmenting-landcom-services" target="_blank" rel="noopener">Read the release at investors.costargroup.com &rarr;</a>
              </div>
            </div>
            <div className="cs-block reveal">
              <span className="microlabel">What I built</span>
              <ul>
                <li><strong>Relearned the market firsthand</strong>, sat on client and sales calls before touching strategy.</li>
                <li><strong>Carried that intelligence to the development team</strong> and shipped the features the marketplace actually wanted.</li>
                <li><strong>Rebuilt the image, the website, and the value propositions</strong> around what the calls revealed.</li>
                <li><strong>Opened entirely new segments</strong>, including the energy sector.</li>
              </ul>
              <p style={{ marginTop: "20px" }}>One of the defining calls was with <strong>Duke Energy</strong>. They needed a way to evaluate greenfield and brownfield sites for energy development, proximity to transmission lines, surrounding infrastructure, overall plan viability, plus parcel-ownership records and a way to actually reach the landowners behind them.</p>
              <p>I carried that spec back to the development team and made the case for a <strong>visual data layer built around exactly those features</strong>. That build is the move that opened the energy-sector segment in the results below.</p>
            </div>
          </div>
          <div className="cs-results reveal">
            <span className="microlabel">Results</span>
            <div className="rgrid cols-4">
              <div className="rcell"><div className="num">Revenue <em>&uarr;</em></div><div className="lbl">Returned to growth after two years of decline</div></div>
              <div className="rcell"><div className="num">New</div><div className="lbl">Commercial segments opened, including energy</div></div>
              <div className="rcell"><div className="num">2024</div><div className="lbl">Featured speaker, Land Investment Expo · quoted in American Farmland Owner</div></div>
              <div className="rcell"><div className="num">Feb <em>2025</em></div><div className="lbl">Acquired by CoStar Group (NASDAQ: CSGP)</div></div>
            </div>
            <p className="cs-pull">The deal doesn&rsquo;t happen without the turnaround.</p>
          </div>
        </div>
      </section>

      {/* ======= CASE 02, VERTEX (dark) ======= */}
      <section className="section cs cs-dark" id="vertex">
        <div className="wrap">
          <div className="reveal">
            <p className="microlabel cs-eyebrow">02, Case file · Vertex</p>
            <div className="cs-headrow">
              <div className="cs-metric">+490%</div>
              <div>
                <h2>Rebuilding acquisition end-to-end</h2>
                <p className="cs-meta">
                  <span>Vertex</span>
                  <span>Chief Marketing Officer</span>
                  <span>2025</span>
                </p>
              </div>
            </div>
          </div>
          <div className="cs-cols">
            <div className="cs-block reveal">
              <span className="microlabel">Context</span>
              <p>A <strong>three-state home-services operation</strong> where the call center rolled up to me as CMO. My audits told an uncomfortable story: inbound volume was thin, the booking rate sat at <strong>16%</strong>, and acquisition leaned on outbound, lead aggregators and aged lists the sales floor had to chase.</p>
              <p>One more problem underneath all of it: <strong>the data couldn&rsquo;t be trusted enough to even report on.</strong> Before I could grow the numbers, I had to make them honest.</p>
            </div>
            <div className="cs-block reveal">
              <span className="microlabel">What I built</span>
              <ul>
                <li><strong>Outsourced the call center to AnswerForce</strong>, professional coverage on every ring, so demand stopped dying on hold.</li>
                <li><strong>Flipped the acquisition model from outbound to demand-driven inbound</strong>, Google Ads, Microsoft Ads, and Google Local Services Ads replaced the aggregators and aged leads.</li>
                <li><strong>Built automated booking that sent every inbound lead straight to sales</strong>, no manual entry, and migrated the CRM from Salesforce to Builder Prime, so every number below could be trusted.</li>
                <li><strong>Rewrote the inside sales scripts and inbound workflows</strong> around one metric: calls that become booked appointments.</li>
              </ul>
            </div>
          </div>
          <div className="cs-results reveal">
            <span className="microlabel">Results, Aug &rarr; Nov</span>
            <div className="rgrid cols-5">
              <div className="rcell"><div className="num">+490<em>%</em></div><div className="lbl">Inbound calls, 108 &rarr; 637</div></div>
              <div className="rcell"><div className="num">+269<em>%</em></div><div className="lbl">Booking rate, 16% &rarr; 59%</div></div>
              <div className="rcell"><div className="num">+212<em>%</em></div><div className="lbl">Appointments set, 26 &rarr; 81</div></div>
              <div className="rcell"><div className="num">+192<em>%</em></div><div className="lbl">Leads issued to sales, 26 &rarr; 76</div></div>
              <div className="rcell"><div className="num">+20<em>%</em></div><div className="lbl">Qualified leads, 178 &rarr; 213</div></div>
            </div>
            <p className="cs-pull">First you make the numbers honest. Then you make them move.</p>
          </div>
          <div className="exhibits reveal">
            <span className="microlabel">Exhibit, Inbound calls &amp; booking rate, Aug–Nov</span>
            <div className="exgroup">
              <div className="exframe">
                <svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Combined chart: inbound calls grew from 108 in August to 637 in November; booking rate rose from 16 percent in September to 59 percent in November">
                  {/* legend */}
                  <rect x="64" y="14" width="12" height="12" fill="var(--ink)"/>
                  <text x="84" y="25" fontSize="11" fontWeight="600" letterSpacing="1.5" fill="var(--ink)">INBOUND CALLS</text>
                  <line x1="224" y1="20" x2="252" y2="20" stroke="var(--bronze)" strokeWidth="2.5"/>
                  <circle cx="238" cy="20" r="3.5" fill="var(--bronze)"/>
                  <text x="260" y="25" fontSize="11" fontWeight="600" letterSpacing="1.5" fill="var(--ink)">BOOKING RATE (%)</text>
                  {/* gridlines */}
                  <line x1="64" y1="266.5" x2="696" y2="266.5" stroke="var(--line)" strokeWidth="1"/>
                  <line x1="64" y1="193" x2="696" y2="193" stroke="var(--line)" strokeWidth="1"/>
                  <line x1="64" y1="119.5" x2="696" y2="119.5" stroke="var(--line)" strokeWidth="1"/>
                  {/* left axis labels (calls) */}
                  <text x="56" y="344" fontSize="11" fill="var(--mute)" textAnchor="end">0</text>
                  <text x="56" y="270.5" fontSize="11" fill="var(--mute)" textAnchor="end">175</text>
                  <text x="56" y="197" fontSize="11" fill="var(--mute)" textAnchor="end">350</text>
                  <text x="56" y="123.5" fontSize="11" fill="var(--mute)" textAnchor="end">525</text>
                  <text x="56" y="50" fontSize="11" fill="var(--mute)" textAnchor="end">700</text>
                  {/* bars: inbound calls */}
                  <rect x="111" y="294.6" width="64" height="45.4" fill="var(--ink)" fillOpacity="0.45"/>
                  <rect x="269" y="233.7" width="64" height="106.3" fill="var(--ink)"/>
                  <rect x="427" y="163.2" width="64" height="176.8" fill="var(--ink)"/>
                  <rect x="585" y="72.5" width="64" height="267.5" fill="var(--ink)"/>
                  {/* bar value labels */}
                  <text x="143" y="288" fontSize="13" fontWeight="700" fill="var(--ink)" textAnchor="middle">108*</text>
                  <text x="301" y="252" fontSize="13" fontWeight="700" fill="var(--cream)" textAnchor="middle">253</text>
                  <text x="459" y="181.5" fontSize="13" fontWeight="700" fill="var(--cream)" textAnchor="middle">421</text>
                  <text x="617" y="91" fontSize="13" fontWeight="700" fill="var(--cream)" textAnchor="middle">637</text>
                  {/* booking rate line (Sep–Nov; Aug not reportable) */}
                  <polyline points="301,261.6 459,217.5 617,50.9" fill="none" stroke="var(--bronze)" strokeWidth="2.5"/>
                  <circle cx="301" cy="261.6" r="4.5" fill="var(--bronze)"/>
                  <circle cx="459" cy="217.5" r="4.5" fill="var(--bronze)"/>
                  <circle cx="617" cy="50.9" r="4.5" fill="var(--bronze)"/>
                  <text x="263" y="265.5" fontSize="12" fontWeight="700" fill="var(--bronze-deep)" textAnchor="end">16%</text>
                  <text x="421" y="221.5" fontSize="12" fontWeight="700" fill="var(--bronze-deep)" textAnchor="end">25%</text>
                  <text x="617" y="41" fontSize="12" fontWeight="700" fill="var(--bronze-deep)" textAnchor="middle">59%</text>
                  {/* ruled frame */}
                  <rect x="64" y="46" width="632" height="294" fill="none" stroke="var(--ink)" strokeWidth="1"/>
                  {/* month labels */}
                  <text x="143" y="364" fontSize="12" fontWeight="700" letterSpacing="2" fill="var(--ink)" textAnchor="middle">AUG*</text>
                  <text x="301" y="364" fontSize="12" fontWeight="700" letterSpacing="2" fill="var(--ink)" textAnchor="middle">SEP&dagger;</text>
                  <text x="459" y="364" fontSize="12" fontWeight="700" letterSpacing="2" fill="var(--ink)" textAnchor="middle">OCT</text>
                  <text x="617" y="364" fontSize="12" fontWeight="700" letterSpacing="2" fill="var(--ink)" textAnchor="middle">NOV</text>
                </svg>
              </div>
              <p className="excap"><span className="tick">Exhibit A</span>, Inbound calls (bars, left axis) &amp; booking rate (line), Aug &rarr; Nov</p>
              <p className="exnote">* August is mostly missing: pre-migration tracking couldn&rsquo;t be trusted, so August volume is understated and the booking rate isn&rsquo;t reportable. &dagger; September week 4 is absent entirely; it fell during the Salesforce &rarr; Builder Prime cutover. The gaps are reported as found. That&rsquo;s the point of the migration.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= CASE 03, IHS ======= */}
      <section className="section cs" id="ihs">
        <div className="wrap">
          <div className="reveal">
            <p className="microlabel cs-eyebrow">03, Case file · Infinity Home Services</p>
            <div className="cs-headrow">
              <div className="cs-metric">#1</div>
              <div>
                <h2>The Midwest machine</h2>
                <p className="cs-meta">
                  <span>Infinity Home Services</span>
                  <span>Regional Marketing Manager, Midwest</span>
                  <span>Feb 2026 – Present</span>
                </p>
              </div>
            </div>
          </div>
          <div className="cs-cols">
            <div className="cs-block reveal">
              <span className="microlabel">Context</span>
              <p>A <strong>national home-services platform</strong>. Full ownership of Midwest marketing, budget, channels, and a team of four.</p>
            </div>
            <div className="cs-block reveal">
              <span className="microlabel">The standing record</span>
              <p>This is the current engagement, so the numbers below are live and year-over-year. The exact figures stay in the boardroom while the engagement is live, but the shape is public: <strong>double-digit year-over-year sales growth</strong>, and the region now leads every other region in the company on performance.</p>
            </div>
          </div>
          <div className="cs-results reveal">
            <span className="microlabel">Results, Year over year</span>
            <div className="rgrid cols-4">
              <div className="rcell"><div className="num">2<em>×</em>digit</div><div className="lbl">YoY qualified-lead growth</div></div>
              <div className="rcell"><div className="num">2<em>×</em>digit</div><div className="lbl">YoY appointment growth</div></div>
              <div className="rcell"><div className="num">2<em>×</em>digit</div><div className="lbl">YoY sales growth</div></div>
              <div className="rcell"><div className="num"><em>#</em>1</div><div className="lbl">Performing region in the company</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= CASE 04, OPTIMIZED (dark) ======= */}
      <section className="section cs cs-dark" id="optimized">
        <div className="wrap">
          <div className="reveal">
            <p className="microlabel cs-eyebrow">04, Case file · Optimized</p>
            <div className="cs-headrow">
              <div className="cs-metric">Founded &amp; sold</div>
              <div>
                <h2>Every seat, earned the hard way</h2>
                <p className="cs-meta">
                  <span>Optimized</span>
                  <span>Founder &amp; President</span>
                  <span>2011–2018</span>
                </p>
              </div>
            </div>
          </div>
          <div className="cs-cols">
            <div className="cs-block reveal">
              <span className="microlabel">Context</span>
              <p>Founded as a team of <strong>one</strong>. Sales by day, cold calls, pipeline, contracts. Delivery by night, SEO, PPC, social, web builds. Every seat in the org chart, held first by me.</p>
            </div>
            <div className="cs-block reveal">
              <span className="microlabel">What it became</span>
              <ul>
                <li><strong>23 employees</strong> across seven satellite offices spanning the continental U.S.</li>
                <li><strong>$5M in annual revenue</strong>, built without outside capital.</li>
                <li><strong>A client roster spanning 10+ industries</strong>, with Fortune 500 names among them, medical and private practice, SaaS, manufacturing, aerospace, automotive, e-commerce, food &amp; beverage, travel &amp; hospitality, legal, and real estate &amp; brokerages.</li>
                <li><strong>A successful exit</strong>, acquired by an equity firm expanding its US book of business. The breadth and caliber of the client roster were core drivers of the deal.</li>
              </ul>
            </div>
          </div>
          <div className="cs-results reveal">
            <span className="microlabel">Results</span>
            <div className="rgrid cols-5">
              <div className="rcell"><div className="num">23</div><div className="lbl">Employees at peak</div></div>
              <div className="rcell"><div className="num">$5M</div><div className="lbl">Annual revenue</div></div>
              <div className="rcell"><div className="num">7</div><div className="lbl">Satellite offices, continental U.S.</div></div>
              <div className="rcell"><div className="num">10<em>+</em></div><div className="lbl">Industries served</div></div>
              <div className="rcell"><div className="num">Sold</div><div className="lbl">Acquired by an equity firm</div></div>
            </div>
            <p className="cs-pull">I&rsquo;ve held every role I now hire for. And the best proof of the work is what clients did next: Clint Hoppes came to Optimized as a customer, and later chose me as his business partner at Roofing GR.</p>
          </div>
        </div>
      </section>

      {/* ======= CASE 05, OPTIMIZED SEO (companion proof to case 04) ======= */}
      <section className="section cs" id="optimized-seo">
        <div className="wrap">
          <div className="reveal">
            <p className="microlabel cs-eyebrow">05, Case file · Optimized</p>
            <div className="cs-headrow">
              <div className="cs-metric">100 at #1</div>
              <div>
                <h2>Beating the agencies at their own <em>keywords</em></h2>
                <p className="cs-meta">
                  <span>Optimized</span>
                  <span>Founder &amp; President</span>
                  <span>2011–2018</span>
                </p>
              </div>
            </div>
          </div>
          <div className="cs-cols">
            <div className="cs-block reveal">
              <span className="microlabel">Context</span>
              <p>Optimized sold SEO for a living. So the toughest account we ever ranked wasn&rsquo;t a client. It was our own front door.</p>
              <p>The keywords that sell SEO are the ones every SEO agency fights over. &ldquo;seo consultant.&rdquo; &ldquo;best seo agency.&rdquo; &ldquo;seo expert.&rdquo; Whoever owns those words owns the market. The people selling the service were losing those exact words to us.</p>
            </div>
            <div className="cs-block reveal">
              <span className="microlabel">What it proved</span>
              <ul>
                <li><strong>Ranked our own site at the top of the industry&rsquo;s own terms.</strong> 100 keywords sat at Google rank #1. All 192 terms we tracked sat in the top ten. Every one an SEO-buyer term, in our market.</li>
                <li><strong>The proof was the product.</strong> A prospect could search &ldquo;best seo agency,&rdquo; find us at the top, and watch the service working before the first call.</li>
                <li><strong>Then we did the same for clients,</strong> on the terms that sell their business, not ours.</li>
              </ul>
              <p style={{ marginTop: "20px" }}>Take a butcher shop and meat market. Not a niche long-tail play. The real commercial head terms, tens of thousands of searches a month behind them. Most started unranked. We took them to the front page, several to the top spot.</p>
            </div>
          </div>
          <div className="cs-results reveal">
            <span className="microlabel">Results, Optimized&rsquo;s own site</span>
            <div className="rgrid cols-4">
              <div className="rcell"><div className="num">100</div><div className="lbl">Keywords at Google rank #1</div></div>
              <div className="rcell"><div className="num">192</div><div className="lbl">Tracked terms, all in the top 10</div></div>
              <div className="rcell"><div className="num"><em>#</em>1</div><div className="lbl">On the terms that sell SEO</div></div>
              <div className="rcell"><div className="num">Own site</div><div className="lbl">Ranked against every agency in the market</div></div>
            </div>
            <p className="cs-pull">The hardest SEO to win is SEO itself. I won it on our own site, against every agency selling the same thing, then did it for clients on the words that pay their bills. This is the receipt behind every ranking claim on this site.</p>
          </div>
          <div className="exhibits reveal">
            <span className="microlabel">Exhibits, Own-domain rankings and client head terms</span>
            <div className="exgroup">
              <div className="exframe">
                <svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Optimized's own domain ranked 100 keywords at Google position 1, with all 192 tracked SEO-industry terms in the top 10, ranked against every competing agency in its market">
                  {/* header */}
                  <text x="64" y="24" fontSize="11" fontWeight="600" letterSpacing="1.5" fill="var(--ink)">OPTIMIZED &#183; OWN DOMAIN, SEO-INDUSTRY TERMS</text>
                  <text x="696" y="24" fontSize="11" fontWeight="600" letterSpacing="1.5" fill="var(--mute)" textAnchor="end">RANKED IN ITS MARKET</text>
                  {/* ruled frame */}
                  <rect x="64" y="46" width="632" height="294" fill="none" stroke="var(--ink)" strokeWidth="1"/>
                  {/* big headline numeral */}
                  <text x="96" y="214" fontSize="150" fontWeight="800" letterSpacing="-5" fill="var(--ink)">100</text>
                  <text x="100" y="248" fontSize="13" fontWeight="700" letterSpacing="1.2" fill="var(--bronze-deep)">KEYWORDS AT GOOGLE RANK #1</text>
                  <text x="100" y="274" fontSize="12.5" fontWeight="600" letterSpacing="0.5" fill="var(--ink)">192 TRACKED TERMS, ALL IN THE TOP 10</text>
                  {/* rank ladder, right */}
                  <text x="561" y="80" fontSize="10" fontWeight="700" letterSpacing="1.5" fill="var(--mute)" textAnchor="middle">RANK POSITION</text>
                  {/* rank-1 highlight band + dense cluster */}
                  <rect x="452" y="91" width="224" height="14" fill="var(--bronze)" fillOpacity="0.10"/>
                  <line x1="452" y1="98" x2="676" y2="98" stroke="var(--bronze)" strokeWidth="2.4"/>
                  <text x="440" y="101.5" fontSize="10.5" fill="var(--mute)" textAnchor="end">1</text>
                  <circle cx="460" cy="98" r="2.4" fill="var(--bronze)"/><circle cx="472" cy="98" r="2.4" fill="var(--bronze)"/><circle cx="484" cy="98" r="2.4" fill="var(--bronze)"/><circle cx="496" cy="98" r="2.4" fill="var(--bronze)"/><circle cx="508" cy="98" r="2.4" fill="var(--bronze)"/><circle cx="520" cy="98" r="2.4" fill="var(--bronze)"/><circle cx="532" cy="98" r="2.4" fill="var(--bronze)"/><circle cx="544" cy="98" r="2.4" fill="var(--bronze)"/><circle cx="556" cy="98" r="2.4" fill="var(--bronze)"/><circle cx="568" cy="98" r="2.4" fill="var(--bronze)"/><circle cx="580" cy="98" r="2.4" fill="var(--bronze)"/><circle cx="592" cy="98" r="2.4" fill="var(--bronze)"/><circle cx="604" cy="98" r="2.4" fill="var(--bronze)"/><circle cx="616" cy="98" r="2.4" fill="var(--bronze)"/><circle cx="628" cy="98" r="2.4" fill="var(--bronze)"/><circle cx="640" cy="98" r="2.4" fill="var(--bronze)"/><circle cx="652" cy="98" r="2.4" fill="var(--bronze)"/><circle cx="664" cy="98" r="2.4" fill="var(--bronze)"/>
                  {/* ranks 2-10, faint */}
                  <line x1="452" y1="115" x2="676" y2="115" stroke="var(--line)" strokeWidth="1"/><text x="440" y="118.5" fontSize="10.5" fill="var(--mute)" textAnchor="end">2</text>
                  <line x1="452" y1="132" x2="676" y2="132" stroke="var(--line)" strokeWidth="1"/><text x="440" y="135.5" fontSize="10.5" fill="var(--mute)" textAnchor="end">3</text>
                  <line x1="452" y1="149" x2="676" y2="149" stroke="var(--line)" strokeWidth="1"/><text x="440" y="152.5" fontSize="10.5" fill="var(--mute)" textAnchor="end">4</text>
                  <line x1="452" y1="166" x2="676" y2="166" stroke="var(--line)" strokeWidth="1"/><text x="440" y="169.5" fontSize="10.5" fill="var(--mute)" textAnchor="end">5</text>
                  <line x1="452" y1="183" x2="676" y2="183" stroke="var(--line)" strokeWidth="1"/><text x="440" y="186.5" fontSize="10.5" fill="var(--mute)" textAnchor="end">6</text>
                  <line x1="452" y1="200" x2="676" y2="200" stroke="var(--line)" strokeWidth="1"/><text x="440" y="203.5" fontSize="10.5" fill="var(--mute)" textAnchor="end">7</text>
                  <line x1="452" y1="217" x2="676" y2="217" stroke="var(--line)" strokeWidth="1"/><text x="440" y="220.5" fontSize="10.5" fill="var(--mute)" textAnchor="end">8</text>
                  <line x1="452" y1="234" x2="676" y2="234" stroke="var(--line)" strokeWidth="1"/><text x="440" y="237.5" fontSize="10.5" fill="var(--mute)" textAnchor="end">9</text>
                  <line x1="452" y1="251" x2="676" y2="251" stroke="var(--line)" strokeWidth="1"/><text x="437" y="254.5" fontSize="10.5" fill="var(--mute)" textAnchor="end">10</text>
                  <text x="564" y="275" fontSize="10" fontWeight="600" letterSpacing="0.6" fill="var(--mute)" textAnchor="middle">vs. EVERY AGENCY IN THE MARKET</text>
                  {/* term-class chip strip */}
                  <rect x="80" y="300" width="120" height="26" rx="13" ry="13" fill="none" stroke="var(--bronze)" strokeWidth="1" strokeOpacity="0.7"/>
                  <text x="140" y="317" fontSize="12" fontWeight="600" letterSpacing="0.3" fill="var(--ink)" textAnchor="middle">seo consultant</text>
                  <rect x="210" y="300" width="128" height="26" rx="13" ry="13" fill="none" stroke="var(--bronze)" strokeWidth="1" strokeOpacity="0.7"/>
                  <text x="274" y="317" fontSize="12" fontWeight="600" letterSpacing="0.3" fill="var(--ink)" textAnchor="middle">best seo agency</text>
                  <rect x="348" y="300" width="98" height="26" rx="13" ry="13" fill="none" stroke="var(--bronze)" strokeWidth="1" strokeOpacity="0.7"/>
                  <text x="397" y="317" fontSize="12" fontWeight="600" letterSpacing="0.3" fill="var(--ink)" textAnchor="middle">seo expert</text>
                  <rect x="456" y="300" width="116" height="26" rx="13" ry="13" fill="none" stroke="var(--bronze)" strokeWidth="1" strokeOpacity="0.7"/>
                  <text x="514" y="317" fontSize="12" fontWeight="600" letterSpacing="0.3" fill="var(--ink)" textAnchor="middle">seo company</text>
                </svg>
              </div>
              <p className="excap"><span className="tick">Exhibit A</span>, Optimized&rsquo;s own domain, ranking positions for SEO-industry terms in its market</p>
              <p className="exnote">Redrawn from the original rank tracking. The agency ranked its own site at the top of the words that sell the service, against every competitor selling the same thing.</p>
            </div>
            <div className="exgroup">
              <div className="doc-exhibit">
                <p className="pc-label">Exhibit, Client SEO report</p>
                <div className="de-meta">
                  <p><span>Client</span>Butcher shop &amp; meat market (name redacted)</p>
                  <p><span>Report</span>Commercial head-term rankings</p>
                </div>
                <p className="de-tablehead">Commercial head terms, monthly search volume and ranking result</p>
                <table className="de-table">
                  <thead><tr><th></th><th>Term</th><th>Monthly searches</th><th>Result</th><th>Move</th></tr></thead>
                  <tbody>
                    <tr><td></td><td>meat market</td><td>27,100</td><td>#1</td><td>Entered</td></tr>
                    <tr><td></td><td>butcher shop</td><td>14,800</td><td>#1</td><td>Entered</td></tr>
                    <tr className="hit"><td className="tick-cell">/</td><td>meat</td><td>74,000</td><td>#2</td><td>+13</td></tr>
                    <tr><td></td><td>butcher</td><td>40,500</td><td>#4</td><td>Entered</td></tr>
                  </tbody>
                </table>
                <p className="de-verdict"><strong>Local-intent terms climbed as much as +89 positions.</strong> Retyped as reported: <span className="tick">+89</span> &lsquo;local butcher,&rsquo; <span className="tick">+77</span> &lsquo;the local butcher shop,&rsquo; <span className="tick">+71</span> &lsquo;local meat market.&rsquo;</p>
              </div>
              <p className="excap"><span className="tick">Exhibit B</span>, Client ranking gains on commercial head terms, retyped from the original SEO report; client name redacted</p>
              <p className="exnote">The volumes are the point. These aren&rsquo;t long-tail scraps. They&rsquo;re the words the whole category competes for, taken from nowhere to the front page.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= CASE 06, ROOFING GR (dark) ======= */}
      <section className="section cs cs-dark" id="roofinggr">
        <div className="wrap">
          <div className="reveal">
            <p className="microlabel cs-eyebrow">06, Case file · Roofing GR</p>
            <div className="cs-headrow">
              <div className="cs-metric">+1,000%</div>
              <div>
                <h2>One thousand percent</h2>
                <p className="cs-meta">
                  <span>Roofing GR</span>
                  <span>Marketing Director</span>
                  <span>2021–2024</span>
                </p>
              </div>
            </div>
          </div>
          <div className="cs-cols">
            <div className="cs-block reveal">
              <span className="microlabel">Context</span>
              <p>A <strong>West Michigan roofing company</strong>. Full ownership of demand generation and inside sales, the entire funnel, first click to signed contract.</p>
            </div>
            <div className="cs-block reveal">
              <span className="microlabel">What I built</span>
              <ul>
                <li><strong>Advanced geotargeting and lead generation</strong> across search and local channels.</li>
                <li><strong>Marketing automation on N8N, Make, and Zapier</strong>, routing, enrichment, and follow-up without added headcount.</li>
                <li><strong>Attribution and lifecycle email</strong> tied to behavioral triggers.</li>
              </ul>
            </div>
          </div>
          <div className="cs-results reveal">
            <span className="microlabel">Results</span>
            <div className="rgrid cols-3">
              <div className="rcell"><div className="num">+1,000<em>%</em></div><div className="lbl">YoY lead generation</div></div>
              <div className="rcell"><div className="num">Costs <em>&darr;</em></div><div className="lbl">Operational costs decreased while volume grew</div></div>
              <div className="rcell"><div className="num">Cycle <em>&darr;</em></div><div className="lbl">Sales cycles shortened</div></div>
            </div>
          </div>
          <div className="exhibits reveal">
            <span className="microlabel">Exhibit, Organic clicks, first 12 months of a new domain</span>
            <div className="exgroup">
              <div className="exframe">
                <svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Line chart of weekly organic clicks for a new website, June 2023 to June 2024: near zero for six months, then a compounding climb to a peak of 13">
                  {/* headline figures */}
                  <rect x="64" y="12" width="10" height="10" fill="var(--bronze)"/>
                  <text x="82" y="21" fontSize="11" fontWeight="600" letterSpacing="1.5" fill="var(--ink)">ORGANIC CLICKS / WK</text>
                  <text x="696" y="21" fontSize="11" fontWeight="600" letterSpacing="1.5" fill="var(--mute)" textAnchor="end">426 CLICKS &#183; 469K IMPRESSIONS &#183; 12 MONTHS</text>
                  {/* gridlines */}
                  <line x1="64" y1="242" x2="696" y2="242" stroke="var(--line)" strokeWidth="1"/>
                  <line x1="64" y1="144" x2="696" y2="144" stroke="var(--line)" strokeWidth="1"/>
                  {/* y labels */}
                  <text x="56" y="344" fontSize="11" fill="var(--mute)" textAnchor="end">0</text>
                  <text x="56" y="246" fontSize="11" fill="var(--mute)" textAnchor="end">5</text>
                  <text x="56" y="148" fontSize="11" fill="var(--mute)" textAnchor="end">10</text>
                  <text x="56" y="50" fontSize="11" fill="var(--mute)" textAnchor="end">15</text>
                  {/* indexing period annotation */}
                  <line x1="216" y1="46" x2="216" y2="340" stroke="var(--line)" strokeWidth="1" strokeDasharray="4 5"/>
                  <text x="208" y="66" fontSize="10.5" fontWeight="600" letterSpacing="1" fill="var(--mute)" textAnchor="end">SITE INDEXING &#8594;</text>
                  {/* area + line */}
                  <polygon points="70.0,340 70.0,340.0 81.9,320.4 93.8,340.0 105.8,340.0 117.7,340.0 129.6,340.0 141.5,340.0 153.5,340.0 165.4,340.0 177.3,340.0 189.2,340.0 201.2,340.0 213.1,340.0 225.0,340.0 236.9,300.8 248.8,340.0 260.8,300.8 272.7,340.0 284.6,340.0 296.5,340.0 308.5,340.0 320.4,340.0 332.3,340.0 344.2,320.4 356.2,340.0 368.1,320.4 380.0,300.8 391.9,320.4 403.8,281.2 415.8,320.4 427.7,261.6 439.6,300.8 451.5,242.0 463.5,300.8 475.4,281.2 487.3,242.0 499.2,300.8 511.2,222.4 523.1,261.6 535.0,202.8 546.9,281.2 558.8,183.2 570.8,242.0 582.7,144.0 594.6,222.4 606.5,163.6 618.5,104.8 630.4,202.8 642.3,144.0 654.2,183.2 666.2,85.2 678.1,222.4 690.0,85.2 690.0,340" fill="var(--bronze)" fillOpacity="0.09"/>
                  <polyline points="70.0,340.0 81.9,320.4 93.8,340.0 105.8,340.0 117.7,340.0 129.6,340.0 141.5,340.0 153.5,340.0 165.4,340.0 177.3,340.0 189.2,340.0 201.2,340.0 213.1,340.0 225.0,340.0 236.9,300.8 248.8,340.0 260.8,300.8 272.7,340.0 284.6,340.0 296.5,340.0 308.5,340.0 320.4,340.0 332.3,340.0 344.2,320.4 356.2,340.0 368.1,320.4 380.0,300.8 391.9,320.4 403.8,281.2 415.8,320.4 427.7,261.6 439.6,300.8 451.5,242.0 463.5,300.8 475.4,281.2 487.3,242.0 499.2,300.8 511.2,222.4 523.1,261.6 535.0,202.8 546.9,281.2 558.8,183.2 570.8,242.0 582.7,144.0 594.6,222.4 606.5,163.6 618.5,104.8 630.4,202.8 642.3,144.0 654.2,183.2 666.2,85.2 678.1,222.4 690.0,85.2" fill="none" stroke="var(--bronze)" strokeWidth="2.25" strokeLinejoin="round"/>
                  {/* ruled frame */}
                  <rect x="64" y="46" width="632" height="294" fill="none" stroke="var(--ink)" strokeWidth="1"/>
                  {/* x labels */}
                  <text x="70" y="364" fontSize="12" fontWeight="700" letterSpacing="2" fill="var(--ink)">JUN &rsquo;23</text>
                  <text x="225" y="364" fontSize="12" fontWeight="700" letterSpacing="2" fill="var(--ink)" textAnchor="middle">SEP &rsquo;23</text>
                  <text x="380" y="364" fontSize="12" fontWeight="700" letterSpacing="2" fill="var(--ink)" textAnchor="middle">DEC &rsquo;23</text>
                  <text x="535" y="364" fontSize="12" fontWeight="700" letterSpacing="2" fill="var(--ink)" textAnchor="middle">MAR &rsquo;24</text>
                  <text x="690" y="364" fontSize="12" fontWeight="700" letterSpacing="2" fill="var(--ink)" textAnchor="end">JUN &rsquo;24</text>
                </svg>
              </div>
              <p className="excap"><span className="tick">Exhibit A</span>, Weekly organic clicks, brand-new domain, June 2023 &rarr; June 2024</p>
              <p className="exnote">Redrawn from the original Google Search Console report. The shape is the story: roughly six months of near-zero while a brand-new domain indexed and the content library was built, then a compounding climb as rankings landed, out-competing established brands for position, clicks, and organic leads. Headline totals as reported: 426 clicks on 469K impressions in the first twelve months.</p>
            </div>
            <div className="rev-exhibit">
              <div className="rev-head">
                <span className="rev-score">5.0</span>
                <span className="rev-stars" aria-label="5 out of 5 stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                <span className="rev-count">18 Google reviews &middot; Roofing GR</span>
              </div>
              <div className="rev-grid">
                <div className="rev-card">
                  <p>&ldquo;Quick to reply to my request for quote. Scheduling had a few hiccups, but Brad kept me informed about what was going on. All work completed to my satisfaction.&rdquo;</p>
                  <span className="rev-who">Linda Havens &middot; Google review</span>
                </div>
                <div className="rev-card">
                  <p>&ldquo;Quality work from a company who values ethics and reliability. Easy to work with, highly recommend.&rdquo;</p>
                  <span className="rev-who">Tina Eckert &middot; Google review</span>
                </div>
                <div className="rev-card">
                  <p>&ldquo;I had a customer needing a roof repair and they took great care of the customer and had great communication with all the parties involved.&rdquo;</p>
                  <span className="rev-who">Kevin Shettler &middot; Google review</span>
                </div>
              </div>
              <p className="excap"><span className="tick">Exhibit B</span>, Google Business Profile, Roofing GR</p>
              <p className="exnote">Transcribed from the live Google listing, a 5.0 rating across 18 reviews. The marketing filled the calendar; the operation earned the stars.</p>
            </div>
            <blockquote className="cs-pull">&ldquo;Within the first quarter of his leadership, we saw a 35% increase in qualified leads and a record-setting month in terms of booked jobs.&rdquo;<span className="src">Clint Hoppes, CEO, Roofing GR</span></blockquote>
          </div>

        </div>
      </section>

      {/* ======= CASE 07, WENSCO ======= */}
      <section className="section cs" id="wensco">
        <div className="wrap">
          <div className="reveal">
            <p className="microlabel cs-eyebrow">07, Case file · Wensco Sign Supply</p>
            <div className="cs-headrow">
              <div className="cs-metric">+30%</div>
              <div>
                <h2>The record quarter</h2>
                <p className="cs-meta">
                  <span>Wensco Sign Supply</span>
                  <span>Head of Marketing</span>
                  <span>2019–2021</span>
                </p>
              </div>
            </div>
          </div>
          <div className="cs-cols">
            <div className="cs-block reveal">
              <span className="microlabel">Context</span>
              <p>An <strong>87-year-old wholesale distributor</strong>, 100+ employees, $30M+ in revenue, with a legacy digital footprint that undersold the operation behind it.</p>
            </div>
            <div className="cs-block reveal">
              <span className="microlabel">What I built</span>
              <ul>
                <li><strong>Managed a $1M+ marketing budget</strong> and cut marketing costs 35% while output grew.</li>
                <li><strong>Overhauled a 20,000+ page website</strong>, the platform behind the online sales gains below.</li>
                <li><strong>Scaled customer engagement</strong> to 10,000+ interactions per month.</li>
              </ul>
            </div>
          </div>
          <div className="cs-results reveal">
            <span className="microlabel">Results</span>
            <div className="rgrid cols-4">
              <div className="rcell"><div className="num">&minus;35<em>%</em></div><div className="lbl">Marketing costs, on a $1M+ budget</div></div>
              <div className="rcell"><div className="num">+30<em>%</em></div><div className="lbl">Total sales revenue</div></div>
              <div className="rcell"><div className="num">+40<em>%</em></div><div className="lbl">Online sales after 20,000+ page overhaul</div></div>
              <div className="rcell"><div className="num">10K<em>+</em></div><div className="lbl">Monthly customer engagements</div></div>
            </div>
          </div>
          <div className="exhibits reveal">
            <span className="microlabel">Exhibit, Internal email, Office of the CFO</span>
            <div className="exgroup">
              <div className="doc-exhibit">
                <p className="pc-label">Exhibit, Internal email</p>
                <div className="de-meta">
                  <p><span>From</span>Office of the Chief Financial Officer, Wensco Sign Supply</p>
                  <p><span>Subject</span>Web Orders</p>
                </div>
                <p className="de-line">&ldquo;There were 256 web orders placed yesterday. These orders represented 56% of the total number of orders entered for the day, and 42.7% of the total dollar value for the day.&rdquo;</p>
                <p className="de-tablehead">Top 10 single-day web order records, 14 years of company data (Feb 2007 &rarr; Apr 2021)</p>
                <table className="de-table">
                  <thead><tr><th></th><th>Date</th><th>Orders</th><th>Ext. price</th></tr></thead>
                  <tbody>
                    <tr><td></td><td>Aug 13, 2019</td><td>261</td><td>$85,311</td></tr>
                    <tr className="hit"><td className="tick-cell">/</td><td>Apr 26, 2021</td><td>256</td><td>$88,071</td></tr>
                    <tr><td></td><td>Sep 4, 2018</td><td>251</td><td>$101,425</td></tr>
                    <tr className="hit"><td className="tick-cell">/</td><td>Sep 10, 2019</td><td>245</td><td>$87,177</td></tr>
                    <tr className="hit"><td className="tick-cell">/</td><td>Apr 13, 2021</td><td>243</td><td>$95,673</td></tr>
                    <tr><td></td><td>Jun 4, 2019</td><td>239</td><td>$91,357</td></tr>
                    <tr className="hit"><td className="tick-cell">/</td><td>Apr 20, 2021</td><td>238</td><td>$82,733</td></tr>
                    <tr><td></td><td>May 30, 2018</td><td>236</td><td>$77,348</td></tr>
                    <tr className="hit"><td className="tick-cell">/</td><td>Apr 19, 2021</td><td>235</td><td>$97,772</td></tr>
                    <tr className="hit"><td className="tick-cell">/</td><td>Sep 9, 2020</td><td>235</td><td>$77,961</td></tr>
                  </tbody>
                </table>
                <p className="de-verdict"><span className="tick">/</span> = during his tenure as Head of Marketing. <strong>Six of the ten biggest web-order days in fourteen years of company history happened in his twenty months.</strong></p>
              </div>
              <p className="excap"><span className="tick">Exhibit A</span>, Retyped from the CFO&rsquo;s internal email; sender identity redacted, figures as reported</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= CASE 08, GRIFFIN OPUS (dark) ======= */}
      <section className="section cs cs-dark" id="griffin-opus">
        <div className="wrap">
          <div className="reveal">
            <p className="microlabel cs-eyebrow">08, Case file · Griffin Opus</p>
            <div className="cs-headrow">
              <div className="cs-metric">Built</div>
              <div>
                <h2>A whole business, on <em>software I built</em></h2>
                <p className="cs-meta">
                  <span>Griffin Opus</span>
                  <span>Platform build, e-commerce, ERP &amp; CRM</span>
                  <span>2026–Present</span>
                </p>
              </div>
            </div>
          </div>
          <div className="cs-cols">
            <div className="cs-block reveal">
              <span className="microlabel">Context</span>
              <p>Griffin Opus is a <strong>direct-to-consumer paper-goods brand</strong> my wife founded and runs. It needed to operate on real software, not a stack of monthly subscriptions that own your data and raise the rent every year. So I built the software myself.</p>
              <p>This is the AI-assisted build work I do for clients, proven on a business that runs on it every day. Not a demo, not a prototype, a live storefront taking real orders.</p>
            </div>
            <div className="cs-block reveal">
              <span className="microlabel">What I built</span>
              <ul>
                <li><strong>A custom e-commerce storefront</strong>, the entire buying experience, coded and owned outright, with no platform fees skimming every sale.</li>
                <li><strong>An admin and ERP</strong>, inventory and landed-cost model, purchasing and POs, reorder logic, shipping and returns, and a full stock audit log.</li>
                <li><strong>A CRM</strong>, customers, orders, and lifecycle in one owned system instead of a rented tool with a per-seat bill.</li>
                <li><strong>Shipping and label automation</strong>, rating, labels, and fulfillment wired straight into the admin, so orders move without hand-keying.</li>
              </ul>
            </div>
          </div>
          <div className="cs-results reveal">
            <span className="microlabel">What it proves</span>
            <div className="rgrid cols-4">
              <div className="rcell"><div className="num">Owned</div><div className="lbl">No SaaS subscriptions, no platform lock-in</div></div>
              <div className="rcell"><div className="num">Full&#8209;stack</div><div className="lbl">Storefront, admin, ERP, CRM, and fulfillment</div></div>
              <div className="rcell"><div className="num">Live</div><div className="lbl">A real operating DTC business, not a demo</div></div>
              <div className="rcell"><div className="num">AI&#8209;built</div><div className="lbl">Designed and coded end to end, AI-assisted</div></div>
            </div>
            <p className="cs-pull">The best proof I can build software you own is the software I already built.</p>
          </div>
        </div>
      </section>

      {/* ======= FINAL CTA ======= */}
      <section className="finale">
        <div className="wrap reveal">
          <span className="microlabel">Start a conversation</span>
          <h2>The next case file <em>could be yours.</em></h2>
          <p>Every engagement above started the same way: a conversation about what the numbers should look like and weren&rsquo;t. Tell me what you&rsquo;re building, and I&rsquo;ll tell you how I&rsquo;d grow it.</p>
          <div className="fin-ctas"><a className="btn btn-gold" href="/contact">Get in Touch <span className="arr">&rarr;</span></a>
          <a className="btn btn-line cal-link" href="https://calendly.com/optimzedseo/30min" target="_blank" rel="noopener">Schedule a Call <span className="arr">&rarr;</span></a></div>
        </div>
      </section>
    </div>
  );
}
