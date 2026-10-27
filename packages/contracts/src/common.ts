import { z } from "zod";

/** Runtime brands and shared primitives (architecture section D). */

export const LocaleSchema = z.enum(["en", "ta"]);
export type Locale = z.infer<typeof LocaleSchema>;

export const IdSchema = z.string().uuid();
export type ID = z.infer<typeof IdSchema>;

export const ErrorCodeSchema = z.enum([
  "INVALID_INPUT",
  "UNAUTHENTICATED",
  "NOT_FOUND",
  "CONSENT_REQUIRED",
  "BUDGET_EXCEEDED",
  "RATE_LIMITED",
  "PROVIDER_UNAVAILABLE",
  "INVALID_MODEL_OUTPUT",
  "UNSUPPORTED_MEDIA",
  "CANCELED",
  "TIMEOUT_UNCERTAIN",
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export type Result<T> =
  | { ok: true; requestId: ID; data: T }
  | {
      ok: false;
      requestId: ID;
      error: { code: ErrorCode; messageKey: string; retryAfterMs: number | null };
    };
