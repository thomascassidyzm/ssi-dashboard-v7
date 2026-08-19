import { test, expect } from '@playwright/test'
import { setupStudio, goLive, takeDurations, runMicCheckInPhase, storedProfiles, yardstick } from './fixture.js'

/**
 * THE HEADLINE. With the microphone check done, a natural-speed phrase with an
 * ordinary mid-phrase breath comes out as ONE take covering the WHOLE phrase —
 * on a phone-like microphone and on an external one 9dB quieter, from the same
 * underlying recording.
 *
 * Run twice per breath length, once per microphone, by the project matrix in
 * playwright.config.js.
 *
 * The session is deliberately in two halves:
 *   1. do the check, which stores a per-device profile in localStorage;
 *   2. RELOAD and record, which is the returning recordist's path — the stored
 *      profile is applied at startFlow with no measuring wait at all.
 * That is both the honest way to get a calibrated take (the check itself
 * suspends capture while it runs) and the persistence assertion, proved by the
 * takes rather than by reading the key back.
 */

let uploads

test.beforeEach(async ({ page }) => {
  uploads = await setupStudio(page, { totalItems: 8 })
})

test('a mid-phrase breath does not cut the take, on either microphone', async ({ page }, testInfo) => {
  const { condition, conditionLabel, breathMs, wav } = testInfo.project.metadata
  console.log(`\n── ${condition}: ${conditionLabel}, breath ${breathMs}ms`)
  console.log(`   fixture: period ${wav.periodMs}ms · phrase ${wav.phraseMs}ms (speech ${wav.phraseMs - breathMs}ms + breath ${breathMs}ms)`)

  // ── 1. the check ─────────────────────────────────────────────────────────
  await goLive(page)
  const check = await runMicCheckInPhase(page, uploads)
  console.log(`   mic check verdict: ${check.verdict.heading} — ${check.verdict.numbers}`)
  expect(check.verdict.heading, 'the check reached a verdict').toBeTruthy()

  const profiles = await storedProfiles(page)
  const profile = Object.values(profiles || {})[0]
  console.log(`   stored profile: ${JSON.stringify(profile)}`)
  expect(profile, 'the check stored a profile').toBeTruthy()
  expect(profile.voiceLevel, 'it heard a voice').toBeGreaterThan(0)

  // ── 2. record, on the stored profile ─────────────────────────────────────
  await page.reload()
  uploads.length = 0
  const t0 = Date.now()
  await goLive(page)
  const startupMs = Date.now() - t0

  // Let the queue run down. Eight items at one phrase per period.
  await expect
    .poll(() => uploads.length, { timeout: 180_000, intervals: [500] })
    .toBeGreaterThanOrEqual(5)
  await page.waitForTimeout(2000)

  const durations = await takeDurations(page, uploads)
  const items = uploads.map(u => u.metadata.text)
  console.log(`   ${uploads.length} takes filed in ${((Date.now() - t0) / 1000).toFixed(0)}s`)
  durations.forEach((d, i) => console.log(`     take ${i + 1}: ${d}ms   "${items[i]}"`))

  // ── what it has to prove ─────────────────────────────────────────────────
  //
  // ONE take per phrase. The fixture holds exactly one phrase per period and
  // the studio advances one item per take, so if the breath had cut the take in
  // half there would be two takes carrying the SAME line — two takes filed
  // against consecutive items from one reading, which is precisely the
  // desynchronisation described in useVAD's silenceDuration comment.
  //
  // The take is measured against the phrase it was cut from, not against a
  // constant: a take that stopped at the breath is about half the phrase.
  const y = yardstick(wav, breathMs)
  console.log(`   a WHOLE take should measure ~${y.whole}ms; a take cut at the breath ~${y.fragment}ms; judging on ${y.wholeFloor}ms`)

  // The FIRST take of a session can begin mid-phrase — the fake mic starts
  // playing at browser launch and the recorder joins the loop wherever it is —
  // so the settled takes are takes 2 onward. Said out loud rather than quietly
  // sliced: nothing else is dropped.
  const settled = durations.slice(1).filter(d => d != null)
  console.log(`   first take ${durations[0]}ms (may start mid-phrase — excluded); judging ${settled.length} settled takes`)
  expect(settled.length, 'enough settled takes to judge').toBeGreaterThanOrEqual(4)

  for (const [i, d] of settled.entries()) {
    expect(d, `settled take ${i + 2} covers the whole phrase, not just the first half`).toBeGreaterThan(y.wholeFloor)
  }
  // No take is a half-phrase fragment — the shape a breath-cut leaves behind.
  expect(settled.filter(d => d <= y.wholeFloor), 'no half-phrase fragments').toHaveLength(0)

  // Every take carries a DIFFERENT line: one reading, one item, in step.
  const lines = uploads.slice(1).map(u => u.metadata.text)
  expect(new Set(lines).size, 'each take files against its own item').toBe(lines.length)

  // And the returning recordist waited for no measuring: the room-only
  // calibration path is 1500ms of listening, which the stored profile skips.
  console.log(`   start-to-live on a stored profile: ${startupMs}ms`)
  await expect(page.locator('.mic-status-text')).toContainText('Tuned to')
})
