/**
 * The gendered-known plan builder (Kai's design, 2026-09-23; #883·H).
 * Run: npx vitest run services/known-gender/gendered-known-plan
 */
import { describe, it, expect } from 'vitest'
const { buildGenderedKnownPlan } = require('./gendered-known-plan.cjs')

const C = 'eng_for_hin'
const pairs = [
  { expanded_m: 'मैं बात करना चाहता हूँ।', expanded_f: 'मैं बात करना चाहती हूँ।', text_side: 'known' },
  { expanded_m: 'चाहता हूँ', expanded_f: 'चाहती हूँ', text_side: 'known' },
  { expanded_m: 'बात करना चाहता हूँ', expanded_f: 'बात करना चाहती हूँ', text_side: 'known' },
  { expanded_m: 'मैं अब आपके साथ अंग्रेज़ी में बात करना चाहता हूँ।', expanded_f: 'मैं अब आपके साथ अंग्रेज़ी में बात करना चाहती हूँ।', text_side: 'known' },
]
const seeds = [{ seed_id: 'S0001', seed_number: 1, known_text: 'मैं अब आपके साथ अंग्रेज़ी में बात करना चाहता हूँ।', target_text: 'I want to speak English with you now' }]
const legos = [
  { lego_id: 'S0001L01', seed_number: 1, lego_index: 1, known_text: 'मैं', target_text: 'I' },
  { lego_id: 'S0001L02', seed_number: 1, lego_index: 2, known_text: 'चाहता हूँ', target_text: 'want' },
  { lego_id: 'S0001L03', seed_number: 1, lego_index: 3, known_text: 'अंग्रेज़ी में', target_text: 'English' },
]
const phrases = [
  { id: `${C}:S0001L01C01`, seed_number: 1, lego_index: 1, position: 1, phrase_role: 'component', known_text: 'चाहता हूँ', target_text: 'want' },
  { id: `${C}:S0001L02B01`, seed_number: 1, lego_index: 2, position: 1, phrase_role: 'build', known_text: 'बात करना चाहता हूँ', target_text: 'want to speak' },
  { id: `${C}:S0001L02U01`, seed_number: 1, lego_index: 2, position: 2, phrase_role: 'use', known_text: 'मैं बात करना चाहता हूँ।', target_text: 'I want to speak' },
  // the female counterpart of U01 already authored (Shuchita's proofreading) — no sibling wanted
  { id: `${C}:S0001L02U02`, seed_number: 1, lego_index: 2, position: 3, phrase_role: 'use', known_text: 'मैं बात करना चाहती हूँ।', target_text: 'I want to speak' },
  { id: `${C}:S0001L03U01`, seed_number: 1, lego_index: 3, position: 1, phrase_role: 'use', known_text: 'क्या आप अंग्रेज़ी में बात करते हैं?', target_text: 'do you speak English?' },
]

describe('buildGenderedKnownPlan', () => {
  const plan = buildGenderedKnownPlan({ courseCode: C, seeds, legos, phrases, pairs })

  it('assigns a gender to every row, pair-bound where the grammar moves and hash-split otherwise', () => {
    expect(plan.assignments.length).toBe(seeds.length + legos.length + phrases.length)
    const byId = Object.fromEntries(plan.assignments.map(a => [a.id, a]))
    expect(byId['S0001L02']).toMatchObject({ gender: 'm', source: 'pair' })
    expect(byId[`${C}:S0001L02U02`]).toMatchObject({ gender: 'f', source: 'pair' })
    expect(byId['S0001L03'].source).toBe('hash')
    expect(plan.counts.genderedRows).toBe(6) // seed, L02, C01, B01, U01, U02
  })

  it('adds one sibling per gendered phrase, same LEGO, same role, same target, next free id and position', () => {
    const b = plan.siblings.find(s => s.metadata.gender_variant_of === `${C}:S0001L02B01`)
    expect(b).toMatchObject({ id: `${C}:S0001L02B02`, phrase_role: 'build', known_text: 'बात करना चाहती हूँ', target_text: 'want to speak', known_gender: 'f', seed_number: 1, lego_index: 2 })
    expect(b.position).toBe(4) // max position under L02 was 3
  })

  it('does NOT add a sibling whose counterpart is already authored, and says so', () => {
    expect(plan.siblings.find(s => s.metadata.gender_variant_of === `${C}:S0001L02U01`)).toBeUndefined()
    expect(plan.skipped.find(s => s.originId === `${C}:S0001L02U01`)).toMatchObject({ reason: 'counterpart already authored' })
    // both halves of the authored pair are "already there" — U01's counterpart is U02 and vice versa
    expect(plan.skipped.find(s => s.originId === `${C}:S0001L02U02`)).toMatchObject({ reason: 'counterpart already authored' })
    expect(plan.counts.siblingsSkippedExisting).toBe(2)
  })

  it('never pairs a component phrase', () => {
    expect(plan.siblings.find(s => s.metadata.gender_variant_of === `${C}:S0001L01C01`)).toBeUndefined()
  })

  it('a gendered LEGO keeps ONE LEGO and gets its counterpart as a marked BUILD phrase under it', () => {
    const l = plan.siblings.find(s => s.metadata.gender_variant_of === 'S0001L02')
    expect(l).toMatchObject({ phrase_role: 'build', known_text: 'चाहती हूँ', target_text: 'want', known_gender: 'f', lego_index: 2 })
    expect(l.metadata.gender_variant_kind).toBe('lego')
    expect(l.id).toBe(`${C}:S0001L02B03`) // B02 went to the phrase sibling above
    expect(l.position).toBe(5)
  })

  it('a gendered seed gets its counterpart as a USE phrase under the seed\'s last LEGO', () => {
    const s = plan.siblings.find(x => x.metadata.gender_variant_of === 'S0001')
    expect(s).toMatchObject({ phrase_role: 'use', lego_index: 3, known_text: 'मैं अब आपके साथ अंग्रेज़ी में बात करना चाहती हूँ।', known_gender: 'f' })
    expect(s.id).toBe(`${C}:S0001L03U02`)
  })

  it('counts render work over DISTINCT texts and separates the sibling share', () => {
    expect(plan.render.clipsTotal).toBe(plan.render.clips.m + plan.render.clips.f)
    expect(plan.render.siblingClips).toBe(plan.siblings.length)
    expect(plan.render.siblingChars).toBe(plan.siblings.reduce((n, s) => n + s.known_text.length, 0))
    // 'चाहता हूँ' sits on L02 and on C01: one clip, not two
    const male = plan.assignments.filter(a => a.known_text === 'चाहता हूँ')
    expect(male.length).toBe(2)
  })

  it('is deterministic — the same inputs give the same plan', () => {
    const again = buildGenderedKnownPlan({ courseCode: C, seeds, legos, phrases, pairs })
    expect(again).toEqual(plan)
  })

  it('with no stored pairs nothing is gendered and no sibling is planned, but every row still gets a voice', () => {
    const none = buildGenderedKnownPlan({ courseCode: C, seeds, legos, phrases, pairs: [] })
    expect(none.siblings).toEqual([])
    expect(none.counts.genderedRows).toBe(0)
    expect(none.counts.byGender.m + none.counts.byGender.f).toBe(none.assignments.length)
  })
})
