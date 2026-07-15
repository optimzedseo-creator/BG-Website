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
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/:page.html", destination: "/:page", permanent: true },
    ];
  },
};

export default nextConfig;
