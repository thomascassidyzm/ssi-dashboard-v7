/**
 * The gate stack's VERDICT LOGIC — the behaviour the whole fidelity design rests on.
 *
 * These tests drive the pure parts: `disposition()`, the loudness band, and the speech
 * span. They deliberately need no audio, no ffmpeg and no whisper, because a test that
 * needs a decode is a test nobody runs and this is the logic that must not drift.
 *
 * The headline assertion is the one behaviour change in the document: `pass: null` on an
 * applicable refusing gate REFUSES. If that ever flips back to admitting, the store's
 * promise — everything in it passed — is false and nothing downstream can tell.
 *
 * Run: npx vitest run services/audio-intelligence/gate-stack.test.js
 */

import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require_ = createRequire(import.meta.url)
const { gateResult, disposition, summarise } = require_('./gate-stack.cjs')
const loudness = require_('./tiers/loudness.cjs')
const speechSpan = require_('./tiers/speech-span.cjs')

const pass = (id, extra = {}) => gateResult(id, { pass: true, reason: 'ok', ...extra })

describe('disposition — null refuses', () => {
  it('admits a clip that passes every applicable refusing gate', () => {
    const d = disposition([pass('speech-span'), pass('loudness'), pass('tail-shape'), pass('words')])
    expect(d.admit).toBe(true)
    expect(d.outcome).toBe('admitted')
    expect(d.refusedBy).toEqual([])
  })

  it('REFUSES a clip a refusing gate could not measure — unchecked is not passed', () => {
    const d = disposition([
      pass('speech-span'),
      gateResult('phonology', { pass: null, available: false, reason: 'no whisper on this box' }),
    ])
    expect(d.admit).toBe(false)
    expect(d.outcome).toBe('quarantined')
    expect(d.refusedBy).toContain('phonology')
    expect(d.unmeasured).toContain('phonology')
    expect(d.reason).toMatch(/could not be measured/)
  })

  it('refuses on an outright failure and names the gate', () => {
    const d = disposition([pass('speech-span'), gateResult('tail-shape', { pass: false, reason: 'cut' })])
    expect(d.admit).toBe(false)
    expect(d.refusedBy).toEqual(['tail-shape'])
    expect(d.unmeasured).toEqual([])
  })

  it('a NOT APPLICABLE gate refuses nothing and is recorded as skipped', () => {
    const d = disposition([
      pass('speech-span'),
      gateResult('phonology', { applicable: false, reason: 'English target' }),
    ])
    expect(d.admit).toBe(true)
    expect(d.skipped).toEqual(['phonology'])
    expect(d.refusedBy).toEqual([])
  })

  it('distinguishes DOES NOT APPLY from CANNOT MEASURE — the same gate, opposite dispositions', () => {
    const notApplicable = disposition([gateResult('phonology', { applicable: false })])
    const cannotMeasure = disposition([gateResult('phonology', { pass: null, available: false })])
    expect(notApplicable.admit).toBe(true)
    expect(cannotMeasure.admit).toBe(false)
  })

  it('an ADVISORY gate is recorded and never blocks, even when it fails', () => {
    const d = disposition([
      pass('speech-span'),
      gateResult('syllable-rate', { pass: false, refusing: false, calibrated: false, reason: 'no fitted counter for cym' }),
    ])
    expect(d.admit).toBe(true)
    expect(d.advisory).toEqual(['syllable-rate'])
  })

  it('an advisory gate that could not measure does not refuse either', () => {
    const d = disposition([gateResult('syllable-rate', { pass: null, refusing: false })])
    expect(d.admit).toBe(true)
    expect(d.refusedBy).toEqual([])
  })

  it('carries the role, because a measurement must say which job it is doing', () => {
    expect(disposition([pass('loudness')], { role: 'audit' }).role).toBe('audit')
    expect(disposition([pass('loudness')]).role).toBe('admission')
  })

  it('summarise says unchecked rather than pretending a pass', () => {
    const verdict = {
      outcome: 'quarantined',
      role: 'admission',
      order: ['loudness', 'phonology'],
      gates: {
        loudness: pass('loudness'),
        phonology: gateResult('phonology', { pass: null, available: false }),
      },
    }
    expect(summarise(verdict)).toBe('quarantined (admission) · loudness: pass · phonology: unchecked')
  })
})

