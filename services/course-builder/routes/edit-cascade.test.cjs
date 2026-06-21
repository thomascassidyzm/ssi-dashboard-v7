/**
 * Unit tests for the edit-cascade Case 1 / Case 2 discriminator (Delta B).
 *
 * The cascade decides blast radius by diffing the edited seed's vocab-unit
 * contribution (LEGO targets + M-LEGO component targets) before vs after.
 * Equal set => Case 1 (vocab-preserving, downstream safe); different => Case 2.
 *
 * Run: npx vitest run services/course-builder/routes/edit-cascade
 */

import { describe, it, expect } from 'vitest'

const { _test: { computeSeedVocab, setsEqual } } = require('./edit-cascade.cjs')

const chinese = false

describe('computeSeedVocab', () => {
  it('collects LEGO targets (space-separated language)', () => {
    const legos = [
      { type: 'A', target_text: 'wa' },
      { type: 'A', target_text: 'wo' },
    ]
    expect([...computeSeedVocab(legos, chinese)].sort()).toEqual(['wa', 'wo'])
  })

  it('includes M-LEGO component targets and the whole-LEGO target', () => {
    const legos = [
      { type: 'M', target_text: 'wo to', components: [{ target: 'wo' }, { target: 'to' }] },
    ]
    expect([...computeSeedVocab(legos, chinese)].sort()).toEqual(['to', 'wo', 'wo to'])
  })

  it('accepts either target or target_text on legos/components', () => {
    const a = computeSeedVocab([{ type: 'A', target: 'wa' }], chinese)
    const b = computeSeedVocab([{ type: 'A', target_text: 'wa' }], chinese)
    expect(setsEqual(a, b)).toBe(true)
  })
})

describe('Case 1 vs Case 2 discrimination', () => {
  // Old breakdown of a seed.
  const oldLegos = [
    { type: 'A', target_text: 'wa' },
    { type: 'M', target_text: 'wo se', components: [{ target: 'wo' }, { target: 'se' }] },
  ]

  it('Case 1: a re-decomposition that keeps the same word-forms', () => {
    // Same words, regrouped (two atoms instead of one molecule) — vocab units at
    // the word level are unchanged, only the molecule wrapper differs... so this
    // is actually a CHANGE (the "wo se" unit disappears). Demonstrate the strict
    // semantics: the molecule target is itself a vocab unit.
    const regrouped = [
      { type: 'A', target_text: 'wa' },
      { type: 'A', target_text: 'wo' },
      { type: 'A', target_text: 'se' },
    ]
    const same = setsEqual(computeSeedVocab(oldLegos, chinese), computeSeedVocab(regrouped, chinese))
    expect(same).toBe(false) // "wo se" molecule unit was present before, gone now
  })

  it('Case 1 (true): identical breakdown re-submitted', () => {
    const resubmit = JSON.parse(JSON.stringify(oldLegos))
    expect(setsEqual(computeSeedVocab(oldLegos, chinese), computeSeedVocab(resubmit, chinese))).toBe(true)
  })

  it('Case 1 (true): reword that reuses the exact same vocab units', () => {
    // Different order, same set of units.
    const reordered = [
      { type: 'M', target_text: 'wo se', components: [{ target: 'se' }, { target: 'wo' }] },
      { type: 'A', target_text: 'wa' },
    ]
    expect(setsEqual(computeSeedVocab(oldLegos, chinese), computeSeedVocab(reordered, chinese))).toBe(true)
  })

  it('Case 2: a new word-form is introduced', () => {
    const changed = [
      { type: 'A', target_text: 'wa' },
      { type: 'M', target_text: 'wo lo', components: [{ target: 'wo' }, { target: 'lo' }] }, // 'se' -> 'lo'
    ]
    expect(setsEqual(computeSeedVocab(oldLegos, chinese), computeSeedVocab(changed, chinese))).toBe(false)
  })

  it('Case 2: a word-form is removed', () => {
    const shorter = [{ type: 'A', target_text: 'wa' }]
    expect(setsEqual(computeSeedVocab(oldLegos, chinese), computeSeedVocab(shorter, chinese))).toBe(false)
  })
})

describe('Chinese (CJK) vocab', () => {
  it('treats each LEGO target as one unit and compares as a set', () => {
    // extractVocab keeps the whole normalized target as one unit (the DP tiler
    // does the character-level matching elsewhere). The discriminator just needs
    // a stable set comparison, which holds for CJK too.
    const a = computeSeedVocab([{ type: 'A', target_text: '我想' }], true)
    const b = computeSeedVocab([{ type: 'A', target_text: '我想' }], true)
    expect(setsEqual(a, b)).toBe(true)
    const c = computeSeedVocab([{ type: 'A', target_text: '我要' }], true)
    expect(setsEqual(a, c)).toBe(false)
  })
})
