import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import RasterMaskCanvas from "./RasterMaskCanvas";
import { decodeRasterMask } from "./rasterMask";
const mask = decodeRasterMask({ width: 2, height: 2, bounds: { x1: .25, y1: .125, x2: .75, y2: .625 }, rasterBase64: "AAEBAA==" })!;
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("source-resolution mask canvas", () => {
  it("paints exact binary pixels, scales via bounds and does not reallocate on selection", () => {
    const put = vi.fn();
    const get = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
      putImageData: put,
    } as unknown as CanvasRenderingContext2D);
    const view = render(<RasterMaskCanvas mask={mask} selected={false} />);
    const canvas = screen.getByTestId("raster-mask") as HTMLCanvasElement;
    expect(canvas.width).toBe(2); expect(canvas.height).toBe(2);
    expect(canvas.style.left).toBe("25%"); expect(canvas.style.top).toBe("12.5%");
    expect(canvas.style.width).toBe("50%"); expect(canvas.style.height).toBe("50%");
    expect(canvas.style.pointerEvents).toBe("none"); expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect([...put.mock.calls[0]![0].data]).toEqual([0,0,0,0, 15,118,110,255, 15,118,110,255, 0,0,0,0]);
    view.rerender(<RasterMaskCanvas mask={mask} selected={true} />);
    expect(canvas.style.opacity).toBe("0.65"); expect(get).toHaveBeenCalledTimes(1);
    view.unmount(); expect(canvas.width).toBe(0); expect(canvas.height).toBe(0);
  });
  it("does not create a drawing context for malformed runtime input", () => {
    const get = vi.spyOn(HTMLCanvasElement.prototype, "getContext");
    render(<RasterMaskCanvas mask={{ ...mask, width: 999999 }} selected={false} />);
    expect(screen.queryByTestId("raster-mask")).toBeNull(); expect(get).not.toHaveBeenCalled();
  });
});
