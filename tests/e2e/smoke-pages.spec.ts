import { test, expect } from "@playwright/test";

// High-value public and app pages to smoke test.
// This does not cover every single dynamic CMS/admin route, but
// it ensures that key marketing and dashboard pages render.

const publicPaths = [
  "/",
  "/pricing",
  "/score-calculator",
  "/blog",
  "/wiki",
  "/contact-us",
  "/refund-policy",
  "/privacy-policy",
  "/terms-of-service",
];

const dashboardPaths = [
  "/practice-overview",
  "/exam-overview",
  "/listening",
  "/reading",
  "/writing",
  "/speaking",
  "/words",
  "/plans",
  "/profile",
  "/earn100",
];

for (const path of [...publicPaths, ...dashboardPaths]) {
  test(`smoke: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });

    // Basic sanity checks: no hard crash and some content rendered.
    await expect(page).toHaveURL(new RegExp(`${path.replace("/", "\\/")}`));
    const bodyContent = await page.locator("body").innerText();
    expect(bodyContent.trim().length).toBeGreaterThan(0);
  });
}

