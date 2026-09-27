import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
config({ override: true });

/**
 * Read-only smoke checks against the deployed app (default https://unityhearts.app).
 * Unlike playwright.config.ts there is no local dev server and no globalSetup or
 * globalTeardown: nothing here creates users or writes member data. Run with
 * `npm run test:prod` or the "Production smoke" workflow.
 */
export default defineConfig({
  testDir: "./e2e-prod",
  timeout: 45000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-prod" }]],
  outputDir: "test-results-prod",
  use: {
    baseURL: process.env.PROD_URL || "https://unityhearts.app",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
});
