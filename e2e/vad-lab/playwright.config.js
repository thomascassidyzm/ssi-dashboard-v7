import { defineConfig } from '@playwright/test'

// VAD Lab E2E — runs against a locally-served dashboard build (vite preview
// or dev). The record-yourself test uses Chromium's fake mic, fed with the
// pod-recording suite's speech fixture, and fetches one real model clip from
// the public audio proxy (read-only GET). Run from the repo root:
//   npx playwright test --config=e2e/vad-lab/playwright.config.js
export default defineConfig({
  testDir: '.',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4173',
    trace: 'retain-on-failure',
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-audio-capture=${process.env.E2E_FAKE_MIC_WAV || `${process.cwd()}/e2e/pod-recording/fixtures/fake-mic-sample.wav`}`,
      ],
    },
  },
})
