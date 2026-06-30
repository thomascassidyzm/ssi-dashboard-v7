/**
 * Unit tests: learning-script-generator pure helpers.
 *
 * Covers the two convergence-critical pure behaviours
 * (docs/voice-engine/script-divergence-report.md):
 *  - spaced-rep offset expansion from the live algorithm_config.script_shape
 *    (D2: the learner reviews at [1,2,3,5,8,13,21,34,55,89], not just [1..55])
 *  - learner audio gate + round-number compression (D3: LEGOs/phrases missing
 *    audio get no round and the survivors renumber consecutively)
 *
 * Run: npx vitest run services/learning-script-generator.test.cjs
 */

import { describe, it, expect } from 'vitest'

const {
  calculateSpacedRepReviews,
  seedSentenceFor,
  reviewItemIsSeed,
  legoHasFullAudio,
  phraseHasFullAudio,
  applyLearnerAudioGate,
  numberRounds,
  FIBONACCI,
  SEED_PHASE_START_OFFSET,
  DEFAULT_SCRIPT_SHAPE,
} = require('./learning-script-generator.cjs')

// The live config value verified in the divergence report (algorithm_config
// key='script_shape' — same row the learner app reads).
const LIVE_OFFSETS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

describe('calculateSpacedRepReviews — offset expansion from config shape', () => {
  it('defaults to the fallback FIBONACCI offsets when no offsets passed', () => {
    const reviews = calculateSpacedRepReviews(56)
    const offsetsUsed = reviews.map(r => 56 - r.legoIndex)
    // At round 56 only offsets <= 55 reach back to round >= 1 (56-89 < 1 breaks).
    expect(offsetsUsed).toEqual([1, 2, 3, 5, 8, 13, 21, 34, 55])
    // FIBONACCI was extended past the historical tail with 89,144,233,377.
    expect(FIBONACCI).toEqual([1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377])
  })

  it('includes the N-89 review when given the live config offsets', () => {
    const reviews = calculateSpacedRepReviews(90, LIVE_OFFSETS)
    const offsetsUsed = reviews.map(r => 90 - r.legoIndex)
    expect(offsetsUsed).toEqual(LIVE_OFFSETS)
    // The N-89 review reaches back to round 1 with fibPosition 9
    const last = reviews[reviews.length - 1]
    expect(last.legoIndex).toBe(1)
    expect(last.fibPosition).toBe(9)
  })

  it('stops expanding once an offset reaches before round 1 (ascending break)', () => {
    const reviews = calculateSpacedRepReviews(4, LIVE_OFFSETS)
    // 4-1=3, 4-2=2, 4-3=1, 4-5=-1 → break
    expect(reviews.map(r => r.legoIndex)).toEqual([3, 2, 1])
  })

  it('dedupes review targets when offsets collide on the same round', () => {
    const reviews = calculateSpacedRepReviews(3, [1, 2, 2, 3])
    expect(reviews.map(r => r.legoIndex)).toEqual([2, 1])
  })

  it('returns no reviews for round 1', () => {
    expect(calculateSpacedRepReviews(1, LIVE_OFFSETS)).toEqual([])
  })

  it('fallback shape carries the historical constants', () => {
    expect(DEFAULT_SCRIPT_SHAPE).toEqual({
      spacedRepOffsets: FIBONACCI,
      maxBuildPhrases: 7,
      useConsolidationCount: 2,
      maxSpacedRepPhrases: 12,
      n1PhraseCount: 3,
    })
  })
})

// --- spaced-rep seed-sentence extension (post-89) --------------------------

describe('FIBONACCI series extension past the historical tail', () => {
  it('appends 144, 233, 377 after 89 (finite — no clamp-and-repeat)', () => {
    expect(FIBONACCI.slice(-4)).toEqual([89, 144, 233, 377])
    // The series terminates at 377; nothing beyond it.
    expect(FIBONACCI[FIBONACCI.length - 1]).toBe(377)
  })

  it('schedules reviews at the extended offsets when the course is long enough', () => {
    // Round 378 reaches all the way back: offset 377 → round 1.
    const reviews = calculateSpacedRepReviews(378, FIBONACCI)
    const offsetsUsed = reviews.map(r => 378 - r.legoIndex)
    expect(offsetsUsed).toEqual([1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377])
  })
})

