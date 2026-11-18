// @vitest-environment jsdom
// Job #98: the SPA has ONE api-base resolver and ONE timed fetch, in this module.
// Pins every branch of the base-URL chain (including the production store's
// nullOnHosted fence) and that fetchWithTimeout aborts after exactly N ms.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getApiUrl, getApiBaseUrl, getProductionApiUrl, fetchWithTimeout, LONG_OPERATION_TIMEOUT_MS } from './api'

function setHost(hostname) {
  Object.defineProperty(window, 'location', { value: { hostname }, writable: true, configurable: true })
}

describe('getApiBaseUrl: one resolution chain', () => {
  beforeEach(() => { localStorage.clear(); vi.spyOn(console, 'warn').mockImplementation(() => {}) })
  afterEach(() => { vi.restoreAllMocks() })

  it('localStorage override wins everywhere, with or without the hosted fence', () => {
    localStorage.setItem('api_base_url', 'https://dev-box:8443')
    for (const host of ['localhost', 'popty.app', 'x.vercel.app', 'elsewhere.example']) {
      setHost(host)
      expect(getApiUrl()).toBe('https://dev-box:8443')
      expect(getApiBaseUrl()).toBe('https://dev-box:8443')
      expect(getApiBaseUrl({ nullOnHosted: true })).toBe('https://dev-box:8443')
    }
  })

  it('localhost and 127.0.0.1 resolve to the local production API', () => {
    for (const host of ['localhost', '127.0.0.1']) {
      setHost(host)
      expect(getApiBaseUrl()).toBe('http://localhost:3470')
      expect(getApiBaseUrl({ nullOnHosted: true })).toBe('http://localhost:3470')
      expect(getProductionApiUrl()).toBe('http://localhost:3470')
    }
  })

  it('popty.app defaults to watson-1, unless the caller asked for the hosted fence', () => {
    setHost('popty.app')
    expect(getApiUrl()).toBe('https://watson-1.tail4968cb.ts.net:8443')
    expect(getApiBaseUrl()).toBe('https://watson-1.tail4968cb.ts.net:8443')
    expect(getApiBaseUrl({ nullOnHosted: true })).toBeNull()
  })

  it('the hosted fence also covers *.popty.app and *.vercel.app', () => {
    for (const host of ['staging.popty.app', 'popty-git-main.vercel.app']) {
      setHost(host)
      expect(getApiBaseUrl({ nullOnHosted: true })).toBeNull()
      expect(getApiBaseUrl()).toBe('')
    }
  })

  it('unknown static hosting returns empty and warns', () => {
    setHost('elsewhere.example')
    expect(getApiBaseUrl()).toBe('')
    expect(getApiBaseUrl({ nullOnHosted: true })).toBe('')
    expect(console.warn).toHaveBeenCalled()
  })
})

describe('fetchWithTimeout: aborts the AbortController after N ms', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  function fetchThatWaitsForAbort() {
    const seen = {}
    globalThis.fetch = vi.fn((url, init) => new Promise((resolve, reject) => {
      seen.signal = init.signal
      seen.init = init
      init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    }))
    return seen
  }

  it('the default budget is one hour (the production store call sites pass nothing)', async () => {
    expect(LONG_OPERATION_TIMEOUT_MS).toBe(3600000)
    const seen = fetchThatWaitsForAbort()
    const p = fetchWithTimeout('http://x/api/production/c/audio-pipeline/start', { method: 'POST' })
    const outcome = p.then(() => 'ok', e => e.name)
    await vi.advanceTimersByTimeAsync(3600000 - 1)
    expect(seen.signal.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(seen.signal.aborted).toBe(true)
    expect(await outcome).toBe('AbortError')
    expect(seen.init.method).toBe('POST')
  })

  it('an explicit budget fires at exactly that many ms', async () => {
    const seen = fetchThatWaitsForAbort()
    const outcome = fetchWithTimeout('http://x/y', {}, 250).then(() => 'ok', e => e.name)
    await vi.advanceTimersByTimeAsync(249)
    expect(seen.signal.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(await outcome).toBe('AbortError')
  })

  it('a response that arrives in time clears the timer and never aborts', async () => {
    let signal
    globalThis.fetch = vi.fn(async (url, init) => { signal = init.signal; return { ok: true } })
    const res = await fetchWithTimeout('http://x/y', {}, 100)
    expect(res.ok).toBe(true)
    await vi.advanceTimersByTimeAsync(1000)
    expect(signal.aborted).toBe(false)
  })
})
