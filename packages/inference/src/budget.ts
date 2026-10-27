/** No floating dollars. Prices verified 2026-10-27; round UP to micro-USD. */
export const PRICING_VERSION = "meta-standard-2026-10-27";
export const SPARK_OUTPUT_CAP = 2048;
export const SPARK_INPUT_CAP = 10000;
export const RESERVATION = { scene: 25000, segment: 2500 } as const;
export function sparkCost(input: number, output: number): number {
  for (const x of [input, output])
    if (!Number.isSafeInteger(x) || x < 0) throw Error("Invalid usage");
  // $1.25/M input, $4.25/M output. Ignore cache discounts conservatively.
  const value = Number(
    (BigInt(input) * 125n + BigInt(output) * 425n + 99n) / 100n,
  );
  if (!Number.isSafeInteger(value)) throw Error("Usage cost overflow");
  return value;
}
