/**
 * A course's running order (job #949): "already taught" follows it when the course has one, and
 * is EXACTLY the old `seed_number < N` everywhere else.
 * Run: npx vitest run services/shared/running-order.test.cjs
 */
import { describe, it, expect } from 'vitest'
const { fromRows, seedsBefore, filterSeedsBefore, orderKey, loadRunningOrder } = require('./running-order.cjs')
const { auditDebutPractice } = require('./debut-practice.cjs')
const { loadIntroducedLegoPairs, loadTranslationVocab } = require('../course-builder/lib/vocab-cache.cjs')
const { checkLegoConflict } = require('../course-builder/lib/validation.cjs')

// cym_nv2_for_eng in miniature: old 1-4, block 1001-1003 after old 2, old 3 dropped.
const WOVEN = [
  { seed_number: 1, position: 1 }, { seed_number: 2, position: 2 },
  { seed_number: 1001, position: 3 }, { seed_number: 1002, position: 4 }, { seed_number: 1003, position: 5 },
  { seed_number: 4, position: 6 },
]

/** A PostgREST-shaped fake: records every filter, answers per table from `tables`. */
function fakeSupabase(tables) {
  const calls = []
  const from = (table) => {
    const q = { table, filters: [] }
    calls.push(q)
    const rows = () => {
      let r = [...(tables[table] || [])]
      for (const [op, col, v] of q.filters) {
        if (op === 'eq') r = r.filter(x => x[col] === v)
        if (op === 'lt') r = r.filter(x => x[col] < v)
        if (op === 'lte') r = r.filter(x => x[col] <= v)
        if (op === 'in') r = r.filter(x => v.includes(x[col]))
      }
      return r
    }
    const chain = {
      select: () => chain, order: () => chain, not: () => chain,
      eq: (c, v) => { q.filters.push(['eq', c, v]); return chain },
      lt: (c, v) => { q.filters.push(['lt', c, v]); return chain },
      lte: (c, v) => { q.filters.push(['lte', c, v]); return chain },
      in: (c, v) => { q.filters.push(['in', c, v]); return chain },
      range: (a, b) => Promise.resolve({ data: rows().slice(a, b + 1), error: null }),
      then: (res, rej) => Promise.resolve({ data: rows(), error: null }).then(res, rej),
    }
    return chain
  }
  return { from, calls }
}

const lego = (seed, idx, known, target, is_new = true) => ({ course_code: 'c', seed_number: seed, lego_index: idx, known_text: known, target_text: target, is_new, type: 'A', components: [] })

describe('seedsBefore / orderKey', () => {
  const order = fromRows(WOVEN)
  it('a block seed is preceded by the old seeds before the insert point and earlier block seeds only', () => {
    expect(seedsBefore(order, 1001)).toEqual([1, 2])
    expect(seedsBefore(order, 1003)).toEqual([1, 2, 1001, 1002])
    expect(seedsBefore(order, 4)).toEqual([1, 2, 1001, 1002, 1003])
    expect(seedsBefore(order, 1002, { inclusive: true })).toEqual([1, 2, 1001, 1002])
  })
  it('a dropped seed is nobody\'s history and has none of its own', () => {
    expect(seedsBefore(order, 4)).not.toContain(3)
    expect(seedsBefore(order, 3)).toEqual([])
    expect(orderKey(order, 3)).toBe(Infinity)
  })
  it('without a running order orderKey is the seed number', () => {
    for (const n of [1, 137, 138, 1001]) expect(orderKey(null, n)).toBe(n)
  })
})

describe('filterSeedsBefore: no running order = the exact old filter', () => {
  it('.lt / .lte with the same arguments, nothing else', () => {
    const rec = []
    const q = { lt: (...a) => (rec.push(['lt', ...a]), q), lte: (...a) => (rec.push(['lte', ...a]), q), in: (...a) => (rec.push(['in', ...a]), q) }
    filterSeedsBefore(q, null, 138)
    filterSeedsBefore(q, null, 138, { inclusive: true })
    expect(rec).toEqual([['lt', 'seed_number', 138], ['lte', 'seed_number', 138]])
  })
  it('woven: an IN-list in running order; never an empty IN', () => {
    const rec = []
    const q = { in: (...a) => (rec.push(a), q) }
    filterSeedsBefore(q, fromRows(WOVEN), 1001)
    filterSeedsBefore(q, fromRows(WOVEN), 1)
    expect(rec).toEqual([['seed_number', [1, 2]], ['seed_number', [-1]]])
  })
})

