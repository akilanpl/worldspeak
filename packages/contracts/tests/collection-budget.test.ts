import { expect, it } from "vitest";
import { z } from "zod";

it("rejects oversized constrained arrays before per-element validation allocates issues", () => {
  let elementChecks = 0;
  const schema = z.array(z.custom(() => { elementChecks++; return false; })).max(32);
  const result = schema.safeParse(Array.from({ length: 100_000 }, () => null));
  expect(result.success).toBe(false);
  if (result.success) throw new Error("Oversized collection was accepted");
  expect(result.error.issues).toHaveLength(1);
  expect(result.error.issues[0]?.code).toBe("too_big");
  expect(elementChecks).toBe(0);
});
