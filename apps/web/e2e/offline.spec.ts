import { expect, test } from "@playwright/test";

test("prepared offline board opens with network disabled and composes", async ({ page, context }) => {
  const apiRequests: string[] = [];
  page.on("request", (req) => {
    if (new URL(req.url()).pathname.startsWith("/api/")) apiRequests.push(req.url());
  });

  // First visit while online prepares the service-worker cache.
  await page.goto("/");
  await page.waitForFunction(() => window.caches?.match("/offline/index.html").then(Boolean), null, {
    timeout: 30000,
  });
  await page.goto("/offline");
  await expect(page.getByTestId("offline-status")).toContainText("Offline ready");

  // Airplane mode: static board opens and composes with no backend request.
  await context.setOffline(true);
  await page.goto("/offline/index.html");
  await expect(page.getByRole("heading", { name: /offline board/i })).toBeVisible();
  await page.getByRole("button", { name: "Water", exact: true }).click();
  await expect(page.getByText("I want water.", { exact: true })).toBeVisible();
  expect(apiRequests).toEqual([]);
});
