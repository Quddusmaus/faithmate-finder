import { test, expect } from "@playwright/test";
import { BASE } from "./helpers/auth";

test.describe("Public pages", () => {
  test("landing page — hero, branding, CTAs", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByText("Unity Hearts").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /get started/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /sign.?in|log.?in/i }).first()).toBeVisible();
  });

  test("landing page — feature sections present", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByText(/unity in diversity/i)).toBeVisible();
    await expect(page.getByText(/core curriculum compatibility/i)).toBeVisible();
  });

  test("terms of service page loads", async ({ page }) => {
    await page.goto(`${BASE}/terms`);
    await expect(page.locator("body")).not.toContainText("404");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("privacy policy page loads", async ({ page }) => {
    await page.goto(`${BASE}/privacy`);
    await expect(page.locator("body")).not.toContainText("404");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("contact page loads", async ({ page }) => {
    await page.goto(`${BASE}/contact`);
    await expect(page.locator("body")).not.toContainText("404");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("safety tips page loads", async ({ page }) => {
    await page.goto(`${BASE}/safety`);
    await expect(page.locator("body")).not.toContainText("404");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("install (PWA) page loads", async ({ page }) => {
    await page.goto(`${BASE}/install`);
    await expect(page.locator("body")).not.toContainText("404");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("appeal page loads for unauthenticated user", async ({ page }) => {
    await page.goto(`${BASE}/appeal`);
    await expect(page.locator("body")).not.toContainText("404");
  });

  test("unknown route shows 404", async ({ page }) => {
    await page.goto(`${BASE}/this-page-does-not-exist`);
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible({ timeout: 5000 });
  });
});
