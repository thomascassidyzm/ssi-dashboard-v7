// THE ARTIST'S DAY, END TO END, IN A REAL BROWSER, AGAINST THE REAL STAGING BOOTH.
//
// Tom, 2026-09-11: "I just want it fixed. You can have workers running browsers
// and doing the whole process." The component test beside RecordistRoom.vue
// fakes the shelf, the mic and the network; this fakes NOTHING but the
// microphone's air. Real Chromium, real MediaRecorder, real IndexedDB, real
// multipart uploads to the staging production-api, the server's real silent-take
// refusal (ffmpeg's -40 dB trim leaving nothing), a real page reload, and a real
// browser close-and-reopen over the same profile directory.
//
// The only things the run may write to are the e2e_booth test voice, its test
// course and its test pod (fixture.cjs). Nothing here can reach a real artist.
//
// Run:  node e2e/booth-artists-day/fixture.cjs reset && \
//       npx playwright test --config=e2e/booth-artists-day/playwright.config.js
import { test, expect, chromium } from '@playwright/test'
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs'
import { createRequire } from 'module'
import os from 'os'
import path from 'path'
import { buildMicWav } from './make-mic-wav.js'

const require = createRequire(import.meta.url)
const fixture = require('./fixture.cjs')
const { VOICE_ID, VOICE_NAME, LINES } = fixture
const N = LINES.length

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:3491'
const API = process.env.E2E_API_BASE || 'http://127.0.0.1:3490'
const SHOTS = process.env.E2E_SHOTS || path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/e2e/booth-artists-day', new Date().toISOString().replace(/[:.]/g, '-'))
const PROFILE = process.env.E2E_PROFILE_DIR || path.join(os.homedir(), '.cache', `booth-artists-day-profile-${process.pid}`)
const MIC_WAV = buildMicWav(path.join(os.homedir(), '.cache', `booth-artists-day-mic-${process.pid}.wav`))
// Aran and Catrin record on phones.
const IPHONE = { width: 390, height: 844 }
// What the server says about a take its trim leaves nothing of
// (services/recording-upload-helpers.cjs).
const SERVER_REFUSAL = /no audible speech/i

mkdirSync(SHOTS, { recursive: true })
const log = []
const note = (s) => { log.push(`${new Date().toISOString().slice(11, 19)} ${s}`); console.log(`  · ${s}`) }
let shotN = 0
async function shot(page, name) {
  const file = path.join(SHOTS, `${String(++shotN).padStart(2, '0')}-${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  note(`screenshot ${path.basename(file)}`)
  return file
}

// ── The browser, exactly as the artist has it ───────────────────────────────
async function openBrowser() {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    viewport: IPHONE,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${MIC_WAV}`,
    ],
  })
  // On 127.0.0.1 getApiUrl() falls through to localhost:3470 — PRODUCTION.
  // Pin the booth to this origin (which proxies /api to staging) and keep
  // EnvironmentSwitcher from moving it.
  await ctx.addInitScript((apiBase) => {
    const realSetItem = window.localStorage.setItem.bind(window.localStorage)
    window.localStorage.setItem = function (key, value) {
      if (key === 'api_base_url') return
      return realSetItem(key, value)
    }
    realSetItem('api_base_url', apiBase)
  }, BASE)
  return ctx
}

// ── What the artist reads off the screen ────────────────────────────────────
async function counts(page) {
  const strip = page.locator('.strip-words').first()
  if (!(await strip.count())) return null
  const m = /(\d+) recorded · (-?\d+) still to read/.exec(await strip.textContent())
  return m ? { recorded: Number(m[1]), stillToRead: Number(m[2]) } : null
}
async function banner(page) {
  const b = page.locator('.safety-banner')
  if (!(await b.count())) return null
  const cls = (await b.getAttribute('class') || '').split(/\s+/).filter((c) => c && c !== 'safety-banner').join(' ')
  return { cls, text: (await b.textContent()).trim() }
}
async function refusedListed(page) {
  const items = page.locator('.redo-list li')
  const out = []
  for (let i = 0; i < await items.count(); i++) {
    out.push({ text: (await items.nth(i).locator('.redo-text').textContent()).trim(), why: (await items.nth(i).locator('.redo-why').textContent()).trim() })
  }
  return out
}
async function currentLine(page) {
  const el = page.locator('.line-target')
  return (await el.count()) ? (await el.first().textContent()).trim() : null
}
const bodyText = (page) => page.locator('body').textContent()
const tickShown = async (page) => /✓ all \d+ recorded/.test(await bodyText(page))
const inFlight = async (page) => { const t = await bodyText(page); return t.includes('still to upload') || t.includes('still going up') }

