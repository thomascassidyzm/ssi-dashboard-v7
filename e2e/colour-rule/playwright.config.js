import { defineConfig } from '@playwright/test'

/**
 * COLOUR MEANS MEASUREMENT — the acceptance camera for Tom's 2026-09-02 ruling.
 *
 * THIS IS A HARNESS, AND IT SAYS SO. It signs in through the REAL LoginForm as
 * the seeded E2E admin against a REAL production-api and the REAL canonical
 * store, and photographs three screens at two widths in both themes. Auth is
 * NOT stubbed and no row is faked: every request it makes is a GET, it writes
 * nothing, and it spends nothing.
 *
 *   E2E_BASE_URL=http://localhost:5178 \
 *   E2E_API_BASE=http://localhost:3470 \
 *   npx playwright test --config=e2e/colour-rule/playwright.config.js
 */
export default defineConfig({
  testDir: '.',
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5178',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})
