/**
 * One full member journey across two browsers:
 *   A builds a profile in the wizard, browses, Super Likes and likes B.
 *   B likes A back from the Super Likes panel, which makes a match.
 *   A and B exchange messages.
 *   B reports A, then blocks A; A disappears from B's browse and matches.
 *   An admin sees B's report in the Reports section.
 *
 * Accounts come from createTestUser (no signup form, see CLAUDE.md), so this
 * spec sends no auth emails. Every step runs in order in one test because each
 * depends on the one before.
 */
import { test, expect, type Browser, type Page } from "@playwright/test";
import { BASE, createTestUser, signIn, logPageOnFailure, watchRequests } from "./helpers/auth";
import type { TestUser } from "./globalSetup";

const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const nameA = `Journey Ava ${run}`;
const nameB = `Journey Ben ${run}`;
const hello = `Hello Ben, this is Ava (${run})`;
const reply = `Hi Ava, nice to meet you (${run})`;
const reportDetails = `E2E journey report ${run}`;

const pages: Page[] = [];

async function openPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  watchRequests(page);
  pages.push(page);
  return page;
}

/** The browse card for a profile, found by the name in its heading. */
function profileCard(page: Page, name: string) {
  return page.locator(".group").filter({ has: page.getByRole("heading", { name }) });
}

async function openProfile(page: Page, name: string) {
  await page.goto(`${BASE}/profiles`);
  await expect(page.getByText(/showing \d+ of \d+ profiles/i)).toBeVisible({ timeout: 20000 });
  const card = profileCard(page, name);
  await expect(card).toBeVisible({ timeout: 10000 });
  await card.getByRole("button", { name: "View Profile" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name })).toBeVisible();
  return dialog;
}

async function openChat(page: Page, name: string) {
  await page.goto(`${BASE}/messages`);
  const match = page.getByRole("button", { name: new RegExp(name) });
  await expect(match).toBeVisible({ timeout: 20000 });
  await match.click();
  await expect(page.getByPlaceholder("Type a message...")).toBeVisible();
}

// Playwright requires the fixtures argument to be destructured, even when empty
// eslint-disable-next-line no-empty-pattern
test.afterEach(async ({}, testInfo) => {
  for (const page of pages) await logPageOnFailure(page, testInfo);
});

