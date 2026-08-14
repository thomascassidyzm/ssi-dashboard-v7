/**
 * Regression test for the T-20 bug: the human-recording trim must not eat speech.
 *
 * ffmpeg's silenceremove has two easily-confused parameters. `start_silence` is
 * the amount of silence to RETAIN. `start_duration` is the amount of non-silence
 * that must accumulate before trimming stops — and it DISCARDS everything before
 * that point, including the audio that proved it was not silence. The upload
 * chain shipped with `start_duration=0.1` from 2026-01-19 to 2026-08-14 and so
 * destroyed exactly 100ms off each end of every human take. 107 cym_n clips were
 * butchered before anyone heard it, and the raw uploads are never stored, so the
 * damage was unrecoverable. See docs/audio-forensics-2026-08-14/.
 *
 * This test drives the REAL processRecordingBuffer over a real WebM/Opus payload
 * (what the browser actually sends), so it fails if anyone reintroduces
 * start_duration, reorders the areverse sandwich, or raises the threshold enough
 * to bite into speech.
 *
 * Run: npx vitest run services/audio-processor-trim
 */

import { describe, it, expect, beforeAll } from 'vitest'
const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { processRecordingBuffer, checkFfmpegInstalled, checkLameInstalled } = require('./audio-processor.cjs')

const TONE_SEC = 1.0
const PAD_SEC = 0.5
const SAMPLE_RATE = 16000
// -20dBFS: comfortably above the -40dB trim threshold, i.e. unambiguous "speech".
const SPEECH_FLOOR = 3277

let tmpDir
let webmTake

/** Length of the contiguous above-threshold region, in seconds. */
function audibleSpan(mp3Buffer) {
  const f = path.join(tmpDir, 'out.mp3')
  fs.writeFileSync(f, mp3Buffer)
  const pcm = execFileSync(
    'ffmpeg',
    ['-v', 'quiet', '-i', f, '-f', 's16le', '-ac', '1', '-ar', String(SAMPLE_RATE), '-'],
    { maxBuffer: 1e8 }
  )
  const a = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2))
  let first = -1
  let last = -1
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i]) > SPEECH_FLOOR) {
      if (first < 0) first = i
      last = i
    }
  }
  return first < 0 ? 0 : (last - first) / SAMPLE_RATE
}

beforeAll(async () => {
  if (!(await checkFfmpegInstalled()) || !(await checkLameInstalled())) return
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trim-test-'))
  // A 1.000s tone padded with silence each side, Opus-in-WebM: the exact shape
  // the recorder uploads (tap-to-advance leaves real lead-in and tail).
  const src = path.join(tmpDir, 'take.webm')
  execFileSync('ffmpeg', [
    '-v', 'quiet', '-y', '-f', 'lavfi', '-i', `sine=f=440:d=${TONE_SEC}:r=48000`,
    '-af', `adelay=${PAD_SEC * 1000},apad=pad_dur=${PAD_SEC}`,
    '-c:a', 'libopus', '-b:a', '96k', src,
  ])
  webmTake = fs.readFileSync(src)
})

describe('processRecordingBuffer — silence trim (T-20 regression)', () => {
  it('trims the padding without eating any of the speech', async () => {
    if (!webmTake) return // ffmpeg/lame absent — nothing to assert
    const { buffer, metadata } = await processRecordingBuffer(webmTake, {
      inputFormat: 'webm', trimSilence: true, normalize: true, targetLUFS: -16,
    })
    expect(metadata.processed).toBe(true)

    const span = audibleSpan(buffer)
    // The whole tone must survive. The old start_duration=0.1 chain returned
    // ~0.794s here; anything below 0.97s means the trim is biting into speech.
    expect(span).toBeGreaterThan(0.97)

    // And the padding must actually have been removed — otherwise this test
    // would pass simply by disabling the trim.
    expect(metadata.durationMs).toBeLessThan((TONE_SEC + 2 * PAD_SEC) * 1000 - 500)
  }, 60000)

  it('still trims when asked, and leaves the take alone when not', async () => {
    if (!webmTake) return
    const untrimmed = await processRecordingBuffer(webmTake, {
      inputFormat: 'webm', trimSilence: false, normalize: false,
    })
    const trimmed = await processRecordingBuffer(webmTake, {
      inputFormat: 'webm', trimSilence: true, normalize: false,
    })
    expect(untrimmed.metadata.processed).toBe(true)
    expect(trimmed.metadata.processed).toBe(true)
    // Trimming must shorten the file; both must still contain the full tone.
    expect(trimmed.metadata.durationMs).toBeLessThan(untrimmed.metadata.durationMs)
    expect(audibleSpan(trimmed.buffer)).toBeGreaterThan(0.97)
    expect(audibleSpan(untrimmed.buffer)).toBeGreaterThan(0.97)
  }, 60000)
})
