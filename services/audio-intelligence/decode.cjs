/**
 * decode.cjs — the one place in the engine that turns bytes into samples.
 *
 * WHY THIS IS ITS OWN MODULE. Every prior detector in this estate decoded the
 * audio itself, its own way, with its own ffmpeg flags — which is one of the
 * reasons they disagreed with each other. Tier 1 needs a duration, tier 2 needs
 * an energy envelope, tier 3 needs samples, tier 4 needs a 16 kHz mono WAV.
 * Decoding four times per clip is four times the cost AND four chances for the
 * tiers to be looking at subtly different audio. So: decode ONCE, mono 16 kHz
 * float, and hand the same array to everybody.
 *
 * 16 kHz mono is not a compromise here — it is what whisper.cpp wants anyway
 * (tier 4 would resample to it regardless), and speech energy above 8 kHz
 * carries nothing tiers 1-3 measure. Picking whisper's native rate means the
 * WAV we write for tier 4 is a byte-for-byte reuse of the decode, not a second
 * conversion.
 *
 * ⚠️ ffprobe duration vs SPEECH duration. `container.durationSec` is the file's
 * length, which includes any leading and trailing silence the mastering step
 * left on. It is NOT the thing tier 1 should divide syllables by — use the VAD
 * speech span for that. Conflating the two is what makes a fixed
 * syllables-per-second threshold behave differently on two voices whose
 * mastering pads differ. See tiers/duration.cjs.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { execFile } = require('child_process')
const { promisify } = require('util')

const run = promisify(execFile)

const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const FFPROBE = process.env.FFPROBE || 'ffprobe'

/** whisper.cpp's native rate; see header. */
const SAMPLE_RATE = 16000

/**
 * Is the decode toolchain actually present?
 *
 * Same three-outcome discipline as services/audio-veracity.cjs: a gate that
 * cannot tell "passed" from "never ran" is the bug that bit this estate three
 * times on 2026-08-04. Callers branch on this, they do not assume.
 */
async function availability () {
  const missing = []
  for (const [name, bin] of [['ffmpeg', FFMPEG], ['ffprobe', FFPROBE]]) {
    try {
      await run(bin, ['-version'])
    } catch {
      missing.push(`${name} (${bin})`)
    }
  }
  return { available: missing.length === 0, missing, ffmpeg: FFMPEG, ffprobe: FFPROBE }
}

/**
 * Container-level facts, straight from ffprobe. Cheap — no decode of the actual
 * samples, so this is the right call when all you want is "how long is it".
 */
async function probe (file) {
  const { stdout } = await run(FFPROBE, [
    '-v', 'error',
    '-show_entries', 'format=duration,size,bit_rate',
    '-of', 'json',
    file,
  ])
  const fmt = (JSON.parse(stdout).format) || {}
  return {
    durationSec: fmt.duration != null ? Number(fmt.duration) : null,
    sizeBytes: fmt.size != null ? Number(fmt.size) : null,
    bitRate: fmt.bit_rate != null ? Number(fmt.bit_rate) : null,
  }
}

/**
 * Decode to mono 16 kHz Float32 in [-1, 1], plus the WAV file on disk that
 * tier 4 hands to whisper.
 *
 * The WAV is written to a temp path and returned rather than kept in memory
 * because whisper-cli takes a file, not a pipe. Callers get `dispose()` and are
 * expected to call it; a batch run over 50k clips that leaks a WAV per clip
 * fills the disk somewhere around clip 8,000.
 *
 * @returns {{samples: Float32Array, sampleRate: number, durationSec: number,
 *            wavPath: string, dispose: function}}
 */
async function decode (file) {
  const tmp = path.join(
    os.tmpdir(),
    `aie-${crypto.randomBytes(8).toString('hex')}.wav`,
  )
  await run(FFMPEG, [
    '-v', 'error',
    '-i', file,
    '-ar', String(SAMPLE_RATE),
    '-ac', '1',
    '-c:a', 'pcm_s16le',
    '-f', 'wav',
    tmp,
    '-y',
  ])

  const buf = fs.readFileSync(tmp)
  const samples = pcmFromWav(buf)

  return {
    samples,
    sampleRate: SAMPLE_RATE,
    durationSec: samples.length / SAMPLE_RATE,
    wavPath: tmp,
    dispose () {
      try { fs.unlinkSync(tmp) } catch { /* already gone; nothing to do */ }
    },
  }
}

/**
 * Pull Float32 samples out of a 16-bit PCM WAV buffer.
 *
 * We walk the RIFF chunk list rather than assuming the classic 44-byte header:
 * ffmpeg writes a LIST/INFO chunk before `data` often enough that a fixed
 * offset silently reads metadata as audio, which shows up as a burst of noise
 * at the START of every clip — and a burst of noise at the start is exactly the
 * kind of thing that would quietly poison the VAD's speech-start boundary.
 */
function pcmFromWav (buf) {
  let offset = 12 // past 'RIFF' + size + 'WAVE'
  let dataStart = null
  let dataLen = 0

  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4)
    const size = buf.readUInt32LE(offset + 4)
    if (id === 'data') {
      dataStart = offset + 8
      dataLen = Math.min(size, buf.length - dataStart)
      break
    }
    offset += 8 + size + (size % 2) // chunks are word-aligned
  }

  if (dataStart == null) throw new Error('decode: no data chunk in WAV')

  const n = Math.floor(dataLen / 2)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    out[i] = buf.readInt16LE(dataStart + i * 2) / 32768
  }
  return out
}

module.exports = { availability, probe, decode, pcmFromWav, SAMPLE_RATE }
