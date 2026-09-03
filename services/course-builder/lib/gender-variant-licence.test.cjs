/**
 * The two-voice gender mechanism at the ZUT gate (Tom's ruling, 2026-09-03).
 *
 * Hindi leaves a third-person referent's gender open where English must choose:
 * उसका नाम is "his name" or "her name" and the Hindi says nothing either way.
 * The course answers with BOTH readings — female voice says "her", male voice
 * says "his" — and explains nothing. That makes one known text legitimately carry
 * two targets, which checkLegoConflict rejected on sight.
 *
 * The licence is granted by EVIDENCE: only a stored target-side {expanded_f,
 * expanded_m} pair in course_gender_expansions licenses a collision. These tests
 * lock down both halves — that the licensed pair is accepted, and that nothing
 * else is loosened.
 *
 * Run: npx vitest run services/course-builder/lib/gender-variant-licence
 */

import { describe, it, expect, beforeEach } from 'vitest'

const {
  checkLegoConflict, checkPhraseZUT, isDedupConflict,
  loadGenderVariantLicence, isLicensedGenderVariant, _clearGenderVariantLicenceCache,
} = require('./validation.cjs')

// Minimal supabase stub: only the query shapes these two functions actually build.
function makeSupabase({ legos = [], phrases = [], expansions = [] } = {}) {
  const calls = { expansionFilters: [] }
  const builder = (table) => {
    const filters = {}
    const q = {
      select() { return q },
      eq(col, val) { filters[col] = val; return q },
      lt(col, val) { filters[`lt_${col}`] = val; return q },
      in(col, vals) { filters[`in_${col}`] = vals; return q },
      then(resolve) { return Promise.resolve(run()).then(resolve) },
    }
    const run = () => {
      if (table === 'course_gender_expansions') {
        calls.expansionFilters.push({ ...filters })
        const codes = filters.in_course_code || [filters.course_code]
        return { data: expansions.filter(r =>
          codes.includes(r.course_code) &&
          (filters.text_side === undefined || r.text_side === filters.text_side)), error: null }
      }
      const src = table === 'course_legos' ? legos : phrases
      return { data: src.filter(r =>
        r.course_code === filters.course_code &&
        (filters.known_text === undefined || r.known_text === filters.known_text) &&
        (filters.in_known_text === undefined || filters.in_known_text.includes(r.known_text)) &&
        (filters.lt_seed_number === undefined || r.seed_number < filters.lt_seed_number)), error: null }
    }
    return q
  }
  return { from: builder, _calls: calls }
}

const lego = (o) => ({ course_code: 'eng_for_hin', type: 'M', lego_index: 1, ...o })
const PAIR = { course_code: 'eng_for_hin', text_side: 'target', language: 'eng',
               original_text: 'his name', expanded_f: 'her name', expanded_m: 'his name' }

beforeEach(() => _clearGenderVariantLicenceCache())

describe('the collision the mechanism exists to license', () => {
  const existing = [lego({ seed_number: 20, known_text: 'उसका नाम', target_text: 'his name' })]

  it('is a hard ZUT rejection with no stored pair — the rule is unchanged by default', async () => {
    const sb = makeSupabase({ legos: existing })
    const r = await checkLegoConflict(sb, 'eng_for_hin', 'उसका नाम', 'her name', 21)
    expect(r.conflict).toBe('zut')
    expect(isDedupConflict(r)).toBe(false)
  })

  it('is licensed once the two-voice rows exist, and dedups to the existing LEGO', async () => {
    const sb = makeSupabase({ legos: existing, expansions: [PAIR] })
    const r = await checkLegoConflict(sb, 'eng_for_hin', 'उसका नाम', 'her name', 21)
    expect(r.conflict).toBe('licensed_variant')
    expect(r.legoId).toBe('S0020L01')
    // Treated the way a duplicate is: link, never insert a second LEGO.
    expect(isDedupConflict(r)).toBe(true)
  })

  it('licenses in either direction — female stored first, male submitted', async () => {
    const sb = makeSupabase({
      legos: [lego({ seed_number: 20, known_text: 'उसका नाम', target_text: 'her name' })],
      expansions: [PAIR],
    })
    const r = await checkLegoConflict(sb, 'eng_for_hin', 'उसका नाम', 'his name', 21)
    expect(r.conflict).toBe('licensed_variant')
  })
})

