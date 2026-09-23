/**
 * The gendered-known plan builder — two known voices, one form per phrase
 * (Kai's rulings 2026-09-23 20:13Z / 20:23Z; job #941·H).
 * Run: npx vitest run services/known-gender/gendered-known-plan
 */
import { describe, it, expect } from 'vitest'
const { buildGenderedKnownPlan, balancedGenderSplit, coinForId, MAX_RUN } = require('./gendered-known-plan.cjs')

const C = 'eng_for_hin'
const pairs = [
  { expanded_m: 'मैं बात करना चाहता हूँ।', expanded_f: 'मैं बात करना चाहती हूँ।' },
  { expanded_m: 'चाहता हूँ', expanded_f: 'चाहती हूँ' },
  { expanded_m: 'बात करना चाहता हूँ', expanded_f: 'बात करना चाहती हूँ' },
  { expanded_m: 'मैं अब आपके साथ अंग्रेज़ी में बात करना चाहता हूँ।', expanded_f: 'मैं अब आपके साथ अंग्रेज़ी में बात करना चाहती हूँ।' },
  { expanded_m: 'मैं सीखना चाहता हूँ।', expanded_f: 'मैं सीखना चाहती हूँ।' },
  { expanded_m: 'मैं अब सीखना चाहता हूँ।', expanded_f: 'मैं अब सीखना चाहती हूँ।' },
  { expanded_m: 'मैं यहाँ सीखना चाहता हूँ।', expanded_f: 'मैं यहाँ सीखना चाहती हूँ।' },
  { expanded_m: 'मैं कल सीखना चाहता हूँ।', expanded_f: 'मैं कल सीखना चाहती हूँ।' },
  { expanded_m: 'मैं आज सीखना चाहता हूँ।', expanded_f: 'मैं आज सीखना चाहती हूँ।' },
  { expanded_m: 'मैं और सीखना चाहता हूँ।', expanded_f: 'मैं और सीखना चाहती हूँ।' },
  { expanded_m: 'चाहता', expanded_f: 'चाहती' },
]
const seeds = [
  { seed_id: 'S0001', seed_number: 1, known_text: 'मैं अब आपके साथ अंग्रेज़ी में बात करना चाहता हूँ।', target_text: 'I want to speak English with you now' },
  { seed_id: 'S0002', seed_number: 2, known_text: 'यह अच्छा है।', target_text: 'it is good' },
]
const legos = [
  { lego_id: 'S0001L01', seed_number: 1, lego_index: 1, known_text: 'मैं', target_text: 'I' },
  { lego_id: 'S0001L02', seed_number: 1, lego_index: 2, known_text: 'चाहता हूँ', target_text: 'want' },
  { lego_id: 'S0001L03', seed_number: 1, lego_index: 3, known_text: 'अंग्रेज़ी में', target_text: 'English' },
]
const ph = (id, seed, li, role, pos, known, target, metadata = null) => ({ id: `${C}:${id}`, seed_number: seed, lego_index: li, position: pos, phrase_role: role, known_text: known, target_text: target, metadata })
const phrases = [
  ph('S0001L02B01', 1, 2, 'build', 1, 'बात करना चाहता हूँ', 'want to speak'),
  ph('S0001L02B02', 1, 2, 'build', 2, 'अच्छा है', 'is good'),
  ph('S0001L02U01', 1, 2, 'use', 1, 'मैं बात करना चाहता हूँ।', 'I want to speak'),
  ph('S0001L02U02', 1, 2, 'use', 2, 'मैं सीखना चाहता हूँ।', 'I want to learn'),
  ph('S0001L02U03', 1, 2, 'use', 3, 'मैं अब सीखना चाहता हूँ।', 'I want to learn now'),
  ph('S0001L02U04', 1, 2, 'use', 4, 'मैं यहाँ सीखना चाहता हूँ।', 'I want to learn here'),
  ph('S0001L02U05', 1, 2, 'use', 5, 'मैं कल सीखना चाहता हूँ।', 'I want to learn tomorrow'),
  ph('S0001L02U06', 1, 2, 'use', 6, 'मैं आज सीखना चाहता हूँ।', 'I want to learn today'),
  ph('S0001L02U07', 1, 2, 'use', 7, 'मैं और सीखना चाहता हूँ।', 'I want to learn more'),
  ph('S0001L02C01', 1, 2, 'component', 1, 'चाहता', 'want-'),
]

