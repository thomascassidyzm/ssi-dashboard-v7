/**
 * End-to-end verification of the recordist practice page, driving a REAL
 * microphone capture through Chromium's fake audio device.
 *
 * It proves four separate things:
 *
 *  1. IT IS THE REAL TOOL — the components on screen are the studio's own
 *     (ModeSelector, RoleSelector, TeleprompterDisplay/PhraseCard,
 *     RecordingControls, RecordingStatus, SegmentCard), found by their own
 *     class names.
 *  2. BOTH MODES ARE TAUGHT AND USED — the run presses the real Mode 2 card,
 *     records phrase-by-phrase with manual advance, then presses the real
 *     Mode 1 card and records continuously with VAD auto-advance.
 *  3. THE AUDIO PATH IS REAL — getUserMedia → MediaRecorder → decodeMono →
 *     alignSlowGap → sliceChunk → concatChunks → WAV, not a mock of any of it.
 *  4. THE COPY GATE HOLDS — teaching copy renders only under TUTORIAL_MODE, and
 *     no file outside the tutorial directory imports the copy module. That last
 *     check is a repo grep, not a browser assertion, because the leak it guards
 *     against would be a future edit rather than a runtime state.
 *
 * Usage: node tools/recordist-tutorial/verify-recordist-tutorial.mjs [baseUrl]
 */
import { chromium } from 'playwright'
import { mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.argv[2] || 'http://127.0.0.1:5271'
const SHOTS = '/tmp/tutorial-shots'
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
mkdirSync(SHOTS, { recursive: true })

const fails = []
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!cond) fails.push(name)
}

// ── 0. THE COPY GATE, checked against the repo ──────────────────────────────
// The teaching copy must be unreachable from the live recorder. Two invariants:
//   (a) only files inside components/production/autocue/tutorial/ (plus
//       TutorialStudio.vue) may import tutorialScript or tutorialMode;
//   (b) provideTutorialMode() is called exactly once in the whole repo.
{
  const SKIP = new Set(['node_modules', '.git', 'dist', '.worktrees', 'coverage', '.nuxt', '.output'])
  const files = []
  ;(function walk(dir) {
    for (const name of readdirSync(dir)) {
      if (SKIP.has(name)) continue
      const p = join(dir, name)
      const st = statSync(p)
      if (st.isDirectory()) walk(p)
      else if (/\.(vue|js|ts|mjs|cjs)$/.test(name)) files.push(p)
    }
  })(join(REPO, 'src'))

  const ALLOWED = /components\/production\/autocue\/(tutorial\/|TutorialStudio\.vue$)/
  const importers = []
  const callers = []
  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    const rel = relative(REPO, f)
    if (/from\s+['"][^'"]*tutorial(Script|Mode)['"]/.test(src) && !ALLOWED.test(rel)) {
      importers.push(rel)
    }
    // A CALL SITE is a bare `provideTutorialMode()` statement on its own line —
    // not the `export function` definition, and not a mention inside a comment
    // block (both of which appear in the docs that explain the gate).
    const isCall = src.split('\n').some((line) => {
      const t = line.trim()
      if (t.startsWith('*') || t.startsWith('//')) return false
      if (t.startsWith('export function')) return false
      return /^provideTutorialMode\s*\(\s*\)/.test(t)
    })
    if (isCall) callers.push(rel)
  }
  check('no file outside the tutorial directory imports the teaching copy',
    importers.length === 0, importers.join(' | '))
  check('provideTutorialMode is called in exactly one file, and it is TutorialStudio',
    callers.length === 1 && callers[0].endsWith('autocue/TutorialStudio.vue'),
    callers.join(' | ') || 'no call sites found')

  // The real studio must carry no coach components at all.
  const studio = readFileSync(
    join(REPO, 'src/components/production/autocue/AutocueStudio.vue'), 'utf8')
  check('the live AutocueStudio contains no tutorial components',
    !/TutorialCoach|TutorialHint|TutorialProgress|BeatWindowDiagram|tutorialScript/.test(studio))
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
  modeCard: '.mode-selector .mode-card',
  coach: '.coach',
  progress: '.tutorial-progress',
}

