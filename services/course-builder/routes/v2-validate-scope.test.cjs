/**
 * Unit tests for the scoped validation sweep (Delta A of the edit-cascade spec).
 *
 * Proves the prefix-skip path is equivalent to the full walk: the cumulative
 * vocab and the per-seed failures for the non-skipped suffix are identical
 * whether we walk every seed or skip the provably-unaffected prefix.
 *
 * Run: npx vitest run services/course-builder/routes/v2-validate-scope
 */

import { describe, it, expect } from 'vitest'

const { _test: { accumulate, runSeedChecks } } = require('./v2.cjs')

// --- Synthetic course --------------------------------------------------------
// A space-separated (non-CJK) toy language so tiling is word-based. Each seed
// introduces some LEGOs; later seeds reuse earlier vocab. One seed deliberately
// fails (a phrase uses a word never introduced) so we can check failure scoping.
const courseCode = 'tst_for_eng'
const chinese = false

function lego(seed_number, lego_index, known, target, opts = {}) {
  return {
    seed_number, lego_index,
    known_text: known, target_text: target,
    type: opts.type || 'A',
    components: opts.components || null,
    is_new: opts.is_new !== false,
  }
}

// seeds 1..4. Seed 3 has a vocab violation (phrase uses "zzz", never introduced).
const seeds = [
  { seed_number: 1, known_text: 'i want', target_text: 'wa wo' },
  { seed_number: 2, known_text: 'i want it', target_text: 'wa wo lo' },
  { seed_number: 3, known_text: 'i see', target_text: 'wa se' },
  { seed_number: 4, known_text: 'i want to see', target_text: 'wa wo se' },
]

const legosBySeed = {
  1: [lego(1, 1, 'i', 'wa'), lego(1, 2, 'want', 'wo')],
  2: [lego(2, 1, 'it', 'lo')],
  3: [lego(3, 1, 'see', 'se')],
  4: [], // pure recombination, no new legos
}

// Phrases keyed by `${seed}:${lego_index}`. Build/use phrases get tiling-checked.
const phrasesByLegoKey = {
  '1:1': [{ seed_number: 1, lego_index: 1, known_text: 'i', target_text: 'wa', phrase_role: 'build' }],
  '1:2': [{ seed_number: 1, lego_index: 2, known_text: 'i want', target_text: 'wa wo', phrase_role: 'build' }],
  '2:1': [{ seed_number: 2, lego_index: 1, known_text: 'i want it', target_text: 'wa wo lo', phrase_role: 'use' }],
  // Seed 3: a phrase that uses an unintroduced word "zzz" -> vocab violation.
  '3:1': [{ seed_number: 3, lego_index: 1, known_text: 'i see that', target_text: 'wa se zzz', phrase_role: 'use' }],
}

// Walk all seeds, optionally skipping the provably-unaffected prefix < fromSeed.
function sweep(fromSeed = 0) {
  const cumulativeVocab = new Set()
  const failures = []
  let seedsSkipped = 0
  for (const seed of seeds) {
    const seedLegos = legosBySeed[seed.seed_number] || []
    if (fromSeed && seed.seed_number < fromSeed) {
      accumulate(seedLegos, cumulativeVocab, chinese)
      seedsSkipped++
      continue
    }
    const issues = runSeedChecks(seed, seedLegos, phrasesByLegoKey, cumulativeVocab, courseCode, chinese)
    accumulate(seedLegos, cumulativeVocab, chinese)
    if (issues.length > 0) failures.push({ seed: seed.seed_number, issues })
  }
  return { failures, seedsSkipped, vocab: [...cumulativeVocab].sort() }
}

describe('accumulate', () => {
  it('collects LEGO targets and is idempotent', () => {
    const s = new Set()
    accumulate(legosBySeed[1], s, false)
    accumulate(legosBySeed[1], s, false) // re-add: no change
    expect([...s].sort()).toEqual(['wa', 'wo'])
  })

  it('includes M-LEGO component targets', () => {
    const s = new Set()
    accumulate([lego(9, 1, 'want to', 'wo to', {
      type: 'M', components: [{ known: 'want', target: 'wo' }, { known: 'to', target: 'to' }],
    })], s, false)
    expect([...s].sort()).toEqual(['to', 'wo', 'wo to'])
  })
})

describe('scoped sweep equivalence', () => {
  it('the full walk surfaces the seed-3 vocab violation', () => {
    const { failures } = sweep(0)
    const seed3 = failures.find(f => f.seed === 3)
    expect(seed3).toBeTruthy()
    expect(seed3.issues).toContain('L1: vocab violations in 1 phrase(s)')
  })

  it('final cumulative vocab is identical regardless of fromSeed', () => {
    const full = sweep(0).vocab
    expect(sweep(2).vocab).toEqual(full)
    expect(sweep(3).vocab).toEqual(full)
    expect(sweep(4).vocab).toEqual(full)
  })

  it('scoped failures equal the full walk restricted to the non-skipped suffix', () => {
    // The core equivalence: for any fromSeed, the failures reported for seeds
    // >= fromSeed are byte-identical to what the full walk reported for them,
    // and no seed < fromSeed ever appears.
    const fullFailures = sweep(0).failures
    for (const fromSeed of [1, 2, 3, 4]) {
      const scoped = sweep(fromSeed).failures
      const expected = fullFailures.filter(f => f.seed >= fromSeed)
      expect(scoped).toEqual(expected)
      expect(scoped.every(f => f.seed >= fromSeed)).toBe(true)
    }
  })

  it('skips the provably-unaffected prefix and counts it', () => {
    const r = sweep(4)
    expect(r.seedsSkipped).toBe(3)
    // seed 4 is pure recombination over introduced vocab -> tiles, no legos to check
    expect(r.failures).toEqual([])
  })
})
