/**
 * Demo profiles: the sample members seeded into `demo_profiles` by the first
 * migrations. They have no account behind them, so the only things a member can
 * do with one are see it in browse, filter it, and open its details. Since
 * 20261122030000 only admins can read them, so real members and app-store
 * reviewers never see them. This spec checks that a member sees none, and that
 * an admin sees them, can filter them and open their details, and is offered
 * no like, report or block.
 *
 * Runs against the E2E project only (the seed rows come from the migrations);
 * it never touches production.
 */
import { test, expect, type Page } from "@playwright/test";
import { BASE, createTestUser, signIn, logPageOnFailure } from "./helpers/auth";
import { openProfile, profileCard } from "./helpers/journey";
import type { TestUser } from "./globalSetup";

// Seeded by 20251126160419: Sarah Johnson (Female, New York), Michael Chen
// (Male, San Francisco), Leila Hassan (Female, Seattle), among others.
const SARAH = "Sarah Johnson";
const MICHAEL = "Michael Chen";
const LEILA = "Leila Hassan";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test.afterEach(async ({ page }, testInfo) => {
  await logPageOnFailure(page, testInfo);
});

async function openFilters(page: Page) {
  const location = page.getByPlaceholder("Enter city or state...");
  if (await location.isVisible()) return;
  // The panel's header row holds the title and the collapse toggle.
  const header = page.getByRole("heading", { name: "Filter Profiles" }).locator("xpath=../..");
  await header.getByRole("button").click();
  await expect(location).toBeVisible();
}

async function pickSelect(page: Page, triggerId: string, option: string) {
  await page.locator(`#${triggerId}`).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test("members don't see demo profiles in browse", async ({ page }) => {
  test.setTimeout(60000);
  const member: TestUser = await createTestUser("demo_member", { profile: true });
  await signIn(page, member.email, member.password);
  await page.goto(`${BASE}/profiles`);
  // Browse shows either the count summary or the empty state once loaded.
  await expect(page.getByText(/showing \d+ of \d+ profiles|no profiles|check back soon/i).first()).toBeVisible({
    timeout: 20000,
  });
  for (const name of [SARAH, MICHAEL, LEILA]) {
    await expect(profileCard(page, name)).toHaveCount(0);
  }
});

test("admins see demo profiles, can filter them, and can't like them", async ({ page }) => {
  test.skip(!adminEmail || !adminPassword, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set");
  test.setTimeout(90000);
  await signIn(page, adminEmail!, adminPassword!);

  await test.step("browse lists demo profiles with only a View Profile button", async () => {
    await page.goto(`${BASE}/profiles`);
    await expect(page.getByText(/showing \d+ of \d+ profiles/i)).toBeVisible({ timeout: 20000 });
    for (const name of [SARAH, MICHAEL, LEILA]) {
      await expect(profileCard(page, name)).toBeVisible({ timeout: 10000 });
    }
    // Real members' cards also carry Super Like and Like icon buttons; demo cards don't.
    await expect(profileCard(page, SARAH).getByRole("button")).toHaveCount(1);
    await expect(profileCard(page, SARAH).getByRole("button", { name: "View Profile" })).toBeVisible();
  });

  await test.step("a demo profile's details open, with liking disabled and no report or block", async () => {
    const dialog = await openProfile(page, SARAH);
    await expect(dialog.getByText(/teacher passionate about education/i)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Demo profile" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: /like profile|super like/i })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: /report|block/i })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  await test.step("location filter narrows to the matching demo profile", async () => {
    await openFilters(page);
    await page.getByPlaceholder("Enter city or state...").fill("Seattle");
    await expect(profileCard(page, LEILA)).toBeVisible();
    await expect(profileCard(page, SARAH)).toHaveCount(0);
    await expect(profileCard(page, MICHAEL)).toHaveCount(0);
    await page.getByPlaceholder("Enter city or state...").fill("");
    await expect(profileCard(page, SARAH)).toBeVisible();
  });

  await test.step("gender filter keeps men and hides women", async () => {
    await pickSelect(page, "gender", "Male");
    await expect(profileCard(page, MICHAEL)).toBeVisible();
    await expect(profileCard(page, SARAH)).toHaveCount(0);
    await expect(profileCard(page, LEILA)).toHaveCount(0);
  });

  await test.step("Clear All Filters brings every demo profile back", async () => {
    await page.getByRole("button", { name: "Clear All Filters" }).click();
    for (const name of [SARAH, MICHAEL, LEILA]) {
      await expect(profileCard(page, name)).toBeVisible();
    }
  });

  await test.step("faith filter hides demo profiles, which have no faith set", async () => {
    await pickSelect(page, "faith", "Bahá'ís only");
    await expect(profileCard(page, SARAH)).toHaveCount(0);
    await pickSelect(page, "faith", "Everyone");
    await expect(profileCard(page, SARAH)).toBeVisible();
  });
});
