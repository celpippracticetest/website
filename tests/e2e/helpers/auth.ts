import { expect, type Page } from "@playwright/test";

export function getTestCredentials(): { email: string; password: string } | null {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL?.trim();
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;
  if (!email || !password) {
    return null;
  }
  return { email, password };
}

export async function signInWithPassword(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/sign-in?mode=sign-in&force=1");
  await page.locator("#auth-email").fill(email);
  await page.locator("#auth-password").fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).not.toHaveURL(/\/sign-in(\?|$)/, { timeout: 30_000 });
}
