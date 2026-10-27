"use client";

import type { Database } from "@worldspeak/db";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

/** Browser client. Callers must check isSupabaseConfigured() first. */
export function createClient() {
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key) {
    throw new Error("Supabase is not configured (cloud provisioning gate).");
  }
  return createBrowserClient<Database>(url, key);
}
