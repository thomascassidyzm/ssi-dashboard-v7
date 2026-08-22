/**
 * The human-recording trim must not eat speech — at either end, at any level.
 *
 * Two defects are guarded here, both of which shipped and were heard.
 *
 * T-20 (2026-01-19 to 2026-08-14): the chain used silenceremove's
 * `start_duration`, which DISCARDS everything before the point where enough
 * non-silence has accumulated — including the audio that proved it was not
 * silence. It destroyed exactly 100ms off each end of every human take and
 * butchered 107 cym_n clips whose originals were never archived.
 * See docs/audio-forensics-2026-08-14/.
 *
 * The soft onset (heard by Tom 2026-08-21): the chain then cut at a fixed -40dB
 * gate, so a word whose onset climbed underneath that level lost its front —
 * 375-525ms of it on his own takes — even though the raw archive held seconds
 * of clean lead-in. The trim now DETECTS the read and cuts a margin outside it.
 *
 * These drive the REAL processRecordingBuffer over real WebM/Opus payloads (what
 * the browser actually sends), so they fail if anyone puts a bare level gate
 * back in, drops an edge, or narrows the margin into the speech.
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
// Must match TRIM_MARGIN_SEC in audio-processor.cjs — the room the trim leaves
// outside the detected read at each end.
const RETAIN_SEC = 0.35

let tmpDir
let webmTake

/** Length of the region above an arbitrary sample floor, in seconds. */
function audibleSpanAt(mp3Buffer, floor) {
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
    if (Math.abs(a[i]) > floor) {
      if (first < 0) first = i
      last = i
    }
  }
  return first < 0 ? 0 : (last - first) / SAMPLE_RATE
}

