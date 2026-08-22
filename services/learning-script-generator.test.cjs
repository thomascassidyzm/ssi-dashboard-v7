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
  legoIntroIsPlayable,
  legoDebutIsPlayable,
  phraseHasFullAudio,
  applyLearnerPhraseAudioGate,
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
    // FIBONACCI was extended to span a full course (89→…→2584).
    expect(FIBONACCI).toEqual([1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584])
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
  it('extends past 89 to span a full course (finite — no clamp-and-repeat)', () => {
    expect(FIBONACCI.slice(9)).toEqual([89, 144, 233, 377, 610, 987, 1597, 2584])
    // The series terminates at 2584 (first Fibonacci term past ~2000 LEGOs).
    expect(FIBONACCI[FIBONACCI.length - 1]).toBe(2584)
  })

  it('schedules reviews at the mid-tail offsets when the course is long enough', () => {
    // Round 378 reaches offsets up to 377 (378-610 < 1 breaks before 610).
    const reviews = calculateSpacedRepReviews(378, FIBONACCI)
    const offsetsUsed = reviews.map(r => 378 - r.legoIndex)
    expect(offsetsUsed).toEqual([1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377])
  })

  it('reviews the earliest LEGO late in a full-length course (offset 2584 → round 1)', () => {
    // A 2585-round course still reviews round 1 at the final offset.
    const reviews = calculateSpacedRepReviews(2585, FIBONACCI)
    const offsetsUsed = reviews.map(r => 2585 - r.legoIndex)
    expect(offsetsUsed).toEqual([1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584])
    expect(reviews[reviews.length - 1].legoIndex).toBe(1)
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

describe('per-item audio gates (learner parity, 2026-08-06)', () => {
  it('an INTRO needs a prompt clip plus target1 — target2 is not required', () => {
    const lego = mkLego('S0001L01', 1).lego
    expect(legoIntroIsPlayable(lego, 'pres')).toBe(true)
    // No presentation audio: known audio is the documented prompt fallback.
    expect(legoIntroIsPlayable(lego, null)).toBe(true)
    expect(legoIntroIsPlayable({ ...lego, target2_audio_uuid: null }, null)).toBe(true)
    expect(legoIntroIsPlayable({ ...lego, known_audio_uuid: null }, 'pres')).toBe(true)
    expect(legoIntroIsPlayable({ ...lego, known_audio_uuid: null }, null)).toBe(false)
    expect(legoIntroIsPlayable({ ...lego, target1_audio_uuid: null }, 'pres')).toBe(false)
  })

  it('a DEBUT needs all three voices (the learner must produce)', () => {
    expect(legoDebutIsPlayable(mkLego('S0001L01', 1).lego)).toBe(true)
    expect(legoDebutIsPlayable(mkLego('S0001L01', 1, { known: null }).lego)).toBe(false)
    expect(legoDebutIsPlayable(mkLego('S0001L01', 1, { t1: null }).lego)).toBe(false)
    expect(legoDebutIsPlayable(mkLego('S0001L01', 1, { t2: null }).lego)).toBe(false)
  })

  it('phraseHasFullAudio requires known + target1 + target2', () => {
    expect(phraseHasFullAudio(mkPhrase('p1'))).toBe(true)
    expect(phraseHasFullAudio(mkPhrase('p1', { t2: null }))).toBe(false)
  })
})

describe('numberRounds — an audio gap never costs a round NUMBER', () => {
  // THE staleness guard. Popty's preview used to gate the walk by audio, so a
  // LEGO short of one clip vanished and every later round slid down by one.
  // The player stopped doing that on 2026-08-06 (ssi-learning-app 269d2d19):
  // every is_new LEGO keeps its round number whatever its clips.
  it('numbers unvoiced LEGOs in place — no compression, in either view', () => {
    const legos = [
      mkLego('S0001L01', 1),
      mkLego('S0001L02', 1, { t2: null }),    // awaiting audio — still a round
      mkLego('S0002L01', 2),
      mkLego('S0002L02', 2, { known: null }), // awaiting audio — still a round
      mkLego('S0003L01', 3),
    ]
    const numbered = numberRounds(legos)
    expect(numbered.map(n => ({ id: n.record.lego.id, round: n.roundNumber }))).toEqual([
      { id: 'S0001L01', round: 1 },
      { id: 'S0001L02', round: 2 },
      { id: 'S0002L01', round: 3 },
      { id: 'S0002L02', round: 4 },
      { id: 'S0003L01', round: 5 },
    ])
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
    const { buildMap: gatedBuild, useMap: gatedUse } = applyLearnerPhraseAudioGate(buildMap, useMap)

    expect(gatedBuild.get('S0001L01').map(p => p.id)).toEqual(['b1'])
    expect(gatedBuild.has('S0002L01')).toBe(false)  // emptied → removed
    expect(gatedUse.get('S0001L01').map(p => p.id)).toEqual(['u1', 'u2'])
    // originals untouched (production view unaffected)
    expect(buildMap.get('S0001L01')).toHaveLength(2)
    expect(buildMap.get('S0002L01')).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Seed-phase review for GRADUATED seeds (parity with the learner app,
// generateLearningScript.ts:1251 / :1439).
//
// A graduated seed drops out of USE-PHRASE spaced rep but stays eligible for
// SEED-PHASE production review (skip offset >= SEED_PHASE_START_OFFSET, where
// the review item is the full parent seed sentence). Popty used to skip a
// graduated seed from spaced rep ENTIRELY, losing every seed-phase review.
// This fixture pins BOTH halves: the >=144 seed review is emitted, the <144
// use-phrase review of a graduated seed is still suppressed.
// ---------------------------------------------------------------------------

const { generateLearningScript } = require('./learning-script-generator.cjs')

const COURSE = 'tst_for_eng'
const LEGO_COUNT = 200          // one LEGO per seed → round N reviews seed N-offset
const GRAD_OFFSET = 30          // listening.offset: seeds graduate 30 LEGOs after their last

const legoId = (n) => 'S' + String(n).padStart(4, '0') + 'L01'

function makeFixture() {
  const legoRows = []
  const phraseRows = []
  const seedRows = []
  for (let s = 1; s <= LEGO_COUNT; s++) {
    legoRows.push({
      lego_id: legoId(s),
      seed_number: s,
      lego_index: 1,
      type: 'A',
      is_new: true,
      known_text: `lego ${s}`,
      target_text: `zielwort ${s}`,
      known_audio_id: `k-${s}`,
      target1_audio_id: `t1-${s}`,
      target2_audio_id: `t2-${s}`,
      presentation_audio_id: `p-${s}`,
    })
    seedRows.push({
      seed_number: s,
      known_text: `seed sentence ${s}`,
      target_text: `saatzsatz ${s}`,
      known_audio_id: `sk-${s}`,
      target1_audio_id: `st1-${s}`,
      target2_audio_id: `st2-${s}`,
    })
    phraseRows.push({
      id: `b-${s}`, course_code: COURSE, seed_number: s, lego_index: 1, position: 1,
      phrase_role: 'build', known_text: `build ${s}`, target_text: `bauen ${s}`,
      known_audio_id: `bk-${s}`, target1_audio_id: `bt1-${s}`, target2_audio_id: `bt2-${s}`,
    })
    for (let u = 1; u <= 2; u++) {
      phraseRows.push({
        id: `u-${s}-${u}`, course_code: COURSE, seed_number: s, lego_index: 1, position: 1 + u,
        phrase_role: 'use', known_text: `use ${s}.${u}`, target_text: `nutzen ${s}.${u}`,
        known_audio_id: `uk-${s}-${u}`, target1_audio_id: `ut1-${s}-${u}`, target2_audio_id: `ut2-${s}-${u}`,
      })
    }
  }
  return { legoRows, phraseRows, seedRows }
}

// Minimal chainable Supabase stub: every filter/order is a no-op that returns
// `this`; awaiting the builder resolves the rows for that table (sliced by
// .range() so the practice-phrase pager terminates).
function makeFakeSupabase({ legoRows, phraseRows, seedRows }) {
  return {
    from(table) {
      const builder = {
        _table: table,
        _select: '',
        _range: null,
        select(cols) { this._select = cols || ''; return this },
        eq() { return this },
        in() { return this },
        gte() { return this },
        not() { return this },
        order() { return this },
        limit() { return this },
        range(from, to) { this._range = [from, to]; return this },
        _rows() {
          switch (this._table) {
            case 'algorithm_config':
              return [
                { key: 'script_shape', config: { spacedRepOffsets: FIBONACCI } },
                { key: 'listening', config: { enabled: true, offset: GRAD_OFFSET } },
              ]
            case 'course_legos':
              return legoRows
            case 'course_practice_phrases':
              return phraseRows
            case 'course_seeds':
              return seedRows
            default:
              return []
          }
        },
        then(resolve, reject) {
          let data = this._rows()
          if (this._range) data = data.slice(this._range[0], this._range[1] + 1)
          return Promise.resolve({ data, error: null }).then(resolve, reject)
        },
      }
      return builder
    },
  }
}

describe('generateLearningScript — graduated seeds keep their seed-phase reviews', () => {
  const fixture = makeFixture()
  const supabase = makeFakeSupabase(fixture)

  // Window around round 145: offset 144 reaches back to round 1, whose seed
  // graduated long ago (LEGO ordinal 1 vs current 145, graduation offset 30).
  const run = () => generateLearningScript(supabase, COURSE, 20, 140)

  it('emits the >=144 review as the graduated seed\'s full sentence', async () => {
    const { rounds } = await run()
    const round145 = rounds.find(r => r.roundNumber === 145)
    expect(round145).toBeTruthy()

    const seedReview = round145.items.find(i => i.type === 'review' && i.reviewOffset === 144)
    expect(seedReview).toBeTruthy()
    expect(seedReview.legoId).toBe(legoId(1))
    expect(seedReview.reviewItemKind).toBe('seed')
    // The item is the parent SEED sentence, not a use-phrase.
    expect(seedReview.known_text).toBe('seed sentence 1')
    expect(seedReview.target_text).toBe('saatzsatz 1')
  })

  it('still suppresses a graduated seed\'s sub-144 use-phrase review', async () => {
    const { rounds, stats } = await run()
    expect(stats.graduatedSeeds).toBeGreaterThan(0)
    const round145 = rounds.find(r => r.roundNumber === 145)

    // Offset 34 → round 111; that seed graduated (ordinal 111 vs 144 at the
    // last graduation check, gap 33 >= 30) so no use-phrase review is due.
    for (const offset of [34, 55, 89]) {
      const review = round145.items.find(i => i.type === 'review' && i.legoIndex === 145 - offset)
      expect(review, `offset ${offset} must stay suppressed`).toBeUndefined()
    }

    // Offset 21 → round 124, NOT yet graduated: ordinary use-phrase review.
    const live = round145.items.find(i => i.type === 'review' && i.legoIndex === 124)
    expect(live).toBeTruthy()
    expect(live.reviewItemKind).not.toBe('seed')
    expect(live.target_text).toMatch(/^nutzen 124\./)
  })
})

// ---------------------------------------------------------------------------
// Player-delivery annotation (Script Viewer: always show intent, annotate
// reality). Nothing is filtered — rows the live player cannot deliver stay
// visible and carry playerCanDeliver:false + a reason + the missing roles.
// ---------------------------------------------------------------------------

const { annotatePlayerDelivery, missingAudioRoles } = require('./learning-script-generator.cjs')

const mkItem = (type, extra = {}) => ({
  type,
  legoId: 'S0001L01',
  known_text: `known ${type}`,
  target_text: `target ${type}`,
  known_audio_uuid: 'k',
  target1_audio_uuid: 't1',
  target2_audio_uuid: 't2',
  ...extra,
})

describe('missingAudioRoles — which of the three voices are absent', () => {
  it('names every absent role, in known/target1/target2 order', () => {
    expect(missingAudioRoles(mkItem('build'))).toEqual([])
    expect(missingAudioRoles(mkItem('build', { target2_audio_uuid: null }))).toEqual(['target2'])
    expect(missingAudioRoles(mkItem('build', { known_audio_uuid: null, target2_audio_uuid: null })))
      .toEqual(['known', 'target2'])
    expect(missingAudioRoles(null)).toEqual(['known', 'target1', 'target2'])
  })

  it('honours a restricted role list (seed reviews need only target1)', () => {
    expect(missingAudioRoles(mkItem('review', { known_audio_uuid: null }), ['target1'])).toEqual([])
    expect(missingAudioRoles(mkItem('review', { target1_audio_uuid: null }), ['target1'])).toEqual(['target1'])
  })
})

describe('annotatePlayerDelivery — per-row flags', () => {
  const fullLego = mkLego('S0001L01', 1).lego

  it('marks every row deliverable when the LEGO and phrases are fully voiced', () => {
    const out = annotatePlayerDelivery(
      [mkItem('intro'), mkItem('debut'), mkItem('build'), mkItem('review'), mkItem('consolidate')],
      { lego: fullLego }
    )
    expect(out.every(i => i.playerCanDeliver === true)).toBe(true)
    expect(out.every(i => i.playerDropReason === undefined)).toBe(true)
  })

  it('costs only the DEBUT when the LEGO is short its second voice', () => {
    // The whole-round condemnation this replaces is exactly the staleness:
    // the intro still plays (prompt + target1) and so does every phrase row.
    const out = annotatePlayerDelivery(
      [mkItem('intro'), mkItem('debut'), mkItem('build')],
      { lego: { ...fullLego, target2_audio_uuid: null }, presentationAudioId: 'p' }
    )
    expect(out.map(i => i.playerCanDeliver)).toEqual([true, false, true])
    expect(out[1].playerDropReason).toBe('debut-audio')
    expect(out[1].missingAudioRoles).toEqual(['target2'])
  })

  it('costs the INTRO alone when there is no prompt clip at all', () => {
    const out = annotatePlayerDelivery(
      [mkItem('intro'), mkItem('debut'), mkItem('build')],
      { lego: { ...fullLego, known_audio_uuid: null }, presentationAudioId: null }
    )
    expect(out.map(i => i.playerCanDeliver)).toEqual([false, false, true])
    expect(out[0].playerDropReason).toBe('intro-audio')
    expect(out[0].missingAudioRoles).toEqual(['known'])
    // The debut needs all three, so it goes too — but on its OWN reason.
    expect(out[1].playerDropReason).toBe('debut-audio')
  })

  it('keeps the intro playable when presentation audio covers a missing known clip', () => {
    const out = annotatePlayerDelivery(
      [mkItem('intro')],
      { lego: { ...fullLego, known_audio_uuid: null }, presentationAudioId: 'pres-1' }
    )
    expect(out[0].playerCanDeliver).toBe(true)
  })

  it('costs everything in the round only when target1 is gone', () => {
    const out = annotatePlayerDelivery(
      [mkItem('intro'), mkItem('debut')],
      { lego: { ...fullLego, target1_audio_uuid: null }, presentationAudioId: 'p' }
    )
    expect(out.map(i => i.playerCanDeliver)).toEqual([false, false])
    expect(out[0].missingAudioRoles).toEqual(['target1'])
  })

  it('flags only the offending phrase row when the LEGO itself is fine', () => {
    const out = annotatePlayerDelivery(
      [mkItem('debut'), mkItem('build', { target2_audio_uuid: null }), mkItem('consolidate')],
      { lego: fullLego }
    )
    expect(out.map(i => i.playerCanDeliver)).toEqual([true, false, true])
    expect(out[1].playerDropReason).toBe('phrase-audio')
    expect(out[1].missingAudioRoles).toEqual(['target2'])
  })

  it('needs only target1 for a seed-sentence review, and says so when it is absent', () => {
    const ok = annotatePlayerDelivery(
      [mkItem('review', { reviewItemKind: 'seed', known_audio_uuid: null, target2_audio_uuid: null })],
      { lego: fullLego }
    )
    expect(ok[0].playerCanDeliver).toBe(true)

    const bad = annotatePlayerDelivery(
      [mkItem('review', { reviewItemKind: 'seed', target1_audio_uuid: null })],
      { lego: fullLego }
    )
    expect(bad[0].playerCanDeliver).toBe(false)
    expect(bad[0].playerDropReason).toBe('seed-audio')
  })

  it('delivers a review of a LEGO whose own debut was skipped (it still entered legoState)', () => {
    const out = annotatePlayerDelivery(
      [mkItem('review', { legoId: 'S0009L01' })],
      { lego: fullLego }
    )
    expect(out[0].playerCanDeliver).toBe(true)
    expect(out[0].playerDropReason).toBeUndefined()
  })

  it('never mutates the items it is given', () => {
    const items = [mkItem('build', { target1_audio_uuid: null })]
    annotatePlayerDelivery(items, { lego: fullLego })
    expect(items[0].playerCanDeliver).toBeUndefined()
  })
})

describe('generateLearningScript — a real audio hole costs its cycle, not its round', () => {
  // Round 5's LEGO is short its second target voice (the fra_for_eng S0015L01
  // shape from the 2026-08-06 diff); LEGO 7's BUILD phrase is short one voice.
  const holed = () => {
    const fixture = makeFixture()
    fixture.legoRows.find(l => l.lego_id === legoId(5)).target2_audio_id = null
    fixture.phraseRows.find(p => p.id === 'b-7').target2_audio_id = null
    return makeFakeSupabase(fixture)
  }
  const run = () => generateLearningScript(holed(), COURSE, 12, 0)

  it('still SHOWS the round the player partly skips (intent is never hidden)', async () => {
    const { rounds } = await run()
    const round5 = rounds.find(r => r.roundNumber === 5)
    expect(round5).toBeTruthy()
    expect(round5.legoId).toBe(legoId(5))
    expect(round5.items.length).toBeGreaterThan(0)
  })

  it('annotates the DEBUT alone as undeliverable, naming the missing voice', async () => {
    const { rounds } = await run()
    const round5 = rounds.find(r => r.roundNumber === 5)
    // The round still plays — this is the whole point of the 2026-08-06 fix.
    expect(round5.playerDelivers).toBe(true)
    expect(round5.playerDropReason).toBeUndefined()
    expect(round5.undeliverableItemCount).toBe(1)
    const bad = round5.items.filter(i => i.playerCanDeliver === false)
    expect(bad).toHaveLength(1)
    expect(bad[0].type).toBe('debut')
    expect(bad[0].playerDropReason).toBe('debut-audio')
    expect(bad[0].missingAudioRoles).toEqual(['target2'])
    // Its intro and its build/review/consolidate neighbours are untouched.
    expect(round5.items.find(i => i.type === 'intro').playerCanDeliver).toBe(true)
  })

  it('THE STALENESS GUARD: an audio hole renumbers nothing, here or in the player', async () => {
    const { rounds } = await run()
    // Every round keeps its own number in both directions — no slide of one.
    for (const r of rounds) {
      expect(r.playerRoundNumber, `round ${r.roundNumber} must not renumber`).toBe(r.roundNumber)
    }
    expect(rounds.find(r => r.roundNumber === 6).playerRoundNumber).toBe(6)
    expect(rounds.find(r => r.roundNumber === 10).playerRoundNumber).toBe(10)
    // And the LEGO at each round is the intended one, not the next one up.
    expect(rounds.find(r => r.roundNumber === 6).legoId).toBe(legoId(6))
    expect(rounds.find(r => r.roundNumber === 10).legoId).toBe(legoId(10))
  })

  it('flags the single unvoiced phrase without condemning its round', async () => {
    const { rounds } = await run()
    const round7 = rounds.find(r => r.roundNumber === 7)
    expect(round7.playerDelivers).toBe(true)
    const bad = round7.items.filter(i => i.playerDropReason === 'phrase-audio')
    expect(bad).toHaveLength(1)
    expect(bad[0].known_text).toBe('build 7')
    expect(bad[0].missingAudioRoles).toEqual(['target2'])
    // Its own BUILD/DEBUT neighbours are untouched.
    expect(round7.items.find(i => i.type === 'debut').playerCanDeliver).toBe(true)
  })

  it('keeps later reviews of the half-voiced LEGO — they play on their own audio', async () => {
    const { rounds } = await run()
    const reviewsOfFive = rounds
      .flatMap(r => r.items)
      .filter(i => i.type === 'review' && i.legoId === legoId(5))
    expect(reviewsOfFive.length).toBeGreaterThan(0)
    expect(reviewsOfFive.every(i => i.playerCanDeliver === true)).toBe(true)
  })

  it('totals the gaps in stats — no round is dropped for a single missing clip', async () => {
    const { rounds, stats } = await run()
    expect(stats.roundsPlayerDrops).toBe(0)
    expect(stats.itemsPlayerCannotDeliver).toBe(
      rounds.reduce((sum, r) => sum + r.items.filter(i => i.playerCanDeliver === false).length, 0)
    )
    expect(stats.itemsPlayerCannotDeliver).toBeGreaterThan(0)
  })

  it('a fully-voiced course flags nothing', async () => {
    const { rounds, stats } = await generateLearningScript(makeFakeSupabase(makeFixture()), COURSE, 12, 0)
    expect(stats.roundsPlayerDrops).toBe(0)
    expect(stats.itemsPlayerCannotDeliver).toBe(0)
    expect(rounds.every(r => r.playerDelivers === true)).toBe(true)
    expect(rounds.map(r => r.playerRoundNumber)).toEqual(rounds.map(r => r.roundNumber))
  })
})

// ---------------------------------------------------------------------------
// LEARNER VIEW (?learnerView=1) — the preview a reviewer reads as "what the
// learner actually gets". It must agree with the player item for item.
//
// This block is the regression the stale gate would have failed: before
// 2026-08-06 parity, one unvoiced LEGO removed a whole round from this preview
// and slid every later round number down by one, so the preview disagreed with
// the live player for every course with an audio gap.
// ---------------------------------------------------------------------------

describe('generateLearningScript learnerView — per-item degradation parity', () => {
  // LEGO 5: no target2 → debut unplayable, intro fine.
  // LEGO 8: no known audio AND no presentation → intro unplayable too.
  // LEGO 11: no target1 → nothing of its own plays.
  const gappy = () => {
    const fixture = makeFixture()
    fixture.legoRows.find(l => l.lego_id === legoId(5)).target2_audio_id = null
    const eight = fixture.legoRows.find(l => l.lego_id === legoId(8))
    eight.known_audio_id = null
    eight.presentation_audio_id = null
    fixture.legoRows.find(l => l.lego_id === legoId(11)).target1_audio_id = null
    return makeFakeSupabase(fixture)
  }
  const runLearner = () => generateLearningScript(gappy(), COURSE, 14, 0, { learnerView: true })

  it('keeps every round and every round NUMBER despite the gaps', async () => {
    const { rounds } = await runLearner()
    expect(rounds.map(r => r.roundNumber)).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14])
    expect(rounds.map(r => r.legoId)).toEqual(
      [1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(legoId)
    )
  })

  it('skips only the unplayable cycle, keeping the rest of its round', async () => {
    const { rounds } = await runLearner()
    const round5 = rounds.find(r => r.roundNumber === 5)
    expect(round5.items.find(i => i.type === 'intro')).toBeTruthy()
    expect(round5.items.find(i => i.type === 'debut')).toBeUndefined()
    expect(round5.items.filter(i => i.type === 'build').length).toBeGreaterThan(0)

    const round8 = rounds.find(r => r.roundNumber === 8)
    expect(round8.items.find(i => i.type === 'intro')).toBeUndefined()
    expect(round8.items.find(i => i.type === 'debut')).toBeUndefined()
    // Builds, reviews and consolidates survive an intro/debut with no audio.
    expect(round8.items.filter(i => i.type === 'build').length).toBeGreaterThan(0)
    expect(round8.items.filter(i => i.type === 'consolidate').length).toBeGreaterThan(0)
  })

  it('still reviews a LEGO whose own debut was skipped', async () => {
    const { rounds } = await runLearner()
    const reviewsOfEight = rounds
      .flatMap(r => r.items)
      .filter(i => i.type === 'review' && i.legoId === legoId(8))
    expect(reviewsOfEight.length).toBeGreaterThan(0)
  })

  it('nothing is dropped for audio in the LEGO pool — only phrases are', async () => {
    const { stats } = await runLearner()
    expect(stats.learnerView).toBe(true)
    expect(stats.legosDroppedForAudio).toBeUndefined()
    expect(stats.phrasesDroppedForAudio).toBe(0)
  })

  it('drops a seed review the player cannot voice, rather than showing a silent one', async () => {
    // Learner parity (generateLearningScript.ts:1316): without the seed's
    // first target voice the player falls back to the use-phrase path.
    const fixture = makeFixture()
    fixture.seedRows.find(r => r.seed_number === 1).target1_audio_id = null
    const supabase = makeFakeSupabase(fixture)

    const { rounds: production } = await generateLearningScript(supabase, COURSE, 6, 140)
    const prodSeedReview = production
      .find(r => r.roundNumber === 145).items
      .find(i => i.reviewItemKind === 'seed' && i.legoId === legoId(1))
    expect(prodSeedReview).toBeTruthy()   // intent view still shows it, flagged
    expect(prodSeedReview.playerCanDeliver).toBe(false)
    expect(prodSeedReview.playerDropReason).toBe('seed-audio')

    const { rounds: learner } = await generateLearningScript(supabase, COURSE, 6, 140, { learnerView: true })
    const learnerRound = learner.find(r => r.roundNumber === 145)
    expect(learnerRound.items.find(i => i.reviewItemKind === 'seed' && i.legoId === legoId(1))).toBeUndefined()
    // It fell back to that LEGO's use-phrase, exactly as the player does.
    expect(learnerRound.items.find(i => i.type === 'review' && i.legoId === legoId(1))).toBeTruthy()
  })

  it('dedupes consecutive duplicates ACROSS rounds, as the player does', async () => {
    // The player dedupes over the whole item stream, so the same sentence
    // repeated across a round boundary is dropped — and a round left with only
    // that duplicate never plays. Two adjacent LEGOs sharing one USE phrase
    // makes that collision.
    // Find what round 2 actually ends on, then make round 3's first BUILD the
    // same sentence — the boundary collision the per-round scope cannot see.
    const { rounds: baseline } = await generateLearningScript(makeFakeSupabase(makeFixture()), COURSE, 6, 0)
    const round2Items = baseline.find(r => r.roundNumber === 2).items
    const tail = round2Items[round2Items.length - 1]

    const fixture = makeFixture()
    const dup = fixture.phraseRows.find(p => p.id === 'b-3')
    dup.known_text = tail.known_text
    dup.target_text = tail.target_text
    const supabase = makeFakeSupabase(fixture)

    const firstOf = (rounds, n) => rounds.find(r => r.roundNumber === n).items
      .filter(i => i.type !== 'intro' && i.type !== 'debut')[0]

    const { rounds: production } = await generateLearningScript(supabase, COURSE, 6, 0)
    const { rounds: learner } = await generateLearningScript(supabase, COURSE, 6, 0, { learnerView: true })
    // Production view keeps it (its scope is the round); learner view drops it,
    // because the player's stream-wide dedup does.
    expect(firstOf(production, 3).known_text).toBe(tail.known_text)
    expect(firstOf(learner, 3).known_text).not.toBe(tail.known_text)
  })

  it('learner view and production view agree on round numbering, item for item', async () => {
    const { rounds: learner } = await runLearner()
    const { rounds: production } = await generateLearningScript(gappy(), COURSE, 14, 0)
    expect(learner.map(r => r.roundNumber)).toEqual(production.map(r => r.roundNumber))
    expect(learner.map(r => r.legoId)).toEqual(production.map(r => r.legoId))
    // The only difference is that the learner view omits the cycles the
    // production view shows-and-flags.
    for (const p of production) {
      const l = learner.find(r => r.roundNumber === p.roundNumber)
      // Learner view drops the undeliverable cycles, and may additionally
      // collapse a duplicate carried over from the previous round.
      expect(l.items.length).toBeLessThanOrEqual(p.items.length - p.undeliverableItemCount)
    }
  })
})

// ── Gloss alignment: target words are the columns ─────────────────────────
// Tom's ruling, 2026-08-12: the target keeps its own word order and the known
// gloss sits underneath it, reading wrong when the orders differ. Basque
// `hitz bat` glosses `word` `a`, never reordered to "a word".
const {
  glossAlignment,
  targetWordsOf,
  segmentsCoverWords,
  segmentsFromBlocks,
  sameTargetWords,
  mappingFromLego,
  legoIsMappable,
} = require('./learning-script-generator.cjs')

describe('gloss alignment on a row', () => {
  // The real stored decomposition of eus_for_eng:S0006L02B01. Note it is
  // chunked by LEGO, not by word: 3 blocks over 5 target words.
  const hitzBatBlocks = [
    { known: 'a word', legoId: 'S0006L02', target: 'hitz bat', isGhost: false, isSalient: true },
    { known: '', legoId: null, target: ' esan', isGhost: true },
    { known: 'I want', legoId: 'S0001L01', target: ' nahi dut', isGhost: false },
  ]
  const hitzBatTarget = 'hitz bat esan nahi dut'

  it('makes one column per TARGET word, in the target order', () => {
    const a = glossAlignment('phrase', hitzBatTarget, hitzBatBlocks, null)
    expect(a.words).toEqual(['hitz', 'bat', 'esan', 'nahi', 'dut'])
  })

  it('derives a faithful start: each block spans its own words, never guessing a split', () => {
    const a = glossAlignment('phrase', hitzBatTarget, hitzBatBlocks, null)
    // "a word" spans hitz+bat as one chunk — it is NOT split into word/a,
    // because which half is which is exactly what a human must decide.
    expect(a.segments).toEqual([
      { span: 2, known: 'a word' },
      { span: 1, known: '' },
      { span: 2, known: 'I want' },
    ])
    expect(a.segments.reduce((n, s) => n + s.span, 0)).toBe(a.words.length)
    expect(a.segmented).toBe(false)
  })

  it('prefers a human segmentation over the derived one', () => {
    // What Tom asked for on this row: hitz -> word, bat -> a.
    const human = [
      { span: 1, known: 'word' }, { span: 1, known: 'a' }, { span: 1, known: '' },
      { span: 1, known: 'want' }, { span: 1, known: 'I do' },
    ]
    const a = glossAlignment('phrase', hitzBatTarget, hitzBatBlocks, human)
    expect(a.segments).toEqual(human)
    expect(a.segmented).toBe(true)
  })

  it('ignores a stored segmentation that no longer covers the target', () => {
    const stale = [{ span: 2, known: 'a word' }]   // 2 of 5 columns
    const a = glossAlignment('phrase', hitzBatTarget, hitzBatBlocks, stale)
    expect(a.segmented).toBe(false)
    expect(a.segments.reduce((n, s) => n + s.span, 0)).toBe(5)
  })

  it('gives leftover target words their own empty column rather than dropping them', () => {
    // Blocks tile only the first two words; the rest must still be visible.
    const partial = [{ known: 'a word', target: 'hitz bat' }]
    const a = glossAlignment('phrase', hitzBatTarget, partial, null)
    expect(a.segments).toEqual([
      { span: 2, known: 'a word' },
      { span: 1, known: '' }, { span: 1, known: '' }, { span: 1, known: '' },
    ])
  })

  // "When appropriate" (Tom): nothing to align -> no glyph on the row.
  it('shows nothing when there is nothing to align', () => {
    expect(glossAlignment('phrase', 'hitzak', hitzBatBlocks, null)).toBeNull()
    expect(glossAlignment('phrase', '', hitzBatBlocks, null)).toBeNull()
    expect(glossAlignment('phrase', 'hitz bat', [], null)).toBeNull()
    expect(glossAlignment('phrase', 'hitz bat', [{ known: '', target: 'hitz bat' }], null)).toBeNull()
  })

  it('reads an M-LEGO components array the same way', () => {
    const a = mappingFromLego({
      type: 'M',
      target_text: 'gogoratzen saiatzen ari naiz',
      components: [
        { known: 'to remember', target: 'gogoratu', introduce: true },
        { known: 'wishing to', target: 'nahian ari naiz', introduce: false },
      ],
      known_gloss_segments: null,
    })
    expect(a.source).toBe('lego')
    expect(a.words).toEqual(['gogoratzen', 'saiatzen', 'ari', 'naiz'])
    // 'gogoratu' is one word, 'nahian ari naiz' is three — 1 + 3 = 4 columns.
    expect(a.segments).toEqual([
      { span: 1, known: 'to remember' },
      { span: 3, known: 'wishing to' },
    ])
  })

  // Tom, 2026-08-13: "A-LEGOs can't be mappable by definition — an A-LEGO has
  // only one word in at least one language, and therefore cannot be split and
  // mapped." So `a word = hitz bat` must show NO glyph, and the editor's
  // original refusal on it was right all along.
  describe('only an M-LEGO intro is a mapping candidate', () => {
    const hitzBat = {
      type: 'A', known_text: 'a word', target_text: 'hitz bat', components: null,
    }
    const gogoratzen = {
      type: 'M',
      known_text: "I'm trying to remember",
      target_text: 'gogoratzen saiatzen ari naiz',
      components: [
        { known: 'to remember', target: 'gogoratu' },
        { known: 'wishing to', target: 'nahian ari naiz' },
      ],
      known_gloss_segments: null,
    }

    it('refuses an A-LEGO outright — the multi-word target does not save it', () => {
      expect(mappingFromLego(hitzBat)).toBeNull()
      expect(legoIsMappable(hitzBat)).toBe(false)
    })

    // The trap: 72 A-LEGOs estate-wide DO carry components, 16 of them with a
    // multi-word target (afr S0113L01 "why can't I"). Gating on "has no
    // components" instead of on the declared type hands those a glyph.
    it('refuses an A-LEGO that happens to carry components', () => {
      expect(mappingFromLego({
        type: 'A',
        known_text: "why can't I",
        target_text: 'waarom kan ek nie',
        components: [{ known: 'why', target: 'waarom' }, { known: "can't I", target: 'kan ek nie' }],
      })).toBeNull()
    })

    it('accepts an M-LEGO intro, componentisation deriving the start', () => {
      const a = mappingFromLego(gogoratzen)
      expect(legoIsMappable(gogoratzen)).toBe(true)
      expect(a.source).toBe('lego')
      expect(a.words).toEqual(['gogoratzen', 'saiatzen', 'ari', 'naiz'])
      expect(a.segments).toEqual([
        { span: 1, known: 'to remember' },
        { span: 3, known: 'wishing to' },
      ])
      expect(a.segmented).toBe(false)
    })

    it('prefers an authored mapping over the derived start', () => {
      const a = mappingFromLego({
        ...gogoratzen,
        known_gloss_segments: [
          { span: 1, known: 'remember' }, { span: 1, known: 'trying to' }, { span: 2, known: "I'm" },
        ],
      })
      expect(a.segments).toEqual([
        { span: 1, known: 'remember' }, { span: 1, known: 'trying to' }, { span: 2, known: "I'm" },
      ])
      expect(a.segmented).toBe(true)
    })

    // Tom, 2026-08-13, after the A→M reclassification: "it's just classification
    // that feeds the mapping". 1,354 of the 4,088 reclassified rows carry no
    // components, so there is nothing to DERIVE — but they are candidates, and
    // the editor must open on them with blank columns for a human to author.
    // Guessing a split is still forbidden: every column starts empty.
    it('opens a component-less M-LEGO on blank columns rather than refusing it', () => {
      const a = mappingFromLego({
        type: 'M', known_text: 'a word', target_text: 'hitz bat',
        components: null, known_gloss_segments: null,
      })
      expect(a.source).toBe('lego')
      expect(a.words).toEqual(['hitz', 'bat'])
      expect(a.segments).toEqual([{ span: 1, known: '' }, { span: 1, known: '' }])
      expect(a.segmented).toBe(false)
    })

    it('still prefers an authored mapping on a component-less M-LEGO', () => {
      const a = mappingFromLego({
        type: 'M', known_text: 'a word', target_text: 'hitz bat', components: null,
        known_gloss_segments: [{ span: 1, known: 'word' }, { span: 1, known: 'a' }],
      })
      expect(a.segments).toEqual([{ span: 1, known: 'word' }, { span: 1, known: 'a' }])
      expect(a.segmented).toBe(true)
    })

    it('shows no grid where there is only one target word, and tolerates a missing row', () => {
      expect(mappingFromLego({ type: 'M', target_text: 'hitzak', components: null })).toBeNull()
      expect(mappingFromLego(null)).toBeNull()
      expect(legoIsMappable(null)).toBe(false)
      expect(legoIsMappable({ type: null })).toBe(false)
    })
  })

  describe('the shape gate', () => {
    it('accepts only whole spans of at least 1 that sum to the column count', () => {
      expect(segmentsCoverWords([{ span: 2, known: 'a' }, { span: 1, known: '' }], 3)).toBe(true)
      expect(segmentsCoverWords([{ span: 2, known: 'a' }], 3)).toBe(false)
      expect(segmentsCoverWords([{ span: 0, known: 'a' }], 0)).toBe(false)
      expect(segmentsCoverWords([{ span: 1.5, known: 'a' }], 1.5)).toBe(false)
      expect(segmentsCoverWords([{ span: 1 }], 1)).toBe(false)          // no known
      expect(segmentsCoverWords([], 0)).toBe(false)
      expect(segmentsCoverWords(null, 0)).toBe(false)
    })
  })

  describe('target words', () => {
    it('splits on whitespace and nothing else', () => {
      expect(targetWordsOf('  hitz   bat  ')).toEqual(['hitz', 'bat'])
      expect(targetWordsOf('')).toEqual([])
      expect(targetWordsOf(null)).toEqual([])
      // Punctuation stays attached — it is part of the word as rendered.
      expect(targetWordsOf('¿cosa azul?')).toEqual(['¿cosa', 'azul?'])
    })
  })

  describe('derivation from blocks', () => {
    it('never emits a span wider than the columns that remain', () => {
      const segs = segmentsFromBlocks([{ known: 'x', target: 'a b c d' }], 2)
      expect(segs).toEqual([{ span: 1, known: '' }, { span: 1, known: '' }])
    })

    // Tom's amendment, 2026-08-14: the DEFAULT mapping is auto-generated and a
    // human only fixes what it gets wrong. Components are stored in the KNOWN
    // language's order about a fifth of the time, so claiming columns in array
    // order put glosses under the wrong words on 8,542 rows estate-wide.
    it('puts each block under its OWN target words, not the next columns along', () => {
      // eng_for_pan S0045L03-shaped: components listed in the known order.
      const segs = segmentsFromBlocks(
        [{ known: 'time-gloss', target: 'time' }, { known: 'didnt-have-gloss', target: "didn't have" }],
        ["didn't", 'have', 'time'])
      expect(segs).toEqual([
        { span: 2, known: 'didnt-have-gloss' },
        { span: 1, known: 'time-gloss' },
      ])
    })

    it('lets a longer block claim its columns before a shorter one takes one from inside it', () => {
      const segs = segmentsFromBlocks(
        [{ known: 'A', target: 'la' }, { known: 'B', target: 'la casa' }],
        ['la', 'casa', 'la'])
      // 'la casa' takes columns 0-1; the one-word 'la' can then only be col 2.
      expect(segs).toEqual([{ span: 2, known: 'B' }, { span: 1, known: 'A' }])
    })

    it('matches a block through case and trailing punctuation', () => {
      const segs = segmentsFromBlocks(
        [{ known: 'q', target: 'Azul' }, { known: 'p', target: 'cosa' }],
        ['¿cosa', 'azul?'])
      expect(segs).toEqual([{ span: 1, known: 'p' }, { span: 1, known: 'q' }])
    })

    // The refusal to guess (7892dce5) survives: locating uses only what the
    // component already says, and never invents a placement for one that is not
    // in the sentence at all.
    it('falls back to the old sequential start when no block is in the target text', () => {
      // eus_for_eng `gogoratzen saiatzen ari naiz`: components glossed, not tiled.
      const segs = segmentsFromBlocks(
        [{ known: 'to remember', target: 'gogoratu' }, { known: 'wishing to', target: 'nahi' }],
        ['gogoratzen', 'saiatzen', 'ari', 'naiz'])
      expect(segs).toEqual([
        { span: 1, known: 'to remember' },
        { span: 1, known: 'wishing to' },
        { span: 1, known: '' }, { span: 1, known: '' },
      ])
    })

    it('gives an unlocatable block the leftover columns rather than dropping its gloss', () => {
      const segs = segmentsFromBlocks(
        [{ known: 'here', target: 'bat' }, { known: 'nowhere', target: 'xxx yyy' }],
        ['hitz', 'bat', 'esan', 'nahi'])
      expect(segs).toEqual([
        { span: 1, known: 'nowhere' },
        { span: 1, known: 'here' },
        { span: 1, known: '' }, { span: 1, known: '' },
      ])
      // Nothing invented: every gloss came from a block.
      expect(segs.map(s => s.known).filter(Boolean).sort()).toEqual(['here', 'nowhere'])
    })

    it('never invents a gloss for a column no block covers', () => {
      const segs = segmentsFromBlocks([{ known: 'a word', target: 'hitz bat' }],
        ['hitz', 'bat', 'esan', 'nahi', 'dut'])
      expect(segs).toEqual([
        { span: 2, known: 'a word' },
        { span: 1, known: '' }, { span: 1, known: '' }, { span: 1, known: '' },
      ])
    })
  })
})
