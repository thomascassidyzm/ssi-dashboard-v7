import { test, expect } from '@playwright/test'
import { mkdirSync } from 'fs'

/**
 * REFUSED LINES COME UP IN THE NORMAL FLOW (Aran, 15 Oct, job #783). Tom's test voice, ten lines,
 * three of them (4, 5, 6) carrying a REFUSED take in the device's take store with the server's
 * "no audible speech" words, and a fake microphone. No red notices over the line; one slim bar
 * "3 lines need re-recording · Go to first"; Go to first lands on line 4, shown like any other line
 * with one small reason under it. Every non-GET request is aborted, so nothing reaches a real queue.
 * Run: E2E_BASE_URL=https://popty.app SHOT_DIR=<outside the repo> npx playwright test --config=e2e/booth-refused-flow/playwright.config.js
 */
const SHOTS = process.env.SHOT_DIR || `${process.cwd()}/e2e/booth-refused-flow/shots`
mkdirSync(SHOTS, { recursive: true })
const VOICE = 'human_tom_zzz'
const SILENT = 'This take contains no audible speech (1ms after silence trimming, minimum 100ms), so it was not saved. Check the microphone is live and record it again.'
const LINES = Array.from({ length: 10 }, (_, i) => ({ id: `E2E-R${i + 1}`, text: `Llinell rhif ${i + 1} i'w darllen yn uchel.`, knownText: `Line number ${i + 1} to read aloud.`, recorded: i < 2, clipUrl: null }))
const REFUSED = ['E2E-R4', 'E2E-R5', 'E2E-R6']

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => (['GET', 'HEAD'].includes(route.request().method()) ? route.fallback() : route.abort()))
  await page.route('**/api/recording/voice/*/summary*', (route) => route.fulfill({ json: {
    home: true, displayName: 'Tom', languageName: 'Test',
    tracks: [{ key: 'seed.zzz_test2_for_eng', kind: 'seed', courseCode: 'zzz_test2_for_eng', newCourse: true, title: 'New sentences', total: 10, recorded: 2,
      batches: [{ n: 1, total: 10, recorded: 2 }] }],
  } }))
  await page.route(/\/api\/recording\/voice\/[^/?]+\?/, (route) => route.fulfill({ json: {
    displayName: 'Tom', languageName: 'Test', total: 10, recorded: 2, remaining: 8, lines: LINES,
  } }))
})

async function seedRefused(page, light) {
  await page.goto('/')
  await page.evaluate(({ ids, voice, why, light }) => new Promise((resolve, reject) => {
    if (light) localStorage.setItem('popty-theme', 'light'); else localStorage.removeItem('popty-theme')
    for (const k of Object.keys(localStorage)) if (k.startsWith('recordist.cursor.')) localStorage.removeItem(k)
    const req = indexedDB.open('ssi-recordist-takes', 1)
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('takes')) req.result.createObjectStore('takes', { keyPath: 'id' }) }
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const tx = req.result.transaction('takes', 'readwrite')
      ids.forEach((lineId, i) => tx.objectStore('takes').put({ id: `e2e-refused-${i}`, voiceId: voice, lineId, text: lineId, blob: new Blob([new Uint8Array(4096)], { type: 'audio/webm' }), device: 'e2e', status: 'refused', attempts: 1, lastError: why, createdAt: Date.now() - 60_000, refusedAt: Date.now() - 30_000, nextAttemptAt: 0 }))
      tx.oncomplete = () => resolve()
    }
  }), { ids: REFUSED, voice: VOICE, why: SILENT, light })
}

for (const light of [true, false]) {
  for (const [w, h] of [[1366, 768], [390, 844]]) {
    test(`${light ? 'light' : 'dark'} ${w}x${h}: refused lines in the flow, one slim bar, reason under the line`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h })
      await seedRefused(page, light)
      await page.goto(`/r/${VOICE}?track=seed.zzz_test2_for_eng&batch=1`)
      await page.locator('.btn-begin').first().click()
      await expect(page.locator('[data-test="line-pos"]')).toContainText('Line 3 of 10')
      await expect(page.locator('.line-target')).toContainText('Llinell rhif 3')
      const bar = page.locator('[data-test="refused-summary"]')
      await expect(bar).toHaveCount(1)
      await expect(bar).toContainText('3 lines need re-recording')
      await expect(page.locator('[data-test="refused-notice"]')).toHaveCount(0)
      await expect(page.locator('.safety-banner.refused')).toHaveCount(0)
      await expect(page.getByText("That line didn't save")).toHaveCount(0)
      // The bar never sits over the line.
      const b = await bar.boundingBox(); const l = await page.locator('.line-target').boundingBox()
      expect(b.y + b.height <= l.y || b.y >= l.y + l.height, 'bar clear of the line').toBe(true)
      await page.screenshot({ path: `${SHOTS}/refused-${light ? 'light' : 'dark'}-${w}x${h}-a-bar.png` })
      await page.locator('[data-test="refused-go-first"]').click()
      await expect(page.locator('[data-test="line-pos"]')).toContainText('Line 4 of 10')
      await expect(page.locator('[data-test="line-state"]')).toHaveText('refused')
      await expect(page.locator('.line-target')).toContainText('Llinell rhif 4')
      await expect(page.locator('[data-test="refused-why"]')).toHaveText("Last take didn't save: no speech heard")
      await expect(page.locator('[data-test="jump-unrecorded"]')).toContainText('line 5')
      await page.screenshot({ path: `${SHOTS}/refused-${light ? 'light' : 'dark'}-${w}x${h}-b-on-refused-line.png` })
    })
  }
}
