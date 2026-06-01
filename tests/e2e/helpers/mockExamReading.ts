import { expect, type Page } from "@playwright/test";

const OFFICIAL_FRAME = '[data-no-word-menu="true"]';

export async function openMockReadingPart(page: Page): Promise<void> {
  const directUrl = process.env.PLAYWRIGHT_MOCK_EXAM_READING_URL?.trim();
  if (directUrl) {
    await page.goto(directUrl);
  } else {
    await page.goto("/exam-overview");
    const readingButton = page.getByRole("button", { name: "Reading" }).first();
    await expect(readingButton).toBeEnabled({ timeout: 20_000 });
    await readingButton.click();
  }

  await expect(page).toHaveURL(/\/exams\/exam_.+\/part7/, { timeout: 20_000 });
}

export async function switchToExamMode(page: Page): Promise<void> {
  const examMode = page.getByRole("button", { name: "Exam Mode" });
  await expect(examMode).toBeVisible({ timeout: 15_000 });
  await examMode.click();
  await expect(examMode).toHaveAttribute("aria-pressed", "true");
}

export async function advancePastReadingInstructions(page: Page): Promise<void> {
  const nextButton = page.getByRole("button", { name: /^next$/i });
  if (await nextButton.isVisible().catch(() => false)) {
    await nextButton.click();
  }
}

export function readingDropdownTriggers(page: Page) {
  return page.locator(`${OFFICIAL_FRAME} button.MuiButton-outlined`);
}

export async function openFirstReadingDropdown(page: Page) {
  const trigger = readingDropdownTriggers(page).first();
  await expect(trigger).toBeVisible({ timeout: 15_000 });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  return trigger;
}

export async function expectReadingDropdownMenuVisible(page: Page): Promise<void> {
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible({ timeout: 10_000 });
  const firstOption = page.getByRole("menuitem").first();
  await expect(firstOption).toBeVisible();
  await expect(firstOption).not.toBeEmpty();
}

export async function selectFirstReadingDropdownOption(page: Page): Promise<string> {
  const firstOption = page.getByRole("menuitem").first();
  const label = ((await firstOption.innerText()) || "").trim();
  await firstOption.click();
  await expect(page.getByRole("menu")).toHaveCount(0, { timeout: 5_000 });
  return label;
}
