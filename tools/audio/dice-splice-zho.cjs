#!/usr/bin/env node
/**
 * DICE AND SPLICE, CHINESE MAIN FLOW (job #340, Tom 2026-10-24: "if we apply our same dice and splice thinking we could
 * possibly produce a big reduction in the actual separate recordings we need … it would be easy to have a tool to do
 * this and allow us to make a quick assessment"). A FEASIBILITY tool: it writes audio files and a manifest, nothing else.
 * No course row, clip index entry or S3 course object is touched, and nothing is rendered — base clips are the course's
 * existing cast-voice clips, read from the learner app's public audio door.
 *
 *   plan    the text half (tools/audio/dice-splice-zho-plan.cjs): how many separate recordings seeds A..B need if every
 *           played target text is a base render, a cut from one, or a splice of up to --max-pieces cuts.
 *             node tools/audio/dice-splice-zho.cjs plan [--seeds 1-100] [--max-pieces 3] [--json out.json]
 *   build   splice listenable pairs from EXISTING cast-voice clips only. Each target text that already has its own clip in
 *           the cast voice is rebuilt from OTHER cast-voice clips (never its own), so the reference is the real thing.
 *             set -a; . ~/ssi-restore/qa-copy.env; set +a
 *             node tools/audio/audio-truth.cjs --course zho_for_eng --seeds 1-100 --bundle <bundle.json> --json truth.json
 *             node tools/audio/dice-splice-zho.cjs build --truth truth.json --role target1 --texts "你会说中文,他要练习" \
 *                  --out ~/ssi-evidence/zho-dice-splice [--asr]
 *                  [--timings timings.json]  cut on the engine's own word timings (below) instead of the energy aligner
 *           (bundle.json: `node tools/audio/dice-splice-zho.cjs bundle --out bundle.json` builds the slot list for
 *           audio-truth from Popty's seeds route, so every main-flow slot of 1..100 is listed, not the preview slice.)
 *   timings node tools/audio/dice-splice-zho.cjs timings --truth truth.json --out timings.json   (QA copy env set)
 *           the tool's ONLY database read: course_audio.word_timings by primary key via services/shared/agent-db.cjs.
 *
 * Course text comes from Popty's read-only GET /api/production/:course/seeds.
 *
 * ALIGNMENT. One Chinese character is one syllable, so a clip of N characters is cut into N syllables by a dynamic
 * programme over a 5 ms energy envelope: boundaries sit in energy valleys, and syllables are kept near the clip's mean
 * syllable length counted over speech frames only (a pause costs nothing). A boundary inside a pause is cut at the pause's
 * edges. --asr then runs an unprimed whisper round-trip on every spliced clip and on its reference, as a measurable check
 * that the splice still says exactly the intended characters — a pair whose splice loses or gains a syllable is DROPPED.
 *
 * THE JOIN. Each piece is cut CROSSFADE_MS/2 past its boundary on each inner side and the pieces overlap by CROSSFADE_MS
 * with an equal-power crossfade, so the seam is centred on the syllable boundary. Pieces are level-matched to their
 * median speech RMS (±6 dB), and the whole is mastered to the integrated loudness of its own reference clip, so the A/B
 * differs only in the splice. Measured per join: level step (dB), pitch step (semitones, autocorrelation f0), and the
 * click metric of tools/audio/clip-tail-audit.py (2nd-difference spike over its ±1 ms neighbourhood) at the seam and
 * the tail. Pieces cut from sentence-final position and used mid-sentence (or the reverse) are flagged: Mandarin
 * sentence-final lengthening and falling intonation travel with the syllable.
 *
 * Only one voice per spliced clip, ever (Tom: drill clips are cut from the immersion clip, in the same voice).
 */
const fs = require('fs'), os = require('os'), path = require('path')
const { execFileSync, spawnSync } = require('child_process')
const P = require('./dice-splice-zho-plan.cjs')
const { decodeMono, encodeWav, SAMPLE_RATE: SR } = require('../../services/shared/intro-splice.cjs')

const POPTY = process.env.POPTY_URL || 'http://localhost:3470'
const AUDIO_DOOR = 'https://saysomethingin.app/api/audio'
const CROSSFADE_MS = 30
const HOP = Math.round(SR * 0.005), WIN = Math.round(SR * 0.02)
const MAX_GAIN_DB = 6
const WHISPER = process.env.WHISPER_BIN || path.join(os.homedir(), '.local/bin/whisper-cli')
const WHISPER_MODEL = process.env.WHISPER_MODEL || path.join(os.homedir(), '.local/share/whisper-models/ggml-small.bin')

