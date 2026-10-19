/*
 * Each check must FIRE on the defect it is for and stay QUIET on the look-alike that is not one. The look-alikes are
 * the ones found by hand-reading ita_for_eng on 2026-10-19 (job #176); every quiet case below was a false hit once.
 *
 * Run: npx vitest run tools/qa/quality-census
 */
import { describe, it, expect } from 'vitest'

const { CHECKS, secondSentence, offScript, otherLanguageWords, capitalisation, duplicates, lengthMismatch, seedPlacement, thinBaskets, zut } = require('./checks.cjs')
const { calibrate } = require('./calibrate.cjs')

const C = Object.fromEntries(CHECKS.map((c) => [c.id, c]))
let n = 0
const course = 'ita_for_eng'
const snap = ({ seeds = [], legos = [], phrases = [] } = {}, over = {}) => ({ course, known_lang: 'eng', target_lang: 'ita', seeds, legos, phrases, ...over })
const lego = (seed, idx, k, t, extra = {}) => ({ lego_id: `S${String(seed).padStart(4, '0')}L${String(idx).padStart(2, '0')}`, seed_number: seed, lego_index: idx, type: 'M', is_new: true, known_text: k, target_text: t, components: null, ...extra })
const phrase = (seed, idx, role, k, t, extra = {}) => ({ id: `${course}:S${String(seed).padStart(4, '0')}L${String(idx).padStart(2, '0')}${role === 'build' ? 'B' : role === 'component' ? 'C' : 'U'}${String(++n).padStart(2, '0')}`, seed_number: seed, lego_index: idx, phrase_role: role, known_text: k, target_text: t, metadata: {}, ...extra })
const seed = (s, k, t) => ({ seed_number: s, seed_id: `S${String(s).padStart(4, '0')}`, known_text: k, target_text: t })

describe('C05 more than one sentence', () => {
  it('fires on dialogue in the lowercase house style the recipe missed', () => {
    expect(secondSentence('who was that? An old man')).toBeTruthy()
    expect(secondSentence('are you thirsty? would you like something to drink?')).toBeTruthy()
  })
  it('stays quiet on an ellipsis and an abbreviation', () => {
    expect(secondSentence('well... I don\'t know')).toBeNull()
    expect(secondSentence('I saw Mr. Smith')).toBeNull()
  })
})

describe('C03/C04 wrong language', () => {
  it('fires on a foreign script and on an English-only word in Italian', () => {
    expect(offScript('voglio il флангия', 'ita')).toBeTruthy()
    expect(otherLanguageWords('voglio the libro', 'eng')).toBeTruthy()
  })
  it('stays quiet on Italian words that look English (do, come, a, fine)', () => {
    expect(otherLanguageWords('come stai? a che ora è la fine', 'eng')).toBeNull()
  })
  it('a Latin name inside a CJK sentence is not wrong-script', () => {
    expect(offScript('我叫Tom', 'zho')).toBeNull()
    expect(offScript('I want', 'zho')).toBeTruthy()
  })
})

describe('C10 ZUT', () => {
  it('names every side of a collision (Kai, C7: we do not know which half is bad)', () => {
    const s = snap({ legos: [lego(112, 1, 'it was', 'era'), lego(219, 1, 'it was', 'è stato')] })
    const [h] = zut(s)
    expect(h.bucket).toBe('lego')
    expect(h.group.map((g) => g.ref)).toEqual(['S0112L01', 'S0219L01'])
  })
  it('an -o/-a ending pair is bucketed as a variant (K5), not counted as a hard clash', () => {
    const s = snap({ legos: [lego(270, 1, 'worried', 'preoccupato')], phrases: [phrase(343, 1, 'build', 'worried', 'preoccupata')] })
    expect(zut(s)[0].bucket).toBe('ending-variant')
  })
})

describe('C13 capitalisation', () => {
  it('a capital after a full stop is a sentence start, not proof of a name (the #883·I known positive)', () => {
    // Before the fix "non ti aspetto. Perché no?" taught the check that "Perché" is a name, and "Perché no?" passed.
    const lower = Array.from({ length: 10 }, (_, i) => phrase(1, 1, 'use', `row ${i}`, `riga ${i}`))
    const s = snap({ phrases: [...lower, phrase(82, 2, 'use', "I'm not going to wait. why not?", 'non ti aspetto. Perché no?'), phrase(82, 2, 'use', 'why not?', 'Perché no?')] })
    expect(capitalisation(s).some((h) => h.bucket === 'target-first-letter' && h.target === 'Perché no?')).toBe(true)
  })
  it('a name seen capitalised mid-sentence is left alone', () => {
    const lower = Array.from({ length: 10 }, (_, i) => phrase(1, 1, 'use', `row ${i}`, `riga ${i}`))
    const s = snap({ phrases: [...lower, phrase(5, 1, 'use', 'I like Jane', 'mi piace Jane'), phrase(5, 1, 'use', 'Jane is here', 'Jane è qui')] })
    expect(capitalisation(s).filter((h) => /first-letter/.test(h.bucket))).toEqual([])
  })
})

