import { describe, it, expect } from 'vitest'
const { buildPhraseList, flagRow } = require('./phrase-proof-router.cjs')

const C = 'cym_nv2_for_eng'
const pad = (n) => String(n).padStart(4, '0')
const L = (seed, idx, isNew, cy) => ({ lego_id: `S${pad(seed)}L0${idx}`, seed_number: seed, lego_index: idx, is_new: isNew, target_text: cy })
const P = (seed, idx, pos, role, cy) => ({ id: `${C}:S${pad(seed)}L0${idx}${role === 'use' ? 'U' : 'B'}0${pos}`, seed_number: seed, lego_index: idx, position: pos, phrase_role: role, target_text: cy, known_text: cy + '-en' })

describe('buildPhraseList', () => {
  // Running order puts the HC seed 1003 between old seeds 1 and 12; seed 1002 is dropped (not in the order).
  const order = [{ seed_number: 1, position: 1 }, { seed_number: 1003, position: 2 }, { seed_number: 12, position: 3 }]
  const legos = [L(1, 1, true, 'dw i isio'), L(1003, 1, false, 'taught'), L(1003, 2, true, 'mor aml'), L(12, 1, true, 'hen'), L(1002, 1, true, 'gone')]
  const phrases = [
    P(12, 1, 1, 'build', 'hen 1'),
    P(1003, 2, 2, 'use', 'mor aml 2'), P(1003, 2, 1, 'build', 'mor aml 1'),
    P(1003, 1, 1, 'build', 'under a taught LEGO'),
    P(1002, 1, 1, 'build', 'dropped seed'),
    P(1, 1, 1, 'component', 'a component'),
    P(1, 1, 2, 'build', 'dw i isio siarad'),
  ]

  it('lists only build/use phrases under new LEGOs of seeds that play, in running order then LEGO then position, numbered 1..N', () => {
    const out = buildPhraseList(C, phrases, legos, order, [])
    expect(out.phrases.map((p) => [p.n, p.cy])).toEqual([[1, 'dw i isio siarad'], [2, 'mor aml 1'], [3, 'mor aml 2'], [4, 'hen 1']])
    expect(out.total).toBe(4)
    expect(out.phrases[0].id).toBe('S0001L01B02')              // course prefix stripped
    expect(out.legos.map((l) => l.cy)).toEqual(['dw i isio', 'mor aml', 'hen'])
    expect(out.phrases.map((p) => p.l)).toEqual([0, 1, 1, 2])
  })

  it('carries a saved flag and its note onto its phrase, and nothing onto the rest', () => {
    const out = buildPhraseList(C, phrases, legos, order, [{ phrase_id: `${C}:S1003L02U02`, flagged: true, note: 'mutation' }])
    expect(out.phrases.find((p) => p.id === 'S1003L02U02')).toMatchObject({ flagged: true, note: 'mutation' })
    expect(out.phrases.find((p) => p.id === 'S1003L02B01').flagged).toBeUndefined()
  })
})

describe('flagRow', () => {
  it('adds the course prefix back and records who', () => {
    expect(flagRow(C, { phraseId: 'S0001L02B01', flagged: true, note: ' x ' }, 'aran@hey.com').row)
      .toMatchObject({ course_code: C, phrase_id: `${C}:S0001L02B01`, flagged: true, note: 'x', flagged_by: 'aran@hey.com' })
  })
  it('refuses a bad id, a non-boolean flag, and an anonymous caller', () => {
    expect(flagRow(C, { phraseId: 'cym_nv2_for_eng:S0001L02B01', flagged: true }, 'a').error).toMatch(/phraseId/)
    expect(flagRow(C, { phraseId: 'S0001L02B01', flagged: 'yes' }, 'a').error).toMatch(/flagged/)
    expect(flagRow(C, { phraseId: 'S0001L02B01', flagged: true }, null).status).toBe(401)
  })
})
