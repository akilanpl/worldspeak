"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import NotConfigured from "@/components/NotConfigured";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const configured = isSupabaseConfigured();
  const router = useRouter();
  return (
    <section className="panel" aria-labelledby="reset-h">
      <h2 id="reset-h">Choose a new password</h2>
      <NotConfigured what="Password reset" />
      {configured && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const { error } = await createClient().auth.updateUser({ password });
            if (error) {
              setNotice(error.message);
              return;
            }
            router.push("/history");
          }}
        >
          <label className="field" htmlFor="reset-password">New password</label>
          <input
            id="reset-password"
            className="field"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="btn-row">
            <button type="submit" className="btn">Update password</button>
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
