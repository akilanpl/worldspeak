import type { Composition } from "@worldspeak/contracts";

/**
 * Optional provider realization interface, reserved for later phases.
 * Phase 1 has no implementation: `realizeWithProvider` always rejects, and
 * any provider-shaped result must be validated through the deterministic
 * renderer before it could enter the communication path. No fake result may
 * ever be labeled live.
 */
export interface RealizationPlan {
  templateId: string;
  slots: Record<string, string>;
  echoedIntent: unknown;
}

export async function realizeWithProvider(_comp: Composition): Promise<RealizationPlan> {
  throw new Error("Provider realization is not available in Phase 1 (local-only slice).");
}
