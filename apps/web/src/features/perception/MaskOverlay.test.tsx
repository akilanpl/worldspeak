import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => cleanup());
import MaskOverlay from "./MaskOverlay";
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
