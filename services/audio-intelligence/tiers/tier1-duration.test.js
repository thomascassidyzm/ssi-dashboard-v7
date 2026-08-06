// Run: npx vitest run services/audio-intelligence/tiers/tier1-duration.test.js
import { test, expect } from 'vitest'
import t1 from './tier1-duration.cjs'

const rates = t1.loadRates()

test('the shipped calibration covers the voices it was fitted on', () => {
  expect(rates).not.toBe(null)
  for (const v of ['eve', 'ara', 'leo']) {
    expect(rates.voices[v].ms_per_syllable > 0).toBe(true)
    expect(rates.voices[v].n >= 100).toBe(true)
  }
})

test('syllables are counted by vowel groups, per language', () => {
  expect(t1.countSyllables('so oft wie möglich', 'deu').sylls).toBe(5)
  expect(t1.countSyllables('to speak German with you', 'eng').sylls).toBe(6)
  // an umlaut is a vowel in German and must not be dropped
  expect(t1.countSyllables('üben', 'deu').sylls).toBe(2)
  // every word counts at least one, even with no vowel the regex recognises
  expect(t1.countSyllables('mm', 'eng').sylls).toBe(1)
})

test('a one-syllable clip is not scored - it is onset and release, not a rate', () => {
  const r = t1.score({ speechMs: 300, script: 'ich', language: 'deu', voice: 'leo' })
  expect(r.scored).toBe(false)
  expect(r.flagged).toBe(null)
})

test('an unknown voice is not scored rather than scored against a borrowed rate', () => {
  const r = t1.score({ speechMs: 900, script: 'so oft wie möglich', language: 'deu', voice: 'nobody' })
  expect(r.scored).toBe(false)
  expect(r.reason).toMatch(/calibrate it/)
})

test('a clip at its voice\'s own measured length passes', () => {
  const v = rates.voices.ara
  const sylls = t1.countSyllables('so oft wie möglich', 'deu').sylls
  const exact = v.intercept_ms + v.ms_per_syllable * sylls
  const r = t1.score({ speechMs: Math.round(exact), script: 'so oft wie möglich', language: 'deu', voice: 'ara' })
  expect(r.flagged).toBe(false)
  expect(Math.abs(r.z) < 0.01).toBe(true)
})

test('ground truth: 414ebf08 is short enough for tier 1 to see, f0404e5d is not', () => {
  // 414ebf08 lost a whole chunk; f0404e5d lost 374ms, which is inside eve's own spread.
  // This pins the honest limit of tier 1, not a success.
  const a = t1.score({ speechMs: 841, script: 'so oft wie möglich', language: 'deu', voice: 'ara' })
  expect(a.flagged).toBe(true)
  const b = t1.score({ speechMs: 936, script: 'to speak German with you', language: 'eng', voice: 'eve' })
  expect(b.flagged).toBe(false)
  expect(b.z < 0).toBe(true)   // it IS short, just not beyond this voice's spread
})

test('the shipped operating point is the one the sweep chose', () => {
  expect(t1.DEFAULT_Z).toBe(-1.5)
  expect(t1.MIN_SYLLABLES).toBe(2)
})
