import { Page, TestInfo } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { USERS_FILE, EXTRA_USERS_FILE, TestUser, TestUsers } from "../globalSetup";

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
    } catch {
      /* ignore storage errors */
    }
  };
  await page.addInitScript(script);
  await page.evaluate(script).catch(() => {});
}

export function uniqueEmail(): string {
  return `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@mailinator.com`;
}

export const DEFAULT_PASSWORD = "Test1234!";
export const DEFAULT_NAME = "E2E Test User";

function adminClient() {
  const url = (process.env.VITE_SUPABASE_URL ?? "").replace(/\s/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  if (!url || !key) {
    throw new Error("VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to create E2E test users.");
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Records a user id so globalTeardown deletes it (profiles etc. cascade from auth.users).
function registerForCleanup(id: string): void {
  fs.appendFileSync(EXTRA_USERS_FILE, `${id}\n`);
}

/**
 * Creates a pre-confirmed user via the service-role Admin API — no signup form,
 * no confirmation email, so specs don't hit Supabase's auth email rate limit.
 * With `profile: true` a minimal profile row is inserted so the user skips the
 * setup wizard. Every user created here is deleted by globalTeardown.
 */
export async function createTestUser(
  tag: string,
  { profile = false }: { profile?: boolean } = {},
): Promise<TestUser> {
  const admin = adminClient();
  const email = `e2e_${tag}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@mailinator.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `E2E ${tag}` },
  });
  if (error || !data.user) throw new Error(`Failed to create test user ${tag}: ${error?.message}`);
  registerForCleanup(data.user.id);

  if (profile) {
    const { error: profileError } = await admin
      .from("profiles")
      .insert({ user_id: data.user.id, name: `E2E ${tag}` });
    if (profileError) throw new Error(`Failed to create profile for ${tag}: ${profileError.message}`);
  }
  return { id: data.user.id, email, password: DEFAULT_PASSWORD };
}

/** Registers a user created through the signup form for teardown, looked up by email. */
export async function cleanupUserByEmail(email: string): Promise<void> {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return;
  const users: { id: string; email?: string }[] = data.users;
  const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (user) registerForCleanup(user.id);
}

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
  // Required 18+ age gate — "Create Account" stays disabled until it is checked
  await page.getByLabel(/18 years of age or older/i).check();
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
  try {
    await page.waitForURL(/\/(profiles|subscription|profile-setup)/, { timeout: 20000 });
  } catch {
    // Surface the app's own error (e.g. "Invalid login credentials") instead of a bare timeout
    const messages = await page
      .locator("[role=status], [role=alert], li[data-sonner-toast]")
      .allInnerTexts()
      .catch(() => []);
    const shown = messages.map((m) => m.trim()).filter(Boolean).join(" | ") || "(no message shown)";
    throw new Error(`signIn(${email}) did not leave ${new URL(page.url()).pathname}; app said: ${shown}`);
  }
  return new URL(page.url()).pathname;
}

interface RequestLog {
  started: number;
  label: string;
  status?: string;
  ms?: number;
}

const requestLogs = new WeakMap<Page, { requests: Map<object, RequestLog>; consoleErrors: string[] }>();

/**
 * beforeEach hook: record Supabase requests and console errors for this page so
 * logPageOnFailure can say which backend call stalled. Failures that show a
 * blank page or a "Saving..." button that never finishes are otherwise
 * indistinguishable from a UI bug.
 */
export function watchRequests(page: Page): void {
  const log = { requests: new Map<object, RequestLog>(), consoleErrors: [] as string[] };
  requestLogs.set(page, log);
  const isBackend = (url: string) => url.includes(".supabase.co/");
  const label = (method: string, url: string) =>
    `${method} ${url.replace(/^https:\/\/[^/]+/, "").replace(/apikey=[^&]+/, "apikey=…").slice(0, 160)}`;
  const finish = (req: object, status: string) => {
    const entry = log.requests.get(req);
    if (entry && entry.status === undefined) {
      entry.status = status;
      entry.ms = Date.now() - entry.started;
    }
  };

  page.on("request", (req) => {
    if (isBackend(req.url())) log.requests.set(req, { started: Date.now(), label: label(req.method(), req.url()) });
  });
  page.on("requestfinished", async (req) => {
    const res = await req.response().catch(() => null);
    finish(req, String(res?.status() ?? "?"));
  });
  page.on("requestfailed", (req) => finish(req, `failed: ${req.failure()?.errorText ?? "?"}`));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("WebSocket")) log.consoleErrors.push(msg.text().slice(0, 300));
  });
  page.on("pageerror", (err) => log.consoleErrors.push(`pageerror: ${err.message.slice(0, 300)}`));
}

/** afterEach hook: on failure, log where the page ended up, what it showed, and stalled backend calls. */
export async function logPageOnFailure(page: Page, testInfo: TestInfo): Promise<void> {
  if (testInfo.status === testInfo.expectedStatus) return;
  const text = await page.locator("body").innerText({ timeout: 2000 }).catch(() => "(unreadable)");
  const lines = [`[${testInfo.title}] failed on ${page.url()}`, `  page text: ${text.replace(/\s+/g, " ").slice(0, 600)}`];

  const log = requestLogs.get(page);
  if (log) {
    const now = Date.now();
    const entries = [...log.requests.values()];
    const pending = entries.filter((e) => e.status === undefined);
    const slow = entries.filter((e) => e.ms !== undefined && (e.ms > 3000 || !e.status!.startsWith("2")));
    lines.push(`  supabase requests: ${entries.length} total, ${pending.length} still pending`);
    for (const e of pending) lines.push(`    PENDING ${((now - e.started) / 1000).toFixed(1)}s  ${e.label}`);
    for (const e of slow) lines.push(`    ${e.status} in ${(e.ms! / 1000).toFixed(1)}s  ${e.label}`);
    for (const c of log.consoleErrors.slice(-10)) lines.push(`    console: ${c}`);
  }
  console.log(lines.join("\n"));
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
