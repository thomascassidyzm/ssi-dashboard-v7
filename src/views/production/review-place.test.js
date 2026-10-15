// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { readPlace, savePlace, clearPlace, seedOfLego, roundOfLego } from './review-place.js'

describe('review place', () => {
  beforeEach(() => localStorage.clear())

  it('remembers the last LEGO per reviewer and per course', () => {
    savePlace('Deborah@example.com', 'deu_for_eng', 'S0567L02')
    expect(readPlace('deborah@example.com', 'deu_for_eng').legoId).toBe('S0567L02')
    expect(readPlace('deborah@example.com', 'fra_for_eng')).toBeNull()
    expect(readPlace('kai@example.com', 'deu_for_eng')).toBeNull()
    clearPlace('deborah@example.com', 'deu_for_eng')
    expect(readPlace('deborah@example.com', 'deu_for_eng')).toBeNull()
  })
  it('never remembers something that is not a LEGO id', () => {
    expect(savePlace('d@x', 'deu_for_eng', 'R312')).toBeNull()
    localStorage.setItem('popty_review_place:d@x:deu_for_eng', '{"legoId":"junk"}')
    expect(readPlace('d@x', 'deu_for_eng')).toBeNull()
  })
  it('reads the seed off the LEGO id', () => {
    expect(seedOfLego('S0567L02')).toBe(567)
    expect(seedOfLego('nope')).toBeNull()
  })
  it('finds the round the LEGO is in today, whatever number it had yesterday', () => {
    const today = [{ roundNumber: 318, legoId: 'S0566L01' }, { roundNumber: 319, legoId: 'S0567L02' }]
    expect(roundOfLego(today, 'S0567L02')).toBe(319)
    expect(roundOfLego(today, 'S0999L01')).toBeNull()
  })
})
