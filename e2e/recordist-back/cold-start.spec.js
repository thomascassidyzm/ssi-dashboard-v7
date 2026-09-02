import { test, expect } from '@playwright/test'

/**
 * THE FIRST LINE OF A SESSION, IN A REAL BROWSER.
 *
 * The unit tests measure the recorder's age directly. This measures the thing
 * that age depends on and that only a real browser can show: that the line is
 * genuinely not on screen for the settling period after the mic opens, with a
 * real MediaRecorder filling in the meantime.
 *
 * NOTHING HERE MAY REACH A REAL RECORDIST — fabricated voice id, stubbed queue.
 */
const VOICE_ID = 'e2e_fake_voice_never_real'
const LINES = ['llinell un', 'llinell dau']
// COLD_START_SETTLE_MS, minus a slice for the timer's own resolution. The
// assertion that matters is "clearly longer than the trim's 350ms", not the
// exact millisecond.
const FLOOR_MS = 700

test.beforeEach(async ({ page }) => {
  await page.route('**/api/recording/voice/*/take', route => route.fulfill({ json: { audioId: 'e2e', clipUrl: null } }))
  await page.route('**/api/recording/voice/*', async (route) => {
    if (route.request().url().includes('/take')) return route.fallback()
    await route.fulfill({
      json: {
        displayName: 'E2E Fake', languageName: 'Welsh',
        total: LINES.length, recorded: 0, remaining: LINES.length,
        lines: LINES.map((text, i) => ({ id: `L${i + 1}`, text, knownText: `line ${i + 1}`, recorded: false, clipUrl: null })),
      },
    })
  })
  await page.goto(`/r/${VOICE_ID}`)
  await expect(page.locator('.rc-hello')).toContainText('E2E Fake')
})

test('the mic is open and on air before there is anything to read', async ({ page }) => {
  await page.locator('.toggle-row input[type=checkbox]').first().uncheck()

  const startedAt = Date.now()
  await page.locator('.btn-begin').click()

  // Immediately: an on-air light saying it is getting ready, and no line.
  await expect(page.locator('.onair')).toHaveText('Getting ready')
  await expect(page.locator('.line-target')).toHaveCount(0)
  await expect(page.locator('.arming-well')).toBeVisible()

  await expect(page.locator('.line-target')).toHaveText('llinell un')
  const revealedAfter = Date.now() - startedAt
  expect(revealedAfter).toBeGreaterThan(FLOOR_MS)

  // And the light settles at the reveal. It is a status, not a countdown: it
  // never left the screen.
  await expect(page.locator('.onair')).toHaveText('On air')
})
