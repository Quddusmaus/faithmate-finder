/**
 * Call UI tests — tests the call button/UI elements accessible to authenticated users.
 * Actual Daily.co calls are not initiated (requires DAILY_API_KEY + matched users).
 */
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { BASE, createTestUser, signIn } from "./helpers/auth";
import { openChat } from "./helpers/journey";
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

// Admin → Dashboard → "Video and voice calls" (app_settings.video_calls).
test.describe("Calls switch", () => {
  const url = (process.env.VITE_SUPABASE_URL ?? "").replace(/\s/g, "");
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  const anonKey = (process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").replace(/\s/g, "");
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;

  test.skip(!url || !serviceKey || !anonKey, "Supabase keys not set");
  test.skip(!adminEmail || !adminPassword, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set");

  const service = () => createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const setCalls = (enabled: boolean) =>
    service().from("app_settings").update({ enabled }).eq("key", "video_calls");

  test.afterEach(async () => {
    await setCalls(true);
  });

  test("members can't flip it; turning it off hides the call button", async ({ page, browser }) => {
    test.setTimeout(120000);
    await setCalls(true);
    const nameB = `Switch B ${Date.now()}`;
    const a = await createTestUser("switch_a", { profile: { name: `Switch A ${Date.now()}` } });
    const b = await createTestUser("switch_b", { profile: { name: nameB } });
    const { error: likeError } = await service().from("likes").insert([
      { user_id: a.id, liked_user_id: b.id },
      { user_id: b.id, liked_user_id: a.id },
    ]);
    expect(likeError).toBeNull();

    // A member's update is filtered out by RLS: no row comes back and nothing changes.
    const member = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    await member.auth.signInWithPassword({ email: a.email, password: a.password });
    const { data: changed } = await member.from("app_settings").update({ enabled: false }).eq("key", "video_calls").select();
    expect(changed ?? []).toHaveLength(0);
    const { data: still } = await member.from("app_settings").select("enabled").eq("key", "video_calls").single();
    expect(still?.enabled).toBe(true);

    await signIn(page, a.email, a.password);
    await openChat(page, nameB);
    const callButton = page.locator("button:has(svg.lucide-phone)");
    await expect(callButton.first()).toBeVisible({ timeout: 15000 });

    const adminPage = await browser.newPage();
    try {
      await signIn(adminPage, adminEmail!, adminPassword!);
      await adminPage.goto(`${BASE}/admin`);
      const toggle = adminPage.getByRole("switch", { name: "Video and voice calls" });
      await expect(toggle).toBeChecked({ timeout: 20000 });
      await toggle.click();
      await expect(toggle).not.toBeChecked();
      await expect(adminPage.getByText("Calls turned off")).toBeVisible();
    } finally {
      await adminPage.close();
    }

    await openChat(page, nameB);
    await expect(page.getByPlaceholder("Type a message...")).toBeVisible();
    await expect(callButton).toHaveCount(0);
  });
});