// THE INVARIANT at every settled point: the two numbers add up to the run,
// neither is negative, and no done-tick while a refusal or an upload is pending.
async function assertInvariant(page, { pendingOrRefused }, where) {
  const c = await counts(page)
  expect(c, `${where}: the strip is on the page`).not.toBeNull()
  expect(c.recorded, where).toBeGreaterThanOrEqual(0)
  expect(c.stillToRead, where).toBeGreaterThanOrEqual(0)
  expect(c.recorded + c.stillToRead, `${where}: recorded + still-to-read == ${N}`).toBe(N)
  if (pendingOrRefused) expect(await tickShown(page), `${where}: no done-tick while a refusal or pending upload exists`).toBe(false)
  note(`${where}: ${c.recorded} recorded · ${c.stillToRead} still to read — invariant holds`)
}

// ── Listening to the booth's own meter to know where the fake mic is ────────
// The meter tag reads "Mic live · -12 dB · room -60 dB" (or "−∞ dB"). The
// first number is the input peak this frame; that is how the spec knows which
// segment of make-mic-wav.js the microphone is in.
async function peakDb(page) {
  const tag = page.locator('.meter-tag')
  if (!(await tag.count())) return null
  const t = await tag.first().textContent()
  if (!/Mic live/.test(t)) return null
  const m = /Mic live · (−∞|-?\d+) dB/.exec(t)
  if (!m) return null
  return m[1] === '−∞' ? -Infinity : Number(m[1])
}
// Above LOUD is the loud reading; between HEARD and LOUD is the quiet one;
// under HEARD is the fixture's room noise (≈ -70 dBFS peaks).
const LOUD = -30, HEARD = -62
async function waitForPeak(page, pred, what, ms = 25_000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    const p = await peakDb(page)
    if (p !== null && pred(p)) return p
    await page.waitForTimeout(40)
  }
  throw new Error(`gave up waiting for the mic: ${what}`)
}
/** Silence that has lasted longer than the 250 ms word gaps in the fixture. */
async function waitForSustainedSilence(page, what, ms = 25_000) {
  const t0 = Date.now()
  let since = null
  while (Date.now() - t0 < ms) {
    const p = await peakDb(page)
    if (p !== null && p < HEARD) { if (since === null) since = Date.now(); if (Date.now() - since >= 600) return }
    else since = null
    await page.waitForTimeout(40)
  }
  throw new Error(`gave up waiting for sustained silence: ${what}`)
}

