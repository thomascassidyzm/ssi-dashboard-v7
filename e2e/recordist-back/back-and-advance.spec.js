import { test, expect } from '@playwright/test'

/**
 * BACK, AND ONE STEP FORWARD PER LINE — from the recordist's seat.
 *
 * Aran's two pieces of live feedback on 2026-08-23: there was no way back, and
 * a tap landing on the same beat as auto-advance jumped two lines.
 *
 * NOTHING HERE MAY REACH A REAL RECORDIST. The voice id is fabricated, the
 * queue is stubbed, and the take endpoint is intercepted and answered locally —
 * a stray take filed under human_aran_cym_n would be a line he has to sort out.
 */
const VOICE_ID = 'e2e_fake_voice_never_real'
const LINES = [
  'llinell un', 'llinell dau', 'llinell tri', 'llinell pedwar', 'llinell pump',
]

let takesPosted = []

test.beforeEach(async ({ page }) => {
  takesPosted = []
  await page.route('**/api/recording/voice/*/take', async (route) => {
    takesPosted.push(route.request().url())
    await route.fulfill({ json: { audioId: 'e2e', clipUrl: null } })
  })
  await page.route('**/api/recording/voice/*', async (route) => {
    if (route.request().url().includes('/take')) return route.fallback()
    await route.fulfill({
      json: {
        displayName: 'E2E Fake',
        languageName: 'Welsh',
        total: LINES.length,
        recorded: 0,
        remaining: LINES.length,
        lines: LINES.map((text, i) => ({ id: `L${i + 1}`, text, knownText: `line ${i + 1}`, recorded: false, clipUrl: null })),
      },
    })
  })
  await page.goto(`/r/${VOICE_ID}`)
  await expect(page.locator('.rc-hello')).toContainText('E2E Fake')
})

const lineWell = page => page.locator('.line-target')
const backBtn = page => page.locator('.ctl-back')
const nextBtn = page => page.locator('.ctl-next')

// The fake microphone reads without stopping, so with auto-advance left on it
// walks the whole queue on its own. Navigation is tested with it off — the way
// Aran uses it in a noisy room — and auto-advance gets its own test below.
async function begin(page, { autoAdvance = false } = {}) {
  if (!autoAdvance) {
    const toggle = page.locator('.toggle-row input[type=checkbox]').first()
    await expect(toggle).toBeChecked()
    await toggle.uncheck()
  }
  await page.locator('.btn-begin').click()
  await expect(page.locator('.line-well')).toBeVisible()
}

test('Back is absent on the first line and appears once he has moved', async ({ page }) => {
  await begin(page)
  await expect(lineWell(page)).toHaveText('llinell un')
  // Not a button that does nothing: on line one there is nowhere to go back to.
  await expect(backBtn(page)).toHaveCount(0)
  await expect(page.locator('.kbd-hint')).not.toContainText('back')

  await nextBtn(page).click()
  await expect(lineWell(page)).toHaveText('llinell dau')
  await expect(backBtn(page)).toBeVisible()
  await expect(backBtn(page)).toHaveText('Back')
  await expect(page.locator('.kbd-hint')).toContainText('back')
})

test('Back returns him to the line he actually came from, and B does the same', async ({ page }) => {
  await begin(page)
  await nextBtn(page).click()
  // Next carries a 250ms bounce guard of its own, on main and unchanged here.
  await page.waitForTimeout(300)
  await nextBtn(page).click()
  await expect(lineWell(page)).toHaveText('llinell tri')

  await backBtn(page).click()
  await expect(lineWell(page)).toHaveText('llinell dau')

  // Back keeps a 250ms bounce guard of its own, so two steps back are two taps
  // a human could actually make, not two in the same instant.
  await page.waitForTimeout(300)
  await page.keyboard.press('b')
  await expect(lineWell(page)).toHaveText('llinell un')
  await expect(backBtn(page)).toHaveCount(0)
})

test('the three controls sit across one phone screen, all thumb-sized', async ({ page }) => {
  await begin(page)
  await nextBtn(page).click()
  await expect(backBtn(page)).toBeVisible()
  const boxes = await Promise.all(
    ['.ctl-back', '.ctl-again', '.ctl-next'].map(s => page.locator(s).boundingBox())
  )
  // One row: every control shares a top edge, and none of them is a sliver.
  const tops = boxes.map(b => Math.round(b.y))
  expect(new Set(tops).size).toBe(1)
  for (const b of boxes) {
    expect(b.height).toBeGreaterThanOrEqual(44)
    expect(b.width).toBeGreaterThanOrEqual(44)
  }
  // And it stays inside the 390px screen.
  const last = boxes[2]
  expect(last.x + last.width).toBeLessThanOrEqual(390)
})

test('auto-advance moves exactly one line, and a tap on the same beat does not add a second', async ({ page }) => {
  await begin(page, { autoAdvance: true })
  await expect(lineWell(page)).toHaveText('llinell un')

  // The fake mic reads a burst then goes quiet; the studio moves on by itself.
  await expect(lineWell(page)).toHaveText('llinell dau', { timeout: 30_000 })

  // Aran's thumb, arriving a beat after the screen changed under it. It was
  // aimed at the line that has just gone, so it must not skip llinell dau.
  await nextBtn(page).click()
  await expect(lineWell(page)).toHaveText('llinell dau')
})

test('a line re-read after Back counts once, not twice', async ({ page }) => {
  await begin(page)
  await nextBtn(page).click()          // files a take for llinell un
  await expect(lineWell(page)).toHaveText('llinell dau')
  await backBtn(page).click()          // returns to llinell un
  await expect(lineWell(page)).toHaveText('llinell un')
  await nextBtn(page).click()          // reads it again — supersedes, does not add
  await expect(lineWell(page)).toHaveText('llinell dau')

  await page.locator('.btn-finish').click()
  await expect(page.locator('.rc-card h2')).toBeVisible()
  // THREE takes were read — llinell un twice — but only TWO lines were read,
  // and the listen-back list shows each of them once. That gap is the whole
  // assertion: before this change the re-read counted as a third line and the
  // done screen was a lie about how much work he had done.
  await expect.poll(() => takesPosted.length).toBe(3)
  await expect(page.locator('.rc-progress-line')).toContainText('You read 2 lines')
  await expect(page.locator('.listen-back li')).toHaveCount(2)
})
