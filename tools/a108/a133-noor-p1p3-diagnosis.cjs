// A-133 — DIAGNOSIS of the two clips Tom's ear failed: Noor (xai 247783ebdd51)
// p1 and p3, AFTER clips, from the 55-render phrase test.
//
// THE QUESTION, exactly as Tom framed it: is what he heard (a) a residual click
// the chain missed, (b) a click WITHIN the speech itself, or (c) a voice-quality
// artefact? That decides whether the CHAIN needs another iteration or the VOICE
// is partly unreliable. Nothing here modifies the chain.
//
// READ-ONLY. No render, no spend, no DB, no S3. It measures files already on
// disk from job #949 (/tmp/a133-phrase-test/<key>/{raw,before,after}.mp3).
//
// FOUR INSTRUMENTS, because the three hypotheses fail differently:
//
//  1. EVENT MAP — the chain's own envelope/event detector (a133-tail-probe),
//     whole clip, so we see what the trim saw. If the click sat past end-of-
//     speech and survives in the AFTER clip, hypothesis (a).
//
//  2. ISOLATED-IMPULSE SCAN, WHOLE CLIP — the probe only looks after EOS. This
//     looks everywhere: impulse-kind events standing clear of speech by
//     GAP_MS on both sides, reported over their own LOCAL floor. A hit inside
//     the clip is hypothesis (b) in its inter-word form, and it is invisible to
//     a post-EOS-only trim by construction.
//
//  3. TRANSIENT (DISCONTINUITY) SCAN — a click buried INSIDE a word merges into
//     a speech event and neither 1 nor 2 can see it. A click is a broadband
//     step: sample-to-sample derivative far above what the surrounding signal
//     supports. Per 5ms window we take max|Δs| normalised by that window's own
//     peak amplitude (a "crest of the derivative"): speech, even plosive speech,
//     keeps this bounded; a discontinuity spikes it. Reported against the
//     clip's own median so a peaky voice is not slandered by an absolute number.
//
//  4. CONTROLS — the same lines from the voices Tom passed (Femke, Thijs) and
//     the same voice's own passing lines (p2/p4/p5). A number is only evidence
//     if the passing clips do not show it too.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs'), path = require('path'), cp = require('child_process')
const probe = require('./a133-tail-probe.cjs')
const { decode, envelope, events, endOfSpeech, roomFloorDb, SR, WIN_MS } = probe

const SRC = process.env.SRC || '/tmp/a133-phrase-test'
const GAP_MS = 80            // clearance an impulse needs on both sides to be "isolated"
const OUT = process.env.OUT || '/tmp/a133-noor-diagnosis.json'

const db = (v, peak) => 20 * Math.log10(Math.max(v, 1) / peak)

// Local floor: median 2ms window peak over a window either side of a point,
// excluding the event itself. Says how far the impulse stands out where it sits.
function localFloorDb(s, n, peak, from, to) {
  const win = Math.round(SR * 0.002)
  const vals = []
  for (let i = Math.max(0, from); i + win <= Math.min(n, to); i += win) vals.push(db(winPeak(s, i, i + win), peak))
  vals.sort((a, b) => a - b)
  return vals.length ? vals[vals.length >> 1] : NaN
}
function winPeak(s, from, to) {
  let p = 0
  for (let i = Math.max(0, from); i < Math.min(s.length, to); i++) p = Math.max(p, Math.abs(s[i]))
  return p
}

// INSTRUMENT 2 — isolated impulses anywhere in the clip.
function isolatedImpulses(s, n, peak, evs) {
  const gap = SR * GAP_MS / 1000
  const speech = evs.filter(e => e.kind === 'speech')
  const out = []
  for (const e of evs) {
    if (e.kind !== 'impulse') continue
    const before = speech.filter(x => x.end <= e.start).pop()
    const after = speech.find(x => x.start >= e.end)
    const clearBefore = before ? e.start - before.end : e.start
    const clearAfter = after ? after.start - e.end : n - e.end
    if (clearBefore < gap || clearAfter < gap) continue
    const floor = localFloorDb(s, n, peak,
      e.start - Math.round(SR * 0.130), e.start - Math.round(SR * 0.030))
    out.push({
      startMs: +(e.start / SR * 1000).toFixed(0),
      ms: +e.ms.toFixed(0), aboveMs: e.aboveMs,
      peakDb: +e.peakDb.toFixed(1),
      overLocalFloorDb: +(e.peakDb - floor).toFixed(1),
      clearBeforeMs: +(clearBefore / SR * 1000).toFixed(0),
      clearAfterMs: +(clearAfter / SR * 1000).toFixed(0),
    })
  }
  return out
}

