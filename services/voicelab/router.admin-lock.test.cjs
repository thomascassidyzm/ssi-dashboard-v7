/**
 * THE VOICE LAB IS AN ADMIN ROOM (Tom, 2026-09-25, "fix both" on job #183).
 *
 * Its estate-wide reads answered any signed-in Popty user: a community
 * builder's token read /api/voicelab/languages and /pod-voices whole — every
 * language's voices, with the email addresses of the people behind them (four
 * and one respectively, measured against the live estate on 2026-09-25). A
 * builder needs exactly the consent doors, reached from the cast panel's
 * ConsentStep and the team page's CloneConfirm, and nothing else here.
 *
 * `requireAdmin` below refuses the way production-api's does for an editor; the
 * handlers are never reached for a locked route, so the stub DB is never read.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import routerPkg from './router.cjs'
const { mount } = routerPkg

let server
let base
let adminAsked = 0

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  mount(app, {
    requireAdmin: async (_req, res) => { adminAsked += 1; res.status(403).json({ error: 'Admin access required' }); return null },
    requireDashboardUser: async () => ({ email: 'builder@example.com', role: 'editor' }),
    logger: { log: () => {}, error: () => {}, warn: () => {} },
    supabase: () => { throw new Error('a locked route must not reach the database') },
  })
  await new Promise((r) => { server = app.listen(0, r) })
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(() => server && server.close())

describe('an editor is refused every estate-wide Voice Lab read', () => {
  it.each([
    '/api/voicelab/languages',
    '/api/voicelab/pod-voices',
    '/api/voicelab/speakers',
    '/api/voicelab/params',
    '/api/voicelab/courses',
    '/api/voicelab/runs',
    '/api/voicelab/pace',
  ])('GET %s → 403', async (path) => {
    const res = await fetch(base + path)
    expect(res.status).toBe(403)
  })
})

describe('the consent doors a builder needs stay open to them', () => {
  it('GET /consent-wording answers without asking for an admin', async () => {
    const before = adminAsked
    const res = await fetch(`${base}/api/voicelab/consent-wording`)
    expect(res.status).toBe(200)
    expect(adminAsked).toBe(before)
  })
})