const plan = () => buildGenderedKnownPlan({ courseCode: C, seeds, legos, phrases, pairs })

describe('balancedGenderSplit', () => {
  it('is deterministic, keyed on the id, and never runs past MAX_RUN', () => {
    const items = Array.from({ length: 400 }, (_, i) => ({ id: `${C}:S0001L01U${String(i).padStart(2, '0')}` }))
    const a = balancedGenderSplit(items, { salt: C }), b = balancedGenderSplit(items, { salt: C })
    expect([...a.entries()]).toEqual([...b.entries()])
    let run = 0, last = null, longest = 0
    for (const it of items) { const g = a.get(it.id); if (g === last) run++; else { run = 1; last = g }; longest = Math.max(longest, run) }
    expect(longest).toBeLessThanOrEqual(MAX_RUN)
    const m = [...a.values()].filter(g => g === 'm').length
    expect(Math.abs(m - (400 - m))).toBeLessThanOrEqual(2) // balanced within the seed
  })
  it('honours a stamped side and never flips it, even when that breaks the run cap', () => {
    const items = [{ id: 'a', fixed: 'm' }, { id: 'b', fixed: 'm' }, { id: 'c', fixed: 'm' }, { id: 'd' }]
    const s = balancedGenderSplit(items, { salt: C })
    expect([s.get('a'), s.get('b'), s.get('c')]).toEqual(['m', 'm', 'm'])
    expect(s.get('d')).toBe('f') // the next free row goes the other way
  })
  it('the coin is a pure function of salt and id', () => {
    expect(coinForId('x', C)).toBe(coinForId('x', C))
    const flips = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(id => coinForId(id, C))
    expect(new Set(flips).size).toBe(2) // both sides occur
  })
})

