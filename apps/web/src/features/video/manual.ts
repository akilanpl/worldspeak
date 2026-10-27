import type { NormalizedBox } from "../perception/types";
export interface ManualVideoSelection {
  origin: "manual";
  time: number;
  box: NormalizedBox;
  labelEn: string;
  labelTa: string | null;
  catalogId: string | null;
}
export function pointInFrame(clientX: number, clientY: number, rect: {left: number; top: number; width: number; height: number}): {x: number; y: number} | null {
  if (![clientX, clientY, rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) return null;
  const x = (clientX - rect.left) / rect.width, y = (clientY - rect.top) / rect.height;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;
  return {x, y};
}
export function regionFromPoints(a: {x: number; y: number}, b: {x: number; y: number}): NormalizedBox | null {
  const box = {x1: Math.min(a.x,b.x), y1: Math.min(a.y,b.y), x2: Math.max(a.x,b.x), y2: Math.max(a.y,b.y)};
  if (!Object.values(box).every(n => Number.isFinite(n) && n >= 0 && n <= 1) || box.x2 - box.x1 < .005 || box.y2 - box.y1 < .005) return null;
  return box;
}
export function validFrameTime(time: number, durationMs: number): boolean {
  return Number.isFinite(time) && Number.isFinite(durationMs) && durationMs > 0 && time >= 0 && time <= durationMs / 1000;
}
