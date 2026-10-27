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
export default function AuthPanel({ mode }: { mode: "sign-in" | "sign-up" }) {
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
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Sign-in failed.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="auth-h">
      <h2 id="auth-h">{mode === "sign-in" ? "Sign in" : "Create account"}</h2>
      <NotConfigured what="Sign-in" />
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
                withClient((c) =>
                  c.auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: appUrl("/auth/callback?next=/history") },
                  }),
                )
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
