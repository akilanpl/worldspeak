/** Rows derived from the actual WorldSpeak hosted schema (generated 27 Oct 2026).
 * Literal refinements reflect CHECK constraints not represented by codegen.
 */
import type { Database } from "./database.types";
export type { Database, Json } from "./database.types";
export type Locale = "en" | "ta";
type Tables = Database["public"]["Tables"];
export type ProfileRow = Tables["profiles"]["Row"];
export type AccessibilityPreferencesRow = Omit<Tables["accessibility_preferences"]["Row"], "ui_locale" | "communication_locale"> & { ui_locale: Locale; communication_locale: Locale };
export type ConsentScope = "scene_upload" | "video_upload" | "partner_audio" | "pictogram_generation" | "history";
export type ConsentEventRow = Tables["consent_events"]["Row"];
export type ConversationRow = Omit<Tables["conversations"]["Row"], "language"> & { language: Locale };
export type MessageKind = "communication" | "partner";
export type MessageOrigin = "template" | "user_text" | "partner_transcript";
export type MessageRow = Omit<Tables["messages"]["Row"], "locale" | "kind" | "origin"> & { locale: Locale; kind: MessageKind; origin: MessageOrigin };
export type FavoriteRow = Tables["favorites"]["Row"];
