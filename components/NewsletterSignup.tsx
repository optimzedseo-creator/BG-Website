"use client";

import { useRef, useState } from "react";

/**
 * NewsletterSignup — compact, on-brand email capture for the book-launch list.
 * Imported by the homepage and /writing (each passes its own copy + source).
 * Posts to /api/subscribe (honeypot + email regex + idempotent upsert server-side).
 *
 * Props (all optional):
 *   heading  — section heading (default: book-launch framing)
 *   blurb    — one line under the heading
 *   source   — list segment sent to the API: "site" | "book" | "writing" | "event"
 *   cta      — button label
 *
 * CAN-SPAM note: the list does not send yet. When welcome/confirm mail is wired
 * (server-side TODO in /api/subscribe), every send needs real identity + a
 * working unsubscribe link. This form only collects consent to be emailed.
 *
 * CSS is a self-contained block with nl-* class names so the component renders
 * identically on any page without depending on page-scoped styles.
 */

type Props = {
  heading?: string;
  blurb?: string;
  source?: "site" | "book" | "writing" | "event";
  cta?: string;
};

export default function NewsletterSignup({
  heading = "Get the book before everyone else",
  blurb = "Notes on why marketing stalls, and the first chapter free when it's ready. No spam. Unsubscribe anytime.",
  source = "site",
  cta = "Keep me posted",
}: Props) {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;
    const el = form.elements.namedItem("email") as HTMLInputElement | null;
    const hp = form.elements.namedItem("_gotcha") as HTMLInputElement | null;
    const email = el ? el.value.trim() : "";
    if (!email) {
      setError("Add your email first.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, _gotcha: hp ? hp.value : "" }),
      });
      const out = await res.json().catch(() => ({}));
      if (res.ok && out.ok) {
        setDone(true);
      } else {
        setError((out && out.error) || "That didn't go through. Try again in a moment.");
        setSending(false);
      }
    } catch {
      setError("Network hiccup. Try again in a moment.");
      setSending(false);
    }
  }

  return (
    <div className="nl-signup">
      {done ? (
        <p className="nl-done" role="status" aria-live="polite">
          <span className="nl-check">✓</span> You're on the list. You'll hear from Bradley Griffin, not a bot.
        </p>
      ) : (
        <>
          {heading ? <h3 className="nl-h">{heading}</h3> : null}
          {blurb ? <p className="nl-blurb">{blurb}</p> : null}
          <form className="nl-form" ref={formRef} noValidate onSubmit={onSubmit}>
            <label className="nl-label" htmlFor="nl-email">Email</label>
            <div className="nl-row">
              <input
                id="nl-email"
                type="email"
                name="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
                className="nl-input"
              />
              <button type="submit" className="nl-btn" disabled={sending}>
                {sending ? "One sec…" : cta}
              </button>
            </div>
            {/* honeypot: real people leave it empty */}
            <div className="nl-hp" aria-hidden="true">
              <label>Leave this empty<input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" /></label>
            </div>
            <p className="nl-status" role="status" aria-live="polite">{error}</p>
          </form>
        </>
      )}

      <style>{`
        .nl-signup { max-width: 520px; }
        .nl-h {
          font-family: var(--serif, Georgia, serif);
          font-weight: 500; font-size: 24px; line-height: 1.12;
          letter-spacing: -0.01em; color: var(--ink, #1C2B4A); margin: 0 0 8px;
        }
        .nl-blurb {
          font-family: var(--sans, sans-serif); font-size: 15px; line-height: 1.55;
          color: var(--mute, #5D6779); margin: 0 0 16px;
        }
        .nl-form { margin: 0; }
        .nl-label {
          display: block; font-family: var(--sans, sans-serif); font-size: 12px;
          letter-spacing: 0.04em; text-transform: uppercase;
          color: var(--mute, #5D6779); margin: 0 0 6px;
        }
        .nl-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .nl-input {
          flex: 1 1 220px; min-width: 0;
          font-family: var(--sans, sans-serif); font-size: 15px;
          padding: 12px 14px; color: var(--ink, #1C2B4A);
          background: #fff; border: 1px solid var(--line-strong, #D3CABA);
          border-radius: 8px; transition: border-color .18s;
        }
        .nl-input::placeholder { color: #9AA0AC; }
        .nl-input:focus {
          outline: none; border-color: var(--bronze-deep, #8C6D24);
          box-shadow: 0 0 0 3px rgba(140,109,36,0.14);
        }
        .nl-btn {
          flex: 0 0 auto; cursor: pointer;
          font-family: var(--sans, sans-serif); font-size: 15px; font-weight: 600;
          padding: 12px 22px; border-radius: 100px;
          color: var(--cream, #FAF8F3); background: var(--ink, #1C2B4A);
          border: 1px solid var(--ink, #1C2B4A);
          transition: background .2s, border-color .2s;
        }
        .nl-btn:hover:not(:disabled) {
          background: var(--bronze-deep, #8C6D24); border-color: var(--bronze-deep, #8C6D24);
        }
        .nl-btn:disabled { opacity: 0.6; cursor: default; }
        .nl-hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
        .nl-status {
          min-height: 18px; margin: 8px 0 0;
          font-family: var(--sans, sans-serif); font-size: 13px; color: #B23A2E;
        }
        .nl-done {
          font-family: var(--sans, sans-serif); font-size: 15px; line-height: 1.5;
          color: var(--ink, #1C2B4A); margin: 0;
        }
        .nl-check {
          display: inline-block; margin-right: 6px; font-weight: 700;
          color: var(--bronze-deep, #8C6D24);
        }
      `}</style>
    </div>
  );
}
