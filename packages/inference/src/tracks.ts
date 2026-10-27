import {
  parseVideoStream,
  recordsOfKind,
  type ResponsesEvent,
} from "@meta-sam/parser";
import { TrackSchema, type ModelTrack } from "@worldspeak/contracts";
/** Pure normalization boundary for a FUTURE admitted SAM video response.
 * Does not call a provider, upload a clip, or pretend independent stills track.
 * Source frame indexes map through an explicit normalized constant frame rate.
 * Gaps split tracks so UI interpolation cannot invent presence through occlusion.
 */
export async function adaptSamVideoText(input: {
  text: string;
  responseId: string;
  label: string;
  width: number;
  height: number;
  fps: number;
  frameCount: number;
}): Promise<ModelTrack[]> {
  const { text, width, height, fps, frameCount } = input;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 512 ||
    height > 512 ||
    !Number.isFinite(fps) ||
    fps <= 0 ||
    fps > 30 ||
    !Number.isInteger(frameCount) ||
    frameCount < 1 ||
    frameCount > 300 ||
    text.length > 12000000
  )
    throw Error("Unsupported normalized clip");
  let decodedPixels = 0;
  for (const m of text.matchAll(/;data=(\d+),(\d+),/g)) {
    if (
      Number(m[1]) < 1 ||
      Number(m[2]) < 1 ||
      Number(m[1]) > 512 ||
      Number(m[2]) > 512
    )
      throw Error("Mask bounds");
    decodedPixels += Number(m[1]) * Number(m[2]);
    if (decodedPixels > 8388608) throw Error("Decoded mask quota");
  }
  for (const m of text.matchAll(/;w=(\d+);h=(\d+)/g))
    if (Number(m[1]) !== width || Number(m[2]) !== height)
      throw Error("Source dimensions");
  for (const m of text.matchAll(/<(\d+)f>/g))
    if (Number(m[1]) >= frameCount) throw Error("Invalid source frame");
  async function* events(): AsyncGenerator<ResponsesEvent> {
    yield {
      type: "response.output_text.done",
      text,
      item_id: "sam-video",
      output_index: 0,
      content_index: 0,
    };
    yield { type: "response.completed" };
  }
  const parsed = await parseVideoStream(events()).finalResult;
  if (
    parsed.outcome.status !== "completed" ||
    parsed.diagnostics.length ||
    recordsOfKind(parsed.records, "text").some((r) => r.text.trim())
  )
    throw Error("Invalid video segmentation");
  const byId = new Map<
    string,
    Map<
      number,
      {
        box: { x1: number; y1: number; x2: number; y2: number };
        confidence: number | null;
      }
    >
  >();
  for (const r of recordsOfKind(parsed.records, "box")) {
    const frame = r.frame?.frameIndex;
    if (frame === undefined || frame >= frameCount)
      throw Error("Frame missing");
    const frames = byId.get(r.objectId) ?? new Map();
    if (frames.has(frame)) throw Error("Duplicate object/frame");
    frames.set(frame, {
      box: {
        x1: r.left / width,
        y1: r.top / height,
        x2: r.right / width,
        y2: r.bottom / height,
      },
      confidence: r.confidence ?? null,
    });
    byId.set(r.objectId, frames);
  }
  if (byId.size > 16) throw Error("Too many tracked objects");
  const tracks: ModelTrack[] = [];
  for (const [id, frames] of byId) {
    let current: ModelTrack | null = null,
      previous = -2,
      part = 0;
    for (const [frame, r] of [...frames].sort((a, b) => a[0] - b[0])) {
      if (!current || frame !== previous + 1) {
        current = {
          trackId: `${input.responseId}:${id}:${part++}`,
          label: input.label,
          catalogId: null,
          confidence: r.confidence,
          points: [],
        };
        tracks.push(current);
      }
      // Confidence varies by frame; do not invent an aggregate score.
      if (current.confidence !== r.confidence) current.confidence = null;
      current.points.push({ t: frame / fps, box: r.box, mask: null });
      previous = frame;
    }
  }
  if (tracks.length > 32) throw Error("Too many visibility spans");
  return tracks
    .map((t) => TrackSchema.parse(t))
    .sort(
      (a, b) =>
        a.points[0]!.t - b.points[0]!.t || a.trackId.localeCompare(b.trackId),
    );
}
