/**
 * Sign-out tests: session cleared, protected routes redirect to /auth after sign-out.
 */
import { test, expect } from "@playwright/test";
import { BASE, createTestUser, signIn, signOut } from "./helpers/auth";
import type { TestUser } from "./globalSetup";

test.describe("Sign out", () => {
  let user: TestUser;

  // No profile: signIn lands on the /profile-setup wizard, whose nav has the sign-out button
  test.beforeAll(async () => {
    user = await createTestUser("signout");
  });

  test("sign out from profile-setup clears session", async ({ page }) => {
    const dest = await signIn(page, user.email, user.password);
    if (dest !== "/profile-setup") {
      await page.goto(`${BASE}/profile-setup`);
      await page.waitForURL(`${BASE}/profile-setup`, { timeout: 10000 });
    }
    await signOut(page);
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("/profiles redirects to /auth after sign-out", async ({ page }) => {
    await signIn(page, user.email, user.password);
    await page.goto(`${BASE}/profile-setup`);
    await page.waitForTimeout(2000);
    await signOut(page);
    await page.goto(`${BASE}/profiles`);
    await page.waitForURL(/\/auth/, { timeout: 10000 });
  });

  test("/messages redirects to /auth after sign-out", async ({ page }) => {
    await signIn(page, user.email, user.password);
    await page.goto(`${BASE}/profile-setup`);
    await page.waitForTimeout(2000);
    await signOut(page);
    await page.goto(`${BASE}/messages`);
    await page.waitForURL(/\/auth/, { timeout: 10000 });
  });

  test("/profile-setup redirects to /auth after sign-out", async ({ page }) => {
    await signIn(page, user.email, user.password);
    await page.goto(`${BASE}/profile-setup`);
    await page.waitForTimeout(2000);
    await signOut(page);
    await page.goto(`${BASE}/profile-setup`);
    await page.waitForURL(/\/auth/, { timeout: 10000 });
  });
});
