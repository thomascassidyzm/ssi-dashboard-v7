/**
 * Volume-envelope metadata extractor for model-voice audio — the offline
 * (dashboard-repo) half of adaptation-v2 stage-2 (see
 * ssi-learning-app/docs/adaptation/adaptation-v2-build-spec.md §5.1/§5.2).
 *
 * Computes the SAME numbers the player's client-side extractor computes for
 * the learner's own recording (duration, peak count, peak-to-mean ratio,
 * mean peak width), on a mastered mp3, so the two are directly comparable.
 * Algorithm/constants are pinned to services/shared/envelope-extractor-v1.json
 * — both repos must read that file rather than re-deriving the numbers, so
 * client and pipeline can't drift.
 *
 * Unlike the client (which only sees the VAD's speech-window samples live),
 * a mastered clip IS the speech region already — mastering trims lead/trail
 * silence — so the whole decoded clip is treated as the speech window.
 *
 * Peak-finding uses the scipy `peak_prominences` definition: for a local
 * maximum, extend outward on each side until either the array boundary or a
 * higher sample is met, take the min in each interval, and prominence =
 * height - max(leftMin, rightMin). Peak width is measured at
 * (height - prominence/2), per the spec's exact wording.
 */

const { spawn } = require('child_process')
const fs = require('fs')

const CONSTANTS = require('./shared/envelope-extractor-v1.json')