const argv = process.argv.slice(2)
const opt = (f, d) => { const i = argv.indexOf(`--${f}`); return i >= 0 ? argv[i + 1] : d }
const flag = (f) => argv.includes(`--${f}`)
const ms = (n) => Math.round((n * SR) / 1000)
const db = (x) => 10 * Math.log10(x + 1e-12)

async function seedsPayload(course) {
  const f = opt('seeds-json')
  if (f) return JSON.parse(fs.readFileSync(f, 'utf8'))
  const r = await fetch(`${POPTY}/api/production/${course}/seeds?limit=2000`)
  if (!r.ok) throw new Error(`Popty seeds route ${r.status}`)
  return r.json()
}
const range = () => { const [a, b] = String(opt('seeds', '1-100')).split('-').map(Number); return { from: a, to: b || a } }

// ── analysis ────────────────────────────────────────────────────────────────

/** 5 ms energy envelope in dB (20 ms window), lightly smoothed. */
function envelopeOf(x) {
  const n = Math.max(1, Math.floor((x.length - WIN) / HOP) + 1), e = new Float64Array(n)
  for (let k = 0; k < n; k++) { let s = 0; const o = k * HOP; for (let i = 0; i < WIN && o + i < x.length; i++) s += x[o + i] * x[o + i]; e[k] = db(s / WIN) }
  const sm = new Float64Array(n)
  for (let k = 0; k < n; k++) { let s = 0, c = 0; for (let j = -1; j <= 1; j++) if (e[k + j] !== undefined) { s += e[k + j]; c++ } sm[k] = s / c }
  return sm
}

/**
 * The envelope boundaries are sought in: max(full-band energy, frication energy + K). A plain energy valley sits INSIDE
 * a fricative (sh/x/s/c/z, quieter than any vowel), so a cut there leaves half a 说 on each side. Frication is the
 * energy of the twice-differenced signal (+12 dB/octave), lifted by K so a typical vowel frame is still ruled by its
 * full-band energy; in a fricative the lifted frication term rules, so the valley moves to the fricative's edges —
 * the vowel→consonant transition, or a stop's closure, which is where a syllable boundary is cut.
 */
function envelope(x) {
  const full = envelopeOf(x)
  const d2 = new Float32Array(x.length); for (let i = 2; i < x.length; i++) d2[i] = x[i] - 2 * x[i - 1] + x[i - 2]
  const fr = envelopeOf(d2)
  const peak = Math.max(...full), diffs = []
  for (let k = 0; k < full.length; k++) if (full[k] > peak - 20) diffs.push(full[k] - fr[k])
  diffs.sort((a, b) => a - b)
  const K = (diffs[Math.floor(diffs.length / 2)] || 0) - 6
  return Float64Array.from(full, (v, k) => Math.max(v, fr[k] + K))
}

/**
 * Pure. Syllable boundaries for a clip of `nSyl` syllables. Returns frame indices [b0=speechStart, b1..b(N-1), bN=speechEnd]
 * plus the silent-frame mask, so a caller can tell a boundary that sits in a pause.
 */
function syllableBounds(env, nSyl) {
  const F = env.length, peak = Math.max(...env)
  const silent = Array.from(env, (v) => v < peak - 35)
  let s0 = 0; while (s0 < F && env[s0] < peak - 30) s0++
  let s1 = F - 1; while (s1 > s0 && env[s1] < peak - 40) s1--
  s1++
  const cs = new Int32Array(F + 1)
  for (let k = 0; k < F; k++) cs[k + 1] = cs[k] + (silent[k] ? 0 : 1)
  const speech = cs[s1] - cs[s0], mu = speech / nSyl
  const sp = env.slice(s0, s1).filter((_, i) => !silent[s0 + i]).sort((a, b) => a - b)
  const med = sp[Math.floor(sp.length / 2)] || peak
  const eCost = (b) => (env[b] - med) / 10
  const dCost = (a, b) => { const L = cs[b] - cs[a]; if (L < 0.35 * mu) return Infinity; const r = (L - mu) / mu; return 2 * r * r }
  if (nSyl <= 1) return { bounds: [s0, s1], silent }
  // dp[i][b] = best cost with i-th boundary at frame b
  const INF = Infinity
  let prev = new Float64Array(F + 1).fill(INF); prev[s0] = 0
  const back = []
  for (let i = 1; i < nSyl; i++) {
    const cur = new Float64Array(F + 1).fill(INF), bk = new Int32Array(F + 1).fill(-1)
    for (let b = s0 + 1; b < s1; b++) {
      const ec = eCost(b)
      for (let a = s0; a < b; a++) {
        if (prev[a] === INF) continue
        const c = prev[a] + dCost(a, b) + ec
        if (c < cur[b]) { cur[b] = c; bk[b] = a }
      }
    }
    back.push(bk); prev = cur
  }
  let best = INF, bl = -1
  for (let b = s0 + 1; b < s1; b++) if (prev[b] !== INF) { const c = prev[b] + dCost(b, s1); if (c < best) { best = c; bl = b } }
  if (bl < 0) return null
  const bounds = [s1, bl]
  for (let i = nSyl - 2; i >= 1; i--) bounds.push(back[i][bounds[bounds.length - 1]])
  bounds.push(s0)
  return { bounds: bounds.reverse(), silent }
}

