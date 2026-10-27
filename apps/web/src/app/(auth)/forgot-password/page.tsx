"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import NotConfigured from "@/components/NotConfigured";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const configured = isSupabaseConfigured();
  return (
    <section className="panel" aria-labelledby="forgot-h">
      <h2 id="forgot-h">Reset password</h2>
      <NotConfigured what="Password reset" />
      {configured && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const base = (process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin).replace(/\/$/, "");
            const { error } = await createClient().auth.resetPasswordForEmail(email, {
              redirectTo: `${base}/auth/callback?next=/reset-password`,
            });
            setNotice(error ? error.message : "Check your email for a reset link.");
          }}
        >
          <label className="field" htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            className="field"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="btn-row">
            <button type="submit" className="btn">Send reset link</button>
          </div>
        </form>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
