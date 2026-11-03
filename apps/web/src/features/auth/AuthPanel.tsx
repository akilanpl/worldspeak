"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import NotConfigured from "@/components/NotConfigured";

function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
  return `${base.replace(/\/$/, "")}${path}`;
}

/** Shared email/Google auth panel. Google setup is a human console step. */
export default function AuthPanel({ mode, callbackReason }: {
  mode: "sign-in" | "sign-up";
  callbackReason?: "callback_missing_code" | "callback_exchange_failed" | "auth_unavailable";
}) {
  const callbackNotice = callbackReason === "callback_missing_code"
    ? "Sign-in returned without a confirmation code. Start one new sign-in from this page and complete it in the same browser and tab."
    : callbackReason === "callback_exchange_failed"
      ? "Sign-in could not establish a session. Start one new sign-in from this page in the same browser and tab; finish it promptly and avoid overlapping sign-in attempts."
      : callbackReason === "auth_unavailable"
        ? "Sign-in is not configured. Contact the WorldSpeak operator."
        : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();
  const router = useRouter();

  async function withClient<T>(fn: (c: ReturnType<typeof createClient>) => Promise<T>): Promise<T | null> {
    if (!configured) {
      setNotice("Sign-in is not available until the Supabase project is supplied.");
      return null;
    }
    setBusy(true);
    setNotice(null);
    try {
      return await fn(createClient());
    } catch {
      setNotice("Sign-in could not be completed. Please try one new sign-in in this browser.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="auth-h">
      <h2 id="auth-h">{mode === "sign-in" ? "Sign in" : "Create account"}</h2>
      <NotConfigured what="Sign-in" />
      {callbackNotice && <p className="status" role="status">{callbackNotice}</p>}
      {configured && (
        <>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await withClient(async (c) => {
                const res =
                  mode === "sign-in"
                    ? await c.auth.signInWithPassword({ email, password })
                    : await c.auth.signUp({
                        email,
                        password,
                        options: { emailRedirectTo: appUrl("/auth/callback?next=/history") },
                      });
                if (res.error) {
                  setNotice(res.error.message);
                  return;
                }
                if (mode === "sign-up" && !res.data.session) {
                  setNotice("Check your email to confirm, then sign in.");
                  return;
                }
                router.push("/history");
              });
            }}
          >
            <label className="field" htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              className="field"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="field" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              className="field"
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="btn-row">
              <button type="submit" className="btn" disabled={busy}>
                {mode === "sign-in" ? "Sign in" : "Sign up"}
              </button>
            </div>
          </form>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() =>
                withClient(async (c) => {
                  const { error } = await c.auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: appUrl("/auth/callback?next=/history") },
                  });
                  if (error) setNotice("Google sign-in could not start. Please try one new sign-in in this browser.");
                })
              }
            >
              Continue with Google
            </button>
          </div>
          {mode === "sign-in" ? (
            <p className="status">
              <a href="/sign-up">Create an account</a> · <a href="/forgot-password">Forgot password?</a>
            </p>
          ) : (
            <p className="status">
              <a href="/sign-in">Already have an account? Sign in</a>
            </p>
          )}
        </>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
