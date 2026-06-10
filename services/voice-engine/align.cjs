/**
 * voice-engine/align.cjs — ALIGN: chop a recorded phrase take into its LEGO
 * chunks using the chunksString pause boundaries.
 *
 * Zero-ML slow-gap logic ported from tools/recording-optimizer/align-audio.cjs
 * (aeneas / whisper are NOT available on this host and are NOT dependencies).
 *
 * Model (keystone doc, decision 5):
 *   - The recording script interleaves natural + slow takes per phrase.
 *   - Alignment runs on the SLOW take (the speaker pauses between LEGO
 *     chunks, so ffmpeg silencedetect finds the boundaries — no ML).
 *   - The spliced output assembles NATURAL chunks, so segments are cut from
 *     the natural take. Boundaries for the natural take come from:
 *       1. direct slow-gap detection on the natural take when the speaker's
 *          natural micro-pauses happen to match the chunk count, else
 *       2. proportional transfer of the slow take's voiced-duration ratios
 *          onto the natural take's voiced span (zero-ML; see
 *          transferBoundaries).
 *     If neither take aligns, the phrase is flagged for re-record — we never
 *     guess a chunk map (chunk-count mismatch is the QA gate).
 *
 * Boundary math is pure and unit-tested; ffmpeg calls are isolated and use
 * spawned arg-arrays (no shell interpolation). Encoding always goes through
 * services/audio-processor.cjs#ffmpegFilterToLameMp3 (the iOS-safe
 * ffmpeg→lame pipe — never ffmpeg's mp3 muxer).
 */

const { spawn } = require('child_process')
const path = require('path')

const DEFAULTS = {
  SILENCE_DB: -35,        // ffmpeg silencedetect threshold
  SILENCE_MIN_MS: 150,    // minimum silence between chunks (slow-gap mode)
  MIN_VOICED_MS: 60,      // discard voiced regions shorter than this
  SEGMENT_PADDING_MS: 20, // pad extracted chunk clips by N ms each side
}

// ---------------------------------------------------------------------------
// ffmpeg / ffprobe wrappers (effectful)
// ---------------------------------------------------------------------------

function runProcess(cmd, args, { collect = 'stdout' } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args)
    let out = ''
    let err = ''
    child.stdout.on('data', d => { out += d.toString() })
    child.stderr.on('data', d => { err += d.toString() })
    child.on('error', reject)
    child.on('close', (code) => {
      // ffmpeg silencedetect writes to stderr and exits 0; some invocations
      // intentionally read stderr. Callers decide what they need.
      resolve({ code, stdout: out, stderr: err })
    })
  })
}

/** Audio duration in milliseconds via ffprobe. */
async function getAudioDurationMs(audioPath) {
  const { code, stdout, stderr } = await runProcess('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    audioPath,
  ])
  if (code !== 0) throw new Error(`ffprobe failed (${code}): ${stderr.slice(-300)}`)
  const seconds = parseFloat(stdout.trim())
  if (!Number.isFinite(seconds)) throw new Error(`ffprobe returned no duration for ${path.basename(audioPath)}`)
  return Math.round(seconds * 1000)
}

/**
 * ffmpeg silencedetect → array of { startMs, endMs } silence spans.
 */
async function detectSilenceSpans(audioPath, opts = {}) {
  const silenceDb = opts.silenceDb ?? DEFAULTS.SILENCE_DB
  const silenceMinMs = opts.silenceMinMs ?? DEFAULTS.SILENCE_MIN_MS
  const { stderr, stdout } = await runProcess('ffmpeg', [
    '-i', audioPath,
    '-af', `silencedetect=noise=${silenceDb}dB:d=${silenceMinMs / 1000}`,
    '-f', 'null', '-',
  ])
  return parseSilenceOutput(stderr + '\n' + stdout)
}

/** Parse ffmpeg silencedetect output (pure, testable). */
function parseSilenceOutput(text) {
  const spans = []
  let currentStart = null
  for (const line of text.split('\n')) {
    const startMatch = line.match(/silence_start:\s*(-?[\d.]+)/)
    const endMatch = line.match(/silence_end:\s*(-?[\d.]+)/)
    if (startMatch) currentStart = Math.round(parseFloat(startMatch[1]) * 1000)
    if (endMatch && currentStart !== null) {
      spans.push({ startMs: Math.max(0, currentStart), endMs: Math.round(parseFloat(endMatch[1]) * 1000) })
      currentStart = null
    }
  }
  return spans
}