/**
 * Pure. Character boundaries from the engine's own word timings (course_audio.word_timings, the Cartesia contract of
 * services/shared/word-timings.cjs: {words, starts, ends} in seconds). Returns frame bounds in the shape syllableBounds
 * gives, or null when the words do not spell the text. A boundary between two words sits midway between the end of one
 * and the start of the next; a boundary inside a multi-character word is interpolated by character (Mandarin syllables
 * are near-isochronous) and listed in `interpolated` so a caller can tell.
 */
function timingBounds(wt, text, silent) {
  if (!wt || !Array.isArray(wt.words)) return null
  const chars = [...text], t = [], interpolated = []
  let ci = 0
  for (let w = 0; w < wt.words.length; w++) {
    const cs = [...P.normText(wt.words[w])]
    const s = Number(wt.starts[w]), e = Number(wt.ends[w])
    for (let k = 0; k < cs.length; k++) {
      if (chars[ci] !== cs[k]) return null
      t.push({ s: s + ((e - s) * k) / cs.length, e: s + ((e - s) * (k + 1)) / cs.length, inner: k > 0 })
      ci++
    }
  }
  if (ci !== chars.length || !t.length) return null
  const fr = (sec) => Math.max(0, Math.round((sec * SR - WIN / 2) / HOP))
  const bounds = [fr(t[0].s)]
  for (let i = 1; i < t.length; i++) { bounds.push(fr(t[i].inner ? t[i].s : (t[i - 1].e + t[i].s) / 2)); if (t[i].inner) interpolated.push(i) }
  bounds.push(fr(t[t.length - 1].e))
  return { bounds, silent, source: 'word_timings', interpolated }
}

/**
 * Sample positions to cut a span [i..j) of syllables out of a clip. A boundary inside a pause is cut at the pause's
 * edges (keep up to 60 ms of the pause after the left syllable, 20 ms before the right). Returns {start, end, startEdge,
 * endEdge}: edge = 'natural' (clip start/end, keep as recorded) | 'pause' | 'joined' (mid-speech, crossfaded).
 * The recording's own lead-in and tail are kept only where the piece also opens / closes the new sentence
 * (keepStart / keepEnd); a clip-initial piece placed mid-sentence is cut at its speech onset and a clip-final piece
 * at its speech offset, so no clip's edge silence becomes a gap inside the splice.
 */
function spanSamples(al, env, i, j, nSyl, xLen, { keepStart = true, keepEnd = true } = {}) {
  const half = ms(CROSSFADE_MS / 2)
  const at = (b) => b * HOP + Math.floor(WIN / 2)
  const pauseAround = (b) => { if (!al.silent[b]) return null; let a = b, z = b; while (a > 0 && al.silent[a - 1]) a--; while (z < env.length - 1 && al.silent[z + 1]) z++; return [a, z + 1] }
  let start, startEdge, end, endEdge
  if (i === 0 && keepStart) { start = Math.max(0, at(al.bounds[0]) - ms(80)); startEdge = 'natural' }
  else if (i === 0) { start = at(al.bounds[0]) - half; startEdge = 'joined' }
  else { const p = pauseAround(al.bounds[i]); if (p) { start = Math.max(at(p[0]), at(p[1]) - ms(20)); startEdge = 'pause' } else { start = at(al.bounds[i]) - half; startEdge = 'joined' } }
  if (j === nSyl && keepEnd) { end = xLen; endEdge = 'natural' }
  else if (j === nSyl) { end = at(al.bounds[nSyl]) + half; endEdge = 'joined' }
  else { const p = pauseAround(al.bounds[j]); if (p) { end = Math.min(at(p[1]), at(p[0]) + ms(60)); endEdge = 'pause' } else { end = at(al.bounds[j]) + half; endEdge = 'joined' } }
  return { start: Math.max(0, start), end: Math.min(xLen, end), startEdge, endEdge }
}