/** Decode an mp3 (Buffer or path) to mono f32le PCM at a fixed sample rate via ffmpeg. */
function decodeToPcm(input, sampleRate = 16000) {
  return new Promise((resolve, reject) => {
    const isBuffer = Buffer.isBuffer(input)
    const args = [
      '-hide_banner', '-loglevel', 'error',
      '-i', isBuffer ? 'pipe:0' : input,
      '-ac', '1', '-ar', String(sampleRate), '-f', 'f32le', 'pipe:1',
    ]
    const ff = spawn('ffmpeg', args)
    const chunks = []
    let stderr = ''
    ff.stdout.on('data', (d) => chunks.push(d))
    ff.stderr.on('data', (d) => { stderr += d.toString() })
    ff.on('error', reject)
    ff.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg decode exited ${code}: ${stderr.slice(-500)}`))
      const buf = Buffer.concat(chunks)
      const samples = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4))
      resolve({ samples, sampleRate })
    })
    if (isBuffer) {
      ff.stdin.write(input)
      ff.stdin.end()
    }
  })
}

/** RMS over fixed-size, non-overlapping windows (the 20ms grid). */
function rmsEnvelope(samples, sampleRate, gridMs) {
  const windowSamples = Math.round((gridMs / 1000) * sampleRate)
  const numWindows = Math.floor(samples.length / windowSamples)
  const envelope = new Float64Array(numWindows)
  for (let w = 0; w < numWindows; w++) {
    let sumSq = 0
    const start = w * windowSamples
    for (let i = 0; i < windowSamples; i++) {
      const s = samples[start + i]
      sumSq += s * s
    }
    envelope[w] = Math.sqrt(sumSq / windowSamples)
  }
  return envelope
}

/** Simple moving average over `taps` grid points (odd taps → centered). */
function movingAverage(series, taps) {
  const half = Math.floor(taps / 2)
  const out = new Float64Array(series.length)
  for (let i = 0; i < series.length; i++) {
    let sum = 0
    let count = 0
    for (let k = -half; k <= half; k++) {
      const j = i + k
      if (j >= 0 && j < series.length) { sum += series[j]; count++ }
    }
    out[i] = sum / count
  }
  return out
}

/** scipy-style peak_prominences: for local maximum at i, prominence = height - max(leftMin, rightMin). */
function prominenceOf(series, i) {
  const v = series[i]
  let leftMin = v
  for (let j = i - 1; j >= 0; j--) {
    if (series[j] > v) break
    if (series[j] < leftMin) leftMin = series[j]
  }
  let rightMin = v
  for (let j = i + 1; j < series.length; j++) {
    if (series[j] > v) break
    if (series[j] < rightMin) rightMin = series[j]
  }
  return v - Math.max(leftMin, rightMin)
}

/** Width (in grid steps) of the span around peak i where series stays >= threshold. */
function widthAt(series, i, threshold) {
  let left = i
  while (left > 0 && series[left - 1] >= threshold) left--
  let right = i
  while (right < series.length - 1 && series[right + 1] >= threshold) right++
  return right - left
}

function findLocalMaxima(series) {
  const maxima = []
  for (let i = 0; i < series.length; i++) {
    const prev = i === 0 ? -Infinity : series[i - 1]
    const next = i === series.length - 1 ? -Infinity : series[i + 1]
    if (series[i] >= prev && series[i] >= next && (series[i] > prev || series[i] > next)) {
      maxima.push(i)
    }
  }
  return maxima
}

/**
 * Pure function over a decoded, timed PCM sample array (mirrors the client
 * extractor's contract). `sampleRate` is the PCM rate `samples` was decoded
 * at, NOT the grid rate.
 */
function extractEnvelopeMetadata(samples, sampleRate, constants = CONSTANTS) {
  const { gridMs, smoothingTaps, peakProminenceRatio, peakMinSeparationMs, minSampleCount } = constants

  const rawEnvelope = rmsEnvelope(samples, sampleRate, gridMs)
  const sampleCount = rawEnvelope.length
  const durationMs = Math.round((samples.length / sampleRate) * 1000)

  if (sampleCount < minSampleCount) {
    return { durationMs, peakCount: 0, peakToMeanRatio: 0, meanPeakWidthMs: 0, sampleCount, weight: 0 }
  }

  const envelope = movingAverage(rawEnvelope, smoothingTaps)

  const max = Math.max(...envelope)
  const mean = envelope.reduce((a, b) => a + b, 0) / envelope.length
  const peakToMeanRatio = mean > 0 ? max / mean : 0
  const prominenceThreshold = peakProminenceRatio * (max - mean)

  // Flat/silent clip: no meaningful dynamic range, so any "local maximum" is
  // just float noise on an otherwise constant signal — not a syllable peak.
  const candidates = prominenceThreshold <= 0 ? [] : findLocalMaxima(envelope)
    .map((i) => ({ i, prominence: prominenceOf(envelope, i) }))
    .filter((c) => c.prominence >= prominenceThreshold)
    .sort((a, b) => envelope[b.i] - envelope[a.i])

  const minSeparationSteps = peakMinSeparationMs / gridMs
  const accepted = []
  for (const c of candidates) {
    if (accepted.every((a) => Math.abs(a.i - c.i) >= minSeparationSteps)) accepted.push(c)
  }
  accepted.sort((a, b) => a.i - b.i)

  const widths = accepted.map((c) => widthAt(envelope, c.i, envelope[c.i] - c.prominence / 2) * gridMs)
  const meanPeakWidthMs = widths.length ? widths.reduce((a, b) => a + b, 0) / widths.length : 0

  return {
    durationMs,
    peakCount: accepted.length,
    peakToMeanRatio,
    meanPeakWidthMs,
    sampleCount,
    weight: 1,
  }
}

/** Decode + extract in one call, from a Buffer or a local file path. */
async function computeEnvelope(input, constants = CONSTANTS) {
  const { samples, sampleRate } = await decodeToPcm(input)
  return extractEnvelopeMetadata(samples, sampleRate, constants)
}

async function computeEnvelopeFromFile(filePath, constants = CONSTANTS) {
  await fs.promises.access(filePath)
  return computeEnvelope(filePath, constants)
}

module.exports = {
  CONSTANTS,
  decodeToPcm,
  rmsEnvelope,
  movingAverage,
  extractEnvelopeMetadata,
  computeEnvelope,
  computeEnvelopeFromFile,
}
