// services/recording-pools.test.cjs
//
// The two-pool split (Kai, 2026-08-21). The tests that matter are the ones
// about the HARD RULE — every phrase assemblable, no phrase incomplete — and
// about Pool A carrying the components a LEGO row hides in its jsonb.

import { describe, it, expect } from 'vitest'
import pools from './recording-pools.cjs'
import chunking from './voice-engine/chunking.cjs'

const { buildPoolA, buildPoolB, verifyAssembly, assemble } = pools
const { normalizeForMatching } = chunking

// Kai's own worked example, plus enough around it to tile real phrases.
const LEGOS = [
  { seed_number: 38, lego_index: 1, type: 'M', is_new: true, known_text: "i'm learning", target_text: 'i lern',
    components: [{ known: 'I', target: 'i' }, { known: 'learn', target: 'lern' }] },
  { seed_number: 38, lego_index: 2, type: 'M', is_new: true, known_text: 'for about a week', target_text: 'seit zirka ana Wochn',
    components: [{ known: 'since', target: 'seit' }, { known: 'about', target: 'zirka' }, { known: 'a week', target: 'ana Wochn' }] },
  { seed_number: 39, lego_index: 1, type: 'A', is_new: true, known_text: 'now', target_text: 'iatz', components: null },
  // an is_new:false row — off the splicing universe, but its components still teach
  { seed_number: 40, lego_index: 1, type: 'M', is_new: false, known_text: 'I speak', target_text: 'i red',
    components: [{ known: 'speak', target: 'red' }] },
]

const universeOf = (rows) => {
  const u = new Map()
  for (const l of rows) {
    if (!l.is_new) continue
    const k = normalizeForMatching(l.target_text)
    if (!u.has(k)) u.set(k, { original: l.target_text, known: l.known_text, type: l.type, legoId: `S${l.seed_number}L${l.lego_index}` })
  }
  return u
}

describe('buildPoolA', () => {
  it('gives every LEGO and every component its own item', () => {
    const items = buildPoolA(LEGOS)
    const texts = items.map(i => i.target)
    // the LEGOs themselves
    expect(texts).toContain('i lern')
    expect(texts).toContain('seit zirka ana Wochn')
    expect(texts).toContain('iatz')
    // the components Kai pointed at — none of these is a LEGO row of its own
    expect(texts).toContain('seit')
    expect(texts).toContain('zirka')
    expect(texts).toContain('ana Wochn')
  })

  it('takes components off an is_new:false row too — it is a teaching list, not a splicing universe', () => {
    const items = buildPoolA(LEGOS)
    expect(items.map(i => i.target)).toContain('red')
    // ...but the is_new:false row itself is not offered as a LEGO item
    expect(items.filter(i => i.kind === 'lego').map(i => i.target)).not.toContain('i red')
  })

  it('never duplicates a text, and a LEGO wins over a component of the same text', () => {
    const items = buildPoolA(LEGOS)
    const keys = items.map(i => normalizeForMatching(i.target))
    expect(new Set(keys).size).toBe(keys.length)
    expect(items.find(i => i.target === 'iatz').kind).toBe('lego')
  })

  it('does not offer a one-word LEGO its own text back as a component', () => {
    const rows = [{ seed_number: 1, lego_index: 1, type: 'A', is_new: true, known_text: 'now', target_text: 'iatz',
      components: [{ known: 'now', target: 'iatz' }] }]
    expect(buildPoolA(rows)).toHaveLength(1)
  })
})

