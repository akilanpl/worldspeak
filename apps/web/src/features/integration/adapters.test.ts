import { describe, expect, it } from "vitest";
import {
  adaptDetectionList,
  adaptTrackList,
  toObjectTrack,
  toPerceivedObject,
} from "./adapters";

const box = { x1: 0.1, y1: 0.2, x2: 0.4, y2: 0.8 };
const mask = [
  { x: 0.1, y: 0.2 },
  { x: 0.4, y: 0.2 },
  { x: 0.4, y: 0.8 },
  { x: 0.1, y: 0.8 },
];

describe("model detection adapter", () => {
  it("accepts a well-formed model detection as a model-origin object", () => {
    const obj = toPerceivedObject(
      { label: "cup", catalogId: null, box, mask, confidence: 0.82 },
      "m1",
    );
    expect(obj).toMatchObject({
      id: "m1",
      labelEn: "cup",
      labelTa: null,
      catalogId: null,
      origin: "model",
      confidence: 0.82,
    });
  });

  it("rejects invalid geometry, labels, and confidence", () => {
    const base = { label: "cup", catalogId: null, box, mask, confidence: null };
    expect(toPerceivedObject({ ...base, box: { ...box, x1: 0.9 } }, "x")).toBeNull();
    expect(toPerceivedObject({ ...base, box: { ...box, x2: 2 } }, "x")).toBeNull();
    expect(toPerceivedObject({ ...base, mask: [{ x: 0.5, y: 0.5 }] }, "x")).toBeNull();
    expect(toPerceivedObject({ ...base, mask: [{ x: 5, y: 0.5 }, { x: 0.6, y: 0.5 }, { x: 0.6, y: 0.6 }] }, "x")).toBeNull();
    expect(toPerceivedObject({ ...base, label: "" }, "x")).toBeNull();
    expect(toPerceivedObject({ ...base, confidence: 1.5 }, "x")).toBeNull();
    expect(toPerceivedObject(null as never, "x")).toBeNull();
  });

  it("counts batch rejections without throwing", () => {
    const { accepted, rejected } = adaptDetectionList(
      [
        { label: "cup", catalogId: "cup", box, mask: null, confidence: null },
        { label: "", catalogId: null, box, mask: null, confidence: null },
        "garbage",
      ],
      (() => { let n = 0; return () => `m-${n++}`; })(),
    );
    expect(accepted).toHaveLength(1);
    expect(rejected).toBe(2);
    expect(adaptDetectionList("nope", () => "m")).toEqual({ accepted: [], rejected: 0 });
  });
});

describe("model track adapter", () => {
  const points = [
    { t: 0, box, mask: null },
    { t: 2, box: { ...box, x1: 0.2, x2: 0.5 }, mask: null },
  ];

  it("accepts a well-formed model track", () => {
    const track = toObjectTrack({
      trackId: "mt-1",
      label: "cup",
      catalogId: null,
      points,
      confidence: null,
    });
    expect(track).toMatchObject({ trackId: "mt-1", origin: "model", confidence: null });
    expect(track?.points).toHaveLength(2);
  });

  it("rejects unsorted times, empty points, and bad frames", () => {
    const base = { trackId: "mt", label: "cup", catalogId: null, confidence: null };
    expect(toObjectTrack({ ...base, points: [] })).toBeNull();
    expect(toObjectTrack({ ...base, points: [...points].reverse() })).toBeNull();
    expect(toObjectTrack({ ...base, points: [{ t: -1, box, mask: null }] })).toBeNull();
    expect(toObjectTrack({ ...base, trackId: "", points })).toBeNull();
    expect(toObjectTrack({ ...base, points, confidence: 2 })).toBeNull();
  });

  it("counts batch rejections without throwing", () => {
    const { accepted, rejected } = adaptTrackList([
      { trackId: "ok", label: "cup", catalogId: null, points, confidence: null },
      { trackId: "bad", label: "cup", catalogId: null, points: [], confidence: null },
    ]);
    expect(accepted).toHaveLength(1);
    expect(rejected).toBe(1);
  });
});
