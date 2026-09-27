/**
 * A group of members using the app at once, each with their own browser
 * session. E2E_GROUP_SIZE sets the size (an even number, at least 10; default
 * 10). The E2E workflow's manual run takes a "group size" input for bigger runs.
 *
 *   Everyone sees every other member in browse.
 *   Members pair up (00–01, 02–03, …) and like each other into matches.
 *   Up to eight members also like member 00, who likes each back, so 00
 *   has a long matches list.
 *   Member 01 Super Likes the second-to-last member, who likes back from the
 *   Super Likes panel. The last member likes 00, who never likes back.
 *   Every matches list is checked for exactly its matches.
 *   Each pair exchanges messages, each fan messages 00, and no chat pane
 *   shows another conversation's messages.
 *   03 reports 02 (an admin sees it when admin credentials are set).
 *   One member blocks their pair: they vanish from each other's browse and
 *   matches, while 00 still sees both.
 *
 * Accounts come from createTestUser with a profile, so there is no signup
 * form and no auth email (see CLAUDE.md); globalTeardown deletes them. Each
 * member signs in once; their session is saved and only a few browsers are
 * open at a time, so a large group fits in a CI runner's memory.
 */
import { test, expect, type Page } from "@playwright/test";
import { BASE, createTestUser, rowExists, signIn, logPageOnFailure } from "./helpers/auth";
import { closePage, openChat, openPage, openProfile, pages, profileCard } from "./helpers/journey";

const SIZE = Number(process.env.E2E_GROUP_SIZE || 10);
if (!Number.isInteger(SIZE) || SIZE < 10 || SIZE % 2 !== 0) {
  throw new Error(`E2E_GROUP_SIZE must be an even number of at least 10, got "${process.env.E2E_GROUP_SIZE}"`);
}
/** Browsers kept open at once; others are closed and reopened from their saved session. */
const MAX_OPEN = 6;

const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const width = Math.max(2, String(SIZE - 1).length);
const label = (i: number) => String(i).padStart(width, "0");
const nameOf = (i: number) => `Group ${label(i)} ${run}`;
/** Any group member's name, as it appears in a heading or a matches-list entry. */
const anyMember = new RegExp(`Group \\d{${width}} ${run}`);

// ---- The plan, by member index ----
const HUB = 0;
const PAIRS: [number, number][] = Array.from({ length: SIZE / 2 }, (_, k) => [2 * k, 2 * k + 1]);
const FANS = Array.from({ length: Math.min(8, SIZE - 6) }, (_, k) => 2 + k);
const SUPER: [number, number] = [1, SIZE - 2];
const ONE_SIDED: [number, number] = [SIZE - 1, HUB];
const REPORT: [number, number] = [3, 2];
const BLOCK: [number, number] = [SIZE - 3, SIZE - 4];

/** Directed likes in the order they happen; a match is a like in both directions. */
const LIKES: [number, number][] = [
  ...PAIRS.flatMap(([a, b]): [number, number][] => [
    [a, b],
    [b, a],
  ]),
  ...FANS.map((f): [number, number] => [f, HUB]),
  ...FANS.map((f): [number, number] => [HUB, f]),
];
const liked = new Set([...LIKES, SUPER, [SUPER[1], SUPER[0]], ONE_SIDED].map(([a, b]) => `${a}>${b}`));
const isMatch = (a: number, b: number) => liked.has(`${a}>${b}`) && liked.has(`${b}>${a}`);

// Messages carry no member names, so their text can't be mistaken for a matches-list entry.
const opener = ([a, b]: [number, number]) => `Opening ${label(a)}-${label(b)} ${run}`;
const answer = ([a, b]: [number, number]) => `Answer ${label(b)}-${label(a)} ${run}`;
const fanNote = (f: number) => `Fan note ${label(f)} ${run}`;
const ALL_MESSAGES = [...PAIRS.flatMap((p) => [opener(p), answer(p)]), ...FANS.map(fanNote)];
/** Every message that belongs to the conversation between members x and y. */
function conversation(x: number, y: number): string[] {
  const pair = PAIRS.find(([a, b]) => (a === x && b === y) || (a === y && b === x));
  if (pair) return [opener(pair), answer(pair)];
  const fan = x === HUB ? y : y === HUB ? x : -1;
  return FANS.includes(fan) ? [fanNote(fan)] : [];
}
const reportDetails = `E2E group journey report ${run}`;

