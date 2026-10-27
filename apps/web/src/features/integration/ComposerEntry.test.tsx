import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { SpeechGateway, VoiceInfo } from "@/lib/speech";
import ComposerEntry from "./ComposerEntry";
import { storeHandoff, snapshotToPayload } from "./handoff";

let handoffParam: string | null = null;

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === "handoff" ? handoffParam : null),
  }),
}));

afterEach(() => {
  cleanup();
  handoffParam = null;
  vi.restoreAllMocks();
});

function videoPhoneHandoff(): string {
  return storeHandoff(
    snapshotToPayload(
      {
        intent: { kind: "request-object", object: { catalogId: "phone", selectedObjectId: null }, polarity: "want" },
        locale: "en",
      },
      { source: "video", objectLabel: "phone", objectCatalogId: "phone", provenance: "fixture" },
    ),
  )!;
}

function renderEntry(gatewayFactory?: (listVoices: () => VoiceInfo[]) => SpeechGateway) {
  return render(
    <ComposerEntry
      serverInitial={undefined}
      {...(gatewayFactory ? { gatewayFactory } : {})}
    />,
  );
}

describe("ComposerEntry", () => {
  it("renders the handoff preview with provenance and never speaks on its own", async () => {
    const calls: unknown[][] = [];
    handoffParam = videoPhoneHandoff();
    renderEntry(() =>
      ({
        speakApproved: (...args: unknown[]) => {
          calls.push(args);
          return { status: "spoken" };
        },
        stop: () => {},
        testVoice: () => false,
      }) as unknown as SpeechGateway,
    );
    expect(await screen.findByText("I want phone.", { exact: true })).toBeInTheDocument();
    expect(screen.getByTestId("handoff-provenance-notice")).toHaveTextContent(/demo fixture/i);
    // Selecting, correcting, and approving happened upstream; entry itself speaks never.
    expect(calls).toHaveLength(0);
  });

  it("requires a separate Speak gesture before any speech call", async () => {
    const calls: { utterance: { exactText: string } }[] = [];
    handoffParam = videoPhoneHandoff();
    renderEntry(() =>
      ({
        speakApproved: (args: { utterance: { exactText: string } }) => {
          calls.push(args);
          return { status: "spoken" };
        },
        stop: () => {},
        testVoice: () => false,
      }) as unknown as SpeechGateway,
    );
    await screen.findByText("I want phone.", { exact: true });
    fireEvent.click(screen.getByRole("button", { name: /speak this sentence/i }));
    expect(calls).toHaveLength(1);
    expect(calls[0]?.utterance.exactText).toBe("I want phone.");
  });

  it("degrades an invalid handoff to an empty board with a notice", async () => {
    handoffParam = "!!!tampered!!!";
    renderEntry();
    expect(await screen.findByTestId("handoff-invalid-notice")).toBeInTheDocument();
    expect(screen.queryByText("I want phone.", { exact: true })).not.toBeInTheDocument();
  });
});
