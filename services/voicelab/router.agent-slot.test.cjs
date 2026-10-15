/**
 * THE AGENT DOOR IS ONE ROUTE WIDE (job #445, Tom 2026-10-14): a signed agent
 * holding voice-slot:write may PUT a cast slot; it gets nothing else in the lab,
 * and without the header the admin gate still rules.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import routerPkg from './router.cjs'
const { mount } = routerPkg

let server, base
const agentScopes = []
beforeAll(async () => {
  const app = express()
  app.use(express.json())
  mount(app, {
    requireAdmin: async (_req, res) => { res.status(403).json({ error: 'Admin access required' }); return null },
    requireAdminOrAgent: async (req, _res, scope) => { agentScopes.push(scope); req.agentAdmin = { user: { email: 'agent:t' } }; return req.agentAdmin.user },
    requireDashboardUser: async () => null,
    logger: { log: () => {}, error: () => {}, warn: () => {} },
    supabase: () => { throw new Error('stop here') },
  })
  await new Promise((r) => { server = app.listen(0, r) })
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(() => server && server.close())

const H = { 'x-agent-admin': 'v1.x', 'content-type': 'application/json' }
describe('agent door', () => {
  it('PUT slot passes the edge with an agent header', async () => {
    const r = await fetch(`${base}/api/voicelab/languages/cat/slot`, { method: 'PUT', headers: H, body: '{}' })
    expect(r.status).not.toBe(403)
    expect(agentScopes).toEqual(['voice-slot:write'])
  })
  it('without the header, admin still rules', async () => {
    const r = await fetch(`${base}/api/voicelab/languages/cat/slot`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{}' })
    expect(r.status).toBe(403)
  })
  it('the header opens no other route', async () => {
    const r = await fetch(`${base}/api/voicelab/languages/cat/slot?slot=phrase&gender=f&rank=0`, { method: 'DELETE', headers: H })
    expect(r.status).toBe(403)
    const g = await fetch(`${base}/api/voicelab/languages`, { headers: H })
    expect(g.status).toBe(403)
  })
})
