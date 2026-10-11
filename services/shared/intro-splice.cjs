/**
 * DICE AND SPLICE — build an English-known presentation intro out of Charlotte clips that already exist
 * (Tom 2026-10-11 22:51Z: "Charlotte will be mostly done … we can piece together every introduction using dice and splice").
 *
 * An intro reads  The <Base> for: 'X', as in — 'context', is:   (or the bare  The <Base> for: 'X', is:).  Every piece of it is English
 * spoken by Charlotte, and English is one language shared by every course, so the pieces very likely exist already:
 *   fragment  "The Spanish for"   one clip per BASE language (spa_mx reuses spa's — voicing-policy.introFragmentText)
 *   x         the LEGO's known text            (a known-side clip somewhere in the estate)
 *   as in     the connective                   (one clip, estate-wide)
 *   context   the seed's known sentence        (a known-side clip somewhere in the estate)
 *   is        the closing word                 (one clip, estate-wide)
 * Only a piece that exists nowhere is rendered (once, through the one render route, cached and shared); the rest are
 * looked up, fetched and joined. This file owns the parse, the plan and the join; every outside effect is a dep so the
 * whole assembly is testable without a provider, S3 or a database.
 *
 * THE JOIN (joinPcm): each piece is decoded to mono PCM, trimmed of edge silence, level-matched to the group's median
 * speech level (±6 dB at most — they are all Charlotte, so this only evens the short words), given a raised-cosine
 * fade at each end so the seam starts and ends on exact zero (no click), and set apart by silence gaps. The caller then
 * masters the whole to the house loudness exactly as a rendered clip is. Nothing is padded with tone or crossfaded.
 *
 * Voicing policy stays the gate: only the fragment may be rendered with intro:true; a whole "The X for …" is never
 * rendered, which is why this exists.
 */
const { spawn } = require('child_process')
const policy = require('./voicing-policy.cjs')

const SAMPLE_RATE = 44100
/** The silence between pieces, ms — the pause a comma gives a spoken intro. */
const GAPS_MS = Object.freeze({ afterFragment: 190, afterX: 230, afterAsIn: 140, afterContext: 230 })
const FADE_IN_MS = 4
const FADE_OUT_MS = 12
const PAD_BEFORE_MS = 8
const PAD_AFTER_MS = 40
const EDGE_THRESHOLD_DB = -42   // relative to the piece's own peak
const MAX_MATCH_GAIN_DB = 6

const DASH = '[—–-]'
const INTRO_RE = new RegExp(`^\\s*The\\s+(.+?)\\s+for:?\\s+'([\\s\\S]*)',?\\s+is:?\\s*$`, 'i')
const AS_IN_RE = new RegExp(`',?\\s+as in\\s*${DASH}?\\s*'`, 'i')

/** Parse a stored intro into its words, or null when it is not the standard shape (then it is never spliced). */
function parseIntro(text) {
  const m = INTRO_RE.exec(String(text || ''))
  if (!m) return null
  const parts = m[2].split(AS_IN_RE)
  if (parts.length > 2) return null
  const x = parts[0].trim()
  const context = parts.length === 2 ? parts[1].trim() : null
  if (!x || (parts.length === 2 && !context)) return null
  return { named: m[1], x, context }
}

/**
 * The pieces of one intro, in speaking order. `course` is the courses row; null when the course is not taught from English
 * or the text is not a standard intro. The fragment text comes from the voicing policy, never from the stored intro, so
 * spa_mx's "The Spanish for" is the one fragment whatever the stored text said.
 */
