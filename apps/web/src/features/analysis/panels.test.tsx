import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ConsentPanel from "./ConsentPanel";
import JobStatus from "./JobStatus";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ConsentPanel", () => {
  it("gates Send behind an explicit checkbox and explains retention", () => {
    const onSend = vi.fn();
    render(<ConsentPanel locale="en" imageName="photo.jpg" onBack={() => {}} onSend={onSend} />);
    const send = screen.getByTestId("consent-send");
    expect(send).toBeDisabled();
    fireEvent.click(send);
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByText(/15 minutes/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot be retracted/i)).toBeInTheDocument();
    expect(screen.getByText(/one upload only/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(send);
    expect(onSend).toHaveBeenCalledTimes(1);
  });
});

describe("JobStatus", () => {
  const noop = () => {};
  it("shows queued and processing distinctly, and terminal states honestly", () => {
    const { rerender } = render(
      <JobStatus locale="en" outcome={{ name: "queued", jobId: "j", assetId: "a", operation: "scene" }} onCancel={noop} onStartOver={noop} />,
    );
    expect(screen.getByText(/queued/i)).toBeInTheDocument();
    rerender(
      <JobStatus locale="en" outcome={{ name: "processing", jobId: "j", assetId: "a", operation: "scene" }} onCancel={noop} onStartOver={noop} />,
    );
    expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
    rerender(
      <JobStatus
        locale="en"
        outcome={{ name: "succeeded", jobId: "j", assetId: "a", operation: "scene", objects: [], rejected: 2, model: "muse-spark-1.3" }}
        onCancel={noop}
        onStartOver={noop}
      />,
    );
    expect(screen.getByText(/discarded as invalid geometry/i)).toBeInTheDocument();
    rerender(
      <JobStatus locale="en" outcome={{ name: "canceled" }} onCancel={noop} onStartOver={noop} />,
    );
    expect(screen.getByText(/revoked/i)).toBeInTheDocument();
    rerender(
      <JobStatus locale="en" outcome={{ name: "uncertain", detail: "maybe later" }} onCancel={noop} onStartOver={noop} />,
    );
    expect(screen.getByText(/uncertain/i).parentElement?.textContent).toMatch(/maybe later/);
  });

  it("failed states name the code and offer start-over, never retry", () => {
    render(
      <JobStatus locale="en" outcome={{ name: "failed", code: "PROVIDER_HTTP_500", detail: "bad" }} onCancel={noop} onStartOver={noop} />,
    );
    expect(screen.getByText(/PROVIDER_HTTP_500/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start over/i })).toBeInTheDocument();
  });
});
