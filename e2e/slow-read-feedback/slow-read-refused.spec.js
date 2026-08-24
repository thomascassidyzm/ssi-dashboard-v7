import { test, expect } from '@playwright/test'
import { setupStudio, goLive } from './fixture.js'

/**
 * A slow read whose pauses were too quick to register is refused, loudly, and
 * the line is read again — it is not filed and it does not go green.
 *
 * This is the defect Kai named on 2026-08-19 after recording on the studio
 * himself: "There is a little message, but it would be better to prompt the
 * recorder for the slow phrase again if it does not get the gaps right, rather
 * than carrying on - do not just mark it green."
 *
 * The fake mic reads the three-piece phrase with 250ms pauses. A person makes
 * that pause and hears themselves make it; the VAD needs 400ms to count it
 * (useVAD chunkPauseDuration), so the recorder keeps none of them and the take
 * arrives as one undivided piece. Before this, that take was uploaded, ticked
 * green, and refused hours later by the server-side aligner with a
 * "chunk-count mismatch" no recordist ever sees.
 */

let uploads

test.beforeEach(async ({ page }) => {
  uploads = await setupStudio(page)
})

test('a slow read with pauses too quick is refused and re-prompted, not filed', async ({ page }) => {
  await goLive(page)

  // ---- it fails, and it fails LOUDLY --------------------------------------
  const retry = page.locator('.slow-retry')
  await expect(retry).toBeVisible({ timeout: 60_000 })
  await expect(retry).toContainText('Read that one again')

  // It says WHAT went wrong, in counts a person can act on.
  await expect(retry.locator('.retry-count')).toContainText('Heard 1 piece')
  await expect(retry.locator('.retry-count')).toContainText('the script has 3')

  // And WHY — the recordist did pause, they just paused too quickly. That is a
  // different instruction from "you forgot to pause", and it is the one the
  // VAD's short-pause count exists to make sayable.
  await expect(retry.locator('.retry-advice')).toContainText('too quick')

  // The missing pieces are drawn as holes, not as dimmed good ones.
  await expect(retry.locator('.retry-pip.heard')).toHaveCount(1)
  await expect(retry.locator('.retry-pip.missed')).toHaveCount(2)

  // ---- and it did NOT carry on -------------------------------------------
  // Nothing filed. This is the assertion that matters: the old behaviour would
  // have a take in this array by now.
  expect(uploads, 'a refused take must not be uploaded').toHaveLength(0)

  // The line is not green: it is still the current line, not a done one, and
  // it carries no uploaded dot.
  const card = page.locator('.phrase-card').first()
  await expect(card).toHaveClass(/current/)
  await expect(card).not.toHaveClass(/done/)
  await expect(page.locator('.uploaded-dot')).toHaveCount(0)

  // Still on item 1 of 1 — the autocue did not advance past the bad take.
  await expect(page.locator('.pass-progress')).toContainText('Item 1 / 1')
  // And the session is still live, waiting for the read: no summary screen.
  await expect(page.locator('.summary-card')).toHaveCount(0)

  // ---- readable one-handed on a phone -------------------------------------
  // Kai reads this at 390px. The panel has to be within the first screenful and
  // its buttons have to be thumb-sized, or none of the above is any use.
  // Measured against the VIEWPORT, not the document. The first build of this
  // panel sat in the page above the teleprompter and passed a document-relative
  // check while being scrolled entirely off a 390px screen — the screenshot
  // showed a live session with no sign of the refusal anywhere. This is the
  // assertion that would have caught it.
  const box = await retry.boundingBox()
  expect(box.width, 'the panel spans the phone screen').toBeGreaterThan(340)
  expect(box.y, 'the panel is on screen').toBeGreaterThanOrEqual(0)
  expect(box.y + box.height, 'the panel is fully on screen').toBeLessThanOrEqual(844)
  const again = page.getByRole('button', { name: 'Record it again' })
  const againBox = await again.boundingBox()
  expect(againBox.height, 'tap target').toBeGreaterThanOrEqual(44)

  await page.screenshot({ path: 'e2e/slow-read-feedback/shot-refused.png' })

  // ---- the escape hatch is not offered on the first stumble ---------------
  await expect(page.getByRole('button', { name: 'Keep this take anyway' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Skip this line' })).toHaveCount(0)

  // ---- "Record it again" puts them back on the same line -------------------
  await again.click()
  await expect(retry).toHaveCount(0)
  await expect(page.locator('.pass-progress')).toContainText('Item 1 / 1')

  // The fake mic loops its file, so the same too-quick read comes round again
  // and is refused a second time. NOW the escape hatches appear — the recordist
  // is not blocked for ever, but the default was, and stayed, re-record.
  await expect(retry).toBeVisible({ timeout: 60_000 })
  await expect(retry.locator('.retry-attempts')).toContainText('2 tries')
  await expect(page.getByRole('button', { name: 'Keep this take anyway' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Skip this line' })).toBeVisible()

  await page.screenshot({ path: 'e2e/slow-read-feedback/shot-refused-second.png' })

  // Keeping it deliberately DOES file it, unchanged — the recordist's call.
  await page.getByRole('button', { name: 'Keep this take anyway' }).click()
  await expect(page.locator('.summary-card')).toBeVisible({ timeout: 30_000 })
  expect(uploads, 'keep-anyway files the take the recordist chose to keep').toHaveLength(1)
  expect(uploads[0].metadata.cadence).toBe('slow')
})
