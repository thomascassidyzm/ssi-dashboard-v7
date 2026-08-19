import { test, expect } from '@playwright/test'
import { mkdirSync } from 'fs'
import { setupStudio, goLive, runMicCheckInPhase, waitForPhaseLock, storedProfiles } from './fixture.js'

/**
 * The mic check as the recordist actually meets it: on a phone-sized screen,
 * mid-session, with a queue they must not lose their place in.
 *
 * Screenshots land under docs/recordist/mic-check-shots/ so they can be
 * published rather than described.
 */

const SHOTS = `${process.cwd()}/docs/recordist/mic-check-shots`
mkdirSync(SHOTS, { recursive: true })

let uploads

test.beforeEach(async ({ page }) => {
  uploads = await setupStudio(page, { totalItems: 8 })
})

test('the two steps, the meter and the verdict, at 390x844', async ({ page }) => {
  await goLive(page)
  await page.screenshot({ path: `${SHOTS}/00-studio-recording-390x844.png` })

  const run = await runMicCheckInPhase(page, uploads, { shots: `${SHOTS}/mic-check` })

  // The two instructions, in order, in the recordist's own terms.
  expect(run.roomText, 'step 1 asks for silence').toMatch(/Say nothing for a moment/)
  expect(run.voiceText, 'step 2 asks for a voice').toMatch(/Now say something/)

  // The meter MOVED. A bar that happens to be non-zero at the instant an
  // assertion runs proves nothing about whether the recordist saw the mic was
  // alive; the spread across the voice step is what proves it.
  const spread = Math.max(...run.meter) - Math.min(...run.meter)
  console.log(`   meter widths across the check (px): ${run.meter.map(w => w.toFixed(0)).join(' ')}`)
  expect(run.meter.length, 'the meter was sampled').toBeGreaterThan(5)
  expect(spread, 'the level meter moves with the audio').toBeGreaterThan(8)

  // A verdict, in words, with the numbers behind it.
  console.log(`   verdict: ${run.verdict.heading} — ${run.verdict.message}`)
  console.log(`   numbers: ${run.verdict.numbers}`)
  expect(run.verdict.heading).toMatch(/Microphone is good|Usable, with care|Too much room noise|Checked/)
  expect(run.verdict.numbers).toMatch(/Your voice sits -?\d+dB above your room/)
  expect(run.verdict.numbers).toMatch(/Silence detection set to 0\.\d+/)

  // Nothing overflows the phone. The panel is the thing a recordist reads
  // one-handed while holding a script.
  const box = await page.locator('.mic-check .mc-panel').boundingBox()
  expect(box.x, 'panel is on screen').toBeGreaterThanOrEqual(0)
  expect(box.x + box.width, 'panel fits the 390px viewport').toBeLessThanOrEqual(390)
  expect(box.y + box.height, 'panel fits the 844px viewport').toBeLessThanOrEqual(844)
  // Both buttons clear the 44px iOS tap target.
  for (const name of ['Done', 'Check again']) {
    const b = await page.getByRole('button', { name, exact: true }).boundingBox()
    expect(b.height, `"${name}" is a real tap target`).toBeGreaterThanOrEqual(44)
  }
})

test('the profile persists, and a returning session applies it without measuring again', async ({ page }) => {
  await goLive(page)
  await runMicCheckInPhase(page, uploads)
  await page.getByRole('button', { name: /^(Done|Record anyway)$/ }).click()

  const stored = await storedProfiles(page)
  console.log(`   ssi.micCalibration.v1 =\n${JSON.stringify(stored, null, 2)}`)
  const keys = Object.keys(stored || {})
  expect(keys.length, 'one profile, keyed per device').toBe(1)
  const p = stored[keys[0]]
  for (const field of ['deviceKey', 'label', 'noiseFloor', 'voiceLevel', 'threshold', 'headroomDb', 'quality', 'at']) {
    expect(p, `profile carries ${field}`).toHaveProperty(field)
  }

  // Reload and start again. The room-only fallback would spend cfg.calibrationMs
  // listening and show "Listening to the room"; a stored profile skips it.
  await page.reload()
  await goLive(page)
  await expect(page.locator('.mic-status-text')).toContainText('Tuned to')
  await expect(page.locator('.vad-calibrating')).toHaveCount(0)
  await page.screenshot({ path: `${SHOTS}/05-returning-session-tuned-390x844.png` })

  // The threshold now in force is the stored one, not the fixed default.
  const shown = await page.locator('.mic-status-text').textContent()
  console.log(`   returning session says: ${shown.trim()}`)
  expect(p.threshold).not.toBe(0.02)
})

test('re-checking mid-session leaves the autocue on the same line', async ({ page }) => {
  await goLive(page)

  // Let the session get properly under way, so "the line it is on" is a real
  // position in the queue and not item 0 — and then phase-lock BEFORE reading
  // the position. The lock waits for a take, and a take advances the autocue;
  // reading first would credit the re-check with that move.
  await expect.poll(() => uploads.length, { timeout: 120_000, intervals: [500] }).toBeGreaterThanOrEqual(2)
  await waitForPhaseLock(page, uploads)
  const currentBefore = (await page.locator('.teleprompter-scroller .current').first().textContent())?.trim()
  const recordedBefore = await page.locator('.stat-item').first().locator('.stat-value').textContent()
  console.log(`   before the re-check: on "${currentBefore}", ${recordedBefore} recorded`)
  expect(currentBefore, 'the autocue is past the first line').toMatch(/siarad [2-9]/)

  await runMicCheckInPhase(page, uploads, { shots: `${SHOTS}/recheck`, phaseLocked: true })
  await page.getByRole('button', { name: /^(Done|Record anyway)$/ }).click()
  await expect(page.locator('.mic-check')).toHaveCount(0)

  const currentAfter = (await page.locator('.teleprompter-scroller .current').first().textContent())?.trim()
  console.log(`   after the re-check:  on "${currentAfter}"`)
  // THE assertion: a headset swapped halfway through a hundred-line queue must
  // not cost the recordist their place.
  expect(currentAfter, 'the re-check did not move the autocue').toBe(currentBefore)
  // ...and it is still recording, on the same session.
  await expect(page.locator('.control-btn.record.recording')).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/06-after-recheck-same-line-390x844.png` })
})

test('skipping the check is not a wall: it records, and says which setting is in force', async ({ page }) => {
  await goLive(page)

  // Before any check, the studio says plainly what it is running on.
  await expect(page.locator('.mic-status-text')).toContainText('Standard silence setting — mic not checked')
  await page.screenshot({ path: `${SHOTS}/07-not-checked-390x844.png` })

  // Open the check and skip it. Same message, still recording, takes still file.
  await page.getByRole('button', { name: /Check mic/ }).click()
  await page.locator('.mic-check .mc-panel').waitFor()
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(page.locator('.mic-check')).toHaveCount(0)
  await expect(page.locator('.mic-status-text')).toContainText('Standard silence setting — mic not checked')
  await expect(page.locator('.control-btn.record.recording')).toBeVisible()

  const before = uploads.length
  await expect.poll(() => uploads.length, { timeout: 120_000, intervals: [500] }).toBeGreaterThan(before + 1)
  console.log(`   ${uploads.length} takes filed with the check skipped`)

  // Nothing was stored: a skipped check must not leave a profile behind.
  expect(await storedProfiles(page), 'skipping stores no profile').toBeFalsy()
  await page.screenshot({ path: `${SHOTS}/08-skipped-still-recording-390x844.png` })
})
