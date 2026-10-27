/**
 * getAudioDuration must work on a machine without sox.
 *
 * sox is not installed on watson-1, where production Popty runs. When this
 * function shelled out to `sox ... stat` and nothing else, the legacy export's
 * Stage 2 ("Extracting S3 durations") turned every file into an error:
 * 0 matched, 0 mismatched, 5,100 errors on ita_for_eng, 2026-10-27 (job #176).
 * It now measures with ffprobe and keeps sox only as a fallback.
 *
 * The ffprobe measure must equal sox's: every MP3 frame, untrimmed. ffprobe's
 * own format duration drops LAME's gapless padding and reads 1-2 frames short,
 * and at Stage 2's zero tolerance that difference is a "mismatch" Stage 3
 * writes back into course_audio.duration_ms. On ita_for_eng's stored values the
 * frame length matched 116 of 200 sampled clips exactly, the trimmed one 84.
 *
 * Run: npx vitest run services/audio-processor.duration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { getAudioDuration } = require('./audio-processor.cjs')
// {} on code without the override, so the sox-absent test still fails on what matters.
const DURATION_TOOLS = require('./audio-processor.cjs').DURATION_TOOLS || {}

let dir
let mp3

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'duration-test-'))
  mp3 = path.join(dir, 'tone.mp3')
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1.5', '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', mp3])
})

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))

describe('getAudioDuration', () => {
  it('measures an mp3 with sox absent', async () => {
    const realSox = DURATION_TOOLS.sox
    DURATION_TOOLS.sox = 'sox-not-installed-here'
    try {
      const d = await getAudioDuration(mp3)
      // 1.5 s at 44.1 kHz plus LAME's delay and padding, counted in whole 1152-sample frames.
      const frames = d * 44100 / 1152
      expect(Math.abs(frames - Math.round(frames))).toBeLessThan(1e-3)
      expect(d).toBeGreaterThan(1.5)
      expect(d).toBeLessThan(1.6)
    } finally {
      DURATION_TOOLS.sox = realSox
    }
  })

  it('names both tools when neither can measure', async () => {
    const real = { ...DURATION_TOOLS }
    DURATION_TOOLS.ffprobe = 'ffprobe-not-installed-here'
    DURATION_TOOLS.sox = 'sox-not-installed-here'
    try {
      await expect(getAudioDuration(mp3)).rejects.toThrow(/ffprobe:.*sox:/)
    } finally {
      Object.assign(DURATION_TOOLS, real)
    }
  })
})
