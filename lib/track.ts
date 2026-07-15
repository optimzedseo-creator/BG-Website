// Shared helpers for the first-party analytics capture (/api/track).
// Privacy posture (BACKEND-PLAN.md §5): no raw IPs at rest, no fingerprinting —
// visitorId is a random first-party cookie; country comes from Vercel's geo
// header; device/browser are coarse UA buckets.

export const VISITOR_COOKIE = "bg_vid";

// 13 months, per the plan's cookie spec.
export const VISITOR_COOKIE_MAX_AGE = 396 * 24 * 60 * 60;

// Known bots / automation / previews — dropped silently before any DB write.
const BOT_RE =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|pingdom|uptime|monitor|scrape|curl|wget|python|httpx|libwww|axios|node-fetch|go-http|java\/|phantom|selenium|playwright|puppeteer|facebookexternalhit|whatsapp|telegram|slack|discord|embedly|quora link preview|bingpreview|vkshare|snapchat|pinterest|tumblr|vercel/i;

export function isBot(ua: string | null): boolean {
  if (!ua || ua.length < 20) return true;
  return BOT_RE.test(ua);
}

export function parseDevice(ua: string): string {
  if (/ipad|tablet|kindle|silk|playbook/i.test(ua)) return "tablet";
  if (/android/i.test(ua) && !/mobile/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|windows phone/i.test(ua)) return "mobile";
  return "desktop";
}

export function parseBrowser(ua: string): string {
  // Order matters: Edge/Opera/Samsung UAs also contain "Chrome";
  // Chrome UAs also contain "Safari".
  if (/edg(?:e|a|ios)?\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  if (/msie|trident/i.test(ua)) return "IE";
  return "Other";
}

// Coarse string sanitizer: trims, caps length, empties become null.
export function clean(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, max);
  return s.length ? s : null;
}
