import { createClient } from "@/lib/supabase/client";

/**
 * Meta-analysis eligibility. Inference routes require a verified owner
 * session (`requireOwner`); guests keep the fully local fixture path and
 * must never see an upload-to-Meta option. Test seam: pass an explicit
 * session provider instead of touching the Supabase client.
 */
export type AnalysisEligibility = "unknown" | "guest" | "ready";

export async function getAnalysisEligibility(
  getSession: () => Promise<unknown> = defaultSession,
): Promise<Exclude<AnalysisEligibility, "unknown">> {
  try {
    const result = await getSession();
    if (result !== null && typeof result === "object") {
      const r = result as Record<string, unknown>;
      if ("data" in r) {
        const data = r["data"] as { session?: unknown } | null | undefined;
        return data?.session ? "ready" : "guest";
      }
      // Default Supabase provider already unwraps `{ data }`.
      if ("session" in r) return r["session"] ? "ready" : "guest";
      if ("user" in r) return r["user"] ? "ready" : "guest";
    }
    return "guest";
  } catch {
    return "guest";
  }
}

async function defaultSession() {
  const { data } = await createClient().auth.getSession();
  return data;
}
