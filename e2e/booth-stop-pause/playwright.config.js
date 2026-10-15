import { defineConfig } from '@playwright/test'
import { mkdirSync } from 'fs'
import { buildSpeechWav } from '../recordist-back/make-speech-wav.js'

// Stop and Pause must be on screen whenever the mic is live, at every desktop size from 1280x720
// and on a phone (job #681). Run against any served copy of the SPA:
//   E2E_BASE_URL=https://staging.popty.app npx playwright test --config=e2e/booth-stop-pause/playwright.config.js
// Every non-GET request is aborted, so nothing here can reach a real recordist's queue.
const FIXTURE_DIR = `${process.cwd()}/e2e/booth-stop-pause/fixtures`
mkdirSync(FIXTURE_DIR, { recursive: true })
const SPEECH_WAV = buildSpeechWav(`${FIXTURE_DIR}/reading.wav`)

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
    launchOptions: {
      executablePath: process.env.CHROME_PATH || undefined,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-audio-capture=${SPEECH_WAV}`,
      ],
    },
  },
})