describe('what the licence must NOT loosen', () => {
  it('a third, unrelated target still collides even though a pair is stored', async () => {
    const sb = makeSupabase({
      legos: [lego({ seed_number: 20, known_text: 'उसका नाम', target_text: 'his name' })],
      expansions: [PAIR],
    })
    const r = await checkLegoConflict(sb, 'eng_for_hin', 'उसका नाम', 'their name', 21)
    expect(r.conflict).toBe('zut')
  })

  it('an ordinary heterogeneous collision is untouched by a course full of pairs', async () => {
    const sb = makeSupabase({
      legos: [lego({ seed_number: 5, known_text: 'मैं सोचता हूँ', target_text: 'I think' })],
      expansions: [PAIR],
    })
    const r = await checkLegoConflict(sb, 'eng_for_hin', 'मैं सोचता हूँ', 'I reckon', 30)
    expect(r.conflict).toBe('zut')
  })

  it('known-side rows never license anything — they are the opposite axis', async () => {
    // eng_for_hin holds ~2,500 text_side='known' rows that vary the SPEAKER's gender
    // in the Hindi cue. They must not grant a licence on the target side.
    const knownAxis = { course_code: 'eng_for_hin', text_side: 'known', language: 'hin',
                        original_text: 'x', expanded_f: 'her name', expanded_m: 'his name' }
    const sb = makeSupabase({
      legos: [lego({ seed_number: 20, known_text: 'उसका नाम', target_text: 'his name' })],
      expansions: [knownAxis],
    })
    expect(sb._calls.expansionFilters).toEqual([])
    const r = await checkLegoConflict(sb, 'eng_for_hin', 'उसका नाम', 'her name', 21)
    expect(r.conflict).toBe('zut')
    expect(sb._calls.expansionFilters[0].text_side).toBe('target')
  })

  it('another course\'s pair grants nothing — the licence is course-scoped', async () => {
    const sb = makeSupabase({
      legos: [lego({ course_code: 'eng_for_urd', seed_number: 20, known_text: 'اس کا نام', target_text: 'his name' })],
      expansions: [PAIR],
    })
    const r = await checkLegoConflict(sb, 'eng_for_urd', 'اس کا نام', 'her name', 21)
    expect(r.conflict).toBe('zut')
  })

  it('a course with no expansions at all behaves exactly as before', async () => {
    const sb = makeSupabase({ legos: [lego({ course_code: 'fra_for_eng', seed_number: 3, known_text: 'to know', target_text: 'savoir' })] })
    const r = await checkLegoConflict(sb, 'fra_for_eng', 'to know', 'connaître', 40)
    expect(r.conflict).toBe('zut')
  })

  it('an exact duplicate is still a duplicate, not a licensed variant', async () => {
    const sb = makeSupabase({
      legos: [lego({ seed_number: 20, known_text: 'उसका नाम', target_text: 'his name' })],
      expansions: [PAIR],
    })
    const r = await checkLegoConflict(sb, 'eng_for_hin', 'उसका नाम', 'his name', 21)
    expect(r.conflict).toBe('duplicate')
  })
})

describe('the phrase layer, which holds phrases out rather than rejecting seeds', () => {
  const existingPhrase = { course_code: 'eng_for_hin', seed_number: 20,
                           known_text: 'उसका नाम', target_text: 'his name' }

  it('holds out the second reading with no stored pair', async () => {
    const sb = makeSupabase({ phrases: [existingPhrase] })
    const c = await checkPhraseZUT(sb, 'eng_for_hin', [{ known: 'उसका नाम', target: 'her name' }], 21)
    expect(c).toHaveLength(1)
  })

  it('lets the licensed pair through', async () => {
    const sb = makeSupabase({ phrases: [existingPhrase], expansions: [PAIR] })
    const c = await checkPhraseZUT(sb, 'eng_for_hin', [{ known: 'उसका नाम', target: 'her name' }], 21)
    expect(c).toEqual([])
  })

  it('still holds out a genuinely different answer for the same prompt', async () => {
    const sb = makeSupabase({ phrases: [existingPhrase], expansions: [PAIR] })
    const c = await checkPhraseZUT(sb, 'eng_for_hin', [{ known: 'उसका नाम', target: 'the name' }], 21)
    expect(c).toHaveLength(1)
  })
})

describe('the licence set itself', () => {
  it('ignores a degenerate pair where both readings are the same string', async () => {
    const sb = makeSupabase({ expansions: [{ ...PAIR, expanded_f: 'his name' }] })
    const licence = await loadGenderVariantLicence(sb, 'eng_for_hin')
    expect(licence.size).toBe(0)
  })

  it('ignores half-written rows', async () => {
    const sb = makeSupabase({ expansions: [{ ...PAIR, expanded_f: null }] })
    expect((await loadGenderVariantLicence(sb, 'eng_for_hin')).size).toBe(0)
  })

  it('grants nothing when the table cannot be read — ZUT stays strict', async () => {
    const sb = { from: () => ({ select: () => ({ in: () => ({ eq: () => Promise.resolve({ data: null, error: { message: 'boom' } }) }) }) }) }
    expect((await loadGenderVariantLicence(sb, 'eng_for_hin')).size).toBe(0)
  })

  it('is order-independent and never matches a target against itself', async () => {
    const sb = makeSupabase({ expansions: [PAIR] })
    const l = await loadGenderVariantLicence(sb, 'eng_for_hin')
    expect(isLicensedGenderVariant(l, 'her name', 'his name')).toBe(true)
    expect(isLicensedGenderVariant(l, 'his name', 'her name')).toBe(true)
    expect(isLicensedGenderVariant(l, 'his name', 'his name')).toBe(false)
    expect(isLicensedGenderVariant(l, 'his name', 'her bag')).toBe(false)
  })
})
