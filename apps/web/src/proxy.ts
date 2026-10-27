import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Session refresh boundary (Next 16 proxy convention). No-op until the
 * cloud gate supplies configuration; never redirects guests itself.
 */
export default async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return response;
  const supabase = createServerClient(supabaseUrl() ?? "", supabaseAnonKey() ?? "", {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|offline/|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|css|js)).*)"],
};
