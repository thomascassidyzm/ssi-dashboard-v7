// The #181 rule: Drill cuts are anchored on the take's own word timings, not on the longest silences.
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { planCuts, pieceWindows, interiorGaps, pieceTimings, settleWordGapCut } = require('./drill-cuts.cjs')

// Real shape, from the approved Viktoria take of "Ja, ich hab heute einen langen Tag. Ich hoffe, du hast einen
// schönen Tag. Bis später." (#173), with the silences made adversarial: the comma pause after "hoffe," is the
// LONGEST silence in the take, longer than either sentence pause — what sank the longest-gap splicer on German.
const text = 'Ja, ich hab heute einen langen Tag. Ich hoffe, du hast einen schönen Tag. Bis später.'
const timings = {
  words: ['Ja,', 'ich', 'hab', 'heute', 'einen', 'langen', 'Tag.', 'Ich', 'hoffe,', 'du', 'hast', 'einen', 'schönen', 'Tag.', 'Bis', 'später.'],
  starts: [0.12, 0.866, 1.16, 1.24, 1.48, 1.56, 1.88, 2.757, 2.84, 3.48, 3.64, 3.88, 3.96, 4.36, 5.017, 5.32],
  ends: [0.44, 1.08, 1.16, 1.4, 1.56, 1.88, 2.52, 2.84, 3.32, 3.56, 3.8, 3.96, 4.28, 4.84, 5.24, 5.64],
  source: 'cartesia',
}
const gaps = [[0.47, 0.84], [2.55, 2.74], [3.33, 3.47], [4.86, 5.0]] // "Ja," | "Tag." | "hoffe," | "Tag."
const SENTENCE_GAPS = [[2.55, 2.74], [4.86, 5.0]]

describe('drill-cuts planCuts (#181: anchored on word timings)', () => {
  it('cuts at the sentence pauses even when comma pauses are longer', () => {
    const p = planCuts(text, timings, gaps)
    expect(p.ok).toBe(true)
    expect(p.units.map((u) => u.text)).toEqual(['Ja, ich hab heute einen langen Tag.', 'Ich hoffe, du hast einen schönen Tag.', 'Bis später.'])
    expect(p.cuts.map((c) => c.gap)).toEqual(SENTENCE_GAPS)
    expect(p.cuts.map((c) => c.source)).toEqual(['silence', 'silence'])
  })
  it('falls back to the word gap, flagged, when no silence sits between the sentences', () => {
    const p = planCuts(text, timings, [[0.47, 0.84], [3.33, 3.47]])
    expect(p.cuts.map((c) => c.source)).toEqual(['word-gap', 'word-gap'])
    expect(p.cuts[0].at).toBeCloseTo((2.52 + 2.757) / 2, 3)
  })
  it('a word-gap cut settles on the quietest frame between the two words', () => {
    const c = planCuts(text, timings, []).cuts[0]
    const frames = [{ t: 2.40, db: -60 }, { t: 2.55, db: -30 }, { t: 2.62, db: -48 }, { t: 2.70, db: -40 }, { t: 2.90, db: -70 }]
    expect(settleWordGapCut(c, timings, frames)).toMatchObject({ at: 2.62, db: -48 })
  })
  it('refuses when the timed words are not the turn\'s words', () => {
    expect(planCuts(text, { ...timings, words: timings.words.slice(1) }, gaps).ok).toBe(false)
  })
  it('a one-sentence turn has no cuts', () => {
    const p = planCuts('Guten Morgen, Sarah!', { words: ['Guten', 'Morgen,', 'Sarah!'], starts: [0.1, 0.4, 0.9], ends: [0.4, 0.8, 1.3] }, [])
    expect(p.ok && p.cuts.length).toBe(0)
  })
})

describe('drill-cuts pieces reproduce splice.py', () => {
  it('cuts at the point, keeps 50 ms either side, never past the clip', () => {
    expect(pieceWindows([1.0, 2.0], 3.0)).toEqual([{ start: 0, end: 1.05 }, { start: 0.95, end: 2.05 }, { start: 1.95, end: 3.0 }])
  })
  it('a word-gap cut keeps no pad, so neither piece reaches into the other word', () => {
    expect(pieceWindows([1.0, 2.0], 3.0, [0])).toEqual([{ start: 0, end: 1.0 }, { start: 1.0, end: 2.05 }, { start: 1.95, end: 3.0 }])
  })
  it('interior gaps drop the clip edges and merge blips, as splice.py does', () => {
    expect(interiorGaps([[0, 0.12], [1.0, 1.2], [1.25, 1.4], [2.9, 3.0]], 3.0)).toEqual([[1.0, 1.4]])
  })
  it('a piece carries its own words, re-based to its start', () => {
    const t = pieceTimings(timings, { w0: 14, w1: 15 }, { start: 4.88, end: 5.76 })
    expect(t.words).toEqual(['Bis', 'später.'])
    expect(t.starts[0]).toBeCloseTo(0.137, 3)
  })
})
