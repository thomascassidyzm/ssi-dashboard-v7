// src/utils/takeSplice.js
/**
 * In-browser port of the recording pipeline's SLOW-GAP splitter and its
 * chunk concatenator.
 *
 * Why a port and not a call: the real splitter is
 * `tools/recording-optimizer/align-audio.cjs` (mode `slow-gap`), which shells
 * out to ffmpeg's `silencedetect`, and the real joiner is
 * `concatenateAudio()` in `services/audio-processor.cjs`, which shells out to
 * ffmpeg + lame. Neither exists in a phone browser. So the DECISION RULES and
 * their constants are lifted verbatim from those two files and re-expressed on
 * Web Audio PCM; nothing here invents a second policy.
 *
 * What is faithful to align-audio.cjs:
 *   - silence threshold -35 dB, minimum silence 150 ms, minimum voiced 60 ms,
 *     20 ms of padding either side of an extracted piece (its CONFIG block);
 *   - voiced regions are the INVERSE of detected silences, computed the same
 *     way (`voicedRegions()`);
 *   - a chunk-count mismatch is a HARD FAILURE, reported, never papered over
 *     by redistributing boundaries (`alignSlowGap()` returns `ok:false`).
 *
 * What deliberately differs, and why:
 *   - ffmpeg's -35 dB is measured against full scale on a LOUDNORMED mp3. A
 *     raw phone-mic capture is nowhere near that level, so an absolute -35 dBFS
 *     would read the whole take as silence. We peak-normalise first, which is
 *     the closest cheap stand-in for the loudnorm the server pass applies, and
 *     then use -35 dB against that. `detectVoicedRegions` reports the numbers
 *     it actually used so the caller can show them rather than guess.
 *   - `concatenateAudio()` loudnorms each segment (EBU R128) before joining.
 *     We peak-normalise each piece instead — same intent (kill level
 *     differences so only delivery differences remain audible), cruder method.
 *
 * Everything here is pure except `decodeMono`, so the segmenter and the joiner
 * are unit-testable off a synthetic buffer. See takeSplice.test.js.
 */

/** Lifted from align-audio.cjs CONFIG — do not drift from it silently. */
export const SPLICE_CONFIG = {
  SILENCE_DB: -35,        // silencedetect noise threshold
  SILENCE_MIN_MS: 150,    // minimum silence that counts as a chunk boundary
  MIN_VOICED_MS: 60,      // discard voiced blips shorter than this (clicks, breaths)
  PAD_MS: 20,             // pad each extracted piece by this much per side
}

// Analysis grid. Same 25 ms window / 10 ms hop the prosody extractor uses
// (src/views/admin/vadProsody.js), so two parts of the estate that both look
// at frame energy at least agree on what a frame is.
const WIN_MS = 25
const HOP_MS = 10

/** Decode an encoded recording to mono Float32 at its NATIVE sample rate. */
export async function decodeMono(arrayBuffer) {
  const AC = window.AudioContext || window.webkitAudioContext
  const ac = new AC()
  try {
    const buf = await ac.decodeAudioData(arrayBuffer.slice(0))
    const mono = new Float32Array(buf.length)
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < buf.length; i++) mono[i] += d[i] / buf.numberOfChannels
    }
    return { samples: mono, sampleRate: buf.sampleRate }
  } finally {
    ac.close?.()
  }
}

/** Peak of |x|. */
export function peak(x) {
  let p = 0
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i])
    if (a > p) p = a
  }
  return p
}

/** Scale so the loudest sample sits at `ceil`. A silent buffer is returned unchanged. */
export function peakNormalise(x, ceil = 0.985) {
  const p = peak(x)
  if (p <= 0) return x
  const g = ceil / p
  const out = new Float32Array(x.length)
  for (let i = 0; i < x.length; i++) out[i] = x[i] * g
  return out
}

/** Framewise RMS in dB (relative to full scale) on the 25 ms / 10 ms grid. */
export function frameDb(x, sampleRate) {
  const win = Math.max(1, Math.round((WIN_MS / 1000) * sampleRate))
  const hop = Math.max(1, Math.round((HOP_MS / 1000) * sampleRate))
  const n = 1 + Math.max(0, Math.floor((x.length - win) / hop))
  const out = new Float32Array(n)
  for (let f = 0; f < n; f++) {
    let s = 0
    const off = f * hop
    for (let k = 0; k < win; k++) s += x[off + k] * x[off + k]
    const rms = Math.sqrt(s / win)
    out[f] = rms > 0 ? 20 * Math.log10(rms) : -120
  }
  return out
}

function percentile(sorted, p) {
  if (!sorted.length) return -120
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))))
  return sorted[i]
}

/**
 * Find the voiced regions of a take, using align-audio.cjs's slow-gap rule.
 *
 * Returns the regions AND the numbers the decision was made on, because when
 * the split comes out wrong the recordist needs to be told whether the room was
 * noisy or the gaps were too short — those are different instructions.
 */