async function startSession() {
  await page.click(SEL.record)
  // The first take calibrates the room (1.5 s) before MediaRecorder starts.
  await page.waitForFunction(
    (sel) => document.querySelector(sel)?.innerText.toLowerCase().includes('stop recording'),
    SEL.record, { timeout: 25000 }
  )
}

async function take(ms = 3000) {
  await page.click(SEL.record)
  // The first take calibrates the room (1.5 s) before MediaRecorder starts.
  await page.waitForFunction(
    (sel) => document.querySelector(sel)?.innerText.toLowerCase().includes('stop recording'),
    SEL.record, { timeout: 25000 }
  )
  await page.waitForTimeout(ms)
  await page.click(SEL.record)
}

// ── 1. loads, and it is the real studio ─────────────────────────────────────
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
check('page loads with no JS errors', errors.length === 0, errors.join(' | '))
check('real studio shell rendered (badge + header)',
  (await page.locator('.autocue-studio .studio-badge').count()) === 1 &&
  (await page.locator('.studio-meta h1').innerText()).toUpperCase().includes('AUTOCUE'))
check('practice guarantee visible in the header',
  (await page.locator('.practice-badge').innerText()).toLowerCase().includes('nothing is saved'))
check('teaching copy renders under tutorial mode',
  (await page.locator(SEL.coach).count()) >= 1)
check('phrase packs offered', (await page.locator('#pack option').count()) >= 3)

// ── WHICH SURFACE THIS TEACHES ──────────────────────────────────────────────
// The two recording surfaces are deliberately separate and teach OPPOSITE
// registers (pods = perform, course phrases = neutral). A tutorial that leaves
// a recordist unsure which job they are on is the failure the split exists to
// prevent, so the naming is asserted, not assumed.
const welcomeText = (await page.locator('.script-summary').innerText()).toLowerCase()
check('the tutorial says plainly which tool it teaches',
  welcomeText.includes('course phrase'), welcomeText.slice(0, 120))
check('it names pod recording as a different tool and a different job',
  welcomeText.includes('different tool') && welcomeText.includes('pod'))
check('it does not claim to teach the per-person recorder',
  !welcomeText.includes('/r/') && !welcomeText.includes('voiceid'))
await page.screenshot({ path: `${SHOTS}/1-welcome.png`, fullPage: true })

await page.selectOption('#pack', 'fin')
await page.click(SEL.begin)

// ── 2. the REAL mode selector, and the wrong-card nudge ─────────────────────
check('the real ModeSelector is on screen', (await page.locator(SEL.modeCard).count()) === 2)
check('tutorial progress spine shown', (await page.locator(SEL.progress).count()) === 1)
// .mode-title is text-transform: uppercase, so innerText comes back uppercased.
const modeText = (await page.locator(SEL.modeCard).allInnerTexts()).map((t) => t.toUpperCase())
check('mode cards are the studio\'s own wording',
  modeText[0]?.includes('MODE 1: NEW COURSE') && modeText[1]?.includes('MODE 2: REGENERATION'),
  modeText.map((t) => t.split('\n')[1]).join(' | '))
await page.screenshot({ path: `${SHOTS}/2-modes.png`, fullPage: true })

// Press the WRONG card first — the tutorial should hold position and nudge.
await page.locator(SEL.modeCard).first().click()
await page.waitForTimeout(200)
check('pressing the wrong mode card nudges instead of advancing',
  (await page.locator('.coach-nudge').count()) === 1 &&
  (await page.locator(SEL.modeCard).count()) === 2)

// Now the right one: Mode 2 = regeneration = queue mode, manual advance.
await page.locator(SEL.modeCard).nth(1).click()
await page.waitForTimeout(200)
check('Mode 2 leads to the real RoleSelector',
  (await page.locator('.role-selector .role-option').count()) === 3)
await page.screenshot({ path: `${SHOTS}/3-role.png`, fullPage: true })

await page.locator('.role-selector .role-option').nth(1).click()
await page.click('.role-selector .begin-btn')

// ── 3. QUEUE MODE — manual advance ──────────────────────────────────────────
check('real TeleprompterDisplay on screen', (await page.locator(SEL.teleprompter).count()) === 1)
check('real RecordingControls (Start Recording)',
  (await page.locator(SEL.record).innerText()).toLowerCase().includes('start recording'))
