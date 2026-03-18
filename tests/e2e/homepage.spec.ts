import { test, expect } from "@playwright/test";

test("homepage loads and shows title", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/CELPIP/i);
});

