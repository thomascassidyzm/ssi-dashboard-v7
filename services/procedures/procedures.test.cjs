// The procedure front end's rules, asserted: only registered procedures, closed-choice inputs, Tom
// only, locked means refused, a change runs only off its own dry run, and a run is a unit of its own.
import { describe, it, expect } from 'vitest'
const registry = require('./registry.cjs')
const { mount, planMatches } = require('./router.cjs')
const { systemdRunArgv } = require('./runner.cjs')

const TOM = { email: 'thomas.cassidy+ssi@gmail.com', role: 'admin' }
const KAI = { email: 'kai@saysomethingin.com', role: 'admin' }

function harness(user, launched = []) {
  const routes = {}
  const app = { get: (p, h) => (routes[`GET ${p}`] = h), post: (p, h) => (routes[`POST ${p}`] = h) }
  const fakeRunner = {
    listRuns: async () => [],
    readRun: async () => null,
    readLog: () => ({ text: '', next: 0 }),
    launch: async (x) => { launched.push(x); return { id: 'r1', ...x.record } },
  }
  mount(app, { requireAdmin: async () => user, listCourses: async () => ['fra_for_eng', 'spa_for_eng'], logger: {}, runner: fakeRunner })
  const call = async (key, params = {}, body = {}) => {
    let status = 200, json
    const res = { status(s) { status = s; return res }, json(j) { json = j; return res } }
    await routes[key]({ params, body, query: {} }, res)
    return { status, json }
  }
  return { call, launched }
}

describe('procedures', () => {
  it('refuses an admin who is not an operator', async () => {
    const { call } = harness(KAI)
    expect((await call('GET /api/procedures')).status).toBe(403)
  })

  it('runs a report with a validated course and builds the argv itself', async () => {
    const { call, launched } = harness(TOM)
    const r = await call('POST /api/procedures/:id/run', { id: 'voice-door-dry-run' }, { inputs: { course: 'fra_for_eng' } })
    expect(r.status).toBe(202)
    expect(launched[0].argv).toEqual(['node', 'tools/tts-door-dry-run.cjs', 'fra_for_eng'])
  })

  it('refuses a course that is not live, an extra input, and an unknown procedure', async () => {
    const { call, launched } = harness(TOM)
    expect((await call('POST /api/procedures/:id/run', { id: 'voice-door-dry-run' }, { inputs: { course: 'xxx_for_eng' } })).status).toBe(400)
    expect((await call('POST /api/procedures/:id/run', { id: 'voice-door-dry-run' }, { inputs: { course: 'fra_for_eng', cmd: 'rm -rf /' } })).status).toBe(400)
    expect((await call('POST /api/procedures/:id/run', { id: 'anything' }, {})).status).toBe(404)
    expect(launched).toHaveLength(0)
  })

  it('refuses a locked procedure on the server', async () => {
    const { call } = harness(TOM)
    expect((await call('POST /api/procedures/:id/dry-run', { id: 'phrase-quality-apply' }, { inputs: { course: 'fra_for_eng' } })).status).toBe(423)
  })

  it('a change runs only off a fresh successful dry run of the same inputs', () => {
    const proc = { id: 'p', kind: 'change' }
    const plan = { procedure: 'p', mode: 'dry-run', state: 'ok', inputs: { course: 'fra_for_eng' }, startedAt: new Date().toISOString() }
    expect(planMatches(plan, proc, { course: 'fra_for_eng' })).toBeNull()
    expect(planMatches(null, proc, {})).toMatch(/dry run/)
    expect(planMatches(plan, proc, { course: 'spa_for_eng' })).toMatch(/inputs changed/)
    expect(planMatches({ ...plan, state: 'failed' }, proc, { course: 'fra_for_eng' })).toMatch(/did not succeed/)
    expect(planMatches({ ...plan, startedAt: new Date(Date.now() - 2 * 3600e3).toISOString() }, proc, { course: 'fra_for_eng' })).toMatch(/old/)
  })

  it('every unlocked procedure builds an argv; every change declares a dry run', () => {
    for (const p of registry.PROCEDURES.filter((x) => !x.locked)) {
      const inputs = Object.fromEntries(p.inputs.map((i) => [i.name, 'fra_for_eng']))
      expect(Array.isArray(p.command(inputs).argv)).toBe(true)
      if (p.kind === 'change') expect(typeof p.dryRun).toBe('function')
    }
  })

  it('a run is its own systemd unit in the worker slice, argv passed through untouched', () => {
    const a = systemdRunArgv({ runId: '20261012170000-abcdef', cwd: '/x', argv: ['node', 't.cjs', "a b;$(x)"], timeoutMin: 5 })
    expect(a).toContain('--unit=popty-proc-20261012170000-abcdef')
    expect(a).toContain('--slice=cs-workers.slice')
    expect(a).toContain('--property=RuntimeMaxSec=300')
    expect(a.slice(-3)).toEqual(['node', 't.cjs', "a b;$(x)"])
  })
})
