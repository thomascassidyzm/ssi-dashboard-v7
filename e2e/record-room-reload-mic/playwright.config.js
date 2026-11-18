import { defineConfig } from '@playwright/test'

// Record Room: a deploy never reloads under a recordist, takes survive a reload, and a missing
// mic is said on screen (job #43, Auke on fry_for_eng, 2026-11-02). The studio runs for real in
// Chromium with its fake mic; the API is stubbed. Run against a dev server from the repo root:
//   npx vite --port 5199 &
//   E2E_BASE_URL=http://localhost:5199 npx playwright test --config=e2e/record-room-reload-mic/playwright.config.js
export default defineConfig({
  testDir: '.',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    channel: 'chromium',
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5199',
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-audio-capture=${process.cwd()}/e2e/pod-recording/fixtures/fake-mic-sample.wav`,
      ],
    },
  },
})