function speechRms(x) {
  let peak = 0; for (const v of x) peak = Math.max(peak, Math.abs(v))
  const thr = peak * 10 ** (-30 / 20); let s = 0, n = 0
  for (const v of x) if (Math.abs(v) >= thr) { s += v * v; n++ }
  return n ? Math.sqrt(s / n) : 0
}

/** Join pieces; inner seams crossfaded (equal power), pause-edged seams faded and separated by a short silence. */
function joinPieces(pieces) {
  const rms = pieces.map((p) => speechRms(p.pcm)).sort((a, b) => a - b), target = rms[Math.floor(rms.length / 2)]
  const lim = 10 ** (MAX_GAIN_DB / 20)
  const xs = pieces.map((p) => { const g = Math.min(lim, Math.max(1 / lim, target / (speechRms(p.pcm) || target))); return { ...p, gainDb: 20 * Math.log10(g), pcm: Float32Array.from(p.pcm, (v) => v * g) } })
  const fade = (x, nIn, nOut) => { for (let i = 0; i < nIn && i < x.length; i++) x[i] *= Math.sin((Math.PI / 2) * (i / nIn)); for (let i = 0; i < nOut && i < x.length; i++) x[x.length - 1 - i] *= Math.sin((Math.PI / 2) * (i / nOut)) }
  // leading/trailing edges that are not the recording's own get a short fade and padding silence
  if (xs[0].startEdge !== 'natural') fade(xs[0].pcm, ms(10), 0)
  const last = xs[xs.length - 1]; if (last.endEdge !== 'natural') fade(last.pcm, 0, ms(40))
  const X = ms(CROSSFADE_MS), seams = []
  let out = xs[0].startEdge === 'natural' ? Float32Array.from(xs[0].pcm) : Float32Array.from([...new Float32Array(ms(80)), ...xs[0].pcm])
  for (let k = 1; k < xs.length; k++) {
    const b = xs[k].pcm, A = xs[k - 1], B = xs[k]
    if (A.endEdge === 'pause' || B.startEdge === 'pause') {
      // a pause seam: fade both, put a natural comma-length pause between
      const a2 = Float32Array.from(out); fade(a2, 0, ms(15)); const b2 = Float32Array.from(b); fade(b2, ms(10), 0)
      const gap = new Float32Array(ms(120))
      seams.push({ at: a2.length + gap.length / 2, kind: 'pause', from: A.text, to: B.text })
      out = Float32Array.from([...a2, ...gap, ...b2])
    } else {
      const n = Math.min(X, out.length, b.length), o = new Float32Array(out.length + b.length - n)
      o.set(out.subarray(0, out.length - n))
      for (let i = 0; i < n; i++) { const t = i / n; o[out.length - n + i] = out[out.length - n + i] * Math.cos((Math.PI / 2) * t) + b[i] * Math.sin((Math.PI / 2) * t) }
      o.set(b.subarray(n), out.length)
      seams.push({ at: out.length - Math.floor(n / 2), kind: 'crossfade', from: A.text, to: B.text })
      out = o
    }
  }
  if (last.endEdge !== 'natural') out = Float32Array.from([...out, ...new Float32Array(ms(200))])
  return { pcm: out, seams, gainsDb: xs.map((p) => Math.round(p.gainDb * 10) / 10) }
}

/** f0 by autocorrelation over a 40 ms window; null when unvoiced. */
function f0At(x, center) {
  const w = ms(40), a = Math.max(0, center - w), seg = x.subarray(a, Math.min(x.length, a + w))
  if (seg.length < w * 0.8) return null
  let e0 = 0; for (const v of seg) e0 += v * v; if (e0 < 1e-6) return null
  let best = 0, lag = 0
  for (let L = Math.floor(SR / 400); L <= Math.floor(SR / 75); L++) { let s = 0; for (let i = 0; i + L < seg.length; i++) s += seg[i] * seg[i + L]; s /= e0; if (s > best) { best = s; lag = L } }
  return best > 0.5 ? SR / lag : null
}
const rmsDb = (x, a, b) => { let s = 0; a = Math.max(0, a); b = Math.min(x.length, b); for (let i = a; i < b; i++) s += x[i] * x[i]; return db(s / Math.max(1, b - a)) }

