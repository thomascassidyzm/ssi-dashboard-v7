// The admin:all front door (r-2026-10-14-kai-is-team-his-agents-get): a signed
// agent whose key carries admin:all reaches every /api/admin and /api/voicelab
// route as an attributed admin; narrower keys, other prefixes and unsigned calls
// get nothing new. Real express app, real signatures, no database.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { signHeader, createAgentAdminVerifier, agentFrontDoor, agentFromRequest, adminOrAgent, SCOPES } = require('./agent-admin-identity.cjs')

const secret = 'b'.repeat(64)
const quiet = { warn() {}, info() {}, log() {} }
const lines = []
const logger = { ...quiet, info: (m) => lines.push(m) }

function appFor(scopes) {
  const app = express()
  app.use(express.json())
  app.use(agentFrontDoor(createAgentAdminVerifier({ key: { secret, scopes }, logger }), { prefixes: ['/api/admin', '/api/voicelab'], logger }))
  // a stand-in for production-api's requireAdmin: agent first, else 403
  const requireAdmin = (req, res) => agentFromRequest(req) || (res.status(403).json({ error: 'Admin access required' }), null)
  app.get('/api/admin/thing', (req, res) => { const u = requireAdmin(req, res); if (u) res.json({ by: u.email, xAgentId: req.headers['x-agent-id'] }) })
  app.post('/api/voicelab/runs', (req, res) => { const u = requireAdmin(req, res); if (u) res.json({ by: u.email, body: req.body }) })
  app.put('/api/voicelab/languages/cat/slot', async (req, res) => {
    const u = await adminOrAgent(createAgentAdminVerifier({ key: { secret, scopes }, logger: quiet }), requireAdmin)(req, res, SCOPES.VOICE_SLOT_WRITE)
    if (u) res.json({ by: u.email })
  })
  app.get('/api/other/thing', (req, res) => res.json({ agent: !!req.agentAdmin }))
  return app
}

async function listen(app) {
  let server
  await new Promise((r) => { server = app.listen(0, r) })
  return { server, base: `http://127.0.0.1:${server.address().port}` }
}
const call = (base, method, path, body, agent = 'kai-watson') => {
  const header = signHeader({ secret, agentId: agent, method, path, body })
  return fetch(base + path, { method, headers: { 'x-agent-admin': header, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
}

describe('agent front door', () => {
  let all, narrow
  beforeAll(async () => { all = await listen(appFor([SCOPES.ADMIN_ALL])); narrow = await listen(appFor([SCOPES.VOICE_SLOT_WRITE])) })
  afterAll(() => { all.server.close(); narrow.server.close() })

  it('admin:all: a GET and a body-carrying POST pass as the named agent, and the id reaches x-agent-id', async () => {
    const g = await call(all.base, 'GET', '/api/admin/thing?x=1')
    expect(g.status).toBe(200)
    expect(await g.json()).toEqual({ by: 'agent:kai-watson', xAgentId: 'kai-watson' })
    expect(g.headers.get('x-agent-admin-by')).toBe('kai-watson')
    const p = await call(all.base, 'POST', '/api/voicelab/runs', { a: 1 })
    expect(p.status).toBe(200)
    expect((await p.json()).by).toBe('agent:kai-watson')
  })
  it('every call is logged with its identity and outcome', async () => {
    await call(all.base, 'GET', '/api/admin/thing')
    expect(lines.some((l) => /kai-watson GET \/api\/admin\/thing -> 200/.test(l))).toBe(true)
  })
  it('the existing slot door still works under the front door (no second signature check)', async () => {
    expect((await call(all.base, 'PUT', '/api/voicelab/languages/cat/slot', { v: 1 })).status).toBe(200)
    expect((await call(narrow.base, 'PUT', '/api/voicelab/languages/cat/slot', { v: 1 })).status).toBe(200)
  })
  it('a narrow key (voice-slot:write only) gets no other admin route', async () => {
    expect((await call(narrow.base, 'GET', '/api/admin/thing')).status).toBe(403)
    expect((await call(narrow.base, 'POST', '/api/voicelab/runs', { a: 1 })).status).toBe(403)
  })
  it('other prefixes are not opened: the header is ignored there', async () => {
    const r = await call(all.base, 'GET', '/api/other/thing')
    expect(await r.json()).toEqual({ agent: false })
  })
  it('a bad signature is answered at the door and never reaches the route; no header is untouched', async () => {
    const bad = await fetch(all.base + '/api/admin/thing', { headers: { 'x-agent-admin': 'v1.kai.1800000000.' + '0'.repeat(64) } })
    expect(bad.status).toBe(401)
    expect((await fetch(all.base + '/api/admin/thing')).status).toBe(403)
  })
  it('a captured header cannot be replayed or pointed at another route', async () => {
    const path = '/api/admin/thing'
    const h = signHeader({ secret, agentId: 'replay-probe', method: 'GET', path })
    expect((await fetch(all.base + path, { headers: { 'x-agent-admin': h } })).status).toBe(200)
    expect((await fetch(all.base + path, { headers: { 'x-agent-admin': h } })).status).toBe(401)
    const h2 = signHeader({ secret, agentId: 'replay-probe2', method: 'GET', path })
    expect((await fetch(all.base + '/api/voicelab/runs', { headers: { 'x-agent-admin': h2 } })).status).toBe(401)
  })
})