describe('C16 thin baskets', () => {
  it('the bare LEGO repeated as a phrase is not practice (P30)', () => {
    const s = snap({ legos: [lego(1, 1, 'I want', 'voglio')], phrases: [phrase(1, 1, 'build', 'I want', 'voglio')] })
    expect(thinBaskets(s)[0].bucket).toBe('unpractised')
  })
  it('a not-new LEGO needs no phrases', () => {
    expect(thinBaskets(snap({ legos: [lego(1, 1, 'I want', 'voglio', { is_new: false })] }))).toEqual([])
  })
})

describe('DUP duplicate LEGOs', () => {
  it('both sides matching an earlier new LEGO is a duplicate', () => {
    const s = snap({ legos: [lego(20, 1, 'you want', 'vuoi'), lego(171, 1, 'you want', 'vuoi')] })
    expect(duplicates(s).map((h) => [h.ref, h.bucket])).toEqual([['S0171L01', 'duplicate-new']])
  })
  it('same English under different Italian is NOT a duplicate (Kai 2026-09-23)', () => {
    const s = snap({ legos: [lego(20, 1, 'you want', 'vuoi'), lego(171, 1, 'you want', 'vuole')] })
    expect(duplicates(s)).toEqual([])
  })
})

describe('LEN length mismatch', () => {
  const base = Array.from({ length: 40 }, (_, i) => phrase(10 + i, 1, 'use', `I want to speak Italian now ${i}`, `voglio parlare italiano adesso ${i}`))
  it('counts letters, so Italian clitic packing is not a mismatch', () => {
    const s = snap({ phrases: [...base, phrase(241, 1, 'build', 'I want to give it to him', 'voglio darglielo')] })
    expect(lengthMismatch(s).map((h) => h.target)).not.toContain('voglio darglielo')
  })
  it('fires on a truncated English side (seed 407, read real 2026-10-19)', () => {
    const s = snap({ phrases: [...base, phrase(407, 1, 'build', 'to set', 'dare un buon esempio')] })
    expect(lengthMismatch(s).map((h) => h.target)).toContain('dare un buon esempio')
  })
})

describe('P26 seed sentence in a played basket', () => {
  it('a seed sentence only under a NOT-new LEGO is missing (P25)', () => {
    const s = snap({ seeds: [seed(5, 'I want it', 'lo voglio')], legos: [lego(5, 1, 'I want it', 'lo voglio', { is_new: false })], phrases: [phrase(5, 1, 'use', 'I want it', 'lo voglio')] })
    expect(seedPlacement(s).map((h) => h.bucket)).toEqual(['missing'])
  })
  it('unspaced scripts match by characters, and a big course stays fast (the old DB join hit the 5 s cap on zho/jpn/kor)', () => {
    const seeds = [], legos = [], phrases = []
    for (let i = 1; i <= 700; i++) {
      seeds.push(seed(i, `sentence ${i}`, `我想说${i}`)); legos.push(lego(i, 1, `piece ${i}`, `说${i}`))
      for (let j = 0; j < 25; j++) phrases.push(phrase(i, 1, 'use', `sentence ${i}${j ? ` v${j}` : ''}`, j ? `我想说${i}吧${j}` : `我 想 说${i}。`))
    }
    const s = snap({ seeds, legos, phrases }, { course: 'zho_for_eng', target_lang: 'zho' })
    const t = Date.now()
    expect(seedPlacement(s).filter((h) => h.bucket === 'missing')).toEqual([])
    expect(Date.now() - t).toBeLessThan(3000)
  })
})

describe('calibration harness', () => {
  it('every check catches its own nonsense plant on a small real-shaped course', () => {
    const legos = [lego(20, 1, 'you want', 'vuoi'), lego(49, 2, 'it is', 'è'), lego(82, 2, 'why not', 'perché no'), lego(100, 1, 'today', 'oggi'), lego(310, 2, 'he said', 'ha detto'), lego(313, 1, 'he could', 'poteva'),
      lego(190, 1, 'do you mind if', 'ti dispiace se', { components: [{ known: 'do you mind', target: 'ti dispiace' }] })]
    for (const [later] of require('./known-positives.cjs').DUPLICATES_639) legos.push(lego(+later.slice(1, 5), +later.slice(6, 8), `dup ${later}`, `dup ${later}`, { lego_id: later, is_new: false }))
    const s = snap({ seeds: [seed(100, 'today', 'oggi')], legos, phrases: [phrase(100, 1, 'use', 'today', 'oggi'), phrase(190, 1, 'use', 'do you mind if I go', 'ti dispiace se vado')] })
    const res = calibrate(s)
    expect(res.nonsense.filter((x) => x.planted && !x.caught)).toEqual([])
  })
})
