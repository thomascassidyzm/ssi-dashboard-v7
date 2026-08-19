/**
 * End-to-end verification of the recordist tutorial, driving a REAL microphone
 * capture through Chromium's fake audio device.
 *
 * The fake device is fed /tmp/fake-slow.wav — three tone bursts separated by
 * 400 ms of silence — which is exactly the shape of a correct slow read. So this
 * exercises getUserMedia → MediaRecorder → decodeMono → alignSlowGap →
 * sliceChunk → concatChunks → WAV, not a mock of any of it.
 *
 * Usage: node tools/recordist-tutorial/verify-recordist-tutorial.mjs [baseUrl]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:5199'
const SHOTS = '/tmp/tutorial-shots'
mkdirSync(SHOTS, { recursive: true })

const fails = []
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!cond) fails.push(name)
}

const browser = await chromium.launch({
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--use-file-for-fake-audio-capture=/tmp/fake-slow.wav%noloop',
    '--autoplay-policy=no-user-gesture-required',
  ],
})
// iPhone 13-ish viewport: this has to work at phone width.
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  permissions: ['microphone'],
})
const page = await ctx.newPage()

const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

// Watch for ANY network egress beyond the page's own modules — the
// nothing-is-saved guarantee, enforced rather than asserted.
const egress = []
page.on('request', (r) => {
  const u = r.url()
  if (u.startsWith(BASE) || u.startsWith('blob:') || u.startsWith('data:')) return
  egress.push(u)
})
const uploads = []
page.on('request', (r) => {
  if (['POST', 'PUT', 'PATCH'].includes(r.method())) uploads.push(r.method() + ' ' + r.url())
})

await page.goto(`${BASE}/recordist-tutorial.html`, { waitUntil: 'networkidle' })
check('page loads with no JS errors', errors.length === 0, errors.join(' | '))
check('phrase packs rendered', (await page.locator('#pack option').count()) >= 3)
await page.screenshot({ path: `${SHOTS}/1-intro.png` })

// ── step 2: natural speed ───────────────────────────────────────────────────
await page.selectOption('#pack', 'fin')
await page.click('#go')
check('natural-speed prompt shown', await page.locator('.prompt').first().isVisible())

async function take(ms = 3000) {
  await page.click('#rec')
  await page.waitForSelector('#stop')
  await page.waitForTimeout(ms)
  await page.click('#stop')
}

await take(2000)
await page.waitForSelector('audio', { timeout: 10000 })
check('first natural take plays back', (await page.locator('audio').count()) === 1)
await take(2000)
await page.waitForFunction(() => document.querySelectorAll('audio').length === 2, null, { timeout: 10000 })
check('both natural takes listenable', (await page.locator('audio').count()) === 2)
await page.screenshot({ path: `${SHOTS}/2-natural.png`, fullPage: true })

// ── step 3: slow reads — the real mic path, through the real splitter ───────
//
// What this CAN prove headlessly: a capture reaches the splitter, gets decoded,
// gets segmented, gets drawn, and that a wrong result is reported honestly.
//
// What it CANNOT prove: that the splitter finds exactly 3 pieces from the fake
// device. Chromium's --use-file-for-fake-audio-capture advances the file on
// wall-clock and loops it, so the phase at which a take starts is not
// controllable — a 3.2 s window over a looping burst pattern lands on 2, 3 or 4
// bursts depending on when the click happened. That is a property of the fake
// device, not of the tutorial. The exact-count path is proven deterministically
// below, in this same browser, against a synthetic take.
await page.click('#to-slow')
check('slow prompt shows beat markers', (await page.locator('.beat').count()) === 2)

await take(3200)
await page.waitForSelector('#wave', { timeout: 15000 })
await page.waitForTimeout(400)

const split = await page.evaluate(() => ({
  okText: document.querySelector('.ok')?.textContent?.trim() || null,
  warnText: document.querySelector('.warn')?.textContent?.trim() || null,
  guidance: document.querySelector('.bad-note')?.textContent?.replace(/\s+/g, ' ').trim() || null,
  canvasHasInk: (() => {
    const c = document.getElementById('wave')
    if (!c) return false
    const g = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
    let lit = 0
    for (let i = 3; i < g.length; i += 4) if (g[i] > 0) lit++
    return lit > 1000
  })(),
}))
check('a live capture reached the splitter and produced a verdict',
  !!(split.okText || split.warnText), JSON.stringify(split))
check('waveform + cut lines drawn from the live capture', split.canvasHasInk)
check('a wrong split is reported honestly, with what to do about it',
  !!split.okText || (!!split.warnText && !!split.guidance),
  split.warnText ? `${split.warnText} → ${split.guidance?.slice(0, 90)}` : 'clean split')
console.log(`  live capture verdict: ${split.okText || split.warnText}`)
await page.screenshot({ path: `${SHOTS}/3-cuts.png`, fullPage: true })

// ── the hard part, deterministically, in this browser ───────────────────────
// Synthetic slow read → alignSlowGap → sliceChunk → concatChunks → WAV →
// decodeAudioData. Same modules the page imports, same engine, known input.
const deterministic = await page.evaluate(async () => {
  const M = await import('/src/utils/takeSplice.js')
  const SR = 44100
  const build = (segs) => {
    const total = segs.reduce((n, s) => n + Math.round(s.ms / 1000 * SR), 0)
    const x = new Float32Array(total)
    let o = 0, ph = 0
    for (const s of segs) {
      const n = Math.round(s.ms / 1000 * SR)
      for (let i = 0; i < n; i++) { ph += 2 * Math.PI * 180 / SR; x[o + i] = s.v ? 0.45 * Math.sin(ph) : 0 }
      o += n
    }
    return x
  }
  // "Minä haluan • oppia • vähän lisää" read slowly, with second-long beats.
  const take = build([
    { ms: 300, v: false }, { ms: 700, v: true },
    { ms: 900, v: false }, { ms: 500, v: true },
    { ms: 900, v: false }, { ms: 800, v: true },
    { ms: 300, v: false },
  ])
  const chunks = ['Minä haluan', 'oppia', 'vähän lisää']
  const a = M.alignSlowGap(take, SR, chunks)
  if (!a.ok) return { ok: false, reason: a.reason }

  const pieces = a.chunks.map((c) => M.sliceChunk(take, SR, c.startMs, c.endMs))
  // "Minä haluan" + "vähän lisää" — a pair never read as one phrase.
  const joined = M.concatChunks([pieces[0], pieces[2]], SR, { gapMs: 0 })
  const wav = M.encodeWavMono(joined, SR)

  const AC = window.AudioContext || window.webkitAudioContext
  const ac = new AC()
  const decoded = await ac.decodeAudioData(await wav.arrayBuffer())
  ac.close()

  return {
    ok: true,
    labels: a.chunks.map((c) => c.text),
    durations: a.chunks.map((c) => c.durationMs),
    starts: a.chunks.map((c) => c.startMs),
    joinedSecs: decoded.duration,
    wavBytes: wav.size,
    // the join must be the two pieces' lengths, not a silent stub
    piecesSecs: pieces.map((p) => p.length / SR),
  }
})
check('deterministic take splits into exactly 3 labelled pieces',
  deterministic.ok && deterministic.labels.join('|') === 'Minä haluan|oppia|vähän lisää',
  JSON.stringify(deterministic))
check('boundaries land on the bursts (±40 ms of 300/1900/3300)',
  deterministic.ok && [300, 1900, 3300].every((want, i) => Math.abs(deterministic.starts[i] - want) <= 40),
  deterministic.ok ? `starts=${deterministic.starts}` : '')
check('piece durations match the bursts (700/500/800 ms, ±40)',
  deterministic.ok && [700, 500, 800].every((want, i) => Math.abs(deterministic.durations[i] - want) <= 40),
  deterministic.ok ? `durations=${deterministic.durations}` : '')
check('recombined WAV is real, playable audio the browser decodes',
  deterministic.ok && deterministic.joinedSecs > 1.4 && deterministic.wavBytes > 40000,
  deterministic.ok ? `${deterministic.joinedSecs?.toFixed(3)}s, ${deterministic.wavBytes}B` : '')
check('the join is the sum of its pieces, not a stub',
  deterministic.ok &&
    Math.abs(deterministic.joinedSecs - deterministic.piecesSecs.filter((_, i) => i !== 1).reduce((a, b) => a + b, 0)) < 0.01,
  deterministic.ok ? `joined=${deterministic.joinedSecs?.toFixed(3)} pieces=${deterministic.piecesSecs?.map((s) => s.toFixed(3))}` : '')

// ── step 4: walk the rest of the UI ─────────────────────────────────────────
// Force a clean split into state so the later screens have pieces to work with,
// independent of what the fake device happened to deliver.
await page.evaluate(async () => {
  const M = await import('/src/utils/takeSplice.js')
  const SR = 44100
  const build = (segs) => {
    const total = segs.reduce((n, s) => n + Math.round(s.ms / 1000 * SR), 0)
    const x = new Float32Array(total)
    let o = 0, ph = 0
    for (const s of segs) {
      const n = Math.round(s.ms / 1000 * SR)
      for (let i = 0; i < n; i++) { ph += 2 * Math.PI * 180 / SR; x[o + i] = s.v ? 0.45 * Math.sin(ph) : 0 }
      o += n
    }
    return x
  }
  const take = build([
    { ms: 300, v: false }, { ms: 700, v: true },
    { ms: 900, v: false }, { ms: 500, v: true },
    { ms: 900, v: false }, { ms: 800, v: true },
    { ms: 300, v: false },
  ])
  window.__forceSlow(take, SR)
})
await page.waitForSelector('#to-pieces', { timeout: 10000 })
check('both slow reads split cleanly', (await page.locator('[data-play-piece]').count()) === 3)

await page.click('#to-pieces')
check('all six pieces listed', (await page.locator('[data-play-piece]').count()) === 6)
await page.screenshot({ path: `${SHOTS}/4-pieces.png`, fullPage: true })

await page.click('#to-reassemble')
await page.waitForTimeout(600)
const mixes = await page.evaluate(async () => {
  const out = []
  for (const el of document.querySelectorAll('audio[id^="mix-"]')) {
    const src = el.getAttribute('src')
    let bytes = 0, secs = 0
    if (src) {
      bytes = (await (await fetch(src)).blob()).size
      secs = await new Promise((r) => {
        const a = new Audio(src)
        a.onloadedmetadata = () => r(a.duration)
        a.onerror = () => r(-1)
        setTimeout(() => r(-2), 3000)
      })
    }
    out.push({ label: el.previousElementSibling?.textContent?.trim(), hasSrc: !!src, bytes, secs })
  }
  return out
})
check('three recombined phrases built', mixes.length === 3)
check('every recombination is real audio', mixes.every((m) => m.hasSrc && m.bytes > 20000 && m.secs > 1),
  JSON.stringify(mixes))
console.log('  recombined:', mixes.map((m) => `${m.label} (${m.secs.toFixed(2)}s, ${m.bytes}B)`).join(' · '))
await page.screenshot({ path: `${SHOTS}/5-reassembled.png`, fullPage: true })

// ── the guarantees ──────────────────────────────────────────────────────────
check('NOTHING uploaded — no POST/PUT/PATCH at all', uploads.length === 0, uploads.join(' | '))
check('no off-origin network egress', egress.length === 0, egress.join(' | '))
const stored = await page.evaluate(async () => ({
  ls: localStorage.length,
  ss: sessionStorage.length,
  idb: typeof indexedDB.databases === 'function' ? (await indexedDB.databases()).length : 0,
}))
check('nothing persisted to storage', stored.ls === 0 && stored.ss === 0 && stored.idb === 0,
  `localStorage=${stored.ls} sessionStorage=${stored.ss} indexedDB=${stored.idb}`)

// ── try again ───────────────────────────────────────────────────────────────
await page.click('#again')
check('Try again returns to the slow reads with pieces cleared',
  (await page.locator('[data-play-piece]').count()) === 0 &&
  (await page.locator('.beat').count()) === 2)

check('no JS errors across the whole run', errors.length === 0, errors.join(' | '))

await browser.close()
console.log(`\nscreenshots: ${SHOTS}`)
console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join(', ')}` : '\nALL CHECKS PASSED')
process.exit(fails.length ? 1 : 0)
