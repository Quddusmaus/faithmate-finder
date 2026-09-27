/**
 * Read-only smoke checks against production. Real members use this site, so:
 *   - nothing here creates accounts, likes, messages, reports or blocks
 *   - no chat is opened (that would mark messages read)
 *   - no setting is changed
 * The only writes are the ones any sign-in makes (a login_attempts row, the
 * session itself) and the sign-out.
 *
 * The signed-in checks need PROD_SMOKE_EMAIL / PROD_SMOKE_PASSWORD for an
 * account you created on the site, with a profile, and **paused** (Settings →
 * Pause account) so members never see it in browse. They are skipped without
 * those variables, and stop at the first check if the account is not paused.
 */
import { test, expect, type Page } from "@playwright/test";

const email = process.env.PROD_SMOKE_EMAIL;
const password = process.env.PROD_SMOKE_PASSWORD;

async function dismissCookieBanner(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        "unity-hearts-cookie-consent",
        JSON.stringify({ essential: true, analytics: false, marketing: false, timestamp: new Date().toISOString() }),
      );
    } catch {
      /* ignore storage errors */
    }
  });
}

test.beforeEach(async ({ page }) => {
  await dismissCookieBanner(page);
});

test.describe("Production public pages", () => {
  test("landing page shows the hero and sign-in links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Uniting Hearts").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /get started/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /sign.?in|log.?in/i }).first()).toBeVisible();
  });

  for (const path of ["/terms", "/privacy", "/contact", "/safety", "/install"]) {
    test(`${path} loads`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading").first()).toBeVisible();
      await expect(page.getByRole("heading", { name: "404" })).toHaveCount(0);
    });
  }

  test("sign-in form renders", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("members-only pages send a signed-out visitor to sign in", async ({ page }) => {
    for (const path of ["/profiles", "/messages"]) {
      await page.goto(path);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
    }
  });

  test("unknown route shows 404", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  });
});

test.describe("Production signed-in pages (read-only)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!email || !password, "PROD_SMOKE_EMAIL / PROD_SMOKE_PASSWORD not set");

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await dismissCookieBanner(page);
    await page.goto("/auth");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(profiles|profile-setup|subscription)/, { timeout: 30000 });
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test("the smoke account is paused, so members can't see it", async () => {
    await page.goto("/profile-setup");
    await page.getByRole("tab", { name: /settings/i }).click();
    await expect(page.getByText(/account (paused|active)/i).first()).toBeVisible();
    await expect(
      page.getByText(/account paused/i).first(),
      "Pause the smoke account (Settings → Pause account) before running this suite",
    ).toBeVisible();
  });

  test("browse loads profiles", async () => {
    await page.goto("/profiles");
    const summary = page.getByText(/showing \d+ of \d+ profiles/i);
    await expect(summary).toBeVisible({ timeout: 30000 });
    const total = Number((await summary.innerText()).match(/of (\d+)/)?.[1] ?? 0);
    expect(total, "browse returned no profiles at all").toBeGreaterThan(0);
  });

  test("messages page loads the matches list", async () => {
    await page.goto("/messages");
    await expect(page.getByText(/your matches|no matches yet/i).first()).toBeVisible({ timeout: 30000 });
  });

  test("notification bell opens", async () => {
    await page.goto("/profiles");
    // The bell has no accessible name; opening it reads only ("Mark all read" is not clicked)
    const bell = page.locator("nav button:has(svg.lucide-bell)").first();
    await expect(bell).toBeVisible();
    await bell.click();
    await expect(page.getByRole("dialog").getByText("Notifications", { exact: true })).toBeVisible();
  });

  test("sign out returns to a signed-out state", async () => {
    await page.goto("/profiles");
    await page.getByRole("button", { name: /sign out/i }).first().click();
    await page.goto("/profiles");
    await page.waitForURL(/\/auth/, { timeout: 15000 });
  });
});
