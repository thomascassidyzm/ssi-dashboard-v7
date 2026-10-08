/**
 * recordist-setup-check.cjs — the 10-phrase SETUP CHECK every voice artist
 * submits before the full script is open to them (Tom's ruling
 * r-2026-10-07-every-voice-artist-submits-a-10; job #838).
 *
 * HOW IT RIDES THE EXISTING SURFACE. A setup check is a per-artist RECORDING
 * PACK (clone-source-pack.cjs): ten real lines of THEIR OWN script, read on the
 * ordinary booth screen at /r/pack-setup-<voiceId>, stored as raw bytes under
 * clone-source/setup-<voiceId>/ and never touching course_audio or any slot.
 * Using their own script, rather than a canned paragraph, is the point: the
 * sample is read the way the real session will be read, on the setup the real
 * session will use.
 *
 * ONE ROW PER ARTIST (recordist_setup_checks). Row present and status <>
 * 'approved' = the full script is locked for that artist (the take route
 * answers 423; the booth shows the setup card instead of Start). The row is
 * created by an admin; the artist submits; an admin approves or asks again.
 *
 *   open → submitted → approved | changes → (any new take) open → ...
 *
 * THE DEVICE comes from the existing per-take capture: the booth already sends
 * the microphone label, capture profile, constraints it got and the browser,
 * and recordPackTake hands that string to us per take.
 *
 * MEASUREMENTS are ffmpeg astats on the stored bytes — peak, loudness, the
 * quietest stretch (noise floor) and the bass and treble weight — computed at
 * review time, so they cost nothing until somebody looks.
 */

'use strict'

const { spawn } = require('child_process')
const { writeFile, unlink, mkdtemp } = require('fs/promises')
const os = require('os')
const path = require('path')
const { extForMime } = require('./clone-source-store.cjs')

const SETUP_PACK_PREFIX = 'pack-setup-'
const SETUP_PHRASE_COUNT = 10
// Tom 2026-10-07 (#848): "It should accept anything past 5 phrases." The pack is still
// TEN lines; Submit needs only this many takes. The client mirrors it (RecordistRoom.vue).
const SETUP_MIN_SUBMIT = 5
const SETUP_STATUSES = Object.freeze(['open', 'submitted', 'approved', 'changes'])

const packIdFor = (voiceId) => `setup-${voiceId}`
const packVoiceIdFor = (voiceId) => `${SETUP_PACK_PREFIX}${voiceId}`
const voiceIdFromPackVoiceId = (pv) => (typeof pv === 'string' && pv.startsWith(SETUP_PACK_PREFIX) ? pv.slice(SETUP_PACK_PREFIX.length) : null)

/** The script is locked for this artist while a check exists and is not approved. */
const locksScript = (row) => !!row && row.status !== 'approved'

/**
 * Ten lines spread across the artist's own script: sorted by length and taken at
 * even quantiles, so the sample holds a short line, a long line and everything
 * between — what a setup actually has to cope with. Lines too short or too long
 * to be a fair read are left out first. Pure.
 */
/** A setup check is TEN phrases or it is not created: 3-9 lines is not the agreed sample (job #844). */
function isFullSetupSample(phrases) { return Array.isArray(phrases) && phrases.length >= SETUP_PHRASE_COUNT }

/** How many takes a submit is still short of SETUP_MIN_SUBMIT (0 = may submit). Pure. */
function setupSubmitShortfall(takenCount) { return Math.max(0, SETUP_MIN_SUBMIT - (takenCount || 0)) }

function pickSetupPhrases(lines, count = SETUP_PHRASE_COUNT) {
  const seen = new Set()
  const usable = []
  for (const l of lines || []) {
    const text = String(l.text || '').trim()
    if (!text || seen.has(text)) continue
    seen.add(text)
    if (text.length >= 18 && text.length <= 160) usable.push({ id: null, text })
  }
  usable.sort((a, b) => a.text.length - b.text.length || a.text.localeCompare(b.text))
  if (usable.length <= count) return usable.map((p, i) => ({ id: `p${String(i + 1).padStart(2, '0')}`, text: p.text }))
  const out = []
  for (let i = 0; i < count; i += 1) {
    out.push(usable[Math.round((i * (usable.length - 1)) / (count - 1))])
  }
  return out.map((p, i) => ({ id: `p${String(i + 1).padStart(2, '0')}`, text: p.text }))
}

