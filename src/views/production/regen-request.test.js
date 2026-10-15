import { describe, it, expect, vi } from 'vitest'
import { regenRequest, RegenInterruptedError, INTERRUPTED_MESSAGE } from './regen-request.js'

const answer = (status, body = {}) => async () => ({ ok: status < 400, status, json: async () => body })
const dropped = async () => { throw new TypeError('Failed to fetch') }
const hang = (signal) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError'))))
const fast = { timeoutMs: 20, retryWaitMs: 0 }

describe('regenRequest', () => {
  it('returns the server answer, refusals included, and never re-sends one', async () => {
    const send = vi.fn(answer(402, { error: 'DAILY_TOTAL_CAP' }))
    const out = await regenRequest(send, { ...fast, checkLanded: async () => null })
    expect(out.res.status).toBe(402)
    expect(send).toHaveBeenCalledTimes(1)
  })
  it('a dropped connection whose render already landed is not re-sent', async () => {
    const send = vi.fn(dropped)
    const out = await regenRequest(send, { ...fast, checkLanded: async () => ({ target1_audio_id: 'new' }) })
    expect(out.landed).toEqual({ target1_audio_id: 'new' })
    expect(send).toHaveBeenCalledTimes(1)
  })
  it('a dropped connection whose render did not land is re-sent once', async () => {
    let n = 0
    const send = vi.fn((s) => (++n === 1 ? dropped() : answer(200, { ok: 1 })()))
    const out = await regenRequest(send, { ...fast, checkLanded: async () => null })
    expect(out.res.status).toBe(200)
    expect(send).toHaveBeenCalledTimes(2)
  })
  it('twice dropped: the plain interrupted message, after two sends only', async () => {
    const send = vi.fn(dropped)
    await expect(regenRequest(send, { ...fast, checkLanded: async () => null })).rejects.toThrow(INTERRUPTED_MESSAGE)
    expect(send).toHaveBeenCalledTimes(2)
  })
  it('a hung request is cut off and never re-sent (it may still be rendering)', async () => {
    const send = vi.fn(hang)
    await expect(regenRequest(send, { ...fast, checkLanded: async () => null })).rejects.toBeInstanceOf(RegenInterruptedError)
    expect(send).toHaveBeenCalledTimes(1)
  })
  it('without a way to re-read the row, a dropped render is never re-sent', async () => {
    const send = vi.fn(dropped)
    await expect(regenRequest(send, fast)).rejects.toThrow(INTERRUPTED_MESSAGE)
    expect(send).toHaveBeenCalledTimes(1)
  })
  it('a check that itself fails counts as not landed', async () => {
    const send = vi.fn(dropped)
    await expect(regenRequest(send, { ...fast, checkLanded: async () => { throw new Error('down') } })).rejects.toThrow(INTERRUPTED_MESSAGE)
  })
})
