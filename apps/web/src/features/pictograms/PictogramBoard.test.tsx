import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import PictogramBoard from "./PictogramBoard";
import { loadLocalImage } from "./media";
import { readStoredHandoff } from "../integration/handoff";

vi.mock("./media", async (original) => ({ ...await original<typeof import("./media")>(), loadLocalImage: vi.fn() }));
const revoke = vi.fn();
beforeEach(() => {
  vi.mocked(loadLocalImage).mockResolvedValue("blob:local-test");
  vi.stubGlobal("URL", Object.assign(URL, { revokeObjectURL: revoke }));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); sessionStorage.clear(); });

async function create(meaning = "My exact words — kept!", catalogId = "") {
  fireEvent.change(screen.getByLabelText("Local image"), { target: { files: [new File(["png"], "private.png", { type: "image/png" })] } });
  fireEvent.change(screen.getByLabelText("My exact meaning or words"), { target: { value: meaning } });
  fireEvent.change(screen.getByLabelText("Image description for accessibility"), { target: { value: "My personal cup" } });
  if (catalogId) fireEvent.change(screen.getByLabelText(/optional catalog/i), { target: { value: catalogId } });
  fireEvent.submit(screen.getByRole("button", { name: "Create pictogram" }).closest("form")!);
  await screen.findByRole("button", { name: `Use pictogram: ${meaning.trim()}` });
}

describe("personal pictograms (mocked image decoding)", () => {
  it("requires explicit image, meaning and accessible description", () => {
    render(<PictogramBoard />);
    expect(screen.getByRole("button", { name: "Create pictogram" })).toBeDisabled();
    expect(screen.getByLabelText("Image description for accessibility")).toBeRequired();
  });
  it("preserves exact user words and manual provenance without speaking", async () => {
    const speak = vi.fn(); vi.stubGlobal("speechSynthesis", { speak, cancel: vi.fn() });
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    render(<PictogramBoard />);
    await create("  Keep my exact words!  ");
    expect(screen.getByRole("img", { name: "My personal cup" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Use pictogram:/ }));
    expect(screen.getByText("Keep my exact words!", { selector: "p.preview-sentence" })).toHaveTextContent("Keep my exact words!");
    fireEvent.click(screen.getByRole("button", { name: /approve for composer/i }));
    const href = screen.getByRole("link", { name: "Open in composer" }).getAttribute("href")!;
    expect(href).not.toContain("exact");
    expect(readStoredHandoff(href.split("=")[1])).toMatchObject({ source: "pictogram", provenance: "manual", intent: { kind: "user-text", text: "  Keep my exact words!  " } });
    expect(speak).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it("uses optional catalog templates and keeps own words available", async () => {
    render(<PictogramBoard />); await create("My cup", "water");
    fireEvent.click(screen.getByRole("button", { name: /Use pictogram:/ }));
    expect(screen.getByText("I want water.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/use my own words/i), { target: { value: "My cup please" } });
    expect(screen.getByText("My cup please", { selector: "p.preview-sentence" })).toBeInTheDocument();
  });
  it("deletes images and releases all remaining URLs on unmount", async () => {
    const view = render(<PictogramBoard />); await create();
    fireEvent.click(screen.getByRole("button", { name: /Delete pictogram:/ }));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(revoke).toHaveBeenCalledWith("blob:local-test");
    await create("Second image"); view.unmount();
    expect(revoke).toHaveBeenCalledTimes(2);
  });
  it("releases a decode result arriving after navigation", async () => {
    let resolve!: (url: string) => void;
    vi.mocked(loadLocalImage).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const view = render(<PictogramBoard />);
    fireEvent.change(screen.getByLabelText("Local image"), { target: { files: [new File(["x"], "x.png", { type: "image/png" })] } });
    fireEvent.change(screen.getByLabelText("My exact meaning or words"), { target: { value: "words" } });
    fireEvent.change(screen.getByLabelText("Image description for accessibility"), { target: { value: "description" } });
    fireEvent.submit(screen.getByRole("button", { name: "Create pictogram" }).closest("form")!);
    view.unmount(); resolve("blob:late");
    await waitFor(() => expect(revoke).toHaveBeenCalledWith("blob:late"));
  });
  it("bounds board capacity and allows creation after deletion", async () => {
    render(<PictogramBoard />);
    for (let i = 0; i < 8; i++) await create(`Meaning ${i}`);
    fireEvent.change(screen.getByLabelText("Local image"), { target: { files: [new File(["x"], "x.png", { type: "image/png" })] } });
    fireEvent.change(screen.getByLabelText("My exact meaning or words"), { target: { value: "Ninth" } });
    fireEvent.change(screen.getByLabelText("Image description for accessibility"), { target: { value: "Description" } });
    fireEvent.submit(screen.getByRole("button", { name: "Create pictogram" }).closest("form")!);
    expect(screen.getByRole("alert")).toHaveTextContent(/at most 8/);
    expect(loadLocalImage).toHaveBeenCalledTimes(8);
    fireEvent.click(screen.getByRole("button", { name: "Delete pictogram: Meaning 0" }));
    fireEvent.submit(screen.getByRole("button", { name: "Create pictogram" }).closest("form")!);
    await screen.findByRole("button", { name: "Use pictogram: Ninth" });
  });
  it("keeps custom words exact when Tamil is explicitly selected", async () => {
    render(<PictogramBoard />); await create("My own word");
    fireEvent.click(screen.getByRole("button", { name: /Use pictogram:/ }));
    fireEvent.click(screen.getByRole("button", { name: "தமிழ்" }));
    expect(screen.getByText("My own word", { selector: "p.preview-sentence" })).toHaveAttribute("lang", "ta");
  });
  it("reports decoding errors and permits retry", async () => {
    vi.mocked(loadLocalImage).mockRejectedValueOnce(new Error("Invalid local image"));
    render(<PictogramBoard />);
    fireEvent.change(screen.getByLabelText("Local image"), { target: { files: [new File(["x"], "x.png", { type: "image/png" })] } });
    fireEvent.change(screen.getByLabelText("My exact meaning or words"), { target: { value: "words" } });
    fireEvent.change(screen.getByLabelText("Image description for accessibility"), { target: { value: "description" } });
    fireEvent.submit(screen.getByRole("button", { name: "Create pictogram" }).closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid local image");
    fireEvent.submit(screen.getByRole("button", { name: "Create pictogram" }).closest("form")!);
    await screen.findByRole("button", { name: /Use pictogram: words/ });
  });
});