/** clip-tail-audit.py's click metric: 2nd-difference spike vs its own ±1 ms neighbourhood, scored at [a,b). */
function spikeScore(x, a, b) {
  a = Math.max(1, a); b = Math.min(x.length - 2, b)
  const k = ms(1); let best = 1, bestDb = -180
  for (let j = a; j < b; j++) {
    const d = Math.abs(x[j + 1] - 2 * x[j] + x[j - 1]); if (d < 0.003) continue
    let s = 0, c = 0; for (let t = j - k; t <= j + k; t++) if (t !== j && t > 0 && t < x.length - 1) { s += Math.abs(x[t + 1] - 2 * x[t] + x[t - 1]); c++ }
    const sc = d / (s / c + 1e-4); if (sc > best) { best = sc; bestDb = 20 * Math.log10(d + 1e-9) }
  }
  return { spike: Math.round(best * 10) / 10, spikeDb: Math.round(bestDb) }
}

function measure(pcm, seams) {
  const joins = seams.map((s) => {
    const before = rmsDb(pcm, s.at - ms(45), s.at - ms(15)), after = rmsDb(pcm, s.at + ms(15), s.at + ms(45))
    const f1 = f0At(pcm, s.at - ms(20)), f2 = f0At(pcm, s.at + ms(60))
    const sk = spikeScore(pcm, s.at - ms(20), s.at + ms(20))
    return { ...s, atMs: Math.round((s.at * 1000) / SR), levelStepDb: Math.round((after - before) * 10) / 10,
      pitchStepSemitones: f1 && f2 ? Math.round(12 * Math.log2(f2 / f1) * 10) / 10 : null,
      ...sk, click: sk.spike >= 12 && sk.spikeDb > -50 }
  })
  let last = pcm.length - 1; while (last > 0 && Math.abs(pcm[last]) < 1e-4) last--
  const tail = spikeScore(pcm, last - ms(300), last)
  let peak = 0; for (const v of pcm) peak = Math.max(peak, Math.abs(v))
  const endAbs = Math.abs(pcm[last]) / (peak || 1)
  return { joins, tail: { ...tail, endAbs: Math.round(endAbs * 1000) / 1000, click: (tail.spike >= 12 && tail.spikeDb > -50) || endAbs >= 0.05 }, durationMs: Math.round((pcm.length * 1000) / SR) }
}


// ── provenance guard (job #340: "a lot of these really did sound like the same file") ─────────────────────────────
/**
 * Pure. A spliced row is only a splice if no piece comes from the target's own clip or from any clip whose TEXT is the
 * target text (a piece may equal the target text only when it is cut out of a LONGER sentence's clip). Throws.
 */
function assertPiecesFromOtherTexts(target, pieces, referenceRef) {
  for (const p of pieces) {
    if (p.baseId === target) throw new Error(`piece "${p.text}" of "${target}" is sourced from a clip whose text IS the target`)
    if (referenceRef && String(p.baseRef).split('.')[0] === String(referenceRef).split('.')[0]) throw new Error(`piece "${p.text}" of "${target}" is sourced from the target's own reference clip ${referenceRef}`)
  }
}
const sha256 = (buf) => require('crypto').createHash('sha256').update(buf).digest('hex')
/** Max normalised cross-correlation of two signals over lags ±maxLagMs, on a 1-in-8 decimation (≈2 kHz). 1 = same waveform. */
function waveformSimilarity(a, b, maxLagMs = 300) {
  const D = 8, da = Float64Array.from({ length: Math.floor(a.length / D) }, (_, i) => a[i * D]), db_ = Float64Array.from({ length: Math.floor(b.length / D) }, (_, i) => b[i * D])
  const mean = (x) => x.reduce((s, v) => s + v, 0) / (x.length || 1), ma = mean(da), mb = mean(db_)
  for (let i = 0; i < da.length; i++) da[i] -= ma; for (let i = 0; i < db_.length; i++) db_[i] -= mb
  const na = Math.sqrt(da.reduce((s, v) => s + v * v, 0)), nb = Math.sqrt(db_.reduce((s, v) => s + v * v, 0))
  if (!na || !nb) return 0
  const L = Math.round((maxLagMs / 1000) * (SR / D)); let best = 0
  for (let lag = -L; lag <= L; lag++) { let s = 0; for (let i = Math.max(0, -lag); i < da.length && i + lag < db_.length; i++) s += da[i] * db_[i + lag]; if (s / (na * nb) > best) best = s / (na * nb) }
  return best
}
const NEAR_IDENTICAL = 0.9
/** Pure. Verdict on a spliced file against the real recording of the same text. ok=false → the builder refuses the row. */
function hashVerdict({ splicedBytes, referenceBytes, splicedPcm, referencePcm }) {
  const v = { fileSha: sha256(splicedBytes), referenceFileSha: sha256(referenceBytes), pcmSha: sha256(Buffer.from(splicedPcm.buffer, splicedPcm.byteOffset, splicedPcm.byteLength)), referencePcmSha: sha256(Buffer.from(referencePcm.buffer, referencePcm.byteOffset, referencePcm.byteLength)), similarity: Math.round(waveformSimilarity(splicedPcm, referencePcm) * 1000) / 1000 }
  v.ok = v.fileSha !== v.referenceFileSha && v.pcmSha !== v.referencePcmSha && v.similarity < NEAR_IDENTICAL
  v.verdict = v.ok ? 'differs from whole' : 'IDENTICAL OR NEAR-IDENTICAL TO WHOLE'
  return v
}
/** Pure. Per-piece provenance for the manifest: source clip, source text, character span, seconds in the source clip. */
function pieceRecord(c, sr = SR) {
  return { text: c.text, from: c.baseId, fromSlot: c.baseSlot, fromRef: c.baseRef, sourceText: c.baseId, charStart: c.charStart, charEnd: c.charEnd,
    srcStartSec: Math.round((c.startSample / sr) * 1000) / 1000, srcEndSec: Math.round((c.endSample / sr) * 1000) / 1000 }
}

