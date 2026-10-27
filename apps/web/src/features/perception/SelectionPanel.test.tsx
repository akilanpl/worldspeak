import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import SelectionPanel from "./SelectionPanel";
import { FIXTURE_SCENES } from "./fixtures";

afterEach(() => cleanup());

const table = FIXTURE_SCENES.find((s) => s.id === "table")!;

describe("SelectionPanel", () => {
  it("gates continue on selection and hides fabricated confidence", () => {
    const onContinue = vi.fn();
    const { rerender } = render(
      <SelectionPanel
        locale="en"
        image={null}
        fixtureAspect={{ w: 4, h: 3 }}
        objects={table.objects}
        selectedId={null}
        onSelect={() => {}}
        onCorrectLabel={() => {}}
        onBack={() => {}}
        onContinue={onContinue}
      />,
    );
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onContinue).not.toHaveBeenCalled();

    rerender(
      <SelectionPanel
        locale="en"
        image={null}
        fixtureAspect={{ w: 4, h: 3 }}
        objects={table.objects}
        selectedId="table-water"
        onSelect={() => {}}
        onCorrectLabel={() => {}}
        onBack={() => {}}
        onContinue={onContinue}
      />,
    );
    // Fixture confidence is null: shown as unavailable, never a percentage.
    expect(screen.getByText(/confidence is unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state with a way back", () => {
    const onBack = vi.fn();
    render(
      <SelectionPanel
        locale="en"
        image={null}
        fixtureAspect={{ w: 4, h: 3 }}
        objects={[]}
        selectedId={null}
        onSelect={() => {}}
        onCorrectLabel={() => {}}
        onBack={onBack}
        onContinue={() => {}}
      />,
    );
    expect(screen.getByText(/no objects detected/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
