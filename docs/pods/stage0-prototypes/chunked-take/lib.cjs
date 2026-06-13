/**
 * atom-fusion-spike/lib.cjs — PCM utilities for the spike.
 *
 * ffmpeg 7.1.1 on this host NONDETERMINISTICALLY DROPS SEGMENTS from chained
 * acrossfade filtergraphs (proven; see services/voice-engine/splicer.cjs and
 * commit fddd66ec). So this lib uses ffmpeg ONLY as a plain decoder
 * (mp3 -> s16le, no filtergraph) and lame as the encoder (wav -> mp3, the
 * iOS-safe encoder). ALL editing — slicing, zero-cross snap, micro-fades,
 * silence insertion, concatenation — happens on raw Int16 PCM in Node, where
 * it is deterministic and sample-accurate. Every output should be verified
 * with ffprobeDurationMs against expectation.
 */

const { spawn } = require('child_process')
const fs = require('fs')

// ---------------------------------------------------------------------------
// Process helpers
// ---------------------------------------------------------------------------

function run(cmd, args, { stdinBuffer = null } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args)
    const out = []
    let err = ''
    child.stdout.on('data', (d) => out.push(d))
    child.stderr.on('data', (d) => { err += d.toString() })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`${cmd} exited ${code}: ${err.slice(-400)}`))
      resolve(Buffer.concat(out))
    })
    if (stdinBuffer) {
      child.stdin.write(stdinBuffer)
      child.stdin.end()
    }
  })
}

/** Decode any audio file to mono s16le PCM at the given rate. Plain decode —
 *  no filtergraph (see header). */
async function decodeToPcm(audioPath, sampleRate = 48000) {
  const buf = await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-i', audioPath,
    '-f', 's16le', '-ac', '1', '-ar', String(sampleRate),
    '-',
  ])
  return new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2))
}

async function ffprobeDurationMs(audioPath) {
  const buf = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    audioPath,
  ])
  const s = parseFloat(buf.toString().trim())
  if (!Number.isFinite(s)) throw new Error(`ffprobe: no duration for ${audioPath}`)
  return Math.round(s * 1000)
}

// ---------------------------------------------------------------------------
// WAV write + MP3 encode
// ---------------------------------------------------------------------------

function writeWav(int16, sampleRate, outPath) {
  const dataBytes = int16.length * 2
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataBytes, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataBytes, 40)
  fs.writeFileSync(outPath, Buffer.concat([header, Buffer.from(int16.buffer, int16.byteOffset, dataBytes)]))
}

/** Encode WAV -> MP3 via lame directly (no ffmpeg muxer — iOS-safe encoder). */
async function encodeWavToMp3(wavPath, mp3Path, { bitrate = 96, quality = 2 } = {}) {
  await run('lame', [
    '-m', 'm', '-b', String(bitrate), '--cbr', '--noreplaygain',
    '-q', String(quality), '--silent',
    wavPath, mp3Path,
  ])
}

// ---------------------------------------------------------------------------
// PCM editing
// ---------------------------------------------------------------------------

const msToSamples = (ms, sr) => Math.round((ms / 1000) * sr)
const samplesToMs = (n, sr) => (n / sr) * 1000

/** Find the zero-crossing nearest to `idx` within ±maxOffset samples.
 *  A zero-crossing = sign change between consecutive samples. Returns idx
 *  unchanged when none found in the window. */
function zeroCrossSnap(pcm, idx, maxOffsetSamples) {
  const n = pcm.length
  const at = (i) => pcm[Math.max(0, Math.min(n - 1, i))]
  const isZc = (i) => i > 0 && i < n && (at(i - 1) <= 0) !== (at(i) <= 0)
  if (isZc(idx)) return idx
  for (let d = 1; d <= maxOffsetSamples; d++) {
    if (isZc(idx - d)) return idx - d
    if (isZc(idx + d)) return idx + d
  }
  return Math.max(0, Math.min(n, idx))
}

