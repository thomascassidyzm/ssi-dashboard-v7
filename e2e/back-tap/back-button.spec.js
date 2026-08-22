import { test, expect } from '@playwright/test'
import { stubAuth } from '../vad-lab/helpers.js'

/**
 * BACK IS A MEDIA-PLAYER BACK BUTTON (Kai, 2026-08-21).
 *
 * It used to skip to the previous take on the first press, which threw away the
 * line being read and landed the recordist on one that was already fine. Now:
 * one tap stays put and says "read it again", two taps inside the window step
 * back. This suite drives that through the real studio with a real MediaRecorder
 * and a silent fake mic, so nothing but the taps moves the script.
 */
const SCRIPT = {
  courseCode: 'cym_for_eng',
  maxSeed: null,
  role: 'target1',
  totalItems: 3,
  totalPhrases: 3,
  totalDirect: 0,
  estimatedMinutes: 1,
  items: ['dw i eisiau siarad', 'dw i eisiau dysgu', 'dw i eisiau helpu'].map((text, index) => ({
    index,
    text,
    cadence: 'natural',
    type: 'phrase',
    phraseIndex: index,
    wordCount: 4,
    coversLegos: [`S000${index + 1}L01`],
    known: 'I want to speak',
    seedNumber: index + 1,
    recordingChunks: null,
    legoChunks: null,
    chunksString: null,
    chunkCount: 1
  }))
}

const item = page => page.locator('.pass-progress')

test.beforeEach(async ({ page }) => {
  await stubAuth(page)
  await page.route('**/api/production/*/recording/queue*', route => route.fulfill({ json: { items: [] } }))
  await page.route('**/api/production/*/recording-script*', route => route.fulfill({ json: SCRIPT }))
  await page.route('**/api/production/*/info*', route =>
    route.fulfill({ json: { course: { known_lang: 'English', target_lang: 'Welsh' } } }))
  await page.route('**/api/production/*/voice-config*', route => route.fulfill({ json: { voice_config: {} } }))

  await page.goto('/production/cym_for_eng/recording')
  await page.locator('.mode-card').first().click()
  await page.getByRole('button', { name: 'Begin Recording' }).click()
  await page.getByRole('button', { name: /Start Recording/ }).click()
  await page.locator('.control-btn.record.recording').waitFor()
})

test('one tap holds the line, two taps step back', async ({ page }) => {
  const back = page.getByRole('button', { name: /Take it again/ })
  const next = page.getByRole('button', { name: /Next/ })

  // The button says what it now does, on the phone, without scrolling.
  await expect(back).toContainText('double-tap = previous')

  // Move up the script so there is somewhere to go back TO.
  await next.click()
  await expect(item(page)).toContainText('Item 2 / 3')

  // ONE TAP: the line does not move, and the studio says why.
  await back.click()
  await expect(item(page)).toContainText('Item 2 / 3')
  const note = page.locator('.back-note')
  await expect(note).toContainText(/read it again|take it from the top/i)
  // On the phone, in the same eyeful as the button that produced it.
  const noteBox = await note.boundingBox()
  const backBox = await back.boundingBox()
  expect(noteBox.y, 'the note is on screen').toBeGreaterThanOrEqual(0)
  expect(noteBox.y + noteBox.height, 'and fully on screen').toBeLessThanOrEqual(844)
  expect(Math.abs(noteBox.y - backBox.y), 'next to the button, not a screen away').toBeLessThan(400)
  await page.screenshot({ path: 'e2e/back-tap/shot-one-tap-holds.png' })

  // A slow second tap is another restart, not a skip — this is the press the
  // old button got wrong.
  await page.waitForTimeout(1200)
  await back.click()
  await expect(item(page)).toContainText('Item 2 / 3')

  // TWO FAST TAPS: now it steps back.
  await back.click()
  await back.click()
  await expect(item(page)).toContainText('Item 1 / 3')
  await page.screenshot({ path: 'e2e/back-tap/shot-double-tap-steps-back.png' })

  // And it stops at the top of the script rather than running off the front.
  await back.click()
  await back.click()
  await expect(item(page)).toContainText('Item 1 / 3')
})
