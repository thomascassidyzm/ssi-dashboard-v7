/**
 * Every debut LEGO has practice phrases (Tom, 2026-09-30) — the audit and the release gate.
 * Run: npx vitest run services/shared/debut-practice.test.cjs
 */
import { describe, it, expect } from 'vitest'
const { auditDebutPractice, releaseGate } = require('./debut-practice.cjs')

const L = (seed, idx, is_new, known, target) => ({ seed_number: seed, lego_index: idx, is_new, known_text: known, target_text: target })
const P = (seed, idx, role, target) => ({ seed_number: seed, lego_index: idx, phrase_role: role, target_text: target })
const uses = (seed, idx, n) => Array.from({ length: n }, (_, i) => P(seed, idx, 'use', `frase ${seed} ${idx} ${i}`))
const builds = (seed, idx, n) => Array.from({ length: n }, (_, i) => P(seed, idx, 'build', `pezzo ${seed} ${idx} ${i}`))

// ita_for_eng S0190L01 as it stood on 2026-09-30, after job #887·I moved its five USE rows forward.
const S0190 = {
  legos: [L(190, 1, true, 'do you mind if I ask you', 'ti dispiace se ti faccio'), L(190, 2, true, 'questions', 'domande')],
  phrases: [
    P(190, 1, 'build', 'ti dispiace se ti faccio'), P(190, 1, 'build', 'ti dispiace se ti faccio'),
    P(190, 1, 'build', 'ti dispiace se ti faccio dopo?'), P(190, 1, 'build', 'ti dispiace se ti faccio quello?'),
    ...builds(190, 2, 3), ...uses(190, 2, 5),
  ],
}

