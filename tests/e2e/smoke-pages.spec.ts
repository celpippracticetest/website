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

const expectedUrlPatterns: Record<string, RegExp[]> = {
  "/plans": [/\/plans(\/)?$/, /\/practice-overview(\/)?$/, /\/$/],
  "/profile": [/\/profile(\/)?$/, /\/practice-overview(\/)?$/, /\/$/],
  "/earn100": [/\/earn100(\/)?$/, /\/$/],
};

for (const path of [...publicPaths, ...dashboardPaths]) {
  test(`smoke: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });

    // Basic sanity checks: no hard crash and some content rendered.
    const currentUrl = page.url();
    const allowedPatterns =
      expectedUrlPatterns[path] ?? [new RegExp(`${path.replace("/", "\\/")}$`)];
    const isAllowed = allowedPatterns.some((pattern) => pattern.test(currentUrl));
    expect(
      isAllowed,
      `Unexpected final URL for ${path}. Got ${currentUrl}. Allowed patterns: ${allowedPatterns
        .map((p) => p.toString())
        .join(", ")}`,
    ).toBe(true);

    const bodyContent = await page.locator("body").innerText();
    expect(bodyContent.trim().length).toBeGreaterThan(0);
  });
}

