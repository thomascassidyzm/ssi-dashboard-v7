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
  DEFAULT_REVIEW_FILTER_MAX_ROUND,
  resolveScriptShape,
  resolveMaxPhraseLengthFraction,
  resolveReviewMaxKnownSyllables,
  resolveReviewFilterMaxRound,
  resolveFilterBuildPhrases,
  resolvePhraseRepeatCount,
  resolveRepeatedCycleTypes,
  repeatPhraseCycles,
  MAX_PHRASE_REPEAT_COUNT,
  phraseLengthOf,
  courseMaxPhraseLength,
  applyPhraseLengthCap,
  makeKnownSyllableResolver,
  filterReviewPool,
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


// ============================================================================
// THE KNOWN-SIDE PULL FILTER (Tom, 2026-08-07: "the parameterization should be
// on things like the syllable cap, as measured in the known language").
//
// DELIBERATELY FLIPPED: this block replaces the resolveMaxPhraseSyllables and
// applyPhraseCaps suites, which asserted an ABSOLUTE TARGET-syllable ceiling
// applied to the whole script. That ceiling was retired hours after it shipped
// — it counted the side the learner is not reading, it never lifted, and it
// leant on a heuristic that returns 1 for every non-Latin, non-CJK script, so
// it silently did nothing on most of the estate. Its tests went with it; the
// claims below are the replacements.
// ============================================================================
describe('resolveReviewMaxKnownSyllables', () => {
  it('reads a real ceiling off the mode row', () => {
    expect(resolveReviewMaxKnownSyllables({ reviewMaxKnownSyllables: 15 })).toBe(15)
  })

  it('floors a fractional ceiling — 15.9 syllables is a ceiling of 15', () => {
    expect(resolveReviewMaxKnownSyllables({ reviewMaxKnownSyllables: 15.9 })).toBe(15)
  })

  it('degrades anything absent, blank or invalid to NO FILTER, never to a filter', () => {
    // A filter that appears by omission would silently shorten every review
    // pull in the estate the moment a row was hand-edited.
    for (const bad of [undefined, null, {}, { reviewMaxKnownSyllables: 0 },
                       { reviewMaxKnownSyllables: null }, { reviewMaxKnownSyllables: '' },
                       { reviewMaxKnownSyllables: -4 }, { reviewMaxKnownSyllables: 'fifteen' },
                       { reviewMaxKnownSyllables: NaN }]) {
      expect(resolveReviewMaxKnownSyllables(bad)).toBe(Infinity)
    }
  })

  it('the live Fast row carries 0 and so runs unfiltered', () => {
    expect(resolveReviewMaxKnownSyllables({ ...FAST_CONFIG, reviewMaxKnownSyllables: 0 })).toBe(Infinity)
  })
})

describe('resolveReviewFilterMaxRound', () => {
  it('reads the window off the mode row', () => {
    expect(resolveReviewFilterMaxRound({ reviewSyllableFilterMaxRound: 100 })).toBe(100)
    expect(resolveReviewFilterMaxRound({ reviewSyllableFilterMaxRound: 250 })).toBe(250)
  })

  it('degrades to a WINDOW, not to forever — the filter is meant to come off', () => {
    // The asymmetry with the ceiling above is deliberate. A bad ceiling must
    // fall back to "no filter"; a bad WINDOW must fall back to a finite one,
    // because a filter that never lifts is the failure the whole design fixes.
    for (const bad of [undefined, null, {}, { reviewSyllableFilterMaxRound: 0 },
                       { reviewSyllableFilterMaxRound: -1 },
                       { reviewSyllableFilterMaxRound: NaN },
                       { reviewSyllableFilterMaxRound: Infinity }]) {
      expect(resolveReviewFilterMaxRound(bad)).toBe(DEFAULT_REVIEW_FILTER_MAX_ROUND)
      expect(resolveReviewFilterMaxRound(bad)).toBe(100)
    }
  })
})

describe('resolveFilterBuildPhrases — "no filtering on BLD phrases"', () => {
  it('only an explicit false turns it off', () => {
    expect(resolveFilterBuildPhrases({ filterBuildPhrases: false })).toBe(false)
  })

  it('absent, null or true keeps the historic path', () => {
    for (const cfg of [undefined, null, {}, { filterBuildPhrases: true },
                       { filterBuildPhrases: null }]) {
      expect(resolveFilterBuildPhrases(cfg)).toBe(true)
    }
  })
})

