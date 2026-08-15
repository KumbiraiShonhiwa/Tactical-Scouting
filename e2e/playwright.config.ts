import { defineConfig, devices } from "@playwright/test";

// Frontend must already be built with real local-stack env vars (frontend/.env.local — see
// docs/runbook.md) before `vite preview` can serve it; the webServer below builds fresh each
// run so a stale dist/ never masks a real regression.
//
// "localhost", not "127.0.0.1": `vite preview` only binds the IPv6 loopback (::1) on this
// platform (confirmed via `Get-NetTCPConnection -LocalPort 4173`), which "localhost" resolves
// to but the literal IPv4 address does not — connecting to 127.0.0.1 directly hangs/refuses
// even though the server is genuinely up.
const BASE_URL = "http://localhost:4173";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // admin specs (E2E-04/05) mutate shared seeded rows — avoid cross-test races
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium-smoke",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      // DV-07 responsive check — nightly only (test:full script), not the PR smoke subset.
      use: { ...devices["Pixel 5"] },
      testIgnore: /admin/, // admin flows aren't part of the responsive-viewport check
    },
  ],
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    cwd: "../frontend",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
