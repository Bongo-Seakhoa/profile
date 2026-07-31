import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  timeout: 45_000,
  globalSetup: "./tests/e2e/global-setup.mjs",
  expect: {
    timeout: 8_000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4321/profile/",
    colorScheme: "light",
    locale: "en-GB",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chrome-desktop",
      testIgnore: /cross-browser-smoke\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
      },
    },
    {
      name: "chrome-mobile",
      testIgnore: /cross-browser-smoke\.spec\.ts/,
      use: {
        ...devices["Pixel 5"],
        channel: "chrome",
      },
    },
    {
      name: "firefox-desktop",
      testMatch: /cross-browser-smoke\.spec\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        trace: "off",
        video: "off",
      },
    },
    {
      name: "webkit-desktop",
      testMatch: /cross-browser-smoke\.spec\.ts/,
      use: {
        ...devices["Desktop Safari"],
        trace: "off",
        video: "off",
      },
    },
  ],
});
