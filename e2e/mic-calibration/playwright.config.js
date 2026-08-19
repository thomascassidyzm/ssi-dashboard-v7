import { defineConfig } from '@playwright/test'
import { mkdirSync } from 'fs'
import { buildMicWav } from './make-mic-wav.js'

// Does a change of MICROPHONE change where the recorder cuts?
//
//   npm run dev &
//   npx playwright test --config=e2e/mic-calibration/playwright.config.js
//
// Two projects because the fake microphone's audio is fixed at browser launch,
// and the microphone IS the variable here. Both files are cut from the same
// real recording and differ only in level: a phone at full output against a
// quieter, more directional external mic ~13dB down. Everything else — the
// speech, the breath, the room, the phrase — is byte-identical.
const FIXTURE_DIR = `${process.cwd()}/e2e/mic-calibration/fixtures`
mkdirSync(FIXTURE_DIR, { recursive: true })

// 500ms: an ordinary mid-phrase breath, under the 800ms the VAD ends a take on.
//
// 800ms was tried first and is NOT a fair test of a level calibration. Measured
// through Chromium's own processing chain (e2e/job-380-artifacts, job #380), a
// breath sits 27-32dB below the voice on BOTH microphones — far below any gate
// that still lets room tone read as silence. So an 800ms breath closes the take
// on both, calibrated or not, and no threshold placement can change that: at
// 800ms of quiet, "pausing" and "finished" are the same signal. That is a
// DURATION question and it belongs to silenceDuration, not here.
//
// What this suite tests is the thing a calibration CAN deliver: that swapping
// the microphone does not change the answer.
const PHONE = buildMicWav(`${FIXTURE_DIR}/phone.wav`, { gain: 1.0, roomBelowDb: 40, breathMs: 500 })
const EXTERNAL = buildMicWav(`${FIXTURE_DIR}/external.wav`, { gain: 0.22, roomBelowDb: 55, breathMs: 500 })

export const CONDITIONS = { phone: PHONE, external: EXTERNAL }

// Kai tests on an iPhone at 390px. Nothing in this suite is ever run at a
// desktop width.
const IPHONE = { width: 390, height: 844 }

function project(name, wav) {
  return {
    name,
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
          `--use-file-for-fake-audio-capture=${wav.path}`,
        ],
      },
    },
  }
}

export default defineConfig({
  // Absolute, not '.': a relative testDir resolves against the process cwd, and
  // picked up the sibling suites' specs when run from the repo root.
  testDir: FIXTURE_DIR.replace(/\/fixtures$/, ''),
  timeout: 240_000,
  expect: { timeout: 40_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  projects: [project('phone', PHONE), project('external', EXTERNAL)],
})
