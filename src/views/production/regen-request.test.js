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
  it('a re-read that itself fails is "unknown", never "not landed": nothing is re-sent (job #812)', async () => {
    const send = vi.fn(dropped)
    await expect(regenRequest(send, { ...fast, checkLanded: async () => { throw new Error('down') } })).rejects.toThrow(INTERRUPTED_MESSAGE)
    expect(send).toHaveBeenCalledTimes(1)
  })
  it('a re-read that hangs is "unknown" too, and is cut off', async () => {
    const send = vi.fn(dropped)
    await expect(regenRequest(send, { ...fast, totalMs: 60, checkLanded: () => new Promise(() => {}) })).rejects.toThrow(INTERRUPTED_MESSAGE)
    expect(send).toHaveBeenCalledTimes(1)
  })
  it('headers then a stalled body: cut off, never re-sent, the caller gets the body it needs (job #812)', async () => {
    const stalled = async () => ({ ok: true, status: 200, json: () => new Promise(() => {}) })
    const send = vi.fn(stalled)
    await expect(regenRequest(send, { ...fast, checkLanded: async () => null })).rejects.toBeInstanceOf(RegenInterruptedError)
    expect(send).toHaveBeenCalledTimes(1)
    const ok = await regenRequest(answer(200, { target1_audio_id: 'x' }), fast)
    expect(ok.body).toEqual({ target1_audio_id: 'x' })
  })
  it('the whole operation is bounded, re-send included', async () => {
    let n = 0
    const send = vi.fn((sig) => (++n === 1 ? dropped() : hang(sig)))
    const t0 = Date.now()
    await expect(regenRequest(send, { timeoutMs: 10000, totalMs: 80, retryWaitMs: 0, checkLanded: async () => null })).rejects.toThrow(INTERRUPTED_MESSAGE)
    expect(Date.now() - t0).toBeLessThan(1000)
  })
})
