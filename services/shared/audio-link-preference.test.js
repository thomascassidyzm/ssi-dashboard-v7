// Unit tests for the audio-row link preference (replaces bare-LIMIT-1 picks).
// Run: npx vitest run services/shared/audio-link-preference.test.js
import { describe, it, expect } from 'vitest'
import { pickPreferredAudioRow } from './audio-link-preference.cjs'

const row = (id, origin, created_at) => ({ id, origin, created_at })

describe('pickPreferredAudioRow', () => {
  it('handles missing sides (first row seeds the map)', () => {
    const a = row('A', 'tts', '2026-01-01')
    expect(pickPreferredAudioRow(undefined, a)).toBe(a)
    expect(pickPreferredAudioRow(a, undefined)).toBe(a)
  })

  it('human (precious) beats tts regardless of age', () => {
    const oldHuman = row('H', 'human', '2025-01-01')
    const newTts = row('T', 'tts', '2026-06-01')
    expect(pickPreferredAudioRow(oldHuman, newTts)).toBe(oldHuman)
    expect(pickPreferredAudioRow(newTts, oldHuman)).toBe(oldHuman)
  })

  it('same origin: newest created_at wins (latest take/generation is current)', () => {
    const older = row('A', 'tts', '2026-01-01T00:00:00Z')
    const newer = row('B', 'tts', '2026-06-01T00:00:00Z')
    expect(pickPreferredAudioRow(older, newer)).toBe(newer)
    expect(pickPreferredAudioRow(newer, older)).toBe(newer)
  })

  it('same origin + timestamp: larger id is the deterministic tiebreak', () => {
    const a = row('AAA', 'human', '2026-01-01')
    const b = row('BBB', 'human', '2026-01-01')
    expect(pickPreferredAudioRow(a, b)).toBe(b)
    expect(pickPreferredAudioRow(b, a)).toBe(b)
  })

  it('is order-independent (a fold over any row order picks the same winner)', () => {
    const rows = [
      row('1', 'tts', '2026-03-01'),
      row('2', 'human', '2025-12-01'),
      row('3', 'tts', '2026-06-01'),
      row('4', 'human', '2026-01-01'),
    ]
    const fold = (list) => list.reduce((acc, r) => pickPreferredAudioRow(acc, r), undefined)
    const winner = fold(rows)
    expect(winner.id).toBe('4') // newest human
    expect(fold([...rows].reverse())).toBe(winner)
  })

  it('null/missing created_at sorts older than any timestamp', () => {
    const noTs = row('A', 'tts', null)
    const withTs = row('B', 'tts', '2026-01-01')
    expect(pickPreferredAudioRow(noTs, withTs)).toBe(withTs)
  })
})