describe('makeKnownSyllableResolver — the learner\'s own language, or nothing', () => {
  it('counts English on an eng-known course', () => {
    const r = makeKnownSyllableResolver('eng')
    expect(r.countable).toBe(true)
    expect(r.syllablesOf({ known_text: 'I want to speak' })).toBe(4)
  })

  it('normalises a tagged language code', () => {
    expect(makeKnownSyllableResolver('eng-GB').lang).toBe('eng')
    expect(makeKnownSyllableResolver('ENG_US').countable).toBe(true)
  })

  it('is INERT rather than wrong for an unregistered known language', () => {
    // A wrong-language count is worse than no count: it produces a plausible
    // number nobody checks. It must not throw either — the script still builds.
    const r = makeKnownSyllableResolver('ara')
    expect(r.countable).toBe(false)
    expect(r.syllablesOf({ known_text: 'مرحبا كيف حالك' })).toBeNull()
    expect(makeKnownSyllableResolver(null).countable).toBe(false)
    expect(makeKnownSyllableResolver(undefined).syllablesOf({ known_text: 'x' })).toBeNull()
  })

  it('returns null for a phrase with no known text at all', () => {
    expect(makeKnownSyllableResolver('eng').syllablesOf({})).toBeNull()
  })
})

describe('filterReviewPool — the pull filter itself', () => {
  const syllablesOf = p => p.syll
  const filter = { limit: 15, maxRound: 100, syllablesOf }
  const pool = [{ id: 'a', syll: 6 }, { id: 'b', syll: 14 }, { id: 'c', syll: 22 }]

  it('keeps only the short end while the filter is in force', () => {
    expect(filterReviewPool(pool, 12, filter).map(p => p.id)).toEqual(['a', 'b'])
  })

  it('is inclusive of the limit itself', () => {
    expect(filterReviewPool([{ id: 'x', syll: 15 }], 1, filter).map(p => p.id)).toEqual(['x'])
  })

  it('LIFTS past the window — the whole basket is back, with nothing backlogged', () => {
    // Round 101 gets the untouched pool, by identity. Nothing cascades: the
    // LEGO is what is being practised, so an unmet phrase is fine.
    expect(filterReviewPool(pool, 101, filter)).toBe(pool)
    expect(filterReviewPool(pool, 100, filter).map(p => p.id)).toEqual(['a', 'b'])
  })

  it('is the identity when the filter is off or absent', () => {
    expect(filterReviewPool(pool, 1, null)).toBe(pool)
    expect(filterReviewPool(pool, 1, { limit: Infinity, maxRound: 100, syllablesOf })).toBe(pool)
    expect(filterReviewPool(pool, 1, { limit: 0, maxRound: 100, syllablesOf })).toBe(pool)
  })

  it('SHORTEST-IN-BASKET FALLBACK: a LEGO is never skipped for want of a short phrase', () => {
    const allLong = [{ id: 'p', syll: 40 }, { id: 'q', syll: 25 }, { id: 'r', syll: 33 }]
    const out = filterReviewPool(allLong, 5, filter)
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('q')
  })

  it('passes an uncountable phrase rather than dropping it — inertness is per phrase', () => {
    const mixed = [{ id: 'a', syll: 6 }, { id: 'u', syll: null }, { id: 'c', syll: 22 }]
    expect(filterReviewPool(mixed, 5, filter).map(p => p.id)).toEqual(['a', 'u'])
  })

  it('handles an empty basket without inventing one', () => {
    expect(filterReviewPool([], 5, filter)).toEqual([])
  })

  it('never mutates the basket it is given', () => {
    const before = JSON.stringify(pool)
    filterReviewPool(pool, 5, filter)
    expect(JSON.stringify(pool)).toBe(before)
  })
})

// ── Easy doubling, mirrored into Script View ────────────────────────────────
// The live easy_mode row, read 2026-08-08: phraseRepeatCount 2, and the three
// cycle types spelled in the LEARNER'S vocabulary, which is what the DB carries.
const LIVE_EASY_REPEAT = {
  phraseRepeatCount: 2,
  repeatedCycleTypes: ['build', 'spaced_rep', 'use'],
}

