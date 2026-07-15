import type { Metadata } from "next";
import ChipsMore from "./ChipsMore";

const TITLE = "Credentials & Certifications - Bradley Griffin";
const DESCRIPTION =
  "Auburn MBA + M.S. Information Systems, CMU summa cum laude, 75th Ranger Regiment, and 8 professional certifications spanning 40 accredited courses.";
const URL = "https://www.bradleygriffin.us/credentials";
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
const credentialsJsonLd =
  '{"@context": "https://schema.org", "@graph": [{"@type": "WebPage", "url": "https://www.bradleygriffin.us/credentials", "name": "Credentials - Bradley Griffin", "about": {"@type": "Person", "@id": "https://www.bradleygriffin.us/#person", "name": "Bradley Griffin"}, "mainEntity": {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": 1, "item": {"@type": "EducationalOccupationalCredential", "name": "Google Data Analytics", "credentialCategory": "certification"}}, {"@type": "ListItem", "position": 2, "item": {"@type": "EducationalOccupationalCredential", "name": "Google Project Management", "credentialCategory": "certification"}}, {"@type": "ListItem", "position": 3, "item": {"@type": "EducationalOccupationalCredential", "name": "Google Digital Marketing & E-commerce", "credentialCategory": "certification"}}, {"@type": "ListItem", "position": 4, "item": {"@type": "EducationalOccupationalCredential", "name": "Google Business Intelligence", "credentialCategory": "certification"}}, {"@type": "ListItem", "position": 5, "item": {"@type": "EducationalOccupationalCredential", "name": "Google UX Design", "credentialCategory": "certification"}}, {"@type": "ListItem", "position": 6, "item": {"@type": "EducationalOccupationalCredential", "name": "Google IT Automation with Python", "credentialCategory": "certification"}}, {"@type": "ListItem", "position": 7, "item": {"@type": "EducationalOccupationalCredential", "name": "Google Analytics 4 Essentials for Local SEO", "credentialCategory": "certification"}}, {"@type": "ListItem", "position": 8, "item": {"@type": "EducationalOccupationalCredential", "name": "Business Analytics with Excel - Johns Hopkins University", "credentialCategory": "certification"}}]}}, {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.bradleygriffin.us/"}, {"@type": "ListItem", "position": 2, "name": "Credentials", "item": "https://www.bradleygriffin.us/credentials"}]}]}';