describe('auditDebutPractice', () => {
  it('BUILD or USE counts (Tom 11:14Z, job #910): a debut with real BUILD rows and no USE is practised — reported, never blocked', () => {
    const a = auditDebutPractice(S0190.legos, S0190.phrases)
    expect(a.blocking).toEqual([])
    expect(a.thin.find((t) => t.lego_id === 'S0190L01')).toMatchObject({ noUse: true, build: 2, use: 0, bare: 2 })
    // ita_for_eng S0001L02 parlare as it stands: one BUILD "voglio parlare", no USE — #906 counted it missing
    const s1 = auditDebutPractice(
      [L(1, 1, true, 'I want', 'voglio'), L(1, 2, true, 'to speak', 'parlare')],
      [P(1, 2, 'build', 'parlare'), P(1, 2, 'build', 'voglio parlare')],
    )
    expect(s1.blocking).toEqual([])
    expect(s1.thin).toMatchObject([{ lego_id: 'S0001L02', build: 1, use: 0, bare: 1, noUse: true }])
  })

  it('still blocks a debut whose only BUILD rows are the bare LEGO', () => {
    const a = auditDebutPractice([L(1, 2, true, 'to speak', 'parlare')], [P(1, 2, 'build', 'parlare'), P(1, 2, 'build', 'Parlare.')])
    expect(a.blocking).toMatchObject([{ lego_id: 'S0001L02', reason: 'UNPRACTISED', bare: 2 }])
  })

  it('lets a later sibling carry it: S0190L02 U08, the seed sentence, contains S0190L01 (P7)', () => {
    const withSeedSentence = [...S0190.phrases, { ...P(190, 2, 'use', 'ti dispiace se ti faccio alcune domande?'), id: 'ita_for_eng:S0190L02U08' }]
    const a = auditDebutPractice(S0190.legos, withSeedSentence)
    expect(a.blocking).toEqual([])
    expect(a.thin.find((t) => t.lego_id === 'S0190L01')).toMatchObject({ carried_by: 'ita_for_eng:S0190L02U08' })
    // an EARLIER sibling never carries: L01's own USE cannot stand in for L02
    const early = auditDebutPractice(
      [L(20, 1, true, 'I want', 'voglio'), L(20, 2, true, 'to eat', 'mangiare')],
      [...builds(20, 1, 3), P(20, 1, 'use', 'voglio mangiare adesso'), ...builds(20, 2, 3)],
    )
    expect(early.blocking).toEqual([])
    expect(early.thin.find((t) => t.lego_id === 'S0020L02')).toMatchObject({ noUse: true })
  })

  it('a later sibling never EXEMPTS a debut with no real phrase (job #909: 49 gle debuts like S0053L01-L04 slipped through)', () => {
    const a = auditDebutPractice(
      [L(53, 1, true, 'I have', 'tá agam'), L(53, 2, true, 'a book', 'leabhar')],
      [P(53, 1, 'build', 'tá agam'), ...builds(53, 2, 3), P(53, 2, 'use', 'tá agam leabhar anois')],
    )
    expect(a.blocking).toMatchObject([{ lego_id: 'S0053L01', reason: 'UNPRACTISED', bare: 1 }])
    expect(a.blocking[0].carried_by).toBeUndefined()
  })

  it('carrying is whole-word: a debut "a" is not carried by "cat"', () => {
    const a = auditDebutPractice(
      [L(30, 1, true, 'to', 'a'), L(30, 2, true, 'the cat', 'il gatto')],
      [P(30, 1, 'build', 'a casa'), ...builds(30, 2, 3), P(30, 2, 'use', 'il gatto mangia')],
    )
    expect(a.thin.find((t) => t.lego_id === 'S0030L01').carried_by).toBeUndefined()
    const b = auditDebutPractice([L(30, 1, true, 'to', 'a'), L(30, 2, true, 'the cat', 'il gatto')],
      [P(30, 1, 'build', 'a casa'), ...builds(30, 2, 3), { ...P(30, 2, 'use', 'il gatto va a casa'), id: 'x:S0030L02U01' }])
    expect(b.thin.find((t) => t.lego_id === 'S0030L01')).toMatchObject({ carried_by: 'x:S0030L02U01' })
  })

  it("job #887·I's exact cut of S0190L01: USE moved forward, L02U08 present — reported BUILD-only and carried; the same cut taken one step further (real BUILDs gone) blocks despite U08", () => {
    // before #887·I: two real BUILDs, two bare rows, five USE rows under L01; the sweep moved all five USE to S0202L03
    const before = [...S0190.phrases, ...uses(190, 1, 5), { ...P(190, 2, 'use', 'ti dispiace se ti faccio alcune domande?'), id: 'ita_for_eng:S0190L02U08' }]
    const after = before.filter((p) => !(p.lego_index === 1 && p.phrase_role === 'use'))
    expect(auditDebutPractice(S0190.legos, before).thin.find((t) => t.lego_id === 'S0190L01').noUse).toBeUndefined()
    const cut = auditDebutPractice(S0190.legos, after)
    expect(cut.blocking).toEqual([]) // Tom 11:14Z: two real BUILD phrases are practice
    expect(cut.thin.find((t) => t.lego_id === 'S0190L01')).toMatchObject({ build: 2, use: 0, noUse: true, carried_by: 'ita_for_eng:S0190L02U08' })
    const stripped = after.filter((p) => !(p.lego_index === 1 && /dopo|quello/.test(p.target_text)))
    expect(auditDebutPractice(S0190.legos, stripped).blocking).toMatchObject([{ lego_id: 'S0190L01', reason: 'UNPRACTISED', bare: 2 }])
  })

  it('blocks a debut with nothing, and a debut whose only rows are the bare LEGO', () => {
    const a = auditDebutPractice(
      [L(10, 1, true, 'if', 'se'), L(10, 2, true, 'why', 'perché')],
      [P(10, 2, 'build', 'perché'), P(10, 2, 'use', 'Perché?')],
    )
    expect(a.blocking.map((b) => [b.lego_id, b.reason])).toEqual([['S0010L01', 'UNPRACTISED'], ['S0010L02', 'UNPRACTISED']])
  })

  it('follows the seed-position ramp: S1L1 needs nothing, S2 one of each, S4+ reports thin but does not block', () => {
    const a = auditDebutPractice(
      [L(1, 1, true, 'I want', 'voglio'), L(2, 1, true, 'to go', 'andare'), L(4, 1, true, 'now', 'adesso')],
      [...builds(2, 1, 1), ...uses(2, 1, 1), ...builds(4, 1, 1), ...uses(4, 1, 2)],
    )
    expect(a.blocking).toEqual([])
    expect(a.thin.map((t) => t.lego_id)).toEqual(['S0004L01'])
  })

  it('never blocks a not-new LEGO; its phrases are reported DARK (nobody hears them — P25)', () => {
    const a = auditDebutPractice(
      [L(5, 1, true, 'to go', 'andare'), L(9, 2, false, 'to go', 'andare')],
      [...builds(5, 1, 3), ...uses(5, 1, 5), ...uses(9, 2, 2)],
    )
    expect(a.blocking).toEqual([])
    expect(a.dark).toMatchObject([{ lego_id: 'S0009L02', rows: 2 }])
  })

  it('checks is_new against first appearance of each known/target pair', () => {
    const a = auditDebutPractice([
      L(3, 1, true, 'to go', 'andare'), L(8, 1, true, 'to go', 'andare'), // repeat marked new
      L(4, 1, false, 'now', 'adesso'), L(6, 1, true, 'now', 'adesso'), // debut in the wrong place
      L(7, 1, false, 'still', 'ancora'), // never debuted
    ], [])
    expect(a.isNew.repeatNew.map((x) => x.lego_id)).toEqual(['S0008L01'])
    expect(a.isNew.firstNotNew).toMatchObject([{ lego_id: 'S0004L01', debuts_at: 'S0006L01' }])
    expect(a.isNew.neverDebuted.map((x) => x.lego_id)).toEqual(['S0007L01'])
  })
})

// Just enough supabase-js for checkCourseDebutPractice: from().select().eq()...order().range()
function fakeSupabase({ legos, phrases }) {
  return {
    from(table) {
      const rows = table === 'course_legos' ? legos : phrases.map((p, i) => ({ position: i, ...p }))
      const q = { filters: [] }
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: (col, vals) => { q.filters.push((r) => vals.includes(r[col])); return chain },
        order: () => chain,
        range: async (from, to) => ({ data: rows.filter((r) => q.filters.every((f) => f(r))).slice(from, to + 1), error: null }),
      }
      return chain
    },
  }
}

describe('releaseGate', () => {
  it('lets a BUILD-only debut through (job #910) and refuses beta/live only on a debut with no real practice', async () => {
    expect((await releaseGate(fakeSupabase(S0190), 'ita_for_eng', 'released')).allowed).toBe(true)
    const empty = { legos: S0190.legos, phrases: S0190.phrases.filter((p) => !(p.lego_index === 1 && !/dispiace se ti faccio$/.test(p.target_text))) }
    const sb = fakeSupabase(empty)
    const live = await releaseGate(sb, 'ita_for_eng', 'released')
    expect(live.allowed).toBe(false)
    expect(live.blocking.map((b) => [b.lego_id, b.reason])).toEqual([['S0190L01', 'UNPRACTISED']])
    expect((await releaseGate(sb, 'ita_for_eng', 'beta')).allowed).toBe(false)
    expect((await releaseGate(sb, 'ita_for_eng', 'draft'))).toEqual({ allowed: true, gated: false })
  })
})
