// THE BOOTH ON A PHONE (Aran, 2026-10-15, job #834): "make sure all the interface changes we've
// made to recording in Popty work well and look good on a mobile phone". Drives every booth screen
// on popty.app in Chromium AND WebKit (Safari's engine) at four phone sizes, light mode, and
// measures what a screenshot cannot: horizontal scroll, things poking off the side, tap targets
// under 44px, controls covered by something else, the transport off the bottom of the screen.
//
//   node e2e/booth-mobile/audit.mjs --out <dir>                 # against popty.app as served
//   node e2e/booth-mobile/audit.mjs --out <dir> --dist dist     # popty.app's API, THIS build's SPA
//
// NOTHING WRITES. Every non-GET request is aborted, except the take upload in the "refused"
// scenario, which is answered IN THE BROWSER with a 422 so a refused take can be drawn — it never
// leaves the machine. The voice is Tom's test voice human_tom_zzz; the "stress" scenario rewrites
// its GET answers in flight (long Welsh lines, three language tabs, a re-record list, a finished
// section) and the team strip is drawn on a booth whose every answer is a fixture.
//
// WebKit on watson-1 needs the libraries staged under ~/.pwlibs (see e2e/booth-mobile/README in
// the job report); Chromium needs nothing.
import { chromium, webkit } from 'playwright'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, extname, resolve } from 'node:path'

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d }
const OUT = resolve(arg('out', `${process.env.CS_SCRATCH || '/tmp'}/booth-mobile`))
const DIST = arg('dist', null) && resolve(arg('dist'))
const ENGINES = arg('engines', 'chromium,webkit').split(',')
const ONLY = arg('only', '') // comma list of scenario names
// 375x548 is an iPhone SE's VISIBLE height in Safari with both bars showing: the honest small case.
const SIZES = (arg('sizes', '375x667,390x844,360x800,844x390,375x548')).split(',').map((s) => s.split('x').map(Number))
const BASE = 'https://popty.app'
const VOICE = 'human_tom_zzz'
const TEAM_VOICE = 'human_aran_cym_n' // the strip only exists on a God admin's booth; every answer here is a fixture
mkdirSync(OUT, { recursive: true })

const LONG_CY = [
  "Dw i wedi bod yn meddwl am fynd i'r Eisteddfod Genedlaethol eleni efo fy ffrindiau o Gaernarfon, ond dydw i ddim yn siŵr eto pryd fyddwn ni'n gadael.",
  'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch',
  "Faswn i'n licio gwybod os ydy'r siop yn agor yn gynnar bore fory, achos mae angen bara a llefrith arna i cyn mynd i'r gwaith.",
]
const MIME = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.wasm': 'application/wasm' }

