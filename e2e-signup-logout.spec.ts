import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:5173";
const TEST_EMAIL = `testuser_${Date.now()}@mailinator.com`;
const TEST_PASSWORD = "Test1234!";
const TEST_NAME = "Test User";

test("signup → check-email screen appears (email confirmation required)", async ({ page }) => {
  // ── 1. Navigate to sign-up ────────────────────────────────────────────
  await page.goto(`${BASE_URL}/auth?mode=signup`);
  await expect(page.getByRole("heading", { name: "Join Us" })).toBeVisible({ timeout: 10000 });
  console.log("✓ Sign-up page loaded");

  // ── 2. Fill signup form ───────────────────────────────────────────────
  await page.getByLabel("Full Name").fill(TEST_NAME);
  await page.getByLabel("Email").fill(TEST_EMAIL);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  console.log(`✓ Filled signup form (${TEST_EMAIL})`);

  // ── 3. Submit ─────────────────────────────────────────────────────────
  await page.getByRole("button", { name: "Create Account" }).click();

  // Wait for page to settle (still on /auth — URL doesn't change)
  await page.waitForTimeout(3000);

  // ── 4a. Email confirmation required → check-email screen ──────────────
  const checkEmailHeading = page.getByRole("heading", { name: "Check Your Email" });
  const directRedirect = await checkEmailHeading.isVisible().catch(() => false);

  if (directRedirect) {
    // Supabase returned no session — confirm required
    console.log("✓ 'Check Your Email' screen is shown");

    // The user's email address should be displayed
    await expect(page.getByText(TEST_EMAIL)).toBeVisible();
    console.log("✓ User email is shown on the confirmation screen");

    // Resend button should be present
    await expect(page.getByRole("button", { name: /resend/i })).toBeVisible();
    console.log("✓ 'Resend confirmation email' button is visible");

    // Back to sign in link
    await page.getByRole("button", { name: /back to sign in/i }).click();
    await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
    console.log("✓ 'Back to sign in' returns to login form");

    console.log("\n  Note: full post-login flow requires email to be confirmed.");
    console.log("  To skip confirmation, disable it in Supabase Auth settings.");
    return;
  }

  // ── 4b. Email confirmation disabled → redirected to profile-setup ──────
  await page.waitForURL(/\/profile-setup/, { timeout: 10000 });
  console.log("✓ Email confirmation disabled — redirected to /profile-setup");

  // Confirm profile-setup page loaded (use the nav Heart icon link as anchor)
  await expect(page.locator("nav").getByRole("link").first()).toBeVisible({ timeout: 10000 });
  console.log("✓ Profile setup page loaded and user is authenticated");

  // ── 5. Sign out ───────────────────────────────────────────────────────
  // Use desktop viewport so the Sign Out button is directly in the nav
  await page.setViewportSize({ width: 1280, height: 800 });
  const signOutBtn = page.getByRole("button", { name: /sign out/i }).first();
  await expect(signOutBtn).toBeVisible({ timeout: 5000 });
  await signOutBtn.click();
  console.log("✓ Clicked Sign Out");

  await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
  console.log("✓ Signed out — back on landing page");

  // Confirm session is cleared
  await page.goto(`${BASE_URL}/profiles`);
  await page.waitForURL(/\/auth/, { timeout: 8000 });
  console.log("✓ /profiles redirects to /auth — session correctly cleared");
});
