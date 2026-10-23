import { test, expect } from '@playwright/test'
import { mkdirSync } from 'fs'

/**
 * AUTO-ADVANCE NEVER WAITS ON AN UPLOAD (Aran, 23 Oct 2026, job #868: "quite a few times it was very
 * slow to move on to the next item ... about the same time as the uploading was catching up").
 *
 * The fake mic reads a line every 3.7 s (1.5 s of speech, 2.2 s of quiet), so with auto-advance on the
 * booth should move on once per burst. Every take upload is held for UPLOAD_DELAY_MS before the test
 * answers it, which is what a slow server or a slow connection looks like from the booth. The test
 * times every step and fails if any step took as long as two reads — a burst the booth slept through.
 */
const SHOTS = process.env.SHOT_DIR || `${process.cwd()}/e2e/booth-slow-advance/shots`
mkdirSync(SHOTS, { recursive: true })
const N = 40
const LINES = Array.from({ length: N }, (_, i) => `llinell ${i + 1}`)
const CYCLE_MS = 3700
const UPLOAD_DELAY_MS = Number(process.env.UPLOAD_DELAY_MS || 6000)
const STEPS = Number(process.env.STEPS || 14)
// A Chromebook is several times slower than the box running this; CPU_THROTTLE=4 shows it.
const CPU_THROTTLE = Number(process.env.CPU_THROTTLE || 1)

for (const delay of [0, UPLOAD_DELAY_MS]) {
  test(`auto-advance keeps pace with uploads held ${delay} ms`, async ({ page }) => {
    let posted = 0
    await page.route('**/*', (route) => (['GET', 'HEAD'].includes(route.request().method()) ? route.fallback() : route.abort()))
    await page.route('**/api/recording/voice/*/take', async (route) => {
      posted++
      if (delay) await new Promise((r) => setTimeout(r, delay))
      await route.fulfill({ json: { audioId: `e2e-${posted}`, clipUrl: null }, headers: { 'x-booth-upload-concurrency': '2' } })
    })
    await page.route('**/api/recording/voice/*', async (route) => {
      if (route.request().method() !== 'GET') return route.abort()
      await route.fulfill({ json: {
        displayName: 'E2E Fake', languageName: 'Welsh', total: N, recorded: 0, remaining: N,
        lines: LINES.map((text, i) => ({ id: `L${i + 1}`, text, knownText: `line ${i + 1}`, recorded: false, clipUrl: null })),
      } })
    })
    await page.addInitScript(() => {
      localStorage.setItem('popty-theme', 'light')
      window.__steps = []
      let last = null
      const look = () => {
        const el = document.querySelector('.line-target')
        const t = el ? el.textContent.trim() : null
        if (t && t !== last) {
          const b = document.querySelector('[data-test="safety-banner"]')
          window.__steps.push({ t: performance.now(), text: t, banner: b ? b.textContent.trim().slice(0, 40) : null })
          last = t
        }
      }
      new MutationObserver(look).observe(document, { subtree: true, childList: true, characterData: true })
    })
    if (CPU_THROTTLE > 1) {
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE })
    }
    await page.goto('/r/e2e_fake_voice_never_real')
    await page.getByRole('button', { name: 'Start recording' }).click()
    await expect(page.locator('.line-target')).toHaveText('llinell 1')
    await expect.poll(() => page.evaluate(() => window.__steps.length), { timeout: (STEPS + 4) * CYCLE_MS * 2 }).toBeGreaterThan(STEPS)
    await page.screenshot({ path: `${SHOTS}/slow-advance-${delay}.png` })
    const steps = await page.evaluate(() => window.__steps)
    const gaps = steps.slice(1).map((s, i) => ({ to: s.text, ms: Math.round(s.t - steps[i].t), banner: s.banner }))
    console.log(`upload delay ${delay} ms, ${posted} takes posted:\n` + gaps.map((g) => `  → ${g.to}  ${g.ms} ms  ${g.banner || '(no banner)'}`).join('\n'))
    // The first step includes the cold start; every one after it is one read.
    for (const g of gaps.slice(1)) expect(g.ms, `step to ${g.to}`).toBeLessThan(CYCLE_MS * 1.6)
    if (delay) expect(steps.slice(3).some((s) => s.banner), 'the still-to-upload count is on screen while takes are held').toBe(true)
  })
}
