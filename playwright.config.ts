import { defineConfig, devices } from "@playwright/test";

// Target: an external URL if E2E_BASE_URL is set (e.g. a Vercel preview), else a
// locally built + previewed app. Smoke tests need no secrets; auth tests skip
// unless E2E_CLIENT_EMAIL / E2E_CLIENT_PASSWORD are provided.
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:4173";
const useExternal = !!process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // No external URL -> build the app and serve it with `vite preview`.
  webServer: useExternal
    ? undefined
    : {
        command: "npm run build && npm run preview -- --port 4173 --strictPort",
        url: BASE,
        timeout: 180_000,
        reuseExistingServer: !process.env.CI,
      },
});
