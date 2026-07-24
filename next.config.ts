import type { NextConfig } from "next";

/**
 * Security headers — moved VERBATIM from vercel.json (which is retired for the
 * Next.js build; cleanUrls no longer applies since extensionless URLs are
 * Next's native routing). Any change to these values is a security review.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://assets.calendly.com https://www.youtube.com; style-src 'self' 'unsafe-inline' https://assets.calendly.com; font-src 'self' https://assets.calendly.com; img-src 'self' data: https://*.ytimg.com https://img.youtube.com https://assets.calendly.com; frame-src https://calendly.com https://*.calendly.com https://www.youtube.com; connect-src 'self' https://calendly.com https://*.calendly.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  /*
   * C1 P0: next/image pipeline (the former backlog item, now P1-blocking —
   * C1-IMPLEMENTATION-PLAN.md §3.4). Modern formats only; device sizes stay
   * Next defaults. All new C1 imagery renders through <Image> inside
   * PhotoFrame; legacy raw <img>s convert page-by-page in each page's phase.
   */
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  // Recreates vercel.json cleanUrls behavior: /page.html 308 → /page
  async redirects() {
    return [
      // Retired /writing frame → /insights cluster (permanent 301; WP8 map).
      // Specific article URLs first, then the section index.
      {
        source: "/writing/attribution-reports-are-fiction",
        destination: "/insights/data-analytics/attribution-is-fiction",
        permanent: true,
      },
      {
        // 1:1 successor now exists (the keystone "not a marketing problem"
        // post). Re-pointed from the hub to the post (bradley-seo, 2026-07-24).
        source: "/writing/its-not-a-marketing-problem",
        destination: "/insights/data-analytics/not-a-marketing-problem",
        permanent: true,
      },
      {
        source: "/writing/leads-run-hot-then-cold",
        destination: "/insights/data-analytics/audit-is-a-blood-test",
        permanent: true,
      },
      { source: "/writing", destination: "/insights", permanent: true },
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/:page.html", destination: "/:page", permanent: true },
    ];
  },
};

export default nextConfig;
