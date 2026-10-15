import { test, expect } from '@playwright/test'
import { mkdirSync } from 'fs'

/**
 * THE RE-RECORD CARD (job #788; Aran, 15 Oct: "give me a 're-record' card on my recording page,
 * where all the misses get dumped together"). Tom's test voice. The server's list is stubbed with
 * two skips and a text change; the device's take store holds a refused take and a take still
 * uploading. The card must count 3 + 1 refused = 4, never the uploading one, sit above Up next, and
 * open a batch of only those lines. Every non-GET request is aborted, so nothing is written.
 * One test reads the LIVE /rerecord route unstubbed. Screenshots go to SHOT_DIR (never committed).
 * Run: E2E_BASE_URL=https://popty.app SHOT_DIR=/some/scratch npx playwright test --config=e2e/booth-rerecord-card/playwright.config.js
 */
const SHOTS = process.env.SHOT_DIR || `${process.cwd()}/e2e/booth-rerecord-card/shots`
mkdirSync(SHOTS, { recursive: true })
const VOICE = 'human_tom_zzz'
const C = 'zzz_test2_for_eng'
const KEY = `seed.${C}`
const line = (n, extra = {}) => ({ id: `seed:${C}:${n}:target1`, text: `brawddeg prawf ${n}`, knownText: `test sentence ${n}`, kind: 'seed', role: 'target1', courseCode: C, seedNumber: n, recorded: false, clipUrl: null, ...extra })
const ITEMS = [
  { lineId: line(12).id, why: 'skipped', text: line(12).text, track: KEY, batch: 1 },
  { lineId: line(17).id, why: 'skipped', text: line(17).text, track: KEY, batch: 1 },
  { lineId: line(18).id, why: 'skipped', text: line(18).text, track: KEY, batch: 1 }, // still uploading on the device
  { lineId: line(30).id, why: 'text_changed', text: line(30).text, oldText: 'hen frawddeg prawf 30', track: KEY, batch: 1 },
]
const REFUSED = line(41)
const UPLOADING = line(18)

function stubs(page) {
  return Promise.all([
    page.route('**/*', (route) => (['GET', 'HEAD'].includes(route.request().method()) ? route.fallback() : route.abort())),
    page.route('**/api/recording/voice/*/summary*', (route) => route.fulfill({ json: {
      home: true, fresh: true, displayName: 'Tom', language: 'zzz', languageName: 'Test',
      tracks: [{ key: KEY, kind: 'seed', courseCode: C, newCourse: true, total: 200, recorded: 60,
        batches: [{ n: 1, from: 1, to: 100, total: 100, recorded: 60 }, { n: 2, from: 101, to: 200, total: 100, recorded: 0 }] }],
    } })),
    page.route('**/api/recording/voice/*/rerecord*', (route) => route.fulfill({ json: { voiceId: VOICE, fresh: true, total: ITEMS.length, items: ITEMS, recordedAlso: [] } })),
    page.route(/\/api\/recording\/voice\/[^/?]+\?/, (route) => {
      const u = new URL(route.request().url())
      if (u.searchParams.get('track') === 'rerecord') {
        const lines = [line(12, { rerecordWhy: 'skipped' }), line(17, { rerecordWhy: 'skipped' }), line(18, { rerecordWhy: 'skipped' }), line(30, { rerecordWhy: 'text_changed' }), line(41, { rerecordWhy: 'refused' })]
        return route.fulfill({ json: { displayName: 'Tom', languageName: 'Test', track: 'rerecord', batch: 1, total: lines.length, recorded: 0, remaining: lines.length, lines } })
      }
      const lines = Array.from({ length: 200 }, (_, i) => line(i + 1, { recorded: i < 60 && ![11, 16, 17, 29, 40].includes(i) }))
      return route.fulfill({ json: { displayName: 'Tom', languageName: 'Test', total: 200, recorded: 55, remaining: 145, lines } })
    }),
  ])
}

