/**
 * vadProsody.js — browser-side prosodic feature extraction + DTW for the VAD
 * Lab's record-yourself flow. A deliberate line-for-line mirror of
 * tools/prosody-lab/prosody.py (extractor prosody-lab-poc-2): same frame
 * sizes, same gates, same resampling — so a learner recording and a model
 * clip are always compared by the SAME extractor, with no python/JS bias.
 *
 * Doctrine (docs/course-optimization/prosody-lab-poc.md): features are blind
 * to voice identity. Energy z-scored per clip, F0 in semitones re the clip's
 * own median. F0 is extracted for the experimental pitch-shape DISPLAY track
 * only — it is never folded into any score (melody is voice, AUC 0.464).
 *
 * Scoring unit constraint (founder ruling, 2026-07-29): the unit is the
 * UTTERANCE, never the phoneme — everything here operates on whole clips.
 */

export const SR = 16000
const HOP = 160 // 10 ms
const RMS_WIN = 400 // 25 ms
const F0_WIN = 640 // 40 ms
const F0_MIN = 60
const F0_MAX = 400
const VOICING_CLARITY = 0.6
const SILENCE_DB = -40
export const CONTOUR_LEN = 150

// ── small numerics ──────────────────────────────────────────────────────────

export function resampleTo(v, m) {
  if (v.length === m) return Array.from(v)
  const out = new Array(m)
  for (let i = 0; i < m; i++) {
    const x = (i / (m - 1)) * (v.length - 1)
    const lo = Math.floor(x)
    const hi = Math.min(v.length - 1, lo + 1)
    out[i] = v[lo] + (v[hi] - v[lo]) * (x - lo)
  }
  return out
}

function zscore(v) {
  const n = v.length
  let mean = 0
  for (const x of v) mean += x / n
  let sd = 0
  for (const x of v) sd += (x - mean) ** 2 / n
  sd = Math.sqrt(sd)
  if (sd < 1e-9) sd = 1
  return v.map((x) => (x - mean) / sd)
}

function median(v) {
  if (!v.length) return NaN
  const s = [...v].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function percentile(v, q) {
  // mirrors numpy.percentile (linear interpolation)
  if (!v.length) return NaN
  const s = [...v].sort((a, b) => a - b)
  const x = (q / 100) * (s.length - 1)
  const lo = Math.floor(x)
  const hi = Math.min(s.length - 1, lo + 1)
  return s[lo] + (s[hi] - s[lo]) * (x - lo)
}

function medfilt5(v) {
  // scipy.signal.medfilt kernel 5, zero-padded edges — mirrored exactly
  const n = v.length
  const out = new Array(n)
  for (let i = 0; i < n; i++) {
    const w = []
    for (let k = i - 2; k <= i + 2; k++) w.push(k >= 0 && k < n ? v[k] : 0)
    out[i] = median(w)
  }
  return out
}

// scipy find_peaks subset: local maxima → distance filter (higher wins) →
// prominence filter. Order matches scipy (distance before prominence).
function findPeaks(v, { prominence, distance }) {
  const maxima = []
  for (let i = 1; i < v.length - 1; i++) {
    if (v[i] > v[i - 1]) {
      // plateau handling: walk right over equal values
      let j = i
      while (j < v.length - 1 && v[j + 1] === v[i]) j++
      if (j < v.length - 1 && v[j + 1] < v[i]) {
        maxima.push(Math.floor((i + j) / 2))
        i = j
      }
    }
  }
  // distance: keep highest-priority peaks, drop neighbours
  let peaks = maxima
  if (distance > 1) {
    const keep = new Array(peaks.length).fill(true)
    const order = peaks.map((p, k) => k).sort((a, b) => v[peaks[b]] - v[peaks[a]])
    for (const k of order) {
      if (!keep[k]) continue
      for (let o = 0; o < peaks.length; o++) {
        if (o !== k && keep[o] && Math.abs(peaks[o] - peaks[k]) < distance) {
          if (v[peaks[o]] <= v[peaks[k]]) keep[o] = false
        }
      }
    }
    peaks = peaks.filter((_, k) => keep[k])
  }
  if (prominence > 0) {
    peaks = peaks.filter((p) => {
      let leftMin = v[p]
      for (let i = p - 1; i >= 0; i--) {
        if (v[i] > v[p]) break
        if (v[i] < leftMin) leftMin = v[i]
      }
      let rightMin = v[p]
      for (let i = p + 1; i < v.length; i++) {
        if (v[i] > v[p]) break
        if (v[i] < rightMin) rightMin = v[i]
      }
      return v[p] - Math.max(leftMin, rightMin) >= prominence
    })
  }
  return peaks
}

// ── DTW ─────────────────────────────────────────────────────────────────────

/** Normalised DTW path cost between two 1-D contours — same maths as prosody.py. */
export function dtwDistance(a, b) {
  const n = a.length
  const m = b.length
  const D = new Float64Array((n + 1) * (m + 1)).fill(Infinity)
  const idx = (i, j) => i * (m + 1) + j
  D[0] = 0
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const d = Math.abs(a[i - 1] - b[j - 1])
      D[idx(i, j)] = d + Math.min(D[idx(i - 1, j)], D[idx(i, j - 1)], D[idx(i - 1, j - 1)])
    }
  }
  return D[idx(n, m)] / (n + m)
}

