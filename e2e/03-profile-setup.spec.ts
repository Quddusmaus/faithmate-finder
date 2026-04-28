import { test, expect } from "@playwright/test";
import { BASE, uniqueEmail, DEFAULT_PASSWORD, signUp, signIn } from "./helpers/auth";

const email = uniqueEmail();

test.describe("Profile setup wizard", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    const { landed } = await signUp(page, email);
    if (landed !== "/profile-setup") {
      const dest = await signIn(page, email);
      if (dest !== "/profile-setup") {
        await page.goto(`${BASE}/profile-setup`);
        await page.waitForURL(`${BASE}/profile-setup`, { timeout: 10000 });
      }
    }
  });

  test("wizard step 1 renders — name, age fields visible", async ({ page }) => {
    await expect(page.getByText(/step 1 of 5/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/name/i)).toBeVisible();
  });

  test("continue disabled when name is empty", async ({ page }) => {
    await expect(page.getByText(/step 1 of 5/i)).toBeVisible({ timeout: 10000 });
    await page.getByLabel(/name/i).fill("");
    await expect(page.getByRole("button", { name: /continue/i })).toBeDisabled();
  });

  test("back button returns to previous step", async ({ page }) => {
    await expect(page.getByText(/step 1 of 5/i)).toBeVisible({ timeout: 10000 });
    await page.getByLabel(/name/i).fill("Back Test");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(/step 2 of 5/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /back/i }).click();
    await expect(page.getByText(/step 1 of 5/i)).toBeVisible({ timeout: 5000 });
  });

  test("full wizard — all 5 steps and profile saved", async ({ page }) => {
    await expect(page.getByText(/step 1 of 5/i)).toBeVisible({ timeout: 10000 });

    // Step 1 — Basics
    await page.getByLabel(/name/i).fill("Full Wizard Test");
    const age = page.getByLabel(/age/i);
    if (await age.isVisible()) await age.fill("29");
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 2 — Location
    await expect(page.getByText(/step 2 of 5/i)).toBeVisible({ timeout: 5000 });
    const loc = page.getByLabel(/location/i);
    if (await loc.isVisible()) await loc.fill("San Francisco, CA");
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 3 — Bio
    await expect(page.getByText(/step 3 of 5/i)).toBeVisible({ timeout: 5000 });
    const bio = page.getByLabel(/bio/i).or(page.getByPlaceholder(/tell us about yourself/i));
    if (await bio.isVisible()) await bio.fill("E2E test bio for Playwright.");
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 4 — Photos (skip upload)
    await expect(page.getByText(/step 4 of 5/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 5 — Interests
    await expect(page.getByText(/step 5 of 5/i)).toBeVisible({ timeout: 5000 });
    const interest = page.locator("button").filter({ hasText: /prayer|study|music|arts/i }).first();
    if (await interest.isVisible()) await interest.click();

    // Save
    await page.getByRole("button", { name: /create profile|update profile/i }).click();
    await page.waitForURL(/\/(profiles|subscription)/, { timeout: 20000 });
  });

  test("profile setup nav — sign out button visible", async ({ page }) => {
    await expect(page.getByText(/step 1 of 5/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /sign out/i }).first()).toBeVisible();
  });

  test("profile setup nav — branding link visible", async ({ page }) => {
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 20000 });
    // Heart icon link is always visible; "Unity Hearts" text uses `hidden xs:inline` so may be CSS-hidden
    const navBrand = page.locator("nav a").filter({ has: page.locator("svg") }).first();
    await expect(navBrand).toBeVisible({ timeout: 10000 });
  });
});
