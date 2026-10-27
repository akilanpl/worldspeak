import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "./env";

/** Server client (user JWT preserved, so RLS applies). Throws if unconfigured. */
export async function createClient() {
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key) {
    throw new Error("Supabase is not configured (cloud provisioning gate).");
  }
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a Server Component; proxy refreshes instead */
        }
      },
    },
  });
}

/**
 * Verified owner for mutations. A client-provided session object is never
 * authorization; only the server-verified user stands in for auth.uid().
 */
export async function verifiedOwnerId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

/** Admin client for unavoidable Auth operations (account deletion only). */
export async function createAdminClient() {
  const url = supabaseUrl();
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? null;
  if (!url || !serviceKey) return null;
  const { createClient: createAdmin } = await import("@supabase/supabase-js");
  return createAdmin(url, serviceKey, { auth: { persistSession: false } });
}
