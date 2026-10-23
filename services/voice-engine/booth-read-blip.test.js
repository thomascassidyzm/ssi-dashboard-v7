// Job #917 (Aran, 2026-10-23): staging's booth refused or half-filed takes during short Supabase read
// blips ("booth key read failed: TypeError: fetch failed"; a take saved but filed as 'no_course').
// A failed read now falls back to the last good one for up to 10 minutes — and never further: a key
// that a fresh read shows revoked is refused, and a failure with nothing to fall back on is not a 200.
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const boothLinks = require('./booth-link-keys.cjs')
const { createLastGoodCache } = require('../shared/last-good-cache.cjs')
const { planScriptTakeFiling, isRetryableFilingFailure } = require('../script-take-filing.cjs')

const QUIET = { log() {}, info() {}, warn() {}, error() {} }
const VOICE = 'human_aran_cym_n'
const SECRET = 'test-secret'

/** booth_link_keys over a switch: state.down makes every read answer like a fetch failure. */
function keyDb(state) {
  return {
    from() {
      const q = {
        select() { return q },
        eq() { return q },
        maybeSingle() {
          if (state.down) return Promise.resolve({ data: null, error: { message: 'TypeError: fetch failed' } })
          return Promise.resolve({ data: state.row, error: null })
        },
      }
      return q
    },
  }
}

function rowFor(nonce) {
  const token = boothLinks.deriveToken(SECRET, VOICE, nonce)
  return { token, row: { voice_id: VOICE, key_hash: boothLinks.hashKey(token), nonce, created_by: 't', created_at: 'x' } }
}

function harness() {
  let t = 1_000_000
  const clock = { now: () => t, advance: (ms) => { t += ms } }
  const a = rowFor('nonce-a')
  const state = { down: false, row: a.row }
  const store = boothLinks.createBoothKeyStore({ getDb: () => keyDb(state), secret: SECRET, now: clock.now, logger: QUIET })
  const gate = boothLinks.createBoothKeyGate({ store, isGodAdmin: () => false, grace: false, logger: QUIET, now: clock.now })
  async function call(key) {
    const req = { params: { voiceId: VOICE }, query: {}, headers: { 'x-booth-key': key }, originalUrl: `/voice/${VOICE}/take`, method: 'POST', path: '/take' }
    const out = { next: false }
    const res = { status(c) { out.status = c; return res }, json(b) { out.body = b; return res } }
    await gate(req, res, () => { out.next = true })
    return out
  }
  return { clock, state, call, tokenA: a.token }
}

describe('booth key gate through a read blip (grace mode OFF)', () => {
  it('a known key is still accepted when the key read fails, within 10 minutes of the last good read', async () => {
    const h = harness()
    expect((await h.call(h.tokenA)).next).toBe(true)
    h.state.down = true
    h.clock.advance(boothLinks.KEY_TTL_MS + 1000) // past the 60 s cache: this is a real re-read, and it fails
    expect((await h.call(h.tokenA)).next).toBe(true)
    h.clock.advance(5 * 60 * 1000)
    expect((await h.call(h.tokenA)).next).toBe(true)
  })

  it('a wrong key is still refused during the blip', async () => {
    const h = harness()
    await h.call(h.tokenA)
    h.state.down = true
    h.clock.advance(boothLinks.KEY_TTL_MS + 1000)
    const r = await h.call('not-the-key')
    expect(r.next).toBe(false)
    expect(r.status).toBe(403)
  })

  it('past the 10-minute grace a failed read fails closed (503), as before', async () => {
    const h = harness()
    await h.call(h.tokenA)
    h.state.down = true
    h.clock.advance(boothLinks.KEY_GRACE_MS + 1000)
    const r = await h.call(h.tokenA)
    expect(r.next).toBe(false)
    expect(r.status).toBe(503)
  })

  it('a key revoked (rotated) in the database is refused as soon as a fresh read succeeds', async () => {
    const h = harness()
    await h.call(h.tokenA)
    h.state.row = rowFor('nonce-b').row // rotated by another process
    h.clock.advance(boothLinks.KEY_TTL_MS + 1000)
    expect((await h.call(h.tokenA)).status).toBe(403)
    // ...and a blip afterwards falls back to the NEW row, so the old key stays refused.
    h.state.down = true
    h.clock.advance(boothLinks.KEY_TTL_MS + 1000)
    expect((await h.call(h.tokenA)).status).toBe(403)
  })

  it('a key deleted in the database is refused once a fresh read succeeds, and stays refused through a blip', async () => {
    const h = harness()
    await h.call(h.tokenA)
    h.state.row = null
    h.clock.advance(boothLinks.KEY_TTL_MS + 1000)
    expect((await h.call(h.tokenA)).status).toBe(403)
    h.state.down = true
    h.clock.advance(boothLinks.KEY_TTL_MS + 1000)
    expect((await h.call(h.tokenA)).status).toBe(403)
  })
})

describe('last-good cache', () => {
  it('reads fresh every time, falls back only on a throw, only within grace', async () => {
    let t = 0
    const c = createLastGoodCache({ graceMs: 1000, now: () => t, logger: QUIET })
    let calls = 0
    expect(await c.read('k', async () => { calls++; return 'v1' })).toBe('v1')
    expect(await c.read('k', async () => { calls++; return 'v2' })).toBe('v2')
    expect(calls).toBe(2)
    t = 900
    expect(await c.read('k', async () => { throw new Error('fetch failed') })).toBe('v2')
    t = 1200
    await expect(c.read('k', async () => { throw new Error('fetch failed') })).rejects.toThrow('fetch failed')
  })

  it('a successful "not found" replaces the good value, so a removed row is not resurrected by a blip', async () => {
    const c = createLastGoodCache({ logger: QUIET })
    await c.read('k', async () => ({ voiceId: 'x' }))
    await c.read('k', async () => null)
    expect(await c.read('k', async () => { throw new Error('blip') })).toBe(null)
  })
})

describe('filing verdict when the course row could not be read', () => {
  const metadata = { role: 'target2', text: 'un fi ydy hwnnw' }
  it('a failed course read is course_read_failed, which the booth resends', () => {
    const plan = planScriptTakeFiling({ metadata, voiceId: VOICE, course: null, courseReadFailed: true })
    expect(plan.filing.reason).toBe('course_read_failed')
    expect(isRetryableFilingFailure({ filed: false, ...plan.filing })).toBe(true)
  })
  it('a course that is genuinely missing stays no_course, which resending would not fix', () => {
    const plan = planScriptTakeFiling({ metadata, voiceId: VOICE, course: null })
    expect(plan.filing.reason).toBe('no_course')
    expect(isRetryableFilingFailure({ filed: false, ...plan.filing })).toBe(false)
  })
})
