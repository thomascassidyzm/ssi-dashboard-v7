import { describe, it, expect, vi } from 'vitest'
const makeRouter = require('./drafts.cjs')

async function finalize(concurrentSave) {
  const draft = {
    course_code: 'spa_for_eng', seed_number: 1,
    updated_at: '2026-10-13T10:00:00.000Z',
    known_text: 'I want coffee', target_text: 'quiero café',
    submission_data: { legos: [{ idx: 1, known: 'I want', target: 'quiero',
      build: [], use: [{ known: 'I want coffee', target: 'quiero café' }] }] },
  }
  let rows = [structuredClone(draft)]
  const supabase = {
    // Interleave a second builder's save after the snapshot read, before cleanup.
    rpc: vi.fn(async () => {
      if (concurrentSave === 'new seed') rows.push({ ...structuredClone(draft), seed_number: 2 })
      if (concurrentSave === 'revised seed') rows[0] = {
        ...rows[0], target_text: 'quiero té', updated_at: '2026-10-13T10:00:01.000Z',
      }
      return { data: {}, error: null }
    }),
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
          return Promise.resolve({ data, error: null }).then(resolve, reject)
        },
      }
      for (const method of ['select', 'order', 'in']) q[method] = () => q
      for (const method of ['upsert', 'insert', 'update', 'delete']) q[method] = () => { operation = method; return q }
      return q
    },
  }
  const route = makeRouter({ supabase, courseVocabCache: new Map() }).stack
    .find(layer => layer.route?.path === '/course/:code/finalize').route
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } }
  await route.stack[0].handle({ params: { code: draft.course_code } }, res)
  return { rows, res }
}

describe('finalise preserves drafts saved after its snapshot', () => {
  it.each(['new seed', 'revised seed'])('preserves a concurrent %s', async scenario => {
    const { rows, res } = await finalize(scenario)
    expect(res.statusCode).toBe(200)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject(scenario === 'new seed'
      ? { seed_number: 2 }
      : { seed_number: 1, target_text: 'quiero té', updated_at: '2026-10-13T10:00:01.000Z' })
  })
  it('removes the unchanged draft that was finalised', async () => {
    const { rows, res } = await finalize(null)
    expect(res.statusCode).toBe(200)
    expect(res.body.status).toBe('FINALIZED')
    expect(rows).toEqual([])
  })
})
