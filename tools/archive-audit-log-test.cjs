#!/usr/bin/env node
/**
 * archive-audit-log-test.cjs — proves the day-paging cursor in archive-audit-log.cjs
 * is served by the changed_at index and returns every row of a day exactly once.
 *
 * Run: node tools/archive-audit-log-test.cjs        (no DB, no env, single process)
 *
 * The pre-fix cursor was `id > N ORDER BY id LIMIT 1000` with a changed_at window
 * filter: the planner walked content_audit_log_pkey from 0 and discarded 3.4M rows
 * before page one of a 478k-row day (EXPLAIN 2026-09-12: 22.4s, killed by PostgREST's
 * 8s timeout). The fixed cursor is (changed_at, id) ascending with the lower bound
 * re-seeded from the cursor's own timestamp, so idx_content_audit_log_changed_at
 * serves every page (22–29ms measured, including inside a 43,426-row same-instant burst).
 *
 * RECORDED RED 2026-09-12 against the pre-fix query shape (ARCHIVE_MODULE pointed at a
 * copy of the old selectPage): the three shape/cursor tests fail ("order columns were
 * ["id"]"; lower bound was the day start; cursor was a bare id) and the full-day
 * simulation still passes — the old cursor was correct, just unplannable, and the row
 * set a day yields must not change. GREEN on the fixed module: 4/4.
 */
const assert = require('assert')
const mod = require(process.env.ARCHIVE_MODULE || './archive-audit-log.cjs')
const { buildPageQuery, nextCursor, PAGE } = mod

// A recording stand-in for supabase-js's filter builder.
function fakeQuery() {
  const calls = []
  const q = {}
  for (const m of ['gte', 'lt', 'gt', 'eq', 'or', 'order', 'limit']) q[m] = (...a) => { calls.push([m, ...a]); return q }
  q.calls = calls
  return q
}