/**
 * DTW alignment of b onto a's index axis. Returns:
 *  - warped: b's values re-timed onto a's axis (for the aligned overlay)
 *  - bmap:   for each b index, its mean matched a index (for playhead + tick
 *            positioning when clip b plays in the aligned view)
 */
export function dtwWarp(a, b) {
  const n = a.length
  const m = b.length
  const cost = new Float64Array((n + 1) * (m + 1)).fill(Infinity)
  const idx = (i, j) => i * (m + 1) + j
  cost[0] = 0
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const d = Math.abs(a[i - 1] - b[j - 1])
      cost[idx(i, j)] =
        d + Math.min(cost[idx(i - 1, j)], cost[idx(i, j - 1)], cost[idx(i - 1, j - 1)])
    }
  }
  const matched = Array.from({ length: n }, () => [])
  const bMatches = Array.from({ length: m }, () => [])
  let i = n
  let j = m
  while (i > 0 && j > 0) {
    matched[i - 1].push(b[j - 1])
    bMatches[j - 1].push(i - 1)
    const diag = cost[idx(i - 1, j - 1)]
    const up = cost[idx(i - 1, j)]
    const left = cost[idx(i, j - 1)]
    if (diag <= up && diag <= left) {
      i--
      j--
    } else if (up <= left) i--
    else j--
  }
  const warped = matched.map((vals, k) =>
    vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : a[k]
  )
  const bmap = bMatches.map((as, k) =>
    as.length ? as.reduce((x, y) => x + y, 0) / as.length : (k / (m - 1)) * (n - 1)
  )
  return { warped, bmap }
}

// ── feature extraction (mirror of prosody.py extract_one) ──────────────────

/**
 * Extract prosodic features from a mono Float32Array at 16 kHz.
 * Returns null if the clip is unusable (too short / silent).
 */
