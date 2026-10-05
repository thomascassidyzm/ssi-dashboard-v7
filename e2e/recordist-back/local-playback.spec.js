import { test, expect } from '@playwright/test'

// Aran 2026-10-05: the take plays from this device the instant it is made,
// while the upload is still in flight. The take endpoint here NEVER answers, so
// the upload stays in flight for the whole test. Fabricated voice, stubbed API.
const VOICE_ID = 'e2e_fake_voice_never_real'

test('the take just made is playable at once, tagged RAW LOCAL, upload still pending', async ({ page }) => {
  await page.route('**/api/recording/voice/*/take', () => { /* never answered */ })
  await page.route('**/api/recording/voice/*', async (route) => {
    if (route.request().url().includes('/take')) return route.fallback()
    await route.fulfill({ json: {
      displayName: 'E2E Fake', languageName: 'Welsh', total: 2, recorded: 0, remaining: 2,
      lines: ['llinell un', 'llinell dau'].map((text, i) => ({ id: `L${i + 1}`, text, knownText: `line ${i + 1}`, recorded: false, clipUrl: null })),
    } })
  })
  await page.goto(`/r/${VOICE_ID}`)
  await expect(page.locator('.rc-hello')).toContainText('E2E Fake')
  await page.locator('.toggle-row input[type=checkbox]').first().uncheck()
  await page.locator('.btn-begin').click()
  await expect(page.locator('.line-well')).toBeVisible()
  await page.waitForTimeout(1500)
  await page.locator('.ctl-next').click()

  const btn = page.locator('.hear-bar .stored-take-btn')
  await expect(btn).toBeEnabled()
  await expect(page.locator('.hear-bar .stb-tag')).toHaveText('RAW LOCAL')
  await btn.click()
  await expect(btn).toContainText('Playing raw local take')
  await page.screenshot({ path: `${process.env.CS_SCRATCH || '/tmp'}/local-playback.png` })
})