// ── what is measured on every screen ───────────────────────────────────────────────────────────
function measure() {
  const vw = innerWidth, vh = innerHeight
  const vis = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0 && +s.opacity > 0.05 }
  const name = (el) => (el.dataset.test ? `[${el.dataset.test}]` : '') + el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ` "${(el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30)}"`
  // inside a scroller that is meant to scroll sideways (none in the booth) or clipped by an ancestor? count as off-screen only when the page itself is wider
  const offside = []
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue
    const r = el.getBoundingClientRect()
    if (r.right > vw + 1 || r.left < -1) {
      // ignore descendants of an element already listed, and things clipped by an overflow:hidden ancestor
      let p = el.parentElement, clipped = false
      while (p && p !== document.body) { const s = getComputedStyle(p); if (s.overflowX !== 'visible') { const pr = p.getBoundingClientRect(); if (pr.right <= vw + 1 && pr.left >= -1) { clipped = true; break } } p = p.parentElement }
      if (!clipped && !offside.some((o) => o.el.contains(el))) offside.push({ el, r })
    }
  }
  const taps = []
  for (const el of document.querySelectorAll('button, a[href], [role="tab"], summary, input[type="checkbox"], input[type="range"], select, label')) {
    if (!vis(el) || el.closest('[aria-hidden="true"]')) continue
    if (el.tagName === 'LABEL' && !el.querySelector('input')) continue
    if (el.tagName === 'INPUT' && el.closest('label')) continue // the label is the target
    const r = el.getBoundingClientRect()
    if (r.bottom < 0 || r.top > document.documentElement.scrollHeight) continue
    if (r.height < 43.5 || r.width < 43.5) taps.push(`${name(el)} ${Math.round(r.width)}x${Math.round(r.height)}`)
  }
  const covered = []
  for (const el of document.querySelectorAll('button, a[href], [role="tab"]')) {
    if (!vis(el)) continue
    const r = el.getBoundingClientRect()
    const x = r.left + r.width / 2, y = r.top + r.height / 2
    if (x < 0 || y < 0 || x > vw || y > vh) continue
    // scrolled out of its own scrolling box is not "covered"
    let sc = el.parentElement, outOfScroller = false
    while (sc && sc !== document.body) { const s = getComputedStyle(sc); if (/(auto|scroll)/.test(s.overflowY)) { const sr = sc.getBoundingClientRect(); if (y < sr.top || y > sr.bottom) outOfScroller = true; break } sc = sc.parentElement }
    if (outOfScroller) continue
    const top = document.elementFromPoint(x, y)
    if (top && top !== el && !el.contains(top) && !top.contains(el)) covered.push(`${name(el)} under ${name(top)}`)
  }
  // a clipped line of text: overflow hidden/ellipsis with more content than room
  const clipped = []
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || !el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue
    const s = getComputedStyle(el)
    if ((s.overflowX === 'hidden' || s.textOverflow === 'ellipsis' || s.overflowX === 'clip') && el.scrollWidth > el.clientWidth + 1) clipped.push(`${name(el)} ${el.scrollWidth}>${el.clientWidth}`)
  }
  const fixedOff = []
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el)
    if ((s.position === 'fixed' || s.position === 'sticky') && vis(el)) { const r = el.getBoundingClientRect(); if (r.bottom > vh + 1 && s.position === 'fixed') fixedOff.push(`${name(el)} bottom ${Math.round(r.bottom)}>${vh}`) }
  }
  return {
    vw, vh,
    hScroll: document.documentElement.scrollWidth > vw + 1 ? document.documentElement.scrollWidth : 0,
    pageH: document.documentElement.scrollHeight,
    offside: offside.slice(0, 12).map((o) => `${name(o.el)} ${Math.round(o.r.left)}..${Math.round(o.r.right)}`),
    smallTaps: [...new Set(taps)].slice(0, 30),
    covered: covered.slice(0, 12),
    clipped: clipped.slice(0, 12),
    fixedOff,
  }
}

// where the transport and line sit (recording screens)
function transport() {
  const q = (s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height), hit: !!t && (t === el || el.contains(t)) } }
  const line = document.querySelector('.line-target, .ready-line')
  const lr = line && line.getBoundingClientRect()
  return {
    stop: q('[data-test="stop"]'), pause: q('[data-test="pause"]'), back: q('.ctl-back'), again: q('.ctl-again'), next: q('.ctl-next'),
    start: q('.btn-begin'), jump: q('[data-test="jump-unrecorded"]'), wave: q('.wave, [data-test="wave"], canvas'),
    line: lr && (() => {
      // How much of the line being read is actually on screen: inside the viewport AND inside the
      // box that scrolls it. A line drawn but scrolled or clipped out of sight is not readable.
      const box = line.closest('.centre-line') || document.documentElement
      const br = box.getBoundingClientRect()
      const top = Math.max(lr.top, br.top, 0), bottom = Math.min(lr.bottom, br.bottom, innerHeight)
      return { top: Math.round(lr.top), bottom: Math.round(lr.bottom), fs: getComputedStyle(line).fontSize,
        visiblePx: Math.max(0, Math.round(bottom - top)), wider: line.scrollWidth > line.clientWidth + 1 }
    })(),
  }
}

