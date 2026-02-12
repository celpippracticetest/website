import { expect, test } from "@playwright/test";

test.describe("Legal pages", () => {
  test("privacy policy page is reachable", async ({ page }) => {
    await page.goto("/privacy-policy");
    await expect(page).toHaveTitle(/Privacy Policy/i);
  });

  test("terms of service page is reachable", async ({ page }) => {
    await page.goto("/terms-of-service");
    await expect(page).toHaveTitle(/Terms of Service/i);
  });

  test("refund policy page is reachable", async ({ page }) => {
    await page.goto("/refund-policy");
    await expect(page).toHaveTitle(/Refund Policy/i);
  });
});
