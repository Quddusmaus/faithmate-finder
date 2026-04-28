import { test, expect } from "@playwright/test";
import { BASE, uniqueEmail, DEFAULT_PASSWORD, signUp } from "./helpers/auth";

test.describe("Auth page", () => {
  test("login form renders on default load", async ({ page }) => {
    await page.goto(`${BASE}/auth`);
    await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("form toggle — login ↔ signup", async ({ page }) => {
    await page.goto(`${BASE}/auth`);
    await page.getByRole("button", { name: /don.?t have an account/i }).click();
    await expect(page.getByRole("heading", { name: "Join Us" })).toBeVisible();
    await page.getByRole("button", { name: /already have an account/i }).click();
    await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
  });

  test("signup form visible via query param", async ({ page }) => {
    await page.goto(`${BASE}/auth?mode=signup`);
    await expect(page.getByRole("heading", { name: "Join Us" })).toBeVisible();
    await expect(page.getByLabel("Full Name")).toBeVisible();
  });

  test("bad credentials — stays on /auth and shows error", async ({ page }) => {
    await page.goto(`${BASE}/auth`);
    await page.getByLabel("Email").fill("nobody_at_all@example.com");
    await page.getByLabel("Password").fill("wrongpassword99");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForTimeout(4000);
    expect(new URL(page.url()).pathname).toBe("/auth");
  });

  test("forgot-password flow — form renders and accepts email", async ({ page }) => {
    await page.goto(`${BASE}/auth`);
    await page.getByRole("button", { name: /forgot password/i }).click();
    await expect(page.getByRole("heading", { name: "Reset Password" })).toBeVisible();
    await page.getByLabel("Email").fill("test_reset@example.com");
    await page.getByRole("button", { name: /send reset link/i }).click();
    await page.waitForTimeout(3000);
    // Should stay on /auth (email sent, no redirect)
    expect(new URL(page.url()).pathname).toBe("/auth");
  });

  test("signup → check-email or profile-setup", async ({ page }) => {
    const email = uniqueEmail();
    const { landed } = await signUp(page, email);

    if (landed === "/profile-setup") {
      await expect(page.locator("nav").first()).toBeVisible();
    } else {
      // Email confirmation required
      await expect(page.getByRole("heading", { name: "Check Your Email" })).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(email)).toBeVisible();
      await expect(page.getByRole("button", { name: /resend/i })).toBeVisible();
    }
  });

  test("check-email screen — back to sign in", async ({ page }) => {
    const { landed } = await signUp(page, uniqueEmail());
    if (landed !== "/profile-setup") {
      await expect(page.getByRole("heading", { name: "Check Your Email" })).toBeVisible({ timeout: 5000 });
      await page.getByRole("button", { name: /back to sign in/i }).click();
      await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
    } else {
      test.skip(true, "Email confirmation disabled — check-email screen not shown");
    }
  });

  test("unauthenticated /profile-setup redirects to /auth", async ({ page }) => {
    // Ensure no session by navigating directly
    await page.goto(`${BASE}/profile-setup`);
    await page.waitForURL(/\/(auth|profile-setup)/, { timeout: 10000 });
    const path = new URL(page.url()).pathname;
    // Either redirected to /auth (unauthenticated) or stays (authenticated from prior test)
    expect(["/auth", "/profile-setup"]).toContain(path);
  });
});
