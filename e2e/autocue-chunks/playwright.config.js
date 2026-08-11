import { defineConfig } from '@playwright/test'
import { mkdirSync } from 'fs'
import { buildSlowTakeWav } from './make-slow-take-wav.js'

// Chunk-level review playback, driven end to end through a real browser with a
// real MediaRecorder. Run against a dev/preview server from the repo root:
//   npm run dev &
//   npx playwright test --config=e2e/autocue-chunks/playwright.config.js
//
// The mic is Chromium's fake device fed a purpose-built slow-pass read (see
// make-slow-take-wav.js) — three "LEGO chunks" with a deliberate pause between
// each, which is exactly the take this feature exists to cut up.
const FIXTURE_DIR = `${process.cwd()}/e2e/autocue-chunks/fixtures`
mkdirSync(FIXTURE_DIR, { recursive: true })
const WAV = buildSlowTakeWav(`${FIXTURE_DIR}/slow-take-3-chunks.wav`)

export default defineConfig({
  testDir: '.',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    // The full Chromium build, not the headless shell: this host's shell is
    // missing libnspr4, and the fake-audio path wants a real media stack
    // anyway.
    channel: 'chromium',
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-audio-capture=${WAV}`,
      ],
    },
  },
})