function planIntro(text, course) {
  const plan = policy.introSplicePlan(course)
  const parsed = plan && parseIntro(text)
  if (!parsed) return null
  const pieces = [{ kind: 'fragment', text: plan.fragmentText, role: 'presentation', gapAfterMs: GAPS_MS.afterFragment },
    { kind: 'x', text: parsed.x, role: 'known', gapAfterMs: parsed.context ? GAPS_MS.afterX : GAPS_MS.afterX }]
  if (parsed.context) pieces.push({ kind: 'asin', text: 'as in', role: 'known', gapAfterMs: GAPS_MS.afterAsIn }, { kind: 'context', text: parsed.context, role: 'known', gapAfterMs: GAPS_MS.afterContext })
  pieces.push({ kind: 'is', text: 'is', role: 'known', gapAfterMs: 0 })
  return { voiceId: plan.voiceId, pieces }
}

// ── the join: pure PCM maths ────────────────────────────────────────────────

const dbToGain = db => Math.pow(10, db / 20)
const msToN = ms => Math.round((ms / 1000) * SAMPLE_RATE)

/** Cut leading/trailing silence, keeping a short pad before and a natural tail after. */
function trimEdges(x) {
  let peak = 0
  for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]))
  if (peak === 0) return x.slice(0, 0)
  const thr = peak * dbToGain(EDGE_THRESHOLD_DB)
  let a = 0, b = x.length - 1
  while (a < x.length && Math.abs(x[a]) < thr) a++
  while (b > a && Math.abs(x[b]) < thr) b--
  return x.slice(Math.max(0, a - msToN(PAD_BEFORE_MS)), Math.min(x.length, b + 1 + msToN(PAD_AFTER_MS)))
}

/** RMS of the speech part (samples above the edge threshold), so silence does not drag a short word down. */
function speechRms(x) {
  let peak = 0
  for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]))
  const thr = peak * dbToGain(EDGE_THRESHOLD_DB)
  let s = 0, n = 0
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) >= thr) { s += x[i] * x[i]; n++ }
  return n ? Math.sqrt(s / n) : 0
}

/** Raised-cosine fades so the piece begins and ends on exactly zero. In place. */
function fadeEnds(x, inMs = FADE_IN_MS, outMs = FADE_OUT_MS) {
  const nIn = Math.min(msToN(inMs), Math.floor(x.length / 2)), nOut = Math.min(msToN(outMs), Math.floor(x.length / 2))
  for (let i = 0; i < nIn; i++) x[i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / nIn)
  for (let i = 0; i < nOut; i++) x[x.length - 1 - i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / nOut)
  if (x.length) { x[0] = 0; x[x.length - 1] = 0 }
  return x
}

/**
 * Join decoded mono pieces (Float32Array each, SAMPLE_RATE) into one. gapsAfterMs[i] is the silence after piece i.
 * Returns { pcm, seams: [{at, len}] } where seams mark each join so a test (or a human) can inspect them.
 */
function joinPcm(pieces, gapsAfterMs) {
  const trimmed = pieces.map(p => trimEdges(Float32Array.from(p)))
  if (trimmed.some(p => p.length === 0)) throw new Error('a piece is silent — refusing to splice an empty clip')
  const rms = trimmed.map(speechRms).sort((a, b) => a - b)
  const target = rms[Math.floor(rms.length / 2)]
  const max = dbToGain(MAX_MATCH_GAIN_DB)
  trimmed.forEach(p => {
    const own = speechRms(p)
    const g = Math.min(max, Math.max(1 / max, target / own))
    for (let i = 0; i < p.length; i++) p[i] *= g
    fadeEnds(p)
  })
  const gaps = trimmed.map((_, i) => (i < trimmed.length - 1 ? msToN(gapsAfterMs[i] || 0) : 0))
  const total = trimmed.reduce((n, p, i) => n + p.length + gaps[i], 0)
  const pcm = new Float32Array(total), seams = []
  let at = 0
  trimmed.forEach((p, i) => {
    pcm.set(p, at); at += p.length
    if (i < trimmed.length - 1) { seams.push({ at, len: gaps[i] }); at += gaps[i] }
  })
  return { pcm, seams }
}

