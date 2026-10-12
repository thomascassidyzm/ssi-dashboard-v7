import { describe, it, expect, vi } from 'vitest'
const fs = require('node:fs')
const vm = require('node:vm')
const createDraftRouter = require('./course-builder/routes/drafts.cjs')

// Load the actual proxy gate without starting the production server or its clients.
const source = fs.readFileSync(require.resolve('./production-api.cjs'), 'utf8')
const gateSource = source.slice(source.indexOf('const PROXY_COURSE_CODE_RE ='), source.indexOf('// Generic proxy function for course-builder routes'))

async function request(courseSegment, allowedCourses = ['spa_for_eng'], extra = {}) {
  const user = { role: 'editor', email: 'alice@example.test' }
  const gate = vm.runInNewContext(`${gateSource}\nrequireProxyCourseAccess`, {
    isLoopbackDirectRequest: () => false,
    resolveDashboardUserCached: async () => user,
    userCanAccessCourse: (_, code) => allowedCourses.includes(code),
    logger: { warn() {}, error() {} },
  })
  const from = vi.fn(() => {
    const query = { select: () => query, eq: () => query, order: async () => ({ data: [], error: null }) }
    return query
  })
  const router = createDraftRouter({ supabase: { from } })
  const path = `/course/${courseSegment}/drafts`
  const req = { method: 'GET', url: path, path, headers: {}, query: {}, ...extra }
  const res = { statusCode: 200, status(n) { this.statusCode = n; return this }, json(body) { this.body = body } }
  await new Promise((resolve, reject) => {
    res.json = function(body) { this.body = body; resolve() }
    gate(req, res, () => router.handle(req, res, reject)).catch(reject)
  })
  return { res, from }
}

describe('course-builder proxy authorisation before decoded routing', () => {
  it.each(['fra_for_eng', '%66ra_for_eng', 'fra%5Ffor%5Feng', 'cym_n_for_eng', 'fra_ca_for_eng', 'spa_for_eng_10seeds'])('refuses another editor’s course: %s', async (segment) => {
    const { res, from } = await request(segment)
    expect(res.statusCode).toBe(403)
    expect(from).not.toHaveBeenCalled()
  })
  it('allows an explicitly assigned dialect course', async () => {
    const { res } = await request('cym_n_for_eng', ['cym_n_for_eng'])
    expect(res.statusCode).toBe(200)
    expect(res.body.course_code).toBe('cym_n_for_eng')
  })
  it.each(['spa_for_eng', '%73pa_for_eng'])('allows the editor’s own course: %s', async (segment) => {
    const { res, from } = await request(segment)
    expect(res.statusCode).toBe(200)
    expect(res.body.course_code).toBe('spa_for_eng')
    expect(from).toHaveBeenCalledWith('course_seed_drafts')
  })
  // fetch() re-resolves dot segments before the request reaches the builder, so
  // spa_for_eng/../fra_for_eng is fra_for_eng upstream.
  it.each(['spa_for_eng/../fra_for_eng', 'spa_for_eng/%2e%2e/fra_for_eng', 'spa_for_eng/%2E./fra_for_eng', 'spa_for_eng/..%5Cfra_for_eng'])('refuses a dot-segment decoy: %s', async (segment) => {
    const { res, from } = await request(segment)
    expect(res.statusCode).toBe(400)
    expect(from).not.toHaveBeenCalled()
  })
  it('refuses when a later course in the body or query is not the editor’s', async () => {
    for (const extra of [{ body: { course_code: 'fra_for_eng' } }, { query: { course: 'fra_for_eng' } }]) {
      const { res, from } = await request('spa_for_eng', ['spa_for_eng'], extra)
      expect(res.statusCode).toBe(403)
      expect(from).not.toHaveBeenCalled()
    }
  })
})
