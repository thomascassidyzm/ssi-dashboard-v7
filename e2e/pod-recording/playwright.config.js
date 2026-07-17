import { defineConfig } from '@playwright/test'

// Pod-recording E2E suite — runs against a locally-started dashboard + API,
// never against Camberley/production. See README.md in this directory.
// Lives here (not repo root) because /*.js is gitignored at root by design
// (CLAUDE.md: "never create files in repo root"). Run from the repo root:
//   npx playwright test --config=e2e/pod-recording/playwright.config.js
export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5175',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      args: [
        // Chromium renamed both fake-media flags from "-capture" to
        // "-stream" at some point; the old "-capture" names are silently
        // ignored (no error) and fall through to the REAL mic/camera,
        // which is silent/blocked under Playwright's automation context.
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-audio-capture=${process.env.E2E_FAKE_MIC_WAV || `${process.cwd()}/e2e/pod-recording/fixtures/fake-mic-sample.wav`}`
      ]
    }
  }
})
