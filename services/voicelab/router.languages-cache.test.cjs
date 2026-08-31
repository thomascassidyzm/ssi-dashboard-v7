/**
 * THE HELD VIEW, AT THE ENDPOINT (Tom, 2026-08-31).
 *
 * "why is the page load so slow when getting all the voice for languages
 * information - this really does NOT change very often". Holding the built view
 * is only safe if the hold breaks the moment somebody casts — so this tests the
 * two halves together: GET is served from the hold, and a successful write
 * through the lab's router drops it.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import express from 'express'
import routerPkg from './router.cjs'
import registryPkg from './registry.cjs'
const { mount } = routerPkg

const COURSES = [{ course_code: 'deu_for_eng', target_lang: 'deu', known_lang: 'eng', voice_config: {} }]

let reads = 0

function stubSupabase () {
  const table = (name) => {
    const chain = {
      select: () => { reads += 1; return chain },
      eq: () => chain,
      in: () => chain,
      range: () => chain,
      limit: async () => ({ data: [], error: null }),
      maybeSingle: async () => ({ data: { voice_id: 'cartesia_probe', gender: 'f' } }),
      upsert: async () => ({ error: null }),
      then: (resolve) => resolve({ data: name === 'courses' ? COURSES : [], error: null }),
    }
    return chain
  }
  return { from: table }
}

let server, base

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  mount(app, {
    requireAdmin: async () => ({ email: 'test@ssi' }),
    requireDashboardUser: async () => ({ email: 'test@ssi' }),
    logger: { log: () => {} },
    supabase: stubSupabase,
  })
  await new Promise((r) => { server = app.listen(0, r) })
  base = `http://127.0.0.1:${server.address().port}`
})

afterAll(() => server && server.close())
beforeEach(() => { registryPkg.invalidate(); reads = 0 })

const languages = (qs = '') => fetch(`${base}/api/voicelab/languages${qs}`).then((r) => r.json())

describe('GET /api/voicelab/languages — the hold', () => {
  it('reads the DB once and serves the next caller from the hold', async () => {
    const first = await languages()
    const readsAfterFirst = reads
    expect(readsAfterFirst).toBeGreaterThan(0)
    expect(first.cached).toBe(false)

    const second = await languages()
    expect(reads).toBe(readsAfterFirst)
    expect(second.cached).toBe(true)
    expect(second.languages).toEqual(first.languages)
  })

  it('?refresh=1 — the Refresh button — goes back to the DB', async () => {
    await languages()
    const held = reads
    const forced = await languages('?refresh=1')
    expect(reads).toBeGreaterThan(held)
    expect(forced.cached).toBe(false)
  })

  it('a successful cast drops the hold, so the next load is fresh', async () => {
    await languages()
    const held = reads
    const res = await fetch(`${base}/api/voicelab/languages/deu/slot`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slot: 'phrase', gender: 'f', rank: 0, voiceId: 'cartesia_probe' }),
    })
    expect(res.status).toBe(200)
    const after = await languages()
    expect(after.cached).toBe(false)
    expect(reads).toBeGreaterThan(held)
  })
})
