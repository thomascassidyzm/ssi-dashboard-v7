import { test, expect } from '@playwright/test'
import { setupStudio, goLive } from './fixture.js'

/**
 * The live chunk indicator advances AS the recordist reads.
 *
 * Kai, 2026-08-19: "Also would be good to show the progression as you do the
 * chunks. It is nice to know it is OK to move on to the next chunk."
 *
 * The fake mic reads the three-piece phrase with 1000ms pauses — pauses the
 * recorder can keep. The test samples the indicator every 50ms from before the
 * first word (see fixture.js) and then asserts on the TIMELINE, not on the end
 * state: a pip that is green by the time the take is over proves nothing about
 * whether the person reading ever saw it turn green.
 */

let uploads

test.beforeEach(async ({ page }) => {
  uploads = await setupStudio(page)
})

test('the chunk indicator advances piece by piece while the phrase is read', async ({ page }) => {
  await goLive(page)

  // The indicator is there before a word is spoken — three pieces, none done.
  const progress = page.locator('.chunk-progress')
  await expect(progress).toBeVisible({ timeout: 30_000 })
  await expect(progress.locator('.pip')).toHaveCount(3)
  await expect(progress.locator('.pip.done')).toHaveCount(0)
  await page.screenshot({ path: 'e2e/slow-read-feedback/shot-progress-start.png' })

  // Piece 1 lands mid-read. This is the assertion Kai asked for in as many
  // words: it is OK to move on to the next chunk, said while there is still a
  // next chunk to move on to.
  await expect(progress.locator('.pip.done')).toHaveCount(1, { timeout: 30_000 })
  await expect(progress.locator('.pause-caption')).toContainText(/registered|piece 2/i)
  // On screen, at 390px, WITHOUT scrolling. The first build of this sat in the
  // page above a 500px auto-scrolling teleprompter and was pushed clean off the
  // viewport — an indicator the reader cannot see mid-read is no indicator, and
  // only a viewport-relative check catches it.
  const box = await progress.boundingBox()
  expect(box.y, 'the indicator is on screen').toBeGreaterThanOrEqual(0)
  expect(box.y + box.height, 'the indicator is fully on screen').toBeLessThanOrEqual(844)
  expect(box.width, 'it spans the phone screen').toBeGreaterThan(340)

  await page.screenshot({ path: 'e2e/slow-read-feedback/shot-progress-mid.png' })

  // A good read is accepted: no refusal panel at any point, and the take files.
  await expect(page.locator('.slow-retry')).toHaveCount(0)
  await expect(page.locator('.summary-card')).toBeVisible({ timeout: 60_000 })
  expect(uploads, 'a clean slow read files as before').toHaveLength(1)
  expect(uploads[0].metadata.chunkBoundariesMs).toHaveLength(3)

  // ---- the progression, as it actually happened ---------------------------
  const timeline = await page.evaluate(() => window.__pipTimeline)
  console.log('indicator timeline:\n' + timeline.map(s => `  ${s.shape}  ${s.caption}`).join('\n'))

  const shapes = timeline.map(s => s.shape)
  // Every stage was on screen in order: nothing done, then one, then two.
  // (The third boundary is the take closing, by which point the panel is gone.)
  const firstIndexOf = (shape) => shapes.indexOf(shape)
  expect(firstIndexOf('C..'), 'starts on piece 1, nothing done').toBeGreaterThanOrEqual(0)
  expect(firstIndexOf('DC.'), 'piece 1 done, now reading piece 2').toBeGreaterThan(firstIndexOf('C..'))
  expect(firstIndexOf('DDC'), 'piece 2 done, now reading piece 3').toBeGreaterThan(firstIndexOf('DC.'))

  // And the pause window was drawn, not just the count: the recordist was told
  // to hold the pause, and then told it had registered.
  const captions = timeline.map(s => s.caption).join(' | ')
  expect(captions).toMatch(/Hold the pause/)
  expect(captions).toMatch(/Pause registered/)
})
