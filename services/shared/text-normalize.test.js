import { describe, it, expect } from 'vitest'
const { normalizeForAudio, normalizeForDb, audioKeyCandidates } = require('./text-normalize.cjs')

describe('normalizeForAudio (legacy JS convention, rows written before ~Mar 2026)', () => {
  it('lowercases, trims and collapses internal whitespace', () => {
    expect(normalizeForAudio('  How   Long  ')).toBe('how long')
  })
  it('strips trailing . and ! but KEEPS a trailing ?', () => {
    expect(normalizeForAudio('I am sure.')).toBe('i am sure')
    expect(normalizeForAudio('I am sure!')).toBe('i am sure')
    expect(normalizeForAudio('emin misin?')).toBe('emin misin?')
  })
  it('is empty-safe', () => {
    expect(normalizeForAudio('')).toBe('')
    expect(normalizeForAudio(null)).toBe('')
  })
})

describe('normalizeForDb (byte-identical to the SQL normalize_text the trigger runs)', () => {
  it('strips a trailing ? — this is the whole disagreement with normalizeForAudio', () => {
    expect(normalizeForDb('emin misin?')).toBe('emin misin')
    expect(normalizeForDb('how long?')).toBe('how long')
  })
  it('strips ALL trailing punctuation in the set, as rtrim(t, set) does', () => {
    expect(normalizeForDb('what?!')).toBe('what')
    expect(normalizeForDb('¿verdad?')).toBe('¿verdad')
  })
  it('handles the Spanish and CJK marks in the set', () => {
    expect(normalizeForDb('本当に？')).toBe('本当に')
    expect(normalizeForDb('vamos！')).toBe('vamos')
  })
  it('does NOT collapse internal whitespace — normalize_text does not either', () => {
    expect(normalizeForDb('how  long?')).toBe('how  long')
  })
  it('is empty-safe', () => {
    expect(normalizeForDb('')).toBe('')
    expect(normalizeForDb(null)).toBe('')
  })
})

describe('audioKeyCandidates', () => {
  it('returns both stored conventions for question text, DB form first', () => {
    expect(audioKeyCandidates('how long?')).toEqual(['how long', 'how long?'])
  })
  it('collapses to a single key when the two conventions agree', () => {
    expect(audioKeyCandidates('I am sure.')).toEqual(['i am sure'])
    expect(audioKeyCandidates('hello')).toEqual(['hello'])
  })
  it('reaches the real cym_s_for_eng human row stored as "how long"', () => {
    // 52c6ef99-360e-43a9-90e8-80203d9cf050: text 'how long?', stored
    // text_normalized 'how long'. The old .eq(normalizeForAudio(text)) could
    // not see it, so TTS was free to upsert over a human recording.
    expect(audioKeyCandidates('how long?')).toContain('how long')
  })
  it('drops empties rather than emitting a key that matches every blank row', () => {
    expect(audioKeyCandidates('')).toEqual([])
    expect(audioKeyCandidates('...')).toEqual([])
  })
})
