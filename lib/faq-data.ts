/**
 * SINGLE SOURCE OF TRUTH for the FAQ page.
 * Renders BOTH the visible accordion and the FAQPage JSON-LD — the two can
 * no longer drift independently (the drift class this file exists to kill).
 *
 * Note: the visible copy is first-person ("I can't give an estimate...")
 * while the schema copy is deliberately third-person-neutral ("an estimate
 * cannot be given..."). That difference is intentional and predates the port;
 * both variants live here, side by side, per question.
 */
export type FaqItem = {
  /** Visible <summary> text. */
  question: string;
  /** Question name in the FAQPage JSON-LD (may differ slightly from visible). */
  schemaQuestion: string;
  /** Visible answer HTML (verbatim from the legacy page, entities included). */
  answerHtml: string;
  /** Answer text in the FAQPage JSON-LD. */
  schemaAnswer: string;
  /** Whether the accordion item starts open. */
  open?: boolean;
};

export const faqItems: FaqItem[] = [
  {
    question: "When can you start?",
    schemaQuestion: "When can you start?",
    answerHtml:
      "<p>Once we finalize the details and the scope of the job. Exact timing also depends on the current queue &mdash; engagements are taken on in the order they&rsquo;re scoped, so the earlier you reach out, the sooner the start date.</p>",
    schemaAnswer:
      "Once we finalize the details and the scope of the job. Exact timing also depends on the current queue - engagements are taken on in the order they are scoped, so the earlier you reach out, the sooner the start date.",
    open: true,
  },
  {
    question: "What are your prices?",
    schemaQuestion: "What are your prices?",
    answerHtml:
      "<p>Every job is unique, so I can&rsquo;t give an estimate without knowing what your needs are. Once I&rsquo;ve spoken with you and understand the scope of the work, then I can accurately quote you for the work.</p>",
    schemaAnswer:
      "Every job is unique, so an estimate cannot be given without knowing your needs. Once the scope of the work is discussed and understood, an accurate quote is provided.",
  },
  {
    question: "Is this in person, hybrid, or remote?",
    schemaQuestion: "Is this in person, hybrid, or remote?",
    answerHtml:
      "<p>Mainly remote. It keeps engagements efficient and puts your budget into the work instead of travel. If there&rsquo;s a moment where being in the room genuinely matters, raise it during scoping and we&rsquo;ll talk it through.</p>",
    schemaAnswer:
      "Mainly remote. That keeps engagements efficient and lets budget go to the work rather than travel. Where being in the room genuinely matters, it can be discussed as part of scoping.",
  },
  {
    question: "Does your fee include overhead, like ad spend or tools?",
    schemaQuestion: "Does your fee include overhead like ad spend or tools?",
    answerHtml:
      "<p>No &mdash; the fee covers the consultancy itself: the strategy, the execution, and the counsel. Media budgets, software licenses, and other program costs are separate, and they stay in your name &mdash; you keep ownership of the accounts and the data.</p>",
    schemaAnswer:
      "No - the fee covers the consultancy itself: strategy, execution, and counsel. Media budgets, software licenses, and other program costs are separate and stay in your name, so you keep ownership of the accounts and the data.",
  },
  {
    question: "What kinds of companies do you work with?",
    schemaQuestion: "What kinds of companies do you work with?",
    answerHtml:
      "<p>I generally work with all companies. While it&rsquo;s common for business leaders to think their industry is unique, many of the practices and principles I&rsquo;m a subject matter expert in are universal. They work no matter where they are deployed.</p>",
    schemaAnswer:
      "All kinds. While it is common for business leaders to think their industry is unique, many of the practices and principles involved are universal - they work no matter where they are deployed.",
  },
  {
    question: "How does an engagement begin?",
    schemaQuestion: "How does an engagement begin?",
    answerHtml:
      '<p>You can <a href="/contact">send me a brief through email</a> or <a class="cal-link" href="https://calendly.com/optimzedseo/30min" target="_blank" rel="noopener">schedule a 30-minute call</a> to discuss the scope of work. Before any work begins, we will agree on the scope, structure, and measurable outcomes for success.</p>',
    schemaAnswer:
      "Send a brief through email or schedule a 30-minute call to discuss the scope of work. Before any work begins, the scope, structure, and measurable outcomes for success are agreed.",
  },
  {
    question: "Do you take speaking engagements?",
    schemaQuestion: "Do you take speaking engagements?",
    answerHtml:
      '<p>Yes &mdash; keynotes, panels, and working sessions on market strategy, competition, and AI. Topics and past stages are on the <a href="/speaking">speaking page</a>.</p>',
    schemaAnswer:
      "Yes - keynotes, panels, and sessions on market strategy, competition, and AI. See the speaking page for topics and past stages.",
  },
];