/** A float32 mono WAV the existing mastering chain can read. */
function encodeWav(pcm) {
  const data = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength)
  const h = Buffer.alloc(44)
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12)
  h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SAMPLE_RATE, 24)
  h.writeUInt32LE(SAMPLE_RATE * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(32, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40)
  return Buffer.concat([h, data])
}

/** Decode any audio buffer to mono float PCM at SAMPLE_RATE. */
function decodeMono(buf) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'f32le', '-ac', '1', '-ar', String(SAMPLE_RATE), 'pipe:1'])
    const out = [], err = []
    ff.stdout.on('data', d => out.push(d)); ff.stderr.on('data', d => err.push(d))
    ff.on('error', reject)
    ff.on('close', code => {
      if (code !== 0) return reject(new Error(`ffmpeg decode failed: ${Buffer.concat(err).toString().slice(0, 200)}`))
      const b = Buffer.concat(out)
      resolve(new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length - (b.length % 4))))
    })
    ff.stdin.on('error', () => {})
    ff.stdin.end(buf)
  })
}

// ── the assembly ────────────────────────────────────────────────────────────

/**
 * Build one intro by dice and splice.
 * @param {{text:string, course:object, courseCode:string, legoId?:string|null, dryRun?:boolean}} req
 * @param {object} deps
 *   findClip(text) → { id, s3_key } | null    a Charlotte English clip of exactly these words, anywhere in the estate
 *   renderPiece({text, role}) → { audioId, s3Key }   render one missing piece through the ONE route (only ever called for a miss)
 *   fetchObject(s3Key) → Buffer
 *   master(wavBuffer, text) → { buffer, durationMs }  the house mastering chain
 *   store({courseCode, text, legoId, buffer, durationMs, splicedFrom}) → { audioId, s3Key }
 * @returns null when the text is not a spliceable intro; else { source:'spliced'|'would-splice', pieces, missing, charsSpent, ... }
 */
async function spliceIntro(req, deps) {
  const plan = planIntro(req.text, req.course)
  if (!plan) return null
  const found = []
  for (const p of plan.pieces) found.push({ ...p, clip: await deps.findClip(p.text) })
  const missing = found.filter(p => !p.clip)
  if (req.dryRun) {
    return { ok: true, source: 'would-splice', dryRun: true, pieces: found.map(p => ({ kind: p.kind, text: p.text, reused: !!p.clip })), missing: missing.map(p => p.text),
      wouldSpendChars: missing.reduce((n, p) => n + p.text.length, 0), charsSpent: 0 }
  }
  let charsSpent = 0
  for (const p of missing) {
    const r = await deps.renderPiece({ text: p.text, role: p.role })
    if (!r || !r.audioId) throw new Error(`could not render the missing piece "${p.text}" — intro not spliced`)
    p.clip = { id: r.audioId, s3_key: r.s3Key }
    charsSpent += r.charsSpent != null ? r.charsSpent : p.text.length
  }
  const pcms = []
  for (const p of found) pcms.push(await decodeMono(await deps.fetchObject(p.clip.s3_key)))
  const { pcm } = joinPcm(pcms, found.map(p => p.gapAfterMs))
  const mastered = await deps.master(encodeWav(pcm), req.text)
  const splicedFrom = found.map(p => ({ kind: p.kind, text: p.text, audio_id: p.clip.id, rendered_now: missing.includes(p) }))
  const stored = await deps.store({ courseCode: req.courseCode, text: req.text, legoId: req.legoId || null, buffer: mastered.buffer, durationMs: mastered.durationMs, splicedFrom })
  return { ok: true, source: 'spliced', charsSpent, durationMs: mastered.durationMs, ...stored, pieces: splicedFrom.map(({ kind, text, audio_id, rendered_now }) => ({ kind, text, audioId: audio_id, reused: !rendered_now })) }
}

module.exports = { parseIntro, planIntro, spliceIntro, joinPcm, trimEdges, fadeEnds, encodeWav, decodeMono, GAPS_MS, SAMPLE_RATE }
