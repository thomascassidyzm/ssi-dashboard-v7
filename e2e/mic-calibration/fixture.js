import { stubAuth } from '../vad-lab/helpers.js'
import { execFileSync } from 'child_process'
import { mkdirSync, writeFileSync, rmSync } from 'fs'

// A NATURAL-SPEED phrase — read straight through, one chunk, the snappy 800ms
// cut-off in force. That is deliberately the hardest case for this feature:
// slow reads get a four-second tolerance while chunks are outstanding, natural
// ones get nothing but the gate, so a gate in the wrong place shows up here
// first. It is also what Kai was recording when phrases started coming up short.
export const PHRASE = { text: 'dw i eisiau siarad' }

export const SCRIPT = {
  courseCode: 'cym_for_eng',
  maxSeed: null,
  role: 'target1',
  totalItems: 6,
  totalPhrases: 6,
  totalDirect: 0,
  estimatedMinutes: 2,
  items: Array.from({ length: 6 }, (_, i) => ({
    index: i,
    text: PHRASE.text,
    cadence: 'natural',
    type: 'phrase',
    phraseIndex: i,
    wordCount: 3,
    coversLegos: [`S0001L0${i + 1}`],
    known: 'I want to speak',
    seedNumber: 1,
    recordingChunks: null,
    legoChunks: null,
    chunksString: null,
    chunkCount: 1
  }))
}

/**
 * Stub the studio's API surface and collect what it files.
 *
 * The uploads array is the honest record: asserting on the screen would only
 * prove the screen said the cheerful thing. What matters is the length of the
 * blob that actually left the browser.
 */
export async function setupStudio(page, label = 'default') {
  await stubAuth(page)

  await page.route('**/api/production/*/recording/queue*', route =>
    route.fulfill({ json: { items: [] } })
  )
  // Answered slowly on purpose — see the autocue-chunks README: an instant stub
  // reverses the order of two fetches in a way no recordist can hit.
  await page.route('**/api/production/*/recording-script*', async route => {
    await new Promise(r => setTimeout(r, 1500))
    await route.fulfill({ json: SCRIPT })
  })
  await page.route('**/api/production/*/info*', route =>
    route.fulfill({ json: { course: { known_lang: 'English', target_lang: 'Welsh' } } })
  )
  await page.route('**/api/production/*/voice-config*', route =>
    route.fulfill({ json: { voice_config: {} } })
  )

  // The takes are kept as FILES, not as reported numbers. The upload payload
  // carries base64 audio and no duration, and a duration the page told us would
  // only prove the page's arithmetic — what matters is how long the audio that
  // actually left the browser turns out to be.
  const dir = `${process.cwd()}/e2e/mic-calibration/takes/${label}`
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })

  const uploads = []
  await page.route('**/api/production/*/recording/upload*', route => {
    try {
      const body = JSON.parse(route.request().postData() || '{}')
      const path = `${dir}/take-${String(uploads.length).padStart(2, '0')}.${body.format || 'webm'}`
      if (body.audioData) writeFileSync(path, Buffer.from(body.audioData, 'base64'))
      uploads.push({ ...body, audioData: undefined, path })
    } catch { /* not our shape */ }
    return route.fulfill({ json: { success: true, id: 'e2e-take' } })
  })

  page.on('console', msg => {
    if (/\[Autocue\]|\[VAD\]/.test(msg.text())) console.log(`  page> ${msg.text()}`)
  })

  return uploads
}

/** Walk the studio from its front door to the screen with the Record button. */
export async function reachRecordScreen(page) {
  await page.goto('/production/cym_for_eng/recording')
  await page.locator('.mode-card').first().click()
  await page.getByRole('button', { name: 'Begin Recording' }).click()
}

/** ...and then actually go live. */
export async function startRecording(page) {
  await page.getByRole('button', { name: /Start Recording/ }).click()
  await page.locator('.control-btn.record.recording').waitFor()
}

/**
 * Run the mic check to completion and return what it measured.
 *
 * Timed against the fake mic's own clock rather than against the UI alone: the
 * room step is 2s and the voice step 3s, and the WAV lays down room tone then
 * speech in exactly that order at the top of the file.
 */
export async function runMicCheck(page) {
  await page.locator('.mic-status-btn').click()
  await page.locator('.mic-check .mc-go').click()
  await page.locator('.mc-step.step-room').waitFor({ timeout: 10_000 })
  await page.locator('.mc-step.step-voice').waitFor({ timeout: 10_000 })
  await page.locator('.mc-verdict').waitFor({ timeout: 20_000 })

  const stored = await page.evaluate(() =>
    JSON.parse(globalThis.localStorage.getItem('ssi.micCalibration.v1') || '{}')
  )
  const verdict = (await page.locator('.mc-verdict').textContent()).trim()
  const numbers = (await page.locator('.mc-numbers').textContent()).trim()
  return { stored, verdict, numbers }
}

/**
 * How long a captured take actually is, in ms.
 *
 * Decoded to raw PCM and counted rather than read off the container: a
 * MediaRecorder webm routinely carries no duration in its header, and a
 * duration the browser reported would be the browser marking its own homework.
 */
export function takeDurationMs(path) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', path, '-f', 's16le', '-ar', '48000', '-ac', '1', '-'],
    { maxBuffer: 1 << 28 })
  return Math.round(raw.length / 2 / 48000 * 1000)
}
