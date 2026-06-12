/**
 * Unit tests for the corpus-first pod-LEGO extractor (pure core only — no DB,
 * no CLI). Run: npx vitest run services/pod-lego-extractor
 */

import { describe, it, expect } from 'vitest'

const {
  extract,
  foldInventory,
  buildAtomMaps,
  validateTiling,
  _internal: { normSurface, slugKey, isIdentityChunk },
} = require('./pod-lego-extractor.cjs')

// Helper: a pod sentence with an explainer decomposition.
function S(id, order, target, known, chunks) {
  return { id, global_order: order, target_text: target, known_text: known, decomposition: chunks }
}
const ch = (chunk_target, chunk_known, extra = {}) => ({ chunk_target, chunk_known, ...extra })

describe('normalisation', () => {
  it('normSurface is case/punctuation insensitive at the edges, NFC', () => {
    expect(normSurface('  Molim. ')).toBe('molim')
    expect(normSurface('Na Posao')).toBe('na posao')
    expect(normSurface('¿Qué?')).toBe('qué')
  })

  it('slugKey produces a stable hyphen slug', () => {
    expect(slugKey('na posao')).toBe('na-posao')
    expect(slugKey('Ideš')).toBe('ideš')
    expect(slugKey('come stai')).toBe('come-stai')
  })

  it('isIdentityChunk detects untranslated proper nouns', () => {
    expect(isIdentityChunk('Maria', 'Maria')).toBe(true)
    expect(isIdentityChunk('Split', 'Split')).toBe(true)
    expect(isIdentityChunk('iz', 'from')).toBe(false)
  })
})

describe('foldInventory', () => {
  it('dedupes recurring units and counts occurrences across the corpus', () => {
    const sentences = [
      S('s1', 1, 'Molim', 'Please', [ch('molim', 'please')]),
      S('s2', 2, 'Ideš na posao', 'You are going to work', [
        ch('Ideš', "you're going"),
        ch('na posao', 'to work'),
      ]),
      S('s3', 3, 'Molim', 'Please', [ch('molim', 'please')]),
    ]
    const { units } = foldInventory('hrv_for_eng', sentences)
    expect(units.has('molim')).toBe(true)
    expect(units.get('molim').occurrence_count).toBe(2)
    expect(units.get('na-posao').known).toBe('to work')
    expect(units.size).toBe(3) // molim, ideš, na-posao
  })

  it('records first appearance in global_order, regardless of input order', () => {
    const sentences = [
      S('s3', 3, 'Molim', 'Please', [ch('molim', 'please')]),
      S('s1', 1, 'Molim opet', 'Please again', [ch('molim', 'please'), ch('opet', 'again')]),
    ]
    const { units } = foldInventory('hrv_for_eng', sentences)
    expect(units.get('molim').first_seen_order).toBe(1)
    expect(units.get('molim').first_seen_sentence).toBe('s1')
  })

  it('resolves ZUT: most frequent gloss is canonical, alternates parked + flagged', () => {
    const sentences = [
      S('s1', 1, 'Molim', 'Please', [ch('molim', 'please')]),
      S('s2', 2, 'Molim', 'Please', [ch('molim', 'please')]),
      S('s3', 3, 'Molim', 'I ask', [ch('molim', 'I ask')]),
    ]
    const { units } = foldInventory('hrv_for_eng', sentences)
    const u = units.get('molim')
    expect(u.known).toBe('please') // 2 vs 1
    expect(u.zut_alternates).toEqual([{ known: 'I ask', count: 1 }])
    expect(u.needs_review).toBe(true)
  })

  it('marks identity chunks as names (taught never, fused always)', () => {
    const sentences = [
      S('s1', 1, 'Bok Maria', 'Hi Maria', [ch('Bok', 'hi'), ch('Maria', 'Maria')]),
    ]
    const { units } = foldInventory('hrv_for_eng', sentences)
    expect(units.get('maria').is_name).toBe(true)
  })

  it('gives distinct surfaces distinct keys even when slugs would collide', () => {
    const sentences = [
      S('s1', 1, 'el', 'the', [ch('el', 'the')]),
      S('s2', 2, 'él', 'he', [ch('él', 'he')]),
    ]
    const { units } = foldInventory('spa_for_eng', sentences)
    // 'el' and 'él' normalise differently (diacritic kept) -> two units.
    expect(units.size).toBe(2)
    const keys = [...units.keys()]
    expect(new Set(keys).size).toBe(2)
  })
})

