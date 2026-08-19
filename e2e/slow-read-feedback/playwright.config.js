import { defineConfig } from '@playwright/test'
import { mkdirSync } from 'fs'
import { buildSlowTakeWav } from '../autocue-chunks/make-slow-take-wav.js'

// What the recordist is told WHILE reading a slow phrase, driven end to end
// through a real browser with a real MediaRecorder and Chromium's fake mic.
//
//   npm run dev &
//   npx playwright test --config=e2e/slow-read-feedback/playwright.config.js
//
// Two projects because the fake microphone's audio is fixed at browser launch:
// one browser reads the phrase with pauses the recorder can keep, the other
// with pauses too quick for it. The 400ms boundary length (useVAD
// chunkPauseDuration) is the only difference between them, and it is the whole
// subject of this suite.
const FIXTURE_DIR = `${process.cwd()}/e2e/slow-read-feedback/fixtures`
mkdirSync(FIXTURE_DIR, { recursive: true })

const GOOD_WAV = buildSlowTakeWav(`${FIXTURE_DIR}/slow-read-good.wav`, { pauseMs: 1000 })
const BAD_WAV = buildSlowTakeWav(`${FIXTURE_DIR}/slow-read-too-quick.wav`, { pauseMs: 250 })

// Kai tests on an iPhone at 390px. Everything this suite looks at has to work
// there, so nothing in it is ever run at a desktop width.
const IPHONE = { width: 390, height: 844 }

function project(name, wav, testMatch) {
  return {
    name,
    testMatch,
    use: {
      // The full Chromium build, not the headless shell — see the sibling
      // autocue-chunks config for why this host needs it.
      channel: 'chromium',
      viewport: IPHONE,
      baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
      trace: 'retain-on-failure',
      launchOptions: {
        args: [
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          `--use-file-for-fake-audio-capture=${wav}`,
        ],
      },
    },
  }
}

export default defineConfig({
  testDir: '.',
  timeout: 180_000,
  expect: { timeout: 40_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  projects: [
    project('pauses-too-quick', BAD_WAV, /slow-read-refused\.spec\.js/),
    project('pauses-good', GOOD_WAV, /chunk-progress\.spec\.js/),
  ],
})