describe('resolvePhraseRepeatCount — the ceiling config cannot raise', () => {
  it('reads the live Easy row as 2', () => {
    expect(resolvePhraseRepeatCount(LIVE_EASY_REPEAT)).toBe(2)
  })

  it('reads Fast as 1, so Fast plays each cycle once', () => {
    expect(resolvePhraseRepeatCount({ phraseRepeatCount: 1 })).toBe(1)
  })

  it('degrades every bad or absent value to 1, never to a repeat', () => {
    for (const bad of [undefined, null, {}, NaN, Infinity, 0, -3, '2']) {
      expect(resolvePhraseRepeatCount(typeof bad === 'object' && bad !== null ? bad : { phraseRepeatCount: bad })).toBe(1)
    }
  })

  it('clamps a row asking for 3 — "a phrase repeated 3x would drive people nuts"', () => {
    expect(resolvePhraseRepeatCount({ phraseRepeatCount: 3 })).toBe(MAX_PHRASE_REPEAT_COUNT)
    expect(resolvePhraseRepeatCount({ phraseRepeatCount: 99 })).toBe(2)
  })
})

describe('resolveRepeatedCycleTypes — one setting, two vocabularies', () => {
  it('translates the learner spelling into Script View\'s own type names', () => {
    const types = resolveRepeatedCycleTypes(LIVE_EASY_REPEAT)
    expect([...types].sort()).toEqual(['build', 'consolidate', 'review'])
  })

  it('leaves intro and debut out — "the intro LEGO and not the LEGO alone"', () => {
    const types = resolveRepeatedCycleTypes(LIVE_EASY_REPEAT)
    expect(types.has('intro')).toBe(false)
    expect(types.has('debut')).toBe(false)
  })

  it('defaults to the four Tom named when the key is absent', () => {
    expect([...resolveRepeatedCycleTypes({})].sort()).toEqual(['build', 'consolidate', 'review'])
  })

  it('honours an EMPTY array as "repeat nothing" — a decision, not a bad value', () => {
    expect(resolveRepeatedCycleTypes({ repeatedCycleTypes: [] }).size).toBe(0)
  })
})

describe('repeatPhraseCycles — the round Script View shows is the round played', () => {
  const round = [
    { type: 'intro', known_text: 'to speak' },
    { type: 'debut', known_text: 'to speak' },
    { type: 'build', known_text: 'I want to speak' },
    { type: 'review', known_text: 'I can speak' },
    { type: 'review', reviewItemKind: 'seed', known_text: 'I want to speak Welsh' },
    { type: 'consolidate', known_text: 'I would like to speak' },
  ]
  const easyTypes = resolveRepeatedCycleTypes(LIVE_EASY_REPEAT)

  it('doubles every practice cycle and leaves the two teaching cycles alone', () => {
    const out = repeatPhraseCycles(round, { count: 2, types: easyTypes })
    const counts = {}
    for (const i of out) counts[i.type] = (counts[i.type] || 0) + 1
    expect(counts.intro).toBe(1)
    expect(counts.debut).toBe(1)
    expect(counts.build).toBe(2)
    expect(counts.consolidate).toBe(2)
    // Three review rows in: one ordinary (doubled) and one seed-phase (not).
    expect(counts.review).toBe(3)
  })

  it('never repeats the seed-phase review — already a multi-cycle sandwich', () => {
    const out = repeatPhraseCycles(round, { count: 2, types: easyTypes })
    expect(out.filter(i => i.reviewItemKind === 'seed')).toHaveLength(1)
  })

  it('puts each copy immediately after its original, and marks it', () => {
    const out = repeatPhraseCycles(round, { count: 2, types: easyTypes })
    const i = out.findIndex(x => x.type === 'build')
    expect(out[i].repeatOf).toBeUndefined()
    expect(out[i + 1].known_text).toBe(out[i].known_text)
    expect(out[i + 1].repeatOf).toBe(2)
  })

  it('returns Fast\'s list untouched, by identity — Fast is provably unchanged', () => {
    expect(repeatPhraseCycles(round, { count: 1, types: easyTypes })).toBe(round)
  })

  it('roughly doubles a round, which is the whole point of the mirror', () => {
    // 6 cycles in; the 3 eligible ones gain a copy each. The two teaching
    // cycles and the seed-phase review keep their single play, which is why a
    // real Easy round grows by a bit under 2x rather than exactly 2x.
    const out = repeatPhraseCycles(round, { count: 2, types: easyTypes })
    expect(out).toHaveLength(9)
    expect(out.filter(i => i.repeatOf === 2)).toHaveLength(3)
  })
})