test.beforeEach(() => {
  pages.length = 0;
});

// Playwright requires the fixtures argument to be destructured, even when empty
// eslint-disable-next-line no-empty-pattern
test.afterEach(async ({}, testInfo) => {
  for (const page of pages) await logPageOnFailure(page, testInfo);
});

interface Member {
  i: number;
  name: string;
  id: string;
  email: string;
  password: string;
  state?: Awaited<ReturnType<ReturnType<Page["context"]>["storageState"]>>;
  page?: Page;
}

test(`group journey: ${SIZE} members browse, match, chat, report and block`, async ({ browser }) => {
  test.setTimeout(Math.max(10, SIZE / 2) * 60000);

  const members: Member[] = [];
  for (let i = 0; i < SIZE; i++) {
    const user = await createTestUser(`group${label(i)}`, {
      profile: {
        name: nameOf(i),
        age: 22 + (i % 40),
        location: "Wilmette, IL",
        bio: `E2E group journey member ${label(i)}.`,
        interests: ["Devotionals", "Music"],
        is_visible: true,
      },
    });
    members.push({ i, name: nameOf(i), ...user });
  }

  const open: Member[] = [];
  /** The member's browser page, reopening it from their saved session if it was closed. */
  async function pageOf(member: Member): Promise<Page> {
    if (member.page && !member.page.isClosed()) {
      open.splice(open.indexOf(member), 1);
      open.push(member);
      return member.page;
    }
    while (open.length >= MAX_OPEN) {
      const oldest = open.shift()!;
      await closePage(oldest.page!);
      oldest.page = undefined;
    }
    member.page = await openPage(browser, member.state);
    open.push(member);
    return member.page;
  }

  /** Likes made so far, to know which like completes a match. */
  const done = new Set<string>();
  async function like(fromIndex: number, toIndex: number) {
    const [from, to] = [members[fromIndex], members[toIndex]];
    const page = await pageOf(from);
    const dialog = await openProfile(page, to.name);
    await dialog.getByRole("button", { name: "Like Profile", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Unlike Profile", exact: true })).toBeVisible({ timeout: 10000 });
    await expect
      .poll(() => rowExists("likes", { user_id: from.id, liked_user_id: to.id }), { timeout: 10000 })
      .toBe(true);
    if (done.has(`${toIndex}>${fromIndex}`)) {
      // The other side already liked, so this like makes the match
      await expect(page.getByText(/it's a match/i).first()).toBeVisible({ timeout: 10000 });
    }
    done.add(`${fromIndex}>${toIndex}`);
  }

  /** The chat pane, not the matches sidebar, which previews each match's last message. */
  const chatPane = (page: Page) =>
    page.locator("div.flex.h-full.flex-col").filter({ has: page.getByPlaceholder("Type a message...") }).last();

  async function send(fromIndex: number, toIndex: number, text: string) {
    const page = await pageOf(members[fromIndex]);
    await openChat(page, members[toIndex].name);
    await page.getByPlaceholder("Type a message...").fill(text);
    await page.keyboard.press("Enter");
    await expect(chatPane(page).getByText(text)).toBeVisible({ timeout: 10000 });
  }

  /** Opens the chat and checks it shows `expected` and none of the other conversations' messages. */
  async function read(readerIndex: number, otherIndex: number, expected: string[]) {
    const page = await pageOf(members[readerIndex]);
    await openChat(page, members[otherIndex].name);
    const pane = chatPane(page);
    for (const text of expected) await expect(pane.getByText(text)).toBeVisible({ timeout: 15000 });
    const shown = await pane.innerText();
    const allowed = conversation(readerIndex, otherIndex);
    const leaked = ALL_MESSAGES.filter((m) => !allowed.includes(m) && shown.includes(m));
    expect(leaked, `${label(readerIndex)}'s chat with ${label(otherIndex)} shows other conversations`).toEqual([]);
  }

  async function expectMatchesList(member: Member) {
    const page = await pageOf(member);
    await page.goto(`${BASE}/messages`);
    const expected = members.filter((o) => o !== member && isMatch(member.i, o.i)).map((o) => o.name);
    if (expected.length === 0) {
      await expect(page.getByText(/no matches yet/i)).toBeVisible({ timeout: 20000 });
      return;
    }
    const entries = page.getByRole("button").filter({ hasText: anyMember });
    await expect(entries, `${label(member.i)}'s matches`).toHaveCount(expected.length, { timeout: 20000 });
    const shown = (await entries.locator("h3").allInnerTexts()).map((t) => t.trim());
    expect(shown.sort(), `${label(member.i)}'s matches`).toEqual(expected.sort());
  }

  await test.step(`all ${SIZE} sign in and each sees the other ${SIZE - 1} in browse`, async () => {
    for (const member of members) {
      const page = await pageOf(member);
      expect(await signIn(page, member.email, member.password)).toBe("/profiles");
      member.state = await page.context().storageState();
      await expect(page.getByText(/showing \d+ of \d+ profiles/i)).toBeVisible({ timeout: 20000 });
      const headings = page.getByRole("heading", { name: anyMember });
      await expect(headings, `${label(member.i)}'s browse`).toHaveCount(SIZE - 1, { timeout: 20000 });
      const seen = (await headings.allInnerTexts()).map((t) => t.replace(/, \d+$/, "").trim());
      const others = members.filter((o) => o !== member).map((o) => o.name);
      expect(seen.sort(), `${label(member.i)}'s browse`).toEqual(others.sort());
    }
  });

  await test.step(`${SIZE / 2} pairs like each other into matches`, async () => {
    for (const [a, b] of PAIRS) {
      await like(a, b);
      await like(b, a);
    }
  });

  await test.step(`${FANS.length} members like member 00, who likes each back`, async () => {
    for (const f of FANS) await like(f, HUB);
    for (const f of FANS) await like(HUB, f);
  });

  await test.step("a Super Like is liked back from the Super Likes panel", async () => {
    const [from, to] = SUPER.map((i) => members[i]);
    const fromPage = await pageOf(from);
    const dialog = await openProfile(fromPage, to.name);
    await dialog.getByRole("button", { name: /send super like/i }).click();
    await expect(dialog.getByRole("button", { name: /super like sent!/i })).toBeVisible({ timeout: 10000 });
    // The super like's trigger also adds the regular like; clicking Like here would unlike.
    await expect(dialog.getByRole("button", { name: "Unlike Profile", exact: true })).toBeVisible({ timeout: 10000 });
    await expect
      .poll(() => rowExists("likes", { user_id: from.id, liked_user_id: to.id }), { timeout: 10000 })
      .toBe(true);

    const toPage = await pageOf(to);
    await toPage.goto(`${BASE}/messages`);
    await expect(toPage.getByText(from.name).first()).toBeVisible({ timeout: 20000 });
    await toPage.getByRole("button", { name: /like back/i }).click();
    await expect(toPage.getByText(/it's a match/i).first()).toBeVisible({ timeout: 10000 });
    await expect
      .poll(() => rowExists("likes", { user_id: to.id, liked_user_id: from.id }), { timeout: 10000 })
      .toBe(true);
    done.add(`${SUPER[0]}>${SUPER[1]}`).add(`${SUPER[1]}>${SUPER[0]}`);
  });

  await test.step("a like that is never returned makes no match", async () => {
    await like(...ONE_SIDED);
  });

  await test.step("every member's matches list shows exactly their matches", async () => {
    for (const member of members) await expectMatchesList(member);
  });

  await test.step("pairs and fans exchange messages, and no chat shows another conversation", async () => {
    for (const pair of PAIRS) await send(pair[0], pair[1], opener(pair));
    for (const pair of PAIRS) {
      await read(pair[1], pair[0], [opener(pair)]);
      await send(pair[1], pair[0], answer(pair));
    }
    // Every reply arrives; a sample of openers re-read the whole conversation
    for (const pair of PAIRS.slice(0, 5)) await read(pair[0], pair[1], [opener(pair), answer(pair)]);

    for (const f of FANS) await send(f, HUB, fanNote(f));
    for (const f of FANS) await read(HUB, f, [fanNote(f)]);
  });

  await test.step(`${label(REPORT[0])} reports ${label(REPORT[1])}`, async () => {
    const [from, to] = REPORT.map((i) => members[i]);
    const page = await pageOf(from);
    const dialog = await openProfile(page, to.name);
    await dialog.getByTitle("Report Profile").click();
    const report = page.getByRole("dialog").filter({ hasText: "Why are you reporting this profile?" });
    await report.getByLabel("Harassment or abusive behavior").check();
    await report.locator("#details").fill(reportDetails);
    await report.getByRole("button", { name: "Submit Report" }).click();
    await expect(page.getByText("Report submitted successfully").first()).toBeVisible({ timeout: 10000 });
  });

  await test.step(`${label(BLOCK[0])} blocks ${label(BLOCK[1])}: they vanish for each other, not for others`, async () => {
    const [blocker, blocked] = BLOCK.map((i) => members[i]);
    const blockerPage = await pageOf(blocker);
    const dialog = await openProfile(blockerPage, blocked.name);
    // The "more" (⋮) menu next to the report flag holds Block User
    await dialog.locator("div.justify-end button").first().click();
    await blockerPage.getByRole("menuitem", { name: "Block User" }).click();
    await blockerPage.getByRole("alertdialog").getByRole("button", { name: "Block User" }).click();
    await expect(blockerPage.getByText("User blocked").first()).toBeVisible({ timeout: 10000 });

    for (const [viewer, hidden] of [
      [blocker, blocked],
      [blocked, blocker],
    ]) {
      const page = await pageOf(viewer);
      await page.goto(`${BASE}/profiles`);
      await expect(page.getByText(/showing \d+ of \d+ profiles/i)).toBeVisible({ timeout: 20000 });
      // Everyone else first, so the page has rendered before checking the absence
      await expect(page.getByRole("heading", { name: anyMember })).toHaveCount(SIZE - 2, { timeout: 20000 });
      await expect(profileCard(page, hidden.name), `${label(viewer.i)} browsing for ${label(hidden.i)}`).toHaveCount(0);
      // The block removes the likes, and each was the other's only match
      await page.goto(`${BASE}/messages`);
      await expect(page.getByText(/no matches yet/i)).toBeVisible({ timeout: 20000 });
    }

    const bystander = await pageOf(members[HUB]);
    await bystander.goto(`${BASE}/profiles`);
    await expect(bystander.getByText(/showing \d+ of \d+ profiles/i)).toBeVisible({ timeout: 20000 });
    await expect(profileCard(bystander, blocker.name)).toHaveCount(1, { timeout: 10000 });
    await expect(profileCard(bystander, blocked.name)).toHaveCount(1, { timeout: 10000 });
  });

  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    await test.step("Admin sees the report in the Reports section", async () => {
      const admin = await openPage(browser);
      await signIn(admin, adminEmail, adminPassword);
      await admin.goto(`${BASE}/admin`);
      await expect(admin.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible({ timeout: 20000 });
      await admin.getByRole("button", { name: /^reports/i }).click();
      await expect(admin.getByText(reportDetails)).toBeVisible({ timeout: 20000 });
    });
  }
});
