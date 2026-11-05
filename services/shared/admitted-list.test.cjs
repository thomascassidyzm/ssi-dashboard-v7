// The admitted list (Tom, r-2026-11-05): "phrases for LEGO S0248L03 can use ONLY Japanese SEEDS
// up to S0247 plus LEGOS S0248L01 and S0248L02". These fixtures are that example, on both sides,
// for a no-space target (jpn), a spaced target (kor) and a no-space KNOWN language (eng_for_jpn).
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const A = require('./admitted-list.cjs')

// jpn_for_eng, S0248L03-style. Seeds 246/247 admitted; S0248L01/L02 admitted; S0248L03 is the LEGO;
// S0248L04 and seed 248's own sentence are NOT admitted.
const jpn = {
  course: 'jpn_for_eng',
  seeds: [
    { seed_number: 246, known_text: 'she is coming tomorrow', target_text: '彼女は明日来る' },
    { seed_number: 247, known_text: 'I want to go', target_text: '行きたい' },
    { seed_number: 248, known_text: 'she said she is coming tomorrow', target_text: '彼女は明日来るって言ってた' },
  ],
  legos: [
    { seed_number: 247, lego_index: 1, known_text: 'I want to go', target_text: '行きたい' },
    { seed_number: 248, lego_index: 1, known_text: 'she', target_text: '彼女は' },
    { seed_number: 248, lego_index: 2, known_text: 'tomorrow', target_text: '明日' },
    { seed_number: 248, lego_index: 3, known_text: 'is coming', target_text: '来る' },
    { seed_number: 248, lego_index: 4, known_text: 'she said', target_text: 'って言ってた' },
  ],
  components: [],
}
const admJpn = A.admittedList({ ...jpn, seedNumber: 248, legoIndex: 3 })

describe('admittedList: seeds < N, LEGOs before S<N>L<L>, the LEGO, nothing else', () => {
  it('builds the S0248L03 window', () => {
    const ids = admJpn.rows.map(r => r.id)
    expect(ids).toContain('S0246')
    expect(ids).toContain('S0247')
    expect(ids).not.toContain('S0248') // the LEGO's own seed sentence is not admitted
    expect(ids).toContain('S0248L01')
    expect(ids).toContain('S0248L02')
    expect(ids).toContain('S0248L03')
    expect(ids).not.toContain('S0248L04')
    expect(admJpn.label).toBe('SEEDS S0001–S0247 and LEGOs S0001L01–S0248L02 in introduction order, plus this LEGO S0248L03')
  })
  it('admits a component only as a part of an admitted LEGO', () => {
    const adm = A.admittedList({ course: 'fra_for_eng', seeds: [], legos: [
      { seed_number: 1, lego_index: 1, known_text: 'I want to speak', target_text: 'je veux parler' },
      { seed_number: 1, lego_index: 2, known_text: 'french', target_text: 'français' },
    ], components: [
      { seed_number: 1, lego_index: 1, known_text: 'I want', target_text: 'je veux' },   // part of L01: admitted
      { seed_number: 1, lego_index: 1, known_text: 'the very', target_text: 'je' },     // gloss not in L01's known: refused
      { seed_number: 1, lego_index: 3, known_text: 'well', target_text: 'bien' },       // parent not admitted
    ], seedNumber: 1, legoIndex: 2 })
    const parts = adm.rows.filter(r => r.kind === 'component').map(r => r.known_text)
    expect(parts).toEqual(['I want'])
  })
})

describe('target side: every script tiled against the admitted list (no no-space bypass)', () => {
  it('jpn: whole admitted chunks pass', () => {
    expect(A.targetSideCheck('彼女は明日来る。', admJpn.targetTexts, 'jpn_for_eng').ok).toBe(true)
  })
  it('jpn: a tail not admitted is refused in v4 itself', () => {
    const r = A.targetSideCheck('彼女は明日来るって言ってた', admJpn.targetTexts, 'jpn_for_eng')
    expect(r.ok).toBe(false)
    expect(r.offending).toEqual(['って言ってた'])
  })
  it('kor (spaced): a word not admitted is refused', () => {
    const kor = A.admittedList({ course: 'kor_for_eng', seeds: [{ seed_number: 247, known_text: 'I want to go', target_text: '가고 싶어요' }],
      legos: [{ seed_number: 248, lego_index: 1, known_text: 'tomorrow', target_text: '내일' }, { seed_number: 248, lego_index: 3, known_text: 'too', target_text: '도' }],
      seedNumber: 248, legoIndex: 3 })
    expect(A.targetSideCheck('내일 가고 싶어요', kor.targetTexts, 'kor_for_eng').ok).toBe(true)
    expect(A.targetSideCheck('내일 정말 가고 싶어요', kor.targetTexts, 'kor_for_eng').offending).toEqual(['정말'])
  })
})

describe('known side: the same list, no free class', () => {
  it('admitted words pass', () => {
    expect(A.knownSideCheck('she is coming tomorrow', admJpn.knownTexts, 'jpn_for_eng')).toEqual([])
  })
  it('an ordinary everyday word not in any admitted known text is REFUSED', () => {
    expect(A.knownSideCheck('she is coming tomorrow, the very day', admJpn.knownTexts, 'jpn_for_eng')).toEqual(['the', 'very', 'day'])
  })
  it('no -s/-ed/-ing stripping and no dummy do', () => {
    expect(A.knownSideCheck('she wants to go', admJpn.knownTexts, 'jpn_for_eng')).toEqual(['wants'])
    expect(A.knownSideCheck('do I want to go', admJpn.knownTexts, 'jpn_for_eng')).toEqual(['do'])
  })
  it('a no-space KNOWN language (eng_for_jpn) tiles by whole admitted chunks', () => {
    const adm = A.admittedList({ course: 'eng_for_jpn', seeds: [{ seed_number: 247, known_text: '行きたい', target_text: 'I want to go' }],
      legos: [{ seed_number: 248, lego_index: 1, known_text: '明日', target_text: 'tomorrow' }, { seed_number: 248, lego_index: 3, known_text: '彼女は', target_text: 'she' }],
      seedNumber: 248, legoIndex: 3 })
    expect(A.knownSideCheck('明日行きたい', adm.knownTexts, 'eng_for_jpn')).toEqual([])
    expect(A.knownSideCheck('明日行きたいって言ってた', adm.knownTexts, 'eng_for_jpn')).toEqual(['って言ってた'])
  })
  it('admittedCheck refuses both sides with the reason named', () => {
    const r = A.admittedCheck({ known: 'she said she is coming tomorrow', target: '彼女は明日来るって言ってた' }, admJpn, 'jpn_for_eng')
    expect(r).toEqual([
      'known side uses words not admitted at this LEGO: said',
      'target uses words not admitted at this LEGO: って言ってた',
    ])
  })
})
