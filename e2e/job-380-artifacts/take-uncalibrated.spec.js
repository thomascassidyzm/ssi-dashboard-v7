import { test, expect } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'fs'
import { setupStudio, goLive, takeDurations, yardstick } from './fixture.js'

/**
 * The same two microphones, with NO microphone check — the recorder on whatever
 * silence gate it reaches by itself.
 *
 * This spec deliberately mentions nothing that exists only on the calibration
 * branch, so the identical file runs against the code BEFORE the check (a second
 * dev server on an origin/main worktree — contrast.config.js) and against the
 * branch's skip/fallback path. That is what makes the contrast a contrast: one
 * spec, one fixture, two code bases.
 *
 * It asserts only what is true of BOTH: a session records and files takes. What
 * it is really for is the numbers it writes out — take counts and durations per
 * condition — which is where the old behaviour's asymmetry between the two
 * microphones shows up, or does not.
 */

let uploads

test.beforeEach(async ({ page }) => {
  uploads = await setupStudio(page, { totalItems: 8 })
})

test('records without any mic check, and reports what it cut', async ({ page }, testInfo) => {
  const { condition, conditionLabel, breathMs, wav } = testInfo.project.metadata
  console.log(`\n── ${condition}: ${conditionLabel}, breath ${breathMs}ms — NO mic check`)

  await goLive(page)
  await expect
    .poll(() => uploads.length, { timeout: 180_000, intervals: [500] })
    .toBeGreaterThanOrEqual(5)
  await page.waitForTimeout(2000)

  const durations = await takeDurations(page, uploads)
  const lines = uploads.map(u => u.metadata.text)
  durations.forEach((d, i) => console.log(`     take ${i + 1}: ${String(d).padStart(5)}ms   "${lines[i]}"`))

  const y = yardstick(wav, breathMs)
  const settled = durations.slice(1).filter(d => d != null)
  const whole = settled.filter(d => d > y.wholeFloor).length
  const fragments = settled.filter(d => d <= y.wholeFloor).length

  console.log(`   phrase ${wav.phraseMs}ms · a whole take ~${y.whole}ms · a breath-cut take ~${y.fragment}ms · judged on ${y.wholeFloor}ms`)
  console.log(`   settled takes ${settled.length}: ${whole} whole, ${fragments} half-phrase fragments`)

  const out = `${process.cwd()}/e2e/mic-calibration/results`
  mkdirSync(out, { recursive: true })
  writeFileSync(
    `${out}/uncalibrated-${condition}-breath${breathMs}-${(process.env.E2E_LABEL || 'branch')}.json`,
    JSON.stringify({
      condition, conditionLabel, breathMs, baseURL: testInfo.project.use.baseURL,
      label: process.env.E2E_LABEL || 'branch',
      phraseMs: wav.phraseMs, wholeExpectedMs: y.whole, fragmentExpectedMs: y.fragment, wholeFloorMs: y.wholeFloor,
      takes: durations, lines, settled, whole, fragments
    }, null, 1)
  )

  // The only claim both code bases must satisfy: a session without a mic check
  // is not a blocked session.
  expect(uploads.length, 'recording works with no mic check at all').toBeGreaterThanOrEqual(5)
})
