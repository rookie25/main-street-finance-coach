import { test, expect, type Page } from "@playwright/test";

// Guards the "white screen" class of bug (e.g. missing env -> createClient throws):
// #root must actually render content, not be empty.
async function rendered(page: Page) {
  await expect(page.locator("#root")).not.toBeEmpty();
}

const PUBLIC_PAGES = [
  "/", "/services", "/how-it-works", "/cpa-partners", "/about", "/contact", "/privacy",
];

test.describe("public marketing pages render", () => {
  for (const path of PUBLIC_PAGES) {
    test(`loads ${path}`, async ({ page }) => {
      const resp = await page.goto(path);
      expect(resp?.status() ?? 200).toBeLessThan(400);
      await rendered(page);
    });
  }
});

test("home shows the brand", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Desired/i).first()).toBeVisible();
});

test("/pricing redirects to /services", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page).toHaveURL(/\/services\/?$/);
});

test("client login renders a form", async ({ page }) => {
  await page.goto("/app/login");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("EA login renders a form", async ({ page }) => {
  await page.goto("/ea/login");
  await expect(page.locator('input[type="email"]')).toBeVisible();
});

test("admin shows the password gate", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("unknown route renders Not Found (no crash)", async ({ page }) => {
  await page.goto("/this-route-does-not-exist-xyz");
  await rendered(page);
});
