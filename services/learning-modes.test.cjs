/**
 * Unit tests: learning-modes — the Easy/Fast mode set and the script-shape
 * layering rule (2026-08-06 restructure; Aran's two-mode ruling relayed by Tom).
 *
 * The load-bearing claim these tests defend: FAST is a RENAME of the old
 * normal_mode, not a retune. If layering ever changes Fast's effective shape,
 * every learner on the default mode silently gets a different course.
 *
 * Run: npx vitest run services/learning-modes.test.cjs
 */

import { describe, it, expect } from 'vitest'

const {
  MODE_KEYS,
  MODE_FALLBACKS,
  DEFAULT_MODE,
  DEFAULT_MAX_PHRASE_LENGTH_FRACTION,
  resolveScriptShape,
  resolveMaxPhraseLengthFraction,
  phraseLengthOf,
  courseMaxPhraseLength,
  applyPhraseLengthCap,
} = require('./learning-modes.cjs')

// The live algorithm_config.script_shape row, read 2026-08-06.
const GLOBAL_SHAPE = {
  n1PhraseCount: 3,
  maxBuildPhrases: 7,
  spacedRepOffsets: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
  maxSpacedRepPhrases: 12,
  useConsolidationCount: 2,
}

// The seeded rows, as created by scripts/learning-modes/create-mode-rows.cjs.
const FAST_CONFIG = { scriptShape: {}, maxPhraseLengthFraction: 1.0 }
const EASY_CONFIG = {
  maxPhraseLengthFraction: 0.5,
  scriptShape: {
    n1PhraseCount: 6,
    maxBuildPhrases: 14,
    useConsolidationCount: 4,
    maxSpacedRepPhrases: 24,
  },
}

describe('the mode set', () => {
  it('is exactly easy and fast — turbo is gone', () => {
    expect(Object.keys(MODE_KEYS).sort()).toEqual(['easy', 'fast'])
    expect(JSON.stringify(MODE_KEYS)).not.toMatch(/turbo/i)
  })

  it('defaults to fast', () => {
    expect(DEFAULT_MODE).toBe('fast')
  })

  it('falls back from fast_mode to normal_mode for the promotion window', () => {
    // An old bundle still writing/reading normal_mode must keep working until
    // the learner app ships reading fast_mode.
    expect(MODE_FALLBACKS.fast_mode).toEqual(['fast_mode', 'normal_mode'])
    expect(MODE_FALLBACKS.easy_mode).toContain('normal_mode')
  })
})

describe('resolveScriptShape — global base, mode override on top', () => {
  it('FAST is byte-identical to the global shape (the rename, not a retune)', () => {
    expect(resolveScriptShape(GLOBAL_SHAPE, FAST_CONFIG)).toEqual(GLOBAL_SHAPE)
  })

  it('is identical for a mode row with no scriptShape block at all', () => {
    // This is exactly the normal_mode fallback row's shape.
    expect(resolveScriptShape(GLOBAL_SHAPE, { pause_boot_ms: 2000 })).toEqual(GLOBAL_SHAPE)
    expect(resolveScriptShape(GLOBAL_SHAPE, undefined)).toEqual(GLOBAL_SHAPE)
  })

  it('EASY doubles the four rep counts and inherits the global offsets', () => {
    const easy = resolveScriptShape(GLOBAL_SHAPE, EASY_CONFIG)
    expect(easy.n1PhraseCount).toBe(GLOBAL_SHAPE.n1PhraseCount * 2)
    expect(easy.maxBuildPhrases).toBe(GLOBAL_SHAPE.maxBuildPhrases * 2)
    expect(easy.useConsolidationCount).toBe(GLOBAL_SHAPE.useConsolidationCount * 2)
    expect(easy.maxSpacedRepPhrases).toBe(GLOBAL_SHAPE.maxSpacedRepPhrases * 2)
    // spacedRepOffsets deliberately not overridden — Easy rides the global row.
    expect(easy.spacedRepOffsets).toEqual(GLOBAL_SHAPE.spacedRepOffsets)
  })

  it('does not mutate the global shape it was handed', () => {
    const before = JSON.stringify(GLOBAL_SHAPE)
    resolveScriptShape(GLOBAL_SHAPE, EASY_CONFIG)
    expect(JSON.stringify(GLOBAL_SHAPE)).toBe(before)
  })

  it('ignores keys outside the known script-shape set', () => {
    const out = resolveScriptShape(GLOBAL_SHAPE, { scriptShape: { somethingElse: 99 } })
    expect(out.somethingElse).toBeUndefined()
    expect(out).toEqual(GLOBAL_SHAPE)
  })

  it('treats null/undefined override values as "inherit", not "clear"', () => {
    const out = resolveScriptShape(GLOBAL_SHAPE, { scriptShape: { maxBuildPhrases: null } })
    expect(out.maxBuildPhrases).toBe(GLOBAL_SHAPE.maxBuildPhrases)
  })

  it('allows an explicit zero override (0 is a real value, not "absent")', () => {
    const out = resolveScriptShape(GLOBAL_SHAPE, { scriptShape: { useConsolidationCount: 0 } })
    expect(out.useConsolidationCount).toBe(0)
  })
})

