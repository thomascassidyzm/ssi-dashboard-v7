import { defineConfig } from '@playwright/test'

/**
 * THE THREE GAPS, DRIVEN IN A REAL BROWSER (2026-08-31).
 *
 * Tom named three things the Voice Lab could not do: give consent to a voice,
 * hear a voice with no clip, and hold more than one clip per voice. This drives
 * all three against a real production-api and the real database, because each
 * one is exactly the sort of thing that passes a unit test and fails on the
 * page — a microphone the browser will not give you, a render that never
 * returns, a button wired to a handler that does not exist.
 *
 * IT SPENDS: a few real clips at Cartesia/Azure, on the same daily ceiling as
 * everything else. That is the point — a preview verified against a mock has
 * not been verified.
 *
 * THE MICROPHONE IS FAKE, and deliberately so: Chromium is handed a WAV of the
 * consent line, so the whisper check on the backend is doing real work on real
 * audio. The voice it is given for is a TEST ROW, never a real person's.
 *
 *   E2E_BASE_URL=http://127.0.0.1:5190 E2E_API_BASE=http://localhost:3491 \
 *   E2E_MIC_WAV=/path/to/consent-line.wav \
 *   npx playwright test --config=e2e/voicelab-gaps/playwright.config.js
 */
export default defineConfig({
  testDir: '.',
  timeout: 300_000,
  expect: { timeout: 40_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5190',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    permissions: ['microphone'],
    launchOptions: {
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        '--autoplay-policy=no-user-gesture-required',
        ...(process.env.E2E_MIC_WAV ? [`--use-file-for-fake-audio-capture=${process.env.E2E_MIC_WAV}`] : []),
      ],
    },
  },
})
