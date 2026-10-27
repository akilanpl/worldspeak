import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Honest gate: cloud project not supplied yet, so auth cannot run. */
export default function NotConfigured({ what }: { what: string }) {
  if (isSupabaseConfigured()) return null;
  return (
    <p className="notice" role="status" data-testid="auth-not-configured">
      {what} needs a Supabase project, which has not been supplied yet (cloud
      provisioning gate). The essential board below works without sign-in.
    </p>
  );
}
