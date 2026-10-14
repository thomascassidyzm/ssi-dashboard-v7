import { describe, it, expect } from 'vitest'
const { normalizeForAudio, normalizeForDb, audioKeyCandidates } = require('./text-normalize.cjs')

describe('normalizeForAudio', () => {
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
  // Tom 2026-10-13: capitalisation never distinguishes a recording, a question mark does.
  it('KEEPS a trailing ? so "Onde era?" and "onde era" are different recordings', () => {
    expect(normalizeForDb('Onde era?')).toBe('onde era?')
    expect(normalizeForDb('Onde era')).toBe('onde era')
    expect(normalizeForDb('Onde era?')).not.toBe(normalizeForDb('onde era'))
    expect(normalizeForDb('emin misin?')).toBe('emin misin?')
  })
  it('folds case: "Onde Era?" and "onde era?" are the same recording', () => {
    expect(normalizeForDb('Onde Era?')).toBe(normalizeForDb('onde era?'))
  })
  it('collapses ?-runs and ?-mixed-with-!/. to a single ?', () => {
    expect(normalizeForDb('what?!')).toBe('what?')
    expect(normalizeForDb('what!?')).toBe('what?')
    expect(normalizeForDb('what??')).toBe('what?')
    expect(normalizeForDb('what?.')).toBe('what?')
  })
  it('treats the fullwidth ？ as the same question mark, stored ASCII', () => {
    expect(normalizeForDb('本当に？')).toBe('本当に?')
    expect(normalizeForDb('本当に?')).toBe('本当に?')
  })
  it('drops a space before the ? (French "tu viens ?" is the same recording as "tu viens?")', () => {
    expect(normalizeForDb('Tu viens ?')).toBe('tu viens?')
  })
  it('still strips trailing . ! and the CJK stops from a statement', () => {
    expect(normalizeForDb('vamos！')).toBe('vamos')
    expect(normalizeForDb('I am sure.')).toBe('i am sure')
    expect(normalizeForDb('我很惊讶。')).toBe('我很惊讶')
  })
  it('leaves a leading ¿ alone and keeps the closing ?', () => {
    expect(normalizeForDb('¿Verdad?')).toBe('¿verdad?')
    expect(normalizeForDb('¡Vamos!')).toBe('¡vamos')
  })
  it('does NOT collapse internal whitespace — normalize_text does not either', () => {
    expect(normalizeForDb('how  long?')).toBe('how  long?')
  })
  it('is empty-safe', () => {
    expect(normalizeForDb('')).toBe('')
    expect(normalizeForDb(null)).toBe('')
  })
})

describe('normalizeForAudio agrees with normalizeForDb', () => {
  it('differs only by collapsing internal whitespace', () => {
    for (const t of ['Onde era?', 'what?!', '本当に？', 'Tu viens ?', 'vamos!']) {
      expect(normalizeForAudio(t)).toBe(normalizeForDb(t))
    }
    expect(normalizeForAudio('how   long?')).toBe('how long?')
  })
})

describe('audioKeyCandidates', () => {
  it('a question has ONE key, with the ?; the statement has another', () => {
    expect(audioKeyCandidates('how long?')).toEqual(['how long?'])
    expect(audioKeyCandidates('how long')).toEqual(['how long'])
  })
  it('collapses to a single key when the two conventions agree', () => {
    expect(audioKeyCandidates('I am sure.')).toEqual(['i am sure'])
  })
  it('drops empties rather than emitting a key that matches every blank row', () => {
    expect(audioKeyCandidates('')).toEqual([])
    expect(audioKeyCandidates('...')).toEqual([])
  })
})
