import { describe, it, expect } from 'vitest'
import { fetchWithTimeoutRetry, LoadTimeoutError, SLOW_LOAD_MESSAGE } from './fetch-with-timeout.js'

const hang = (url, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError'))))
const ok = body => async () => ({ ok: true, status: 200, json: async () => body })
const read = res => res.ok ? res.json() : null

describe('fetchWithTimeoutRetry', () => {
  it('returns normally when the first attempt answers', async () => {
    const out = await fetchWithTimeoutRetry('/x', {}, read, { timeoutMs: 20, fetchImpl: ok({ a: 1 }) })
    expect(out.data).toEqual({ a: 1 })
  })
  it('retries once after a hang and succeeds', async () => {
    let n = 0
    const f = (u, i) => (++n === 1 ? hang(u, i) : ok({ a: 2 })())
    const out = await fetchWithTimeoutRetry('/x', {}, read, { timeoutMs: 20, fetchImpl: f })
    expect(n).toBe(2)
    expect(out.data).toEqual({ a: 2 })
  })
  it('throws the plain slow message after two hangs', async () => {
    let n = 0
    const f = (u, i) => { n++; return hang(u, i) }
    const p = fetchWithTimeoutRetry('/x', {}, read, { timeoutMs: 20, fetchImpl: f })
    await expect(p).rejects.toBeInstanceOf(LoadTimeoutError)
    await expect(p).rejects.toThrow(SLOW_LOAD_MESSAGE)
    expect(n).toBe(2)
  })
  it('does not retry a non-timeout failure', async () => {
    let n = 0
    const f = async () => { n++; throw new Error('offline') }
    await expect(fetchWithTimeoutRetry('/x', {}, read, { timeoutMs: 20, fetchImpl: f })).rejects.toThrow('offline')
    expect(n).toBe(1)
  })
})