/** What the ARTIST may see of the automatic verdict: pass/retry and the hints, only while the check waits on us. */
function artistVerdict(row) {
  const v = row && row.status === 'submitted' && row.metrics && row.metrics.verdict
  // 'unmeasured' (and legacy stored pass-with-nothing-judged) is never shown: no false "sounds good".
  const measured = v && v.verdict !== 'unmeasured' && v.judged !== 0
  return measured ? { verdict: v.verdict, reasons: v.reasons || [] } : null
}

/** The pack object clone-source's surface code understands. */
function packFromRow(row, { displayName, languageName } = {}) {
  const phrases = Array.isArray(row.phrases) ? row.phrases : []
  return {
    id: packIdFor(row.voice_id),
    voiceId: packVoiceIdFor(row.voice_id),
    displayName: displayName || row.voice_id,
    title: 'Setup check — 10 phrases',
    autoAdvance: true,
    language: row.language,
    languageName: languageName || row.language,
    setup: { voiceId: row.voice_id, status: row.status, note: row.review_note || null, autoVerdict: artistVerdict(row) },
    items: phrases.map((p, i) => ({
      id: p.id,
      order: i + 1,
      title: `Phrase ${i + 1} of ${phrases.length}`,
      text: p.text,
      note: 'Read it the way you will read the real script, on the setup you will really use.',
      maxSeconds: 60,
    })),
  }
}

function parseAstats(stderr) {
  // The "Overall" block is last; take the final occurrence of each key.
  const last = (re) => { const m = [...stderr.matchAll(re)]; return m.length ? parseFloat(m[m.length - 1][1]) : null }
  return {
    peak: last(/Peak level dB:\s*(-?[\d.]+|-inf)/g),
    rms: last(/RMS level dB:\s*(-?[\d.]+|-inf)/g),
    trough: last(/RMS t(?:r|hr)ough dB:\s*(-?[\d.]+|-inf)/g),
  }
}

function runFfmpeg(file, filter, exec = spawn) {
  return new Promise((resolve) => {
    const p = exec('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', filter, '-f', 'null', '-'])
    let err = ''
    p.stderr && p.stderr.on('data', (d) => { err += d })
    p.on('error', () => resolve(null))
    p.on('close', () => resolve(err))
  })
}

const round1 = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : null)

// ── THE AUTOMATIC VERDICT (job #435, Tom 2026-10-08) ─────────────────────────
// "work out if the general waveform shape and the signal-to-noise ratio was good,
// we could then say, 'Yep, this is fine.'" Two outcomes only: pass, or try again
// with ONE plain hint. A false fail irritates someone doing us a favour; a false
// pass is seen by the admin anyway -> every threshold below sits well clear of the
// worst ACCEPTED take, and ambiguity resolves to pass.
//
// CALIBRATED 2026-10-08 on the RAW stored bytes (webm/opus, as the booth uploads
// them -- the same bytes a setup check holds) of 63 real accepted takes:
//   Dan   (human_dan_cym_s, latest 24, iPhone, NS off / AGC off / EC on)
//   Aran  (human_aran_cym_n, 13, Blue Snowball USB, NS on / AGC on)
//   Catrin(human_catrinlliar_cym_n, 18) and Tom's 8 test takes on the Phone? settings
//   (human_tom_zzz, 2026-10-08 ~11:02Z). Tom: Aran's and Dan's are "absolutely fine".
// Observed per-take distributions (min / median / max), 20 ms RMS windows, 16 kHz mono:
//   floorDb  (10th-percentile window)      Aran -100/-83/-80  Dan -94/-92/-84  Catrin -90/-87/-83  Tom -120/-120/-120
//   speechDb (loudest 500 ms)              Aran -23/-16/-10   Dan -21/-17/-16  Catrin -16/-14/-6   Tom -20/-16/-13
//   cleanSnrDb (speech - floor)            Aran 61/67/90      Dan 67/74/76     Catrin 70/74/77    Tom 100/104/107
//   clipFrac (% of samples >= 0.99 FS)     all 0 except Catrin max 0.021, Tom max 0.011
// The hard floor of the evidence: the booth uploads opus, which gates silence, so a
// quiet-room floor reads -80 or lower and a RAW take can only reveal rooms that are
// clearly noisy. That is the intent -- the check catches the clear cases.
// NOT in the verdict (accepted takes break them, so they would false-fail): lead/trail
// silence (Dan has takes that start at 0.00 s or end at 0.00 s), digital-silence gating
// (opus gates 40-60% of windows in Dan's own accepted takes) and level pumping. They are
// measured and shown to the admin only.
const SETUP_VERDICT = Object.freeze({
  /** Floor louder than this = a noisy room. Worst accepted: -80. */
  NOISE_FLOOR_MAX_DB: -60,
  /** Speech less than this far above the floor = noisy or far. Worst accepted: 61. */
  CLEAN_SNR_MIN_DB: 45,
  /** Loudest half-second quieter than this = too far from the mic. Worst accepted: -23. */
  SPEECH_MIN_DB: -32,
  /** More than this % of samples at full scale = audible clipping. Worst accepted: 0.021. */
  CLIP_FRAC_MAX_PCT: 0.1,
  /** A problem counts only if it recurs: this share of the measured takes, and at least MIN_TAKES of them. */
  RECURS_SHARE: 0.3,
  RECURS_MIN_TAKES: 2,
})
const MEASURE_VERSION = 2

