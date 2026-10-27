import { MetaProvider, runOnce } from "@worldspeak/inference";
import { makeStore } from "./store";
function required(name: string) {
  const value = process.env[name];
  if (!value) throw Error(`Missing ${name}`);
  return value;
}
// No daemon installed/provisioned by this command. Supervision/scheduling is an
// explicit operator action. Cleanup can run while model dispatch stays disabled.
const marker = process.env.WORLDSPEAK_LIVE_INFERENCE_APPROVED;
const run = makeStore({
  databaseUrl: required("INFERENCE_DATABASE_URL"),
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
  storageKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  dispatchMode: marker === "sam-only-smoke-v2" ? "sam-only" : "legacy",
});
try {
  await run.cleanupOnce();
  if (marker === "two-call-smoke-v1" || marker === "sam-only-smoke-v2") {
    await runOnce(
      run.store,
      new MetaProvider({
        apiKey: required("META_MODEL_API_KEY"),
        liveApproved: true,
      }),
    );
  }
} finally {
  await run.close();
}
