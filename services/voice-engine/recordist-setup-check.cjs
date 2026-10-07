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
    setup: { voiceId: row.voice_id, status: row.status, note: row.review_note || null },
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
    const [all, low, high] = await Promise.all([
      runFfmpeg(file, stat, exec),
      runFfmpeg(file, `lowpass=f=250,${stat}`, exec),
      runFfmpeg(file, `highpass=f=4000,${stat}`, exec),
    ])
    if (all === null) return null
    const a = parseAstats(all)
    const lo = low === null ? {} : parseAstats(low)
    const hi = high === null ? {} : parseAstats(high)
    const rel = (band) => (Number.isFinite(band.rms) && Number.isFinite(a.rms) ? round1(band.rms - a.rms) : null)
    return {
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

module.exports = {
  SETUP_PACK_PREFIX,
  SETUP_PHRASE_COUNT,
  isFullSetupSample,
  SETUP_STATUSES,
  packIdFor,
  packVoiceIdFor,
  voiceIdFromPackVoiceId,
  locksScript,
  pickSetupPhrases,
  packFromRow,
  measureTake,
}