// ---------------------------------------------------------------------------
// Boundary math (pure)
// ---------------------------------------------------------------------------

/**
 * Invert silence spans into voiced regions over [0, durationMs].
 * Regions shorter than minVoicedMs (clicks, breaths) are discarded.
 */
function invertSilenceSpans(durationMs, silenceSpans, minVoicedMs = DEFAULTS.MIN_VOICED_MS) {
  const voiced = []
  let cursor = 0
  for (const s of silenceSpans) {
    if (s.startMs > cursor) voiced.push({ startMs: cursor, endMs: s.startMs })
    cursor = Math.max(cursor, s.endMs)
  }
  if (cursor < durationMs) voiced.push({ startMs: cursor, endMs: durationMs })
  return voiced.filter(r => (r.endMs - r.startMs) >= minVoicedMs)
}

/**
 * Map voiced regions 1:1 onto expected chunk texts.
 * Count mismatch → { ok: false } — the natural QA gate. Never guess.
 */
function mapVoicedToChunks(voicedRegions, expectedChunks, method = 'slow-gap') {
  if (voicedRegions.length !== expectedChunks.length) {
    return {
      ok: false,
      reason: `chunk-count mismatch — expected ${expectedChunks.length}, detected ${voicedRegions.length} voiced regions`,
      expectedCount: expectedChunks.length,
      detectedCount: voicedRegions.length,
      voiced: voicedRegions,
    }
  }
  return {
    ok: true,
    chunks: voicedRegions.map((r, i) => ({
      text: expectedChunks[i],
      startMs: r.startMs,
      endMs: r.endMs,
      durationMs: r.endMs - r.startMs,
      confidence: 1.0,
      method,
    })),
  }
}

/**
 * Transfer slow-take chunk boundaries onto a continuous natural take by
 * voiced-duration proportion (zero-ML).
 *
 * The slow take's inter-chunk gaps are dropped; each chunk's share of the
 * total VOICED time maps linearly onto the natural take's voiced span
 * [naturalStartMs, naturalEndMs] (lead/tail silence already trimmed by the
 * caller). Speech-rate is assumed to scale roughly uniformly between the two
 * takes — an approximation, flagged as such in the output (method:
 * 'transferred').
 */
function transferBoundaries(slowChunks, naturalStartMs, naturalEndMs) {
  if (!slowChunks?.length) throw new Error('transferBoundaries: no slow chunks')
  if (!(naturalEndMs > naturalStartMs)) throw new Error('transferBoundaries: empty natural span')

  const totalVoiced = slowChunks.reduce((sum, c) => sum + (c.endMs - c.startMs), 0)
  if (totalVoiced <= 0) throw new Error('transferBoundaries: slow take has no voiced time')

  const span = naturalEndMs - naturalStartMs
  const out = []
  let cumulative = 0
  for (const c of slowChunks) {
    const startFrac = cumulative / totalVoiced
    cumulative += (c.endMs - c.startMs)
    const endFrac = cumulative / totalVoiced
    out.push({
      text: c.text,
      startMs: Math.round(naturalStartMs + startFrac * span),
      endMs: Math.round(naturalStartMs + endFrac * span),
      confidence: 0.5, // proportional estimate, not detected
      method: 'transferred',
    })
  }
  for (const c of out) c.durationMs = c.endMs - c.startMs
  return out
}

// ---------------------------------------------------------------------------
// Take-level alignment (effectful)
// ---------------------------------------------------------------------------

/**
 * Slow-gap align one take: silence detection → voiced regions → 1:1 chunk map.
 * Returns { ok, chunks } or { ok: false, reason, expectedCount, detectedCount }.
 */
async function alignSlowGapTake(audioPath, expectedChunks, opts = {}) {
  const durationMs = await getAudioDurationMs(audioPath)
  const silences = await detectSilenceSpans(audioPath, opts)
  const voiced = invertSilenceSpans(durationMs, silences, opts.minVoicedMs ?? DEFAULTS.MIN_VOICED_MS)
  return mapVoicedToChunks(voiced, expectedChunks)
}

/**
 * Align a slow/natural take pair for one phrase.
 *
 * @param {object} args
 * @param {string} args.slowPath - local path of the slow take (required)
 * @param {string|null} args.naturalPath - local path of the natural take
 * @param {string[]} args.expectedChunks - chunk texts (from chunksString)
 * @returns {Promise<object>} {
 *   ok, failure?,
 *   cutPath, cadence ('natural'|'slow'), chunks, naturalMethod, slowChunks
 * }
 */
