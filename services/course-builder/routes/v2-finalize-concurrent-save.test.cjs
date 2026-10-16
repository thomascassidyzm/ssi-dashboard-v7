// v2 decompose finalize must delete only the draft versions it promoted. A builder may save a new
// seed, revise a loaded draft, or leave a collision/rework draft the 'valid' read never loaded;
// none of those were promoted, so wiping them loses work. Same race as drafts.concurrent-save.
//
// Run: npx vitest run services/course-builder/routes/v2-finalize-concurrent-save
import { describe, it, expect } from 'vitest'
const makeRouter = require('./v2.cjs')

const C = 'spa_for_eng'
const draft = {
  course_code: C, seed_number: 1, validation_status: 'valid',
  updated_at: '2026-10-13T10:00:00.000Z',
  known_text: 'I want coffee', target_text: 'quiero café',
  submission_data: { legos: [{ idx: 1, type: 'A', known: 'I want', target: 'quiero' }] },
}

async function finalize(scenario) {
  let rows = [structuredClone(draft)]
  if (scenario === 'collision draft') rows.push({ ...structuredClone(draft), seed_number: 3, validation_status: 'collision' })
  let interleaved = false
  const supabase = {
    rpc: async () => ({ data: null, error: null }),
    from(table) {
      let operation = 'select'
      const filters = []
      const q = {
        eq(key, value) { filters.push(row => row[key] === value); return q },
        then(resolve, reject) {
          let data = []
          if (table === 'course_seed_drafts') {
            if (operation === 'select') data = structuredClone(rows.filter(row => filters.every(f => f(row))))
            if (operation === 'delete') rows = rows.filter(row => !filters.every(f => f(row)))
          }
          // Interleave a second builder's save after the snapshot read, before cleanup.
          if (table === 'course_seeds' && operation === 'upsert' && !interleaved) {
            interleaved = true
            if (scenario === 'new seed') rows.push({ ...structuredClone(draft), seed_number: 2 })
            if (scenario === 'revised seed') rows[0] = { ...rows[0], target_text: 'quiero té', updated_at: '2026-10-13T10:00:01.000Z' }
          }
          return Promise.resolve({ data: q._single ? (data[0] || null) : data, error: null }).then(resolve, reject)
        },
      }
      for (const m of ['select', 'order', 'in', 'neq', 'lt', 'lte', 'gt', 'gte', 'not', 'is', 'limit', 'range', 'filter', 'match', 'or']) q[m] = () => q
      q.single = q.maybeSingle = () => { q._single = true; return q }
      for (const m of ['upsert', 'insert', 'update', 'delete']) q[m] = () => { operation = m; return q }
      return q
    },
  }
  const route = makeRouter({ supabase, courseVocabCache: new Map(), config: {} }).stack
    .find(layer => layer.route?.path === '/v2/decompose/finalize/:courseCode').route
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } }
  await route.stack[route.stack.length - 1].handle({ params: { courseCode: C }, body: {}, headers: {} }, res)
  return { rows, res }
}

describe('v2 decompose finalize preserves drafts it did not promote', () => {
  it.each([
    ['new seed', { seed_number: 2 }],
    ['revised seed', { seed_number: 1, target_text: 'quiero té' }],
    ['collision draft', { seed_number: 3, validation_status: 'collision' }],
  ])('preserves a %s', async (scenario, survivor) => {
    const { rows, res } = await finalize(scenario)
    expect(res.statusCode).toBe(200)
    expect(rows).toEqual([expect.objectContaining(survivor)])
  })
  it('removes the unchanged draft it promoted', async () => {
    const { rows, res } = await finalize(null)
    expect(res.statusCode).toBe(200)
    expect(rows).toEqual([])
  })
})
