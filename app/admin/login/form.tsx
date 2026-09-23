"use client";

/**
 * Phase 7A admin sign-in form (client).
 *
 * POSTs { identifier, password } to /api/admin/login. The session token is
 * set by the server as an HttpOnly cookie — this form never sees it and
 * never stores anything in localStorage/sessionStorage.
 */

import { useState } from "react";

export function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      if (response.ok) {
        window.location.replace("/admin");
        return;
      }
      let message = "Invalid credentials.";
      try {
        const payload = (await response.json()) as {
          error?: { message?: string };
        };
        if (
          response.status === 401 &&
          typeof payload.error?.message === "string"
        ) {
          message = payload.error.message;
        } else if (response.status === 429) {
          message = "Too many attempts. Please wait and try again.";
        } else if (response.status >= 500) {
          message = "The admin service is unavailable right now.";
        }
      } catch {
        // Keep the generic message — never render raw response text.
      }
      setError(message);
    } catch {
      setError("The admin service is unavailable right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} aria-label="Admin sign in">
      <div>
        <label htmlFor="admin-identifier">Username</label>
        <input
          id="admin-identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          disabled={busy}
          required
        />
      </div>
      <div>
        <label htmlFor="admin-password">Password</label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={busy}
          required
        />
      </div>
      {error ? (
        <p role="alert" className="deploy-muted">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
