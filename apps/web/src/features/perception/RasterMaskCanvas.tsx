"use client";

import { useEffect, useMemo, useRef } from "react";
import { boxToPercent } from "./geometry";
import { isRasterMask } from "./rasterMask";
import type { RasterMask } from "./types";

/** A source-resolution binary texture, CSS-scaled in the fitted image layer.
 * No image decoder, network URL, full-screen canvas, contour approximation or
 * resize reallocation. Pointer events pass through to accessible object buttons.
 */
export default function RasterMaskCanvas({ mask, selected }: { mask: RasterMask; selected: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const valid = useMemo(() => isRasterMask(mask), [mask]);
  useEffect(() => {
    const canvas = ref.current;
    if (!valid || !canvas) return;
    canvas.width = mask.width;
    canvas.height = mask.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    const image = context.createImageData(mask.width, mask.height);
    for (let i = 0; i < mask.pixels.length; i++) {
      if (mask.pixels[i] !== 1) continue;
      const offset = i * 4;
      image.data[offset] = 15;
      image.data[offset + 1] = 118;
      image.data[offset + 2] = 110;
      image.data[offset + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    return () => { canvas.width = 0; canvas.height = 0; };
  }, [mask, valid]);
  if (!valid) return null;
  const pct = boxToPercent(mask.bounds)!;
  return <canvas ref={ref} width={mask.width} height={mask.height} aria-hidden="true"
    data-testid="raster-mask" data-selected={selected}
    style={{ position: "absolute", ...pct, opacity: selected ? 0.65 : 0.4,
      imageRendering: "pixelated", pointerEvents: "none" }} />;
}
