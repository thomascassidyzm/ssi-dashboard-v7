import { defineConfig } from '@playwright/test'
import { mkdirSync } from 'fs'
import { buildSpeechWav } from '../recordist-back/make-speech-wav.js'

// Auto-advance must keep pace with the reader while takes are slow to upload (Aran, 23 Oct, job #868).
// Run against any served copy of the SPA:
//   E2E_BASE_URL=https://staging.popty.app npx playwright test --config=e2e/booth-slow-advance/playwright.config.js
// The voice is fabricated and every take POST is answered by the test, so nothing reaches a real queue.
const FIXTURE_DIR = process.env.FIXTURE_DIR || `${process.cwd()}/e2e/booth-slow-advance/fixtures`
mkdirSync(FIXTURE_DIR, { recursive: true })
const SPEECH_WAV = buildSpeechWav(`${FIXTURE_DIR}/reading.wav`, { bursts: 40, speechMs: 1500, gapMs: 2200 })

export default defineConfig({
  testDir: '.',
  timeout: 240_000,
  expect: { timeout: 30_000 },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    colorScheme: 'light',
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-audio-capture=${SPEECH_WAV}`,
      ],
    },
  },
})
