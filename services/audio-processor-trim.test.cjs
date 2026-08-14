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
// Must match start_silence in audio-processor.cjs's trim chain.
const RETAIN_SEC = 0.05

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
    // would pass simply by disabling the trim. The chain retains RETAIN_SEC of
    // silence at each edge by design, so the floor is what is left after that.
    expect(metadata.durationMs).toBeLessThan((TONE_SEC + 2 * RETAIN_SEC) * 1000 + 150)
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

  // TAIL-SPECIFIC GUARD. The two silenceremove passes are separate filter
  // strings — head, then areverse/trim/areverse for the tail — so a future edit
  // can fix or break ONE side and leave the other alone. Tom heard exactly that
  // asymmetry ("the ends were clipped worse than the beginnings"), so the tail
  // gets its own assertion rather than riding on the head's.
  //
  // Padding is on the TAIL ONLY here. If the tail pass reverts to
  // start_duration it eats 100ms of the tone and this fails at ~0.90s; if the
  // tail pass is dropped entirely, the padding survives and the duration check
  // fails instead. Both directions are caught.
  it('the TAIL pass trims padding without eating the end of the speech', async () => {
    if (!tmpDir) return
    const src = path.join(tmpDir, 'tailpad.webm')
    execFileSync('ffmpeg', [
      '-v', 'quiet', '-y', '-f', 'lavfi', '-i', `sine=f=440:d=${TONE_SEC}:r=48000`,
      '-af', 'apad=pad_dur=1.0',
      '-c:a', 'libopus', '-b:a', '96k', src,
    ])
    const { buffer, metadata } = await processRecordingBuffer(fs.readFileSync(src), {
      inputFormat: 'webm', trimSilence: true, normalize: false,
    })
    expect(metadata.processed).toBe(true)

    // The whole tone must reach the end. Old start_duration tail: 0.899s.
    expect(audibleSpan(buffer)).toBeGreaterThan(0.97)
    // …and the 1.0s of tail padding must be gone bar the retained sliver.
    expect(metadata.durationMs).toBeLessThan((TONE_SEC + RETAIN_SEC) * 1000 + 150)
  }, 60000)

  // An all-silent take must still collapse to nothing, so the MIN_TAKE_MS guard
  // in the upload handler keeps catching muted mics. Raising retention must not
  // reopen the 834-byte empty-stub hole that put 26 silent clips into cym_n.
  it('a silent take still collapses to nothing (empty-stub guard holds)', async () => {
    if (!tmpDir) return
    const src = path.join(tmpDir, 'silent.webm')
    execFileSync('ffmpeg', [
      '-v', 'quiet', '-y', '-f', 'lavfi', '-i', 'anoisesrc=d=3:c=pink:a=0.0018:r=48000',
      '-c:a', 'libopus', '-b:a', '96k', src,
    ])
    const { metadata } = await processRecordingBuffer(fs.readFileSync(src), {
      inputFormat: 'webm', trimSilence: true, normalize: false,
    })
    // Either the encode yields nothing decodable, or it is far under the
    // handler's 100ms floor. Both mean the take is refused rather than stored.
    expect(metadata.durationMs || 0).toBeLessThan(100)
  }, 60000)
})
