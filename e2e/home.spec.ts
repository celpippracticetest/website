import { expect, test } from "@playwright/test";

test.describe("Marketing homepage", () => {
  test("loads key hero content", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Reach Your Target/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Start Your Free Practice/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Trusted by 70k\+ test-takers/i),
    ).toBeVisible();
  });

  test("primary CTA moves user into practice funnel", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("link", { name: /Start Your Free Practice/i }).first(),
    ).toBeVisible();
    await page.click('a[href="/practice-overview"]');

    await expect(page).toHaveURL(
      /(practice-overview|sign-in|sign-up|onboarding|sso-callback)/i
    );
  });
});