/** Length of the contiguous speech-level region, in seconds. */
function audibleSpan(mp3Buffer) {
  return audibleSpanAt(mp3Buffer, SPEECH_FLOOR)
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

  // TAIL-SPECIFIC GUARD. Head and tail are two ends of one atrim range, and an
  // edit can still get one right and the other wrong. Tom heard exactly that
  // asymmetry ("the ends were clipped worse than the beginnings"), so the tail
  // gets its own assertion rather than riding on the head's.
  //
  // Padding is on the TAIL ONLY here. A trim that bites the end fails the span
  // check at ~0.90s; a trim that does nothing to the tail leaves the 1.0s of
  // padding and fails the duration check. Both directions are caught.
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

  // THE SOFT ONSET. The defect Tom heard on 2026-08-21 was not the T-20 bug
  // coming back — his raw takes carried 1.3-4.7s of clean lead-in — it was the
  // fixed -40dB gate cutting at the first sample loud enough to clear it and
  // discarding the 375-525ms of onset climbing underneath. Here a tone ramps up
  // from silence over 400ms before reaching full level: cutting a margin
  // outside the DETECTED read keeps the ramp, a bare level gate eats most of
  // it. Fails if anyone cuts at the detection point again.
  it('keeps a quiet onset that climbs from under -40dB', async () => {
    if (!tmpDir) return
    const src = path.join(tmpDir, 'ramp.webm')
    execFileSync('ffmpeg', [
      '-v', 'quiet', '-y', '-f', 'lavfi', '-i', 'sine=f=440:d=1.4:r=48000',
      // 0.5s silence, then 0.4s ramping in from silence, then 1.0s at level.
      '-af', 'afade=t=in:st=0:d=0.4,adelay=500,apad=pad_dur=0.5',
      '-c:a', 'libopus', '-b:a', '96k', src,
    ])
    const { buffer, metadata } = await processRecordingBuffer(fs.readFileSync(src), {
      inputFormat: 'webm', trimSilence: true, normalize: false,
    })
    expect(metadata.processed).toBe(true)
    // The gate must have been set from the take, not from the old constant.
    expect(metadata.filters.trimFoundRead).toBe(true)
    // Measured well below the tone's plateau, so this counts the ramp too: the
    // 1.0s plateau plus most of the 0.4s ramp must survive. Cutting at the
    // detection point lands around 1.05s here.
    const span = audibleSpanAt(buffer, 328 /* ≈ -40dBFS */)
    expect(span).toBeGreaterThan(1.25)
  }, 60000)

  // THE SHAPE THE BROWSER ACTUALLY SENDS. MediaRecorder muxes WebM as a live
  // stream into a non-seekable sink, so it never returns to write the duration
  // element and every uploaded take reports `Duration: N/A`. Read detection
  // trusted that header, so on 2026-08-21 it returned null for every real take,
  // the chain cut each one to 1ms, and the upload handler refused an 834-byte
  // stub — takes that sounded perfect on playback came back "FAILED, not
  // saved". The fixtures above are written by ffmpeg to a seekable FILE, which
  // DOES carry the header, which is exactly why they stayed green through it.
  //
  // `-f webm pipe:1` makes ffmpeg mux to a non-seekable sink the same way, so
  // this fixture has the defect's shape. Fails if length is ever taken from a
  // container's declaration again instead of from what the decoder played out.
  it('trims a stream-muxed take whose container declares no duration', async () => {
    if (!tmpDir) return
    const src = path.join(tmpDir, 'nodur.webm')
    // 0.6s silence, 2.0s tone, 0.6s silence — muxed to a pipe, so no header.
    fs.writeFileSync(src, execFileSync('ffmpeg', [
      '-v', 'quiet', '-f', 'lavfi', '-i', `sine=f=440:d=${TONE_SEC * 2}:r=48000`,
      '-af', `adelay=${PAD_SEC * 1000 + 100},apad=pad_dur=${PAD_SEC + 0.1}`,
      '-c:a', 'libopus', '-b:a', '96k', '-f', 'webm', 'pipe:1',
    ], { maxBuffer: 64 * 1024 * 1024 }))

    const { buffer, metadata } = await processRecordingBuffer(fs.readFileSync(src), {
      inputFormat: 'webm', trimSilence: true, normalize: false,
    })
    expect(metadata.processed).toBe(true)
    // The read was FOUND. Before the fix this was false and the take died here.
    expect(metadata.filters.trimFoundRead).toBe(true)
    // And the tone survived whole rather than collapsing to a 1ms stub.
    expect(metadata.durationMs).toBeGreaterThan(TONE_SEC * 2 * 1000)
    expect(audibleSpan(buffer)).toBeGreaterThan(TONE_SEC * 2 - 0.03)
  }, 60000)

  // A TAKE THAT ARRIVED WITH AUDIO IS NEVER CUT TO NOTHING (Tom, 2026-08-22).
  //
  // Seventeen consecutive takes were refused as "no audible speech" on the
  // evidence of an 834-byte stub the processing itself had made. "No read
  // found" and "no audio present" are different findings; the second may not be
  // asserted on the evidence of the first. Where the detector finds nothing but
  // the file demonstrably has audio in it, the take is kept WHOLE — the trade
  // this step already commits to, since the raw is archived before it runs.
  it('keeps an audible take whole when the detector finds no read in it', async () => {
    if (!tmpDir) return
    const src = path.join(tmpDir, 'audible-undetected.webm')
    // Continuous tone at a plainly audible level, with no silence anywhere for
    // silencedetect to bound a read against.
    execFileSync('ffmpeg', [
      '-v', 'quiet', '-y', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=3',
      '-af', 'volume=-12dB', '-c:a', 'libopus', '-b:a', '96k', src,
    ])
    const { metadata } = await processRecordingBuffer(fs.readFileSync(src), {
      inputFormat: 'webm', trimSilence: true, normalize: false,
    })
    expect(metadata.processed).toBe(true)
    expect(metadata.inputAudible).toBe(true)
    // Whatever the detector concluded, the audio survived.
    expect(metadata.durationMs).toBeGreaterThan(100)
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