export function extractFeatures(x) {
  if (x.length < SR / 10) return null

  // RMS frames → dB rel clip max
  const nFrames = 1 + Math.max(0, Math.floor((x.length - RMS_WIN) / HOP))
  if (nFrames < 2) return null
  let db = new Array(nFrames)
  let maxRms = 0
  const rms = new Array(nFrames)
  for (let f = 0; f < nFrames; f++) {
    let e = 0
    const off = f * HOP
    for (let k = 0; k < RMS_WIN; k++) e += x[off + k] * x[off + k]
    rms[f] = Math.sqrt(e / RMS_WIN) + 1e-12
    if (rms[f] > maxRms) maxRms = rms[f]
  }
  for (let f = 0; f < nFrames; f++) db[f] = 20 * Math.log10(rms[f] / maxRms)

  // trim lead/tail silence
  let lo = -1
  let hi = -1
  for (let f = 0; f < nFrames; f++) {
    if (db[f] > SILENCE_DB) {
      if (lo < 0) lo = f
      hi = f + 1
    }
  }
  if (lo < 0) return null
  db = db.slice(lo, hi)
  const xt = x.subarray(lo * HOP, (hi - 1) * HOP + RMS_WIN)
  if (xt.length < F0_WIN) return null

  // ACF pitch per 40 ms frame
  const lagMin = Math.floor(SR / F0_MAX)
  const lagMax = Math.min(Math.floor(SR / F0_MIN), F0_WIN - 1)
  const nPf = 1 + Math.max(0, Math.floor((xt.length - F0_WIN) / HOP))
  const n = Math.min(nPf, db.length)
  const f0 = new Array(n).fill(0)
  const clarity = new Array(n).fill(0)
  const fr = new Float64Array(F0_WIN)
  for (let f = 0; f < n; f++) {
    const off = f * HOP
    let mean = 0
    for (let k = 0; k < F0_WIN; k++) mean += xt[off + k]
    mean /= F0_WIN
    let e0 = 0
    for (let k = 0; k < F0_WIN; k++) {
      fr[k] = xt[off + k] - mean
      e0 += fr[k] * fr[k]
    }
    if (e0 <= 0) continue
    let best = -Infinity
    let bestLag = 0
    const ac = new Float64Array(lagMax - lagMin + 1)
    for (let lag = lagMin; lag <= lagMax; lag++) {
      let s = 0
      for (let k = 0; k + lag < F0_WIN; k++) s += fr[k] * fr[k + lag]
      const v = s / e0
      ac[lag - lagMin] = v
      if (v > best) {
        best = v
        bestLag = lag
      }
    }
    clarity[f] = best
    let lag = bestLag
    const k = bestLag - lagMin
    if (k > 0 && k < ac.length - 1) {
      const a = ac[k - 1]
      const b = ac[k]
      const c = ac[k + 1]
      const denom = a - 2 * b + c
      if (Math.abs(denom) > 1e-12) lag = bestLag + (0.5 * (a - c)) / denom
    }
    f0[f] = SR / lag
  }

  const voiced = new Array(n)
  for (let f = 0; f < n; f++)
    voiced[f] = clarity[f] > VOICING_CLARITY && db[f] > SILENCE_DB + 10 && f0[f] > 0

  let f0v = f0.map((v, f) => (voiced[f] ? v : 0))
  f0v = medfilt5(f0v).map((v) => (v === 0 ? NaN : v))
  const vidx = []
  for (let f = 0; f < n; f++) if (!Number.isNaN(f0v[f])) vidx.push(f)

  let f0Contour = null
  let f0RangeSt = null
  let f0MedianHz = null
  if (vidx.length >= 5) {
    const voicedVals = vidx.map((f) => f0v[f])
    f0MedianHz = median(voicedVals)
    const semisAt = new Map(vidx.map((f) => [f, 12 * Math.log2(f0v[f] / f0MedianHz)]))
    const span = []
    for (let f = vidx[0]; f <= vidx[vidx.length - 1]; f++) span.push(f)
    // linear interpolation across unvoiced gaps inside the voiced span
    const interp = span.map((f) => {
      if (semisAt.has(f)) return semisAt.get(f)
      let a = f
      let b = f
      while (!semisAt.has(a)) a--
      while (!semisAt.has(b)) b++
      return semisAt.get(a) + ((semisAt.get(b) - semisAt.get(a)) * (f - a)) / (b - a)
    })
    f0Contour = resampleTo(interp, CONTOUR_LEN)
    const semis = vidx.map((f) => semisAt.get(f))
    f0RangeSt = percentile(semis, 95) - percentile(semis, 5)
  }

  // syllable-scale envelope peaks (smoothed linear envelope, prominence-gated)
  const lin = db.slice(0, n).map((d) => 10 ** (d / 20))
  const envSm = new Array(n)
  for (let f = 0; f < n; f++) {
    let s = 0
    let c = 0
    for (let k = f - 2; k <= f + 2; k++) {
      // numpy 'same' convolution zero-pads outside the signal
      s += k >= 0 && k < n ? lin[k] : 0
      c++
    }
    envSm[f] = s / 5
  }
  const peaks = findPeaks(envSm, { prominence: 0.08, distance: 10 })
  const durS = n * 0.01

  let voicedCount = 0
  for (const v of voiced) if (v) voicedCount++

  return {
    duration_s: durS,
    voiced_frac: voicedCount / n,
    f0_median_hz: f0MedianHz,
    f0_range_st: f0RangeSt,
    syllable_peaks: peaks.length,
    syllable_peak_t: peaks.map((p) => (p * 0.01) / durS),
    f0_contour_st: f0Contour,
    energy_contour_z: resampleTo(zscore(db.slice(0, n)), CONTOUR_LEN),
  }
}

// ── loudness matching (playback fairness) ───────────────────────────────────
// The score and contour are level-invariant (dB rel clip max, then z-scored),
// but the EAR isn't: a raw mic capture plays far quieter than a mastered
// reference, which biases A/B listening. These helpers loudness-match the
// recording's PLAYBACK copy to the model clip. Energy-based integrated
// loudness, not full ITU-R BS.1770 K-weighting — both sides of a comparison
// go through the same function, so only the difference matters and a full
// 1770 implementation is disproportionate for one speech clip.

/**
 * Integrated active-speech loudness in dBFS: framewise energy on the same
 * 25 ms / 10 ms grid as the extractor, gated to frames within 40 dB of the
 * clip's max (the extractor's silence gate), then energy-averaged. Gating
 * matters: recordings carry more lead/tail silence than mastered clips, and
 * an ungated mean would under-read them. Returns null for silent/short input.
 */
