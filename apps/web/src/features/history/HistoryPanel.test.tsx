import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import HistoryPanel from "./HistoryPanel";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("keeps private search text in POST JSON for initial and paginated requests", async () => {
  const fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => ({
    ok: true, json: async () => ({ data: { rows: [], nextCursor: init?.method === "POST" ? "opaque-page" : null } }),
  }));
  vi.stubGlobal("fetch", fetch);
  render(<HistoryPanel />);
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText("Search your saved sentences"), { target: { value: "private Tamil தமிழ் & needs?" } });
  fireEvent.submit(screen.getByRole("button", { name: "Search" }).closest("form")!);
  await screen.findByRole("button", { name: "More" });
  fireEvent.click(screen.getByRole("button", { name: "More" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
  for (const [url, init] of fetch.mock.calls.slice(1)) {
    expect(url).toBe("/api/v1/history/search");
    expect(init.method).toBe("POST");
    expect(init.cache).toBe("no-store");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body).q).toBe("private Tamil தமிழ் & needs?");
  }
  expect(JSON.parse(fetch.mock.calls[2]![1].body).cursor).toBe("opaque-page");
});
