import { createHash } from "node:crypto";
import { InferenceResultSchema } from "../../packages/contracts/src/inference";
import {
  parseProviderResponse,
  type ProviderInput,
} from "../../packages/inference/src/providers";
import { adaptSamVideoText } from "../../packages/inference/src/tracks";
import { decodeRasterMask } from "../../apps/web/src/features/perception/rasterMask";
import {
  approveUtterance,
  createEmptyComposition,
  isPermitCurrent,
  issuePermit,
  reduce,
  renderComposition,
} from "../../packages/communication/src/index";
import { record } from "./evaluate";
import wire from "./fixtures/wire.v1.json";
import baseline from "./fixtures/baseline.v1.json";

export async function conformance() {
  const outcomes: {
    id: string;
    kind: string;
    expectedAccept: boolean;
    accepted: boolean;
    passed: boolean;
  }[] = [];
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const input: ProviderInput = {
    operation: "scene",
    concept: null,
    image: {
      bytes,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      width: 5,
      height: 5,
    },
  };
  if (wire.version !== "worldspeak-wire.v1")
    throw Error("Unsupported wire fixtures");
  for (const kind of ["scene", "segment"] as const)
    for (const fixture of wire[kind]) {
      let accepted = false,
        semanticMatch = false;
      try {
        const result = await parseProviderResponse(
          fixture.raw,
          {
            ...input,
            operation: kind,
            concept: kind === "segment" ? "chair" : null,
          },
          "fixture",
        );
        accepted = true;
        InferenceResultSchema.parse(result);
        if (result.provenance.source !== "fixture" || "intent" in result)
          throw Error("Truthful provenance invariant");
        if (result.segmentationMasks.some((m) => !decodeRasterMask(m)))
          throw Error("Invalid decoded raster");
        semanticMatch = true;
      } catch {
        /* Expected rejection is counted below, never silently treated as acceptance. */
      }
      outcomes.push({
        id: fixture.id,
        kind,
        expectedAccept: fixture.accept,
        accepted,
        passed: accepted === fixture.accept && (!accepted || semanticMatch),
      });
    }
  for (const fixture of wire.video) {
    let accepted = false,
      semanticMatch = true;
    try {
      const tracks = await adaptSamVideoText({
        text: fixture.text,
        responseId: "synthetic-video-v1",
        label: "chair",
        width: 5,
        height: 5,
        fps: 10,
        frameCount: 10,
      });
      accepted = true;
      semanticMatch =
        JSON.stringify(tracks.map((t) => t.points.map((p) => p.t))) ===
        JSON.stringify(fixture.expectedTimes);
    } catch {
      /* Invalid adapter response. */
    }
    outcomes.push({
      id: fixture.id,
      kind: "video",
      expectedAccept: fixture.accept,
      accepted,
      passed: accepted === fixture.accept && (!accepted || semanticMatch),
    });
  }
  for (const fixture of wire.raster) {
    const accepted = decodeRasterMask(fixture.mask) !== null;
    outcomes.push({
      id: fixture.id,
      kind: "raster",
      expectedAccept: fixture.accept,
      accepted,
      passed: accepted === fixture.accept,
    });
  }
  const invalid = outcomes.filter((o) => !o.expectedAccept),
    valid = outcomes.filter((o) => o.expectedAccept);
  return {
    cases: outcomes,
    invalidOutputs: invalid.length,
    rejectedInvalid: invalid.filter((o) => !o.accepted).length,
    invalidRejectionRate:
      invalid.filter((o) => !o.accepted).length / invalid.length,
    validOutputs: valid.length,
    acceptedValid: valid.filter((o) => o.accepted).length,
    validAcceptanceRate: valid.filter((o) => o.accepted).length / valid.length,
  };
}
export function communicationInvariants() {
  const checks: { id: string; passed: boolean }[] = [];
  const check = (id: string, run: () => boolean) => {
    let passed = false;
    try {
      passed = run();
    } catch {
      /* A thrown invariant is a failure. */
    }
    checks.push({ id, passed });
  };
  const base = createEmptyComposition("11111111-1111-4111-8111-111111111111");
  const makeText = (text: string, locale: "en" | "ta") => ({
    ...base,
    locale,
    intent: { kind: "user-text" as const, text, locale },
  });
  check(
    "exact-user-text-and-whitespace",
    () =>
      renderComposition(makeText("  My own words — Keep CASE.  ", "en"))
        .text === "  My own words — Keep CASE.  ",
  );
  check(
    "exact-tamil-user-text",
    () =>
      renderComposition(makeText("என் சொற்கள்", "ta")).text === "என் சொற்கள்",
  );
  check("locale-mismatch-rejects", () => {
    try {
      renderComposition({ ...makeText("Exact English", "en"), locale: "ta" });
      return false;
    } catch {
      return true;
    }
  });
  check("unknown-catalog-rejects", () => {
    try {
      renderComposition({
        ...base,
        intent: {
          kind: "ask-location",
          object: { catalogId: "unknown-eval-object", selectedObjectId: null },
        },
      });
      return false;
    } catch {
      return true;
    }
  });
  check("polarity-is-structural", () => {
    const want = {
      ...base,
      intent: {
        kind: "request-object" as const,
        polarity: "want" as const,
        object: { catalogId: "water", selectedObjectId: null },
      },
    };
    return (
      renderComposition(want).text === "I want water." &&
      renderComposition({
        ...want,
        intent: { ...want.intent, polarity: "do-not-want" },
      }).text === "I do not want water."
    );
  });
  const comp = makeText("My exact words", "en"),
    approved = approveUtterance(comp),
    permit = issuePermit(approved, "synthetic-gesture", 0);
  check("fresh-permit-current", () => isPermitCurrent(permit, approved));
  check(
    "revision-invalidates-permit",
    () =>
      !isPermitCurrent(
        permit,
        approveUtterance(
          reduce(
            comp,
            { type: "set-user-text", text: "Changed", locale: "en" },
            () => "unused",
          ),
        ),
      ),
  );
  check(
    "text-tampering-invalidates-permit",
    () => !isPermitCurrent(permit, { ...approved, exactText: "Tampered" }),
  );
  check(
    "locale-change-invalidates-permit",
    () => !isPermitCurrent(permit, { ...approved, locale: "ta" }),
  );
  check(
    "result-contract-rejects-inferred-intent",
    () =>
      InferenceResultSchema.safeParse(baseline.scenes[0]!.result).success &&
      !InferenceResultSchema.safeParse({
        ...baseline.scenes[0]!.result,
        intent: "want",
      }).success,
  );
  check("strict-dataset-records", () => {
    try {
      record({ expected: [], hidden: "value" }, ["expected"]);
      return false;
    } catch {
      return true;
    }
  });
  return {
    checks,
    passed: checks.filter((c) => c.passed).length,
    total: checks.length,
    passRate: checks.filter((c) => c.passed).length / checks.length,
  };
}
