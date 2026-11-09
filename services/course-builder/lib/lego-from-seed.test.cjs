// Pins the LEGO-from-seed gate to the real fry_for_eng rows it was calibrated on (job #486, 9 Nov 2026).
// Run alone: npx vitest run services/course-builder/lib/lego-from-seed.test.cjs
const { describe, it, expect } = require('vitest')
const { legoWordsNotFromSeed, checkLegosFromSeed } = require('./lego-from-seed.cjs')

const miss = (lego, seed) => legoWordsNotFromSeed(lego, seed).unmatched

describe('legoWordsNotFromSeed — the defects Kai ruled on', () => {
  it('a pronoun put in for the seed noun fails (S0519L02, S0553L03, S0573L03)', () => {
    expect(miss('ik haw se noch net sjoen', 'Ik haw harren nije poppe noch net sjoen.')).toEqual(['se'])
    expect(miss('ik fyn it hiel ûnsjoch', 'Ik fyn de lytse tsjerke hiel ûnsjoch.')).toEqual(['it'])
    expect(miss('dat it hiel bysûnder makket', 'It is it soarte ding dat de fakânsje hiel bysûnder makket.')).toEqual(['it'])
  })
  it('a reordering the seed does not say fails (S0535L04)', () => {
    expect(miss('dat er it net kieze soe', 'Hy ûnthjitte dat er net it ferkearde wurk kieze soe')).toEqual(['net'])
  })
  it('a clitic split off its conjunction fails (S0521L01)', () => {
    expect(miss('ik bin benaud dat', 'Ik bin benaud datstû ferjitte silst wêrom\'t wy hjir bliuwe moasten.')).toEqual(['dat'])
  })
})

describe('legoWordsNotFromSeed — legitimate cuts pass', () => {
  it('the re-cuts applied by #486', () => {
    expect(miss('dat er net kieze soe', 'Hy ûnthjitte dat er net it ferkearde wurk kieze soe')).toEqual([])
    expect(miss('dat de fakânsje makket', 'It is it soarte ding dat de fakânsje hiel bysûnder makket.')).toEqual([])
    expect(miss('fan it stasjon fuortgean', 'Ik seach de lêste bus fan it stasjon fuortgean.')).toEqual([])
  })
  it('the stage-1 split shape (a gap over a piece another LEGO teaches)', () => {
    expect(miss('ik hie it net sein', 'Ik hie it net op krekt deselde manier sein.')).toEqual([])
  })
  it('verb-second inversion in the seed (S0183L02, S0110L04)', () => {
    expect(miss('ik haw se net sjoen', 'Nee, spitigernôch haw ik se net sjoen.')).toEqual([])
    expect(miss('ik woe graach ûntspanne', 'Wy binne freonen, en nei\'t wy klear binne woe ik graach ûntspanne.')).toEqual([])
  })
  it('the swap is not a loophole: no adjacent inversion in the seed, no pass (S0121L03)', () => {
    expect(miss('datstû it net graach brûkst', 'It is ûngewoan datstû dyn auto net graach brûkst.')).toEqual(['it'])
  })
  it('case and accents fold: seed "Us" vs LEGO "ús" is a spelling question, not a LEGO defect', () => {
    expect(miss('ús freonen', 'Us freonen kamen sawat om seis oere del.')).toEqual([])
  })
  it('spaceless scripts are excluded, never reported clean', () => {
    expect(legoWordsNotFromSeed('我想', '我想学中文').status).toBe('excluded_spaceless')
  })
})

describe('checkLegosFromSeed — blocking scope', () => {
  const legos = [{ idx: 2, known: "I haven't seen them yet", target: 'ik haw se noch net sjoen' }]
  const seed = 'Ik haw harren nije poppe noch net sjoen.'
  it('blocks on fry_for_eng', () => {
    const r = checkLegosFromSeed('fry_for_eng', seed, legos, 'S0519')
    expect(r.blocking).toBe(true)
    expect(r.findings[0]).toMatchObject({ lego_id: 'S0519L02', not_from_seed: ['se'] })
  })
  it('only warns elsewhere', () => {
    expect(checkLegosFromSeed('deu_for_eng', seed, legos, 'S0519').blocking).toBe(false)
  })
})
