import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { SpeechGateway, VoiceInfo } from "@/lib/speech";
import ComposerEntry from "./ComposerEntry";
import { encodeHandoff, snapshotToPayload, storeHandoff } from "./handoff";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

function videoPhonePayload() {
  return snapshotToPayload(
    {
      intent: { kind: "request-object", object: { catalogId: "phone", selectedObjectId: null }, polarity: "want" },
      locale: "en",
    },
    { source: "video", objectLabel: "phone", objectCatalogId: "phone", provenance: "fixture" },
  );
}

function renderEntry(
  handoffKey?: string | null,
  gatewayFactory?: (listVoices: () => VoiceInfo[]) => SpeechGateway,
) {
  return render(
    <ComposerEntry
      serverInitial={undefined}
      handoffKey={handoffKey ?? null}
      {...(gatewayFactory ? { gatewayFactory } : {})}
    />,
  );
}

describe("ComposerEntry", () => {
  it("renders the stored handoff preview with provenance and never speaks on its own", async () => {
    const calls: unknown[][] = [];
    const key = storeHandoff(videoPhonePayload());
    expect(key).not.toBeNull();
    renderEntry(
      key,
      () =>
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

  it("rejects legacy inline payload links instead of using URL content", async () => {
    renderEntry(encodeHandoff(videoPhonePayload()));
    expect(await screen.findByTestId("handoff-invalid-notice")).toBeInTheDocument();
    expect(screen.queryByText("I want phone.", { exact: true })).not.toBeInTheDocument();
  });

  it("requires a separate Speak gesture before any speech call", async () => {
    const calls: { utterance: { exactText: string } }[] = [];
    renderEntry(
      storeHandoff(videoPhonePayload()),
      (listVoices) =>
        ({
          speakApproved: (args: { utterance: { exactText: string } }) => {
            calls.push(args);
            return { status: "spoken" };
          },
          stop: () => {},
          testVoice: () => false,
          listVoices,
        }) as unknown as SpeechGateway,
    );
    await screen.findByText("I want phone.", { exact: true });
    fireEvent.click(screen.getByRole("button", { name: /speak this sentence/i }));
    expect(calls).toHaveLength(1);
    expect(calls[0]?.utterance.exactText).toBe("I want phone.");
  });

  it("degrades an invalid handoff to an empty board with a notice", async () => {
    renderEntry("!!!tampered!!!");
    expect(await screen.findByTestId("handoff-invalid-notice")).toBeInTheDocument();
    expect(screen.queryByText("I want phone.", { exact: true })).not.toBeInTheDocument();
  });

  it("degrades a missing storage key to an invalid handoff", async () => {
    renderEntry("ws-handoff-no-such-key");
    expect(await screen.findByTestId("handoff-invalid-notice")).toBeInTheDocument();
  });
});