// ── Driving the booth as he does ────────────────────────────────────────────
async function openBooth(page) {
  await page.goto(`${BASE}/r/${VOICE_ID}`)
  await expect(page.locator('.rc-hello')).toContainText(VOICE_NAME.split(' (')[0])
  await expect.poll(() => counts(page), { message: 'the ready card' }).not.toBeNull()
}
async function begin(page) {
  // Auto-advance off: the spec taps, so it knows on which silence a line ends.
  const auto = page.locator('.toggle-row input[type=checkbox]').first()
  if (await auto.isChecked()) await auto.uncheck()
  await page.locator('.btn-begin').click()
  await expect(page.locator('.ctl-next')).toBeVisible()
  await expect(page.locator('.line-target')).toBeVisible()
}
/** Read the line on the stage LOUD, then tap Next on the silence after it. */
async function readLoudAndNext(page, what) {
  await waitForPeak(page, (p) => p > LOUD, `${what}: loud reading heard`)
  await waitForSustainedSilence(page, `${what}: the silence after the loud reading`)
  await page.locator('.ctl-next').click()
}
/** Read the line on the stage QUIETLY — heard by the meter, nothing left after the server's trim — then tap Next. */
async function readQuietAndNext(page, what) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const p = await waitForPeak(page, (x) => x > HEARD, `${what}: anything heard`)
    if (p > LOUD) {
      // The loop came round to the loud segment: throw this take away and wait
      // for the quiet one, exactly as an artist taps Again after a false start.
      note(`${what}: loud segment on the quiet line (${p} dB) — Again`)
      await waitForSustainedSilence(page, `${what}: silence after the loud segment`)
      await page.locator('.ctl-again').click()
      continue
    }
    note(`${what}: quiet reading heard at ${p} dB`)
    await waitForSustainedSilence(page, `${what}: the silence after the quiet reading`)
    await page.locator('.ctl-next').click()
    return
  }
  throw new Error(`${what}: never found the quiet segment`)
}
/** Read the line on the stage LOUD and Stop here, filing it. */
async function readLoudAndStop(page, what) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const p = await waitForPeak(page, (x) => x > HEARD, `${what}: anything heard`)
    if (p <= LOUD) {
      note(`${what}: quiet segment on a line that must be loud (${p} dB) — Again`)
      await waitForSustainedSilence(page, `${what}: silence after the quiet segment`)
      await page.locator('.ctl-again').click()
      continue
    }
    // A second of the loud reading on the take, then stop.
    await page.waitForTimeout(1000)
    await page.locator('.btn-finish').click()
    await expect(page.locator('.ctl-next')).toHaveCount(0)
    return
  }
  throw new Error(`${what}: never found the loud segment`)
}
/** Every take the shelf held has been answered by the server. */
async function serverSettled(page, what) {
  await expect.poll(() => inFlight(page), { message: `${what}: nothing still going up`, timeout: 60_000 }).toBe(false)
}
/** The shelf, straight out of IndexedDB. */
async function shelf(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open('ssi-recordist-takes')
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('takes')) { db.close(); return resolve([]) }
      const all = db.transaction('takes').objectStore('takes').getAll()
      all.onsuccess = () => { db.close(); resolve(all.result.map((r) => ({ id: r.id, lineId: r.lineId, status: r.status, lastError: r.lastError }))) }
      all.onerror = () => reject(all.error)
    }
  }))
}

test.beforeAll(async () => {
  const res = await fetch(`${API}/api/recording/voice/${VOICE_ID}`).catch((e) => ({ ok: false, status: String(e.message) }))
  if (!res.ok) throw new Error(`staging API at ${API} is not answering for ${VOICE_ID} (${res.status}) — run fixture.cjs reset and check cs-long-staging-api`)
  const q = await res.json()
  if (q.total !== N || q.recorded !== 0) throw new Error(`the test voice's queue is not fresh: total=${q.total} recorded=${q.recorded} — run fixture.cjs reset`)
  rmSync(PROFILE, { recursive: true, force: true })
})
test.afterAll(() => {
  writeFileSync(path.join(SHOTS, 'run.log'), log.join('\n') + '\n')
  console.log(`  screenshots + run.log in ${SHOTS}`)
})

