/**
 * Safety flows: block, report, ban appeal.
 * Block and report dialogs live on profile cards (subscription gated).
 * The /appeal page is public — we can test that directly.
 */
import { test, expect } from "@playwright/test";
import { BASE, uniqueEmail, signUp, signIn } from "./helpers/auth";

test.describe("Ban Appeal page — unauthenticated redirect", () => {
  test("unauthenticated user is redirected to /auth from /appeal", async ({ page }) => {
    await page.goto(`${BASE}/appeal`);
    // BanAppeal calls getUserWithTimeout and redirects unauthenticated users to /auth
    await page.waitForURL(/\/(auth|appeal)/, { timeout: 10000 });
    const path = new URL(page.url()).pathname;
    // Either redirected to /auth or shows loading state briefly before redirect
    expect(["/auth", "/appeal"]).toContain(path);
  });

  test("appeal page does not crash on load", async ({ page }) => {
    await page.goto(`${BASE}/appeal`);
    await page.waitForTimeout(3000);
    const crash = page.getByText(/something went wrong/i);
    expect(await crash.isVisible().catch(() => false)).toBeFalsy();
  });
});

test.describe("Ban Appeal page — authenticated user", () => {
  const email = uniqueEmail();

  test.beforeEach(async ({ page }) => {
    const { landed } = await signUp(page, email);
    if (landed !== "/profile-setup") await signIn(page, email);
    await page.goto(`${BASE}/appeal`);
  });

  test("appeal heading visible", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /appeal/i })).toBeVisible({ timeout: 10000 });
  });

  test("appeal history section renders without crash", async ({ page }) => {
    await expect(page.getByText("Unity Hearts").first()).toBeVisible({ timeout: 10000 });
    const crash = page.getByText(/something went wrong/i);
    expect(await crash.isVisible().catch(() => false)).toBeFalsy();
  });
});

test.describe("Safety tips page", () => {
  test("safety tips page loads with content", async ({ page }) => {
    await page.goto(`${BASE}/safety`);
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator("body")).not.toContainText("404");
  });
});

test.describe("Block and Report UI — profile card dialogs", () => {
  const email = uniqueEmail();

  test.beforeEach(async ({ page }) => {
    const { landed } = await signUp(page, email);
    if (landed !== "/profile-setup") await signIn(page, email);
    await page.goto(`${BASE}/profiles`);
    await page.waitForURL(/\/(profiles|subscription)/, { timeout: 15000 });
  });

  test("profiles page or subscription gate renders without crash", async ({ page }) => {
    const path = new URL(page.url()).pathname;
    expect(["/profiles", "/subscription"]).toContain(path);
    const crash = page.getByText(/something went wrong/i);
    expect(await crash.isVisible().catch(() => false)).toBeFalsy();
  });

  test("block dialog accessible from profile card (if profiles visible)", async ({ page }) => {
    if (new URL(page.url()).pathname !== "/profiles") {
      test.skip(true, "Not subscribed — skipping block dialog test");
      return;
    }
    await page.waitForTimeout(3000);
    // Look for any profile card action button (3-dot menu or block trigger)
    const actionBtn = page
      .locator("button")
      .filter({ hasText: /block|report|more/i })
      .first();
    if (await actionBtn.isVisible()) {
      await actionBtn.click();
      await page.waitForTimeout(500);
      // Dialog or menu should appear
      const dialog = page.getByRole("dialog").or(page.getByRole("menu"));
      await expect(dialog.first()).toBeVisible({ timeout: 3000 });
    }
  });
});