check('pass indicator says Pass 1: Natural Speed',
  (await page.locator('.pass-title').innerText()).includes('Pass 1: Natural Speed'))
check('manual-advance hint shown',
  (await page.locator('.tutorial-hint').innerText()).toLowerCase().includes('waits for you'))

// THE REAL QUEUE GESTURE: press record ONCE, then NEXT closes each take.
const NEXT_BTN = '.controls-row.secondary .control-btn >> nth=2'
await startSession()
check('the mic stays open — this is a session, not a per-line take',
  (await page.locator(SEL.record).innerText()).toLowerCase().includes('stop recording'))
check('NEXT is live while recording, which is what closes a take',
  await page.locator(NEXT_BTN).isEnabled())
check('the coach teaches the NEXT button while the mic is open',
  (await page.locator('.coach-title').innerText()).toLowerCase().includes('press next'))
check('queue mode did NOT auto-advance while reading',
  (await page.locator('.pass-progress').innerText()).includes('Item 1 / 2'))

await page.waitForTimeout(2000)
await page.locator(NEXT_BTN).click()
await page.waitForTimeout(400)
check('the real NEXT button closed the take and advanced the autocue',
  (await page.locator('.pass-progress').innerText()).includes('Item 2 / 2'))
await page.waitForSelector('.listen-panel audio', { timeout: 15000 })
check('the closed take is listenable straight away',
  (await page.locator('.listen-panel audio').count()) === 1)

await page.waitForTimeout(2000)
await page.click(SEL.record)   // STOP ends the pass and closes the last take
await page.waitForFunction(() => document.querySelectorAll('.listen-panel audio').length === 2,
  null, { timeout: 15000 })
check('both natural takes listenable', (await page.locator('.listen-panel audio').count()) === 2)
await page.screenshot({ path: `${SHOTS}/4-queue-natural.png`, fullPage: true })

// ── 4. slow reads, with the studio's own beat markers ───────────────────────
await page.click('.listen-panel .btn-begin')
check('pass indicator says Pass 2: Slow with Gaps',
  (await page.locator('.pass-title').innerText()).includes('Pass 2: Slow with Gaps'))
check('the studio\'s own gap markers drawn between chunks',
  (await page.locator(`${SEL.phraseCard}.current ${SEL.gapMarker}`).count()) === 2)
check('SLOW cadence label shown', (await page.locator('.cadence-label').count()) >= 1)

await startSession()
await page.waitForTimeout(3200)
await page.click(SEL.record)   // STOP closes the slow take and ends the pass
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
  split.badText ? `${split.badText} → ${split.guidance?.slice(0, 80)}` : 'clean split')
console.log(`  live capture verdict: ${split.okText || split.badText}`)
await page.screenshot({ path: `${SHOTS}/5-cuts.png`, fullPage: true })

// ── 5. the splitter, deterministically, in this browser ─────────────────────
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
    window: M.BEAT_WINDOW,
  }
}, SYNTH)

check('deterministic take splits into exactly 3 labelled pieces',
  deterministic.ok && deterministic.labels.join('|') === 'Minä haluan|oppia|vähän lisää',
  JSON.stringify(deterministic))
check('boundaries land on the bursts (±40 ms of 300/1900/3300)',
  deterministic.ok && [300, 1900, 3300].every((w, i) => Math.abs(deterministic.starts[i] - w) <= 40),
  deterministic.ok ? `starts=${deterministic.starts}` : '')
check('piece durations match the bursts (700/500/800 ms, ±40)',
  deterministic.ok && [700, 500, 800].every((w, i) => Math.abs(deterministic.durations[i] - w) <= 40),
  deterministic.ok ? `durations=${deterministic.durations}` : '')
check('recombined WAV is real, playable audio the browser decodes',
  deterministic.ok && deterministic.joinedSecs > 1.4 && deterministic.wavBytes > 40000,
  deterministic.ok ? `${deterministic.joinedSecs?.toFixed(3)}s, ${deterministic.wavBytes}B` : '')