test("the artist's day: read, refused, re-read, reload, reopen — in a real browser against staging", async () => {
  let ctx = await openBrowser()
  let page = ctx.pages()[0] || await ctx.newPage()

  // 1. A fresh booth: N still to read, 0 recorded, no banner.
  await openBooth(page)
  expect(await counts(page)).toEqual({ recorded: 0, stillToRead: N })
  expect(await banner(page)).toBeNull()
  await assertInvariant(page, { pendingOrRefused: false }, 'step 1 · fresh booth')
  await shot(page, 'fresh-booth')

  // 2. Line 1, read loud — the server confirms it.
  await begin(page)
  expect(await currentLine(page)).toBe(LINES[0])
  await shot(page, 'line-1-on-stage')
  await readLoudAndNext(page, 'line 1')
  expect(await currentLine(page)).toBe(LINES[1])

  // 3. Line 2, read too quietly for the server's trim to keep any of it — the
  //    booth's meter heard it, so it goes up, and the server REFUSES it.
  await readQuietAndNext(page, 'line 2')
  expect(await currentLine(page)).toBe(LINES[2])
  // Line 3, read loud, and stop.
  await readLoudAndStop(page, 'line 3')
  await serverSettled(page, 'after the first run')
  await expect.poll(() => banner(page).then((b) => b && b.cls), { message: 'the refused banner', timeout: 30_000 }).toBe('refused')
  const b3 = await banner(page)
  expect(b3.text).toContain('1 take the server would not accept')
  const listed = await refusedListed(page)
  expect(listed).toHaveLength(1)
  expect(listed[0].text).toBe(LINES[1])
  expect(listed[0].why, "the server's own reason is on the card").toMatch(SERVER_REFUSAL)
  note(`server refused line 2: "${listed[0].why}"`)
  expect(await bodyText(page)).toContain('1 did not save')
  expect(await counts(page)).toEqual({ recorded: 2, stillToRead: N - 2 })
  await assertInvariant(page, { pendingOrRefused: true }, 'step 3 · one refused')
  const shelf3 = await shelf(page)
  expect(shelf3.filter((r) => r.status === 'refused' || r.status === 'failed')).toHaveLength(1)
  await shot(page, 'line-2-refused')
  // The wire agrees: the server holds lines 1 and 3, not 2.
  const q3 = await (await fetch(`${API}/api/recording/voice/${VOICE_ID}?includeRecorded=1`)).json()
  expect(q3.lines.filter((l) => l.recorded).map((l) => l.text)).toEqual([LINES[0], LINES[2]])

  // 4. "Record it again" on line 2, loud this time — confirmed. Banner gone,
  //    nothing listed as refused, line 2 recorded.
  await page.locator('.redo-btn').click()
  await expect(page.locator('.ctl-next')).toBeVisible()
  await expect(page.locator('.line-target')).toHaveText(LINES[1])
  await readLoudAndStop(page, 'line 2 again')
  await serverSettled(page, 'after the re-read')
  await expect.poll(() => counts(page), { message: 'line 2 counted as recorded', timeout: 30_000 }).toEqual({ recorded: 3, stillToRead: N - 3 })
  expect(await banner(page)).toBeNull()
  expect(await refusedListed(page)).toEqual([])
  expect(await bodyText(page)).not.toContain('did not save')
  await assertInvariant(page, { pendingOrRefused: false }, 'step 4 · re-read confirmed')
  await shot(page, 'line-2-re-read-confirmed')

  // 5a. RELOAD — same profile, same IndexedDB. Everything in 4 still holds.
  await page.reload()
  await expect.poll(() => counts(page), { message: 'the ready card after reload' }).toEqual({ recorded: 3, stillToRead: N - 3 })
  await page.waitForTimeout(1500)
  expect(await counts(page)).toEqual({ recorded: 3, stillToRead: N - 3 })
  expect(await banner(page), 'no stale refusal banner after reload').toBeNull()
  expect(await bodyText(page)).not.toContain('would not accept')
  expect(await bodyText(page)).not.toContain('did not save')
  await assertInvariant(page, { pendingOrRefused: false }, 'step 5a · after reload')
  expect((await shelf(page)).filter((r) => r.status !== 'stored'), 'nothing pending or refused left on the shelf').toEqual([])
  await shot(page, 'after-reload')
  // …and the run would start on line 4, not on 1, 2 or 3.
  await begin(page)
  expect(await currentLine(page)).toBe(LINES[3])
  await shot(page, 'after-reload-starts-on-line-4')

  // 5b. Close the browser and reopen the SAME profile.
  await ctx.close()
  ctx = await openBrowser()
  page = ctx.pages()[0] || await ctx.newPage()
  await openBooth(page)
  await page.waitForTimeout(1500)
  expect(await counts(page)).toEqual({ recorded: 3, stillToRead: N - 3 })
  expect(await banner(page), 'no stale refusal banner after reopening the browser').toBeNull()
  expect(await bodyText(page)).not.toContain('would not accept')
  expect(await bodyText(page)).not.toContain('did not save')
  await assertInvariant(page, { pendingOrRefused: false }, 'step 5b · browser reopened')
  await shot(page, 'browser-reopened')
  await ctx.close()

  // 8. The database: exactly lines 1, 2 and 3 carry a take by the test voice,
  //    each with a clip, a pod link and a provenance row naming the test voice.
  const v = await fixture.verify(require('@supabase/supabase-js').createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY), [1, 2, 3])
  note(`db: ${v.rows} course_audio rows, ${v.provenance} provenance rows for ${VOICE_ID}${v.ok ? '' : ' — ' + v.problems.join('; ')}`)
  expect(v.problems).toEqual([])
  rmSync(PROFILE, { recursive: true, force: true })
})
