import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import NotConfigured from "@/components/NotConfigured";

export const dynamic = "force-dynamic";

/**
 * Authenticated area. Guests are redirected to sign-in (with return path);
 * when the cloud gate is still closed, an honest notice renders instead and
 * nothing redirects or fakes a session.
 */
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return (
      <section className="panel" aria-labelledby="private-h">
        <h2 id="private-h">Saved stuff</h2>
        <NotConfigured what="History and favorites" />
        <p>
          <a href="/">Back to the essential board</a>
        </p>
      </section>
    );
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/sign-in?next=/history");
  return <>{children}</>;
}
