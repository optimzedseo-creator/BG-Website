import type { Metadata } from "next";
import ContactForm from "./ContactForm";

const TITLE = "Contact Bradley Griffin - CMO, Consulting & Speaking";
const DESCRIPTION =
  "Start a conversation with Bradley Griffin - executive search, fractional CMO engagements, strategy & AI consulting, and keynote booking.";
const URL = "https://www.bradleygriffin.us/contact";
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
const contactJsonLd =
  '{"@context": "https://schema.org", "@graph": [{"@type": "ContactPage", "url": "https://www.bradleygriffin.us/contact", "name": "Contact - Bradley Griffin", "mainEntity": {"@type": "Person", "@id": "https://www.bradleygriffin.us/#person", "name": "Bradley Griffin"}}, {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.bradleygriffin.us/"}, {"@type": "ListItem", "position": 2, "name": "Contact", "item": "https://www.bradleygriffin.us/contact"}]}]}';

export default function ContactPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: contactJsonLd }} />

      {/* ======= CONTACT ======= */}
      <section className="contact-hero" id="top">
        <div className="wrap">
          <div className="cx-head">
            <span className="microlabel">Start a conversation</span>
            <h1>Tell me what <em>you're building.</em></h1>
            <p className="lede">Pick what you need, send the brief — you'll hear back from me, not an assistant.</p>
            <p className="lede-note">Based in Southwest Michigan, working nationally and remote-first — introductory calls are on Teams or Zoom.</p>
          </div>

          <ContactForm />
        </div>
      </section>
    </>
  );
}