// INSTRUMENT 3 — discontinuity scan. Per 5ms window: max|Δs| / window peak.
// Speech waveforms are band-limited; a click is a step, so its derivative crest
// is several times the clip's own median. Reported as a ratio, never absolute.
function transients(s, n, peak) {
  const win = Math.round(SR * WIN_MS / 1000)
  const rows = []
  for (let i = win; i + win <= n; i += win) {
    let maxD = 0, p = 0
    for (let j = i; j < i + win; j++) {
      const d = Math.abs(s[j] - s[j - 1])
      if (d > maxD) maxD = d
      const a = Math.abs(s[j]); if (a > p) p = a
    }
    // Only meaningful where there is signal at all: ignore near-silence.
    if (p < peak * Math.pow(10, -60 / 20)) continue
    rows.push({ i, startMs: i / SR * 1000, crest: maxD / Math.max(p, 1), peakDb: db(p, peak) })
  }
  if (!rows.length) return { medianCrest: NaN, spikes: [] }
  const sorted = rows.map(r => r.crest).sort((a, b) => a - b)
  const med = sorted[sorted.length >> 1]
  const spikes = rows
    .filter(r => r.crest > med * 3.0)
    .map(r => ({ startMs: +r.startMs.toFixed(0), crestRatio: +(r.crest / med).toFixed(2), levelDb: +r.peakDb.toFixed(1) }))
  return { medianCrest: +med.toFixed(4), spikes }
}

function analyse(file) {
  if (!fs.existsSync(file)) return { gap: `missing file ${file}` }
  const { s, n, peak } = decode(file)
  const env = envelope(s, n, peak)
  const evs = events(env)
  const eos = endOfSpeech(env) ?? n
  const room = roomFloorDb(s, n, peak, eos)
  const t = transients(s, n, peak)
  return {
    durationMs: Math.round(n / SR * 1000),
    eosMs: Math.round(eos / SR * 1000),
    postEosMs: Math.round((n - eos) / SR * 1000),
    roomFloorDb: +room.toFixed(1),
    eventMap: evs.map(e => ({
      startMs: +(e.start / SR * 1000).toFixed(0), ms: +e.ms.toFixed(0),
      aboveMs: e.aboveMs, peakDb: +e.peakDb.toFixed(1), kind: e.kind,
      pastEos: e.start >= eos,
    })),
    postEosImpulses: probe.postSpeechImpulses(env, eos, room)
      .map(i => ({ startMs: +i.startMs.toFixed(0), ms: +i.ms.toFixed(0), peakDb: +i.peakDb.toFixed(1), overFloorDb: +i.overFloorDb.toFixed(1) })),
    isolatedImpulses: isolatedImpulses(s, n, peak, evs),
    transientMedianCrest: t.medianCrest,
    transientSpikes: t.spikes,
  }
}

const TARGETS = []
for (const p of ['p1', 'p2', 'p3', 'p4', 'p5']) TARGETS.push({ voice: 'nld-noor', p })
for (const p of ['p1', 'p3']) for (const v of ['nld-femke', 'nld-thijs', 'nld-ruben']) TARGETS.push({ voice: v, p })

const out = []
for (const t of TARGETS) {
  const key = `${t.voice}-${t.p}`
  const dir = path.join(SRC, key)
  const row = { key, voice: t.voice, phrase: t.p }
  for (const side of ['raw', 'before', 'after']) {
    const f = side === 'raw' ? path.join(dir, 'raw.mp3') : path.join(dir, `${key}-${side}.mp3`)
    row[side] = analyse(f)
  }
  out.push(row)
  const a = row.after
  console.log(`${key.padEnd(16)} after ${String(a.durationMs).padStart(5)}ms eos ${String(a.eosMs).padStart(5)}ms post ${String(a.postEosMs).padStart(4)}ms` +
    ` | postEOS imp ${a.postEosImpulses.length}` +
    ` | isolated ${a.isolatedImpulses.length}${a.isolatedImpulses.length ? ' @' + a.isolatedImpulses.map(i => `${i.startMs}ms/+${i.overLocalFloorDb}dB`).join(',') : ''}` +
    ` | transient spikes ${a.transientSpikes.length}${a.transientSpikes.length ? ' @' + a.transientSpikes.slice(0, 6).map(x => `${x.startMs}ms x${x.crestRatio}`).join(',') : ''}`)
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 2))
console.log(`\nwrote ${OUT}`)
