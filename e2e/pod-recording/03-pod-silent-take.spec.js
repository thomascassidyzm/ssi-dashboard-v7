// Trinity finding: a silent/near-silent take used to be dropped with no
// immediate feedback — just an aggregate count on the final screen, no
// indication which line dropped. This proves the fix end to end against a
// real (fake) mic: immediate per-line toast + inline marker while recording,
// and a named, re-recordable list on the summary screen.
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { loginAsTestUser, TEST_COURSE, dbScalar } from './helpers.js'

// Genuinely silent WAV (all-zero PCM) — every take captured against it lands
// under the app's drop threshold (blob.size < 1200), unlike the VAD fixture
// which is silence-padded around real speech.
test.use({
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${path.resolve('e2e/pod-recording/fixtures/fake-mic-silence.wav')}`
    ]
  }
})

// Reuses whatever pod cast 01-cast-and-record.spec.js already saved for the
// test course, rather than re-driving the cast UI here — this spec is only
// about the silent-take path, not casting.
async function podVoiceHref() {
  const voiceConfig = await dbScalar('courses', 'voice_config', { course_code: TEST_COURSE })
  const podCast = voiceConfig && voiceConfig.podCast
  if (!podCast) return null
  const first = Object.values(podCast)[0]
  if (!first || !first.voiceId) return null
  return `/record/${TEST_COURSE}?podVoice=${encodeURIComponent(first.voiceId)}`
}

test('a silent take is dropped with immediate on-screen feedback and a redo path', async ({ page }) => {
  const href = await podVoiceHref()
  test.skip(!href, 'no pod cast saved for the test course yet — run 01-cast-and-record.spec.js first')

  await loginAsTestUser(page)
  await page.goto(href)
  await expect(page.getByRole('heading', { name: 'Ready when you are' })).toBeVisible({ timeout: 20_000 })
  await page.getByText(/Re-read lines I've already recorded/).click()

  const startBtn = page.getByRole('button', { name: 'Start' })
  await expect(startBtn).toBeEnabled()
  await startBtn.click()
  await expect(page.locator('.recording-stage')).toBeVisible({ timeout: 10_000 })

  // Record the first line against the silent fake mic and advance — this
  // take must come back empty and get dropped, not silently disappear.
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /^(Next ▶|Done ✓)$/ }).click()

  // 1. Immediate, per-line feedback: a toast naming what just happened, with
  // a redo affordance right there (not just a final aggregate count).
  const toast = page.locator('.drop-toast')
  await expect(toast).toBeVisible({ timeout: 5_000 })
  await expect(toast).toContainText('silent')
  await expect(toast.getByRole('button', { name: 'Redo now' })).toBeVisible()

  // The dropped line is also marked inline in the autocue with its own redo.
  await expect(page.locator('.cue-drop-marker').first()).toBeVisible()

  // Use the toast's redo — jumps back to the dropped line and re-arms the mic.
  await toast.getByRole('button', { name: 'Redo now' }).click()
  await expect(toast).toBeHidden()

  // Re-recording against the same silent mic drops again — tap through to
  // the end of the (short, 6-line) test pod so we reach the summary screen
  // with at least one line still outstanding.
  for (let i = 0; i < 6; i++) {
    const nextBtn = page.getByRole('button', { name: /^(Next ▶|Done ✓)$/ })
    if (!(await nextBtn.isVisible().catch(() => false))) break
    const isDone = (await nextBtn.textContent())?.includes('Done')
    await page.waitForTimeout(1200)
    await nextBtn.click()
    if (isDone) break
    await page.waitForTimeout(150)
  }

  await expect(page.getByRole('heading', { name: /Saved ✓|Saving your recording/ })).toBeVisible({ timeout: 20_000 })

  // 2. The summary screen names the specific dropped line(s) with a way back
  // in — never a bare aggregate count.
  const droppedList = page.locator('.dropped-list')
  await expect(droppedList).toBeVisible({ timeout: 10_000 })
  await expect(droppedList.getByText(/line.*came out silent/)).toBeVisible()
  await expect(droppedList.locator('.dropped-redo-btn').first()).toBeVisible()
})
