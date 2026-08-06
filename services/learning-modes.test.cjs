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
  DEFAULT_PHRASE_LENGTH_PREFERENCE,
  resolveScriptShape,
  resolvePhraseLengthPreference,
  phraseLengthComparator,
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
const FAST_CONFIG = { scriptShape: {}, phraseLengthPreference: 'shortest' }
const EASY_CONFIG = {
  phraseLengthPreference: 'longest',
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

describe('resolvePhraseLengthPreference', () => {
  it('reads the mode value', () => {
    expect(resolvePhraseLengthPreference(EASY_CONFIG)).toBe('longest')
    expect(resolvePhraseLengthPreference(FAST_CONFIG)).toBe('shortest')
  })

  it('degrades a missing or bad value to the historic behaviour', () => {
    // A bad hand-edit should give today's script, not break the round.
    expect(resolvePhraseLengthPreference({})).toBe(DEFAULT_PHRASE_LENGTH_PREFERENCE)
    expect(resolvePhraseLengthPreference(undefined)).toBe('shortest')
    expect(resolvePhraseLengthPreference({ phraseLengthPreference: 'medium' })).toBe('shortest')
  })
})

describe('phraseLengthComparator — which end survives truncation at the cap', () => {
  const phrases = [{ s: 9 }, { s: 2 }, { s: 5 }]
  const syl = p => p.s

  it('shortest-first reproduces the historic sort exactly', () => {
    const sorted = [...phrases].sort(phraseLengthComparator('shortest', syl))
    expect(sorted.map(syl)).toEqual([2, 5, 9])
    // The historic comparator, verbatim, for direct comparison.
    const historic = [...phrases].sort((a, b) => syl(a) - syl(b))
    expect(sorted).toEqual(historic)
  })

  it('longest-first reverses it, so a cap of 2 keeps the long phrases', () => {
    const sorted = [...phrases].sort(phraseLengthComparator('longest', syl))
    expect(sorted.map(syl)).toEqual([9, 5, 2])
    expect(sorted.slice(0, 2).map(syl)).toEqual([9, 5])
  })

  it('an unknown preference falls back to shortest-first', () => {
    const sorted = [...phrases].sort(phraseLengthComparator('nonsense', syl))
    expect(sorted.map(syl)).toEqual([2, 5, 9])
  })
})
