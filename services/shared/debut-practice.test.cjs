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
  it('blocks a debut with BUILD rows but no USE — the S0190L01 case, bare-LEGO rows not counted', () => {
    const a = auditDebutPractice(S0190.legos, S0190.phrases)
    expect(a.blocking).toHaveLength(1)
    expect(a.blocking[0]).toMatchObject({ lego_id: 'S0190L01', reason: 'NO_USE', build: 2, use: 0, bare: 2 })
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
  it('refuses beta/live while a debut has no USE, and never gates demotion', async () => {
    const sb = fakeSupabase(S0190)
    const live = await releaseGate(sb, 'ita_for_eng', 'released')
    expect(live.allowed).toBe(false)
    expect(live.blocking.map((b) => b.lego_id)).toEqual(['S0190L01'])
    expect((await releaseGate(sb, 'ita_for_eng', 'beta')).allowed).toBe(false)
    expect((await releaseGate(sb, 'ita_for_eng', 'draft'))).toEqual({ allowed: true, gated: false })
  })

  it('lets the course through once the debut has its USE phrases', async () => {
    const fixed = { legos: S0190.legos, phrases: [...S0190.phrases, ...uses(190, 1, 5)] }
    expect((await releaseGate(fakeSupabase(fixed), 'ita_for_eng', 'released')).allowed).toBe(true)
  })
})