async function seedDevice(page, light) {
  await page.goto('/')
  await page.evaluate(({ voice, refused, uploading, light }) => new Promise((resolve, reject) => {
    if (light) localStorage.setItem('popty-theme', 'light'); else localStorage.removeItem('popty-theme')
    const req = indexedDB.open('ssi-recordist-takes', 1)
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('takes')) req.result.createObjectStore('takes', { keyPath: 'id' }) }
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const tx = req.result.transaction('takes', 'readwrite')
      const store = tx.objectStore('takes')
      const blob = new Blob([new Uint8Array(1024)], { type: 'audio/webm' })
      store.put({ id: 'e2e-refused', voiceId: voice, lineId: refused.id, text: refused.text, blob, device: 'e2e', status: 'refused', attempts: 1, lastError: "That take didn't capture any speech — check the right microphone is selected, then read the line again.", createdAt: Date.now() - 5000, refusedAt: Date.now() - 4000, nextAttemptAt: 0 })
      store.put({ id: 'e2e-uploading', voiceId: voice, lineId: uploading.id, text: uploading.text, blob, device: 'e2e', status: 'pending', attempts: 0, lastError: null, createdAt: Date.now() - 1000, nextAttemptAt: Date.now() + 3_600_000 })
      for (const n of [1, 2]) store.put({ id: `e2e-old-${n}`, voiceId: voice, lineId: `seed:gone:${n}:target1`, text: `hen frawddeg ${n}`, blob, device: 'e2e', status: 'refused', attempts: 1, lastError: 'no audible speech', createdAt: Date.now() - 9000, refusedAt: Date.now() - 8000, nextAttemptAt: 0 })
      tx.oncomplete = () => resolve()
    }
  }), { voice: VOICE, refused: { id: REFUSED.id, text: REFUSED.text }, uploading: { id: UPLOADING.id, text: UPLOADING.text }, light })
}

test('the live /rerecord route answers for the test voice (unstubbed GET)', async ({ request }) => {
  const res = await request.get(`/api/recording/voice/${VOICE}/rerecord`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body.items)).toBe(true)
  expect(body.voiceId).toBe(VOICE)
})

for (const [w, h, light] of [[1366, 768, true], [390, 844, true], [1366, 768, false]]) {
  const tag = `${w}x${h}-${light ? 'light' : 'dark'}`
  test(`re-record card at ${tag}: 4 lines, the uploading one never counted, opens a batch of only those`, async ({ page }) => {
    await stubs(page)
    await page.setViewportSize({ width: w, height: h })
    await seedDevice(page, light)
    await page.goto(`/r/${VOICE}`)
    const card = page.locator('[data-test="rerecord-card"]')
    await expect(page.locator('[data-test="rerecord-count"]')).toHaveText('4 lines to re-record')
    const cardBox = await card.boundingBox()
    const upNext = await page.locator('[data-test="up-next"]').boundingBox()
    expect(cardBox.y).toBeLessThan(upNext.y)
    await expect(page.locator('[data-test="rerecord-breakdown"]')).toHaveText("1 didn't save · 2 skipped · 1 text changed")
    // JOB #806: ONE card, no per-take red cards, the refused banner gone, uploading banner slim.
    await expect(page.locator('[data-test="rerecord-card"]')).toHaveCount(1)
    await expect(page.locator('[data-test="refused-list"], [data-test^="refused-row-"], .safety-banner.refused')).toHaveCount(0)
    await expect(page.locator('.safety-banner.waiting')).toHaveCount(1)
    await expect(page.locator('[data-test="rerecord-old-toggle"]')).toHaveText('Clear old ones (2)')
    await page.locator('[data-test="rerecord-toggle"]').click()
    await expect(page.locator('[data-test="rerecord-play"]')).toHaveCount(1)
    await expect(page.locator(`[data-test="rerecord-row-${line(12).id}"]`)).toContainText('skipped')
    await expect(page.locator(`[data-test="rerecord-row-${line(30).id}"]`)).toContainText('text changed')
    await expect(page.locator(`[data-test="rerecord-row-${line(30).id}"]`)).toContainText('was: hen frawddeg prawf 30')
    await expect(page.locator(`[data-test="rerecord-row-${REFUSED.id}"]`)).toContainText("didn't save: no speech")
    await expect(page.locator(`[data-test="rerecord-row-${UPLOADING.id}"]`)).toHaveCount(0)
    await card.screenshot({ path: `${SHOTS}/card-${tag}.png` })
    await page.screenshot({ path: `${SHOTS}/home-${tag}.png`, fullPage: true })
    await page.locator('[data-test="rerecord-old-toggle"]').click()
    await page.screenshot({ path: `${SHOTS}/old-open-${tag}.png`, fullPage: true })
    page.once('dialog', (d) => d.accept())
    await page.locator('[data-test="rerecord-old-clear"]').click()
    await expect(page.locator('[data-test="rerecord-old"]')).toHaveCount(0)
    await expect(page.locator('[data-test="rerecord-count"]')).toHaveText('4 lines to re-record')
    await page.locator('[data-test="rerecord-start"]').click()
    await expect(page).toHaveURL(/track=rerecord&batch=1/)
    await expect(page.getByText('Re-record · 4 left')).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/batch-${tag}.png` })
  })
}
