import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import VideoFlow from "./VideoFlow";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    width: 400,
    height: 300,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 400,
    bottom: 300,
    toJSON: () => {},
  });
});

describe("VideoFlow", () => {
  it("completes fixture → track → intent → approve with zero speech", async () => {
    const speak = vi.fn();
    Object.defineProperty(window, "speechSynthesis", { value: { speak, cancel: vi.fn() }, configurable: true });

    render(<VideoFlow />);
    // Crossing scene is preselected; continue to tracks.
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));
    expect(screen.getByRole("button", { name: /^continue$/i })).toBeDisabled();
    // Jump the synthetic clock into the phone window, then select it.
    fireEvent.click(screen.getAllByRole("button", { name: /jump to appearance/i })[2]!);
    const phone = await screen.findByRole("button", { name: /phone \(track/i });
    fireEvent.click(phone);
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));
    expect(await screen.findByText("I want phone.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /approve for composer/i }));
    expect(screen.getByTestId("video-approve-notice")).toHaveTextContent(/no speech here/i);
    expect(speak).not.toHaveBeenCalled();
  });

  it("handles the empty timeline with recovery and no crash", async () => {
    render(<VideoFlow />);
    fireEvent.click(screen.getByRole("button", { name: /empty motion/i }));
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));
    expect(await screen.findByText(/no object tracks/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByRole("button", { name: /use synthetic fixtures/i })).toBeInTheDocument();
  });
});

it("keeps an accepted clip alive through capture unmount, and releases it on retake and route exit", async () => {
  const create = vi.fn().mockReturnValueOnce("blob:first").mockReturnValueOnce("blob:second");
  const revoke = vi.fn(); Object.assign(URL,{createObjectURL:create,revokeObjectURL:revoke});
  vi.spyOn(HTMLMediaElement.prototype,"load").mockImplementation(() => {});
  const realCreate=document.createElement.bind(document);
  vi.spyOn(document,"createElement").mockImplementation(((tag: string) => {
    const element=realCreate(tag);
    if (tag === "video") {
      Object.defineProperties(element,{videoWidth:{value:640},videoHeight:{value:360},duration:{value:2},src:{set:() => queueMicrotask(() => element.dispatchEvent(new Event("loadedmetadata"))),configurable:true}});
    }
    return element;
  }) as typeof document.createElement);
  const view=render(<VideoFlow/>);
  fireEvent.click(screen.getByRole("button",{name:"Use local video"}));
  fireEvent.change(screen.getByLabelText("Upload clip"),{target:{files:[new File(["clip"],"local.webm",{type:"video/webm"})]}});
  await screen.findByRole("heading",{name:"Clip preview"});
  expect(revoke).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Retake"}));
  expect(revoke).toHaveBeenCalledWith("blob:first");
  fireEvent.change(screen.getByLabelText("Upload clip"),{target:{files:[new File(["clip"],"local.webm",{type:"video/webm"})]}});
  await screen.findByRole("heading",{name:"Clip preview"});
  expect(revoke).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(revoke).toHaveBeenLastCalledWith("blob:second");
});