describe('loudness — the measurement that was already being thrown away', () => {
  const band = { targetLufs: -15.5, toleranceDb: 1.5, truePeakCeilingDbtp: -1.0 }

  it('passes inside the band', () => {
    const v = loudness.verdict({ measured: true, lufs: -15.9, truePeakDbtp: -1.6, lra: 5 }, band)
    expect(v.pass).toBe(true)
  })

  it('fails the quiet clip the single loudnorm pass leaves 5 dB short', () => {
    const v = loudness.verdict({ measured: true, lufs: -21.0, truePeakDbtp: -3.0, lra: 5 }, band)
    expect(v.pass).toBe(false)
    expect(v.reason).toMatch(/outside/)
  })

  it('fails a clip over the true-peak ceiling even when its loudness is fine', () => {
    const v = loudness.verdict({ measured: true, lufs: -15.5, truePeakDbtp: -0.2 }, band)
    expect(v.pass).toBe(false)
    expect(v.reason).toMatch(/true peak/)
  })

  it('returns null — not a pass — when nothing could be measured', () => {
    const v = loudness.verdict({ measured: false, lufs: null, error: 'ffmpeg missing' }, band)
    expect(v.pass).toBe(null)
  })

  it('says so rather than passing silently when ffmpeg reports no true peak', () => {
    const v = loudness.verdict({ measured: true, lufs: -15.5, truePeakDbtp: null }, band)
    expect(v.pass).toBe(true)
    expect(v.truePeakMeasured).toBe(false)
    expect(v.reason).toMatch(/not reported/)
  })

  it('parses ffmpeg ebur128 output, taking the final summary values', () => {
    const out = [
      '[Parsed_ebur128_0 @ 0x1] t: 1.0  I: -20.1 LUFS',
      '[Parsed_ebur128_0 @ 0x1] Summary:',
      '  I:         -15.4 LUFS',
      '  LRA:         4.2 LU',
      '  Peak:       -1.7 dBFS',
    ].join('\n')
    expect(loudness.parseEbur128(out)).toEqual({ lufs: -15.4, truePeakDbtp: -1.7, lra: 4.2 })
  })
})

describe('speech span — measure the speech, never the padding', () => {
  const frames = (spec) => spec

  it('finds the span and excludes the mastering padding', () => {
    // 10 ms frames: 5 of floor, 10 of speech, 5 of floor.
    const db = [...Array(5).fill(-70), ...Array(10).fill(-20), ...Array(5).fill(-70)]
    const s = speechSpan.spanFromFrames(frames(db))
    expect(s.startMs).toBe(50)
    expect(s.endMs).toBe(150)
    expect(s.speechMs).toBe(100)
    expect(s.fileMs).toBe(200)
  })

  it('reports no speech in a silent stub rather than inventing a span', () => {
    const s = speechSpan.spanFromFrames(Array(20).fill(-70))
    expect(s.measured).toBe(true)
    expect(s.speechMs).toBe(0)
    expect(speechSpan.verdict(s).pass).toBe(false)
  })

  it('is null — not false — when there was nothing to measure', () => {
    expect(speechSpan.verdict(speechSpan.spanFromFrames([])).pass).toBe(null)
  })

  it('uses the clip\'s own floor, so a quietly mastered clip is not called silent', () => {
    const quiet = [...Array(5).fill(-90), ...Array(10).fill(-40), ...Array(5).fill(-90)]
    expect(speechSpan.spanFromFrames(quiet).speechMs).toBe(100)
  })
})
