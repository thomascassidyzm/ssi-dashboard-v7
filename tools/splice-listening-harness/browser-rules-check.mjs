#!/usr/bin/env node
/**
 * browser-rules-check.mjs — run the BENCH's own detector over Sascha's staged
 * takes.
 *
 * The staging script gated on the SERVER aligner (ffmpeg silencedetect, an
 * absolute -35 dBFS on a loudnormed mp3). The bench runs the in-browser port,
 * which peak-normalises first and guards against a noisy floor. Those two do
 * NOT agree, so a line the server can cut may still refuse on the bench —
 * which is how the first drive-through came back with an empty Sascha tab.
 *
 * This decides staging on the rules the bench actually uses. Read-only.
 */
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

const BENCH = '/home/tomcassidy/command-surface/public/evidence/splice-bench-2026-08-24'
const { detectVoicedRegions } = await import(pathToFileURL(path.join(BENCH, 'takeSplice.js')).href)

/** Decode an mp3 to mono Float32 at its own rate — what decodeMono gives the page. */
function decode(file, rate = 44100) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(rate), '-'],
    { maxBuffer: 1 << 28 })
  return { samples: new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4), sampleRate: rate }
}

const man = JSON.parse(fs.readFileSync(path.join(BENCH, 'sascha', 'manifest.json'), 'utf8'))
let ok = 0
const rows = []
for (const L of man.lines) {
  const { samples, sampleRate } = decode(path.join(BENCH, 'sascha', L.slow))
  const det = detectVoicedRegions(samples, sampleRate)
  const good = det.regions.length === L.chunks.length
  if (good) ok++
  rows.push({
    text: L.text, want: L.chunks.length, got: det.regions.length, good,
    noisy: det.noisy, thresholdDb: Math.round(det.thresholdDb), floorDb: Math.round(det.floorDb),
  })
}
console.log(JSON.stringify({ total: man.lines.length, passUnderBrowserRules: ok, rows }, null, 1))
