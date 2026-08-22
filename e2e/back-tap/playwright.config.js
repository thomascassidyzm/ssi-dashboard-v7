import { defineConfig } from '@playwright/test'
import { mkdirSync } from 'fs'
import { buildSilentWav } from './make-silent-wav.js'

// What Back does, driven through a real browser: one tap restarts the take you
// are on, two taps inside the window step back a line (backTap.js).
//
//   npm run dev &
//   npx playwright test --config=e2e/back-tap/playwright.config.js
const FIXTURE_DIR = `${process.cwd()}/e2e/back-tap/fixtures`
mkdirSync(FIXTURE_DIR, { recursive: true })
const SILENT_WAV = buildSilentWav(`${FIXTURE_DIR}/silence.wav`)

// Kai tests on an iPhone at 390px, so this suite never runs at desktop width.
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
        `--use-file-for-fake-audio-capture=${SILENT_WAV}`,
      ],
    },
  },
})