async function fakeMic(page) {
  await page.addInitScript(() => {
    // A voice-like fake microphone for BOTH engines: a 180Hz buzz whose loudness rises and falls
    // like speech, so the level meter and waveform have something to draw.
    if (!navigator.mediaDevices) return
    const gum = async () => {
      const ac = new (window.AudioContext || window.webkitAudioContext)()
      try { await ac.resume() } catch {}
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 180
      const g = ac.createGain(); g.gain.value = 0
      const lfo = ac.createOscillator(); lfo.frequency.value = 2.5
      const lg = ac.createGain(); lg.gain.value = 0.25
      lfo.connect(lg).connect(g.gain)
      const d = ac.createMediaStreamDestination()
      o.connect(g).connect(d); o.start(); lfo.start()
      // A generated track has no echo-cancel/AGC to switch: WebKit rejects the booth's
      // applyConstraints on it ("Invalid constraint"), a real mic accepts it. Accept it here.
      for (const t of d.stream.getAudioTracks()) t.applyConstraints = async () => {}
      return d.stream
    }
    navigator.mediaDevices.getUserMedia = gum
    // Playwright's Linux WebKit is built without MediaRecorder (Safari has it). A stand-in that
    // hands back small blobs lets the booth's screens be laid out and measured in Safari's
    // engine; it says nothing about real iPhone capture, which this audit cannot test.
    if (typeof window.MediaRecorder === 'undefined') {
      class StubRecorder extends EventTarget {
        constructor(stream, opts = {}) { super(); this.stream = stream; this.mimeType = 'audio/mp4'; this.state = 'inactive'; this.audioBitsPerSecond = opts.audioBitsPerSecond || 128000 }
        static isTypeSupported(t) { return /mp4/.test(String(t)) }
        _emit(type, extra = {}) { const ev = new Event(type); Object.assign(ev, extra); this.dispatchEvent(ev); const h = this['on' + type]; if (typeof h === 'function') h.call(this, ev) }
        _chunk() { this._emit('dataavailable', { data: new Blob([new Uint8Array(4000)], { type: this.mimeType }) }) }
        start(slice) { this.state = 'recording'; this._emit('start'); if (slice) this._t = setInterval(() => this._chunk(), slice) }
        requestData() { this._chunk() }
        pause() { this.state = 'paused'; this._emit('pause') }
        resume() { this.state = 'recording'; this._emit('resume') }
        stop() { if (this.state === 'inactive') return; clearInterval(this._t); this.state = 'inactive'; this._chunk(); setTimeout(() => this._emit('stop'), 0) }
      }
      window.MediaRecorder = StubRecorder
    }
    const enumerate = navigator.mediaDevices.enumerateDevices?.bind(navigator.mediaDevices)
    navigator.mediaDevices.enumerateDevices = async () => [{ kind: 'audioinput', deviceId: 'fake', label: 'Fake mic', groupId: 'g' }, ...((await enumerate?.().catch(() => [])) || []).filter((d) => d.kind !== 'audioinput')]
  })
}

