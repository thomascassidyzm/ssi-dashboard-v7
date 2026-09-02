import { describe, it, expect } from 'vitest'
import { parseChunkNote, chipSegments } from './chunkNotes.js'

/*
 * BOTH DIRECTIONS, DELIBERATELY. A parser is easy to satisfy by absence: return
 * nothing for everything and every "does it invent a chunk?" test passes. So the
 * real note is asserted down to its cells AND the empty/absent/malformed inputs
 * are asserted to produce the honest non-answer rather than a false one.
 */

// Verbatim from canonical_pod_scenarios — the HG01 row, bytes as stored.
const REAL = [
  'Chunk mapping (D deterministic · S split · I inversion · E erasure):',
  "if I say *(core)* → os dw i'n deud 🏔 [D] — Welsh present in the if-clause; *deud* northern",
  'anything that isn\'t clear → rhywbeth sydd ddim yn glir [E] — "anything" → *rhywbeth* — the any/some distinction erases in offers (see S9)',
  'please stop me *(scene 0)* → stopiwch fi, plîs [D] — provisional — binds to core overlay\'s W1201.3',
  'I\'ll say it again → mi ddeuda i o eto [D] — short future + *o* (northern object pronoun) absorbed in the chunk'
].join('\n')

describe('parseChunkNote — a real note', () => {
  const p = parseChunkNote(REAL)

  it('reads every chunk row and no more', () => {
    expect(p.ok).toBe(true)
    expect(p.total).toBe(4)
    expect(p.unparsed).toEqual([])
    expect(p.header).toMatch(/^Chunk mapping/)
  })

  it('splits chunk, target, class and note at the right places', () => {
    expect(p.chunks[0]).toEqual({
      chunk: 'if I say *(core)*',
      target: "os dw i'n deud 🏔",
      klass: 'D',
      label: 'deterministic',
      note: 'Welsh present in the if-clause; *deud* northern',
      glyph: true
    })
  })

  it('keeps a note that contains its own em dashes and arrows whole', () => {
    expect(p.chunks[1].target).toBe('rhywbeth sydd ddim yn glir')
    expect(p.chunks[1].klass).toBe('E')
    expect(p.chunks[1].note).toBe('"anything" → *rhywbeth* — the any/some distinction erases in offers (see S9)')
  })

  it('counts the classes and the divergence glyphs actually present', () => {
    expect(p.counts).toEqual({ D: 3, S: 0, I: 0, E: 1 })
    expect(p.unclassified).toBe(0)
    expect(p.glyphCount).toBe(1)
  })

  it('omits a zero class and an absent glyph from the chip', () => {
    const segs = chipSegments(p).map(s => s.text)
    expect(segs).toEqual(['4 chunks', '3 D', '1 E', 'glyph 1'])
    expect(segs.some(t => t.includes('S'))).toBe(false)
    const noGlyph = chipSegments(parseChunkNote('Chunk mapping (…):\na → b [D]'))
    expect(noGlyph.map(s => s.text)).toEqual(['1 chunk', '1 D'])
  })

  it('weights the contested classes and not the deterministic one', () => {
    const by = Object.fromEntries(chipSegments(p).map(s => [s.key, s.contested]))
    expect(by.D).toBe(false)
    expect(by.E).toBe(true)
    expect(by.total).toBe(false)
    expect(by.glyph).toBe(false)
  })
})

describe('parseChunkNote — the honest non-answer', () => {
  it('says nothing for nothing', () => {
    for (const input of [undefined, null, '', '   \n  ', 0, 42, {}, []]) {
      const p = parseChunkNote(input)
      expect(p.ok).toBe(false)
      expect(p.chunks).toEqual([])
      expect(p.total).toBe(0)
      expect(p.glyphCount).toBe(0)
      expect(chipSegments(p)).toEqual([])
    }
  })

  it('does not throw, and does not invent chunks, for a note of the wrong shape', () => {
    const prose = 'Aran: I would not say it like that at all. Check with Catrin.'
    const p = parseChunkNote(prose)
    expect(p.ok).toBe(false)
    expect(p.chunks).toEqual([])
    expect(p.unparsed).toEqual([prose])
    expect(p.raw).toBe(prose)          // the caller can still show the words
  })

  it('keeps an unreadable line beside the readable ones instead of dropping it', () => {
    const p = parseChunkNote('Chunk mapping (…):\na → b [D] — fine\nthis line has no arrow')
    expect(p.ok).toBe(true)
    expect(p.total).toBe(1)
    expect(p.unparsed).toEqual(['this line has no arrow'])
  })

  it('reads a bare mapping with no class and no note', () => {
    const p = parseChunkNote('the bill → y bil')
    expect(p.ok).toBe(true)
    expect(p.chunks[0]).toMatchObject({ chunk: 'the bill', target: 'y bil', klass: '', note: '' })
    expect(p.unclassified).toBe(1)
    expect(chipSegments(p).map(s => s.text)).toEqual(['1 chunk', '1 unclassified'])
  })

  it('does not read a bracketed letter inside prose as a classification', () => {
    const p = parseChunkNote('x → y — the [D] in the note is prose, not a class')
    expect(p.chunks[0].klass).toBe('')
    expect(p.chunks[0].target).toBe('y')
    expect(p.chunks[0].note).toBe('the [D] in the note is prose, not a class')
  })
})
