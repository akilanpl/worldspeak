"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@worldspeak/contracts";
import { boxToPercent, computeFittedRect, type FittedRect } from "./geometry";
import { pstr } from "./strings";
import type { PerceivedObject } from "./types";

export interface MaskOverlayProps {
  locale: Locale;
  /** Rendered image URL; null renders the fixture SVG backdrop instead. */
  imageUrl: string | null;
  imageAlt: string;
  naturalWidth: number;
  naturalHeight: number;
  objects: PerceivedObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Test seam: deterministic container size when ResizeObserver is absent. */
  testContainerSize?: { width: number; height: number };
  /** Hosts with their own empty state (e.g. SelectionPanel) set this false. */
  showEmptyState?: boolean;
}

/**
 * Reusable segmentation overlay. A fitted layer matches the displayed image
 * rect; object regions are percentage-positioned buttons inside it (exact for
 * any aspect ratio, DPR-independent), with vector mask polygons underneath.
 * Every object is equally reachable by pointer, touch, keyboard, and the
 * companion list — overlap never strands a selection.
 */
export default function MaskOverlay({
  locale,
  imageUrl,
  imageAlt,
  naturalWidth,
  naturalHeight,
  objects,
  selectedId,
  onSelect,
  testContainerSize,
  showEmptyState = true,
}: MaskOverlayProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [container, setContainer] = useState<{ width: number; height: number } | null>(
    testContainerSize ?? null,
  );
  // Pure derivation during render: no cascading effects, exact on every input.
  const fitted: FittedRect | null = container
    ? computeFittedRect(container.width, container.height, naturalWidth, naturalHeight)
    : null;

  useEffect(() => {
    // Fixture/test path drives layout from props; the live path subscribes.
    if (testContainerSize) return;
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setContainer({ width: rect.width, height: rect.height });
    };
    // Measure on the next frame, then subscribe. State updates happen only
    // inside these async callbacks — never synchronously in the effect.
    const frame = requestAnimationFrame(measure);
    if (typeof ResizeObserver === "undefined") {
      return () => cancelAnimationFrame(frame);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [testContainerSize, imageUrl, naturalWidth, naturalHeight]);

  return (
    <div
      ref={containerRef}
      data-testid="mask-stage"
      style={{ position: "relative", width: "100%", aspectRatio: `${naturalWidth} / ${naturalHeight}`, background: "#101418", borderRadius: 12, overflow: "hidden" }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={imageAlt}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : (
        <svg
          viewBox={`0 0 ${naturalWidth} ${naturalHeight}`}
          role="img"
          aria-label={`${imageAlt} (synthetic fixture)`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          preserveAspectRatio="none"
        >
          <rect x={0} y={0} width={naturalWidth} height={naturalHeight} fill="#2a3340" />
          <rect x={naturalWidth * 0.08} y={naturalHeight * 0.72} width={naturalWidth * 0.84} height={naturalHeight * 0.2} fill="#3a4656" rx={8} />
          <circle cx={naturalWidth * 0.85} cy={naturalHeight * 0.18} r={naturalHeight * 0.08} fill="#465364" />
        </svg>
      )}
      {fitted && (
        <div
          data-testid="mask-layer"
          style={{ position: "absolute", left: fitted.x, top: fitted.y, width: fitted.width, height: fitted.height }}
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          >
            {objects.map((o) => {
              if (!o.mask) return null;
              const selected = o.id === selectedId;
              return (
                <polygon
                  key={o.id}
                  points={o.mask.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")}
                  fill={selected ? "rgba(15,118,110,0.45)" : "rgba(15,118,110,0.25)"}
                  stroke={selected ? "#ffffff" : "#0f766e"}
                  strokeWidth={selected ? 1.2 : 0.6}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
          {objects.map((o) => {
            const pct = boxToPercent(o.box);
            if (!pct) return null;
            const selected = o.id === selectedId;
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={selected}
                aria-label={`${o.labelEn}${o.origin === "fixture" ? ` (${pstr("useFixtures", locale)})` : ""}${selected ? ` — ${pstr("selectedObject", locale)}` : ""}`}
                onClick={() => onSelect(o.id)}
                style={{
                  position: "absolute",
                  left: pct.left,
                  top: pct.top,
                  width: pct.width,
                  height: pct.height,
                  background: selected ? "rgba(255,255,255,0.12)" : "transparent",
                  border: selected ? "3px solid #ffffff" : "2px dashed rgba(255,255,255,0.85)",
                  borderRadius: 8,
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            );
          })}
        </div>
      )}
      {showEmptyState && objects.length === 0 && (
        <p className="status" role="status" style={{ position: "absolute", left: 12, bottom: 8, color: "#fff" }}>
          {pstr("noObjects", locale)}
        </p>
      )}
    </div>
  );
}
