import { it, expect } from 'vitest'
import express from 'express'
import { createRequire } from 'module'
import { readFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
const { mount } = require('../voicelab/router.cjs')
const { signHeader, createAgentAdminVerifier, agentFrontDoor, agentFromRequest, SCOPES } = require('./agent-admin-identity.cjs')

it('the admin edit doors accept the Welsh course code used by the production edit engine', () => {
  const source = readFileSync(new URL('../production-api.cjs', import.meta.url), 'utf8')
  const literal = source.match(/const ADMIN_COURSE_CODE = \/([^\n]+)\//)[1]
  expect(new RegExp(literal).test('cym_nv2_for_eng')).toBe(true)
})

it('a signed agent must not authorise subsequent unsigned calls carrying the same arbitrary bearer', async () => {
  const secret = 'c'.repeat(64)
  const logger = { info() {}, warn() {}, log() {}, error() {} }
  const app = express()
  app.use(express.json())
  app.use(agentFrontDoor(createAgentAdminVerifier({ key: { secret, scopes: [SCOPES.ADMIN_ALL] }, logger }), { prefixes: ['/api/voicelab'], logger }))
  const gate = async (req, res) => agentFromRequest(req) || (res.status(403).json({ error: 'Admin access required' }), null)
  mount(app, { requireAdmin: gate, requireDashboardUser: gate, logger, supabase: () => { throw new Error('No database permitted in this test') } })
  app.get('/api/voicelab/lane-cache-probe', (_req, res) => res.json({ admitted: true }))
  let server
  await new Promise(resolve => { server = app.listen(0, resolve) })
  const url = `http://127.0.0.1:${server.address().port}/api/voicelab/lane-cache-probe`
  try {
    const signature = signHeader({ secret, agentId: 'lane-review', method: 'GET', path: '/api/voicelab/lane-cache-probe' })
    expect((await fetch(url, { headers: { authorization: 'Bearer arbitrary-invalid-token', 'x-agent-admin': signature } })).status).toBe(200)
    expect((await fetch(url, { headers: { authorization: 'Bearer arbitrary-invalid-token' } })).status).toBe(403)
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
})

it('the memo still serves a real login token, and never an agent-signed call', async () => {
  const { memoGate } = require('../voicelab/router.cjs')
  let calls = 0
  const gate = memoGate(async (req) => { calls++; return req.agentAdmin ? req.agentAdmin.user : { email: 'admin@x' } })
  const real = { headers: { authorization: 'Bearer real' } }
  expect(await gate(real, {})).toEqual({ email: 'admin@x' })
  expect(await gate({ headers: { authorization: 'Bearer real' } }, {})).toEqual({ email: 'admin@x' })
  expect(calls).toBe(1)
  const signed = { headers: { authorization: 'Bearer forged' }, agentAdmin: { user: { email: 'agent:x', viaAgentKey: true } } }
  await gate(signed, {})
  calls = 0
  await gate({ headers: { authorization: 'Bearer forged' } }, {})
  expect(calls).toBe(1)
})
