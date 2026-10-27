/** Exact redirect destinations; reject encoded separators and URL parser tricks. */
const DESTINATIONS = new Set(["/", "/history", "/favorites", "/settings", "/reset-password"]);
export function safeAuthNext(raw: string | null): string {
  return raw && DESTINATIONS.has(raw) ? raw : "/history";
}

/** Cookie-authenticated mutations must originate from this application. */
export function isSameOriginMutation(request: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  try {
    const expected = new URL(process.env.NEXT_PUBLIC_APP_URL ?? request.url).origin;
    return origin !== null && origin === expected;
  } catch { return false; }
}
