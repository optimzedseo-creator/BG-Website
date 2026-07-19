"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Contact form — behavior ported 1:1 from the legacy inline script:
 *  - four radio options (values must match the live form exactly),
 *  - ?type= deep-link preselect (executive|fractional|consulting|speaking),
 *  - POST /api/contact with honeypot passthrough,
 *  - success panel + optional prefilled Calendly popup.
 * The legacy contact page eagerly loaded Calendly's widget.js/css; we do the
 * same on mount (same element ids the global lazy-loader checks, so nothing
 * double-loads).
 */

const TYPE_OPTIONS = [
  { value: "Full-Time Executive Role", label: "A full-time executive leader" },
  { value: "Fractional Leadership", label: <>Fractional leadership &mdash; part-time, ongoing</> },
  { value: "Project (Audit / AI Build)", label: <>A one-time project &mdash; audit or AI build</> },
  { value: "Speaking Engagement", label: "A speaker for an event" },
  { value: "Something Else", label: "Something else" },
] as const;

const DEEP_LINK_MAP: Record<string, string> = {
  executive: "Full-Time Executive Role",
  fractional: "Fractional Leadership",
  consulting: "Project (Audit / AI Build)",
  speaking: "Speaking Engagement",
};

export default function ContactForm() {
  const [type, setType] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ kind: "" | "err"; text: string }>({ kind: "", text: "" });
  const [done, setDone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const sentRef = useRef<{ name: string; email: string }>({ name: "", email: "" });

  // Deep link: /contact?type=executive|fractional|consulting|speaking → preselect.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("type");
    if (q && DEEP_LINK_MAP[q]) setType(DEEP_LINK_MAP[q]);
  }, []);

  // Eager-load the Calendly widget like the legacy contact page did.
  useEffect(() => {
    if (!document.getElementById("cal-css")) {
      const l = document.createElement("link");
      l.id = "cal-css";
      l.rel = "stylesheet";
      l.href = "https://assets.calendly.com/assets/external/widget.css";
      document.head.appendChild(l);
    }
    if (!document.getElementById("cal-js")) {
      const s = document.createElement("script");
      s.id = "cal-js";
      s.src = "https://assets.calendly.com/assets/external/widget.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;
    if (!type) {
      setStatus({ kind: "err", text: "Please pick what you're looking for." });
      return;
    }
    const val = (name: string) => {
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
      return el ? el.value.trim() : "";
    };
    const payload = {
      name: val("name"),
      email: val("email"),
      phone: val("phone"),
      company: val("company"),
      type,
      message: val("message"),
      _gotcha: val("_gotcha"),
    };
    if (!payload.name || !payload.email || !payload.message) {
      if (form.reportValidity) form.reportValidity();
      return;
    }
    setSending(true);
    setStatus({ kind: "", text: "" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const out = await res.json().catch(() => ({}));
      if (res.ok && out.ok) {
        sentRef.current = { name: payload.name, email: payload.email };
        setDone(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setStatus({
          kind: "err",
          text: (out && out.error) || "Couldn’t send right now. Please try again shortly, or reach out on LinkedIn.",
        });
        setSending(false);
      }
    } catch {
      setStatus({ kind: "err", text: "Network hiccup — please try again, or reach out on LinkedIn." });
      setSending(false);
    }
  }

  function onBook() {
    const url =
      "https://calendly.com/optimzedseo/30min?hide_gdpr_banner=1" +
      "&name=" + encodeURIComponent(sentRef.current.name) +
      "&email=" + encodeURIComponent(sentRef.current.email);
    if (window.Calendly && window.Calendly.initPopupWidget) {
      window.Calendly.initPopupWidget({ url });
    } else {
      window.open(url, "_blank", "noopener");
    }
  }

  return (
    <>
      <form id="contact-form" className="cx-form" noValidate ref={formRef} onSubmit={onSubmit} hidden={done}>
        <fieldset className="cx-fieldset">
          <legend>I'm looking for <span className="req">*</span></legend>
          <div className="optbtns">
            {TYPE_OPTIONS.map((opt) => (
              <label
                className={`optbtn${type === opt.value ? " on" : ""}${opt.value === "Something Else" ? " full" : ""}`}
                key={opt.value}
              >
                <input
                  type="radio"
                  name="type"
                  value={opt.value}
                  checked={type === opt.value}
                  onChange={() => setType(opt.value)}
                />
                <span className="rdot"></span>
                <span className="rtxt">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="cf-name">Full name <span className="req">*</span></label>
            <input type="text" id="cf-name" name="name" placeholder="Your name" required autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="cf-email">Email <span className="req">*</span></label>
            <input type="email" id="cf-email" name="email" placeholder="you@company.com" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="cf-phone">Phone</label>
            <input type="tel" id="cf-phone" name="phone" placeholder="Optional" autoComplete="tel" />
          </div>
          <div className="field">
            <label htmlFor="cf-company">Company</label>
            <input type="text" id="cf-company" name="company" placeholder="Company or organization" autoComplete="organization" />
          </div>
          <div className="field full">
            <label htmlFor="cf-message">Message <span className="req">*</span></label>
            <textarea
              id="cf-message"
              name="message"
              placeholder={type === "Something Else" ? "Tell me what you're looking for." : "A sentence or two on what you need."}
              required
            ></textarea>
          </div>
        </div>

        <div className="hp" aria-hidden="true">
          <label>Leave this field empty<input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" /></label>
        </div>

        <div className="cx-actions">
          <button className="btn btn-solid" type="submit" id="cf-submit" disabled={sending}>
            {sending ? "Sending…" : <>Send the brief <span className="arr">→</span></>}
          </button>
        </div>
        <p id="cf-status" className={`cf-status${status.kind ? ` ${status.kind}` : ""}`} role="status" aria-live="polite">
          {status.text}
        </p>
      </form>

      {/* success (hidden until submit) */}
      <div id="cx-done" className="cx-done" hidden={!done}>
        <div className="fdone"><span className="fdone-mark">✓</span> Your brief is in — it's in Bradley's inbox.</div>
        <h2 className="cx-done-h">Want to <em>grab a time?</em></h2>
        <p className="lede">Optional. Book a 30-minute intro call now, or just wait — you'll hear back within two business days either way.</p>
        <div className="cx-actions">
          <button className="btn btn-solid" type="button" id="cx-book" onClick={onBook}>Book a 30-minute call <span className="arr">→</span></button>
          <a className="fskip" href="/">No thanks — back to the site</a>
        </div>
      </div>
    </>
  );
}
