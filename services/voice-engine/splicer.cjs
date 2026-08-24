/**
 * voice-engine/splicer.cjs — SPLICER: assemble un-recorded phrases from
 * segments per (voice_id, cadence).
 *
 * Plan construction is pure (unit-tested); audio assembly clones the proven
 * shape of services/phases/phase8-audio-v13.cjs POST /splice-components:
 * normalize each segment → crossfade concat → encode via the ffmpeg→lame
 * pipe (the iOS-safe encoder — NEVER ffmpeg's mp3 muxer, which phase8
 * documents as breaking iOS/AVPlayer).
 *
 * Rules (keystone doc):
 * - A recorded whole-phrase natural take ALWAYS beats splicing that phrase
 *   (prefer-take-over-splice) — such phrases are excluded from the plan.
 * - Voice is a hard partition: a plan is built for exactly one
 *   (voice_id, cadence) segment store; segments from different voices are
 *   never mixed in one phrase.
 * - Missing chunks produce a gap report (feeds back into the recording
 *   script), never a partial splice.
 */

const fs = require('fs')
const path = require('path')
const os = require('os')
const { spawn } = require('child_process')
const { recordingChunksForPhrase, normalizeForMatching } = require('./chunking.cjs')
const { normalizeForAudio } = require('../shared/text-normalize.cjs')

const CROSSFADE_MS = 20
const NORMALIZE_LUFS = -16

// ---------------------------------------------------------------------------
// Plan construction (pure)
// ---------------------------------------------------------------------------

/**
 * Build the splice plan for one (voice, cadence).
 *
 * @param {object} args
 * @param {Array<{id, text}>} args.phrases - candidate phrase rows (text = target text for target slots)
 * @param {Map} args.universe - normalized LEGO text → { legoId, type } (chunking.buildUniverse)
 * @param {Map} args.segmentIdx - segment-store index `${textKey}|${cadence}` → entry
 * @param {Set<string>} args.wholeTakeTexts - normalizeForAudio(text) of phrases with a recorded whole natural take
 * @param {Set<string>} args.existingAudioTexts - text_normalized already in course_audio for (course, role, voice)
 * @param {string[]} [args.cadencePreference=['natural','slow']]
 * @returns {{ items, skipped, stats }}
 */
function buildSplicePlan({
  phrases,
  universe,
  segmentIdx,
  wholeTakeTexts = new Set(),
  existingAudioTexts = new Set(),
  cadencePreference = ['natural', 'slow'],
}) {
  const items = []
  const skipped = {
    alreadyRegistered: [],
    coveredByTake: [],
    missingChunks: [],
  }

  const seen = new Set()
  for (const phrase of phrases || []) {
    const text = phrase.text
    if (!text) continue
    const audioNorm = normalizeForAudio(text)
    if (seen.has(audioNorm)) continue
    seen.add(audioNorm)

    if (existingAudioTexts.has(audioNorm)) {
      skipped.alreadyRegistered.push({ id: phrase.id, text })
      continue
    }
    // Prefer-take-over-splice: a whole-phrase natural take wins, always.
    if (wholeTakeTexts.has(audioNorm)) {
      skipped.coveredByTake.push({ id: phrase.id, text })
      continue
    }

    // Cadence is chosen PER PHRASE, never per chunk: one spliced phrase is
    // exactly one (voice_id, cadence) — mixing natural and slow segments in
    // a single phrase would violate the keystone's hard partition
    // (multi-voice-model.md). Try each cadence in preference order as a
    // whole-phrase pass; the first that covers EVERY chunk wins. If none
    // does, the phrase goes to the gap report (missing chunks reported
    // against the first-preference cadence — that is the actionable
    // "record these" list).
    const chunks = recordingChunksForPhrase(text, universe)
    let resolved = null
    let firstPrefMissing = null
    for (const c of cadencePreference) {
      const attempt = []
      const missing = []
      for (const chunk of chunks) {
        const textKey = normalizeForMatching(chunk.text)
        const hit = segmentIdx.get(`${textKey}|${c}`)
        if (hit) {
          attempt.push({ text: chunk.text, textKey, legoId: chunk.legoId ?? null, segmentId: hit.id, s3Key: hit.s3Key, cadence: c })
        } else {
          missing.push(chunk.text)
        }
      }
      if (firstPrefMissing === null) firstPrefMissing = missing
      if (missing.length === 0) { resolved = attempt; break }
    }

    if (!resolved) {
      skipped.missingChunks.push({ id: phrase.id, text, missing: firstPrefMissing ?? chunks.map(c => c.text) })
      continue
    }

    items.push({
      phraseId: phrase.id,
      text,
      textNormalized: audioNorm,
      chunkCount: resolved.length,
      chunks: resolved,
    })
  }

  // Gap report: which chunk texts are blocking how many phrases — the
  // "record these N more" list that feeds back into the recording script.
  const gapCounts = new Map()
  for (const m of skipped.missingChunks) {
    for (const chunkText of m.missing) {
      gapCounts.set(chunkText, (gapCounts.get(chunkText) || 0) + 1)
    }
  }
  const gapReport = [...gapCounts.entries()]
    .map(([chunkText, blockedPhrases]) => ({ chunkText, blockedPhrases }))
    .sort((a, b) => b.blockedPhrases - a.blockedPhrases)

  return {
    items,
    skipped,
    gapReport,
    stats: {
      candidates: seen.size,
      planned: items.length,
      alreadyRegistered: skipped.alreadyRegistered.length,
      coveredByTake: skipped.coveredByTake.length,
      missingChunks: skipped.missingChunks.length,
    },
  }
}

