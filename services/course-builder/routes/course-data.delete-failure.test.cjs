import { describe, expect, it, vi } from 'vitest'
const createRouter = require('./course-data.cjs')

const tables = ['course_qa_flags', 'build_jobs', 'course_seed_drafts', 'course_seeds', 'course_audio', 'course_gender_expansions', 'course_export_states']

async function removeCourse(failedTable, failedBatch = 1) {
  const deleted = []
  const batches = new Map()
  const supabase = {
    from(table) {
      let deleting = false
      const q = {
        select: () => q, eq: () => q, order: () => q, range: () => q, limit: () => q,
        delete() { deleting = true; return q },
        then(resolve, reject) {
          if (!deleting) return Promise.resolve({ data: [], error: null }).then(resolve, reject)
          deleted.push(table)
          const batch = (batches.get(table) || 0) + 1
          batches.set(table, batch)
          return Promise.resolve(table === failedTable && batch === failedBatch
            ? { count: null, error: { message: 'statement timeout' } }
            : { count: table === failedTable ? 3000 : 0, error: null }).then(resolve, reject)
        },
      }
      return q
    },
  }
  const ctx = { supabase, courseVocabCache: { delete: vi.fn() }, activeBuilds: { delete: vi.fn() } }
  const router = createRouter(ctx)
  const handler = router.stack.find(layer => layer.route?.path === '/course/:courseCode' && layer.route.methods.delete).route.stack[0].handle
  const res = { statusCode: 200, status(n) { this.statusCode = n; return this }, json(body) { this.body = body; return this } }
  await handler({ params: { courseCode: 'spa_for_eng' }, query: { confirm: 'yes' } }, res)
  return { res, deleted, ctx }
}

describe('course deletion stops on child-table failure', () => {
  it.each(tables)('does not delete past a failed %s or report success', async table => {
    const { res, deleted, ctx } = await removeCourse(table)
    expect(res.statusCode).toBe(500)
    expect(res.body).toMatchObject({ ok: false, error: expect.stringContaining(table) })
    expect(deleted).toEqual(tables.slice(0, tables.indexOf(table) + 1))
    expect(ctx.courseVocabCache.delete).not.toHaveBeenCalled()
  })
  it('stops when a later batch fails after successful deletions', async () => {
    const { res, deleted } = await removeCourse('course_qa_flags', 2)
    expect(res.statusCode).toBe(500)
    expect(deleted).toEqual(['course_qa_flags', 'course_qa_flags'])
  })
  it('still removes the course after successful child deletions', async () => {
    const { res, deleted, ctx } = await removeCourse()
    expect(res.statusCode).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(deleted).toEqual([...tables, 'courses'])
    expect(ctx.courseVocabCache.delete).toHaveBeenCalledWith('spa_for_eng')
  })
})