export default function CredentialsPage() {
  return (
    <div className="page-credentials">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: credentialsJsonLd }} />

      {/* ======= PAGE HERO ======= */}
      <section className="page-hero" id="top">
        <div className="wrap">
          <span className="microlabel">Credentials</span>
          <h1>Earned — <em>every one of them</em>.</h1>
          <p className="lede">
            Degrees, service, and certifications aren't wall decoration — they're evidence of a<strong> standing practice of study</strong>. The field keeps moving, so I keep learning.
            Here's the paper trail, dated and complete.
          </p>
        </div>
      </section>

      {/* ======= EDUCATION ======= */}
      <section className="section" id="education">
        <div className="wrap">
          <div className="section-intro reveal">
            <span className="microlabel">Education</span>
            <h2>The formal <em>record</em>.</h2>
            <p>Where the classroom part comes from — one program in progress, one finished on my own terms.</p>
          </div>
          <div className="edu-list reveal">
            <div className="edu-card">
              <div className="yr">2027<span className="note">Expected</span></div>
              <div>
                <h3>Auburn University</h3>
                <p className="deg">MBA + M.S. Information Systems · Dual master's</p>
                <p className="detail">A dual master's program at the <strong>Harbert College of Business</strong> — business leadership and information systems, pursued in parallel, while operating full-time.</p>
              </div>
            </div>
            <div className="edu-card">
              <div className="yr">2025</div>
              <div>
                <h3>Central Michigan University</h3>
                <p className="deg">B.A. · Summa cum laude · 3.97 GPA</p>
                <p className="detail">Finished <strong>twenty years after it started</strong> — completed summa cum laude, with a 3.97 GPA, while running a <strong>$25M growth engine</strong>. Unfinished business doesn't stay that way.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= MILITARY ======= */}
      <section className="section military" id="military">
        <div className="wrap military-grid">
          <div className="reveal">
            <span className="microlabel">Military service</span>
            <h2>The first credential came <em>before the classroom</em>.</h2>
            <p className="body"><strong>United States Army — 75th Ranger Regiment.</strong> Airborne, Fort Benning, Georgia, 2005–2007. Selected for one of the U.S. military's most elite special operations units; honorably discharged following injuries from a parachute accident.</p>
            <a className="story-link" href="/story">Read the story <span className="arr">&rarr;</span></a>
          </div>
          <div className="reveal">
            <div className="mil-facts">
              <div className="mil-fact"><span className="k">Branch</span><span className="v">United States Army</span></div>
              <div className="mil-fact"><span className="k">Unit</span><span className="v">75th Ranger Regiment — Airborne</span></div>
              <div className="mil-fact"><span className="k">Station</span><span className="v">Fort Benning, Georgia</span></div>
              <div className="mil-fact"><span className="k">Service</span><span className="v">2005 — 2007</span></div>
              <div className="mil-fact"><span className="k">Discharge</span><span className="v">Honorable — following injuries from a parachute accident</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= CERTIFICATIONS ======= */}
      <section className="section" id="certifications">
        <div className="wrap">
          <div className="section-intro reveal">
            <span className="microlabel">Certifications</span>
            <h2>8 professional certifications, <em>spanning 40 accredited courses</em>.</h2>
            <p>Analytics, AI, automation, project management, and marketing science — accredited, dated, and applied the same week they were earned.</p>
          </div>
          <div className="cert-grid reveal">
            <div className="cert-cell">
              <span className="cidx">01</span>
              <h4>Google Data Analytics</h4>
              <p className="issuer">Google · 2023</p>
              <p className="courses"><em>8</em> courses</p>
            </div>
            <div className="cert-cell">
              <span className="cidx">02</span>
              <h4>Google Project Management</h4>
              <p className="issuer">Google · 2023</p>
              <p className="courses"><em>6</em> courses</p>
            </div>
            <div className="cert-cell">
              <span className="cidx">03</span>
              <h4>Google Digital Marketing &amp; E-commerce</h4>
              <p className="issuer">Google · 2023</p>
              <p className="courses"><em>7</em> courses</p>
            </div>
            <div className="cert-cell">
              <span className="cidx">04</span>
              <h4>Google Business Intelligence</h4>
              <p className="issuer">Google · 2023</p>
              <p className="courses"><em>3</em> courses</p>
            </div>
            <div className="cert-cell">
              <span className="cidx">05</span>
              <h4>Google UX Design</h4>
              <p className="issuer">Google · 2023</p>
              <p className="courses"><em>7</em> courses</p>
            </div>
            <div className="cert-cell">
              <span className="cidx">06</span>
              <h4>Google IT Automation with Python</h4>
              <p className="issuer">Google · 2025</p>
              <p className="courses">Professional certificate</p>
            </div>
            <div className="cert-cell">
              <span className="cidx">07</span>
              <h4>Google Analytics 4 Essentials for Local SEO</h4>
              <p className="issuer">2025</p>
              <p className="courses">Certificate</p>
            </div>
            <div className="cert-cell">
              <span className="cidx">08</span>
              <h4>Business Analytics with Excel: Elementary to Advanced</h4>
              <p className="issuer">Johns Hopkins University · 2023</p>
              <p className="courses">Certificate</p>
            </div>
          </div>

          <div className="cert-gallery-head reveal">
            <h3>The <em>certificates</em>.</h3>
          </div>
          <p className="cert-gallery-sub reveal">Not just listed — shown. Click any certificate to view the original at full size.</p>
          <div className="cert-gallery reveal">
            <a className="cert-shot" href="/assets/certs/google-data-analytics.png" target="_blank" rel="noopener">
              <span className="frame"><img src="/assets/certs/google-data-analytics.png" alt="Google Data Analytics Professional Certificate awarded to Bradley Griffin" loading="lazy" /></span>
              <span className="cap"><span className="cn">Google Data Analytics</span><span className="cy">Google · 2023</span></span>
            </a>
            <a className="cert-shot" href="/assets/certs/google-project-management.png" target="_blank" rel="noopener">
              <span className="frame"><img src="/assets/certs/google-project-management.png" alt="Google Project Management Professional Certificate awarded to Bradley Griffin" loading="lazy" /></span>
              <span className="cap"><span className="cn">Google Project Management</span><span className="cy">Google · 2023</span></span>
            </a>
            <a className="cert-shot" href="/assets/certs/google-digital-marketing-ecommerce.png" target="_blank" rel="noopener">
              <span className="frame"><img src="/assets/certs/google-digital-marketing-ecommerce.png" alt="Google Digital Marketing and E-commerce Professional Certificate awarded to Bradley Griffin" loading="lazy" /></span>
              <span className="cap"><span className="cn">Google Digital Marketing &amp; E&#8209;commerce</span><span className="cy">Google · 2023</span></span>
            </a>
            <a className="cert-shot" href="/assets/certs/google-business-intelligence.png" target="_blank" rel="noopener">
              <span className="frame"><img src="/assets/certs/google-business-intelligence.png" alt="Google Business Intelligence Professional Certificate awarded to Bradley Griffin" loading="lazy" /></span>
              <span className="cap"><span className="cn">Google Business Intelligence</span><span className="cy">Google · 2023</span></span>
            </a>
            <a className="cert-shot" href="/assets/certs/johns-hopkins-business-analytics-excel.png" target="_blank" rel="noopener">
              <span className="frame"><img src="/assets/certs/johns-hopkins-business-analytics-excel.png" alt="Johns Hopkins University Business Analytics with Excel specialization certificate awarded to Bradley Griffin" loading="lazy" /></span>
              <span className="cap"><span className="cn">Business Analytics with Excel</span><span className="cy">Johns Hopkins · 2023</span></span>
            </a>
          </div>
        </div>
      </section>

      {/* ======= SKILLS ======= */}
      <section className="section" id="skills">
        <div className="wrap">
          <div className="section-intro reveal">
            <span className="microlabel">Applied skills</span>
            <h2>What all of it <em>adds up to</em>.</h2>
            <p>The through-line across every degree and certificate — the tools I actually reach for.</p>
          </div>
          <div className="chips reveal">
            <span className="chip">Data analytics</span>
            <span className="chip">Business intelligence</span>
            <span className="chip">Marketing science</span>
            <span className="chip">AI &amp; automation</span>
            <span className="chip">Project management</span>
            <span className="chip">Digital marketing &amp; e-commerce</span>
            <span className="chip">UX design</span>
            <span className="chip">Python &amp; IT automation</span>
            <span className="chip">SEO &amp; GA4</span>
            <span className="chip">Advanced Excel</span>
            <span className="chip xtra">Demand generation</span>
            <span className="chip xtra">Marketing automation</span>
            <span className="chip xtra">CRM architecture</span>
            <span className="chip xtra">Attribution modeling</span>
            <span className="chip xtra">Paid media</span>
            <span className="chip xtra">Go-to-market strategy</span>
            <span className="chip xtra">AI Overviews (AIO)</span>
            <ChipsMore />
          </div>
        </div>
      </section>

      {/* ======= SPEAKING CREDENTIALS ======= */}
      <section className="section" id="speaking-credentials">
        <div className="wrap">
          <div className="section-intro reveal">
            <span className="microlabel">Speaking credentials</span>
            <h2>Stages that <em>vet their speakers</em>.</h2>
            <p>Rooms &mdash; and airwaves &mdash; that don't hand the mic to just anyone.</p>
          </div>
          <div className="speak-strip reveal">
            <a className="speak-item" href="/speaking">
              <p className="where">Des Moines, IA — 2024</p>
              <h3>Iowa Land Investment Expo</h3>
              <p>Featured speaker at one of agriculture's premier annual events — a sell-out audience of land investors, agricultural professionals, and policy leaders.</p>
              <span className="link">See speaking <span className="arr">&rarr;</span></span>
            </a>
            <a className="speak-item" href="/speaking">
              <p className="where">Live on GPB / PBS — 2018</p>
              <h3>Atlanta Press Club Debate Series</h3>
              <p>Selected for the Loudermilk-Young Debate Series — Georgia's most prominent debate stage — broadcast live statewide on GPB/PBS, unscripted, before the state's leading journalists.</p>
              <span className="link">See speaking <span className="arr">&rarr;</span></span>
            </a>
            <div className="speak-item">
              <p className="where">Michigan &mdash; 2003</p>
              <h3>Michigan Association of Broadcasters &mdash; Broadcast Excellence</h3>
              <p>Awarded for the #2 newscast in the state, high school/college category &mdash; the earliest credential on this page, earned before the Army and before the first company.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= CONTACT CTA ======= */}
      <section className="finale" id="contact">
        <div className="wrap reveal">
          <span className="microlabel">Start a conversation</span>
          <h2>Put the credentials <em>to work</em>.</h2>
          <p>Executive search, a fractional engagement, a strategy problem worth solving, or a stage that needs a speaker — tell me what you're building, and I'll tell you how I'd grow it.</p>
          <div className="fin-ctas"><a className="btn btn-solid" href="/contact">Get in Touch <span className="arr">&rarr;</span></a>
          <a className="btn btn-gold cal-link" href="https://calendly.com/optimzedseo/30min" target="_blank" rel="noopener">Schedule a Call <span className="arr">&rarr;</span></a></div>
        </div>
      </section>
    </div>
  );
}
