// Vercel serverless function — receives the contact form and emails it via Resend.
// Env vars (set in Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY   (required)  your Resend API key
//   CONTACT_TO       (optional)  where leads land; default griff_brad@yahoo.com
//   CONTACT_FROM     (optional)  verified sender; default "Bradley Griffin <leads@bradleygriffin.us>"

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Parse body (works whether Vercel pre-parsed it or not).
  let data = req.body;
  if (!data || typeof data === "string") {
    try {
      const raw =
        typeof data === "string"
          ? data
          : await new Promise((resolve, reject) => {
              let b = "";
              req.on("data", (c) => (b += c));
              req.on("end", () => resolve(b));
              req.on("error", reject);
            });
      data = JSON.parse(raw || "{}");
    } catch {
      data = {};
    }
  }

  const name = (data.name || "").trim();
  const email = (data.email || "").trim();
  const company = (data.company || "").trim();
  const type = (data.type || "General inquiry").trim();
  const message = (data.message || "").trim();

  // Honeypot: real people leave it empty; bots fill it. Silently accept + drop.
  if (data._gotcha) return res.status(200).json({ ok: true });

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Please complete name, email, and message." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "That email address doesn't look right." });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return res.status(503).json({ error: "Email isn't configured yet. Please email directly for now." });
  }

  const to = process.env.CONTACT_TO || "griff_brad@yahoo.com";
  const from = process.env.CONTACT_FROM || "Bradley Griffin <leads@bradleygriffin.us>";
  const subject = `New inquiry — ${type} — ${name}`;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#121417;max-width:560px;margin:0 auto;">
      <div style="border-top:4px solid #B33A2B;padding:20px 0 8px;">
        <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#B33A2B;font-weight:bold;margin:0 0 6px;">New inquiry — bradleygriffin.us</p>
        <h2 style="font-size:20px;margin:0 0 4px;">${esc(type)}</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">
        <tr><td style="padding:8px 0;color:#565A60;width:120px;">Name</td><td style="padding:8px 0;font-weight:600;">${esc(name)}</td></tr>
        <tr><td style="padding:8px 0;color:#565A60;">Email</td><td style="padding:8px 0;"><a href="mailto:${esc(email)}" style="color:#B33A2B;">${esc(email)}</a></td></tr>
        <tr><td style="padding:8px 0;color:#565A60;">Company</td><td style="padding:8px 0;">${esc(company) || "—"}</td></tr>
        <tr><td style="padding:8px 0;color:#565A60;vertical-align:top;">Message</td><td style="padding:8px 0;white-space:pre-wrap;line-height:1.6;">${esc(message)}</td></tr>
      </table>
      <p style="font-size:12px;color:#9A9FA6;margin-top:18px;border-top:1px solid #E4DDCE;padding-top:12px;">Reply directly to this email to respond to ${esc(name)}.</p>
    </div>`;

  const text =
    `New inquiry — ${type}\n\n` +
    `Name: ${name}\nEmail: ${email}\nCompany: ${company || "—"}\n\n${message}\n`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: email, subject, html, text }),
    });
    if (!r.ok) {
      const detail = await r.text();
      console.error("Resend error", r.status, detail);
      return res.status(502).json({ error: "Couldn't send right now. Please try again shortly." });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("contact handler error", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};
