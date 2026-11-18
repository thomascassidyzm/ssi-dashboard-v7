// Run: npx vitest run src/composables/adminApi.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({ getApiUrl: () => 'http://machine.invalid' }))
vi.mock('@/composables/useAuth', () => ({ useAuth: () => ({ getAccessToken: async () => 'tok-1' }) }))

import { postAdminJson, getAdminJson } from './adminApi'

function respond(status, body, json = true) {
  return { ok: status < 300, status, json: json ? async () => body : async () => { throw new Error('not json') } }
}

beforeEach(() => { globalThis.fetch = vi.fn() })

describe('postAdminJson', () => {
  it('posts the body as JSON with the session bearer and returns the parsed reply', async () => {
    fetch.mockResolvedValue(respond(200, { ok: true, id: 7 }))
    await expect(postAdminJson('/api/release-notes/generate', { version: '1.2' })).resolves.toEqual({ ok: true, id: 7 })
    expect(fetch).toHaveBeenCalledWith('http://machine.invalid/api/release-notes/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-1' },
      body: '{"version":"1.2"}',
    })
  })

  it("throws the server's error on a non-2xx", async () => {
    fetch.mockResolvedValue(respond(403, { error: 'admin only' }))
    await expect(postAdminJson('/api/x', {})).rejects.toThrow('admin only')
  })

  it('throws the HTTP status when the error body is not JSON', async () => {
    fetch.mockResolvedValue(respond(502, null, false))
    await expect(postAdminJson('/api/x', {})).rejects.toThrow('HTTP 502')
  })
})

describe('getAdminJson', () => {
  it('GETs with the session bearer only — no body, no content-type — and returns the parsed reply', async () => {
    fetch.mockResolvedValue(respond(200, { latest: { id: 3 } }))
    await expect(getAdminJson('/api/insight-discovery/latest?source=real')).resolves.toEqual({ latest: { id: 3 } })
    expect(fetch).toHaveBeenCalledWith('http://machine.invalid/api/insight-discovery/latest?source=real', {
      method: 'GET',
      headers: { Authorization: 'Bearer tok-1' },
    })
  })

  it('shares the POST error contract: server error, then HTTP status', async () => {
    fetch.mockResolvedValueOnce(respond(401, { error: 'no session' }))
    await expect(getAdminJson('/api/auth/me')).rejects.toThrow('no session')
    fetch.mockResolvedValueOnce(respond(503, null, false))
    await expect(getAdminJson('/api/auth/me')).rejects.toThrow('HTTP 503')
  })
})
