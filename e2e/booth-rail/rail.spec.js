import { test, expect } from '@playwright/test'
import { mkdirSync } from 'fs'

/**
 * THE RAIL'S COLOURS AND THE WAY ON (job #693; Aran, 2026-10-15). A finished batch 2 of 3: the
 * saved squares are GREEN (not grey) in light and dark, the legend names the states, and the one
 * big button is "Next batch →" which opens batch 3. Every write is aborted.
 */
const SHOTS = process.env.SHOT_DIR || `${process.cwd()}/e2e/booth-rail/shots`
mkdirSync(SHOTS, { recursive: true })
const LINES = Array.from({ length: 24 }, (_, i) => ({ id: `L${i + 1}`, text: `llinell ${i + 1}`, knownText: `line ${i + 1}`, recorded: i < 22, clipUrl: null }))

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => (['GET', 'HEAD'].includes(route.request().method()) ? route.fallback() : route.abort()))
  await page.route('**/api/recording/voice/*/summary*', (route) => route.fulfill({ json: {
    home: true, displayName: 'E2E Fake', languageName: 'Welsh',
    tracks: [{ key: 'seed.cym_nv2_for_eng', kind: 'seed', courseCode: 'cym_nv2_for_eng', newCourse: true, title: 'New sentences', total: 72, recorded: 48,
      batches: [1, 2, 3].map((n) => ({ n, total: 24, recorded: n === 3 ? 0 : 24 })) }],
  } }))
  await page.route(/\/api\/recording\/voice\/[^/?]+\?/, (route) => route.fulfill({ json: {
    displayName: 'E2E Fake', languageName: 'Welsh', total: 24, recorded: 22, remaining: 2, lines: LINES.map((l) => ({ ...l, recorded: true })),
  } }))
})

for (const light of [true, false]) for (const [w, h] of [[1366, 768], [390, 844]]) {
  test(`finished batch at ${w}x${h}${light ? ' light' : ''}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    if (light) await page.addInitScript(() => { localStorage.setItem('popty-theme', 'light') })
    await page.goto('/r/e2e_fake_voice_never_real?track=seed.cym_nv2_for_eng&batch=2')
    const next = page.locator('[data-test="next-batch"]')
    await expect(next).toBeVisible()
    await expect(next).toContainText('Next batch')
    const box = await next.boundingBox()
    expect(box.y + box.height, 'button on screen').toBeLessThanOrEqual(h)
    if (w >= 1024) {
      const green = await page.evaluate(() => getComputedStyle(document.querySelector('[data-test="rail"] .rail-sq.done')).backgroundColor)
      const grey = await page.evaluate(() => { const e = document.createElement('i'); e.className = 'rail-sq'; document.querySelector('[data-test="rail"]').append(e); return getComputedStyle(e).backgroundColor })
      expect(green, 'saved is not the empty grey').not.toBe(grey)
      await expect(page.locator('[data-test="rail-legend"]')).toContainText('Saved on the server')
    }
    await page.screenshot({ path: `${SHOTS}/rail-${w}x${h}${light ? '-light' : ''}.png` })
  })
}
