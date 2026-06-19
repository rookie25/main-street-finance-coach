import { test, expect } from "@playwright/test";

// Real login flow — only runs when test credentials are provided (so CI smoke
// stays secret-free). Set E2E_CLIENT_EMAIL / E2E_CLIENT_PASSWORD to enable.
const email = process.env.E2E_CLIENT_EMAIL;
const password = process.env.E2E_CLIENT_PASSWORD;

test.describe("client auth flow", () => {
  test.skip(!email || !password, "set E2E_CLIENT_EMAIL / E2E_CLIENT_PASSWORD to run");

  test("logs in and reaches the dashboard", async ({ page }) => {
    await page.goto("/app/login");
    await page.locator('input[type="email"]').fill(email!);
    await page.locator('input[type="password"]').fill(password!);
    await page.getByRole("button", { name: /sign in|log ?in|continue/i }).click();
    await expect(page).toHaveURL(/\/app\/?$/, { timeout: 20_000 });
    await expect(page.locator("#root")).not.toBeEmpty();
  });
});