describe('validateTiling', () => {
  it('passes when chunk targets reconstruct the clause', () => {
    const r = validateTiling('Ideš na posao', [ch('Ideš', 'x'), ch('na posao', 'y')])
    expect(r.ok).toBe(true)
  })

  it('flags partial coverage (e.g. when a chunk is missing)', () => {
    const r = validateTiling('Ideš na posao danas', [ch('Ideš', 'x'), ch('na posao', 'y')])
    expect(r.ok).toBe(false)
    expect(r.coverage).toBeLessThan(1)
  })
})

describe('buildAtomMaps — first-encounter discipline', () => {
  it('teaches a unit on first encounter and passes it through afterwards', () => {
    const sentences = [
      S('s1', 1, 'Molim', 'Please', [ch('molim', 'please')]),
      S('s2', 2, 'Molim opet', 'Please again', [ch('molim', 'please'), ch('opet', 'again')]),
    ]
    const { atomMaps } = extract('hrv_for_eng', sentences)
    expect(atomMaps.get('s1').atom_map[0].kind).toBe('atom')
    // second sentence: molim already taught -> passthrough; opet new -> atom
    const m2 = atomMaps.get('s2').atom_map
    expect(m2[0].kind).toBe('passthrough')
    expect(m2[0].lego_key).toBe('molim')
    expect(m2[1].kind).toBe('atom')
    expect(m2[1].lego_key).toBe('opet')
  })

  it('uses the canonical (ZUT-resolved) gloss in the atom map, not the per-sentence one', () => {
    const sentences = [
      S('s1', 1, 'Molim', 'Please', [ch('molim', 'please')]),
      S('s2', 2, 'Molim', 'Please', [ch('molim', 'please')]),
      S('s3', 3, 'Molim', 'I ask', [ch('molim', 'I ask')]), // outlier gloss
    ]
    const { atomMaps } = extract('hrv_for_eng', sentences)
    // s3 cites the canonical gloss 'please', not its own 'I ask'.
    expect(atomMaps.get('s3').atom_map[0].gloss).toBe('please')
  })

  it('names are always passthrough and never become teachable atoms', () => {
    const sentences = [
      S('s1', 1, 'Bok Maria', 'Hi Maria', [ch('Bok', 'hi'), ch('Maria', 'Maria')]),
      S('s2', 2, 'Maria', 'Maria', [ch('Maria', 'Maria')]),
    ]
    const { atomMaps } = extract('hrv_for_eng', sentences)
    const m1 = atomMaps.get('s1').atom_map
    expect(m1.find((a) => a.lego_key === 'maria').kind).toBe('passthrough')
    expect(atomMaps.get('s2').atom_map[0].kind).toBe('passthrough')
  })

  it('atoms carry target offsets (null until audio pass), not explainer offsets', () => {
    const { atomMaps } = extract('hrv_for_eng', [
      S('s1', 1, 'Molim', 'Please', [ch('molim', 'please')]),
    ])
    const atom = atomMaps.get('s1').atom_map[0]
    expect(atom).toHaveProperty('target_start_ms', null)
    expect(atom).not.toHaveProperty('explainer_start_ms')
  })
})

describe('buildAtomMaps — notes', () => {
  it('lifts a misleading-order literal into a note spanning its atom', () => {
    const sentences = [
      S('s1', 1, 'Iz Splita sam', "I'm from Split", [
        ch('Iz', 'from'),
        ch('Splita', 'Split'),
        ch('sam', 'I am', { literal: 'from Split I am' }),
      ]),
    ]
    const { atomMaps } = extract('hrv_for_eng', sentences)
    const map = atomMaps.get('s1').atom_map
    const note = map.find((e) => e.kind === 'note')
    expect(note).toBeTruthy()
    expect(note.gloss).toBe('from Split I am')
    // 'sam' is the 3rd spoken atom -> index 2
    expect(note.spans).toEqual([2, 2])
    expect(note).toHaveProperty('explainer_start_ms', null)
    expect(note).not.toHaveProperty('target_start_ms')
  })
})
