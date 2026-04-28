/**
 * Sign-out tests: session cleared, protected routes redirect to /auth after sign-out.
 */
import { test, expect } from "@playwright/test";
import { BASE, uniqueEmail, signUp, signIn, signOut } from "./helpers/auth";

test.describe("Sign out", () => {
  const email = uniqueEmail();

  test("sign out from profile-setup clears session", async ({ page }) => {
    const { landed } = await signUp(page, email);
    if (landed !== "/profile-setup") {
      await signIn(page, email);
      const dest = new URL(page.url()).pathname;
      if (dest !== "/profile-setup") {
        await page.goto(`${BASE}/profile-setup`);
        await page.waitForURL(`${BASE}/profile-setup`, { timeout: 10000 });
      }
    }
    await signOut(page);
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("/profiles redirects to /auth after sign-out", async ({ page }) => {
    const { landed } = await signUp(page, email);
    if (landed !== "/profile-setup") await signIn(page, email);
    await page.goto(`${BASE}/profile-setup`);
    await page.waitForTimeout(2000);
    await signOut(page);
    await page.goto(`${BASE}/profiles`);
    await page.waitForURL(/\/auth/, { timeout: 10000 });
  });

  test("/messages redirects to /auth after sign-out", async ({ page }) => {
    const { landed } = await signUp(page, email);
    if (landed !== "/profile-setup") await signIn(page, email);
    await page.goto(`${BASE}/profile-setup`);
    await page.waitForTimeout(2000);
    await signOut(page);
    await page.goto(`${BASE}/messages`);
    await page.waitForURL(/\/auth/, { timeout: 10000 });
  });

  test("/profile-setup redirects to /auth after sign-out", async ({ page }) => {
    const { landed } = await signUp(page, email);
    if (landed !== "/profile-setup") await signIn(page, email);
    await page.goto(`${BASE}/profile-setup`);
    await page.waitForTimeout(2000);
    await signOut(page);
    await page.goto(`${BASE}/profile-setup`);
    await page.waitForURL(/\/auth/, { timeout: 10000 });
  });
});
