import { fail, ok, readJson, requireOwner } from "@/lib/api/route";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * Atomic owner-scoped erasure. Auth identity removal is a separate, explicitly
 * unavailable operation until recent reauthentication and admin cleanup exist.
 * Never partially erase records and then report an account deletion failure.
 */
export async function DELETE(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.res;
  const { owner, supabase } = auth.ctx;
  const scope = new URL(request.url).searchParams.get("scope");
  if (request.headers.get("x-worldspeak-confirm") !== "erase") return fail("INVALID_INPUT", "account.confirm_required", 400);
  if (scope === "identity") {
    const admin = await createAdminClient();
    if (!admin) return fail("PROVIDER_UNAVAILABLE", "account.identity_removal_unavailable", 503);
    let body: unknown;
    try { body = await readJson(request); } catch { return fail("INVALID_INPUT", "account.reauth_required", 400); }
    const proof = z.object({ password: z.string().min(8).max(256) }).strict().safeParse(body);
    if (!proof.success) return fail("INVALID_INPUT", "account.reauth_required", 400);
    const user = await supabase.auth.getUser();
    if (!user.data.user?.email) return fail("UNAUTHENTICATED", "account.reauth_required", 401);
    const reauth = await supabase.auth.signInWithPassword({ email: user.data.user.email, password: proof.data.password });
    if (reauth.error || reauth.data.user?.id !== owner) return fail("UNAUTHENTICATED", "account.reauth_failed", 401);
    // Auth deletion cascades relational data atomically. If Storage still has
    // owned files, provider deletion may fail: do not pre-erase anything.
    const deleted = await admin.auth.admin.deleteUser(owner);
    if (deleted.error) return fail("PROVIDER_UNAVAILABLE", "account.identity_removal_failed", 503);
    await supabase.auth.signOut().catch(() => {});
    return ok({ wiped: true, authUserDeleted: true });
  }
  if (scope !== "content" && scope !== "data") return fail("INVALID_INPUT", "account.scope_required", 400);
  const { error } = await supabase.rpc("erase_my_saved_data", { reset_settings: scope === "data" });
  if (error) return fail("PROVIDER_UNAVAILABLE", "account.wipe_failed", 503);
  return ok({ wiped: true, authUserDeleted: false, settingsReset: scope === "data" });
}
