import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import IntentPanel from "./IntentPanel";
import { FIXTURE_SCENES } from "./fixtures";

afterEach(() => cleanup());

const water = FIXTURE_SCENES.find((s) => s.id === "table")!.objects.find((o) => o.id === "table-water")!;

function renderIntent() {
  const onApprove = vi.fn();
  render(
    <IntentPanel locale="en" onLocaleChange={() => {}} object={water} onBack={() => {}} onApprove={onApprove} />,
  );
  return { onApprove };
}

describe("IntentPanel", () => {
  it("previews the exact deterministic sentence for want polarity", () => {
    renderIntent();
    expect(screen.getByText("I want water.")).toBeInTheDocument();
  });

  it("preserves negation, location, and help through the engine", () => {
    renderIntent();
    fireEvent.click(screen.getByRole("button", { name: /i do not want/i }));
    expect(screen.getByText("I do not want water.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /where is it/i }));
    expect(screen.queryByText("I do not want water.")).not.toBeInTheDocument();
    expect(screen.getByText("Where is water?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /help me with it/i }));
    // Frozen catalog output. (Tamil per-noun sandhi is catalog-data for
    // native review — this branch does not change shared templates.)
    expect(screen.getByText("Please help me with water.")).toBeInTheDocument();
  });

  it("speaks social acts without an object and keeps user text exact", () => {
    renderIntent();
    fireEvent.click(screen.getByRole("button", { name: /^yes$/i }));
    expect(screen.getByText("Yes.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/use my own words/i), { target: { value: "My exact words — kept!" } });
    expect(screen.getByText("My exact words — kept!", { selector: "p" })).toBeInTheDocument();
  });

  it("approves the intent snapshot without speaking", () => {
    const speak = vi.fn();
    // @ts-expect-error jsdom speech stub for the no-speech assertion
    window.speechSynthesis = { speak, cancel: () => {} };
    const { onApprove } = renderIntent();
    fireEvent.click(screen.getByRole("button", { name: /approve for composer/i }));
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onApprove.mock.calls[0]?.[0]).toMatchObject({
      locale: "en",
      intent: { kind: "request-object", polarity: "want" },
    });
    expect(speak).not.toHaveBeenCalled();
    // @ts-expect-error cleanup stub
    delete window.speechSynthesis;
  });

  it("renders the Tamil preview on locale switch", () => {
    function WithLocale() {
      const [locale, setLocale] = useState<"en" | "ta">("en");
      return (
        <IntentPanel
          locale={locale}
          onLocaleChange={setLocale}
          object={water}
          onBack={() => {}}
          onApprove={() => {}}
        />
      );
    }
    render(<WithLocale />);
    fireEvent.click(screen.getByRole("button", { name: "தமிழ்" }));
    expect(screen.getByText("எனக்கு தண்ணீர் வேண்டும்.")).toBeInTheDocument();
  });
});
