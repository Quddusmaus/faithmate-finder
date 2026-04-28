import { Page } from "@playwright/test";
import fs from "fs";
import { USERS_FILE, TestUsers } from "../globalSetup";

/** Returns the pre-created confirmed test users written by globalSetup. */
export function readTestUsers(): TestUsers {
  if (!fs.existsSync(USERS_FILE)) {
    throw new Error(
      `Test users file not found at ${USERS_FILE}. ` +
        "Ensure SUPABASE_SERVICE_ROLE_KEY is set and globalSetup ran successfully.",
    );
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8")) as TestUsers;
}

export const BASE = "http://localhost:8080";

// Pre-set cookie consent localStorage key so the banner never blocks UI interactions.
// Call this before any navigation in tests that drive the wizard or interact with buttons.
export async function dismissCookieBanner(page: Page): Promise<void> {
  const script = () => {
    try {
      localStorage.setItem(
        "unity-hearts-cookie-consent",
        JSON.stringify({ essential: true, analytics: true, marketing: true, timestamp: new Date().toISOString() }),
      );
    } catch {}
  };
  await page.addInitScript(script);
  await page.evaluate(script).catch(() => {});
}

export function uniqueEmail(): string {
  return `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@mailinator.com`;
}

export const DEFAULT_PASSWORD = "Test1234!";
export const DEFAULT_NAME = "E2E Test User";

export async function signUp(
  page: Page,
  email = uniqueEmail(),
  password = DEFAULT_PASSWORD,
  name = DEFAULT_NAME,
): Promise<{ email: string; landed: string }> {
  await dismissCookieBanner(page);
  await page.goto(`${BASE}/auth?mode=signup`);
  await page.getByLabel("Full Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  // Wait for navigation away from /auth rather than a fixed delay
  await page.waitForURL(/\/(profile-setup|check-email|profiles|subscription)/, { timeout: 15000 }).catch(() => {});
  return { email, landed: new URL(page.url()).pathname };
}

export async function signIn(
  page: Page,
  email: string,
  password = DEFAULT_PASSWORD,
): Promise<string> {
  await dismissCookieBanner(page);
  await page.goto(`${BASE}/auth`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/(profiles|subscription|profile-setup)/, { timeout: 20000 });
  return new URL(page.url()).pathname;
}

export async function signOut(page: Page): Promise<void> {
  const btn = page.getByRole("button", { name: /sign out/i }).first();
  await btn.click();
  await page.waitForURL(`${BASE}/`, { timeout: 10000 });
}

export async function ensureSignedIn(
  page: Page,
  email: string,
  password = DEFAULT_PASSWORD,
): Promise<string> {
  const { landed } = await signUp(page, email, password);
  if (landed === "/profile-setup") return landed;
  return signIn(page, email, password);
}
