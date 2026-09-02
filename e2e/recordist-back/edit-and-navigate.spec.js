import { test, expect } from '@playwright/test'

/**
 * GOING BACK AND FORTH, THE WAY A PERSON ACTUALLY DOES IT.
 *
 * Tom, after recording through the booth on 2026-09-02: "the process worked
 * pretty well, although going back and forth threw it out of whack a bit". He
 * had asked for exactly these journeys beforehand — edit the text first then
 * record it, go back and re-do a recording, go back and edit an already
 * recorded line and record it again — and inline editing had landed the same
 * day, so nobody had ever driven them.
 *
 * Two things were wrong and both are asserted here in a real browser, because
 * both are about a real keyboard and a real queue:
 *
 *   * the shortcut keys are bound to the WINDOW, so every space typed into a
 *     rewrite box called onNext() — advancing the line, closing the take, and
 *     filing the held microphone under the line being rewritten;
 *   * the run only scanned FORWARD, so a line put back to outstanding behind
 *     the cursor was owed for ever and never offered again.
 *
 * NOTHING HERE MAY REACH A REAL RECORDIST. Fabricated voice id, stubbed queue,
 * intercepted take and text endpoints.
 */
const VOICE_ID = 'e2e_fake_voice_never_real'

let takesPosted = []
let textPatched = []

test.beforeEach(async ({ page }) => {
  takesPosted = []
  textPatched = []
  await page.route('**/api/recording/voice/*/line/*/text', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}')
    textPatched.push(body.text)
    await route.fulfill({ json: { ok: true, text: body.text, knownText: null, recorded: false } })
  })
  await page.route('**/api/recording/voice/*/take', async (route) => {
    takesPosted.push(route.request().url())
    await route.fulfill({ json: { audioId: 'e2e', clipUrl: null } })
  })
  await page.route('**/api/recording/voice/*', async (route) => {
    const u = route.request().url()
    if (u.includes('/take') || u.includes('/text')) return route.fallback()
    await route.fulfill({
      json: {
        displayName: 'E2E Fake',
        languageName: 'Welsh',
        total: 4, recorded: 2, remaining: 2,
        // Outstanding lines that are NOT contiguous — what a queue looks like
        // after any re-recording or rewriting at all.
        lines: [
          { id: 'L1', text: 'llinell un', knownText: 'line one', recorded: false, clipUrl: null, canEditText: true },
          { id: 'L2', text: 'llinell dau', knownText: 'line two', recorded: true, clipUrl: null, canEditText: true },
          { id: 'L3', text: 'llinell tri', knownText: 'line three', recorded: true, clipUrl: null, canEditText: true },
          { id: 'L4', text: 'llinell pedwar', knownText: 'line four', recorded: false, clipUrl: null, canEditText: true },
        ],
      },
    })
  })
  await page.goto(`/r/${VOICE_ID}`)
  await expect(page.locator('.rc-hello')).toContainText('E2E Fake')
})

const lineWell = page => page.locator('.line-target')
const nextBtn = page => page.locator('.ctl-next')

// The fake mic reads without stopping, so auto-advance left on walks the queue
// by itself and no assertion about where a tap landed survives.
async function autoAdvanceOff(page) {
  const toggle = page.locator('.toggle-row input[type=checkbox]').first()
  await expect(toggle).toBeChecked()
  await toggle.uncheck()
}

test('a space typed into a rewrite is a space, not Next', async ({ page }) => {
  await autoAdvanceOff(page)
  await page.locator('.btn-begin').click()
  await expect(lineWell(page)).toHaveText('llinell un')

  await page.locator('.edit-open').click()
  const box = page.locator('.edit-box')
  await expect(box).toBeVisible()

  await box.fill('')
  // Typed key by key, through the real keyboard, exactly as she would.
  await box.pressSequentially('te os gwelwch yn dda', { delay: 20 })
  await expect(box).toHaveValue('te os gwelwch yn dda')

  // The editor is still open on the same line and nothing has been filed. Four
  // spaces used to mean four advances and four takes.
  await expect(page.locator('.edit-box')).toBeVisible()
  await expect(page.locator('.stage-progress')).toContainText('Editing')
  expect(takesPosted).toHaveLength(0)

  await page.locator('.edit-save').click()
  await expect(lineWell(page)).toHaveText('te os gwelwch yn dda')
  expect(textPatched).toEqual(['te os gwelwch yn dda'])
  // And the microphone came back with the line.
  await expect(page.locator('.stage-progress')).toContainText('Recording')
})

test('the run wraps back to a line still owed above her, instead of saying Done', async ({ page }) => {
  await autoAdvanceOff(page)
  // She goes straight to the last line from the list, leaving llinell un owed
  // behind her — the one-tap re-record path.
  await page.locator('.roster-toggle').click()
  await page.locator('.roster-list .row').nth(3).locator('.row-record').click()
  await expect(lineWell(page)).toHaveText('llinell pedwar')

  // The stage counts what the roster counts, and the forward control is Next.
  await expect(page.locator('.upnext-head')).toContainText('2 still to read')
  await expect(page.locator('.upnext-list')).toContainText('llinell un')
  await expect(nextBtn(page)).toHaveText('Next')

  await nextBtn(page).click()
  await expect(lineWell(page)).toHaveText('llinell un')
  await expect(nextBtn(page)).toHaveText('Done')

  await nextBtn(page).click()
  await expect(page.locator('.rc-card h2')).toBeVisible()
  // Nothing left owed, and the roster says the same thing the run did.
  await expect(page.locator('.strip-words')).toContainText('4 recorded')
  await expect(page.locator('.strip-words')).toContainText('0 still to read')
})

test('a line rewritten after it was recorded comes round again', async ({ page }) => {
  await autoAdvanceOff(page)
  // Rewrite a line that already has a take, from the list.
  await page.locator('.roster-toggle').click()
  await page.locator('.roster-list .row').nth(1).locator('.row-edit-btn').click()
  await page.locator('.row-edit').fill('llinell dau, eto')
  await page.locator('.row-save').click()
  await expect(page.locator('.strip-words')).toContainText('3 still to read')

  // Then carry on from the far end.
  await page.locator('.roster-list .row').nth(3).locator('.row-record').click()
  await expect(lineWell(page)).toHaveText('llinell pedwar')
  await expect(page.locator('.upnext-list')).toContainText('llinell dau, eto')

  await nextBtn(page).click()
  await expect(lineWell(page)).toHaveText('llinell un')
  await page.waitForTimeout(300)     // the Next/Again bounce guard, unchanged
  await nextBtn(page).click()
  // The rewritten line is offered again rather than sitting silently owed.
  await expect(lineWell(page)).toHaveText('llinell dau, eto')
})