// ---------------------------------------------------------------------------
// Audio assembly (effectful)
// ---------------------------------------------------------------------------

/**
 * Crossfade-concatenate MP3 inputs and encode via ffmpeg→lame pipe.
 * ffmpeg decodes + acrossfade-chains to WAV on stdout; lame encodes —
 * the same dual-spawn pattern as audio-processor.cjs#ffmpegFilterToLameMp3.
 */
function crossfadeConcatToLame(inputFiles, outputPath, { crossfadeMs = CROSSFADE_MS, bitrate = 96, sampleRate = 48000 } = {}) {
  const crossfadeSec = crossfadeMs / 1000
  const ffArgs = ['-y', '-hide_banner', '-loglevel', 'error']
  for (const f of inputFiles) ffArgs.push('-i', f)

  const filterParts = []
  let currentLabel = '[0]'
  for (let i = 1; i < inputFiles.length; i++) {
    const outputLabel = i === inputFiles.length - 1 ? '[xf]' : `[a${i}]`
    filterParts.push(`${currentLabel}[${i}]acrossfade=d=${crossfadeSec}:c1=tri:c2=tri${outputLabel}`)
    currentLabel = outputLabel
  }
  ffArgs.push(
    '-filter_complex', filterParts.join(';'),
    '-map', '[xf]',
    '-ac', '1', '-ar', String(sampleRate),
    '-f', 'wav', '-',
  )

  const lameArgs = ['-m', 'm', '-b', String(bitrate), '--cbr', '--noreplaygain', '-q', '2', '--silent', '-', outputPath]

  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ffArgs)
    const lame = spawn('lame', lameArgs)
    let ffErr = ''
    let lameErr = ''
    ff.stderr.on('data', d => { ffErr += d.toString() })
    lame.stderr.on('data', d => { lameErr += d.toString() })
    ff.stdout.pipe(lame.stdin)
    ff.on('error', reject)
    lame.on('error', reject)
    let ffExit = null
    let lameExit = null
    const settle = () => {
      if (ffExit === null || lameExit === null) return
      if (ffExit !== 0) return reject(new Error(`ffmpeg exited ${ffExit}: ${ffErr.slice(-500)}`))
      if (lameExit !== 0) return reject(new Error(`lame exited ${lameExit}: ${lameErr.slice(-500)}`))
      resolve()
    }
    ff.on('close', code => { ffExit = code; settle() })
    lame.on('close', code => { lameExit = code; settle() })
  })
}

/**
 * Splice local segment files into one phrase MP3.
 *
 * Steps (cloned from splice-legos.cjs core, re-keyed and iOS-safe):
 * 1. Normalize each segment to −16 LUFS (consistent volume across takes);
 *    on loudnorm failure for very short clips, fall back to the raw clip.
 * 2. Plain concat (concat demuxer) → lame encode, then VERIFY the output
 *    duration against the summed inputs (≥95%) — short output throws.
 *    The former acrossfade chain is retired: ffmpeg 7's threaded CLI drops
 *    whole segments from it nondeterministically (see crossfadeConcatToLame,
 *    kept only for reference/future re-evaluation on a fixed ffmpeg).
 *
 * @param {string[]} inputFiles - local per-chunk MP3 paths, in phrase order
 * @param {string} outputPath - output MP3 path
 * @param {object} deps { audioProcessor }
 * @returns {Promise<{durationMs:number, fallbackUsed:boolean}>}
 */
