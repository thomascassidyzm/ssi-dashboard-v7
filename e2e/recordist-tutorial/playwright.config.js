import { defineConfig } from '@playwright/test'
import { mkdirSync } from 'fs'
import { buildTutorialMicWav } from './make-tutorial-mic-wav.js'

// The recordist tutorial, driven end to end through a real browser with a real
// MediaRecorder, on a phone-sized screen. Run against a dev/preview server from
// the repo root:
//   npx vite --host 127.0.0.1 --port 5188 --strictPort &
//   E2E_BASE_URL=http://127.0.0.1:5188 \
//     npx playwright test --config=e2e/recordist-tutorial/playwright.config.js
//
// The mic is Chromium's fake device fed a purpose-built four-item practice run
// (see make-tutorial-mic-wav.js): two natural reads, then two slow reads with a
// deliberate beat at every LEGO boundary — which is exactly what the tutorial
// asks a first-time recordist for.
const FIXTURE_DIR = `${process.cwd()}/e2e/recordist-tutorial/fixtures`
mkdirSync(FIXTURE_DIR, { recursive: true })
const WAV = buildTutorialMicWav(`${FIXTURE_DIR}/tutorial-four-items.wav`)

export default defineConfig({
  testDir: '.',
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    // Kai tests on a phone, and the tutorial's coach panel is written phone
    // first — it must never push the line being read off the top of the screen.
    // 390x844 is an iPhone 12/13/14 viewport.
    viewport: { width: 390, height: 844 },
    isMobile: false,   // real touch emulation is not needed; the size is
    hasTouch: true,
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