check('the join is the sum of its pieces, not a stub',
  deterministic.ok &&
    Math.abs(deterministic.joinedSecs - (deterministic.piecesSecs[0] + deterministic.piecesSecs[2])) < 0.01,
  deterministic.ok ? `joined=${deterministic.joinedSecs?.toFixed(3)}` : '')
// The two walls the tutorial teaches must be the code's own numbers.
check('the taught beat window matches the code it describes',
  deterministic.window?.minMs === 150 && deterministic.window?.maxMs === 800,
  JSON.stringify(deterministic.window))

// ── 6. queue review: real SegmentCards, real audio ──────────────────────────
await page.evaluate((synth) => {
  // eslint-disable-next-line no-eval
  const { SR, take } = eval(synth)
  window.__tutorial.forceSlow(take, SR)
}, SYNTH)
await page.waitForTimeout(400)
await page.click('.listen-panel .btn-begin')
await page.waitForSelector(SEL.segmentCard, { timeout: 10000 })
check('all six pieces shown as REAL SegmentCards',
  (await page.locator(SEL.segmentCard).count()) === 6)
check('every piece has the studio\'s Play / Redo / Approve controls',
  (await page.locator(`${SEL.segmentCard} .segment-btn`).count()) === 18)
check('a real waveform per slow read', (await page.locator(SEL.waveform).count()) === 2)

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
console.log('  recombined:', mixes.map((m) => `${m.label} (${m.secs.toFixed(2)}s)`).join(' · '))
await page.screenshot({ path: `${SHOTS}/6-queue-review.png`, fullPage: true })

// ── 7. SWITCHING MODES through the real control ─────────────────────────────
await page.locator('.final-actions .control-btn.go').click()
await page.waitForTimeout(200)
check('back on the real ModeSelector to switch modes',
  (await page.locator(SEL.modeCard).count()) === 2)
check('the coach asks for the second way this tool runs',
  (await page.locator('.coach-title').innerText()).toLowerCase().includes('second way'))

// Wrong card again — the nudge must be the OTHER one now.
await page.locator(SEL.modeCard).nth(1).click()
await page.waitForTimeout(200)
check('pressing Mode 2 at the switch step nudges toward Mode 1',
  (await page.locator('.coach-nudge').innerText()).includes('Mode 1'))

await page.locator(SEL.modeCard).first().click()
await page.waitForTimeout(300)
// .pass-label is text-transform: uppercase, like .mode-title above.
check('Mode 1 opens the continuous recording screen',
  (await page.locator('.pass-label').innerText()).toUpperCase().includes('CONTINUOUS RECORDING'))
check('auto-advance hint replaces the manual-advance one',
  (await page.locator('.tutorial-hint').innerText()).toLowerCase().includes('moves itself'))
check('script mode hides the gap markers, as the real tool does',
  (await page.locator(SEL.gapMarker).count()) === 0)
await page.screenshot({ path: `${SHOTS}/7-continuous.png`, fullPage: true })

// ── 8. continuous recording: the tool advances off the voice ────────────────
await page.click(SEL.record)
await page.waitForFunction(
  (sel) => document.querySelector(sel)?.innerText.toLowerCase().includes('stop recording'),
  SEL.record, { timeout: 25000 }
)
// The fake device plays tone bursts separated by 400 ms; the VAD's 800 ms
// silence rule will fire on the file's longer gaps. Give it room to land takes.
await page.waitForTimeout(9000)
const advanced = await page.evaluate(() => ({
  item: document.querySelector('.pass-progress')?.textContent?.trim(),
  landings: document.querySelector('.listen-panel h3')?.textContent?.trim() || null,
}))
check('the autocue advanced on its own, with nothing pressed',
  !!advanced.landings, JSON.stringify(advanced))
console.log(`  continuous run: ${advanced.item} · ${advanced.landings}`)

// Whether the fake device produced 1 take or 6 is not controllable; the
// consequence SCREEN is, so drive it deterministically from known landings.
await page.evaluate(() => window.__tutorial.forceLandings(6))
await page.waitForTimeout(300)
check('the consequence screen reports what the tool kept',
  (await page.locator('.review-subtitle').innerText()).includes('6 takes kept'))
