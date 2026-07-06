import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      // Sidebar (with the sign-out form) is `hidden lg:flex` — force a
      // desktop-width viewport so it's actually present in the DOM.
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  // Dev server is expected to already be running on :3000 (see plan Task 2 —
  // "dev server :3000 untouched"). `reuseExistingServer: true` means
  // Playwright attaches to it instead of spawning a second instance; the
  // `command` here only fires as a fallback if nothing is listening yet.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
