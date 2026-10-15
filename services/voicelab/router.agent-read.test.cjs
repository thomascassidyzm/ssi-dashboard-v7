/**
 * THE READ-ONLY AGENT DOOR (job #748, Tom 2026-10-15): a same-host agent naming itself with
 * x-agent-id may READ the voice catalogue (#739 was refused "Authentication required" on it while
 * the same header could render audio). It reaches nothing that writes or spends, and nothing off
 * the funnel.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import routerPkg from './router.cjs'
const { mount } = routerPkg

let server, base
beforeAll(async () => {
  delete process.env.CARTESIA_API_KEY   // the params read must not reach the vendor from a test
  const app = express()
  app.use(express.json())
  const refuse = async (_req, res) => { res.status(401).json({ error: 'Authentication required' }); return null }
  mount(app, {
    requireAdmin: refuse,
    requireAdminOrAgent: refuse,
    requireDashboardUser: refuse,
    logger: { log: () => {}, error: () => {}, warn: () => {}, info: () => {} },
    // the reader got past the gate if the route reaches its data source
    supabase: () => { throw Object.assign(new Error('reached the data'), { status: 418 }) },
  })
  await new Promise((r) => { server = app.listen(0, '127.0.0.1', r) })
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(() => server && server.close())

const AGENT = { 'x-agent-id': 'cs-748-probe' }
describe('read-only agent door on the voice catalogue', () => {
  it('a same-host agent with x-agent-id reads the voice catalogue (params)', async () => {
    const r = await fetch(`${base}/api/voicelab/params`, { headers: AGENT })
    expect(r.status).not.toBe(401)
  })
  it('without x-agent-id the dashboard gate still rules', async () => {
    const r = await fetch(`${base}/api/voicelab/params`)
    expect(r.status).toBe(401)
  })
  it('a forwarded (funnel) request is not same-host', async () => {
    const r = await fetch(`${base}/api/voicelab/params`, { headers: { ...AGENT, 'x-forwarded-for': '203.0.113.9' } })
    expect(r.status).toBe(401)
  })
  it('the lists carrying people\'s emails stay admin-only (#183)', async () => {
    for (const p of ['/api/voicelab/languages', '/api/voicelab/pod-voices']) {
      const r = await fetch(`${base}${p}`, { headers: AGENT })
      expect(r.status).toBe(401)
    }
  })
  it('the door opens no write or spend route', async () => {
    const r = await fetch(`${base}/api/voicelab/languages/cym/samples/prepare`, { method: 'POST', headers: { ...AGENT, 'content-type': 'application/json' }, body: '{}' })
    expect(r.status).toBe(401)
  })
})
