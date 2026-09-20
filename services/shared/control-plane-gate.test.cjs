/**
 * The proof for the 2026-09-20 funnel finding: production-api is exposed to
 * the public internet by Tailscale Funnel, and its control plane — deploy,
 * pm2 restart, agent kill, host telemetry — was answering anonymous callers.
 *
 * Like content-edit-gate.test.cjs these drive a REAL express app over a REAL
 * loopback socket, because the distinction the gate turns on (same-host mesh
 * caller vs a request that arrived through the funnel) lives in the socket and
 * the headers. The funnelled case is reproduced with the header Tailscale was
 * observed to add verbatim: `X-Forwarded-For: <public client ip>`.
 *
 * The last case is a drift test over production-api.cjs itself: it names the
 * routes that must carry the gate. It fails the moment one loses it again.
 *
 * Run: npx vitest run services/shared/control-plane-gate
 */
import { describe, it, expect } from 'vitest'

const express = require('express')
const http = require('http')
const fs = require('fs')
const path = require('path')
const { createControlPlaneGate, loopbackOnly } = require('./control-plane-gate.cjs')

// The real predicate from production-api.cjs, copied verbatim so the test
// exercises the shape of request it actually sees.
function isLoopbackDirectRequest(req) {
  const addr = req.socket?.remoteAddress || ''
  const isLoopback = addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1'
  return isLoopback && !req.headers['x-forwarded-for'] && !req.headers['x-real-ip']
}

async function withServer(app, fn) {
  const server = http.createServer(app)
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  try {
    return await fn(server.address().port)
  } finally {
    await new Promise((r) => server.close(r))
  }
}

function buildApp({ adminUser = null } = {}) {
  const app = express()
  const requireAdmin = async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) { res.status(401).json({ error: 'Authentication required' }); return null }
    if (!adminUser) { res.status(403).json({ error: 'Admin access required' }); return null }
    return adminUser
  }
  const gate = createControlPlaneGate({ isLoopbackDirect: isLoopbackDirectRequest, requireAdmin })
  app.post('/api/deploy', gate, (req, res) => res.json({ deployed: true }))
  app.post('/api/production/internal/emit', loopbackOnly(isLoopbackDirectRequest),
    (req, res) => res.json({ emitted: true }))
  return app
}

const get = (port, p, headers = {}) =>
  fetch(`http://127.0.0.1:${port}${p}`, { method: 'POST', headers })
    .then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }))

describe('control-plane gate', () => {
  it('lets a same-host mesh caller through untouched', async () => {
    await withServer(buildApp(), async (port) => {
      const r = await get(port, '/api/deploy')
      expect(r.status).toBe(200)
      expect(r.body).toEqual({ deployed: true })
    })
  })

  it('refuses an anonymous request that arrived through the funnel', async () => {
    await withServer(buildApp(), async (port) => {
      // Exactly what Tailscale Funnel adds to a public request.
      const r = await get(port, '/api/deploy', { 'x-forwarded-for': '62.238.49.218' })
      expect(r.status).toBe(401)
      expect(r.body.error).toMatch(/Authentication required/)
    })
  })

  it('refuses a funnelled caller who is authenticated but not an admin', async () => {
    await withServer(buildApp({ adminUser: null }), async (port) => {
      const r = await get(port, '/api/deploy', {
        'x-forwarded-for': '62.238.49.218',
        authorization: 'Bearer editor-token',
      })
      expect(r.status).toBe(403)
    })
  })

  it('admits a funnelled admin', async () => {
    await withServer(buildApp({ adminUser: { email: 'tom@example.com', role: 'admin' } }), async (port) => {
      const r = await get(port, '/api/deploy', {
        'x-forwarded-for': '62.238.49.218',
        authorization: 'Bearer admin-token',
      })
      expect(r.status).toBe(200)
    })
  })

  it('internal/emit answers loopback and refuses the funnel outright', async () => {
    await withServer(buildApp(), async (port) => {
      expect((await get(port, '/api/production/internal/emit')).status).toBe(200)
      const funnelled = await get(port, '/api/production/internal/emit', {
        'x-forwarded-for': '62.238.49.218',
        authorization: 'Bearer admin-token',
      })
      expect(funnelled.status).toBe(403)
    })
  })
})

describe('production-api control-plane routes carry a gate', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'production-api.cjs'), 'utf8')

  // Registered with the gate as middleware.
  const MIDDLEWARE_GATED = [
    "app.get('/api/services', requireAdminOrLoopback",
    "app.post('/api/services/:name/restart', requireAdminOrLoopback",
    "app.get('/api/services/:name/logs', requireAdminOrLoopback",
    "app.post('/api/deploy', requireAdminOrLoopback",
    "app.post('/api/deploy/repair', requireAdminOrLoopback",
    "app.get('/api/deploy/history', requireAdminOrLoopback",
    "app.post('/api/production/internal/emit', requireSameHost",
  ]
  it.each(MIDDLEWARE_GATED)('%s', (needle) => {
    expect(src.includes(needle)).toBe(true)
  })

  // Gated by a requireAdmin call on the handler's first line.
  const ADMIN_FIRST_LINE = [
    "app.get('/api/admin/agents', async (req, res) => {",
    "app.post('/api/admin/agents/kill', async (req, res) => {",
    "app.post('/api/admin/agents/kill-all', async (req, res) => {",
    "app.get('/api/admin/system', async (req, res) => {",
    "app.get('/api/admin/pm2', async (req, res) => {",
    "app.get('/api/admin/system-health', async (req, res) => {",
  ]
  it.each(ADMIN_FIRST_LINE)('%s requires an admin', (decl) => {
    const at = src.indexOf(decl)
    expect(at).toBeGreaterThan(-1)
    const firstLine = src.slice(at + decl.length, at + decl.length + 60)
    expect(firstLine).toMatch(/if \(!await requireAdmin\(req, res\)\) return/)
  })
})