async function newPage(browser, engine, [w, h], opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true,
    ...(engine === 'chromium' ? { isMobile: true } : {}),
    colorScheme: 'light',
  })
  await ctx.addInitScript((seed) => {
    try {
      localStorage.setItem('popty-theme', 'light') // main.js reads this and sets data-theme itself
      for (const [k, v] of Object.entries(seed || {})) localStorage.setItem(k, v)
    } catch {}
  }, opts.storage || {})
  const page = await ctx.newPage()
  await fakeMic(page)
  const blocked = []
  await page.route('**/*', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const m = req.method()
    if (opts.answer) { const a = await opts.answer(req, url, route); if (a) return }
    if (m !== 'GET' && m !== 'HEAD') { blocked.push(`${m} ${url.pathname}`); return route.abort() }
    if (DIST && url.origin === BASE && !url.pathname.startsWith('/api/')) {
      let p = join(DIST, decodeURIComponent(url.pathname))
      if (!existsSync(p) || url.pathname === '/' || !extname(p)) p = join(DIST, 'index.html')
      return route.fulfill({ status: 200, body: readFileSync(p), headers: { 'content-type': MIME[extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' } })
    }
    return route.continue()
  })
  return { ctx, page, blocked }
}

const shots = []
const results = []
async function snap(page, engine, size, scenario, extra = {}) {
  await page.waitForTimeout(450)
  const tag = `${engine}-${size[0]}x${size[1]}-${scenario}`
  const file = `${tag}.png`
  await page.screenshot({ path: join(OUT, file), animations: 'disabled', timeout: 20000 }).catch((e) => console.log('  shot failed', file, e.message.split('\n')[0]))
  const m = await page.evaluate(measure)
  const t = await page.evaluate(transport).catch(() => null)
  const r = { engine, size: `${size[0]}x${size[1]}`, scenario, file, ...m, transport: t, ...extra }
  results.push(r)
  const bad = (m.hScroll ? 1 : 0) + m.offside.length + m.smallTaps.length + m.covered.length + m.clipped.length + m.fixedOff.length
  console.log(`${tag}: hScroll=${m.hScroll} off=${m.offside.length} small=${m.smallTaps.length} covered=${m.covered.length} clipped=${m.clipped.length} fixedOff=${m.fixedOff.length}${bad ? '' : ' OK'}`)
  return r
}

const stressQueue = (json) => {
  // Long Welsh lines through the whole flow, the first line refused-able; nothing about which lines exist changes.
  json.lines.forEach((l, i) => { if (!l.recorded) l.text = LONG_CY[i % LONG_CY.length] })
  return json
}
const stressSummary = (json) => {
  json.displayName = 'Tom'
  // A finished section and a section still uploading, as the home draws them.
  json.tracks.push({ key: 'seed.zzz_test2_for_eng', kind: 'seed', courseCode: 'zzz_test2_for_eng', podSlug: null, podTitle: null, newCourse: true, seedExisting: null, total: 340, recorded: 260, uploading: 12,
    batches: [1, 2, 3, 4].map((n) => ({ n, from: (n - 1) * 100 + 1, to: Math.min(n * 100, 340), total: n === 4 ? 40 : 100, recorded: n < 3 ? 100 : n === 3 ? 60 : 0, uploading: n === 3 ? 12 : 0 })) })
  json.tracks.push({ key: 'lego.zzz_test2_for_eng', kind: 'lego', courseCode: 'zzz_test2_for_eng', total: 50, recorded: 50, batches: [{ n: 1, from: 1, to: 50, total: 50, recorded: 50 }] })
  return json
}
const stressTabs = () => ({ tabs: [
  { voiceId: VOICE, displayName: 'Tom', language: 'zzz', languageName: 'Test Language', dialect: 'standard', boothKey: null },
  { voiceId: 'human_tom_zzz_b', displayName: 'Tom', language: 'cym', languageName: 'Welsh', dialect: 'north', boothKey: null },
  { voiceId: 'human_tom_zzz_c', displayName: 'Tom', language: 'eng', languageName: 'English', dialect: 'standard', boothKey: null },
] })
const stressRerecord = (q) => ({ voiceId: VOICE, fresh: true, total: 3, recordedAlso: [], goneAlso: [], items: q.lines.slice(0, 3).map((l, i) => ({
  lineId: l.id, text: i === 1 ? LONG_CY[1] : LONG_CY[0], reason: i === 0 ? 'skipped' : 'text-changed', oldText: i === 0 ? null : 'Bore da.', track: 'pod.pod-1', batch: 1 })) })

async function scenarioReal(browser, engine, size) {
  const { ctx, page, blocked } = await newPage(browser, engine, size)
  try {
    await page.goto(`${BASE}/r/${VOICE}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-test="up-next"]', { timeout: 60000 })
    await snap(page, engine, size, '01-home')
    await page.click('.bh-plan-toggle')
    await page.waitForTimeout(200)
    const fold = page.locator('.bt-fold').first()
    if (await fold.count()) await fold.click()
    await snap(page, engine, size, '02-home-ticks')
    await page.goto(`${BASE}/r/${VOICE}?track=pod.pod-1&batch=1`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-test="ready"]', { timeout: 60000 })
    await snap(page, engine, size, '04-batch-ready')
    await page.click('[data-test="open-sheet"]')
    await page.waitForSelector('[data-test="sheet"]', { state: 'visible' })
    await snap(page, engine, size, '05-sheet')
    // the sheet closes from its ✕ …
    await page.click('[data-test="close-sheet"]')
    const closedByX = await page.locator('[data-test="sheet"]').isHidden()
    // … and from a tap on the dimmed page above it
    await page.click('[data-test="open-sheet"]')
    await page.waitForSelector('[data-test="sheet"]', { state: 'visible' })
    const scrim = await page.locator('[data-test="sheet-scrim"]').boundingBox()
    // tap the dimmed page BELOW the sheet (the scrim's top edge is under the sheet itself)
    const sheetBox = await page.locator('[data-test="sheet"]').boundingBox()
    if (scrim && sheetBox) await page.mouse.click(scrim.x + scrim.width / 2, Math.min(scrim.y + scrim.height - 8, sheetBox.y + sheetBox.height + (scrim.y + scrim.height - sheetBox.y - sheetBox.height) / 2))
    await page.waitForTimeout(300)
    const closedByScrim = await page.locator('[data-test="sheet"]').isHidden()
    results.at(-1).sheetClose = { closedByX, closedByScrim, scrimTop: scrim && Math.round(scrim.y) }
    if (!closedByScrim) await page.click('[data-test="close-sheet"]').catch(() => {})
    await page.getByRole('button', { name: 'Start recording' }).click()
    await page.waitForSelector('[data-test="stop"]', { timeout: 20000 })
    await page.waitForTimeout(1600)
    await snap(page, engine, size, '06-live')
    await page.click('[data-test="pause"]').catch(() => {})
    await page.waitForTimeout(500)
    await snap(page, engine, size, '07-paused')
    const editable = page.locator('.line-target.tappable')
    if (await editable.count()) {
      await editable.first().click()
      await page.waitForTimeout(400)
      await snap(page, engine, size, '08-line-editor')
    }
  } catch (e) { console.log(`  ${engine} ${size} real: ${e.message.split('\n')[0]}`); await page.screenshot({ path: join(OUT, `${engine}-${size.join('x')}-ERR-real.png`) }).catch(() => {}) }
  results.push({ engine, size: size.join('x'), scenario: 'real-blocked', blocked })
  await ctx.close()
}

async function scenarioStress(browser, engine, size) {
  let lastQueue = null
  let refusedOnce = false
  const answer = async (req, url, route) => {
    if (url.origin !== BASE) return false
    const p = url.pathname
    // the first take is refused (answered here, never sent); the rest stay "still to upload"
    if (req.method() === 'POST' && p.endsWith('/take') && !refusedOnce) { refusedOnce = true; await route.fulfill({ status: 422, json: { error: 'That take was silent — nothing was heard. Please read it again.' } }); return true }
    if (req.method() !== 'GET') return false
    if (p === `/api/recording/voice/${VOICE}/tabs`) { await route.fulfill({ json: stressTabs() }); return true }
    if (p === `/api/recording/voice/${VOICE}/summary`) { const r = await route.fetch(); await route.fulfill({ response: r, json: stressSummary(await r.json()) }); return true }
    if (p === `/api/recording/voice/${VOICE}`) { const r = await route.fetch(); lastQueue = stressQueue(await r.json()); await route.fulfill({ response: r, json: lastQueue }); return true }
    if (p === `/api/recording/voice/${VOICE}/rerecord`) {
      if (!lastQueue) { const r = await route.fetch({ url: `${BASE}/api/recording/voice/${VOICE}?includeRecorded=1` }); lastQueue = stressQueue(await r.json()) }
      await route.fulfill({ json: stressRerecord(lastQueue) }); return true
    }
    return false
  }
  const { ctx, page } = await newPage(browser, engine, size, { answer })
  try {
    await page.goto(`${BASE}/r/${VOICE}?track=pod.pod-1&batch=1`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-test="ready"]', { timeout: 60000 })
    await snap(page, engine, size, '10-stress-ready-long-welsh')
    await page.getByRole('button', { name: 'Start recording' }).click()
    await page.waitForSelector('[data-test="stop"]', { timeout: 20000 })
    await page.waitForTimeout(1500)
    await snap(page, engine, size, '11-stress-live-long-welsh')
    await page.click('.ctl-next')
    await page.waitForTimeout(1500)
    await page.click('.ctl-next')
    await page.waitForTimeout(2500)
    await snap(page, engine, size, '12-stress-live-after-refusal')
    await page.click('[data-test="stop"]')
    await page.waitForTimeout(1200)
    await snap(page, engine, size, '13-stress-after-stop')
    if (await page.locator('[data-test="open-sheet"]').count()) {
      await page.click('[data-test="open-sheet"]')
      await page.waitForSelector('[data-test="sheet"]', { state: 'visible' })
      await snap(page, engine, size, '14-stress-sheet-long-welsh')
      await page.click('[data-test="close-sheet"]')
    }
    // Jump to the last line and finish the batch → the done screen.
    await page.goto(`${BASE}/r/${VOICE}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-test="up-next"]', { timeout: 60000 })
    await page.waitForTimeout(1500)
    const tg = page.locator('[data-test="rerecord-toggle"]')
    if (await tg.count()) await tg.click()
    await snap(page, engine, size, '15-stress-home-tabs-rerecord-finished')
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await snap(page, engine, size, '16-stress-home-bottom')
    // a section of several batches opens to its batch list
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.click('[data-test="card-seed.zzz_test2_for_eng"], [data-test="up-next-all"]')
    await page.waitForSelector('.bh-track', { timeout: 20000 })
    await snap(page, engine, size, '17-stress-track-batches')
  } catch (e) { console.log(`  ${engine} ${size} stress: ${e.message.split('\n')[0]}`); await page.screenshot({ path: join(OUT, `${engine}-${size.join('x')}-ERR-stress.png`) }).catch(() => {}) }
  await ctx.close()
}

async function scenarioDone(browser, engine, size) {
  // One line owed: read it, Next, and the batch is done.
  const answer = async (req, url, route) => {
    if (url.origin !== BASE || req.method() !== 'GET') return false
    if (url.pathname === `/api/recording/voice/${VOICE}`) {
      const r = await route.fetch(); const j = await r.json()
      let kept = false
      j.lines.forEach((l) => { if (!l.recorded) { if (kept) l.recorded = true; else { kept = true; l.text = LONG_CY[0] } } })
      j.recorded = j.total - 1; j.remaining = 1
      await route.fulfill({ response: r, json: j }); return true
    }
    return false
  }
  const { ctx, page } = await newPage(browser, engine, size, { answer })
  try {
    await page.goto(`${BASE}/r/${VOICE}?track=pod.pod-1&batch=1`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-test="ready"]', { timeout: 60000 })
    await page.getByRole('button', { name: 'Start recording' }).click()
    await page.waitForSelector('[data-test="stop"]', { timeout: 20000 })
    await page.waitForTimeout(1500)
    await page.click('.ctl-next')
    await page.waitForSelector('[data-test="done"]', { timeout: 20000 })
    await page.waitForTimeout(800)
    await snap(page, engine, size, '20-done')
    await page.goto(`${BASE}/r/${VOICE}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-test="up-next"]', { timeout: 60000 })
    await page.waitForTimeout(800)
    await snap(page, engine, size, '21-home-uploading-banner')
  } catch (e) { console.log(`  ${engine} ${size} done: ${e.message.split('\n')[0]}`); await page.screenshot({ path: join(OUT, `${engine}-${size.join('x')}-ERR-done.png`) }).catch(() => {}) }
  await ctx.close()
}

async function scenarioTeam(browser, engine, size, role = 'admin') {
  // admin: Aran's own booth (team strip, full top bar). recorder: an artist such as Dan, whose top bar is cut to his role.
  const who = role === 'admin' ? { name: 'Aran', voice: TEAM_VOICE, role: 'admin' } : { name: 'Dan', voice: 'human_dan_cym_s', role: 'recorder' }
  // The team strip and the navbar's Recording link need a God admin's signed-in session. Nothing
  // real is used: a made-up session sits in this browser's storage and every answer is a fixture.
  const env = readFileSync(new URL('../../.env', import.meta.url), 'utf8')
  const authUrl = (env.match(/^VITE_SUPABASE_URL=(.*)$/m) || [])[1]?.trim()
  const authHost = authUrl ? new URL(authUrl).hostname : 'x'
  const ref = authHost.split('.')[0]
  const exp = Math.floor(Date.now() / 1000) + 7200
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: '00000000-0000-0000-0000-000000000000', email: 'audit@example.invalid', exp, role: 'authenticated' })}.sig`
  const session = { access_token: jwt, refresh_token: 'fake', token_type: 'bearer', expires_in: 7200, expires_at: exp, user: { id: '00000000-0000-0000-0000-000000000000', email: 'audit@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} } }
  const summary = JSON.parse(readFileSync(join(OUT, '..', 'fixtures-summary.json'), 'utf8'))
  const queue = JSON.parse(readFileSync(join(OUT, '..', 'fixtures-queue.json'), 'utf8'))
  const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString()
  const artist = (voiceId, name, languageName, dialect, h, projects) => ({ voiceId, name, languageName, dialect, savedOnServer: true, activity: { lastActive: ago(h), takesToday: h < 10 ? 14 : 0, takes7d: 212 }, projects })
  const rows = (k) => [
    { key: 'pod.pod-1', label: 'POD-1', total: 240, recorded: 180, activity: { takes7d: 40, lastActive: ago(3), takesToday: 3 } },
    { key: 'seed.cym', label: 'New sentences (Hadau Creiddiol, the canonical Welsh list)', total: 1340, recorded: k, activity: { takes7d: 120, lastActive: ago(50) } },
    { key: 'lego.cym', label: 'LEGOs', total: 900, recorded: 0, activity: {} },
    { key: 'other', label: 'Other recordings', other: true, activity: { takes: 1234, takes7d: 2, lastActive: ago(300) } },
  ]
  const artists = { artists: [
    artist(TEAM_VOICE, 'Aran', 'Welsh', 'north', 2, rows(800)),
    artist('human_dan_cym_s', 'Dan', 'Welsh', 'south', 4, rows(640)),
    artist('human_eleri_cym_s', 'Eleri', 'Welsh', 'south', 30, rows(410)),
    artist('human_catrin_cym_n', 'Catrin Gwenllian', 'Welsh', 'north', 80, rows(90)),
  ], mine: [TEAM_VOICE, 'human_aran_eng'] }
  const answer = async (req, url, route) => {
    const p = url.pathname
    // Nothing from this made-up session may reach the real sign-in/data host: every call to it,
    // whatever the method, is answered here in the browser.
    if (url.hostname === authHost) {
      if (p.endsWith('/user')) await route.fulfill({ json: session.user })
      else if (p.endsWith('/dashboard_users')) await route.fulfill({ json: [{ email: 'audit@example.invalid', name: who.name, role: who.role, courses: '*', voice_id: who.voice }] })
      else await route.fulfill({ json: [] })
      return true
    }
    if (req.method() !== 'GET') return false
    if (p.endsWith('/api/auth/me')) { await route.fulfill({ json: { email: 'audit@example.invalid', name: who.name, role: who.role, courses: '*', voice_id: who.voice } }); return true }
    if (p === '/api/recording/admin/artists') { await route.fulfill(role === 'admin' ? { json: artists } : { status: 403, json: {} }); return true }
    if (p === '/api/recording/mine') { await route.fulfill({ json: { voices: [{ voiceId: who.voice, languageName: 'Welsh', dialect: 'north', boothKey: null }], voiceId: who.voice } }); return true }
    const v = p.match(/^\/api\/recording\/voice\/([^/]+)(\/[a-z-]+)?$/)
    if (v) {
      const tail = v[2] || ''
      if (tail === '/summary') { await route.fulfill({ json: { ...summary, voiceId: v[1], displayName: who.name, languageName: 'Welsh', dialect: 'north' } }); return true }
      if (tail === '/tabs') { await route.fulfill({ json: { tabs: role !== 'admin' ? [{ voiceId: who.voice, displayName: who.name, language: 'cym', languageName: 'Welsh', dialect: 'south', boothKey: null }] : [{ voiceId: TEAM_VOICE, displayName: 'Aran', language: 'cym', languageName: 'Welsh', dialect: 'north', boothKey: null }, { voiceId: 'human_aran_eng', displayName: 'Aran', language: 'eng', languageName: 'English', dialect: 'standard', boothKey: null }] } }); return true }
      if (tail === '/rerecord') { await route.fulfill({ json: { voiceId: v[1], fresh: true, total: 0, items: [], recordedAlso: [], goneAlso: [] } }); return true }
      if (tail === '') { await route.fulfill({ json: { ...queue, voiceId: v[1] } }); return true }
      await route.fulfill({ status: 404, json: {} }); return true
    }
    return false
  }
  const { ctx, page } = await newPage(browser, engine, size, { answer, storage: { [`sb-${ref}-auth-token`]: JSON.stringify(session) } })
  try {
    await page.goto(`${BASE}/r/${who.voice}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-test="up-next"]', { timeout: 60000 })
    await page.waitForSelector('[data-test="booth-team"] .bt-card', { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(600)
    if (role === 'admin') {
      await snap(page, engine, size, '30-admin-home-navbar')
      await page.locator('[data-test="booth-team"]').scrollIntoViewIfNeeded().catch(() => {})
      await snap(page, engine, size, '31-team-strip')
    } else {
      await snap(page, engine, size, '33-artist-home-navbar')
      await page.goto(`${BASE}/my-recording`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-test="up-next"]', { timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(800)
      await snap(page, engine, size, '34-artist-my-recording', { landedOn: new URL(page.url()).pathname })
    }
  } catch (e) { console.log(`  ${engine} ${size} team: ${e.message.split('\n')[0]}`); await page.screenshot({ path: join(OUT, `${engine}-${size.join('x')}-ERR-team.png`) }).catch(() => {}) }
  await ctx.close()
}

// fixtures for the fully-mocked team booth: Tom's test voice's real answers, captured once
if (!existsSync(join(OUT, '..', 'fixtures-summary.json'))) {
  const s = await (await fetch(`${BASE}/api/recording/voice/${VOICE}/summary`)).json()
  writeFileSync(join(OUT, '..', 'fixtures-summary.json'), JSON.stringify(stressSummary(s)))
  const q = await (await fetch(`${BASE}/api/recording/voice/${VOICE}?includeRecorded=1&pod=pod-1&course=zzz_test2_for_eng&batch=1`)).json()
  writeFileSync(join(OUT, '..', 'fixtures-queue.json'), JSON.stringify(q))
}

const SCEN = { real: scenarioReal, stress: scenarioStress, done: scenarioDone, team: scenarioTeam, artist: (b, e, s) => scenarioTeam(b, e, s, 'recorder') }
for (const engine of ENGINES) {
  const browser = await (engine === 'webkit' ? webkit : chromium).launch(engine === 'chromium' ? { args: ['--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] } : {})
  for (const size of SIZES) {
    for (const [k, fn] of Object.entries(SCEN)) if (!ONLY || ONLY.split(',').includes(k)) await fn(browser, engine, size)
  }
  await browser.close()
}
writeFileSync(join(OUT, 'results.json'), JSON.stringify(results, null, 1))
console.log(`wrote ${results.length} results to ${OUT}/results.json`)

// THE RULES, as a verdict. Covered-by-the-sheet and ellipsised single-line labels are reported
// above but are not failures: the sheet is meant to cover the page, and those labels are meant to cut.
const fails = []
for (const r of results) {
  if (!r.file) continue
  const at = `${r.engine} ${r.size} ${r.scenario}`
  if (r.hScroll) fails.push(`${at}: page scrolls sideways (${r.hScroll}px wide)`)
  for (const o of r.offside) fails.push(`${at}: off the side: ${o}`)
  for (const t of r.smallTaps) fails.push(`${at}: tap target under 44px: ${t}`)
  for (const f of r.fixedOff) fails.push(`${at}: fixed bar below the screen: ${f}`)
  const T = r.transport || {}
  for (const k of ['stop', 'pause', 'back', 'again', 'next', 'start']) if (T[k] && (!T[k].hit || T[k].bottom > r.vh || T[k].top < 0)) fails.push(`${at}: ${k} not reachable (${JSON.stringify(T[k])})`)
  if (T.line && /live|ready/.test(r.scenario) && T.line.visiblePx < 30) fails.push(`${at}: the line being read is not on screen (${T.line.visiblePx}px visible)`)
  if (T.line && T.line.wider) fails.push(`${at}: the line being read is wider than its box`)
  if (r.sheetClose && !(r.sheetClose.closedByX && r.sheetClose.closedByScrim)) fails.push(`${at}: sheet did not close (${JSON.stringify(r.sheetClose)})`)
}
writeFileSync(join(OUT, 'verdict.txt'), fails.length ? fails.join('\n') + '\n' : 'PASS\n')
console.log(fails.length ? `FAIL — ${fails.length} problems (verdict.txt):\n  ${fails.slice(0, 40).join('\n  ')}` : 'PASS — every screen, every size, both engines')
process.exitCode = fails.length ? 1 : 0