/** Copy a slice [startSample, endSample) with half-cosine micro-fades. */
function sliceWithFades(pcm, startSample, endSample, sr, fadeMs = 8) {
  const s = Math.max(0, startSample)
  const e = Math.min(pcm.length, endSample)
  const out = pcm.slice(s, e)
  const fadeN = Math.min(msToSamples(fadeMs, sr), Math.floor(out.length / 2))
  for (let i = 0; i < fadeN; i++) {
    const gIn = 0.5 - 0.5 * Math.cos((Math.PI * i) / fadeN)
    out[i] = Math.round(out[i] * gIn)
    const j = out.length - 1 - i
    out[j] = Math.round(out[j] * gIn)
  }
  return out
}

function silence(ms, sr) {
  return new Int16Array(msToSamples(ms, sr))
}

function concatPcm(parts) {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Int16Array(total)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

/** Short separator tone (sine, faded) — between ladder tiers. */
function tone(ms, sr, freq = 880, gain = 0.18) {
  const n = msToSamples(ms, sr)
  const out = new Int16Array(n)
  const fadeN = Math.min(msToSamples(10, sr), Math.floor(n / 2))
  for (let i = 0; i < n; i++) {
    let g = gain
    if (i < fadeN) g *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fadeN)
    if (i >= n - fadeN) g *= 0.5 - 0.5 * Math.cos((Math.PI * (n - 1 - i)) / fadeN)
    out[i] = Math.round(32767 * g * Math.sin((2 * Math.PI * freq * i) / sr))
  }
  return out
}

// ---------------------------------------------------------------------------
// Envelope + cross-correlation (for offset transfer between two renders)
// ---------------------------------------------------------------------------

/** RMS envelope with hopMs hop / hopMs window. */
function rmsEnvelope(pcm, sr, hopMs = 5) {
  const hop = msToSamples(hopMs, sr)
  const frames = Math.floor(pcm.length / hop)
  const env = new Float64Array(frames)
  for (let f = 0; f < frames; f++) {
    let acc = 0
    for (let i = f * hop; i < (f + 1) * hop; i++) acc += pcm[i] * pcm[i]
    env[f] = Math.sqrt(acc / hop)
  }
  return env
}

/** Normalized cross-correlation of two envelopes over lags [-maxLag, +maxLag]
 *  (frames). Positive lag = b is delayed relative to a (a[t] ~ b[t+lag]).
 *  Returns { lag, corr }. */
function xcorrBestLag(a, b, maxLagFrames) {
  const norm = (v) => {
    const mean = v.reduce((s, x) => s + x, 0) / v.length
    return Float64Array.from(v, (x) => x - mean)
  }
  const A = norm(a)
  const B = norm(b)
  let best = { lag: 0, corr: -Infinity }
  for (let lag = -maxLagFrames; lag <= maxLagFrames; lag++) {
    let dot = 0
    let na = 0
    let nb = 0
    for (let i = 0; i < A.length; i++) {
      const j = i + lag
      if (j < 0 || j >= B.length) continue
      dot += A[i] * B[j]
      na += A[i] * A[i]
      nb += B[j] * B[j]
    }
    const corr = dot / (Math.sqrt(na * nb) || 1)
    if (corr > best.corr) best = { lag, corr }
  }
  return best
}

/** Local RMS (dBFS) in a ±winMs window around a position — "did this seam land
 *  in a quiet spot?" metric. */
function localRmsDb(pcm, sr, atMs, winMs = 10) {
  const c = msToSamples(atMs, sr)
  const w = msToSamples(winMs, sr)
  const s = Math.max(0, c - w)
  const e = Math.min(pcm.length, c + w)
  if (e <= s) return -120
  let acc = 0
  for (let i = s; i < e; i++) acc += pcm[i] * pcm[i]
  const rms = Math.sqrt(acc / (e - s)) / 32768
  return rms > 0 ? 20 * Math.log10(rms) : -120
}

module.exports = {
  run,
  decodeToPcm,
  ffprobeDurationMs,
  writeWav,
  encodeWavToMp3,
  msToSamples,
  samplesToMs,
  zeroCrossSnap,
  sliceWithFades,
  silence,
  concatPcm,
  tone,
  rmsEnvelope,
  xcorrBestLag,
  localRmsDb,
}