export function detectVoicedRegions(samples, sampleRate, opts = {}) {
  const cfg = { ...SPLICE_CONFIG, ...opts }
  const norm = peakNormalise(samples)
  const db = frameDb(norm, sampleRate)

  const sorted = Array.from(db).sort((a, b) => a - b)
  const speechDb = percentile(sorted, 95)
  const floorDb = percentile(sorted, 10)

  // -35 dB below full scale after peak-normalising. Guard the case the server
  // never meets: a noisy room whose own floor sits above that line, where the
  // nominal threshold would mark the entire take as speech and find one chunk.
  const nominal = cfg.SILENCE_DB
  const guarded = floorDb + 6
  const noisy = guarded > nominal
  const thresholdDb = noisy ? Math.min(guarded, speechDb - 10) : nominal

  const minSilenceFrames = Math.round(cfg.SILENCE_MIN_MS / HOP_MS)
  const frameMs = (f) => f * HOP_MS

  // Voiced runs, then drop silences too short to be a boundary by MERGING the
  // runs either side — the inverse of ffmpeg emitting no silence event for a
  // gap shorter than d=150ms.
  const runs = []
  let start = null
  for (let f = 0; f < db.length; f++) {
    const voiced = db[f] > thresholdDb
    if (voiced && start === null) start = f
    if (!voiced && start !== null) {
      runs.push({ s: start, e: f })
      start = null
    }
  }
  if (start !== null) runs.push({ s: start, e: db.length })

  const merged = []
  for (const r of runs) {
    const last = merged[merged.length - 1]
    if (last && (r.s - last.e) < minSilenceFrames) last.e = r.e
    else merged.push({ ...r })
  }

  // `r.e` is the FIRST non-voiced frame, so the last voiced frame is r.e-1 and
  // its window ends at (r.e-1)*HOP + WIN. Adding a whole WIN to frameMs(r.e)
  // would over-run every region by a hop and let 25 ms of window smear count as
  // real duration — which is enough to sneak a click past MIN_VOICED_MS.
  // Resolution is still one hop (10 ms) plus the window's own smear, so treat
  // these boundaries as ±15 ms, not exact.
  const regions = merged
    .map((r) => ({
      startMs: Math.round(frameMs(r.s)),
      endMs: Math.round(frameMs(r.e) + WIN_MS - HOP_MS),
    }))
    .filter((r) => (r.endMs - r.startMs) >= cfg.MIN_VOICED_MS)

  return { regions, thresholdDb, floorDb, speechDb, noisy }
}

/**
 * Match a slow read against the chunks the recordist was asked to read.
 *
 * Mirrors alignSlowGap() in align-audio.cjs INCLUDING its refusal: if the
 * number of voiced regions does not equal the number of expected chunks, this
 * returns ok:false with both counts. Redistributing boundaries to force a
 * match would be a lie, and it is exactly the failure the tutorial is trying to
 * teach the recordist to hear.
 */
export function alignSlowGap(samples, sampleRate, expectedChunks, opts = {}) {
  const det = detectVoicedRegions(samples, sampleRate, opts)
  const { regions } = det

  if (regions.length !== expectedChunks.length) {
    return {
      ok: false,
      reason: `chunk-count mismatch — expected ${expectedChunks.length}, detected ${regions.length} voiced regions`,
      expectedCount: expectedChunks.length,
      detectedCount: regions.length,
      regions,
      detection: det,
    }
  }

  return {
    ok: true,
    detection: det,
    chunks: regions.map((r, i) => ({
      text: expectedChunks[i],
      startMs: r.startMs,
      endMs: r.endMs,
      durationMs: r.endMs - r.startMs,
      method: 'slow-gap',
    })),
  }
}

/** Cut [startMs,endMs) out of a take, padded per side like extractSegment(). */
export function sliceChunk(samples, sampleRate, startMs, endMs, padMs = SPLICE_CONFIG.PAD_MS) {
  const a = Math.max(0, Math.round(((startMs - padMs) / 1000) * sampleRate))
  const b = Math.min(samples.length, Math.round(((endMs + padMs) / 1000) * sampleRate))
  if (b <= a) return new Float32Array(0)
  return samples.slice(a, b)
}

/** In-place linear fade in/out, to stop a butt-join clicking at the seam. */
export function fadeEdges(x, sampleRate, fadeMs = 5) {
  const n = Math.min(Math.round((fadeMs / 1000) * sampleRate), Math.floor(x.length / 2))
  for (let i = 0; i < n; i++) {
    const g = i / n
    x[i] *= g
    x[x.length - 1 - i] *= g
  }
  return x
}

/**
 * Join pieces into one phrase, the way `concatenateAudio()` does: each piece
 * levelled on its own first, then butt-joined with an optional pause.
 *
 * `gapMs` defaults to 0 because these pieces are joined WITHIN a phrase — the
 * 1000 ms default in audio-processor.cjs is for joining whole phrases.
 */
export function concatChunks(pieces, sampleRate, opts = {}) {
  const { gapMs = 0, fadeMs = 5, normalise = true } = opts
  const prepped = pieces
    .filter((p) => p && p.length)
    .map((p) => fadeEdges(Float32Array.from(normalise ? peakNormalise(p) : p), sampleRate, fadeMs))
  if (!prepped.length) return new Float32Array(0)

  const gap = Math.max(0, Math.round((gapMs / 1000) * sampleRate))
  const total = prepped.reduce((n, p) => n + p.length, 0) + gap * (prepped.length - 1)
  const out = new Float32Array(total)
  let o = 0
  prepped.forEach((p, i) => {
    out.set(p, o)
    o += p.length
    if (i < prepped.length - 1) o += gap
  })
  return out
}

/**
 * Encode mono Float32 as a 16-bit PCM WAV Blob.
 * Same bytes as encodeWavMono() in src/views/admin/vadProsody.js; duplicated
 * only because that module is a Vue-app view helper and this one has to be
 * loadable by a standalone page with no app around it.
 */
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
