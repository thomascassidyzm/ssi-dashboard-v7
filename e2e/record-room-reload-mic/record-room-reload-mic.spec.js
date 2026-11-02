import { test, expect } from '@playwright/test'
import { stubAuth } from '../vad-lab/helpers.js'

/**
 * Auke's two Record Room bugs (fry_for_eng, 2026-11-02, job #43), driven through the real studio:
 *
 *  1. A deploy mid-session reloaded the page ("New version detected. Reloading...") and every take
 *     not yet uploaded was lost. Now: the reload is held while the session is open, a quiet banner
 *     says a new version is waiting, each take sits in IndexedDB until the server confirms it, and
 *     a later page load sends whatever was left.
 *  2. With no working mic, "Begin Recording" went straight to "Session Complete". Now the session
 *     stays open on the same line and the screen says what is wrong and what to do.
 */

const items = ['ik wol mei dy prate', 'ik begjin my wurch te fielen', 'ik wit net wat it antwurd is', 'it is no tiid om te gean']
const SCRIPT = {
  courseCode: 'fry_for_eng', maxSeed: null, role: 'target1',
  totalItems: items.length, totalPhrases: items.length, totalDirect: 0, estimatedMinutes: 1,
  items: items.map((text, index) => ({
    index, text, cadence: 'natural', type: 'phrase', phraseIndex: index, wordCount: 4,
    coversLegos: [`S000${index + 1}L01`], known: 'x', seedNumber: index + 1,
    recordingChunks: [{ text, isLego: true }], legoChunks: null, chunksString: text, chunkCount: 1,
  })),
}

let uploads
let uploadStatus
let version

async function stubApi(page) {
  await stubAuth(page)
  page.on('console', (m) => {
    const t = m.text()
    if (/\[Autocue\]|\[UploadQueue\]|\[VAD\]|Popty\]/.test(t)) console.log(`  page> ${t.slice(0, 200)}`)
  })
  await page.route('**/api/production/*/recording/queue*', r => r.fulfill({ json: { items: [] } }))
  await page.route('**/api/production/*/recording-script*', async r => {
    await new Promise(res => setTimeout(res, 1500))
    await r.fulfill({ json: SCRIPT })
  })
  await page.route('**/api/production/*/info*', r => r.fulfill({ json: { course: { known_lang: 'English', target_lang: 'Frisian' } } }))
  await page.route('**/api/courses/*/voice-config*', r => r.fulfill({ json: { config: {} } }))
  await page.route('**/api/production/*/recording/upload*', r => {
    let body = {}
    try { body = JSON.parse(r.request().postData() || '{}') } catch { /* not ours */ }
    uploads.push({ status: uploadStatus, text: body.metadata?.text, recovered: !!body.metadata?.recoveredFromDevice })
    if (uploadStatus >= 300) return r.fulfill({ status: uploadStatus, body: '<html>Bad gateway</html>' })
    return r.fulfill({ json: { success: true, uuid: `U${uploads.length}` } })
  })
  // The deployed build's version. null → 404 (no new build seen yet).
  await page.route('**/version.json*', r => (version ? r.fulfill({ json: { version } }) : r.fulfill({ status: 404, body: '' })))
}

async function shelfCount(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('ssi-autocue-takes')
    req.onsuccess = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('takes')) return resolve(0)
      const g = db.transaction('takes').objectStore('takes').getAll()
      g.onsuccess = () => resolve(g.result.filter(r => r.courseCode).length)
    }
    req.onerror = () => resolve(-1)
  }))
}

async function beginSession(page) {
  await page.goto('/production/fry_for_eng/recording')
  await page.getByRole('button', { name: /Test batch first/ }).click()
  await page.getByRole('button', { name: 'Begin Recording' }).click()
}

test.beforeEach(() => { uploads = []; uploadStatus = 200; version = null })

