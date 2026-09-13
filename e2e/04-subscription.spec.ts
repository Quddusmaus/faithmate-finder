import { test, expect } from "@playwright/test";
import { BASE, uniqueEmail, signUp, signIn } from "./helpers/auth";

const email = uniqueEmail();

// Payments were removed: Stripe is gone and every signed-in member has full
// access. The /subscription route is kept as a no-op "you have full access"
// page so existing links don't 404. These tests assert that page, not a paywall.
test.describe("Subscription page (no-op full-access)", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(90000);

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    const { landed } = await signUp(page, email);
    if (landed !== "/profile-setup") await signIn(page, email);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    const { landed } = await signUp(page, email).catch(() => ({ landed: "" }));
    if (landed !== "/profile-setup") {
      await signIn(page, email).catch(() => {});
    }
    await page.goto(`${BASE}/subscription`);
    await page.waitForURL(`${BASE}/subscription`, { timeout: 10000 });
  });

  test("renders full-access heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /full access/i })).toBeVisible({ timeout: 10000 });
  });

  test("shows nothing-to-purchase message", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /full access/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/nothing to purchase/i)).toBeVisible();
  });

  test("no Stripe checkout buttons present", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /full access/i })).toBeVisible({ timeout: 10000 });
    // Paywall buttons no longer exist — no "Get Basic/Premium", no pricing.
    await expect(page.getByRole("button", { name: /get (basic|premium)/i })).toHaveCount(0);
    await expect(page.getByText(/choose your plan/i)).toHaveCount(0);
  });

  test("start browsing button navigates to profiles", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /full access/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("link", { name: /start browsing/i }).click();
    await page.waitForURL(`${BASE}/profiles`, { timeout: 10000 });
  });

  test("back to profiles link present", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /full access/i })).toBeVisible({ timeout: 10000 });
    const backLink = page.getByRole("link", { name: /back to profiles/i });
    await expect(backLink).toBeVisible();
  });
});

test.describe("Subscription auth gate", () => {
  test("unauthenticated user is redirected to /auth", async ({ page }) => {
    await page.goto(`${BASE}/subscription`);
    await page.waitForURL(/\/(auth|subscription)/, { timeout: 10000 });
  });
});
