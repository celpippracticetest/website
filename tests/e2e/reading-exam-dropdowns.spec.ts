import { test, expect } from "@playwright/test";
import { getTestCredentials, signInWithPassword } from "./helpers/auth";
import {
  advancePastReadingInstructions,
  expectReadingDropdownMenuVisible,
  openFirstReadingDropdown,
  openMockReadingPart,
  readingDropdownTriggers,
  selectFirstReadingDropdownOption,
  switchToExamMode,
} from "./helpers/mockExamReading";

const credentials = getTestCredentials();

test.describe("mock reading exam dropdowns", () => {
  test.skip(
    !credentials,
    "Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD to run authenticated exam tests."
  );

  test.beforeEach(async ({ page }) => {
    test.setTimeout(90_000);
    if (!credentials) {
      return;
    }
    await signInWithPassword(page, credentials.email, credentials.password);
  });

  test("official mode: dropdown opens and answer can be selected (desktop)", async ({
    page,
  }) => {
    await openMockReadingPart(page);
    await switchToExamMode(page);
    await advancePastReadingInstructions(page);

    await expect(page.getByText(/drop-down menu/i)).toBeVisible({ timeout: 15_000 });
    await expect(readingDropdownTriggers(page).first()).toBeVisible();

    const trigger = await openFirstReadingDropdown(page);
    await expectReadingDropdownMenuVisible(page);

    const selectedLabel = await selectFirstReadingDropdownOption(page);
    expect(selectedLabel.length).toBeGreaterThan(0);
    await expect(trigger).toContainText(selectedLabel);
  });

  test("official mode: dropdown opens and answer can be selected (mobile)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await openMockReadingPart(page);
    await switchToExamMode(page);
    await advancePastReadingInstructions(page);

    const trigger = await openFirstReadingDropdown(page);
    await expectReadingDropdownMenuVisible(page);

    const selectedLabel = await selectFirstReadingDropdownOption(page);
    expect(selectedLabel.length).toBeGreaterThan(0);
    await expect(trigger).toContainText(selectedLabel);
  });
});
