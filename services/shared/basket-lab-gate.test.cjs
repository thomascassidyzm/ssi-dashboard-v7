/**
 * Basket Lab is admin-only (Tom, 2026-09-25: "Lock it, shouldn't be public").
 * A REAL express app on a REAL loopback socket, with the lab mounted exactly
 * as production-api mounts it; the funnelled caller is reproduced with the
 * X-Forwarded-For header Tailscale adds (as in control-plane-gate.test.cjs).
 *
 * Run: npx vitest run services/shared/basket-lab-gate
 */
import { describe, it, expect } from 'vitest'
const express = require('express')
const http = require('http')
const fs = require('fs')
const path = require('path')
const { createBasketLabGate } = require('./basket-lab-gate.cjs')

function isLoopbackDirectRequest(req) {
  const addr = req.socket?.remoteAddress || ''
  const isLoopback = addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1'
  return isLoopback && !req.headers['x-forwarded-for'] && !req.headers['x-real-ip']
}

function buildApp() {
  const app = express()
  const requireAdmin = async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) { res.status(401).json({ error: 'Authentication required' }); return null }
    if (token !== 'admin-token') { res.status(403).json({ error: 'Admin access required' }); return null }
    return { email: 'admin@example.test', role: 'admin' }
  }
  const g = createBasketLabGate({ isLoopbackDirect: isLoopbackDirectRequest, requireAdmin })
  app.post('/api/basket-lab-ticket', g.mintTicket)
  app.use('/api/basket-lab', g.gate, (req, res) => res.end(`lab:${req.url}`))
  return app
}

async function withServer(fn) {
  const server = http.createServer(buildApp())
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  try { return await fn(`http://127.0.0.1:${server.address().port}`) } finally { await new Promise((r) => server.close(r)) }
}
const FUNNEL = { 'x-forwarded-for': '203.0.113.9' }

describe('basket lab gate', () => {
  it('refuses a signed-out request that arrived through the funnel', () => withServer(async (u) => {
    for (const p of ['/api/basket-lab/lab', '/api/basket-lab/lab/courses', '/api/basket-lab/lab/grid']) {
      const r = await fetch(u + p, { headers: FUNNEL })
      expect(r.status).toBe(401)
      expect(await r.text()).not.toMatch(/^lab:/)
    }
  }))
  it('refuses a signed-in non-admin', () => withServer(async (u) => {
    const r = await fetch(u + '/api/basket-lab/lab', { headers: { ...FUNNEL, authorization: 'Bearer editor-token' } })
    expect(r.status).toBe(403)
    const t = await fetch(u + '/api/basket-lab-ticket', { method: 'POST', headers: { ...FUNNEL, authorization: 'Bearer editor-token' } })
    expect(t.status).toBe(403)
  }))
  it('admits an admin by header', () => withServer(async (u) => {
    const r = await fetch(u + '/api/basket-lab/lab/courses', { headers: { ...FUNNEL, authorization: 'Bearer admin-token' } })
    expect(r.status).toBe(200)
    expect(await r.text()).toBe('lab:/lab/courses')
  }))
  it('admits the admin\'s iframe: ticket → /enter → cookie → lab', () => withServer(async (u) => {
    const { ticket } = await (await fetch(u + '/api/basket-lab-ticket', { method: 'POST', headers: { ...FUNNEL, authorization: 'Bearer admin-token' } })).json()
    const enter = await fetch(`${u}/api/basket-lab/enter?t=${encodeURIComponent(ticket)}&next=${encodeURIComponent('/lab?seed=3')}`, { headers: FUNNEL, redirect: 'manual' })
    expect(enter.status).toBe(302)
    expect(enter.headers.get('location')).toBe('/api/basket-lab/lab?seed=3')
    const cookie = enter.headers.get('set-cookie').split(';')[0]
    expect(enter.headers.get('set-cookie')).toMatch(/HttpOnly/)
    const r = await fetch(u + '/api/basket-lab/lab?seed=3', { headers: { ...FUNNEL, cookie } })
    expect(r.status).toBe(200)
  }))
  it('refuses a forged ticket and a forged cookie', () => withServer(async (u) => {
    const e = await fetch(`${u}/api/basket-lab/enter?t=9999999999999.YQ.forged`, { headers: FUNNEL, redirect: 'manual' })
    expect(e.status).toBe(401)
    const r = await fetch(u + '/api/basket-lab/lab', { headers: { ...FUNNEL, cookie: 'bl_session=9999999999999.YQ.forged' } })
    expect(r.status).toBe(401)
  }))
  it('lets a same-host caller through', () => withServer(async (u) => {
    expect((await fetch(u + '/api/basket-lab/lab')).status).toBe(200)
  }))
})

describe('production-api mounts the lab behind the gate', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'production-api.cjs'), 'utf8')
  it('every /api/basket-lab mount carries basketLabGate.gate', () => {
    const mounts = src.split('\n').filter((l) => /app\.use\('\/api\/basket-lab'/.test(l))
    expect(mounts.length).toBeGreaterThan(0)
    for (const l of mounts) expect(l).toContain("app.use('/api/basket-lab', basketLabGate.gate,")
  })
})
