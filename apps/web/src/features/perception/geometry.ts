import type { NormalizedBox } from "./types";

/**
 * Pure overlay geometry. The overlay layer is an absolutely positioned box
 * matching the *fitted* image rect (contain fit); children use percentages of
 * that layer, so rendering is exact across aspect ratios and independent of
 * device-pixel-ratio (vector + % positioning, no canvas).
 */

export interface FittedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Contain-fit `natural` into `container`; null on degenerate input. */
export function computeFittedRect(
  containerW: number,
  containerH: number,
  naturalW: number,
  naturalH: number,
): FittedRect | null {
  if (
    !Number.isFinite(containerW) ||
    !Number.isFinite(containerH) ||
    !Number.isFinite(naturalW) ||
    !Number.isFinite(naturalH) ||
    containerW <= 0 ||
    containerH <= 0 ||
    naturalW <= 0 ||
    naturalH <= 0
  ) {
    return null;
  }
  const scale = Math.min(containerW / naturalW, containerH / naturalH);
  const width = naturalW * scale;
  const height = naturalH * scale;
  return { x: (containerW - width) / 2, y: (containerH - height) / 2, width, height };
}

/** Normalized box → pixel rect inside the fitted layer. Null on bad input. */
export function boxToPixels(
  box: NormalizedBox,
  fitted: FittedRect,
): { left: number; top: number; width: number; height: number } | null {
  const { x1, y1, x2, y2 } = box;
  if (x1 < 0 || y1 < 0 || x2 > 1 || y2 > 1 || x1 >= x2 || y1 >= y2) return null;
  return {
    left: fitted.x + x1 * fitted.width,
    top: fitted.y + y1 * fitted.height,
    width: (x2 - x1) * fitted.width,
    height: (y2 - y1) * fitted.height,
  };
}

/** Normalized box → CSS percentages of the fitted layer. Null on bad input. */
export function boxToPercent(box: NormalizedBox): {
  left: string;
  top: string;
  width: string;
  height: string;
} | null {
  const { x1, y1, x2, y2 } = box;
  if (x1 < 0 || y1 < 0 || x2 > 1 || y2 > 1 || x1 >= x2 || y1 >= y2) return null;
  const pct = (n: number) => `${Number((n * 100).toFixed(4))}%`;
  return { left: pct(x1), top: pct(y1), width: pct(x2 - x1), height: pct(y2 - y1) };
}

/** Point-in-box test in normalized coordinates (tap disambiguation helper). */
export function pointInBox(x: number, y: number, box: NormalizedBox): boolean {
  return x >= box.x1 && x <= box.x2 && y >= box.y1 && y <= box.y2;
}
