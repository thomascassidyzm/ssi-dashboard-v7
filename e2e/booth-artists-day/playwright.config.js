import { defineConfig } from '@playwright/test'

// THE ARTIST'S DAY IN A REAL BROWSER, against the real STAGING booth.
// The spec launches its own persistent Chromium (fake mic flags, a profile
// directory that survives a browser close), so nothing about the browser is
// configured here. See README.md.
export default defineConfig({
  testDir: '.',
  timeout: 300_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
})
