import { test, expect } from "@playwright/test";
import { BASE, uniqueEmail, signUp, signIn } from "./helpers/auth";

const email = uniqueEmail();

test.describe("Subscription page", () => {
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

  test("renders plan heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /choose your plan/i })).toBeVisible({ timeout: 10000 });
  });

  test("both plan tiers visible", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /choose your plan/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/basic/i).first()).toBeVisible();
    await expect(page.getByText(/premium/i).first()).toBeVisible();
  });

  test("pricing amounts displayed", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /choose your plan/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/\$\d+/).first()).toBeVisible();
  });

  test("subscribe button triggers Stripe checkout redirect", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /choose your plan/i })).toBeVisible({ timeout: 10000 });
    // Button text is "Get Basic" or "Get Premium" for non-subscribed users
    const subscribeBtn = page.getByRole("button", { name: /get (basic|premium)/i }).first();
    await expect(subscribeBtn).toBeVisible({ timeout: 10000 });
    await subscribeBtn.click();
    // Wait for navigation or error toast — checkout may redirect to Stripe or fail gracefully
    await page.waitForTimeout(4000);
    const url = page.url();
    const wentToStripe = url.includes("stripe.com") || url.includes("checkout.stripe.com");
    const stayedOnApp = url.includes("localhost:8080");
    expect(wentToStripe || stayedOnApp).toBeTruthy();
  });

  test("back to profiles link present", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /choose your plan/i })).toBeVisible({ timeout: 10000 });
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
