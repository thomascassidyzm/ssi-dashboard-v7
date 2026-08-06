// Mode chooser -> Listening Pods -> two-voice cast -> save -> both record
// links work -> fake-mic dialogue recording -> upload verified end to end
// (network 200, storage file, course_audio DB row, UI playback).
import { test, expect } from '@playwright/test'
import { loginAsTestUser, pinApiBase, TEST_COURSE, API_BASE, dbScalar, dbCount } from './helpers.js'

const CAST = [
  { name: 'E2E Voice A', gender: 'f', email: 'e2e-pod-voice-a@ssi-test.invalid' },
  { name: 'E2E Voice B', gender: 'm', email: 'e2e-pod-voice-b@ssi-test.invalid' }
]

test.describe.serial('pod recording — mode chooser, two-voice cast, dialogue recording', () => {
  /** @type {{name: string, voiceId: string}[]} */
  let voices = []

  test('mode chooser renders all 3 modes', async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto(`/production/${TEST_COURSE}/recording`)
    await expect(page.getByText('Mode 1: New Course')).toBeVisible()
    await expect(page.getByText('Mode 2: Regeneration')).toBeVisible()
    await expect(page.getByText('Mode 3: Listening Pods')).toBeVisible()
  })

  test('mode chooser -> Listening Pods opens the cast panel', async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto(`/production/${TEST_COURSE}/recording`)
    await page.locator('.mode-card', { hasText: 'Mode 3: Listening Pods' }).click()
    await page.waitForURL(`**/production/${TEST_COURSE}/pods`)
    await expect(page.getByText('Cast — two voices')).toBeVisible()
  })

  test('cast exactly two voices (1 male, 1 female) and save', async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto(`/production/${TEST_COURSE}/pods`)
    await expect(page.getByText('Cast — two voices')).toBeVisible()
    // .cast-row is reused by BOTH the editable people rows and the read-only
    // allocation cards further down (a saved cast from a prior run renders
    // both) — scope to rows that actually have the Name input.
    const personRows = page.locator('.cast-row').filter({ has: page.getByPlaceholder('Name') })

    // The panel opens in SAVED mode when a prior run already cast this course
    // (PodCastPanel.vue: mode = editing || !hasSavedCast). Editable rows only
    // exist behind "Edit cast" — without this the spec times out on a course
    // that has been cast before, which is every run after the first.
    // The panel makes three sequential API calls before it renders anything, so
    // a bare count() here reads 0 and skips the click. Wait for it to settle.
    const editCast = page.getByRole('button', { name: 'Edit cast' })
    await editCast.first().waitFor({ timeout: 20_000 }).catch(() => {})
    if (await editCast.count() > 0) await editCast.first().click()

    // loadCast() is async (fetch -> prefillPeople() -> loading=false); prefillPeople
    // always leaves at least one person row, so wait for it before touching rows —
    // otherwise the removal loop below races the prefill and "clears" nothing.
    await expect(personRows.first()).toBeVisible({ timeout: 15_000 })

    // The panel may prefill a row from a prior run — clear down to zero first.
    while (await page.locator('button[title="Remove this person"]').count() > 0) {
      await page.locator('button[title="Remove this person"]').first().click()
    }

    for (const person of CAST) {
      await page.getByText(/\+ Add the (first|second) voice/).click()
      const row = personRows.last()
      await row.getByPlaceholder('Name').fill(person.name)
      await row.locator('select').selectOption(person.gender)
      await row.getByPlaceholder(/Email/).fill(person.email)
    }

    // The allocation now solves itself as the form changes — the old
    // "Work out the parts" button was deliberately removed (PodCastPanel.vue:
    // "the preview is not a state"). Wait for the live preview instead.
    await expect(page.getByText('Preview — who records what')).toBeVisible({ timeout: 20_000 })

    // Two allocation cards, one per voice.
    const cards = page.locator('.cast-row', { has: page.locator('text=/Copy record link|Record link comes with saving/') })
    await expect(cards).toHaveCount(2)

    // Idempotent: if this exact cast was already saved by a prior run, the
    // save button is correctly disabled (nothing changed) — only click when
    // there's something dirty to persist.
    const saveBtn = page.getByRole('button', { name: 'Save cast — make the links live' })
    if (await saveBtn.isEnabled()) {
      await saveBtn.click()
      await expect(page.getByText(/Cast saved/)).toBeVisible({ timeout: 15_000 })
    } else {
      // Nothing dirty: this exact cast is already saved. Live record links only
      // exist in the SAVED view, so leave editing before asserting on them —
      // the editing preview deliberately shows dead links.
      await page.getByRole('button', { name: 'Cancel' }).click()
    }
    await expect(page.getByText('Your cast')).toBeVisible({ timeout: 15_000 })

    // Both cards now expose a live "Open ↗" record link.
    const openLinks = page.locator('a:has-text("Open ↗")')
    await expect(openLinks).toHaveCount(2)
    const hrefs = await openLinks.evaluateAll(els => els.map(e => e.getAttribute('href')))
    expect(hrefs.every(Boolean)).toBe(true)

    voices = hrefs.map(href => {
      const u = new URL(href, 'http://x')
      return { href, voiceId: u.searchParams.get('podVoice') }
    })
    expect(voices).toHaveLength(2)
    expect(new Set(voices.map(v => v.voiceId)).size).toBe(2)
  })

  test('voice A record link opens and records lines via fake mic, uploads succeed', async ({ page }) => {
    test.skip(voices.length === 0, 'cast step did not produce voices')
    await recordAllLinesForVoice(page, voices[0].href)
  })

  test('voice B record link opens and records lines via fake mic, uploads succeed', async ({ page }) => {
    test.skip(voices.length < 2, 'cast step did not produce a second voice')
    await recordAllLinesForVoice(page, voices[1].href)
  })

  test('recorded pod audio: DB rows + storage + UI playback', async ({ page }) => {
    // DB: listening_pod_sentences for our pod should now carry target_audio_id,
    // and matching course_audio rows should exist with origin='human'.
    const podRow = await dbScalar('listening_pods', 'id', { course_code: TEST_COURSE, slug: 'pod-0' })
    expect(podRow).toBeTruthy()

    const withAudio = await dbCount('listening_pod_sentences', {
      pod_id: podRow, target_audio_id: 'not.is.null'
    })
    expect(withAudio).toBeGreaterThan(0)

    const humanRows = await dbCount('course_audio', {
      course_code: TEST_COURSE, origin: 'human', role: 'target1'
    })
    expect(humanRows).toBeGreaterThan(0)

    const s3Key = await dbScalar('course_audio', 's3_key', {
      course_code: TEST_COURSE, origin: 'human', role: 'target1'
    })
    expect(s3Key).toBeTruthy()

    // UI playback: open the pod detail page and play the first line with audio.
    await loginAsTestUser(page)
    await page.goto(`/production/${TEST_COURSE}/pods/pod-0`)
    const playBtn = page.locator('button[title^="Play target"]').first()
    await expect(playBtn).toBeVisible({ timeout: 15_000 })

    await Promise.all([
      page.waitForResponse(r => /\/audio\/.+\/url/.test(r.url()), { timeout: 15_000 }),
      playBtn.click()
    ])

    // The hidden <audio> element should end up with a real src and start loading.
    await expect.poll(() => page.locator('audio').evaluate(el => el.src), { timeout: 10_000 }).toContain('http')
    const audioSrc = await page.locator('audio').evaluate(el => el.src)

    // Fetch the storage object directly: non-zero bytes, audio content-type.
    const resp = await page.request.get(audioSrc)
    expect(resp.ok()).toBe(true)
    const contentType = resp.headers()['content-type'] || ''
    expect(contentType.startsWith('audio/')).toBe(true)
    const body = await resp.body()
    expect(body.byteLength).toBeGreaterThan(0)
  })
})