describe('reviewItemIsSeed — the 89 → 144 boundary', () => {
  it('SEED_PHASE_START_OFFSET is 144 (the first term past 89)', () => {
    expect(SEED_PHASE_START_OFFSET).toBe(144)
  })

  it('the 89-step is still a use-phrase; 144 and beyond are seeds', () => {
    expect(reviewItemIsSeed(89)).toBe(false)   // last use-phrase
    expect(reviewItemIsSeed(143)).toBe(false)
    expect(reviewItemIsSeed(144)).toBe(true)    // first seed
    expect(reviewItemIsSeed(233)).toBe(true)
    expect(reviewItemIsSeed(377)).toBe(true)
  })
})

describe('seedSentenceFor — parent seed lookup (first 5 chars of LEGO id)', () => {
  const seedMap = new Map([
    ['S0001', {
      original_known: 'Je veux parler anglais avec toi maintenant.',
      original_target: 'I want to speak English with you now.',
      known_audio_uuid: 'ka', target1_audio_uuid: 't1a', target2_audio_uuid: 't2a',
    }],
  ])

  it('resolves S0001L03 → seed S0001 with the full parent sentence + audio', () => {
    expect(seedSentenceFor('S0001L03', seedMap)).toEqual({
      seedId: 'S0001',
      known_text: 'Je veux parler anglais avec toi maintenant.',
      target_text: 'I want to speak English with you now.',
      known_audio_uuid: 'ka',
      target1_audio_uuid: 't1a',
      target2_audio_uuid: 't2a',
    })
  })

  it('feeder ids (S0001F01) resolve to the same parent seed', () => {
    expect(seedSentenceFor('S0001F01', seedMap).seedId).toBe('S0001')
  })

  it('returns null for a missing seed record (guard → caller falls back)', () => {
    expect(seedSentenceFor('S9999L01', seedMap)).toBeNull()
  })

  it('returns null for an empty record (no original_target/known)', () => {
    const empty = new Map([['S0002', { original_known: '', original_target: '' }]])
    expect(seedSentenceFor('S0002L01', empty)).toBeNull()
  })

  it('returns null for a malformed lego id or missing map', () => {
    expect(seedSentenceFor('not-a-lego', seedMap)).toBeNull()
    expect(seedSentenceFor(undefined, seedMap)).toBeNull()
    expect(seedSentenceFor('S0001L03', null)).toBeNull()
  })
})

// --- learner audio gate + compression -------------------------------------

const mkLego = (id, seedNumber, { known = 'k', t1 = 't1', t2 = 't2', isNew = true } = {}) => ({
  lego: {
    id,
    type: 'A',
    new: isNew,
    known_text: `known ${id}`,
    target_text: `target ${id}`,
    known_audio_uuid: known,
    target1_audio_uuid: t1,
    target2_audio_uuid: t2,
  },
  seed: { seed_id: `S${String(seedNumber).padStart(4, '0')}`, seed_number: seedNumber },
  lego_index: 1,
})

const mkPhrase = (id, { known = 'k', t1 = 't1', t2 = 't2' } = {}) => ({
  id,
  known_text: `known ${id}`,
  target_text: `target ${id}`,
  known_audio_uuid: known,
  target1_audio_uuid: t1,
  target2_audio_uuid: t2,
})

