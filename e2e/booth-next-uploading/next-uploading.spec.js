import { test, expect } from '@playwright/test'
import { mkdirSync } from 'fs'

/**
 * A BATCH RECORDED BUT STILL UPLOADING OFFERS THE WAY ON (job #789; Aran, 15 Oct). Tom's test voice,
 * a summary with three batches, and every line of batch 2 sitting in the device's take store as a
 * pending (amber) take. Every non-GET request is aborted, so nothing reaches a real queue and the
 * takes stay pending. Run: E2E_BASE_URL=https://popty.app npx playwright test --config=e2e/booth-next-uploading/playwright.config.js
 */
const SHOTS = process.env.SHOT_DIR || `${process.cwd()}/e2e/booth-next-uploading/shots`
mkdirSync(SHOTS, { recursive: true })
const VOICE = 'human_tom_zzz'
const LINES = Array.from({ length: 12 }, (_, i) => ({ id: `E2E-L${i + 1}`, text: `llinell ${i + 1}`, knownText: `line ${i + 1}`, recorded: false, clipUrl: null }))

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => (['GET', 'HEAD'].includes(route.request().method()) ? route.fallback() : route.abort()))
  await page.route('**/api/recording/voice/*/summary*', (route) => route.fulfill({ json: {
    home: true, displayName: 'Tom', languageName: 'Test',
    tracks: [{ key: 'seed.zzz_test2_for_eng', kind: 'seed', courseCode: 'zzz_test2_for_eng', newCourse: true, title: 'New sentences', total: 36, recorded: 12,
      batches: [1, 2, 3].map((n) => ({ n, total: 12, recorded: n === 1 ? 12 : 0 })) }],
  } }))
  await page.route(/\/api\/recording\/voice\/[^/?]+\?/, (route) => route.fulfill({ json: {
    displayName: 'Tom', languageName: 'Test', total: 12, recorded: 0, remaining: 12, lines: LINES,
  } }))
})

async function seedPending(page, ids) {
  await page.goto('/')
  await page.evaluate(({ ids, voice }) => new Promise((resolve, reject) => {
    const req = indexedDB.open('ssi-recordist-takes', 1)
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('takes')) req.result.createObjectStore('takes', { keyPath: 'id' }) }
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const tx = req.result.transaction('takes', 'readwrite')
      ids.forEach((lineId, i) => tx.objectStore('takes').put({ id: `e2e-${i}`, voiceId: voice, lineId, text: lineId, blob: new Blob([new Uint8Array(4096)], { type: 'audio/webm' }), device: 'e2e', status: 'pending', attempts: 0, lastError: null, createdAt: Date.now() - 1000, nextAttemptAt: Date.now() + 3_600_000 }))
      tx.oncomplete = () => resolve()
    }
  }), { ids, voice: VOICE })
}

for (const [w, h] of [[1366, 768], [390, 844]]) {
  test(`all amber at ${w}x${h}: Next batch → and a quiet uploading note`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    await seedPending(page, LINES.map((l) => l.id))
    await page.goto(`/r/${VOICE}?track=seed.zzz_test2_for_eng&batch=2`)
    const next = page.locator('[data-test="next-batch"]')
    await expect(next).toBeVisible()
    await expect(next).toContainText('Next batch')
    await expect(page.locator('[data-test="batch-uploading"]')).toContainText('12 still uploading')
    const box = await next.boundingBox()
    expect(box.y + box.height, 'button on screen').toBeLessThanOrEqual(h)
    await page.screenshot({ path: `${SHOTS}/next-uploading-${w}x${h}.png` })
    await next.click()
    await expect(page).toHaveURL(/batch=3/)
  })
}

test('one line not recorded: no Next batch, Start is offered', async ({ page }) => {
  await seedPending(page, LINES.slice(1).map((l) => l.id))
  await page.goto(`/r/${VOICE}?track=seed.zzz_test2_for_eng&batch=2`)
  await expect(page.locator('[data-test="ready"]')).toBeVisible()
  await expect(page.locator('[data-test="next-batch"]')).toHaveCount(0)
  await expect(page.locator('[data-test="batch-uploading"]')).toHaveCount(0)
})
