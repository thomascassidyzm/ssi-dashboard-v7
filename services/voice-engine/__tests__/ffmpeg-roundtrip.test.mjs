/**
 * ffmpeg smoke test — proves chop + concat round-trips on locally generated
 * tone fixtures (ffmpeg sine). No S3, no DB, no TTS, no network.
 *
 * Fixture model:
 *   "slow take"    = 3 tones separated by 400ms silences (speaker pausing
 *                    between LEGO chunks — the autocue slow pass)
 *   "natural take" = the same 3 tones butted together (continuous speech)
 *
 * Round trip:
 *   slow-gap align (slow) → 3 chunks → transfer onto natural → cut segments
 *   → crossfade splice → output duration ≈ natural take duration.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

import align from '../align.cjs'
import { spliceSegmentsToFile } from '../splicer.cjs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const audioProcessor = require('../../audio-processor.cjs')

const TONES = [
  { freq: 440, durMs: 700 },
  { freq: 660, durMs: 900 },
  { freq: 550, durMs: 700 },
]
const GAP_MS = 400
const CHUNK_TEXTS = ['јас сакам', 'да зборувам', 'македонски']

let dir
let slowTake
let naturalTake

function sine(outPath, freq, durMs, withSilencePadMs = 0) {
  // Generate tone (and optional trailing silence) as WAV, then concat later.
  execFileSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', `sine=frequency=${freq}:duration=${durMs / 1000}`,
    ...(withSilencePadMs > 0
      ? ['-af', `apad=pad_dur=${withSilencePadMs / 1000}`]
      : []),
    '-ar', '44100', '-ac', '1',
    outPath,
  ])
}

function concatWavs(inputs, outPath) {
  const list = path.join(dir, `list-${path.basename(outPath)}.txt`)
  fs.writeFileSync(list, inputs.map(f => `file '${f}'`).join('\n'))
  execFileSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'concat', '-safe', '0', '-i', list,
    '-c', 'copy', outPath,
  ])
}

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 've-roundtrip-'))

  // Slow take: tone + 400ms silence after each (trailing silence on last too).
  const slowParts = TONES.map((t, i) => {
    const p = path.join(dir, `slow-part-${i}.wav`)
    sine(p, t.freq, t.durMs, GAP_MS)
    return p
  })
  slowTake = path.join(dir, 'slow-take.wav')
  concatWavs(slowParts, slowTake)

  // Natural take: tones butted together, no gaps.
  const naturalParts = TONES.map((t, i) => {
    const p = path.join(dir, `nat-part-${i}.wav`)
    sine(p, t.freq, t.durMs, 0)
    return p
  })
  naturalTake = path.join(dir, 'natural-take.wav')
  concatWavs(naturalParts, naturalTake)
}, 60000)

describe('slow-gap alignment on generated tones', () => {
  it('detects exactly 3 voiced chunks in the slow take', async () => {
    const result = await align.alignSlowGapTake(slowTake, CHUNK_TEXTS)
    expect(result.ok).toBe(true)
    expect(result.chunks).toHaveLength(3)
    // Each detected chunk should be roughly the tone duration.
    for (let i = 0; i < 3; i++) {
      expect(result.chunks[i].text).toBe(CHUNK_TEXTS[i])
      expect(Math.abs(result.chunks[i].durationMs - TONES[i].durMs)).toBeLessThan(150)
    }
  }, 30000)

  it('gates on chunk-count mismatch instead of guessing', async () => {
    const result = await align.alignSlowGapTake(slowTake, ['only', 'two'])
    expect(result.ok).toBe(false)
    expect(result.detectedCount).toBe(3)
  }, 30000)
})

describe('align slow → cut natural → splice (the full round trip)', () => {
  it('chop + concat round-trips within duration tolerance', async () => {
    const pair = await align.alignTakePair({
      slowPath: slowTake,
      naturalPath: naturalTake,
      expectedChunks: CHUNK_TEXTS,
    })
    expect(pair.ok).toBe(true)
    expect(pair.cadence).toBe('natural')
    // Continuous tones have no 150ms gaps → proportional transfer kicks in.
    expect(pair.naturalMethod).toBe('transferred')
    expect(pair.chunks).toHaveLength(3)

    // Cut the natural take at the transferred boundaries.
    const segDir = path.join(dir, 'segments')
    const cuts = await align.cutSegments(pair.cutPath, pair.chunks, segDir, audioProcessor)
    expect(cuts).toHaveLength(3)
    for (const cut of cuts) {
      expect(fs.existsSync(cut.filePath)).toBe(true)
      expect(cut.durationMs).toBeGreaterThan(300)
      // Filenames are opaque — no chunk text leaks into the path.
      expect(path.basename(cut.filePath)).toMatch(/^seg-\d{3}\.mp3$/)
    }
    const totalCutMs = cuts.reduce((s, c) => s + c.durationMs, 0)
    const naturalMs = await align.getAudioDurationMs(naturalTake)
    // Segments (with 20ms pads) should re-cover the natural take.
    expect(Math.abs(totalCutMs - naturalMs)).toBeLessThan(500)

    // Splice the segments back into one phrase.
    const outPath = path.join(dir, 'spliced.mp3')
    const { durationMs } = await spliceSegmentsToFile(
      cuts.map(c => c.filePath), outPath, { audioProcessor }
    )
    expect(fs.existsSync(outPath)).toBe(true)
    expect(fs.statSync(outPath).size).toBeGreaterThan(1000)
    // 2 crossfades of 20ms shave ~40ms; allow generous codec padding either way.
    expect(Math.abs(durationMs - naturalMs)).toBeLessThan(600)
  }, 120000)

  it('single-chunk phrases pass straight through the safe encoder', async () => {
    const single = path.join(dir, 'single-in.wav')
    sine(single, 500, 800)
    const out = path.join(dir, 'single-out.mp3')
    const { durationMs } = await spliceSegmentsToFile([single], out, { audioProcessor })
    expect(Math.abs(durationMs - 800)).toBeLessThan(300)
  }, 30000)
})