describe('buildPoolB — the hard rule', () => {
  const PHRASES = [
    { target_text: 'i lern seit zirka ana Wochn', known_text: "i've been learning for about a week", seed_number: 38, source: 'seed' },
    { target_text: 'i lern iatz', known_text: "i'm learning now", seed_number: 39, source: 'practice' },
    { target_text: 'iatz lern i seit zirka ana Wochn', known_text: 'now i have been learning for about a week', seed_number: 39, source: 'practice' },
    { target_text: 'i lern', known_text: "i'm learning", seed_number: 38, source: 'practice' },
  ]

  it('assembles EVERY phrase — 100%, and reports it as a real number', () => {
    const result = buildPoolB({ phrases: PHRASES, universe: universeOf(LEGOS) })
    expect(result.failures).toEqual([])
    expect(result.stats.realCoveragePercent).toBe(100)
    expect(result.stats.phrasesAssemblable).toBe(result.stats.coursePhrases)
  })

  it('is verifiable from the emitted chunk maps alone, not just from its own working state', () => {
    const result = buildPoolB({ phrases: PHRASES, universe: universeOf(LEGOS) })
    const check = verifyAssembly(PHRASES, result.lines)
    expect(check.failures).toEqual([])
    expect(check.assemblable).toBe(PHRASES.length)
  })

  it('records fewer lines than the course has phrases — the point of splicing', () => {
    // A phrase that is entirely made of spans other lines already yield must
    // not be asked for again.
    const phrases = [
      ...PHRASES,
      { target_text: 'i lern iatz seit zirka ana Wochn', known_text: 'now, for about a week', seed_number: 40, source: 'practice' },
    ]
    const result = buildPoolB({ phrases, universe: universeOf(LEGOS) })
    expect(result.lines.length).toBeLessThan(phrases.length)
    expect(result.failures).toEqual([])
  })

  it('asks for no stop at all on a line no other phrase needs pieces of', () => {
    const result = buildPoolB({ phrases: PHRASES, universe: universeOf(LEGOS) })
    // every emitted line's chunks must rejoin to the line itself
    for (const line of result.lines) {
      expect(line.chunks.map(c => c.text).join(' ')).toBe(line.target.trim().replace(/\s+/g, ' '))
    }
    expect(result.stats.linesWithNoStop).toBeGreaterThan(0)
  })

  it('minPieceWords=2 forbids word-sized splice material and still hits 100%', () => {
    const result = buildPoolB({ phrases: PHRASES, universe: universeOf(LEGOS), minPieceWords: 2 })
    expect(result.failures).toEqual([])
    expect(result.stats.minPieceWords).toBe(2)
    // no line may be cut into a one-word piece other than a whole one-word line
    for (const line of result.lines) {
      if (line.chunkCount === 1) continue
      for (const c of line.chunks) expect(c.text.trim().split(/\s+/).length).toBeGreaterThan(1)
    }
  })

  it('handles a course with no phrases without inventing coverage', () => {
    const result = buildPoolB({ phrases: [], universe: universeOf(LEGOS) })
    expect(result.lines).toEqual([])
    expect(result.stats.coursePhrases).toBe(0)
    expect(result.stats.realCoveragePercent).toBe(100)
  })
})

describe('verifyAssembly — the coverage test that replaces "the text appears somewhere"', () => {
  it('fails a phrase whose word exists only INSIDE a chunk that is never cut', () => {
    // "mit" is banked only as part of "reden mit" — it can never be cut back out
    const lines = [{ target: 'i wü reden mit dir', chunks: ['i wü', 'reden mit dir'] }]
    const phrases = [
      { target_text: 'i wü reden mit dir' },   // recorded whole — fine
      { target_text: 'i wü' },                 // a real span, cut at a real pause
      { target_text: 'mit dir' },              // starts MID-chunk — not extractable
      { target_text: 'mit i wü' },             // needs "mit" alone — impossible
    ]
    const check = verifyAssembly(phrases, lines)
    // Both failures are the same defect: audio can only be cut where the
    // recordist actually stopped, and nobody stopped before "mit".
    expect(check.failures).toEqual(['mit dir', 'mit i wü'])
    expect(check.assemblable).toBe(2)
  })

  it('treats any span between two cut points as available, because one take is continuous audio', () => {
    const lines = [{ target: 'a b c d', chunks: ['a', 'b', 'c', 'd'] }]
    // "b c" is not an adjacent-chunk pair by accident — it is a real span
    expect(assemble(['b', 'c'], verifyAssembly([], lines).extractable)).toEqual(['b c'])
  })
})
