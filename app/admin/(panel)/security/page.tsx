import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { K_TOTP_SECRET, getSetting, requireAdmin } from "@/lib/admin/auth";
import { VISITOR_COOKIE, readInternalVisitorIds } from "@/lib/admin/iq/internal";
import { ChangePasswordForm, TotpSection } from "./SecurityForms";
import { excludeThisDeviceAction, removeInternalVisitorAction } from "./actions";

export const dynamic = "force-dynamic";

/** Long ids render truncated (mono) — the full id stays in the title attribute. */
function shortId(id: string): string {
  return id.length > 20 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

export default async function AdminSecurityPage() {
  if (!(await requireAdmin())) redirect("/admin/login");

  const [totpEnabled, internalIds, cookieStore] = await Promise.all([
    getSetting(K_TOTP_SECRET).then(Boolean),
    readInternalVisitorIds(),
    cookies(),
  ]);
  const bgVid = cookieStore.get(VISITOR_COOKIE)?.value ?? null;
  const thisDeviceExcluded = bgVid !== null && internalIds.includes(bgVid);

  return (
    <div data-acc="security">
      <div className="adm-head">
        <h1>Security</h1>
      </div>
      <div className="adm-grid adm-grid-detail">
        <section className="adm-card">
          <h2>Two-factor authentication</h2>
          <TotpSection enabled={totpEnabled} />
        </section>
        <section className="adm-card">
          <h2>Change password</h2>
          <ChangePasswordForm />
        </section>
        <section className="adm-card">
          <h2>Internal traffic</h2>
          <p className="adm-note">
            Visits from the browser ids on this list are left out of every dashboard number, so
            your own check-ins never count as traffic.
          </p>
          {thisDeviceExcluded ? (
            <p className="adm-ok" role="status">This browser is already excluded.</p>
          ) : bgVid ? (
            <form action={excludeThisDeviceAction}>
              <button type="submit" className="adm-btn">Exclude this browser</button>
            </form>
          ) : (
            <p className="adm-note">
              This browser has no visitor id yet, so there is nothing to exclude. Open any page on
              the site first, then come back.
            </p>
          )}
          {internalIds.length === 0 ? (
            <p className="adm-empty">
              Nothing excluded yet. Your admin browser is added automatically when you sign in.
            </p>
          ) : (
            <ul style={{ listStyle: "none", display: "grid", gap: 7, marginTop: 12, padding: 0 }}>
              {internalIds.map((id) => (
                <li
                  key={id}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}
                >
                  <span className="adm-mono" title={id}>
                    {shortId(id)}
                    {id === bgVid ? " (this browser)" : ""}
                  </span>
                  {id === bgVid ? (
                    /* Own-device Remove is futile: the panel layout re-captures
                       bg_vid on every render (auto-capture stays — security's
                       instruction), so say so instead of faking a control. */
                    <span className="adm-mono">
                      Always excluded. This browser signs in as admin.
                    </span>
                  ) : (
                    <form action={removeInternalVisitorAction}>
                      <input type="hidden" name="id" value={id} />
                      <button
                        type="submit"
                        className="adm-linkbtn"
                        aria-label={`Remove ${shortId(id)}`}
                      >
                        Remove
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
