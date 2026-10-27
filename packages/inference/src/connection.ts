/** Server-only inference connection guard. Never include raw URLs in errors. */
export const WORLD_PROJECT_REF = "cafkyowssdemzivhzxbb";
export function workerDatabaseOptions(raw: string): {
  url: string;
  ssl: false | { rejectUnauthorized: true };
} {
  try {
    const url = new URL(raw);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw Error();
    const user = decodeURIComponent(url.username);
    if (
      !user ||
      [
        "postgres",
        "supabase_admin",
        "supabase_auth_admin",
        "authenticator",
        "authenticated",
        "anon",
        "service_role",
      ].includes(user.split(".")[0]!)
    )
      throw Error();
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (local) {
      if (!/^\/worldspeak_phase2(?:_[a-zA-Z0-9_]+)?$/.test(url.pathname))
        throw Error();
      return { url: raw, ssl: false };
    }
    if (
      url.hostname !== `db.${WORLD_PROJECT_REF}.supabase.co` &&
      !(
        url.hostname.endsWith(".pooler.supabase.com") &&
        user.endsWith(`.${WORLD_PROJECT_REF}`)
      )
    )
      throw Error();
    // Explicit driver option overrides URI/env sslmode, including insecure ones.
    return { url: raw, ssl: { rejectUnauthorized: true } };
  } catch {
    throw Error("Invalid or unauthorized inference database configuration");
  }
}
export function assertWorldSpeakStorageUrl(raw: string): void {
  try {
    const u = new URL(raw);
    if (
      u.protocol !== "https:" ||
      u.hostname !== `${WORLD_PROJECT_REF}.supabase.co` ||
      u.port ||
      u.username ||
      u.password ||
      u.pathname !== "/" ||
      u.search ||
      u.hash
    )
      throw Error();
  } catch {
    throw Error("Inference Storage must use the verified WorldSpeak project");
  }
}
/** Static query, never constructed from user input. Dedicated worker membership
 * is required; superuser/role-management/RLS-bypass/table-admin logins reject. */
export const WORKER_CAPABILITY_SQL = `select
 pg_has_role(current_user,'worldspeak_inference_worker','member')
 and not (select rolsuper or rolcreaterole or rolbypassrls from pg_roles where rolname=current_user)
 and not has_table_privilege(current_user,'world_inference.budgets','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
 and not has_function_privilege(current_user,'world_inference.authorize_first_smoke(uuid)','execute') as allowed`;