const SETUP_HINTS = Object.freeze({
  clipping: 'Your voice is clipping: speak a touch quieter or move back slightly.',
  noise: 'A bit too much background noise: try a quieter room.',
  far: 'Quite far from the mic: try a little closer.',
})

const FLOOR_WINDOW = 320 // 20 ms at 16 kHz

/**
 * Waveform health of one take from its decoded samples (mono floats, -1..1). Pure.
 * floorDb is the 10th-percentile 20 ms window; speechDb the mean power of the loudest
 * 25 windows (500 ms) -- a one-word take still has half a second of voice.
 */
function analyseSamples(x, rate = 16000) {
  const w = Math.max(1, Math.round(rate * 0.02))
  const n = Math.floor(x.length / w)
  if (n < 10) return null
  let clipped = 0
  for (let i = 0; i < x.length; i += 1) if (Math.abs(x[i]) >= 0.99) clipped += 1
  const tr = new Array(n)
  for (let k = 0; k < n; k += 1) {
    let sum = 0
    for (let i = 0; i < w; i += 1) { const v = x[k * w + i]; sum += v * v }
    tr[k] = 10 * Math.log10(sum / w + 1e-12)
  }
  const sorted = [...tr].sort((a, b) => a - b)
  const floorDb = sorted[Math.floor(0.1 * (n - 1))]
  const top = sorted.slice(-Math.min(25, n))
  const speechDb = 10 * Math.log10(top.reduce((a, v) => a + 10 ** (v / 10), 0) / top.length)
  const active = speechDb - 25
  const first = tr.findIndex((v) => v > active)
  let last = -1
  for (let k = n - 1; k >= 0; k -= 1) if (tr[k] > active) { last = k; break }
  return {
    floorDb: round1(floorDb),
    speechDb: round1(speechDb),
    cleanSnrDb: round1(speechDb - floorDb),
    clipFracPct: Math.round((1000 * clipped) / x.length) / 10,
    clippedSamples: clipped,
    leadSec: first < 0 ? null : Math.round(first * 2) / 100,
    trailSec: last < 0 ? null : Math.round((n - 1 - last) * 2) / 100,
    gatedShare: Math.round((100 * tr.filter((v) => v < -85).length) / n) / 100,
  }
}

function decodeMono16k(file, exec = spawn) {
  return new Promise((resolve) => {
    const p = exec('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'])
    const chunks = []
    p.stdout && p.stdout.on('data', (d) => chunks.push(d))
    p.on('error', () => resolve(null))
    p.on('close', () => {
      const buf = Buffer.concat(chunks)
      const len = Math.floor(buf.length / 4)
      if (!len) return resolve(null)
      const out = new Float32Array(len)
      for (let i = 0; i < len; i += 1) out[i] = buf.readFloatLE(i * 4)
      resolve(out)
    })
  })
}

/**
 * Judge the setup takes. Input: measures by phrase id (or an array) as measureTake
 * returns them. Output {verdict:'pass'|'retry'|'unmeasured', reasons:[plain recordist lines],
 * perTake:[{id, flags:[...]}] , judged}. Takes with no new-style numbers are not
 * judged (unmeasurable is never failed), and fewer than RECURS_MIN_TAKES judged takes
 * is 'unmeasured' (never a pass: nothing was checked). Pure.
 */
