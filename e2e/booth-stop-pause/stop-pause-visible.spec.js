import { test, expect } from '@playwright/test'
import { mkdirSync } from 'fs'

/**
 * STOP AND PAUSE ARE ON SCREEN WHENEVER THE MIC IS LIVE (job #681; Aran, 2026-10-15, could not see them
 * on a Chromebook). "Visible" here means the button's box is inside the viewport, not covered by
 * anything (elementFromPoint lands on the button), and big enough to tap.
 */
const SHOTS = process.env.SHOT_DIR || `${process.cwd()}/e2e/booth-stop-pause/shots`
mkdirSync(SHOTS, { recursive: true })
const LINES = ['llinell un', 'llinell dau', 'llinell tri', 'llinell pedwar', 'llinell pump']
const SIZES = [
  [1280, 720], [1280, 800], [1366, 768], [1536, 864], [1920, 1080], [390, 844],
]

const lum = (c) => {
  const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

test.beforeEach(async ({ page }) => {
  // Nothing that writes may leave the page.
  await page.route('**/*', (route) => (route.request().method() === 'GET' || route.request().method() === 'HEAD'
    ? route.fallback() : route.abort()))
  await page.route('**/api/recording/voice/*', async (route) => {
    if (route.request().method() !== 'GET') return route.abort()
    await route.fulfill({ json: {
      displayName: 'E2E Fake', languageName: 'Welsh', total: LINES.length, recorded: 0, remaining: LINES.length,
      lines: LINES.map((text, i) => ({ id: `L${i + 1}`, text, knownText: `line ${i + 1}`, recorded: false, clipUrl: null })),
    } })
  })
})

for (const light of [false, true]) for (const [w, h] of SIZES) {
  test(`Stop and Pause visible live at ${w}x${h}${light ? ' light' : ''}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    if (light) await page.addInitScript(() => { localStorage.setItem('theme', 'light'); document.documentElement.dataset.theme = 'light' })
    await page.goto('/r/e2e_fake_voice_never_real')
    await page.getByRole('button', { name: 'Start recording' }).click()
    const stop = page.locator('[data-test="stop"]')
    const pause = page.locator('[data-test="pause"]')
    await expect(stop).toBeEnabled()
    await expect(pause).toBeEnabled()
    for (const [name, loc] of [['stop', stop], ['pause', pause]]) {
      const r = await loc.evaluate((el) => {
        const b = el.getBoundingClientRect()
        const top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
        const cs = getComputedStyle(el)
        return { x: b.x, y: b.y, w: b.width, h: b.height, vw: innerWidth, vh: innerHeight,
          hit: top === el || el.contains(top), display: cs.display, vis: cs.visibility, bg: cs.backgroundColor, fg: cs.color }
      })
      // White text must read on the fill (WCAG AA 4.5:1) — dark mode once painted Pause mint under white.
      expect(contrast(r.fg, r.bg), `${name} text contrast on ${r.bg}`).toBeGreaterThanOrEqual(4.5)
      expect(r.display, name).not.toBe('none')
      expect(r.w, `${name} width`).toBeGreaterThanOrEqual(40)
      expect(r.h, `${name} height`).toBeGreaterThanOrEqual(40)
      expect(r.x, `${name} left`).toBeGreaterThanOrEqual(0)
      expect(r.y, `${name} top`).toBeGreaterThanOrEqual(0)
      expect(r.x + r.w, `${name} right`).toBeLessThanOrEqual(r.vw)
      expect(r.y + r.h, `${name} bottom`).toBeLessThanOrEqual(r.vh)
      expect(r.hit, `${name} not covered`).toBe(true)
    }
    await page.screenshot({ path: `${SHOTS}/live-${w}x${h}${light ? '-light' : ''}.png` })
  })
}
