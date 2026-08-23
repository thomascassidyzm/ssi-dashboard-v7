import { defineConfig } from '@playwright/test'
import { mkdirSync } from 'fs'
import { buildSpeechWav } from './make-speech-wav.js'

// The recordist's seat: /r/:voiceId in a real browser, with a real
// MediaRecorder, a fake microphone that reads like a person, and a stubbed
// queue — so no take can ever reach a real recordist's queue from here.
//
//   npm run dev &
//   npx playwright test --config=e2e/recordist-back/playwright.config.js
const FIXTURE_DIR = `${process.cwd()}/e2e/recordist-back/fixtures`
mkdirSync(FIXTURE_DIR, { recursive: true })
const SPEECH_WAV = buildSpeechWav(`${FIXTURE_DIR}/reading.wav`)

// Aran and Catrin record on phones. This suite never runs at desktop width.
const IPHONE = { width: 390, height: 844 }

export default defineConfig({
  testDir: '.',
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    channel: 'chromium',
    viewport: IPHONE,
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-audio-capture=${SPEECH_WAV}`,
      ],
    },
  },
})
