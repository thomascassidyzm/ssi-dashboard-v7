import { describe, it, expect, vi } from 'vitest'
const makeRouter = require('./drafts.cjs')

async function finalize(failure) {
  const writes = []
  const draft = {
    seed_number: 1, known_text: 'I want coffee', target_text: 'quiero café',
    submission_data: { legos: [{ idx: 1, known: 'I want', target: 'quiero',
      build: [], use: [{ known: 'I want coffee', target: 'quiero café' }] }] },
  }
  const supabase = {
    rpc: vi.fn(async () => {
      if (failure === 'network') throw new Error('network disconnected')
      return failure === 'timeout'
        ? { data: null, error: { message: 'statement timeout' } }
        : { data: { phrases_deleted: 2, legos_deleted: 2 }, error: null }
    }),
    from(table) {
      let operation = 'select'
      const q = { then(resolve, reject) {
        const data = operation === 'select' && table === 'course_seed_drafts' ? [draft] : []
        return Promise.resolve({ data, error: null }).then(resolve, reject)
      } }
      for (const method of ['select', 'eq', 'in', 'order']) q[method] = () => q
      for (const method of ['upsert', 'insert', 'update', 'delete']) q[method] = payload => {
        operation = method
        writes.push({ table, method, payload })
        return q
      }
      return q
    },
  }
  const ctx = { supabase, courseVocabCache: new Map() }
  const route = makeRouter(ctx).stack.find(l => l.route?.path === '/course/:code/finalize').route
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } }
  await route.stack[0].handle({ params: { code: 'spa_for_eng' } }, res)
  return { res, writes, supabase }
}

describe('draft finalisation when old teaching cannot be cleared', () => {
  it.each(['timeout', 'network'])('stops on %s and preserves drafts for retry', async failure => {
    const { res, writes, supabase } = await finalize(failure)
    expect(supabase.rpc).toHaveBeenCalledWith('wipe_seed_teaching', { p_course: 'spa_for_eng', p_seeds: [1] })
    expect(res.statusCode).toBe(500)
    expect(res.body.error).toMatch(/timeout|network disconnected/)
    expect(writes).toEqual([])
  })
  it('writes replacement teaching and removes drafts after successful cleanup', async () => {
    const { res, writes } = await finalize(null)
    expect(res.statusCode).toBe(200)
    expect(res.body.status).toBe('FINALIZED')
    expect(writes).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: 'course_legos', method: 'upsert' }),
      expect.objectContaining({ table: 'course_practice_phrases', method: 'upsert' }),
      expect.objectContaining({ table: 'course_seed_drafts', method: 'delete' }),
    ]))
  })
})
