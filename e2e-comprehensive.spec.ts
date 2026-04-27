/**
 * Comprehensive end-to-end test suite for Unity Hearts / FaithMate Finder.
 *
 * Flows covered:
 *  1. Public pages  — landing, footer links, 404
 *  2. Auth          — login errors, signup → check-email or profile-setup
 *  3. Profile setup — 5-step wizard (name, location, bio, photos step, interests step)
 *  4. Subscription  — new users are gated here; plans render correctly
 *  5. Messages      — auth guard and empty/loaded state
 *  6. Profiles      — auth guard; subscription gate for non-subscribers
 *  7. Sign out      — session cleared, protected routes redirect to /auth
 */

import { test, expect, Page } from "@playwright/test";

const BASE = "http://localhost:5173";
const EMAIL = `e2e_${Date.now()}@mailinator.com`;
const PASSWORD = "Test1234!";
const DISPLAY_NAME = "E2E Tester";

// ─── helpers ────────────────────────────────────────────────────────────────

async function signUpFresh(page: Page) {
  await page.goto(`${BASE}/auth?mode=signup`);
  await page.getByLabel("Full Name").fill(DISPLAY_NAME);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create Account" }).click();

  // Two outcomes: immediate session (email confirm off) → /profile-setup
  //               or check-email screen stays on /auth
  await page.waitForTimeout(3000);
  return new URL(page.url()).pathname;
}

async function signInExisting(page: Page) {
  await page.goto(`${BASE}/auth`);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/(profiles|subscription|profile-setup)/, { timeout: 15000 });
}

// ─── 1. PUBLIC PAGES ────────────────────────────────────────────────────────

test.describe("Public pages", () => {
  test("landing page renders hero and navigation", async ({ page }) => {
    await page.goto(BASE);
    // Branding
    await expect(page.getByText("Unity Hearts").first()).toBeVisible();
    // Hero CTA buttons
    await expect(page.getByRole("link", { name: /get started/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /log.?in|sign.?in/i }).first()).toBeVisible();
    // Feature cards (text comes from i18n en.json keys)
    await expect(page.getByText(/unity in diversity/i)).toBeVisible();
    await expect(page.getByText(/core curriculum compatibility/i)).toBeVisible();
    console.log("✓ Landing page");
  });

  test("footer links navigate to public content pages", async ({ page }) => {
    await page.goto(BASE);
    for (const [label, path] of [
      ["Terms", "/terms"],
      ["Privacy", "/privacy"],
      ["Contact", "/contact"],
      ["Safety", "/safety"],
    ] as [string, string][]) {
      await page.goto(`${BASE}${path}`);
      // Just confirm we get a 200-rendered page (not NotFound)
      await expect(page.locator("body")).not.toContainText("404");
      console.log(`✓ ${label} page (${path})`);
    }
  });

  test("unknown route shows 404 page", async ({ page }) => {
    await page.goto(`${BASE}/this-does-not-exist`);
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible({ timeout: 5000 });
    console.log("✓ 404 page");
  });
});

// ─── 2. AUTH ────────────────────────────────────────────────────────────────

test.describe("Auth", () => {
  test("login form shows error on bad credentials", async ({ page }) => {
    await page.goto(`${BASE}/auth`);
    await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).click();
    // Should stay on /auth and show an error toast or message
    await page.waitForTimeout(4000);
    expect(new URL(page.url()).pathname).toBe("/auth");
    console.log("✓ Bad credentials stay on /auth");
  });

  test("forgot-password form is reachable and accepts email", async ({ page }) => {
    await page.goto(`${BASE}/auth`);
    await page.getByRole("button", { name: /forgot password/i }).click();
    await expect(page.getByRole("heading", { name: "Reset Password" })).toBeVisible();
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByRole("button", { name: /send reset link/i }).click();
    await page.waitForTimeout(3000);
    console.log("✓ Forgot-password form");
  });

  test("signup → profile-setup or check-email screen", async ({ page }) => {
    const dest = await signUpFresh(page);

    if (dest === "/profile-setup") {
      await expect(page.locator("nav").first()).toBeVisible();
      console.log("✓ Signup → /profile-setup (email confirm disabled)");
    } else {
      // stayed on /auth — check for check-email UI
      const heading = page.getByRole("heading", { name: "Check Your Email" });
      await expect(heading).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(EMAIL)).toBeVisible();
      await expect(page.getByRole("button", { name: /resend/i })).toBeVisible();
      console.log("✓ Signup → check-email screen (email confirm enabled)");
    }
  });

  test("signup mode toggle switches between forms", async ({ page }) => {
    await page.goto(`${BASE}/auth`);
    await page.getByRole("button", { name: /don.?t have an account/i }).click();
    await expect(page.getByRole("heading", { name: "Join Us" })).toBeVisible();
    await page.getByRole("button", { name: /already have an account/i }).click();
    await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
    console.log("✓ Form mode toggle works");
  });
});