// ── I/O ─────────────────────────────────────────────────────────────────────

async function fetchClip(ref, dir) {
  const f = path.join(dir, `${ref}.mp3`)
  if (!fs.existsSync(f)) {
    const r = await fetch(`${AUDIO_DOOR}/${ref}`, { headers: { 'User-Agent': 'dice-splice-zho' } })
    if (!r.ok) throw new Error(`audio door ${r.status} for ${ref}`)
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()))
  }
  return f
}
const lufs = (f) => { const o = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], { encoding: 'utf8' }).stderr; const m = /I:\s+(-?[\d.]+) LUFS/.exec(o.split('Summary')[1] || ''); return m ? Number(m[1]) : null }

/** Unprimed whisper round-trip (single thread). Returns the heard text, normalised. */
function asr(file) {
  const wav = file.replace(/\.mp3$/, '.16k.wav')
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', file, '-ar', '16000', '-ac', '1', wav])
  const r = spawnSync(WHISPER, ['-m', WHISPER_MODEL, '-l', 'zh', '-t', '1', '-nt', '-np', '--prompt', '以下是普通话的句子。', '-f', wav], { encoding: 'utf8', env: { ...process.env, WHISPER_NO_SEMAPHORE: '0' } })
  fs.rmSync(wav, { force: true })
  return P.normText((r.stdout || '').replace(/\[.*?\]/g, ''))
}
function cer(ref, hyp) {
  const a = [...ref], b = [...hyp], d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return a.length ? d[a.length][b.length] / a.length : 0
}

// ── commands ────────────────────────────────────────────────────────────────

async function cmdPlan() {
  const course = opt('course', 'zho_for_eng')
  const d = await seedsPayload(course)
  const r = P.plan(d.seeds, { ...range(), maxPieces: Number(opt('max-pieces', 3)) })
  if (opt('json')) fs.writeFileSync(opt('json'), JSON.stringify(r, null, 1))
  const s = r.summary
  console.log(`${course} seeds ${s.range.from}-${s.range.to}: ${s.distinctTexts} distinct played target texts (${s.slots} slots per voice)`)
  console.log(`  splice up to ${s.maxPieces} pieces: ${s.renders} renders (${s.baseSeeds} seed sentences + ${s.baseExtra} other texts) + ${s.cut} single cuts + ${s.splice} splices (${s.joinsTotal} joins) — ${(s.reduction * 100).toFixed(0)}% fewer separate recordings per voice`)
  console.log(`  distinct sub-phrase units cut: ${s.distinctUnitsUsed}; pieces moved from sentence-final to non-final: ${s.piecesFromFinalUsedNonFinal}`)
}

async function cmdBundle() {
  const d = await seedsPayload(opt('course', 'zho_for_eng')), { from, to } = range()
  const a = (o) => ({ target1: o.target1_audio_id ? { id: o.target1_audio_id } : null, target2: o.target2_audio_id ? { id: o.target2_audio_id } : null })
  const b = { version: 'popty-seeds-route', legos: [], phrases: [], seeds: [] }
  for (const s of d.seeds) {
    if (s.seed_number < from || s.seed_number > to) continue
    b.seeds.push({ seedId: s.seed_id, seedNumber: s.seed_number, audio: a(s) })
    for (const l of s.legos || []) {
      b.legos.push({ legoId: l.lego_id, seedNumber: s.seed_number, audio: a(l) })
      for (const p of l.basket_phrases || []) if (p.phrase_role !== 'component') b.phrases.push({ phraseId: p.id, legoId: l.lego_id, audio: a(p) })
    }
  }
  fs.writeFileSync(opt('out'), JSON.stringify(b))
  console.log(`bundle: ${b.seeds.length} seeds, ${b.legos.length} legos, ${b.phrases.length} phrases`)
}

