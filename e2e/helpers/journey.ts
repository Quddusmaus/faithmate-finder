/**
 * Browse and chat helpers shared by the multi-browser journey specs (15, 16).
 * Every page opened with openPage is kept in `pages`, so a spec's afterEach can
 * print each browser's Supabase request log on failure.
 */
import { expect, type Browser, type Page } from "@playwright/test";
import { BASE, watchRequests } from "./auth";

export const pages: Page[] = [];

type StorageState = Exclude<Parameters<Browser["newContext"]>[0], undefined>["storageState"];

/** Opens a page in a fresh browser context, optionally restoring a saved session. */
export async function openPage(browser: Browser, storageState?: StorageState): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, storageState });
  const page = await context.newPage();
  watchRequests(page);
  pages.push(page);
  return page;
}

/** Closes a page from openPage together with its context. */
export async function closePage(page: Page): Promise<void> {
  const i = pages.indexOf(page);
  if (i >= 0) pages.splice(i, 1);
  await page.context().close();
}

export const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Matches a profile heading, "Name" or "Name, 29", and nothing longer. */
export const nameHeading = (name: string) => new RegExp(`^${escapeRegExp(name)}(, \\d+)?$`);

/** The browse card for a profile, found by the name in its heading. */
export function profileCard(page: Page, name: string) {
  return page.locator(".group").filter({ has: page.getByRole("heading", { name: nameHeading(name) }) });
}

export async function openProfile(page: Page, name: string) {
  await page.goto(`${BASE}/profiles`);
  await expect(page.getByText(/showing \d+ of \d+ profiles/i)).toBeVisible({ timeout: 20000 });
  const card = profileCard(page, name);
  await expect(card).toBeVisible({ timeout: 10000 });
  await card.getByRole("button", { name: "View Profile" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: nameHeading(name) })).toBeVisible();
  return dialog;
}

export async function openChat(page: Page, name: string) {
  await page.goto(`${BASE}/messages`);
  const match = page.getByRole("button", { name: new RegExp(escapeRegExp(name)) });
  await expect(match).toBeVisible({ timeout: 20000 });
  await match.click();
  await expect(page.getByPlaceholder("Type a message...")).toBeVisible();
}
