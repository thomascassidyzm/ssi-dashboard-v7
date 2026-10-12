import { afterEach, describe, expect, it, vi } from 'vitest'
const fs = require('node:fs')
const vm = require('node:vm')
const createRouter = require('./course-builder/routes/activity.cjs')
const source = fs.readFileSync(require.resolve('./production-api.cjs'), 'utf8')
const gateSource = source.slice(source.indexOf('const PROXY_COURSE_CODE_RE ='), source.indexOf('// Generic proxy function for course-builder routes'))

afterEach(() => vi.restoreAllMocks())

async function request(method, path, { user = { role: 'editor' }, body = {}, query = {}, loopback = false } = {}) {
  const kill = vi.spyOn(process, 'kill').mockReturnValue(true)
  const ctx = { activeAgents: new Map([[4242, { courseCode: 'fra_for_eng', status: 'running', submissions: [] }]]) }
  const router = createRouter(ctx)
  const gate = vm.runInNewContext(`${gateSource}\nrequireProxyCourseAccess`, {
    isLoopbackDirectRequest: () => loopback,
    resolveDashboardUserCached: async () => user,
    userCanAccessCourse: (_, code) => code === 'spa_for_eng',
    logger: { warn() {}, error() {} },
  })
  const req = { method, path, url: path, body, query, headers: {} }
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this } }
  await new Promise((resolve, reject) => {
    res.json = function(data) { this.body = data; resolve() }
    gate(req, res, () => router.handle(req, res, reject)).catch(reject)
  })
  return { res, kill, ctx }
}

describe('builder agent controls are restricted to administrators and host callbacks', () => {
  it.each([
    ['GET', '/agents', {}],
    ['DELETE', '/agents/4242', {}],
    ['POST', '/agents/4242/complete', {}],
    ['POST', '/agents/4242/submission', { seed_number: 1 }],
    ['POST', '/agents/register', { pid: 4242, course_code: 'spa_for_eng' }],
    ['DELETE', '/AGENTS/4242', { course_code: 'spa_for_eng' }],
  ])('denies editor %s %s even with their own course supplied', async (method, path, body) => {
    const { res, kill, ctx } = await request(method, path, { body, query: { course: 'spa_for_eng' } })
    expect(res.statusCode).toBe(403)
    expect(kill).not.toHaveBeenCalled()
    expect(ctx.activeAgents.get(4242)).toMatchObject({ courseCode: 'fra_for_eng', status: 'running', submissions: [] })
  })
  it.each([{ role: 'admin' }, { role: 'editor', ssiAdmin: true }])('preserves administrator controls for %j', async user => {
    const { res, kill } = await request('DELETE', '/agents/4242', { user })
    expect(res.statusCode).toBe(200)
    expect(kill).toHaveBeenCalledWith(4242, 'SIGTERM')
  })
  it('preserves host callbacks', async () => {
    const { res } = await request('POST', '/agents/4242/complete', { loopback: true, user: null })
    expect(res.statusCode).toBe(200)
  })
})
