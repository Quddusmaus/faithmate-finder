/**
 * Call UI tests — tests the call button/UI elements accessible to authenticated users.
 * Actual Daily.co calls are not initiated (requires DAILY_API_KEY + matched users).
 */
import { test, expect } from "@playwright/test";
import { BASE, createTestUser, signIn } from "./helpers/auth";
import type { TestUser } from "./globalSetup";

test.describe("Call UI — messages page elements", () => {
  test.describe.configure({ mode: "serial" });
  let user: TestUser;

  test.beforeAll(async () => {
    user = await createTestUser("calls", { profile: true });
  });

  test.beforeEach(async ({ page }) => {
    await signIn(page, user.email, user.password);
    await page.goto(`${BASE}/messages`);
    await page.waitForTimeout(3000);
  });

  test("messages page loads without call-related JS crash", async ({ page }) => {
    // If VideoCall or CallButton throw on import, page will show error boundary
    const errorBoundary = page.getByText(/something went wrong/i);
    expect(await errorBoundary.isVisible().catch(() => false)).toBeFalsy();
    await expect(page.getByText("Uniting Hearts").first()).toBeVisible();
  });

  test("no unhandled JS errors from call components at page load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${BASE}/messages`);
    await page.waitForTimeout(3000);
    const callErrors = errors.filter(
      (e) => e.toLowerCase().includes("daily") || e.toLowerCase().includes("call"),
    );
    expect(callErrors).toHaveLength(0);
  });

  test("incoming call dialog component imports without error", async ({ page }) => {
    // Navigate to messages which renders IncomingCallDialog in DOM
    await page.goto(`${BASE}/messages`);
    await page.waitForTimeout(2000);
    const crash = page.getByText(/something went wrong|unexpected error/i);
    expect(await crash.isVisible().catch(() => false)).toBeFalsy();
  });
});

test.describe("Call UI — VideoCall component shell", () => {
  test("VideoCall page does not crash when navigated directly", async ({ page }) => {
    // Messages page hosts the VideoCall component — verify no crashes
    const user = await createTestUser("videocall", { profile: true });
    await signIn(page, user.email, user.password);
    await page.goto(`${BASE}/messages`);
    await page.waitForTimeout(2000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.waitForTimeout(2000);
    const fatalErrors = errors.filter(
      (e) => !e.includes("ResizeObserver") && !e.includes("Non-Error"),
    );
    expect(fatalErrors).toHaveLength(0);
  });
});
