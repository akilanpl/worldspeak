import { describe, expect, it } from "vitest";
import { getAnalysisEligibility } from "./session";

describe("getAnalysisEligibility", () => {
  it("reports ready for a verified session and guest otherwise", async () => {
    await expect(getAnalysisEligibility(async () => ({ data: { session: { user: "u" } } }))).resolves.toBe("ready");
    await expect(getAnalysisEligibility(async () => ({ data: { session: null } }))).resolves.toBe("guest");
    await expect(getAnalysisEligibility(async () => ({ session: { user: "u" } }))).resolves.toBe("ready");
    await expect(getAnalysisEligibility(async () => ({ session: null }))).resolves.toBe("guest");
    await expect(getAnalysisEligibility(async () => ({ user: "u" }))).resolves.toBe("ready");
    await expect(getAnalysisEligibility(async () => ({ user: null }))).resolves.toBe("guest");
    await expect(getAnalysisEligibility(async () => null)).resolves.toBe("guest");
    await expect(
      getAnalysisEligibility(async () => {
        throw new Error("down");
      }),
    ).resolves.toBe("guest");
  });
});
