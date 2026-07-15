import type { Metadata } from "next";

const TITLE = "Keynote Speaker - Marketing, AI & Competition | Bradley Griffin";
const DESCRIPTION =
  "Keynote speaker on market strategy, competition, and AI in marketing. Featured at the Land Investment Expo; televised statewide on PBS. Real numbers, real stories.";
const URL = "https://www.bradleygriffin.us/speaking";
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
const speakingJsonLd =
  '{"@context": "https://schema.org", "@graph": [{"@type": "Service", "name": "Keynote Speaking", "description": "Keynotes and sessions on market strategy, competition, AI in marketing operations, and decision-making under pressure.", "url": "https://www.bradleygriffin.us/speaking", "provider": {"@type": "Person", "@id": "https://www.bradleygriffin.us/#person", "name": "Bradley Griffin"}, "serviceType": "Keynote Speaking", "areaServed": "United States", "audience": {"@type": "Audience", "audienceType": "Event organizers and associations"}}, {"@type": "VideoObject", "name": "Atlanta Press Club Loudermilk-Young Debate Series - live statewide broadcast", "description": "Bradley Griffin in Georgia\'s most prominent debate series, broadcast statewide on GPB/PBS - live and unscripted.", "embedUrl": "https://www.youtube.com/embed/QSN7Ep8kbtI", "thumbnailUrl": "https://img.youtube.com/vi/QSN7Ep8kbtI/hqdefault.jpg", "uploadDate": "2018-05-15"}, {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.bradleygriffin.us/"}, {"@type": "ListItem", "position": 2, "name": "Keynotes & Speaking", "item": "https://www.bradleygriffin.us/speaking"}]}]}';

