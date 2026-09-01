import { defineConfig } from '@playwright/test'

/**
 * SCRIPT LAB INDEX — a camera, not a check. It logs in as the seeded admin,
 * loads /canonical/scripts against a real production-api and the real canonical
 * store, asserts the labels a person needs to tell walks apart are actually on
 * the page, and photographs it at desktop and phone width.
 *
 * It writes nothing and spends nothing: every request it makes is a GET.
 *
 *   E2E_BASE_URL=http://localhost:5177 \
 *   E2E_API_BASE=http://localhost:3470 \
 *   npx playwright test --config=e2e/script-lab/playwright.config.js
 */
export default defineConfig({
  testDir: '.',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5177',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})
