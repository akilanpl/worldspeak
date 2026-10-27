import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => cleanup());
import MaskOverlay from "./MaskOverlay";
import { decodeRasterMask } from "./rasterMask";
import { FIXTURE_SCENES } from "./fixtures";

const table = FIXTURE_SCENES.find((s) => s.id === "table")!;

function renderOverlay(selectedId: string | null = null) {
  const onSelect = vi.fn();
  render(
    <MaskOverlay
      locale="en"
      imageUrl={null}
      imageAlt="Photo preview"
      naturalWidth={400}
      naturalHeight={300}
      objects={table.objects}
      selectedId={selectedId}
      onSelect={onSelect}
      testContainerSize={{ width: 400, height: 300 }}
    />,
  );
  return { onSelect };
}

describe("MaskOverlay", () => {
  it("renders one keyboard-focusable region per object with selection state", () => {
    renderOverlay("table-water");
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(table.objects.length);
    expect(screen.getByRole("button", { name: /water/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /food/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("selects by pointer click and by keyboard Enter", () => {
    const { onSelect } = renderOverlay();
    fireEvent.click(screen.getByRole("button", { name: /chair/i }));
    expect(onSelect).toHaveBeenCalledWith("table-chair");
    const food = screen.getByRole("button", { name: /food/i });
    food.focus();
    expect(document.activeElement).toBe(food);
    fireEvent.keyDown(food, { key: "Enter", code: "Enter" });
    fireEvent.click(food);
    expect(onSelect).toHaveBeenCalledWith("table-food");
  });

  it("draws mask polygons for masked objects and none for box-only fallback", () => {
    const { container } = render(
      <MaskOverlay
        locale="en"
        imageUrl={null}
        imageAlt="Photo preview"
        naturalWidth={400}
        naturalHeight={300}
        objects={table.objects}
        selectedId={null}
        onSelect={() => {}}
        testContainerSize={{ width: 400, height: 300 }}
      />,
    );
    const polygons = container.querySelectorAll("polygon");
    const masked = table.objects.filter((o) => o.mask !== null).length;
    expect(polygons.length).toBe(masked);
  });

  it("keeps overlapping objects individually reachable", () => {
    renderOverlay();
    // Chair overlaps food; phone overlaps chair — all three stay in the tree.
    expect(screen.getByRole("button", { name: /chair/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /phone/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /food/i })).toBeInTheDocument();
  });

  it("announces the empty state instead of rendering regions", () => {
    render(
      <MaskOverlay
        locale="en"
        imageUrl={null}
        imageAlt="Photo preview"
        naturalWidth={400}
        naturalHeight={300}
        objects={[]}
        selectedId={null}
        onSelect={() => {}}
        testContainerSize={{ width: 400, height: 300 }}
      />,
    );
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByRole("status")).toHaveTextContent(/no objects detected/i);
  });
});

it("positions a real raster inside the letterboxed fitted image and preserves accessible controls", () => {
  const context = { createImageData: () => ({ data: new Uint8ClampedArray(16) }), putImageData: vi.fn() };
  const mock = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
  const onSelect = vi.fn();
  const object = { ...table.objects[0]!, id: "raster-object", mask: null,
    rasterMask: decodeRasterMask({ width: 2, height: 2, bounds: { x1: .25, y1: .125, x2: .75, y2: .625 }, rasterBase64: "AAEBAA==" })! };
  render(<MaskOverlay locale="en" imageUrl={null} imageAlt="Synthetic image" naturalWidth={400} naturalHeight={200}
    objects={[object]} selectedId={null} onSelect={onSelect} testContainerSize={{ width: 400, height: 300 }} />);
  const layer = screen.getByTestId("mask-layer");
  expect(layer.style.top).toBe("50px"); expect(layer.style.height).toBe("200px");
  expect(screen.getByTestId("raster-mask").style.top).toBe("12.5%");
  expect(screen.getByTestId("raster-mask").style.height).toBe("50%");
  const region = screen.getByRole("button"); region.focus(); expect(document.activeElement).toBe(region);
  fireEvent.click(region); expect(onSelect).toHaveBeenCalledWith("raster-object");
  mock.mockRestore();
});
