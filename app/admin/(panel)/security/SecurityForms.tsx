"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  beginTotpEnroll,
  changePassword,
  confirmTotpEnroll,
  disableTotp,
  type EnrollStart,
  type FormResult,
} from "./actions";

const EMPTY: FormResult = {};

export function TotpSection({ enabled }: { enabled: boolean }) {
  const [start, setStart] = useState<EnrollStart | null>(null);
  const [starting, startTransition] = useTransition();
  const [confirmState, confirm, confirming] = useActionState(confirmTotpEnroll, EMPTY);
  const [disableState, disable, disabling] = useActionState(disableTotp, EMPTY);
  const router = useRouter();

  // After a successful confirmation the server state flipped — refresh so the
  // page re-renders in the enabled view. (Effect, not render-time side effect.)
  useEffect(() => {
    if (confirmState.ok) router.refresh();
  }, [confirmState.ok, router]);

  if (enabled) {
    return (
      <div>
        <p className="adm-ok">Two-factor authentication is ON. Sign-in requires your password plus a 6-digit code.</p>
        <p className="adm-note">
          Lost the device? Recovery is manual by design: delete the <code>admin_totp_secret</code> row
          from the Setting table via the Neon console, then re-enroll here.
        </p>
        <form action={disable} className="adm-inline-form">
          <label htmlFor="dis-code">Current code</label>
          <input id="dis-code" name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required />
          <button type="submit" className="adm-btn adm-btn-danger" disabled={disabling}>
            {disabling ? "Disabling…" : "Disable 2FA"}
          </button>
        </form>
        {disableState.error && <p className="adm-error" role="alert">{disableState.error}</p>}
      </div>
    );
  }

  if (!start?.qr) {
    return (
      <div>
        <p className="adm-note">
          Two-factor authentication is OFF. Enroll an authenticator app (Google Authenticator, 1Password,
          Authy…) — after enrolling, sign-in takes your password plus a 6-digit code.
        </p>
        {start?.error && <p className="adm-error" role="alert">{start.error}</p>}
        <button
          type="button"
          className="adm-btn"
          disabled={starting}
          onClick={() => startTransition(async () => setStart(await beginTotpEnroll()))}
        >
          {starting ? "Generating…" : "Enable 2FA"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="adm-note">
        Scan this QR code with your authenticator app, then enter the current 6-digit code to switch 2FA on.
        Nothing changes until a code verifies — you cannot lock yourself out mid-enrollment.
      </p>
      {/* data: URL QR from the server action — never remote. */}
      <img src={start.qr} alt="TOTP enrollment QR code" className="adm-qr" width={220} height={220} />
      <p className="adm-note">
        Can&rsquo;t scan? Enter this key manually: <code className="adm-secret">{start.secret}</code>
      </p>
      <form action={confirm} className="adm-inline-form">
        <label htmlFor="en-code">6-digit code</label>
        <input id="en-code" name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" autoFocus required />
        <button type="submit" className="adm-btn" disabled={confirming}>
          {confirming ? "Verifying…" : "Verify & enable"}
        </button>
      </form>
      {confirmState.error && <p className="adm-error" role="alert">{confirmState.error}</p>}
    </div>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, EMPTY);

  return (
    <form action={action} className="adm-stack-form">
      <label htmlFor="cp-cur">Current password</label>
      <input id="cp-cur" name="current" type="password" autoComplete="current-password" required />
      <label htmlFor="cp-new">New password (12+ characters)</label>
      <input id="cp-new" name="password" type="password" autoComplete="new-password" minLength={12} required />
      <label htmlFor="cp-conf">Confirm new password</label>
      <input id="cp-conf" name="confirm" type="password" autoComplete="new-password" minLength={12} required />
      {state.error && <p className="adm-error" role="alert">{state.error}</p>}
      {state.ok && <p className="adm-ok" role="status">Password updated.</p>}
      <button type="submit" className="adm-btn" disabled={pending}>
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