test("member journey: profile, super like, match, chat, report, block, admin review", async ({ browser }) => {
  test.setTimeout(300000);

  const userA: TestUser = await createTestUser("journeyA");
  const userB: TestUser = await createTestUser("journeyB", {
    profile: {
      name: nameB,
      age: 31,
      location: "Haifa, Israel",
      bio: "E2E journey member B.",
      interests: ["Devotionals", "Music", "Hiking"],
      is_visible: true,
    },
  });

  const a = await openPage(browser);
  const b = await openPage(browser);

  await test.step("A builds a profile in the setup wizard", async () => {
    expect(await signIn(a, userA.email, userA.password)).toBe("/profile-setup");
    await expect(a.getByText(/step 1 of 5/i)).toBeVisible({ timeout: 10000 });
    await a.getByLabel(/name/i).fill(nameA);
    await a.getByLabel("Age", { exact: true }).fill("29");
    await a.getByRole("button", { name: /continue/i }).click();

    await expect(a.getByText(/step 2 of 5/i)).toBeVisible();
    await a.getByLabel("Where are you located?").fill("Chicago, IL");
    await a.getByRole("button", { name: /continue/i }).click();

    await expect(a.getByText(/step 3 of 5/i)).toBeVisible();
    await a.getByLabel("Tell your story").fill("E2E journey member A.");
    await a.getByRole("button", { name: /continue/i }).click();

    await expect(a.getByText(/step 4 of 5/i)).toBeVisible();
    await a.getByRole("button", { name: /continue/i }).click();

    await expect(a.getByText(/step 5 of 5/i)).toBeVisible();
    // Interests are clickable badges, not buttons
    for (const interest of ["Devotionals", "Music", "Reading"]) {
      await a.getByText(interest, { exact: true }).first().click();
    }
    await a.getByRole("button", { name: /create profile/i }).click();
    await a.waitForURL(/\/profiles/, { timeout: 20000 });
  });

  await test.step("A super likes and likes B", async () => {
    const dialog = await openProfile(a, nameB);
    await dialog.getByRole("button", { name: /send super like/i }).click();
    await expect(dialog.getByRole("button", { name: /super like sent!/i })).toBeVisible({ timeout: 10000 });
    await dialog.getByRole("button", { name: "Like Profile" }).click();
    await expect(dialog.getByRole("button", { name: "Unlike Profile" })).toBeVisible({ timeout: 10000 });
  });

  await test.step("B sees the Super Like and likes A back, making a match", async () => {
    await signIn(b, userB.email, userB.password);
    await b.goto(`${BASE}/messages`);
    await expect(b.getByText(nameA).first()).toBeVisible({ timeout: 20000 });
    await b.getByRole("button", { name: /like back/i }).click();
    await expect(b.getByText(/it's a match/i).first()).toBeVisible({ timeout: 10000 });
    await expect(b.getByRole("button", { name: new RegExp(nameA) })).toBeVisible({ timeout: 10000 });
  });

  await test.step("A messages B", async () => {
    await openChat(a, nameB);
    await a.getByPlaceholder("Type a message...").fill(hello);
    await a.keyboard.press("Enter");
    await expect(a.getByText(hello).first()).toBeVisible({ timeout: 10000 });
  });

  await test.step("B reads the message and replies", async () => {
    await openChat(b, nameA);
    await expect(b.getByText(hello).first()).toBeVisible({ timeout: 15000 });
    await b.getByPlaceholder("Type a message...").fill(reply);
    await b.keyboard.press("Enter");
    await expect(b.getByText(reply).first()).toBeVisible({ timeout: 10000 });
  });

  await test.step("A sees B's reply", async () => {
    await openChat(a, nameB);
    await expect(a.getByText(reply).first()).toBeVisible({ timeout: 15000 });
  });

  await test.step("B reports A", async () => {
    const dialog = await openProfile(b, nameA);
    await dialog.getByTitle("Report Profile").click();
    const report = b.getByRole("dialog").filter({ hasText: "Why are you reporting this profile?" });
    await report.getByLabel("Harassment or abusive behavior").check();
    await report.locator("#details").fill(reportDetails);
    await report.getByRole("button", { name: "Submit Report" }).click();
    await expect(b.getByText("Report submitted successfully").first()).toBeVisible({ timeout: 10000 });
  });

  await test.step("B blocks A; A disappears from B's browse and matches", async () => {
    const dialog = await openProfile(b, nameA);
    // The "more" (⋮) menu next to the report flag holds Block User
    await dialog.locator("div.justify-end button").first().click();
    await b.getByRole("menuitem", { name: "Block User" }).click();
    await b.getByRole("alertdialog").getByRole("button", { name: "Block User" }).click();
    await expect(b.getByText("User blocked").first()).toBeVisible({ timeout: 10000 });

    await b.goto(`${BASE}/profiles`);
    await expect(b.getByText(/showing \d+ of \d+ profiles/i)).toBeVisible({ timeout: 20000 });
    await expect(profileCard(b, nameA)).toHaveCount(0);

    await b.goto(`${BASE}/messages`);
    await expect(b.getByText(/connections/i)).toBeVisible({ timeout: 20000 });
    await expect(b.getByRole("button", { name: new RegExp(nameA) })).toHaveCount(0);
  });

  await test.step("A no longer sees B either", async () => {
    await a.goto(`${BASE}/profiles`);
    await expect(a.getByText(/showing \d+ of \d+ profiles/i)).toBeVisible({ timeout: 20000 });
    await expect(profileCard(a, nameB)).toHaveCount(0);
  });

  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    await test.step("Admin sees B's report in the Reports section", async () => {
      const admin = await openPage(browser);
      await signIn(admin, adminEmail, adminPassword);
      await admin.goto(`${BASE}/admin`);
      await expect(admin.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible({ timeout: 20000 });
      await admin.getByRole("button", { name: /^reports/i }).click();
      await expect(admin.getByText(reportDetails)).toBeVisible({ timeout: 20000 });
    });
  }
});