describe('loadRunningOrder', () => {
  it('a course with no rows, an error, a throw, or junk rows → null (old behaviour)', async () => {
    expect(await loadRunningOrder(fakeSupabase({ course_running_order: [] }), 'x')).toBeNull()
    expect(await loadRunningOrder({ from: () => { throw new Error('no such view') } }, 'x')).toBeNull()
    expect(await loadRunningOrder(fakeSupabase({ course_running_order: [{ foo: 1 }] }), 'x')).toBeNull()
  })
  it('reads the view for the course', async () => {
    const o = await loadRunningOrder(fakeSupabase({ course_running_order: WOVEN.map(r => ({ ...r, course_code: 'c' })) }), 'c')
    expect(o.seeds).toEqual([1, 2, 1001, 1002, 1003, 4])
  })
})

describe('course builder history follows the running order (fails on the pre-#949 code)', () => {
  const legos = [lego(1, 1, 'I want', 'dw i isio'), lego(2, 1, 'to speak', 'siarad'), lego(3, 1, 'dropped', 'gollwng'),
    lego(4, 1, 'old later', 'hen'), lego(1001, 1, 'now', 'rŵan'), lego(1002, 1, 'with you', 'efo chdi')]
  const woven = () => fakeSupabase({ course_running_order: WOVEN.map(r => ({ ...r, course_code: 'c' })), course_legos: legos,
    course_seeds: [1, 2, 3, 4, 1001, 1002].map(n => ({ course_code: 'c', seed_number: n, target_text: `seed${n}` })) })
  const plain = () => fakeSupabase({ course_running_order: [], course_legos: legos,
    course_seeds: [1, 2, 3, 4, 1001, 1002].map(n => ({ course_code: 'c', seed_number: n, target_text: `seed${n}` })) })

  it('introduced LEGOs before block seed 1002 are old 1-2 and block 1001, in running order — not old 3-4', async () => {
    const pairs = await loadIntroducedLegoPairs({ supabase: woven() }, 'c', 1002, { exclusive: true })
    expect(pairs.map(p => p.seed)).toEqual([1, 2, 1001])
  })
  it('old seed 4 (after the block) has the block in its history, in running order', async () => {
    const pairs = await loadIntroducedLegoPairs({ supabase: woven() }, 'c', 4)
    expect(pairs.map(p => p.seed)).toEqual([1, 2, 1001, 1002, 4])
  })
  it('translation vocab before block seed 1001 comes from old 1-2 only', async () => {
    const v = await loadTranslationVocab({ supabase: woven() }, 'c', 1001)
    expect(v.has('siarad')).toBe(true)
    expect(v.has('hen')).toBe(false)
    expect(v.has('gollwng')).toBe(false)
  })
  it('a LEGO in old 4 does not make a block LEGO a duplicate (old 4 plays after the block)', async () => {
    const r = await checkLegoConflict(woven(), 'c', 'old later', 'hen', 1001)
    expect(r.conflict).toBeFalsy()
  })

  it('UNWOVEN course: identical to seed_number order (same filters, same answers)', async () => {
    const sb = plain()
    const pairs = await loadIntroducedLegoPairs({ supabase: sb }, 'c', 1002, { exclusive: true })
    expect(pairs.map(p => p.seed)).toEqual([1, 2, 3, 4, 1001])
    const legoQ = sb.calls.find(c => c.table === 'course_legos')
    expect(legoQ.filters).toEqual([['eq', 'course_code', 'c'], ['lt', 'seed_number', 1002]])
    const sb2 = plain()
    await loadIntroducedLegoPairs({ supabase: sb2 }, 'c', 4)
    expect(sb2.calls.find(c => c.table === 'course_legos').filters).toEqual([['eq', 'course_code', 'c'], ['lte', 'seed_number', 4]])
    const r = await checkLegoConflict(plain(), 'c', 'old later', 'hen', 1001)
    expect(r.conflict).toBeTruthy()
  })
})

describe('debut audit walks the running order', () => {
  // The same pair debuts in block seed 1001 and again in old seed 4. In running order 1001 comes first.
  const legos = [lego(4, 1, 'now', 'rŵan', true), lego(1001, 1, 'now', 'rŵan', true), lego(3, 1, 'x', 'y', true)]
  it('woven: the old-4 copy is the repeat, and the dropped seed is not audited', () => {
    const a = auditDebutPractice(legos, [], { order: fromRows(WOVEN) })
    expect(a.isNew.repeatNew).toMatchObject([{ lego_id: 'S0004L01', first_debut: 'S1001L01' }])
    expect(a.blocking.map(b => b.lego_id)).not.toContain('S0003L01')
  })
  it('unwoven (no order): exactly as before — S0004 first', () => {
    const a = auditDebutPractice(legos, [])
    expect(a.isNew.repeatNew).toMatchObject([{ lego_id: 'S1001L01', first_debut: 'S0004L01' }])
    expect(auditDebutPractice(legos, [], { order: null })).toEqual(a)
  })
})