test('a missing microphone is said on screen and the session stays open', async ({ page }) => {
  await stubApi(page)
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Requested device not found', 'NotFoundError'))
  })
  await beginSession(page)
  await page.getByRole('button', { name: /Start Recording/ }).click()

  const err = page.getByTestId('mic-error')
  await expect(err).toBeVisible()
  await expect(err).toContainText('No microphone was found')
  await expect(err).toContainText('still on item 1')
  await expect(page.locator('.summary-card')).toHaveCount(0)
  await expect(page.getByText('Session Complete')).toHaveCount(0)
  await expect(page.locator('.pass-progress')).toContainText('Item 1 /')
  expect(uploads.length).toBe(0)
  await page.screenshot({ path: `${process.env.SHOTS || '/tmp'}/mic-error.png`, fullPage: true })
})

test('a deploy mid-session waits; takes the server never got survive a reload and are sent on the next visit', async ({ page }) => {
  await stubApi(page)
  await page.addInitScript(() => { window.__loadedAt = window.__loadedAt || Date.now() })
  await beginSession(page)
  const marker = await page.evaluate(() => (window.__marker = Math.random()))

  // The server is mid-deploy: every upload answers 502.
  uploadStatus = 502
  await page.getByRole('button', { name: /Start Recording/ }).click()
  await expect(page.locator('.control-btn.record.recording')).toBeVisible()
  // Wait for at least one take to be captured and shelved.
  await expect.poll(() => shelfCount(page), { timeout: 60_000 }).toBeGreaterThan(0)

  // A new build lands. The tab comes back into view (the trigger that reloaded Auke's page).
  version = 'brand-new-build'
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(page.getByTestId('new-version-banner')).toBeVisible()
  await expect(page.getByTestId('new-version-banner')).toContainText('It will load when you finish')
  expect(await page.evaluate(() => window.__marker)).toBe(marker) // not reloaded
  await page.screenshot({ path: `${process.env.SHOTS || '/tmp'}/new-version-banner.png`, fullPage: true })

  const shelved = await shelfCount(page)
  expect(shelved).toBeGreaterThan(0)

  // The tab dies anyway (crash, closed lid, a forced reload). Deploy over; uploads work again.
  uploadStatus = 200
  version = null
  const before = uploads.length
  await page.reload()
  await expect(page.getByTestId('recovery-bar')).toContainText(/now been saved/, { timeout: 60_000 })
  const recovered = uploads.slice(before).filter(u => u.recovered && u.status === 200)
  // The fake mic keeps reading until the reload, so more takes may have joined the shelf after the
  // count above; every one of them must have been sent, and the shelf left empty.
  expect(recovered.length).toBeGreaterThanOrEqual(shelved)
  expect(await shelfCount(page)).toBe(0)
  await page.screenshot({ path: `${process.env.SHOTS || '/tmp'}/recovered.png`, fullPage: true })
})

test('the held reload lands once the session is finished and the queue is empty', async ({ page }) => {
  await stubApi(page)
  await beginSession(page)
  await page.evaluate(() => (window.__marker = 'still-here'))
  version = 'brand-new-build'
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(page.getByTestId('new-version-banner')).toBeVisible()
  expect(await page.evaluate(() => window.__marker)).toBe('still-here')

  // Finish the session the way a recordist does: record, Stop, then Done on the summary.
  await page.getByRole('button', { name: /Start Recording/ }).click()
  await expect(page.locator('.control-btn.record.recording')).toBeVisible()
  await page.locator('.control-btn.record.recording').click() // Stop → summary
  await expect(page.locator('.summary-card')).toBeVisible()
  expect(await page.evaluate(() => window.__marker)).toBe('still-here') // summary still holds
  await expect.poll(() => page.evaluate(() => document.querySelectorAll('.summary-value.pending').length)).toBe(0)
  const navigation = page.waitForEvent('framenavigated')
  await page.getByRole('button', { name: 'Done' }).click()
  await navigation
  await expect.poll(() => page.evaluate(() => window.__marker ?? null)).toBe(null) // reloaded
})