describe('audio-completeness gates (learner parity: all THREE audio IDs)', () => {
  it('legoHasFullAudio requires known + target1 + target2', () => {
    expect(legoHasFullAudio(mkLego('S0001L01', 1).lego)).toBe(true)
    expect(legoHasFullAudio(mkLego('S0001L01', 1, { known: null }).lego)).toBe(false)
    expect(legoHasFullAudio(mkLego('S0001L01', 1, { t1: null }).lego)).toBe(false)
    expect(legoHasFullAudio(mkLego('S0001L01', 1, { t2: null }).lego)).toBe(false)
  })

  it('phraseHasFullAudio requires known + target1 + target2', () => {
    expect(phraseHasFullAudio(mkPhrase('p1'))).toBe(true)
    expect(phraseHasFullAudio(mkPhrase('p1', { t2: null }))).toBe(false)
  })
})

describe('applyLearnerAudioGate + numberRounds — gap-compression renumbering', () => {
  it('drops no-audio LEGOs and renumbers survivors consecutively (no gaps)', () => {
    const legos = [
      mkLego('S0001L01', 1),
      mkLego('S0001L02', 1, { t2: null }),   // awaiting audio → learner never sees it
      mkLego('S0002L01', 2),
      mkLego('S0002L02', 2, { known: null }), // awaiting audio
      mkLego('S0003L01', 3),
    ]
    const { legos: gated } = applyLearnerAudioGate(legos, new Map(), new Map())
    expect(gated.map(l => l.lego.id)).toEqual(['S0001L01', 'S0002L01', 'S0003L01'])

    const numbered = numberRounds(gated)
    expect(numbered.map(n => ({ id: n.record.lego.id, round: n.roundNumber }))).toEqual([
      { id: 'S0001L01', round: 1 },
      { id: 'S0002L01', round: 2 },  // S0001L02 left NO gap — compressed
      { id: 'S0003L01', round: 3 },
    ])
  })

  it('production view (no gate) keeps the original numbering for the same input', () => {
    const legos = [
      mkLego('S0001L01', 1),
      mkLego('S0001L02', 1, { t2: null }),
      mkLego('S0002L01', 2),
    ]
    const numbered = numberRounds(legos)
    expect(numbered.map(n => n.roundNumber)).toEqual([1, 2, 3])
    expect(numbered[2].record.lego.id).toBe('S0002L01')
  })

  it('respects startRound for paginated/lookback windows', () => {
    const legos = [mkLego('S0010L01', 10), mkLego('S0010L02', 10)]
    const numbered = numberRounds(legos, 41)
    expect(numbered.map(n => n.roundNumber)).toEqual([42, 43])
  })

  it('non-new LEGOs never consume a round number', () => {
    const legos = [
      mkLego('S0001L01', 1),
      mkLego('S0001L02', 1, { isNew: false }),
      mkLego('S0002L01', 2),
    ]
    const numbered = numberRounds(legos)
    expect(numbered.map(n => n.record.lego.id)).toEqual(['S0001L01', 'S0002L01'])
    expect(numbered.map(n => n.roundNumber)).toEqual([1, 2])
    // sourceIndex still points at the original position (for legoIndex display)
    expect(numbered.map(n => n.sourceIndex)).toEqual([0, 2])
  })

  it('filters BUILD/USE pools to fully-voiced phrases without mutating inputs', () => {
    const buildMap = new Map([
      ['S0001L01', [mkPhrase('b1'), mkPhrase('b2', { t1: null })]],
      ['S0002L01', [mkPhrase('b3', { known: null })]],
    ])
    const useMap = new Map([
      ['S0001L01', [mkPhrase('u1'), mkPhrase('u2')]],
    ])
    const { buildMap: gatedBuild, useMap: gatedUse } = applyLearnerAudioGate([], buildMap, useMap)

    expect(gatedBuild.get('S0001L01').map(p => p.id)).toEqual(['b1'])
    expect(gatedBuild.has('S0002L01')).toBe(false)  // emptied → removed
    expect(gatedUse.get('S0001L01').map(p => p.id)).toEqual(['u1', 'u2'])
    // originals untouched (production view unaffected)
    expect(buildMap.get('S0001L01')).toHaveLength(2)
    expect(buildMap.get('S0002L01')).toHaveLength(1)
  })
})
