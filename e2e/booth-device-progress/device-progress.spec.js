import { test, expect } from '@playwright/test'
import { mkdirSync } from 'fs'

/**
 * A LEGO BATCH READ ON THE DEVICE READS AS RECORDED, STILL UPLOADING (job #791; Aran, 15 Oct:
 * "it shows me as NOT having recorded any of the batches I have just done"). Tom's test voice, a
 * LEGO section of three batches with nothing on the server, and 140 of its lines sitting in the
 * device's take store as pending takes. Every non-GET request is aborted, so nothing reaches a real
 * queue and the takes stay pending. Screenshots go to SHOT_DIR (never committed).
 * Run: E2E_BASE_URL=https://popty.app SHOT_DIR=/some/scratch npx playwright test --config=e2e/booth-device-progress/playwright.config.js
 */
const SHOTS = process.env.SHOT_DIR || `${process.cwd()}/e2e/booth-device-progress/shots`
mkdirSync(SHOTS, { recursive: true })
const VOICE = 'human_tom_zzz'
const KEY = 'lego.zzz_test2_for_eng'
const LINES = Array.from({ length: 250 }, (_, i) => ({
  id: `lego:e2e${i}:target1`, text: `darn ${i + 1}`, knownText: `piece ${i + 1}`, kind: 'lego', role: 'target1',
  courseCode: 'zzz_test2_for_eng', recorded: false, clipUrl: null,
}))

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => (['GET', 'HEAD'].includes(route.request().method()) ? route.fallback() : route.abort()))
  await page.route('**/api/recording/voice/*/summary*', (route) => route.fulfill({ json: {
    home: true, fresh: true, displayName: 'Tom', language: 'zzz', languageName: 'Test',
    tracks: [{ key: KEY, kind: 'lego', courseCode: 'zzz_test2_for_eng', newCourse: true, total: 250, recorded: 0,
      batches: [[1, 100], [2, 100], [3, 50]].map(([n, total]) => ({ n, from: (n - 1) * 100 + 1, to: (n - 1) * 100 + total, total, recorded: 0 })) }],
  } }))
  // The whole queue, read once to place takes this device has not filed a place for.
  await page.route(/\/api\/recording\/voice\/[^/?]+\?/, (route) => route.fulfill({ json: {
    displayName: 'Tom', languageName: 'Test', total: 250, recorded: 0, remaining: 250, lines: LINES,
  } }))
})

async function seedPending(page, ids, light) {
  await page.goto('/')
  await page.evaluate(({ ids, voice, light }) => new Promise((resolve, reject) => {
    if (light) localStorage.setItem('popty-theme', 'light'); else localStorage.removeItem('popty-theme')
    const req = indexedDB.open('ssi-recordist-takes', 1)
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('takes')) req.result.createObjectStore('takes', { keyPath: 'id' }) }
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const tx = req.result.transaction('takes', 'readwrite')
      ids.forEach((lineId, i) => tx.objectStore('takes').put({ id: `e2e-${i}`, voiceId: voice, lineId, text: lineId, blob: new Blob([new Uint8Array(1024)], { type: 'audio/webm' }), device: 'e2e', status: 'pending', attempts: 0, lastError: null, createdAt: Date.now() - 1000, nextAttemptAt: Date.now() + 3_600_000 }))
      tx.oncomplete = () => resolve()
    }
  }), { ids, voice: VOICE, light })
}

for (const [w, h, light] of [[1366, 768, true], [390, 844, true], [1366, 768, false]]) {
  test(`LEGO section at ${w}x${h} ${light ? 'light' : 'dark'}: 140 of 250 recorded, still uploading`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    await seedPending(page, LINES.slice(0, 140).map((l) => l.id), light)
    await page.goto(`/r/${VOICE}?track=${KEY}`)
    await expect(page.locator('[data-test="track-uploading"]')).toContainText('140 still uploading')
    await expect(page.locator('.bh-track')).toContainText('140 of 250 recorded')
    await expect(page.locator('[data-test="batch-1"]')).toContainText('100 of 100 recorded (100 still uploading)')
    await expect(page.locator('[data-test="batch-2"]')).toContainText('40 of 100 recorded (40 still uploading)')
    await page.screenshot({ path: `${SHOTS}/lego-section-${w}x${h}-${light ? 'light' : 'dark'}.png`, fullPage: true })
  })
}
