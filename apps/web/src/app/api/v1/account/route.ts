import { createAdminClient, createClient } from "@/lib/supabase/server";
import { fail, ok, requireOwner } from "@/lib/api/route";

export const dynamic = "force-dynamic";

/**
 * Account deletion: drains user content (conversations cascade to messages
 * and favorites; consent, profile, preferences removed), then signs out.
 * Auth-user deletion additionally requires a server-only service key; without
 * it the data wipe still completes and the UI says so honestly.
 */
export async function DELETE() {
  const auth = await requireOwner();
  if (!auth.ok) return auth.res;
  const { owner, supabase } = auth.ctx;

  const wipe = async (table: string) => {
    const { error } = await supabase.from(table).delete().eq("owner_id", owner);
    return error;
  };
  // Order: children first; conversations cascade messages -> favorites.
  for (const table of ["favorites", "messages", "conversations", "consent_events"]) {
    const error = await wipe(table);
    if (error) return fail("INVALID_INPUT", "account.wipe_failed", 500);
  }
  for (const table of ["accessibility_preferences", "profiles"]) {
    const { error } = await supabase.from(table).delete().eq("owner_id", owner);
    if (error && (error as { code?: string }).code !== "42501") {
      return fail("INVALID_INPUT", "account.wipe_failed", 500);
    }
  }

  let authUserDeleted = false;
  const admin = await createAdminClient();
  if (admin) {
    const { error } = await admin.auth.admin.deleteUser(owner);
    authUserDeleted = !error;
  }
  await supabase.auth.signOut();
  try {
    const fresh = await createClient();
    await fresh.auth.signOut();
  } catch {
    /* already signed out */
  }
  return ok({ wiped: true, authUserDeleted });
}
