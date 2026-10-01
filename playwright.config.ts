import { defineConfig, devices } from '@playwright/test'

/**
 * The smoke spec drives the built site in a real Chromium. jsdom cannot see
 * geometry, and every recent visual regression was geometric: a column on the
 * wrong side, bands out of line, a tab floating off the sheet. CI only:
 * `npm run test:e2e` after `npm run build`.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173/banzuke-app/',
    // A machine with a Chromium of its own (the cloud sessions have one under
    // /opt/pw-browsers) names it here instead of downloading another.
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173/banzuke-app/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
