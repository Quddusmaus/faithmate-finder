/**
 * Ten members using the app at once, each in their own browser:
 *   Everyone sees the other nine in browse.
 *   Five pairs like each other into matches; Ava also Super Likes Cai, who
 *   likes her back from the Super Likes panel; Jun likes Ava, who doesn't
 *   like him back.
 *   Every member's matches list shows exactly their matches: six in all,
 *   nothing from a one-sided like.
 *   Each matched pair exchanges messages, and no chat shows another pair's.
 *   Hana reports Gus, and an admin sees the report.
 *   Fay blocks Eli: they disappear from each other's browse and matches,
 *   and everyone else still sees both.
 *
 * Accounts come from createTestUser with a profile, so there is no signup
 * form and no auth email (see CLAUDE.md); globalTeardown deletes them. The
 * setup wizard is covered by 15-user-journey.
 */
import { test, expect, type Page } from "@playwright/test";
import { BASE, createTestUser, rowExists, signIn, logPageOnFailure } from "./helpers/auth";
import { openChat, openPage, openProfile, pages, profileCard } from "./helpers/journey";

const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

const FIRST_NAMES = ["Ava", "Ben", "Cai", "Dana", "Eli", "Fay", "Gus", "Hana", "Ivo", "Jun"] as const;
type First = (typeof FIRST_NAMES)[number];

interface Member {
  first: First;
  name: string;
  id: string;
  email: string;
  password: string;
  page: Page;
}

/** Pairs that like each other from the profile dialog; the first likes first. */
const LIKE_PAIRS: [First, First][] = [
  ["Ava", "Ben"],
  ["Cai", "Dana"],
  ["Eli", "Fay"],
  ["Gus", "Hana"],
  ["Ivo", "Jun"],
];
/** Ava Super Likes Cai; Cai likes her back from the Super Likes panel. */
const SUPER_PAIR: [First, First] = ["Ava", "Cai"];
/** Jun likes Ava, who never likes him back: no match. */
const ONE_SIDED: [First, First] = ["Jun", "Ava"];
const MATCHES: [First, First][] = [...LIKE_PAIRS, SUPER_PAIR];

const REPORT: [First, First] = ["Hana", "Gus"];
const BLOCK: [First, First] = ["Fay", "Eli"];

const isMatch = (x: First, y: First) =>
  MATCHES.some(([a, b]) => (a === x && b === y) || (a === y && b === x));

// Messages carry no member names, so a chat's text can't match a matches-list button by name.
const opener = ([a, b]: [First, First]) => `Opening line ${a[0]}${b[0]} ${run}`;
const answer = ([a, b]: [First, First]) => `Answer ${b[0]}${a[0]} ${run}`;
const reportDetails = `E2E group journey report ${run}`;

test.beforeEach(() => {
  pages.length = 0;
});

// Playwright requires the fixtures argument to be destructured, even when empty
// eslint-disable-next-line no-empty-pattern
test.afterEach(async ({}, testInfo) => {
  for (const page of pages) await logPageOnFailure(page, testInfo);
});