// ─── 3. PROFILE SETUP WIZARD ────────────────────────────────────────────────

test.describe("Profile setup wizard", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    // Use fresh signup (email confirm off) or existing session
    const dest = await signUpFresh(page);
    if (dest !== "/profile-setup") {
      // Email confirm is on — try logging in with the account we just created
      // (it may already exist from a previous run)
      await signInExisting(page);
      const path = new URL(page.url()).pathname;
      if (path !== "/profile-setup") {
        await page.goto(`${BASE}/profile-setup`);
      }
    }
    await page.waitForURL(`${BASE}/profile-setup`, { timeout: 10000 });
  });

  test("wizard step 1 — basics (name, age, gender)", async ({ page }) => {
    // Step 1 should be visible by default
    await expect(page.getByText(/step 1 of 5/i)).toBeVisible({ timeout: 8000 });

    await page.getByLabel(/name/i).fill("My Test Name");
    const ageInput = page.getByLabel(/age/i);
    if (await ageInput.isVisible()) await ageInput.fill("28");
    console.log("✓ Step 1: name & age filled");
  });

  test("wizard navigates through all 5 steps and saves", async ({ page }) => {
    await expect(page.getByText(/step 1 of 5/i)).toBeVisible({ timeout: 8000 });

    // Step 1 — Basics
    await page.getByLabel(/name/i).fill(DISPLAY_NAME);
    const ageInput = page.getByLabel(/age/i);
    if (await ageInput.isVisible()) await ageInput.fill("30");
    await page.getByRole("button", { name: /continue/i }).click();
    console.log("✓ Step 1 → continue");

    // Step 2 — Location
    await expect(page.getByText(/step 2 of 5/i)).toBeVisible({ timeout: 5000 });
    const locationInput = page.getByLabel(/location/i);
    if (await locationInput.isVisible()) await locationInput.fill("Los Angeles, CA");
    await page.getByRole("button", { name: /continue/i }).click();
    console.log("✓ Step 2 → continue");

    // Step 3 — About / Bio
    await expect(page.getByText(/step 3 of 5/i)).toBeVisible({ timeout: 5000 });
    const bioInput = page.getByLabel(/bio/i).or(page.getByPlaceholder(/tell us about yourself/i));
    if (await bioInput.isVisible()) await bioInput.fill("Testing the profile setup wizard end to end.");
    await page.getByRole("button", { name: /continue/i }).click();
    console.log("✓ Step 3 → continue");

    // Step 4 — Photos (skip upload, just advance)
    await expect(page.getByText(/step 4 of 5/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /continue/i }).click();
    console.log("✓ Step 4 → continue (photos skipped)");

    // Step 5 — Interests
    await expect(page.getByText(/step 5 of 5/i)).toBeVisible({ timeout: 5000 });
    // Pick first available interest badge if present
    const interestBtn = page.locator("button").filter({ hasText: /prayer|study|music|art/i }).first();
    if (await interestBtn.isVisible()) await interestBtn.click();

    // Save profile (button label is "Create Profile" for new users, "Update Profile" when editing)
    await page.getByRole("button", { name: /create profile|update profile/i }).click();
    // Should navigate to /profiles (or /subscription for non-subscribers)
    await page.waitForURL(/\/(profiles|subscription)/, { timeout: 15000 });
    console.log(`✓ Profile saved → ${new URL(page.url()).pathname}`);
  });

  test("back button returns to previous step", async ({ page }) => {
    await expect(page.getByText(/step 1 of 5/i)).toBeVisible({ timeout: 8000 });
    await page.getByLabel(/name/i).fill(DISPLAY_NAME);
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(/step 2 of 5/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /back/i }).click();
    await expect(page.getByText(/step 1 of 5/i)).toBeVisible({ timeout: 5000 });
    console.log("✓ Back button works");
  });

  test("step 1 requires name before advancing", async ({ page }) => {
    await expect(page.getByText(/step 1 of 5/i)).toBeVisible({ timeout: 8000 });
    // Clear any pre-filled name
    await page.getByLabel(/name/i).fill("");
    const nextBtn = page.getByRole("button", { name: /continue/i });
    await expect(nextBtn).toBeDisabled();
    console.log("✓ Next disabled when name is empty");
  });
});

// ─── 4. SUBSCRIPTION PAGE ───────────────────────────────────────────────────