export function activeSpeechDb(x) {
  const nFrames = 1 + Math.max(0, Math.floor((x.length - RMS_WIN) / HOP))
  if (nFrames < 2) return null
  const e = new Array(nFrames)
  let maxE = 0
  for (let f = 0; f < nFrames; f++) {
    let s = 0
    const off = f * HOP
    for (let k = 0; k < RMS_WIN; k++) s += x[off + k] * x[off + k]
    e[f] = s / RMS_WIN
    if (e[f] > maxE) maxE = e[f]
  }
  if (maxE <= 0) return null
  const gate = maxE * 10 ** (SILENCE_DB / 10)
  let sum = 0
  let cnt = 0
  for (const v of e)
    if (v > gate) {
      sum += v
      cnt++
    }
  if (!cnt) return null
  return 10 * Math.log10(sum / cnt)
}

/**
 * Pure gain stage with a peak guard: scale by gainDb, capped so no sample
 * exceeds PEAK_CEIL — a clean quieter-than-target match beats a clipped
 * exact one. Returns { out, appliedDb, limited }.
 */
export function applyGainLimited(x, gainDb) {
  const PEAK_CEIL = 0.985
  let peak = 0
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i])
    if (a > peak) peak = a
  }
  let g = 10 ** (gainDb / 20)
  let limited = false
  if (peak * g > PEAK_CEIL) {
    g = peak > 0 ? PEAK_CEIL / peak : 1
    limited = true
  }
  const out = new Float32Array(x.length)
  for (let i = 0; i < x.length; i++) out[i] = x[i] * g
  return { out, appliedDb: 20 * Math.log10(g), limited }
}

/** Encode mono Float32 samples as a 16-bit PCM WAV Blob. */
export function encodeWavMono(x, sampleRate) {
  const n = x.length
  const buf = new ArrayBuffer(44 + n * 2)
  const dv = new DataView(buf)
  const wstr = (off, s) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i))
  }
  wstr(0, 'RIFF')
  dv.setUint32(4, 36 + n * 2, true)
  wstr(8, 'WAVE')
  wstr(12, 'fmt ')
  dv.setUint32(16, 16, true)
  dv.setUint16(20, 1, true)
  dv.setUint16(22, 1, true)
  dv.setUint32(24, sampleRate, true)
  dv.setUint32(28, sampleRate * 2, true)
  dv.setUint16(32, 2, true)
  dv.setUint16(34, 16, true)
  wstr(36, 'data')
  dv.setUint32(40, n * 2, true)
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, x[i]))
    dv.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buf], { type: 'audio/wav' })
}

/**
 * Decode a recorded clip at its NATIVE sample rate (mono downmix), apply
 * gainDb through the peak guard, and return a WAV blob for playback.
 * (The 16 kHz decode is for features only — playback keeps full bandwidth.)
 */
export async function renderLoudnessMatchedWav(arrayBuffer, gainDb) {
  const AC = window.AudioContext || window.webkitAudioContext
  const ac = new AC()
  try {
    const buf = await ac.decodeAudioData(arrayBuffer.slice(0))
    const mono = new Float32Array(buf.length)
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < buf.length; i++) mono[i] += d[i] / buf.numberOfChannels
    }
    const { out, appliedDb, limited } = applyGainLimited(mono, gainDb)
    return { blob: encodeWavMono(out, buf.sampleRate), appliedDb, limited }
  } finally {
    ac.close?.()
  }
}

// ── audio plumbing ──────────────────────────────────────────────────────────

/** Decode an encoded audio blob/ArrayBuffer to mono Float32 @ 16 kHz. */
export async function decodeTo16kMono(arrayBuffer) {
  const AC = window.AudioContext || window.webkitAudioContext
  const ac = new AC()
  try {
    const buf = await ac.decodeAudioData(arrayBuffer.slice(0))
    const frames = Math.max(1, Math.ceil(buf.duration * SR))
    const oc = new OfflineAudioContext(1, frames, SR)
    const src = oc.createBufferSource()
    src.buffer = buf
    src.connect(oc.destination)
    src.start()
    const rendered = await oc.startRendering()
    return rendered.getChannelData(0)
  } finally {
    ac.close?.()
  }
}

/** Compare two feature sets on the three phrase-carrying dimensions. */
export function comparePhraseDims(fa, fb) {
  return {
    energy_dtw: dtwDistance(fa.energy_contour_z, fb.energy_contour_z),
    dur_log_ratio: Math.abs(Math.log(fa.duration_s / fb.duration_s)),
    syl_count_diff: Math.abs(fa.syllable_peaks - fb.syllable_peaks),
  }
}