async function alignTakePair({ slowPath, naturalPath = null, expectedChunks, opts = {} }) {
  if (!slowPath) throw new Error('alignTakePair: slowPath required (alignment runs on the slow take)')
  if (!expectedChunks?.length) throw new Error('alignTakePair: expectedChunks required')

  // 1. Align the slow take — the authoritative chunk map + QA gate.
  const slow = await alignSlowGapTake(slowPath, expectedChunks, opts)
  if (!slow.ok) {
    return { ok: false, failure: { stage: 'slow-align', ...slow } }
  }

  // No natural take uploaded: cut from the slow take, cadence 'slow'.
  // Downstream the splicer only ever uses these in an ALL-slow phrase —
  // cadence never mixes within one spliced phrase.
  if (!naturalPath) {
    return { ok: true, cutPath: slowPath, cadence: 'slow', chunks: slow.chunks, naturalMethod: null, slowChunks: slow.chunks }
  }

  // 2. Try direct slow-gap on the natural take (speakers often retain
  //    micro-pauses at chunk boundaries). If the count matches, those
  //    boundaries are real — use them.
  const naturalDirect = await alignSlowGapTake(naturalPath, expectedChunks, opts)
  if (naturalDirect.ok) {
    return {
      ok: true,
      cutPath: naturalPath,
      cadence: 'natural',
      chunks: naturalDirect.chunks,
      naturalMethod: 'direct',
      slowChunks: slow.chunks,
    }
  }

  // 3. Proportional transfer from the slow alignment onto the natural take's
  //    voiced span (trim lead/tail silence first).
  const naturalDurationMs = await getAudioDurationMs(naturalPath)
  const naturalSilences = await detectSilenceSpans(naturalPath, opts)
  const naturalVoiced = invertSilenceSpans(naturalDurationMs, naturalSilences, opts.minVoicedMs ?? DEFAULTS.MIN_VOICED_MS)
  if (!naturalVoiced.length) {
    return { ok: false, failure: { stage: 'natural-voiced-span', reason: 'no voiced audio detected in natural take' } }
  }
  const spanStart = naturalVoiced[0].startMs
  const spanEnd = naturalVoiced[naturalVoiced.length - 1].endMs
  const chunks = transferBoundaries(slow.chunks, spanStart, spanEnd)
  return {
    ok: true,
    cutPath: naturalPath,
    cadence: 'natural',
    chunks,
    naturalMethod: 'transferred',
    slowChunks: slow.chunks,
  }
}

// ---------------------------------------------------------------------------
// Segment cutting (effectful)
// ---------------------------------------------------------------------------

/**
 * Cut aligned chunks out of a take into per-chunk MP3 files.
 *
 * Filenames are OPAQUE (index-based) — identity travels in the returned
 * objects and ultimately in DB/manifest ids, never in filenames (the old
 * Latin-only safeFilename collapsed Cyrillic chunk text to underscores).
 * Encoding via ffmpeg→lame (iOS-safe), atrim sample-accurate, mirroring
 * phase8-audio-v13.cjs#spliceAudio.
 *
 * @returns {Promise<Array<{index, text, startMs, endMs, durationMs, filePath}>>}
 */
async function cutSegments(takePath, chunks, outDir, audioProcessor, opts = {}) {
  const fs = require('fs')
  const paddingMs = opts.paddingMs ?? DEFAULTS.SEGMENT_PADDING_MS
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const results = []
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]
    const actualStart = Math.max(0, c.startMs - paddingMs)
    const endWithPad = c.endMs + paddingMs
    const startSec = actualStart / 1000
    const endSec = endWithPad / 1000
    const filePath = path.join(outDir, `seg-${String(i).padStart(3, '0')}.mp3`)
    await audioProcessor.ffmpegFilterToLameMp3(takePath, filePath, {
      filterChain: `atrim=start=${startSec}:end=${endSec},asetpts=PTS-STARTPTS`,
    })
    const meta = await audioProcessor.getAudioMetadata(filePath)
    results.push({
      index: i,
      text: c.text,
      startMs: c.startMs,
      endMs: c.endMs,
      durationMs: Math.round((meta.duration || 0) * 1000),
      method: c.method,
      filePath,
    })
  }
  return results
}

module.exports = {
  DEFAULTS,
  getAudioDurationMs,
  detectSilenceSpans,
  parseSilenceOutput,
  invertSilenceSpans,
  mapVoicedToChunks,
  transferBoundaries,
  alignSlowGapTake,
  alignTakePair,
  cutSegments,
}
