import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { safeAuthNext } from "@/lib/auth-security";

/**
 * OAuth/email-confirm/recovery callback. Exchanges the code for a session,
 * then redirects only to an exact local path (never an arbitrary URL).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next") ?? "/history";
  const next = safeAuthNext(rawNext);
  // Emit only fixed categories; never forward provider descriptions or auth codes.
  if (!isSupabaseConfigured()) redirect("/sign-in?reason=auth_unavailable");
  if (!code) redirect("/sign-in?reason=callback_missing_code");
  let exchangeFailed: boolean;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    exchangeFailed = Boolean(error);
  } catch {
    exchangeFailed = true;
  }
  if (exchangeFailed) redirect("/sign-in?reason=callback_exchange_failed");
  redirect(next);
}