/**
 * The ONLY database read in this tool: the engine's word timings for the cast-voice clips audio-truth listed, by primary
 * key, through services/shared/agent-db.cjs, on whatever DATABASE_URL points at (run it on the QA copy:
 * set -a; . ~/ssi-restore/qa-copy.env; set +a). Writes {clipId: word_timings} to --out. Read-only.
 */
async function cmdTimings() {
  const truth = JSON.parse(fs.readFileSync(opt('truth'), 'utf8'))
  const ids = [...new Set(truth.rows.filter((r) => r.flag === 'ok' && /^target[12]$/.test(r.role)).map((r) => r.played_id))]
  const adb = require('../../services/shared/agent-db.cjs')
  const pg = await adb.connect()
  let rows
  try { rows = await adb.clipsById(pg, ids, { cols: 'id::text AS id, word_timings' }) } finally { await pg.end() }
  const out = {}; let have = 0
  for (const r of rows) { out[r.id] = r.word_timings || null; if (r.word_timings) have++ }
  fs.writeFileSync(opt('out'), JSON.stringify(out))
  console.log(`word timings: ${have} of ${ids.length} cast-voice clips carry them → ${opt('out')}`)
}

async function cmdBuild() {
  const course = opt('course', 'zho_for_eng'), role = opt('role', 'target1')
  const out = path.resolve(opt('out')), clipDir = path.join(out, 'clips'), voiceDir = path.join(out, role)
  fs.mkdirSync(clipDir, { recursive: true }); fs.mkdirSync(voiceDir, { recursive: true })
  const d = await seedsPayload(course), truth = JSON.parse(fs.readFileSync(opt('truth'), 'utf8'))
  const lex = P.buildLexicon(d.seeds)
  const textOf = new Map()
  for (const s of d.seeds) { textOf.set(s.seed_id, s.target_text); for (const l of s.legos || []) { textOf.set(l.lego_id, l.target_text); for (const p of l.basket_phrases || []) textOf.set(p.id, p.target_text) } }
  // cast-voice clips only: audio-truth's 'ok' = recorded voice == cast voice
  const cast = new Map()
  for (const r of truth.rows) {
    if (r.flag !== 'ok' || r.role !== role) continue
    const t = P.normText(textOf.get(r.key)); if (!t || cast.has(t)) continue
    cast.set(t, { ref: r.recorded_revision > 1 ? `${r.played_id}.v${r.recorded_revision}` : r.played_id, slot: r.key, voice: r.recorded_voice })
  }
  const ix = P.spanIndex(); for (const t of cast.keys()) ix.addBase(t, P.tokenize(t, lex))
  const wanted = String(opt('texts', '')).split(',').map(P.normText).filter(Boolean)
  const alCache = new Map()
  const timings = opt('timings') ? JSON.parse(fs.readFileSync(opt('timings'), 'utf8')) : null
  const align = async (t) => {
    if (alCache.has(t)) return alCache.get(t)
    const f = await fetchClip(cast.get(t).ref, clipDir), x = await decodeMono(fs.readFileSync(f)), env = envelope(x)
    const wt = timings ? timings[cast.get(t).ref.split('.')[0]] : null
    let al = wt ? timingBounds(wt, t, syllableBounds(env, 1).silent) : null
    if (wt && !al) console.log(`word timings do not spell ${t} — energy alignment instead`)
    if (!al && !flag('timings-only')) al = syllableBounds(env, [...t].length)
    const v = { x, env, al, file: f }; alCache.set(t, v); return v
  }
  const manifest = { course, role, castVoice: [...cast.values()][0] && [...cast.values()][0].voice, crossfadeMs: CROSSFADE_MS, made: [], dropped: [] }
  for (const t of wanted) {
    if (!cast.has(t)) { manifest.dropped.push({ text: t, why: 'no cast-voice reference clip in this role' }); continue }
    const pieces = P.cover(P.tokenize(t, lex), ix, { maxPieces: Number(opt('max-pieces', 3)), excludeId: t })
    if (!pieces) { manifest.dropped.push({ text: t, why: 'no cover from other cast-voice clips' }); continue }
    try { assertPiecesFromOtherTexts(t, pieces.map((p) => ({ ...p, baseRef: cast.get(p.baseId).ref })), cast.get(t).ref) } catch (e) { manifest.dropped.push({ text: t, why: e.message }); continue }
    const cut = []
    let bad = null
    for (const p of pieces) {
      const b = await align(p.baseId)
      if (!b.al) { bad = `alignment failed on base ${p.baseId}`; break }
      const n = [...p.baseId].length
      // cover() offsets are character offsets; one character is one syllable
      const sp = spanSamples(b.al, b.env, p.start, p.end, n, b.x.length, { keepStart: p.targetInitial, keepEnd: p.targetFinal })
      cut.push({ ...p, ...sp, charStart: p.start, charEnd: p.end, startSample: sp.start, endSample: sp.end, pcm: b.x.subarray(sp.start, sp.end), baseSlot: cast.get(p.baseId).slot, baseRef: cast.get(p.baseId).ref })
    }
    if (bad) { manifest.dropped.push({ text: t, why: bad }); continue }
    const j = joinPieces(cut)
    const slug = `${role}-${String(manifest.made.length + 1).padStart(2, '0')}`
    const wav = path.join(voiceDir, `${slug}-spliced.wav`), mp3 = path.join(voiceDir, `${slug}-spliced.mp3`)
    fs.writeFileSync(wav, encodeWav(j.pcm))
    const refFile = path.join(voiceDir, `${slug}-reference.mp3`)
    fs.copyFileSync(await fetchClip(cast.get(t).ref, clipDir), refFile)
    const target = lufs(refFile) ?? -16
    const { masterToHouseLoudness } = require('../../services/audio-processor.cjs')
    await masterToHouseLoudness(wav, mp3, target)
    const m = measure(j.pcm, j.seams)
    const refPcm = await decodeMono(fs.readFileSync(refFile)), splPcm = await decodeMono(fs.readFileSync(mp3))
    const hv = hashVerdict({ splicedBytes: fs.readFileSync(mp3), referenceBytes: fs.readFileSync(refFile), splicedPcm: splPcm, referencePcm: refPcm })
    if (!hv.ok) { manifest.dropped.push({ text: t, why: `${hv.verdict} (similarity ${hv.similarity})`, hash: hv }); console.log('REFUSE', t, hv.verdict); continue }
    const item = { id: slug, text: t, pieces: cut.map((c) => ({ ...pieceRecord(c), startEdge: c.startEdge, endEdge: c.endEdge,
      align: alCache.get(c.baseId).al.source || 'energy', finalMoved: c.baseFinal !== c.targetFinal, ms: Math.round(((c.end - c.start) * 1000) / SR) })), gainsDb: j.gainsDb, ...m,
      spliced: path.basename(mp3), reference: path.basename(refFile), referenceSlot: cast.get(t).slot, referenceRef: cast.get(t).ref, referenceLufs: target, hash: hv }
    if (flag('asr')) {
      item.asrSpliced = asr(mp3); item.asrReference = asr(refFile)
      item.cerSpliced = Math.round(cer(t, item.asrSpliced) * 100) / 100; item.cerReference = Math.round(cer(t, item.asrReference) * 100) / 100
      if (item.cerSpliced > item.cerReference + 0.15) { manifest.dropped.push({ ...item, why: `ASR heard "${item.asrSpliced}" (reference: "${item.asrReference}") — a syllable lost or gained at a cut` }); console.log('DROP', t, item.asrSpliced); continue }
    }
    fs.rmSync(wav, { force: true })
    manifest.made.push(item)
    console.log(slug, t, '=', item.pieces.map((p) => `${p.text}<${p.from}`).join(' + '), item.joins.map((x) => `[${x.kind} ${x.levelStepDb}dB ${x.pitchStepSemitones ?? '-'}st${x.click ? ' CLICK' : ''}]`).join(''), flag('asr') ? `asr:${item.asrSpliced}/${item.asrReference}` : '')
  }
  fs.writeFileSync(path.join(voiceDir, 'manifest.json'), JSON.stringify(manifest, null, 1))
  console.log(`made ${manifest.made.length}, dropped ${manifest.dropped.length} → ${voiceDir}/manifest.json`)
}

module.exports = { assertPiecesFromOtherTexts, hashVerdict, waveformSimilarity, pieceRecord, envelope, syllableBounds, timingBounds, spanSamples, joinPieces, measure, cer }
if (require.main === module) {
  const cmd = { plan: cmdPlan, bundle: cmdBundle, timings: cmdTimings, build: cmdBuild }[argv[0]]
  if (!cmd) { console.error('usage: dice-splice-zho.cjs plan|bundle|build … (see header)'); process.exit(2) }
  cmd().catch((e) => { console.error(e.stack || e.message); process.exit(1) })
}