function judgeSetupCheck(measuresByPhrase, T = SETUP_VERDICT) {
  const entries = Array.isArray(measuresByPhrase)
    ? measuresByPhrase.map((m, i) => [m && m.id != null ? m.id : String(i), m])
    : Object.entries(measuresByPhrase || {})
  const perTake = []
  const counts = { clipping: 0, noise: 0, far: 0 }
  for (const [id, m] of entries) {
    if (!m || !Number.isFinite(m.speechDb) || !Number.isFinite(m.floorDb)) continue
    const flags = []
    if (Number.isFinite(m.clipFracPct) && m.clipFracPct > T.CLIP_FRAC_MAX_PCT) flags.push('clipping')
    if (m.floorDb > T.NOISE_FLOOR_MAX_DB || m.cleanSnrDb < T.CLEAN_SNR_MIN_DB) flags.push('noise')
    if (m.speechDb < T.SPEECH_MIN_DB) flags.push('far')
    for (const f of flags) counts[f] += 1
    perTake.push({ id, flags })
  }
  const judged = perTake.length
  const needed = Math.max(T.RECURS_MIN_TAKES, Math.ceil(T.RECURS_SHARE * judged))
  const reasons = []
  for (const key of ['clipping', 'noise', 'far']) {
    if (judged >= T.RECURS_MIN_TAKES && counts[key] >= needed) reasons.push(SETUP_HINTS[key])
  }
  if (judged < T.RECURS_MIN_TAKES) return { verdict: 'unmeasured', reasons: [], perTake, judged }
  return { verdict: reasons.length ? 'retry' : 'pass', reasons, perTake, judged }
}

/**
 * Level, noise and tone of one take. Null fields where ffmpeg could not say —
 * an unmeasurable take is shown unmeasured, never failed.
 *   levelDb   overall RMS (speech sits around -20 to -14 dBFS when healthy)
 *   peakDb    loudest sample (above -1 means it clipped)
 *   noiseDb   RMS of the quietest 50ms stretch — the room/mic floor
 *   snrDb     levelDb - noiseDb, the headline "how clean is it"
 *   bassDb    RMS below 250 Hz relative to overall (rumble / proximity boom)
 *   trebleDb  RMS above 4 kHz relative to overall (air, or hiss)
 */
async function measureTake(buffer, mimeType, { exec = spawn } = {}) {
  let dir = null
  let file = null
  try {
    dir = await mkdtemp(path.join(os.tmpdir(), 'setup-check-'))
    file = path.join(dir, `take.${extForMime(mimeType)}`)
    await writeFile(file, buffer)
    const stat = 'astats=measure_perchannel=none:measure_overall=Peak_level+RMS_level+RMS_trough'
    const [all, low, high, pcm] = await Promise.all([
      runFfmpeg(file, stat, exec),
      runFfmpeg(file, `lowpass=f=250,${stat}`, exec),
      runFfmpeg(file, `highpass=f=4000,${stat}`, exec),
      decodeMono16k(file, exec),
    ])
    if (all === null) return null
    const a = parseAstats(all)
    const lo = low === null ? {} : parseAstats(low)
    const hi = high === null ? {} : parseAstats(high)
    const rel = (band) => (Number.isFinite(band.rms) && Number.isFinite(a.rms) ? round1(band.rms - a.rms) : null)
    const wave = pcm ? analyseSamples(pcm) : null
    return {
      v: MEASURE_VERSION,
      ...(wave || {}),
      levelDb: round1(a.rms),
      peakDb: round1(a.peak),
      noiseDb: round1(a.trough),
      snrDb: Number.isFinite(a.rms) && Number.isFinite(a.trough) ? round1(a.rms - a.trough) : null,
      bassDb: rel(lo),
      trebleDb: rel(hi),
    }
  } catch {
    return null
  } finally {
    if (file) await unlink(file).catch(() => {})
  }
}

/**
 * What a take arriving on a setup pack does to the check's status. A take that
 * lands AFTER Submit (a queued upload finishing late) is attached to the check
 * but must never silently reset it: the artist was told "Submitted" (review
 * #854). Only a check the admin sent back for changes reopens, because the
 * artist is then re-recording on purpose. Approved is untouched.
 */
function statusAfterTake(status) {
  return status === 'changes' ? 'open' : status
}

module.exports = {
  statusAfterTake,
  SETUP_PACK_PREFIX,
  SETUP_PHRASE_COUNT,
  SETUP_MIN_SUBMIT,
  setupSubmitShortfall,
  isFullSetupSample,
  SETUP_STATUSES,
  packIdFor,
  packVoiceIdFor,
  voiceIdFromPackVoiceId,
  locksScript,
  pickSetupPhrases,
  packFromRow,
  measureTake,
  analyseSamples,
  artistVerdict,
  judgeSetupCheck,
  SETUP_VERDICT,
  SETUP_HINTS,
  MEASURE_VERSION,
}
