import { defineConfig } from '@playwright/test'

// Job #791: the booth's LEGO section counting takes still on the device. Read-only against the
// deployed app: every non-GET request is aborted in the spec.
export default defineConfig({
  testDir: '.',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    channel: 'chromium',
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    launchOptions: { executablePath: process.env.CHROME_PATH || undefined },
  },
})