export default function SpeakingPage() {
  return (
    <div className="page-speaking">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: speakingJsonLd }} />

      {/* ======= HERO ======= */}
      <section className="hero" id="top">
        <div className="wrap">
          <span className="microlabel">Keynotes &amp; speaking</span>
          <h1>Rooms change when the speaker <em>has done it.</em></h1>
          <p className="lede">
            I talk about market strategy, competition, and AI &mdash; as an operator with <strong>two exits</strong>, a
            <strong> NASDAQ acquisition story</strong>, and the composure of a <strong>75th Ranger Regiment
            veteran</strong>. No recycled frameworks, no motivational filler. Just real decisions, real numbers,
            and what they cost.
          </p>
        </div>
      </section>

      {/* ======= SIGNATURE TOPICS ======= */}
      <section className="section topics-sec" id="topics">
        <div className="wrap">
          <div className="section-intro reveal">
            <span className="microlabel">Signature topics</span>
            <h2>Four talks, <em>zero platitudes.</em></h2>
            <p>Each keynote is built from operating experience, tuned to the room, and backed by numbers the audience can verify. Formats run from a 30-minute keynote to a half-day working session.</p>
          </div>
          <div className="topic-list">
            <div className="topic reveal">
              <span className="idx">01</span>
              <div>
                <h3>Buy or bury</h3>
                <p className="for">Competition &amp; market strategy</p>
                <p>Outpacing competition in markets where inventory and attention are scarce &mdash; the session behind a sell-out room at the Land Investment Expo. Who moves first, who pays for hesitation, and how to know which one you are.</p>
              </div>
            </div>
            <div className="topic reveal">
              <span className="idx">02</span>
              <div>
                <h3>Systems, not campaigns</h3>
                <p className="for">Growth architecture</p>
                <p>The growth architecture behind +490% inbound-call growth and +1,000% lead growth &mdash; attribution, operating cadence, and the machinery that keeps compounding after the applause ends.</p>
              </div>
            </div>
            <div className="topic reveal">
              <span className="idx">03</span>
              <div>
                <h3>AI as an operating model</h3>
                <p className="for">AI &amp; marketing operations</p>
                <p>What AI-native marketing operations actually look like &mdash; beyond the demo reel. Where automation cuts cost, where it compounds output, and where humans still win.</p>
              </div>
            </div>
            <div className="topic reveal">
              <span className="idx">04</span>
              <div>
                <h3>Decisions under pressure</h3>
                <p className="for">Leadership &amp; composure</p>
                <p>Mission planning and composure, from the 75th Ranger Regiment to the boardroom &mdash; how elite teams decide when the cost of being wrong is absolute.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= FEATURED VENUE 1 — LAND INVESTMENT EXPO ======= */}
      <section className="section" id="expo">
        <div className="wrap">
          <div className="section-intro reveal">
            <span className="microlabel">Featured venue</span>
            <h2>A sell-out room <em>in Des Moines.</em></h2>
          </div>
          <div className="feature reveal">
            <div className="feature-copy">
              <p className="where">Iowa Land Investment Expo &mdash; Des Moines, 2024</p>
              <h3>Navigating the land market: staying in front and outpacing competition</h3>
              <p>I was a featured speaker at one of agriculture&rsquo;s premier annual events &mdash; hosted by Peoples Company and running every year since 2008 &mdash; before a <strong>sell-out audience of land investors, agricultural professionals, and policy leaders</strong>.</p>
              <p>The session cut through a tightening market: how buyers stay in front when inventory and attention are both scarce, and why the operators who move decisively keep winning the ground the hesitant ones study.</p>
              <div className="feature-facts">
                <div className="fact"><span className="k">Event</span><span className="v">Land Investment Expo &mdash; hosted by Peoples Company, est. 2008</span></div>
                <div className="fact"><span className="k">Role</span><span className="v">Featured speaker</span></div>
                <div className="fact"><span className="k">Audience</span><span className="v">Sell-out &mdash; land investors, ag professionals, policy leaders</span></div>
              </div>
            </div>
            <div className="feature-quote">
              <span className="qmark">&ldquo;</span>
              <blockquote>Buy or bury. Act quickly and buy &mdash; <em>or delay, and get buried</em> by a competitor.</blockquote>
              <a className="srclink" href="https://www.americanfarmlandowner.com/post/beating-the-competition" target="_blank" rel="noopener">As covered by American Farmland Owner <span className="arr">&rarr;</span></a>
            </div>
          </div>
        </div>
      </section>

      {/* ======= FEATURED VENUE 2 — DEBATE (DARK) ======= */}
      <section className="section debate" id="debate">
        <div className="wrap">
          <div className="section-intro reveal">
            <span className="microlabel">Featured venue &mdash; broadcast</span>
            <h2>Live, statewide, <em>unscripted.</em></h2>
          </div>
          <div className="debate-grid">
            <div className="debate-copy reveal">
              <p className="where">Atlanta Press Club &mdash; GPB / PBS, 2018</p>
              <h3>Loudermilk-Young Debate Series</h3>
              <p>I was selected for Georgia&rsquo;s most prominent debate series &mdash; <strong>$1M-endowed and broadcast statewide on PBS</strong> &mdash; live and unscripted, questioned by the state&rsquo;s leading journalists.</p>
              <p>No teleprompter, no second take, no friendly moderator. Ninety minutes of live television is the purest stress test a speaker can face &mdash; and the tape is public.</p>
              <div className="debate-facts">
                <div className="fact"><span className="k">Broadcast</span><span className="v">Statewide &mdash; Georgia Public Broadcasting / PBS</span></div>
                <div className="fact"><span className="k">Format</span><span className="v">Live, unscripted, panel of leading journalists</span></div>
                <div className="fact"><span className="k">Series</span><span className="v">Loudermilk-Young Debates &mdash; $1M endowment</span></div>
              </div>
            </div>
            <div className="reveal">
              <div className="video-frame">
                <div className="video-inner">
                  <iframe src="https://www.youtube.com/embed/QSN7Ep8kbtI" title="Atlanta Press Club Debate — full broadcast" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                </div>
              </div>
              <p className="video-note"><span className="tick">/</span> Atlanta Press Club Debate &mdash; full broadcast, GPB / PBS</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= WHAT ORGANIZERS GET ======= */}
      <section className="section" id="organizers">
        <div className="wrap">
          <div className="section-intro reveal">
            <span className="microlabel">What organizers get</span>
            <h2>Booked to perform, <em>built to deliver.</em></h2>
          </div>
          <div className="gets">
            <div className="get reveal">
              <span className="kicker">A</span>
              <h3>Real numbers, not platitudes</h3>
              <p>+490% call volume, +1,000% leads, two successful exits &mdash; every claim on stage is a number the audience can check. The talk earns its keep with substance.</p>
            </div>
            <div className="get reveal">
              <span className="kicker">B</span>
              <h3>A story arc audiences remember</h3>
              <p>Ranger &rarr; founder &rarr; boardroom. An arc your attendees will retell at the reception &mdash; and cite in the post-event survey.</p>
            </div>
            <div className="get reveal">
              <span className="kicker">C</span>
              <h3>Zero-drama professional prep</h3>
              <p>Briefing calls kept, slides delivered on deadline, tech checks on time. Mission planning is the habit; your run-of-show is safe.</p>
            </div>
            <div className="get reveal">
              <span className="kicker">D</span>
              <h3>A Q&amp;A that doesn&rsquo;t rattle</h3>
              <p>Ninety minutes of live statewide television is the credential. Your toughest audience question won&rsquo;t be the toughest one I&rsquo;ve taken.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= FINAL CTA ======= */}
      <section className="book" id="book">
        <div className="wrap reveal">
          <span className="microlabel">Book the stage</span>
          <h2>Put a speaker on stage <em>who&rsquo;s held the bag.</em></h2>
          <p>Tell me about your event &mdash; the audience, the theme, the date &mdash; and I&rsquo;ll come back with a session built for the room, not a deck off the shelf.</p>
          <div className="fin-ctas"><a className="btn btn-solid" href="/contact?type=speaking">Get in Touch <span className="arr">&rarr;</span></a>
          <a className="btn btn-gold cal-link" href="https://calendly.com/optimzedseo/30min" target="_blank" rel="noopener">Schedule a Call <span className="arr">&rarr;</span></a></div>
        </div>
      </section>
    </div>
  );
}
