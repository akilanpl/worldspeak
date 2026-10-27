import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ObjectList from "./ObjectList";
import { FIXTURE_SCENES } from "./fixtures";

afterEach(() => cleanup());

const table = FIXTURE_SCENES.find((s) => s.id === "table")!;

describe("ObjectList", () => {
  it("offers every object as a native button with selection state", () => {
    const onSelect = vi.fn();
    render(
      <ObjectList locale="en" objects={table.objects} selectedId="table-food" onSelect={onSelect} onCorrectLabel={() => {}} />,
    );
    expect(screen.getAllByRole("button", { name: /water|food|chair|phone/i })).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: /phone/i }));
    expect(onSelect).toHaveBeenCalledWith("table-phone");
  });

  it("corrects a wrong label through the inline form", () => {
    const onCorrectLabel = vi.fn();
    render(
      <ObjectList locale="en" objects={table.objects} selectedId="table-food" onSelect={() => {}} onCorrectLabel={onCorrectLabel} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /correct the label/i }));
    fireEvent.change(screen.getByLabelText(/correct the label/i), { target: { value: "soup" } });
    fireEvent.click(screen.getByRole("button", { name: /apply label/i }));
    expect(onCorrectLabel).toHaveBeenCalledWith("table-food", "soup");
  });

  it("reports the empty state honestly", () => {
    render(<ObjectList locale="en" objects={[]} selectedId={null} onSelect={() => {}} onCorrectLabel={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent(/no objects detected/i);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
