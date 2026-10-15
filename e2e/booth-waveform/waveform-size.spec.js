import { test, expect } from '@playwright/test'
import { mkdirSync } from 'fs'

/**
 * THE LIVE WAVEFORM IS A WIDE STRIP (job #692; Aran, 2026-10-15: "a bit bigger and use more of the
 * available width ... it helps the recording artists see that the process is working").
 * Desktop: most of the reading column wide, 48-64px tall. Phone: full width, shorter. The page must
 * not scroll, and the state word must still sit with the trace. Every write is aborted.
 */
const SHOTS = process.env.SHOT_DIR || `${process.cwd()}/e2e/booth-waveform/shots`
mkdirSync(SHOTS, { recursive: true })
const LINES = ['llinell un', 'llinell dau', 'llinell tri']
const lum = (c) => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const SIZES = [[1280, 720], [1366, 768], [1920, 1080], [390, 844]]

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => (['GET', 'HEAD'].includes(route.request().method()) ? route.fallback() : route.abort()))
  await page.route('**/api/recording/voice/*', async (route) => {
    if (route.request().method() !== 'GET') return route.abort()
    await route.fulfill({ json: {
      displayName: 'E2E Fake', languageName: 'Welsh', total: LINES.length, recorded: 0, remaining: LINES.length,
      lines: LINES.map((text, i) => ({ id: `L${i + 1}`, text, knownText: `line ${i + 1}`, recorded: false, clipUrl: null })),
    } })
  })
})

for (const light of [true, false]) for (const [w, h] of SIZES) {
  test(`waveform is a wide strip at ${w}x${h}${light ? ' light' : ''}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    if (light) await page.addInitScript(() => { localStorage.setItem('popty-theme', 'light') })
    await page.goto('/r/e2e_fake_voice_never_real')
    await page.getByRole('button', { name: 'Start recording' }).click()
    await expect(page.locator('[data-test="stop"]')).toBeEnabled()
    const wave = page.locator('[data-test="mic"] canvas')
    await expect(wave).toBeVisible()
    await page.waitForTimeout(1500)
    const r = await page.evaluate(() => {
      const c = document.querySelector('[data-test="mic"] canvas').getBoundingClientRect()
      const mic = document.querySelector('[data-test="mic"]')
      const word = mic.querySelector('.mic-word').getBoundingClientRect()
      const next = [...document.querySelectorAll('button')].filter((b) => /^next/i.test(b.textContent.trim())).map((b) => b.getBoundingClientRect())[0]
      const cv = document.querySelector('[data-test="mic"] canvas')
      const cs = getComputedStyle(mic)
      return { fg: cs.color, bg: cs.backgroundColor, theme: document.documentElement.dataset.theme || 'dark', w: c.width, h: c.height, x: c.x, y: c.y, vw: innerWidth, vh: innerHeight,
        wordText: mic.querySelector('.mic-word').textContent.trim(), wordBottom: word.bottom,
        scrollH: document.documentElement.scrollHeight, bodyScrollH: document.body.scrollHeight,
        nextBottom: next ? next.bottom : null, bufW: cv.width, bufH: cv.height }
    })
    if (w >= 1280) {
      expect(r.w, 'strip width').toBeGreaterThanOrEqual(Math.min(500, r.vw * 0.4))
      expect(r.h, 'strip height').toBeGreaterThanOrEqual(48)
      expect(r.h, 'strip height').toBeLessThanOrEqual(64)
    } else {
      expect(r.w, 'phone strip width').toBeGreaterThanOrEqual(r.vw * 0.55)
      expect(r.h, 'phone strip height').toBeGreaterThanOrEqual(32)
      expect(r.h, 'phone strip height').toBeLessThanOrEqual(48)
    }
    expect(r.bufW, 'canvas is painted at its large size').toBeGreaterThanOrEqual(Math.floor(r.w * 0.9))
    expect(r.x + r.w).toBeLessThanOrEqual(r.vw)
    if (light) expect(r.theme, 'light mode really applied').toBe('light')
    if (light) expect(contrast(r.fg, r.bg), `state word contrast ${r.fg} on ${r.bg}`).toBeGreaterThanOrEqual(4.5)
    expect(r.wordText.length).toBeGreaterThan(0)
    expect(r.scrollH, 'no page scroll').toBeLessThanOrEqual(r.vh)
    expect(r.bodyScrollH, 'no body scroll').toBeLessThanOrEqual(r.vh)
    if (r.nextBottom != null) expect(r.nextBottom, 'Next on screen').toBeLessThanOrEqual(r.vh)
    await page.screenshot({ path: `${SHOTS}/wave-${w}x${h}${light ? '-light' : ''}.png` })
  })
}
