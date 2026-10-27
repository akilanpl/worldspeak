/**
 * Hand-maintained row types mirroring supabase/migrations/202610270001_core.sql.
 * Replace with `supabase gen types` output at the cloud provisioning gate;
 * until then this file is the type source of truth (no ORM).
 */

export type Locale = "en" | "ta";

export interface ProfileRow {
  owner_id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface AccessibilityPreferencesRow {
  owner_id: string;
  ui_locale: Locale;
  communication_locale: Locale;
  text_scale: number;
  high_contrast: boolean;
  reduce_motion: boolean;
  target_size: number;
  speech_rate: number;
  voice_uri: string | null;
  history_enabled: boolean;
  revision: number;
  created_at: string;
  updated_at: string;
}

export type ConsentScope =
  | "scene_upload"
  | "video_upload"
  | "partner_audio"
  | "pictogram_generation"
  | "history";

export interface ConsentEventRow {
  id: string;
  owner_id: string;
  scope: ConsentScope;
  decision: "grant" | "revoke";
  notice_version: string;
  capture_id: string | null;
  created_at: string;
}

export interface ConversationRow {
  id: string;
  owner_id: string;
  title: string;
  language: Locale;
  created_at: string;
  updated_at: string;
}

export type MessageKind = "communication" | "partner";
export type MessageOrigin = "template" | "user_text" | "partner_transcript";

export interface MessageRow {
  id: string;
  owner_id: string;
  conversation_id: string;
  kind: MessageKind;
  text: string;
  locale: Locale;
  intent: unknown;
  origin: MessageOrigin;
  revision: number;
  text_hash: string;
  template_version: string | null;
  client_event_id: string;
  created_at: string;
}

export interface FavoriteRow {
  id: string;
  owner_id: string;
  message_id: string;
  created_at: string;
}
