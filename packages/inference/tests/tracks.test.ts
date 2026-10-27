// @vitest-environment node
import { it, expect } from "vitest";
import { adaptSamVideoText } from "../src/tracks";
import { TrackSchema } from "@worldspeak/contracts";
const frame = (n: number, id = 7) =>
  `<${n}f>${id}<|box;x1=0;y1=0;x2=4;y2=4;w=5;h=5|><|mask;x=0;y=0;data=5,5,!!!!!(QO(0lu8?|>`;
const config = {
  responseId: "synthetic-sam-video",
  label: "chair",
  width: 5,
  height: 5,
  fps: 10,
  frameCount: 10,
};
it("keeps actual object identity, sorts source frames and splits missing frames", async () => {
  const tracks = await adaptSamVideoText({
    ...config,
    text: [frame(3), frame(0), frame(1)].join("\n"),
  });
  expect(tracks).toHaveLength(2);
  expect(tracks[0]!.points.map((p) => p.t)).toEqual([0, 0.1]);
  expect(tracks[1]!.points[0]!.t).toBe(0.3);
  expect(tracks.every((t) => TrackSchema.safeParse(t).success)).toBe(true);
  expect(tracks[0]!.confidence).toBeNull();
});
it("empty matches stay empty; never fabricates keyframes", async () => {
  expect(await adaptSamVideoText({ ...config, text: "" })).toEqual([]);
});
it("duplicate frames, malformed masks and out-of-range source frames reject whole payload", async () => {
  for (const text of [
    [frame(0), frame(0)].join("\n"),
    frame(11),
    frame(0).replace("data=5,5", "data=999999,1"),
  ])
    await expect(adaptSamVideoText({ ...config, text })).rejects.toThrow();
});
