"use client";

import { useActionState } from "react";
import { loginAction, setupAction, totpAction, type AuthFormState } from "./actions";

const EMPTY: AuthFormState = {};

export default function LoginForm({ mode }: { mode: "setup" | "login" }) {
  const [loginState, login, loginPending] = useActionState(loginAction, EMPTY);
  const [setupState, setup, setupPending] = useActionState(setupAction, EMPTY);
  const [totpState, totp, totpPending] = useActionState(totpAction, EMPTY);

  if (mode === "setup") {
    return (
      <form action={setup} className="adm-auth-form">
        <h1>First-time setup</h1>
        <p className="adm-note">
          No admin password exists yet. Enter the one-time setup token and choose a password
          (12+ characters). The token dies the moment setup completes.
        </p>
        <label htmlFor="su-token">Setup token</label>
        <input id="su-token" name="token" type="password" autoComplete="off" required />
        <label htmlFor="su-pass">New password</label>
        <input id="su-pass" name="password" type="password" autoComplete="new-password" minLength={12} required />
        <label htmlFor="su-conf">Confirm password</label>
        <input id="su-conf" name="confirm" type="password" autoComplete="new-password" minLength={12} required />
        {setupState.error && <p className="adm-error" role="alert">{setupState.error}</p>}
        <button type="submit" className="adm-btn" disabled={setupPending}>
          {setupPending ? "Setting up…" : "Complete setup"}
        </button>
      </form>
    );
  }

  // Two-step: password → (if 2FA enabled) 6-digit code.
  const stage = totpState.stage || loginState.stage;
  if (stage === "totp") {
    return (
      <form action={totp} className="adm-auth-form">
        <h1>Two-factor code</h1>
        <p className="adm-note">Enter the 6-digit code from your authenticator app.</p>
        <label htmlFor="li-code">Code</label>
        <input
          id="li-code"
          name="code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          autoFocus
          required
        />
        {totpState.error && <p className="adm-error" role="alert">{totpState.error}</p>}
        <button type="submit" className="adm-btn" disabled={totpPending}>
          {totpPending ? "Checking…" : "Verify"}
        </button>
      </form>
    );
  }

  return (
    <form action={login} className="adm-auth-form">
      <h1>Admin sign-in</h1>
      <label htmlFor="li-pass">Password</label>
      <input id="li-pass" name="password" type="password" autoComplete="current-password" required />
      {(loginState.error || totpState.error) && (
        <p className="adm-error" role="alert">{loginState.error || totpState.error}</p>
      )}
      <button type="submit" className="adm-btn" disabled={loginPending}>
        {loginPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
