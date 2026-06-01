import type { PlaywrightTestConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173";
const useExistingServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);

const config: PlaywrightTestConfig = {
  testDir: "./tests/e2e",
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL,
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
  ...(useExistingServer
    ? {}
    : {
        webServer: {
          command: "npm run dev -- --port 4173",
          url: "http://127.0.0.1:4173",
          reuseExistingServer: !process.env.CI,
          timeout: 180 * 1000,
        },
      }),
};

export default config;

