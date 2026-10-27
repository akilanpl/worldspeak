import { Suspense } from "react";
import type { Composition } from "@worldspeak/contracts";
import { parseIntent } from "@worldspeak/contracts";
import { CATALOG_VERSION } from "@worldspeak/catalog";
import ComposerEntry from "@/features/integration/ComposerEntry";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Replay entry (?load=messageId): loads the owner's exact saved message into
 * the composer as a new preview. Never auto-speaks; Speak needs a fresh click.
 */
async function loadInitial(messageId: string | undefined): Promise<Composition | undefined> {
  if (!messageId || !isSupabaseConfigured()) return undefined;
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return undefined;
    const { data, error } = await supabase
      .from("messages")
      .select("id,text,locale,origin,revision,intent,template_version,text_hash")
      .eq("owner_id", user.user.id)
      .eq("id", messageId)
      .maybeSingle();
    if (error || !data) return undefined;
    const row = data as {
      id: string;
      text: string;
      locale: "en" | "ta";
      origin: string;
      revision: number;
      intent: unknown;
      template_version: string | null;
      text_hash: string;
    };
    if (row.origin === "partner_transcript") return undefined;
    const intent = parseIntent({ kind: "user-text", text: row.text, locale: row.locale });
    return {
      id: row.id,
      revision: row.revision,
      intent,
      locale: row.locale,
      catalogVersion: CATALOG_VERSION,
    };
  } catch {
    return undefined;
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ load?: string; handoff?: string }>;
}) {
  const { load, handoff } = await searchParams;
  const initial = await loadInitial(load);
  return (
    <>
      <section className="panel" aria-labelledby="future-h" style={{ marginBottom: "1rem" }}>
        <h2 id="future-h">Choose how to start</h2>
        <p className="status">
          Point at the board, identify an object with the camera, or track one in a short clip —
          every path ends at the same preview, and nothing speaks until you press Speak.
          The essential board below works fully offline after one online visit.
        </p>
        <p>
          <a className="btn btn-secondary" href="/offline" style={{ textDecoration: "none", display: "inline-block" }}>
            Open offline board
          </a>{" "}
          <a className="btn btn-secondary" href="/perception" style={{ textDecoration: "none", display: "inline-block" }}>
            Identify with camera
          </a>{" "}
          <a className="btn btn-secondary" href="/video" style={{ textDecoration: "none", display: "inline-block" }}>
            Track in a clip
          </a>
        </p>
      </section>
      <Suspense>
        <ComposerEntry
          key={handoff ?? "board"}
          serverInitial={initial}
          handoffKey={handoff ?? null}
        />
      </Suspense>
    </>
  );
}