/** Open a pod voice's record link, record every remaining line via the fake mic, verify uploads. */
async function recordAllLinesForVoice(page, href) {
  await loginAsTestUser(page)
  const uploadResponses = []
  page.on('response', (res) => {
    if (res.url().includes('/recording/upload')) uploadResponses.push(res)
  })

  await page.goto(href)
  await expect(page.getByRole('heading', { name: 'Ready when you are' })).toBeVisible({ timeout: 20_000 })

  // Re-runs against the same seeded course see every line already recorded
  // from a prior pass — force a fresh take of all of them so the suite is
  // repeatable, not just a first-run-only pass.
  await page.getByText(/Re-read lines I've already recorded/).click()

  const startBtn = page.getByRole('button', { name: 'Start' })
  await expect(startBtn).toBeEnabled()
  await startBtn.click()

  await expect(page.locator('.recording-stage')).toBeVisible({ timeout: 10_000 })

  // Tap-to-advance through every line: give the fake mic time to capture
  // audio for the current line, then advance. Last tap turns into "Done ✓".
  for (let i = 0; i < 20; i++) { // hard cap — real queues are a handful of lines
    const nextBtn = page.getByRole('button', { name: /^(Next ▶|Done ✓)$/ })
    if (!(await nextBtn.isVisible().catch(() => false))) break
    const isDone = (await nextBtn.textContent())?.includes('Done')
    await page.waitForTimeout(1200) // let MediaRecorder accumulate fake-mic audio
    await nextBtn.click()
    if (isDone) break
    await page.waitForTimeout(150)
  }

  await expect(page.getByRole('heading', { name: /Saved ✓|Saving your recording/ })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('heading', { name: 'Saved ✓' })).toBeVisible({ timeout: 20_000 })

  expect(uploadResponses.length).toBeGreaterThan(0)
  for (const res of uploadResponses) {
    expect(res.status(), `upload to ${res.url()} should be 200`).toBe(200)
  }
}