test("group journey: ten members browse, match, chat, report and block", async ({ browser }) => {
  test.setTimeout(600000);

  const members = {} as Record<First, Member>;
  for (const [i, first] of FIRST_NAMES.entries()) {
    const name = `Group ${first} ${run}`;
    const user = await createTestUser(`group${first}`, {
      profile: {
        name,
        age: 25 + i,
        location: "Wilmette, IL",
        bio: `E2E group journey member ${first}.`,
        interests: ["Devotionals", "Music"],
        is_visible: true,
      },
    });
    members[first] = { first, name, ...user, page: await openPage(browser) };
  }
  const everyone = Object.values(members);
  const m = (first: First) => members[first];

  /** Waits for the matches list, then checks it holds exactly `member`'s matches. */
  async function expectMatchesList(member: Member, isListed: (other: Member) => boolean) {
    const { page } = member;
    await page.goto(`${BASE}/messages`);
    const others = everyone.filter((o) => o !== member);
    // Positives first: they wait for the list to load, so the absences below are meaningful
    for (const other of others.filter(isListed)) {
      await expect(page.getByRole("button", { name: other.name }), `${member.first} → ${other.first}`).toBeVisible({
        timeout: 20000,
      });
    }
    for (const other of others.filter((o) => !isListed(o))) {
      await expect(page.getByRole("button", { name: other.name }), `${member.first} ↛ ${other.first}`).toHaveCount(0);
    }
  }

  await test.step("all ten sign in and each sees the other nine in browse", async () => {
    for (const member of everyone) {
      expect(await signIn(member.page, member.email, member.password)).toBe("/profiles");
      await member.page.goto(`${BASE}/profiles`);
      await expect(member.page.getByText(/showing \d+ of \d+ profiles/i)).toBeVisible({ timeout: 20000 });
      for (const other of everyone) {
        await expect(profileCard(member.page, other.name), `${member.first} browsing for ${other.first}`).toHaveCount(
          other === member ? 0 : 1,
          { timeout: 10000 },
        );
      }
    }
  });

  await test.step("five pairs like each other into matches", async () => {
    for (const [x, y] of LIKE_PAIRS) {
      for (const [from, to] of [
        [m(x), m(y)],
        [m(y), m(x)],
      ]) {
        const dialog = await openProfile(from.page, to.name);
        await dialog.getByRole("button", { name: "Like Profile", exact: true }).click();
        await expect(dialog.getByRole("button", { name: "Unlike Profile", exact: true })).toBeVisible({
          timeout: 10000,
        });
        await expect
          .poll(() => rowExists("likes", { user_id: from.id, liked_user_id: to.id }), { timeout: 10000 })
          .toBe(true);
      }
      await expect(m(y).page.getByText(/it's a match/i).first()).toBeVisible({ timeout: 10000 });
    }
  });

  await test.step("Ava super likes Cai, and Cai likes her back from the Super Likes panel", async () => {
    const [from, to] = SUPER_PAIR.map(m);
    const dialog = await openProfile(from.page, to.name);
    await dialog.getByRole("button", { name: /send super like/i }).click();
    await expect(dialog.getByRole("button", { name: /super like sent!/i })).toBeVisible({ timeout: 10000 });
    // The super like's trigger also adds the regular like; clicking Like here would unlike.
    await expect(dialog.getByRole("button", { name: "Unlike Profile", exact: true })).toBeVisible({ timeout: 10000 });
    await expect
      .poll(() => rowExists("likes", { user_id: from.id, liked_user_id: to.id }), { timeout: 10000 })
      .toBe(true);

    await to.page.goto(`${BASE}/messages`);
    await expect(to.page.getByText(from.name).first()).toBeVisible({ timeout: 20000 });
    await to.page.getByRole("button", { name: /like back/i }).click();
    await expect(to.page.getByText(/it's a match/i).first()).toBeVisible({ timeout: 10000 });
    await expect
      .poll(() => rowExists("likes", { user_id: to.id, liked_user_id: from.id }), { timeout: 10000 })
      .toBe(true);
  });

  await test.step("Jun likes Ava, who doesn't like him back", async () => {
    const [from, to] = ONE_SIDED.map(m);
    const dialog = await openProfile(from.page, to.name);
    await dialog.getByRole("button", { name: "Like Profile", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Unlike Profile", exact: true })).toBeVisible({ timeout: 10000 });
    await expect
      .poll(() => rowExists("likes", { user_id: from.id, liked_user_id: to.id }), { timeout: 10000 })
      .toBe(true);
  });

  await test.step("every member's matches list shows exactly their matches", async () => {
    for (const member of everyone) {
      await expectMatchesList(member, (other) => isMatch(member.first, other.first));
    }
  });

  await test.step("each matched pair exchanges messages", async () => {
    for (const pair of MATCHES) {
      const [x, y] = pair.map(m);
      await openChat(x.page, y.name);
      await x.page.getByPlaceholder("Type a message...").fill(opener(pair));
      await x.page.keyboard.press("Enter");
      await expect(x.page.getByText(opener(pair)).first()).toBeVisible({ timeout: 10000 });
    }
    for (const pair of MATCHES) {
      const [x, y] = pair.map(m);
      await openChat(y.page, x.name);
      await expect(y.page.getByText(opener(pair)).first()).toBeVisible({ timeout: 15000 });
      await y.page.getByPlaceholder("Type a message...").fill(answer(pair));
      await y.page.keyboard.press("Enter");
      await expect(y.page.getByText(answer(pair)).first()).toBeVisible({ timeout: 10000 });
    }
    for (const pair of MATCHES) {
      const [x, y] = pair.map(m);
      await openChat(x.page, y.name);
      // The chat pane, not the matches sidebar, which previews each match's last message
      const chat = x.page
        .locator("div.flex.h-full.flex-col")
        .filter({ has: x.page.getByPlaceholder("Type a message...") })
        .last();
      await expect(chat.getByText(answer(pair))).toBeVisible({ timeout: 15000 });
      // A chat shows only its own pair's messages
      for (const other of MATCHES.filter((p) => p !== pair)) {
        await expect(chat.getByText(opener(other))).toHaveCount(0);
        await expect(chat.getByText(answer(other))).toHaveCount(0);
      }
    }
  });

  await test.step("Hana reports Gus", async () => {
    const [from, to] = REPORT.map(m);
    const dialog = await openProfile(from.page, to.name);
    await dialog.getByTitle("Report Profile").click();
    const report = from.page.getByRole("dialog").filter({ hasText: "Why are you reporting this profile?" });
    await report.getByLabel("Harassment or abusive behavior").check();
    await report.locator("#details").fill(reportDetails);
    await report.getByRole("button", { name: "Submit Report" }).click();
    await expect(from.page.getByText("Report submitted successfully").first()).toBeVisible({ timeout: 10000 });
  });

  await test.step("Fay blocks Eli: they vanish for each other, and everyone else still sees both", async () => {
    const [blocker, blocked] = BLOCK.map(m);
    const dialog = await openProfile(blocker.page, blocked.name);
    // The "more" (⋮) menu next to the report flag holds Block User
    await dialog.locator("div.justify-end button").first().click();
    await blocker.page.getByRole("menuitem", { name: "Block User" }).click();
    await blocker.page.getByRole("alertdialog").getByRole("button", { name: "Block User" }).click();
    await expect(blocker.page.getByText("User blocked").first()).toBeVisible({ timeout: 10000 });

    for (const [viewer, hidden] of [
      [blocker, blocked],
      [blocked, blocker],
    ]) {
      await viewer.page.goto(`${BASE}/profiles`);
      await expect(viewer.page.getByText(/showing \d+ of \d+ profiles/i)).toBeVisible({ timeout: 20000 });
      // Someone else's card first, so the page has rendered before checking the absence
      await expect(profileCard(viewer.page, m("Ava").name)).toHaveCount(1, { timeout: 10000 });
      await expect(profileCard(viewer.page, hidden.name), `${viewer.first} browsing for ${hidden.first}`).toHaveCount(0);
      // The block removes the likes, and each was the other's only match
      await viewer.page.goto(`${BASE}/messages`);
      await expect(viewer.page.getByText(/no matches yet/i)).toBeVisible({ timeout: 20000 });
      await expect(viewer.page.getByRole("button", { name: hidden.name })).toHaveCount(0);
    }

    const bystander = m("Ava");
    await bystander.page.goto(`${BASE}/profiles`);
    await expect(bystander.page.getByText(/showing \d+ of \d+ profiles/i)).toBeVisible({ timeout: 20000 });
    await expect(profileCard(bystander.page, blocker.name)).toHaveCount(1, { timeout: 10000 });
    await expect(profileCard(bystander.page, blocked.name)).toHaveCount(1, { timeout: 10000 });
  });

  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    await test.step("Admin sees Hana's report in the Reports section", async () => {
      const admin = await openPage(browser);
      await signIn(admin, adminEmail, adminPassword);
      await admin.goto(`${BASE}/admin`);
      await expect(admin.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible({ timeout: 20000 });
      await admin.getByRole("button", { name: /^reports/i }).click();
      await expect(admin.getByText(reportDetails)).toBeVisible({ timeout: 20000 });
    });
  }
});