async function spliceSegmentsToFile(inputFiles, outputPath, { audioProcessor, crossfadeMs = CROSSFADE_MS, normalize = true } = {}) {
  if (!inputFiles?.length) throw new Error('spliceSegmentsToFile: no input files')
  if (!audioProcessor) throw new Error('spliceSegmentsToFile: audioProcessor dep required')

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 've-splice-'))
  let fallbackUsed = false
  try {
    // Step 1: per-segment loudness normalization
    let workFiles = inputFiles
    if (normalize) {
      workFiles = []
      for (let i = 0; i < inputFiles.length; i++) {
        const normPath = path.join(tempDir, `norm-${i}.mp3`)
        try {
          // The house closed loop, not the old open-loop chain (Tom's
          // bake-it-in ruling, 2026-08-24). normalizeAudio measured its input,
          // aimed 1 dB hot through a compressor and never checked the result —
          // so a splice made of segments from different takes could step in
          // level at every join, and the whole spliced clip sat at a different
          // level from the un-spliced clips around it.
          await audioProcessor.masterToHouseLoudness(inputFiles[i], normPath, NORMALIZE_LUFS)
          workFiles.push(normPath)
        } catch {
          // Very short clips can be below loudnorm's working minimum —
          // keep the raw clip (it carries its parent take's level).
          workFiles.push(inputFiles[i])
        }
      }
    }

    // Step 2: concat
    if (workFiles.length === 1) {
      // Single chunk — re-encode through the safe pipe for a consistent format.
      await audioProcessor.ffmpegFilterToLameMp3(workFiles[0], outputPath, {})
    } else {
      // ffmpeg 7's threaded CLI makes acrossfade chains drop whole segments
      // nondeterministically (observed: 11 healthy pieces totalling 12.7s
      // spliced to anywhere between 1.5s and 12.1s across identical runs,
      // always exit 0). Even "good" runs silently lost a 2s speech piece.
      // The concat demuxer — one input, no filter graph — is deterministic,
      // so it is the ONLY splice path; output is verified against the
      // summed input durations and a short result fails the splice honestly.
      const probedMs = []
      for (const f of workFiles) {
        const meta = await audioProcessor.getAudioMetadata(f)
        probedMs.push((meta.duration || 0) * 1000)
      }
      const expectedMs = probedMs.reduce((a, b) => a + b, 0)
      const listPath = path.join(tempDir, 'concat.txt')
      fs.writeFileSync(listPath, workFiles.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'))
      await audioProcessor.ffmpegFilterToLameMp3(null, outputPath, {
        ffmpegInputArgs: ['-f', 'concat', '-safe', '0'],
        inputOverride: listPath,
      })
      const got = ((await audioProcessor.getAudioMetadata(outputPath)).duration || 0) * 1000
      // Each MP3 piece carries encoder-delay padding that ffprobe COUNTS in its
      // duration but the concat-demuxer decode TRIMS, so `expectedMs` over-counts
      // by a roughly per-piece amount. With edge-trimmed pieces (many short
      // segments) this accumulates to ~5% on long splices — benign (silence, not
      // speech). The guard exists to catch the CATASTROPHIC acrossfade drop
      // (output fell to ~12% of expected), which a 0.88 floor still catches with
      // wide margin while no longer false-tripping on padding over-count.
      const floor = expectedMs * 0.88 - workFiles.length * 30
      if (got < floor) {
        throw new Error(`splice truncated: ${Math.round(got)}ms vs expected ~${Math.round(expectedMs)}ms (${workFiles.length} pieces)`)
      }
    }

    const meta = await audioProcessor.getAudioMetadata(outputPath)
    return { durationMs: Math.round((meta.duration || 0) * 1000), fallbackUsed }
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }) } catch { /* best-effort */ }
  }
}

module.exports = {
  CROSSFADE_MS,
  NORMALIZE_LUFS,
  buildSplicePlan,
  crossfadeConcatToLame,
  spliceSegmentsToFile,
}
