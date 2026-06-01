import type { PlaywrightTestConfig } from "@playwright/test";

/** Use when `npm run dev` is already running on port 3001 (skips webServer). */
const config: PlaywrightTestConfig = {
  testDir: "./tests/e2e",
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001",
    headless: true,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  reporter: [["list"]],
};

export default config;
