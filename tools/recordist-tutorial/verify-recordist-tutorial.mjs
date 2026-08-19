/**
 * End-to-end verification of the recordist practice page, driving a REAL
 * microphone capture through Chromium's fake audio device.
 *
 * The fake device is fed /tmp/fake-slow.wav — three tone bursts separated by
 * 400 ms of silence — which is roughly the shape of a slow read. So this
 * exercises getUserMedia → MediaRecorder → decodeMono → alignSlowGap →
 * sliceChunk → concatChunks → WAV, not a mock of any of it.
 *
 * It also asserts the thing that makes this a rebuild rather than a lookalike:
 * that the REAL studio components are the ones on screen (their scoped-style
 * data attributes and class names are the studio's own).
 *
 * Usage: node tools/recordist-tutorial/verify-recordist-tutorial.mjs [baseUrl]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:5271'
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

// Watch for ANY network egress beyond the page's own bundle — the
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

const SEL = {
  begin: '.btn-begin',
  record: '.control-btn.record',
  teleprompter: '.teleprompter-viewport',
  phraseCard: '.phrase-card',
  gapMarker: '.gap-marker',
  segmentCard: '.segment-card',
  waveform: 'canvas.take-waveform',
}

await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
check('page loads with no JS errors', errors.length === 0, errors.join(' | '))

// ── it is the REAL studio, not a lookalike ──────────────────────────────────
check('real studio shell rendered (badge + header)',
  (await page.locator('.autocue-studio .studio-badge').count()) === 1 &&
  (await page.locator('.studio-meta h1').innerText()).toUpperCase().includes('AUTOCUE'))
check('practice guarantee visible in the header',
  (await page.locator('.practice-badge').innerText()).toLowerCase().includes('nothing is saved'))
check('phrase packs offered', (await page.locator('#pack option').count()) >= 3)
await page.screenshot({ path: `${SHOTS}/1-intro.png`, fullPage: true })

await page.selectOption('#pack', 'fin')
await page.click(SEL.begin)

// ── pass 1: natural speed, on the real teleprompter ─────────────────────────
check('real TeleprompterDisplay on screen', (await page.locator(SEL.teleprompter).count()) === 1)
check('real PhraseCards rendered', (await page.locator(SEL.phraseCard).count()) === 2)
check('real RecordingControls rendered (Start Recording button)',
  (await page.locator(SEL.record).innerText()).toLowerCase().includes('start recording'))
check('pass indicator says Pass 1: Natural Speed',
  (await page.locator('.pass-title').innerText()).includes('Pass 1: Natural Speed'))
check('no beat markers on the natural pass', (await page.locator(SEL.gapMarker).count()) === 0)

async function take(ms = 3000) {
  await page.click(SEL.record)
  // The first take calibrates the room (1.5 s) before MediaRecorder starts.
  await page.waitForFunction(
    (sel) => document.querySelector(sel)?.innerText.toLowerCase().includes('stop recording'),
    SEL.record, { timeout: 20000 }
  )
  await page.waitForTimeout(ms)
  await page.click(SEL.record)
}

await take(2000)
await page.waitForSelector('.listen-panel audio', { timeout: 15000 })
check('first natural take plays back immediately',
  (await page.locator('.listen-panel audio').count()) === 1)
await take(2000)
await page.waitForFunction(() => document.querySelectorAll('.listen-panel audio').length === 2,
  null, { timeout: 15000 })
check('both natural takes listenable', (await page.locator('.listen-panel audio').count()) === 2)
check('the real REC status pill exists', (await page.locator('.recording-status').count()) === 1)
await page.screenshot({ path: `${SHOTS}/2-natural.png`, fullPage: true })

// ── pass 2: slow reads, with the studio's own beat markers ──────────────────
await page.click('.listen-panel .btn-begin')
check('pass indicator says Pass 2: Slow with Gaps',
  (await page.locator('.pass-title').innerText()).includes('Pass 2: Slow with Gaps'))
check('the studio\'s own gap markers drawn between chunks',
  (await page.locator(`${SEL.phraseCard}.current ${SEL.gapMarker}`).count()) === 2)
check('SLOW cadence label shown', (await page.locator('.cadence-label').count()) >= 1)

// What this CAN prove headlessly: a capture reaches the splitter, gets decoded,
// segmented, drawn, and that a wrong result is reported honestly. It CANNOT
// prove the splitter finds exactly 3 pieces — Chromium's fake device advances
// on wall-clock, so a 3.2 s window lands on 2, 3 or 4 bursts. The exact-count
// path is proven deterministically below, in this same browser.
await take(3200)
await page.waitForSelector(SEL.waveform, { timeout: 20000 })
await page.waitForTimeout(400)

const split = await page.evaluate((sel) => ({
  okText: document.querySelector('.cut-ok')?.textContent?.trim() || null,
  badText: document.querySelector('.cut-bad')?.textContent?.trim() || null,
  guidance: document.querySelector('.cut-diagnosis')?.textContent?.replace(/\s+/g, ' ').trim() || null,
  canvasHasInk: (() => {
    const c = document.querySelector(sel)
    if (!c) return false
    const g = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
    let lit = 0
    for (let i = 3; i < g.length; i += 4) if (g[i] > 0) lit++
    return lit > 1000
  })(),
}), SEL.waveform)
check('a live capture reached the splitter and produced a verdict',
  !!(split.okText || split.badText), JSON.stringify(split))
check('waveform + cut lines drawn from the live capture', split.canvasHasInk)
check('a wrong split is reported honestly, with what to do about it',
  !!split.okText || (!!split.badText && !!split.guidance),
  split.badText ? `${split.badText} → ${split.guidance?.slice(0, 90)}` : 'clean split')
console.log(`  live capture verdict: ${split.okText || split.badText}`)
await page.screenshot({ path: `${SHOTS}/3-cuts.png`, fullPage: true })

// ── the hard part, deterministically, in this browser ───────────────────────
const SYNTH = `(() => {
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
  return { SR, take: build([
    { ms: 300, v: false }, { ms: 700, v: true },
    { ms: 900, v: false }, { ms: 500, v: true },
    { ms: 900, v: false }, { ms: 800, v: true },
    { ms: 300, v: false },
  ]) }
})()`

const deterministic = await page.evaluate(async (synth) => {
  const M = window.__tutorial.splice
  // eslint-disable-next-line no-eval
  const { SR, take } = eval(synth)
  const chunks = ['Minä haluan', 'oppia', 'vähän lisää']
  const a = M.alignSlowGap(take, SR, chunks)
  if (!a.ok) return { ok: false, reason: a.reason }

  const pieces = a.chunks.map((c) => M.sliceChunk(take, SR, c.startMs, c.endMs))
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
    piecesSecs: pieces.map((p) => p.length / SR),
  }
}, SYNTH)

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
    Math.abs(deterministic.joinedSecs - (deterministic.piecesSecs[0] + deterministic.piecesSecs[2])) < 0.01,
  deterministic.ok ? `joined=${deterministic.joinedSecs?.toFixed(3)} pieces=${deterministic.piecesSecs?.map((s) => s.toFixed(3))}` : '')

// ── review: the real SegmentCards, with real audio behind them ──────────────
await page.evaluate((synth) => {
  // eslint-disable-next-line no-eval
  const { SR, take } = eval(synth)
  window.__tutorial.forceSlow(take, SR)
}, SYNTH)
await page.waitForTimeout(400)
check('both slow reads split cleanly',
  (await page.locator('.cut-ok').count()) === 1)

await page.click('.listen-panel .btn-begin')   // "hear them put together"
await page.waitForSelector(SEL.segmentCard, { timeout: 10000 })
check('all six pieces shown as REAL SegmentCards',
  (await page.locator(SEL.segmentCard).count()) === 6)
check('every piece has the studio\'s Play / Redo / Approve controls',
  (await page.locator(`${SEL.segmentCard} .segment-btn`).count()) === 18)
check('a real waveform per slow read', (await page.locator(SEL.waveform).count()) === 2)
await page.screenshot({ path: `${SHOTS}/4-review.png`, fullPage: true })

const mixes = await page.evaluate(async () => {
  const out = []
  for (const row of document.querySelectorAll('.mix-row')) {
    const el = row.querySelector('audio')
    const src = el?.getAttribute('src')
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
    out.push({ label: row.querySelector('.mix-label')?.textContent?.trim(), hasSrc: !!src, bytes, secs })
  }
  return out
})
check('three recombined phrases built', mixes.length === 3)
check('every recombination is real audio',
  mixes.every((m) => m.hasSrc && m.bytes > 20000 && m.secs > 1), JSON.stringify(mixes))
console.log('  recombined:', mixes.map((m) => `${m.label} (${m.secs.toFixed(2)}s, ${m.bytes}B)`).join(' · '))
await page.screenshot({ path: `${SHOTS}/5-reassembled.png`, fullPage: true })

// ── phone width: nothing may need a sideways scroll ─────────────────────────
const overflow = await page.evaluate(() => {
  const w = document.documentElement.clientWidth
  const wide = []
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && (r.right > w + 1 || r.left < -1)) {
      wide.push(el.className?.toString().slice(0, 40) + ` (${Math.round(r.left)}..${Math.round(r.right)})`)
    }
  }
  return { docWidth: w, scrollWidth: document.documentElement.scrollWidth, wide: wide.slice(0, 6) }
})
check('no horizontal overflow at 390 px',
  overflow.scrollWidth <= overflow.docWidth + 1,
  `scrollWidth=${overflow.scrollWidth} client=${overflow.docWidth} ${overflow.wide.join(' | ')}`)

// Threshold is 38 px, not Apple's 44, on purpose. SegmentCard's Play/Redo/
// Approve buttons measure 38 px in the REAL review screen — that is the tool's
// own dimension, and padding it here would make the practice page teach a
// bigger button than the recordist will actually get. Reported to Kai as a
// finding about the real studio instead of silently forked. Everything the
// PRACTICE page adds is held to 52 px, checked separately below.
const smallTargets = await page.evaluate(() => {
  const bad = []
  for (const el of document.querySelectorAll('button, select, audio')) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0 && r.height < 38) bad.push(`${el.tagName}.${el.className} h=${Math.round(r.height)}`)
  }
  return bad
})
check('no tap target below the real studio\'s own 38 px floor',
  smallTargets.length === 0, smallTargets.join(' | '))

const ownTargets = await page.evaluate(() => {
  const bad = []
  for (const el of document.querySelectorAll('.btn-begin, .final-actions .control-btn, #pack')) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height < 52) bad.push(`${el.tagName}.${el.className} h=${Math.round(r.height)}`)
  }
  return bad
})
check('every control the practice page adds is at least 52 px tall',
  ownTargets.length === 0, ownTargets.join(' | '))

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
await page.click('.final-actions .control-btn')  // "Try the slow ones again"
await page.waitForTimeout(300)
check('Try again returns to the slow pass with pieces cleared',
  (await page.locator(SEL.segmentCard).count()) === 0 &&
  (await page.locator('.pass-title').innerText()).includes('Pass 2'))

check('no JS errors across the whole run', errors.length === 0, errors.join(' | '))

await browser.close()
console.log(`\nscreenshots: ${SHOTS}`)
console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join(', ')}` : '\nALL CHECKS PASSED')
process.exit(fails.length ? 1 : 0)