describe('buildGenderedKnownPlan — one form per phrase', () => {
  it('assigns every gendered practice phrase exactly one side, rewrites the ones on the other side, and adds NO rows', () => {
    const p = plan()
    expect(p.counts.genderedRows.phrase).toBe(8)
    expect(p.phraseAssignments).toHaveLength(8)
    expect(p.siblings).toBeUndefined()
    for (const a of p.phraseAssignments) {
      expect(['m', 'f']).toContain(a.gender)
      if (a.gender === 'm') expect(a.to).toBe(a.from) // the course is authored male
      else expect(a.to).not.toBe(a.from)
      expect(a.rewrite).toBe(a.gender === 'f')
    }
    expect(p.counts.rewrites.phrase).toBe(p.counts.split.phrase.f)
    expect(p.counts.longestRun).toBeLessThanOrEqual(MAX_RUN)
  })
  it('a rewritten form is the STORED female form of the pair, never new Hindi', () => {
    const p = plan()
    const stored = new Set(pairs.map(x => x.expanded_f))
    for (const a of p.phraseAssignments.filter(x => x.rewrite)) expect(stored.has(a.to)).toBe(true)
  })
  it('components are gendered but never rewritten (they reach the learner as tiles only)', () => {
    const p = plan()
    expect(p.counts.genderedRows.component).toBe(1)
    expect(p.phraseAssignments.find(a => a.id.endsWith('C01'))).toBeUndefined()
  })
  it('a row already stamped keeps its side on a re-run — the side never moves', () => {
    const stamped = phrases.map(x => x.id.endsWith('U02') ? { ...x, metadata: { known_gender: 'm' } } : x)
    const p = buildGenderedKnownPlan({ courseCode: C, seeds, legos, phrases: stamped, pairs })
    const a = p.phraseAssignments.find(x => x.id.endsWith('U02'))
    expect(a.gender).toBe('m'); expect(a.stamped_already).toBe(true); expect(a.rewrite).toBe(false)
    expect(p.counts.stampedAlready).toBe(1)
  })
  it('gendered LEGO debuts flip to the female form and carry both forms for the intro', () => {
    const p = plan()
    expect(p.legoFlips).toEqual([{ lego_id: 'S0001L02', seed_number: 1, lego_index: 2, from: 'चाहता हूँ', to: 'चाहती हूँ', target_text: 'want' }])
    expect(p.presentations).toEqual([{ lego_id: 'S0001L02', seed_number: 1, target_text: 'want', f: 'चाहती हूँ', m: 'चाहता हूँ', debut: 'चाहती हूँ' }])
  })
  it('refuses a LEGO flip that would collide with another LEGO (ZUT)', () => {
    const legos2 = [...legos, { lego_id: 'S0002L01', seed_number: 2, lego_index: 1, known_text: 'चाहती हूँ', target_text: 'she wants' }]
    const p = buildGenderedKnownPlan({ courseCode: C, seeds, legos: legos2, phrases, pairs })
    expect(p.counts.legoFlips).toBe(0); expect(p.counts.legoFlipsRefusedZut).toBe(1)
  })
  it('refuses a phrase rewrite whose new form already means something else in the course', () => {
    const phrases2 = [...phrases, ph('S0002L01U01', 2, 1, 'use', 1, 'मैं सीखना चाहती हूँ।', 'she wants me to learn')]
    const pairs2 = pairs.filter(x => x.expanded_m !== 'मैं सीखना चाहता हूँ।') // make that female text neutral so it can sit there
    const p = buildGenderedKnownPlan({ courseCode: C, seeds, legos, phrases: phrases2, pairs: [...pairs2, { expanded_m: 'मैं सीखना चाहता हूँ।', expanded_f: 'मैं सीखना चाहती हूँ।' }] })
    const a = p.phraseAssignments.find(x => x.id.endsWith('S0001L02U02'))
    if (a.gender === 'm' && coinForId(a.id, C) === 'f') {
      expect(p.counts.rewritesRefusedZut).toBeGreaterThan(0)
      expect(a.rewrite).toBe(false)
    }
    // whatever the coin says, the plan never produces a known text with two targets
    const seen = new Map()
    for (const x of p.phraseAssignments) { const t = seen.get(x.to); if (t) expect(t).toBe(x.target_text); seen.set(x.to, x.target_text) }
  })
  it('gendered seed lines are split by coin, half and half, and the rewrite is the stored form', () => {
    const p = plan()
    expect(p.seedAssignments).toHaveLength(1)
    const s = p.seedAssignments[0]
    expect(s.gender).toBe(coinForId('S0001', C))
    expect(s.rewrite).toBe(s.gender === 'f')
    if (s.rewrite) expect(s.to).toBe('मैं अब आपके साथ अंग्रेज़ी में बात करना चाहती हूँ।')
  })
  it('collapses a doubled phrase (both forms as two rows, same target) to the lowest id', () => {
    const doubled = [...phrases, ph('S0001L02U08', 1, 2, 'use', 8, 'मैं बात करना चाहती हूँ।', 'I want to speak')]
    const p = buildGenderedKnownPlan({ courseCode: C, seeds, legos, phrases: doubled, pairs })
    expect(p.collapses).toEqual([expect.objectContaining({ keep: `${C}:S0001L02U01`, drop: `${C}:S0001L02U08` })])
    expect(p.phraseAssignments.find(a => a.id.endsWith('U08'))).toBeUndefined()
    expect(p.counts.collapsed).toBe(1)
  })
  it('after the plan the voice follows the text: every gendered row resolves to the side it was assigned', () => {
    const p = plan()
    const byId = new Map(p.assignments.map(a => [a.id, a]))
    for (const a of p.phraseAssignments) {
      const v = byId.get(a.id)
      expect(v.source).toBe('pair'); expect(v.gender).toBe(a.gender)
    }
    const lego = byId.get('S0001L02')
    expect(lego.gender).toBe('f'); expect(lego.source).toBe('pair')
    expect(byId.get('S0001L03').source).toBe('anchor') // neutral LEGO line stays female
    expect(byId.get(`${C}:S0001L02B02`).source).toBe('hash') // neutral phrase hash-split
  })
  it('the render estimate counts one clip per distinct text after the rewrite', () => {
    const p = plan()
    const texts = new Set(p.assignments.map(a => a.known_text.normalize('NFC').toLowerCase().trim().replace(/[.?!,।]+$/u, '')))
    expect(p.render.clipsTotal).toBe(texts.size)
    expect(p.render.charsTotal).toBeGreaterThan(0)
  })
})
