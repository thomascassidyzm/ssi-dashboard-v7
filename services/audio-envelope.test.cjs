/**
 * Unit tests for the envelope extractor's pure functions (no ffmpeg, no DB).
 * Run: npx vitest run services/audio-envelope
 */

import { describe, it, expect } from 'vitest'

const { extractEnvelopeMetadata, CONSTANTS } = require('./audio-envelope.cjs')

const SAMPLE_RATE = 16000

function toneBurst(samples, startSec, lenSec, amp, freq = 220) {
  const s0 = Math.round(startSec * SAMPLE_RATE)
  const s1 = Math.round((startSec + lenSec) * SAMPLE_RATE)
  for (let i = s0; i < s1 && i < samples.length; i++) {
    samples[i] += amp * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE)
  }
}

describe('extractEnvelopeMetadata', () => {
  it('counts syllable-scale peaks for well-separated bursts', () => {
    const samples = new Float32Array(Math.round(2.0 * SAMPLE_RATE))
    toneBurst(samples, 0.1, 0.3, 0.8)
    toneBurst(samples, 0.6, 0.3, 0.8)
    toneBurst(samples, 1.1, 0.3, 0.8)
    const r = extractEnvelopeMetadata(samples, SAMPLE_RATE)
    expect(r.peakCount).toBe(3)
    expect(r.durationMs).toBe(2000)
    expect(r.peakToMeanRatio).toBeGreaterThan(1)
  })

  it('merges bursts closer than the min-separation window into fewer peaks', () => {
    const samples = new Float32Array(Math.round(1.0 * SAMPLE_RATE))
    toneBurst(samples, 0.1, 0.05, 0.8)
    toneBurst(samples, 0.15, 0.05, 0.81) // 50ms apart, below the 120ms floor
    const r = extractEnvelopeMetadata(samples, SAMPLE_RATE)
    expect(r.peakCount).toBeLessThan(2)
  })

  it('reports a flat/silent clip as zero or one peak, never spurious peaks', () => {
    const samples = new Float32Array(Math.round(1.0 * SAMPLE_RATE)).fill(0)
    const r = extractEnvelopeMetadata(samples, SAMPLE_RATE)
    expect(r.peakCount).toBe(0)
  })

  it('applies the capture-quality gate (weight 0) below minSampleCount', () => {
    const samples = new Float32Array(Math.round(0.05 * SAMPLE_RATE)) // ~2 grid points at 20ms
    toneBurst(samples, 0, 0.05, 0.8)
    const r = extractEnvelopeMetadata(samples, SAMPLE_RATE)
    expect(r.sampleCount).toBeLessThan(CONSTANTS.minSampleCount)
    expect(r.weight).toBe(0)
  })

  it('mumbled/merged single burst yields a wider mean peak width than a sharp one', () => {
    const sharp = new Float32Array(Math.round(1.0 * SAMPLE_RATE))
    toneBurst(sharp, 0.3, 0.05, 0.8)
    const wide = new Float32Array(Math.round(1.0 * SAMPLE_RATE))
    toneBurst(wide, 0.2, 0.4, 0.8)
    const rSharp = extractEnvelopeMetadata(sharp, SAMPLE_RATE)
    const rWide = extractEnvelopeMetadata(wide, SAMPLE_RATE)
    expect(rWide.meanPeakWidthMs).toBeGreaterThan(rSharp.meanPeakWidthMs)
  })
})
