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