const FROM = '2026-08-18T00:00:00.000Z', TO = '2026-08-19T00:00:00.000Z'
let failures = 0
function test(name, fn) {
  try { fn(); console.log(`  ok   ${name}`) } catch (e) { failures++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

test('first page: ORDER BY must lead with changed_at (index-served), then id', () => {
  const q = buildPageQuery(fakeQuery(), FROM, TO, null)
  const orders = q.calls.filter(c => c[0] === 'order').map(c => c[1])
  assert.deepStrictEqual(orders, ['changed_at', 'id'], `order columns were ${JSON.stringify(orders)}`)
  assert.deepStrictEqual(q.calls.find(c => c[0] === 'gte'), ['gte', 'changed_at', FROM])
  assert.deepStrictEqual(q.calls.find(c => c[0] === 'lt'), ['lt', 'changed_at', TO])
  assert.ok(!q.calls.some(c => c[0] === 'gt' && c[1] === 'id'), 'a bare id cursor forces the pkey walk')
  assert.deepStrictEqual(q.calls.find(c => c[0] === 'limit'), ['limit', PAGE])
})

test('later page: lower bound is the cursor instant, and there is no bare id cursor', () => {
  const cur = { changed_at: '2026-08-18T21:34:33.819691+00:00', id: 22569328 }
  const q = buildPageQuery(fakeQuery(), FROM, TO, cur)
  assert.deepStrictEqual(q.calls.find(c => c[0] === 'gte'), ['gte', 'changed_at', cur.changed_at],
    'the index range must start at the cursor instant, not at the day start')
  assert.ok(!q.calls.some(c => c[0] === 'gt' && c[1] === 'id'), 'a bare id cursor forces the pkey walk')
  const or = q.calls.find(c => c[0] === 'or')
  assert.ok(or, 'an or() tie-break is required for same-instant rows')
  assert.strictEqual(or[1], `changed_at.gt.${cur.changed_at},and(changed_at.eq.${cur.changed_at},id.gt.${cur.id})`)
})

test('cursor keeps the changed_at string exactly as returned (microseconds intact)', () => {
  const rows = [{ id: 1, changed_at: '2026-08-18T21:34:33.819691+00:00' }, { id: 7, changed_at: '2026-08-18T21:34:33.819691+00:00' }]
  assert.deepStrictEqual(nextCursor(rows), { changed_at: '2026-08-18T21:34:33.819691+00:00', id: 7 })
  assert.strictEqual(nextCursor([]), null)
})

// A tiny PostgREST: evaluates the recorded filters against an in-memory table so
// the paging loop can be driven end to end. Timestamps compare as strings, which is
// exact for fixed-format ISO values in one zone.
function evaluate(q, table) {
  let rows = table
  const orders = []
  let limit = Infinity
  const cmp = { gt: (a, b) => a > b, gte: (a, b) => a >= b, lt: (a, b) => a < b, eq: (a, b) => a === b }
  const val = (col, v) => col === 'id' ? Number(v) : String(v)
  const clause = (r, s) => { const m = s.match(/^(\w+)\.(gt|gte|lt|eq)\.(.+)$/); return cmp[m[2]](r[m[1]], val(m[1], m[3])) }
  for (const [m, ...a] of q.calls) {
    if (m in cmp) rows = rows.filter(r => cmp[m](r[a[0]], val(a[0], a[1])))
    else if (m === 'or') {
      const [, left, andBody] = a[0].match(/^(.+?),and\((.+)\)$/)
      rows = rows.filter(r => clause(r, left) || andBody.split(',').every(s => clause(r, s)))
    } else if (m === 'order') orders.push([a[0], a[1]?.ascending !== false])
    else if (m === 'limit') limit = a[0]
  }
  rows = rows.slice().sort((x, y) => {
    for (const [c, asc] of orders) { if (x[c] !== y[c]) return (x[c] < y[c] ? -1 : 1) * (asc ? 1 : -1) }
    return 0
  })
  return rows.slice(0, limit)
}

test('a simulated day with a same-instant burst pages to completion, every row exactly once', () => {
  // 4,300 rows: ordinary rows, a 2,500-row burst sharing one changed_at (bigger than
  // one page), and out-of-window rows on both sides that must never appear.
  const table = []
  let id = 1000
  const ts = (h, m, s, us) => `2026-08-18T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(us).padStart(6, '0')}+00:00`
  for (let i = 0; i < 900; i++) table.push({ id: id++, changed_at: ts(9, 0, i % 60, i * 7) })
  for (let i = 0; i < 2500; i++) table.push({ id: id++, changed_at: ts(21, 34, 33, 819691) })
  for (let i = 0; i < 900; i++) table.push({ id: id++, changed_at: ts(23, 59, i % 60, i * 3) })
  table.push({ id: 1, changed_at: '2026-08-17T23:59:59.999999+00:00' })
  table.push({ id: id++, changed_at: '2026-08-19T00:00:00.000000+00:00' })
  const expected = table.filter(r => r.changed_at >= FROM && r.changed_at < TO).map(r => r.id).sort((a, b) => a - b)

  const seen = []
  let cursor = null, pages = 0
  for (;;) {
    const page = evaluate(buildPageQuery(fakeQuery(), FROM, TO, cursor), table)
    pages++
    if (page.length === 0) break
    seen.push(...page.map(r => r.id))
    cursor = nextCursor(page)
    if (page.length < PAGE) break
    assert.ok(pages < 100, 'paging did not terminate')
  }
  assert.deepStrictEqual(seen.slice().sort((a, b) => a - b), expected, 'row set must equal the plain day predicate')
  assert.strictEqual(new Set(seen).size, seen.length, 'no row may be returned twice')
  assert.strictEqual(pages, Math.ceil(expected.length / PAGE) + (expected.length % PAGE === 0 ? 1 : 0))
})

console.log(failures ? `\n${failures} FAILED` : '\nall passed')
process.exit(failures ? 1 : 0)