describe('resolveMaxPhraseLengthFraction', () => {
  it('reads the mode value — Easy halves, Fast is uncapped', () => {
    expect(resolveMaxPhraseLengthFraction(EASY_CONFIG)).toBe(0.5)
    expect(resolveMaxPhraseLengthFraction(FAST_CONFIG)).toBe(1.0)
  })

  it('degrades anything missing or invalid to UNCAPPED, never to a cap', () => {
    // A bad hand-edit must give today's full-length script. Falling back to a
    // cap would silently shorten every phrase in the course.
    for (const bad of [undefined, {}, { maxPhraseLengthFraction: 0 },
                       { maxPhraseLengthFraction: -0.5 }, { maxPhraseLengthFraction: 2 },
                       { maxPhraseLengthFraction: 'half' }, { maxPhraseLengthFraction: NaN }]) {
      expect(resolveMaxPhraseLengthFraction(bad)).toBe(DEFAULT_MAX_PHRASE_LENGTH_FRACTION)
      expect(resolveMaxPhraseLengthFraction(bad)).toBe(1.0)
    }
  })
})

describe('phrase length measurement', () => {
  it('measures target text length, NOT syllables', () => {
    // course_practice_phrases.target_syllable_count is NULL for every row on
    // real courses, and the countTargetSyllables fallback is a Latin
    // vowel-cluster heuristic that returns 1 for all Arabic — a syllable-based
    // ceiling computed to 0.5 and the cap silently did nothing.
    expect(phraseLengthOf({ target_text: 'hello there' })).toBe(11)
    expect(phraseLengthOf({ target_text: 'مرحبا' })).toBe(5)
    expect(phraseLengthOf({})).toBe(0)
    expect(phraseLengthOf(undefined)).toBe(0)
  })

  it('courseMaxPhraseLength spans every list it is given', () => {
    const build = [{ target_text: 'ab' }, { target_text: 'abcd' }]
    const use = [{ target_text: 'abcdefgh' }]
    expect(courseMaxPhraseLength([build, use])).toBe(8)
    expect(courseMaxPhraseLength([])).toBe(0)
    expect(courseMaxPhraseLength([null, build])).toBe(4)
  })
})

describe('applyPhraseLengthCap — Easy halves the longest possible phrase', () => {
  const len = p => p.n
  const pool = [{ n: 2 }, { n: 4 }, { n: 6 }, { n: 8 }, { n: 10 }]

  it('is the identity when uncapped — Fast is untouched', () => {
    expect(applyPhraseLengthCap(pool, Infinity, len, 3)).toBe(pool)
    expect(applyPhraseLengthCap(pool, 0, len, 3)).toBe(pool)
  })

  it('keeps only phrases within the absolute ceiling', () => {
    expect(applyPhraseLengthCap(pool, 5, len, 1).map(len)).toEqual([2, 4])
  })

  it('the ceiling is absolute, so the same phrase is judged the same everywhere', () => {
    // Same limit, a pool whose neighbours are all long: the short one still wins.
    const longNeighbours = [{ n: 4 }, { n: 40 }, { n: 50 }]
    expect(applyPhraseLengthCap(longNeighbours, 5, len, 1).map(len)).toEqual([4])
  })

  it('STARVATION GUARD: never returns fewer than the round needs', () => {
    // Cap alone leaves 2, the round wants 4 — phrase volume is a hard rail, so
    // the cap yields and the shortest 4 come back.
    const out = applyPhraseLengthCap(pool, 5, len, 4)
    expect(out.map(len)).toEqual([2, 4, 6, 8])
  })

  it('the guard is why an over-tight cap degrades gracefully instead of emptying a LEGO', () => {
    const allLong = [{ n: 60 }, { n: 69 }]
    expect(applyPhraseLengthCap(allLong, 36, len, 4)).toHaveLength(2)
  })

  it('handles an empty pool without throwing', () => {
    expect(applyPhraseLengthCap([], 5, len, 3)).toEqual([])
  })

  it('does not mutate the pool it was handed', () => {
    const before = JSON.stringify(pool)
    applyPhraseLengthCap(pool, 5, len, 4)
    expect(JSON.stringify(pool)).toBe(before)
  })
})
