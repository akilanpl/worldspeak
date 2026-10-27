/**
 * Supabase configuration state. Phase 2 prepares everything locally; the
 * project URL/anon key arrive at the cloud provisioning gate (human step).
 * Every consumer must branch on isSupabaseConfigured() and render an honest
 * "not configured" state instead of crashing or faking auth.
 */
export function supabaseUrl(): string | null {
  return process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? null;
}

export function supabaseAnonKey(): string | null {
  return process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? null;
}

export function isSupabaseConfigured(): boolean {
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  return Boolean(url && key && url.startsWith("https://"));
}
