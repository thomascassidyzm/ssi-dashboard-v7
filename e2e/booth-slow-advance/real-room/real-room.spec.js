import { test, chromium } from '@playwright/test'
import { readdirSync } from 'fs'

/**
 * Replays recordist takes (WAVs in $ROOM_WAV_DIR, e.g. raw takes pulled from the booth's own
 * ?variant=raw clip route) as the microphone, and logs when the booth moved on by itself. Each WAV
 * loops, so a take whose room never counts as quiet shows up as a booth that stops moving.
 * Diagnostic only (job #868); nothing is asserted and every write is answered locally.
 */
const DIR = process.env.ROOM_WAV_DIR
const WAVS = DIR ? readdirSync(DIR).filter((f) => f.endsWith('.wav')).sort() : []
const LINES = Array.from({ length: 30 }, (_, i) => `llinell ${i + 1}`)

for (const wav of WAVS) {
  test(`real room: ${wav}`, async ({ baseURL }) => {
      // The fake mic is a launch flag, so each take gets its own browser.
      const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${DIR}/${wav}`] })
      const page = await (await browser.newContext({ baseURL, colorScheme: 'light' })).newPage()
      await page.route('**/*', (r) => (['GET', 'HEAD'].includes(r.request().method()) ? r.fallback() : r.abort()))
      await page.route('**/api/recording/voice/*/take', (r) => r.fulfill({ json: { audioId: 'x', clipUrl: null } }))
      await page.route('**/api/recording/voice/*', (r) => r.request().method() !== 'GET' ? r.abort() : r.fulfill({ json: {
        displayName: 'E2E Fake', languageName: 'Welsh', total: LINES.length, recorded: 0, remaining: LINES.length,
        lines: LINES.map((text, i) => ({ id: `L${i + 1}`, text, knownText: text, recorded: false, clipUrl: null })) } }))
      await page.addInitScript(() => {
        localStorage.setItem('popty-theme', 'light'); window.__s = []; let last = null; const t0 = performance.now()
        new MutationObserver(() => { const el = document.querySelector('.line-target'); const t = el && el.textContent.trim(); if (t && t !== last) { window.__s.push(Math.round(performance.now() - t0)); last = t } })
          .observe(document, { subtree: true, childList: true, characterData: true })
      })
      await page.goto('/r/e2e_fake_voice_never_real')
      await page.getByRole('button', { name: 'Start recording' }).click()
      await page.waitForTimeout(Number(process.env.WATCH_MS || 45000))
      const s = await page.evaluate(() => window.__s)
      console.log(`${wav}: ${s.length - 1} advances in ${process.env.WATCH_MS || 45000} ms; at ${s.join(', ')}`)
      await browser.close()
  })
}
