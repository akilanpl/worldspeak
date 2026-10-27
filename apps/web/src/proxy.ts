import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Session refresh boundary (Next 16 proxy convention). No-op until the
 * cloud gate supplies configuration; never redirects guests itself.
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return response;
  const supabase = createServerClient(supabaseUrl() ?? "", supabaseAnonKey() ?? "", {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  try {
    await supabase.auth.getUser();
  } catch {
    // Protected routes reverify auth; the guest board stays usable offline.
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|offline/|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|css|js)).*)"],
};
