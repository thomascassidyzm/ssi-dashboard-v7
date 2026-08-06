/**
 * Unit tests: PATCH /api/algorithm-config.
 *
 * The behaviour under test is the 2026-08-06 change from .update().eq('key')
 * to .upsert({key,...}). The old handler 404'd for a key that did not exist
 * yet, which made "add a learning mode" an engineering ticket (a hand-written
 * SQL insert) instead of an admin action. Creating `easy_mode` was exactly
 * that case, so the create path is the thing worth pinning down.
 *
 * Run: npx vitest run api/algorithm-config.test.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const upsert = vi.fn()
const from = vi.fn(() => ({ upsert }))
const verifySupabaseJWT = vi.fn()

vi.mock('./lib/supabase.js', () => ({ getSupabase: () => ({ from }) }))
vi.mock('./lib/auth.js', () => ({ verifySupabaseJWT: (...a) => verifySupabaseJWT(...a) }))

const { default: handler } = await import('./algorithm-config.js')

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    setHeader: vi.fn(),
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
    end() { return this },
  }
  return res
}

/** The chain .upsert(...).select().single() resolving to {data,error}. */
function upsertResolves(result) {
  upsert.mockReturnValue({ select: () => ({ single: async () => result }) })
}

const patchReq = (body, token = 'good-token') => ({
  method: 'PATCH',
  headers: { authorization: `Bearer ${token}` },
  body,
})

beforeEach(() => {
  vi.clearAllMocks()
  verifySupabaseJWT.mockResolvedValue({ email: 'kai@saysomethingin.com' })
})

describe('PATCH — creating a row that does not exist yet', () => {
  it('creates easy_mode on its very first save instead of 404ing', async () => {
    const row = { key: 'easy_mode', config: { pause_boot_ms: 4000 } }
    upsertResolves({ data: row, error: null })

    const res = mockRes()
    await handler(patchReq({ key: 'easy_mode', config: { pause_boot_ms: 4000 } }), res)

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ row })
    expect(from).toHaveBeenCalledWith('algorithm_config')
  })

  it('sends the key in the payload and conflicts on it, so an existing row updates in place', async () => {
    upsertResolves({ data: { key: 'fast_mode' }, error: null })
    await handler(patchReq({ key: 'fast_mode', config: { a: 1 } }), mockRes())

    const [payload, options] = upsert.mock.calls[0]
    expect(payload.key).toBe('fast_mode')
    expect(payload.config).toEqual({ a: 1 })
    expect(payload.updated_by).toBe('kai@saysomethingin.com')
    expect(payload.updated_at).toEqual(expect.any(String))
    expect(options).toEqual({ onConflict: 'key' })
  })
})

describe('PATCH — the guards the upsert must not have loosened', () => {
  it('still rejects an unauthenticated write', async () => {
    const res = mockRes()
    await handler({ method: 'PATCH', headers: {}, body: { key: 'easy_mode', config: {} } }, res)
    expect(res.statusCode).toBe(401)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('still rejects an invalid token', async () => {
    verifySupabaseJWT.mockResolvedValue(null)
    const res = mockRes()
    await handler(patchReq({ key: 'easy_mode', config: {} }, 'bad'), res)
    expect(res.statusCode).toBe(401)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('rejects a missing or non-string key', async () => {
    const res = mockRes()
    await handler(patchReq({ config: {} }), res)
    expect(res.statusCode).toBe(400)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('rejects a config that is not a plain object', async () => {
    for (const config of [undefined, [1, 2], 'nope']) {
      const res = mockRes()
      await handler(patchReq({ key: 'easy_mode', config }), res)
      expect(res.statusCode).toBe(400)
    }
    expect(upsert).not.toHaveBeenCalled()
  })

  it('surfaces a database error as a 500 rather than a silent success', async () => {
    upsertResolves({ data: null, error: { message: 'RLS denied' } })
    const res = mockRes()
    await handler(patchReq({ key: 'easy_mode', config: {} }), res)
    expect(res.statusCode).toBe(500)
    expect(res.body.error).toBe('RLS denied')
  })
})
