/* eslint-disable no-console -- fixed operational status only */
import { makeStore } from "./store";
function required(name: string) {
  const value = process.env[name];
  if (!value) throw Error("Missing cleanup configuration");
  return value;
}
let close: (() => Promise<void>) | undefined;
try {
  // This entry point has no provider construction or inference-dispatch path.
  const run = makeStore({
    databaseUrl: required("INFERENCE_DATABASE_URL"),
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    storageKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  });
  close = run.close;
  console.log(
    JSON.stringify({ cleanup: (await run.cleanupOnce()) ? "processed" : "idle" }),
  );
} catch (error) {
  const code = (error as { code?: unknown }).code;
  console.error(
    JSON.stringify({
      cleanup: "failed",
      code: typeof code === "string" && /^[A-Z0-9_]+$/.test(code)
        ? code : "CLEANUP_FAILED",
    }),
  );
  process.exitCode = 1;
} finally {
  await close?.();
}