check('running ahead of the recordist is called out explicitly',
  (await page.locator('.landing-verdict.ran-ahead').count()) === 1 &&
  (await page.locator('.landing-verdict').innerText()).toLowerCase().includes('ran ahead'))
check('per-line take counts shown', (await page.locator('.landing-row').count()) === 4)
await page.screenshot({ path: `${SHOTS}/8-consequence.png`, fullPage: true })

// A clean run must read as clean, not as a failure.
await page.evaluate(() => window.__tutorial.forceLandings(4))
await page.waitForTimeout(200)
check('a clean run is reported as clean',
  (await page.locator('.landing-verdict.clean').count()) === 1)

// ── 9. the beat window ──────────────────────────────────────────────────────
await page.locator('.final-actions .control-btn.go').click()
await page.waitForTimeout(200)
const bw = await page.evaluate(() => {
  const bands = [...document.querySelectorAll('.beat-window .band')]
  const ticks = [...document.querySelectorAll('.beat-window .tick')]
  const r = (el) => el.getBoundingClientRect()
  return {
    bands: bands.length,
    ticks: ticks.map((t) => t.textContent.trim()),
    // Each boundary tick must sit on the edge it names, or the picture is
    // pointing at the wrong number. Tick 0 = end of the too-short band,
    // tick 1 = end of the good band.
    offsets: [
      Math.abs(r(ticks[0]).left + r(ticks[0]).width / 2 - r(bands[0]).right),
      Math.abs(r(ticks[1]).left + r(ticks[1]).width / 2 - r(bands[1]).right),
    ].map((n) => +n.toFixed(2)),
  }
})
check('the beat-window diagram is drawn from the constants',
  bw.bands === 3 && bw.ticks[0] === '150 ms' && bw.ticks[1] === '800 ms', JSON.stringify(bw))
check('each tick lands on the boundary it names',
  bw.offsets.every((d) => d < 1.5), JSON.stringify(bw))
await page.screenshot({ path: `${SHOTS}/9-beat-window.png`, fullPage: true })

await page.click(SEL.begin)   // "I've got it"
check('the tutorial ends on the studio\'s own summary card',
  (await page.locator('.summary-card h2').innerText()).includes('Session Complete'))
const closing = (await page.locator('.summary-card').innerText()).toLowerCase()
check('the closing step warns that pod recording wants the OPPOSITE register',
  closing.includes('pod') && closing.includes('opposite') &&
  (closing.includes('alive') || closing.includes('character')),
  closing.slice(-160))
await page.screenshot({ path: `${SHOTS}/10-done.png`, fullPage: true })

// ── 10. phone width ─────────────────────────────────────────────────────────
const overflow = await page.evaluate(() => ({
  docWidth: document.documentElement.clientWidth,
  scrollWidth: document.documentElement.scrollWidth,
}))
check('no horizontal overflow at 390 px',
  overflow.scrollWidth <= overflow.docWidth + 1,
  `scrollWidth=${overflow.scrollWidth} client=${overflow.docWidth}`)

// Threshold is 38 px, not Apple's 44, on purpose: SegmentCard's Play/Redo/
// Approve buttons measure 38 px in the REAL review screen, and padding them
// here would teach a bigger button than the recordist actually gets.
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

// ── 11. the guarantees ──────────────────────────────────────────────────────
check('NOTHING uploaded — no POST/PUT/PATCH at all', uploads.length === 0, uploads.join(' | '))
check('no off-origin network egress', egress.length === 0, egress.join(' | '))
const stored = await page.evaluate(async () => ({
  ls: localStorage.length,
  ss: sessionStorage.length,
  idb: typeof indexedDB.databases === 'function' ? (await indexedDB.databases()).length : 0,
}))
check('nothing persisted to storage', stored.ls === 0 && stored.ss === 0 && stored.idb === 0,
  `localStorage=${stored.ls} sessionStorage=${stored.ss} indexedDB=${stored.idb}`)

check('no JS errors across the whole run', errors.length === 0, errors.join(' | '))

await browser.close()
console.log(`\nscreenshots: ${SHOTS}`)
console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join(', ')}` : '\nALL CHECKS PASSED')
process.exit(fails.length ? 1 : 0)
