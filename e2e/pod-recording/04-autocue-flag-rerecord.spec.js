// Flag-for-re-record, end to end through the real app with the fake mic.
//
// The bug this covers (Kai, 2026-08-11): in script mode every take is uploaded
// as it is captured, so the review screen's Redo button had nothing left to
// intercept — it coloured the card and changed nothing. The fix is a second
// pass: flag while you listen, then re-record ONLY the flagged items, letting
// each new take supersede the old one through the upload path that already
// does exactly that.
//
// What this proves, in the browser: two items record -> one is flagged and the
// other visibly is not -> "Re-record Flagged (1)" walks to that item alone ->
// the new take lands as Take 2 -> the untouched item is still Take 1, and the
// server received a second upload for the re-recorded item only.
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { loginAsTestUser, TEST_COURSE } from './helpers.js'

// Same silence-padded WAV Mode 1 uses — the VAD slices on RMS silence, so a
// clip without the padding never produces a segment boundary.
test.use({
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${path.resolve('e2e/pod-recording/fixtures/fake-mic-sample-vad.wav')}`
    ]
  }
})

test('flag a take, re-record only the flagged one, and leave the rest alone', async ({ page }) => {
  // Every take the browser actually shipped, in order, with the item text the
  // server was told it belonged to — this is what proves the supersede.
  const uploads = []
  page.on('request', (req) => {
    if (!req.url().includes('/recording/upload')) return
    try {
      uploads.push(JSON.parse(req.postData() || '{}')?.metadata?.text ?? '(no text)')
    } catch { uploads.push('(unparsed)') }
  })

  await loginAsTestUser(page)
  await page.goto(`/production/${TEST_COURSE}/recording`)
  await page.locator('.mode-card', { hasText: 'Mode 1: New Course' }).click()
  await expect(page.getByText('Recording Script Ready')).toBeVisible({ timeout: 20_000 })

  // ── First pass ───────────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Begin Recording' }).click()
  await expect(page.locator('.recording-phase')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: /Start Recording/ }).click()
  // Long enough for the looping WAV to give the VAD two whole utterances.
  await page.waitForTimeout(14_000)
  if (await page.getByRole('button', { name: /Stop Recording/ }).isVisible()) {
    await page.getByRole('button', { name: /Stop Recording/ }).click()
  }
  await page.waitForTimeout(1500) // let the queue flush

  await page.getByRole('button', { name: 'Review Recordings' }).click()
  const cards = page.locator('.segment-card')
  await expect(cards).toHaveCount(2, { timeout: 10_000 })

  const uploadsAfterFirstPass = uploads.length
  expect(uploadsAfterFirstPass, 'first pass should have uploaded both takes').toBe(2)

  // ── Flag exactly one ─────────────────────────────────────────────────────
  // Nothing is flagged yet, so the re-record button has nothing to offer.
  const reRecord = page.getByRole('button', { name: /Re-record Flagged/ })
  await expect(reRecord).toBeDisabled()

  await cards.nth(0).getByRole('button', { name: 'Flag' }).click()

  // The whole point of the flag is that it reads at a glance: flagged card
  // says so on its badge and its button; the other card says neither.
  await expect(cards.nth(0)).toHaveClass(/rejected/)
  await expect(cards.nth(0).locator('.verdict-badge')).toHaveText(/Flagged/)
  await expect(cards.nth(1)).not.toHaveClass(/rejected/)
  await expect(cards.nth(1).locator('.verdict-badge')).toHaveCount(0)
  // exact: the batch bar's "Queue Flagged for Re-record" button also contains
  // this text, so a substring match resolves to two elements and fails strict.
  await expect(page.getByText('Flagged for Re-record', { exact: true })).toBeVisible()

  // ── Second pass: the flagged item only ───────────────────────────────────
  await expect(reRecord).toBeEnabled()
  await expect(reRecord).toHaveText(/Re-record Flagged \(1\)/)
  await reRecord.click()

  // Parked on a one-item pass, and saying so.
  await expect(page.locator('.retake-banner')).toHaveText(/1 of 1/)
  await expect(page.locator('.recording-phase')).toBeVisible()

  await page.getByRole('button', { name: /Start Recording/ }).click()
  await page.waitForTimeout(9000)
  if (await page.getByRole('button', { name: /Stop Recording/ }).isVisible()) {
    await page.getByRole('button', { name: /Stop Recording/ }).click()
  }
  await page.waitForTimeout(1500)

  // Running out of flagged items returns to review — not to the end-of-session
  // summary the pass was launched from.
  await expect(cards).toHaveCount(2, { timeout: 10_000 })
  await expect(page.locator('.retake-banner')).toHaveCount(0)

  // ── The supersede ────────────────────────────────────────────────────────
  // The re-recorded card is on its second take; the untouched one never got a
  // take badge at all, which is what "leave the rest alone" looks like.
  await expect(cards.nth(0).locator('.take-badge')).toHaveText(/Take 2/)
  await expect(cards.nth(1).locator('.take-badge')).toHaveCount(0)

  // ...and the flag cleared itself, because the take it condemned is gone.
  await expect(cards.nth(0)).not.toHaveClass(/rejected/)

  // Server side: exactly one more upload, and it was the flagged item's text.
  expect(uploads.length, 'the second pass should upload one take, not two').toBe(uploadsAfterFirstPass + 1)
  expect(uploads[uploads.length - 1]).toBe(uploads[0])
})
