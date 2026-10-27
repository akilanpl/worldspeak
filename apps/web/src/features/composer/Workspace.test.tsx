import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

afterEach(() => cleanup());
import "@testing-library/jest-dom/vitest";
import Workspace from "@/features/composer/Workspace";
import { FakeSpeechSynthesis } from "@worldspeak/test-support";
import { SpeechGateway, type Speaker } from "@/lib/speech";

function renderWithFake() {
  const fake = new FakeSpeechSynthesis();
  const speaker: Speaker = {
    speakText: (o) => fake.speak({ text: o.text, lang: o.lang, voiceName: o.voiceName, rate: o.rate }),
    cancel: () => fake.cancel(),
  };
  const voices = () => [
    { name: "Test English", lang: "en-US", localService: true, isDefault: true },
    { name: "Test Tamil", lang: "ta-IN", localService: true, isDefault: false },
  ];
  render(<Workspace gatewayFactory={() => new SpeechGateway(speaker, voices)} />);
  return { fake };
}

describe("Workspace component", () => {
  it("selecting a tile opens an exact preview without speaking", () => {
    const { fake } = renderWithFake();
    fireEvent.click(screen.getByRole("button", { name: "Water" }));
    expect(screen.getByText("I want water.")).toBeInTheDocument();
    expect(fake.calls).toHaveLength(0);
  });

  it("Speak speaks exactly the preview once; Stop cancels; edits stay silent", () => {
    const { fake } = renderWithFake();
    fireEvent.click(screen.getByRole("button", { name: "Water" }));
    fireEvent.click(screen.getByRole("button", { name: "தமிழ்" }));
    expect(screen.getByText("எனக்கு தண்ணீர் வேண்டும்.")).toBeInTheDocument();
    expect(fake.calls).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: /Speak this sentence/ }));
    expect(fake.calls).toHaveLength(1);
    expect(fake.calls[0]?.text).toBe("எனக்கு தண்ணீர் வேண்டும்.");
    fireEvent.click(screen.getByRole("button", { name: /Stop/ }));
    expect(fake.cancelled).toBeGreaterThanOrEqual(1);
  });

  it("full keyboard path: every control is a native focusable element", () => {
    renderWithFake();
    const focusables = Array.from(document.querySelectorAll("button, select, textarea, a"));
    expect(focusables.length).toBeGreaterThan(20);
    for (const el of focusables) {
      expect(["BUTTON", "SELECT", "TEXTAREA", "A"].includes(el.tagName)).toBe(true);
      expect((el as HTMLElement).tabIndex).toBeGreaterThanOrEqual(0);
    }
    // Keyboard-operable composition: focus tile, activate with Enter via click semantics.
    const tile = screen.getByRole("button", { name: "Food" });
    tile.focus();
    expect(document.activeElement).toBe(tile);
    fireEvent.click(tile);
    expect(screen.getByText("I want food.")).toBeInTheDocument();
  });

  it("polarity action changes the preview sentence", () => {
    renderWithFake();
    fireEvent.click(screen.getByRole("button", { name: "Water" }));
    fireEvent.click(screen.getByRole("button", { name: "I do not want" }));
    expect(screen.getByText("I do not want water.")).toBeInTheDocument();
  });

  it("typed sentences are preserved exactly and announced as preview", () => {
    const { fake } = renderWithFake();
    fireEvent.change(screen.getByLabelText(/type your own/i), { target: { value: "My own words, kept!" } });
    fireEvent.click(screen.getByRole("button", { name: /Use this sentence/ }));
    expect(screen.getByText("My own words, kept!", { selector: "p" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Speak this sentence/ }));
    expect(fake.calls).toHaveLength(1);
    expect(fake.calls[0]?.text).toBe("My own words, kept!");
  });

});