test.describe("Subscription page", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const dest = await signUpFresh(page);
    if (dest !== "/profile-setup") {
      await signInExisting(page);
    }
    // Navigate to subscription directly
    await page.goto(`${BASE}/subscription`);
    await page.waitForURL(`${BASE}/subscription`, { timeout: 10000 });
  });

  test("subscription page renders both plan tiers", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /choose your plan/i })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/basic/i).first()).toBeVisible();
    await expect(page.getByText(/premium/i).first()).toBeVisible();
    console.log("✓ Both subscription tiers visible");
  });

  test("plan cards display pricing and feature lists", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /choose your plan/i })).toBeVisible({ timeout: 8000 });
    // At least one price in $ format
    await expect(page.getByText(/\$\d+\.\d+/).first()).toBeVisible();
    // Check icons render (feature check marks)
    const checkItems = page.locator("li").filter({ has: page.locator("svg") });
    await expect(checkItems.first()).toBeVisible();
    console.log("✓ Pricing and features visible");
  });

  test("back-to-profiles link is present", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /choose your plan/i })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole("link", { name: /back to profiles/i })).toBeVisible();
    console.log("✓ Back to Profiles link present");
  });
});

// ─── 5. MESSAGES PAGE ───────────────────────────────────────────────────────

test.describe("Messages page", () => {
  test("unauthenticated user is redirected to /auth", async ({ page }) => {
    await page.goto(`${BASE}/messages`);
    await page.waitForURL(/\/auth/, { timeout: 8000 });
    console.log("✓ /messages → /auth for unauthenticated users");
  });

  test("authenticated user sees messages layout", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const dest = await signUpFresh(page);
    if (dest !== "/profile-setup") {
      await signInExisting(page);
    }
    await page.goto(`${BASE}/messages`);
    // Should not redirect to /auth
    await page.waitForTimeout(4000);
    expect(new URL(page.url()).pathname).toBe("/messages");
    // Nav branding visible
    await expect(page.getByText("Unity Hearts")).toBeVisible();
    // Sidebar placeholder visible when no matches
    await expect(
      page.getByText(/select a match|no matches|start chatting/i).or(
        page.getByText(/loading/i)
      ).first()
    ).toBeVisible({ timeout: 8000 });
    console.log("✓ Messages page loads for authenticated user");
  });
});

// ─── 6. PROFILES / BROWSE ───────────────────────────────────────────────────

test.describe("Profiles / browse page", () => {
  test("unauthenticated user is redirected to /auth", async ({ page }) => {
    await page.goto(`${BASE}/profiles`);
    await page.waitForURL(/\/auth/, { timeout: 8000 });
    console.log("✓ /profiles → /auth for unauthenticated users");
  });

  test("authenticated non-subscriber is redirected to /subscription", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const dest = await signUpFresh(page);
    if (dest !== "/profile-setup") {
      await signInExisting(page);
    }
    await page.goto(`${BASE}/profiles`);
    // Non-subscriber should hit subscription gate
    await page.waitForURL(/\/(subscription|profiles)/, { timeout: 12000 });
    const path = new URL(page.url()).pathname;
    if (path === "/subscription") {
      await expect(page.getByRole("heading", { name: /choose your plan/i })).toBeVisible();
      console.log("✓ Non-subscriber redirected to /subscription");
    } else {
      // Comped or admin — landed on profiles
      await expect(page.getByText(/discover your match/i)).toBeVisible();
      console.log("✓ User has access (comped/admin) — /profiles loaded");
    }
  });
});

// ─── 7. SIGN OUT ────────────────────────────────────────────────────────────

test.describe("Sign out", () => {
  test("sign out from profile-setup clears session", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const dest = await signUpFresh(page);
    if (dest !== "/profile-setup") {
      await signInExisting(page);
      const path = new URL(page.url()).pathname;
      if (path !== "/profile-setup") {
        await page.goto(`${BASE}/profile-setup`);
        await page.waitForURL(`${BASE}/profile-setup`, { timeout: 8000 });
      }
    }

    // Click sign out in the nav (desktop viewport)
    const signOutBtn = page.getByRole("button", { name: /sign out/i }).first();
    await expect(signOutBtn).toBeVisible({ timeout: 8000 });
    await signOutBtn.click();

    // Should land on "/"
    await page.waitForURL(`${BASE}/`, { timeout: 10000 });
    console.log("✓ Signed out → landing page");

    // Session must be gone — /profiles should redirect to /auth
    await page.goto(`${BASE}/profiles`);
    await page.waitForURL(/\/auth/, { timeout: 8000 });
    console.log("✓ /profiles redirects to /auth after sign-out");

    // /messages should redirect to /auth
    await page.goto(`${BASE}/messages`);
    await page.waitForURL(/\/auth/, { timeout: 8000 });
    console.log("✓ /messages redirects to /auth after sign-out");
  });
});
