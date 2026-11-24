// The rule of popty-try-later.cjs (cs #152): Popty down or restarting is "try later", never a refusal that silences a slot.
// Not run while tests are off estate-wide (r-2026-11-03); it is here so the rule is written in code.
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const { isTryLater, isUnansweredRecord, postUntilAnswered } = createRequire(import.meta.url)('./popty-try-later.cjs')

describe('popty try-later', () => {
  it('a thrown fetch, a bare gateway status and the surface-outage code are try-later', () => {
    expect(isTryLater({ error: new Error('fetch failed') })).toBe(true)
    expect(isTryLater({ status: 502, body: null })).toBe(true)
    expect(isTryLater({ status: 503, body: { code: 'APPROVAL_CHECK_UNAVAILABLE' } })).toBe(true)
  })
  it('a real refusal is an answer, even on a 5xx', () => {
    expect(isTryLater({ status: 409, body: { ok: false, code: 'EXISTS_IN_LANGUAGE' } })).toBe(false)
    expect(isTryLater({ status: 503, body: { ok: false, code: 'DAILY_TOTAL_CAP' } })).toBe(false)
    expect(isTryLater({ status: 200, body: { ok: true } })).toBe(false)
  })
  it('the 24 Nov NO_ANSWER records and try-later records are re-asked; a refusal is not', () => {
    expect(isUnansweredRecord({ code: 'NO_ANSWER', error: '' })).toBe(true)
    expect(isUnansweredRecord({ code: 'POPTY_UNAVAILABLE', tryLater: true })).toBe(true)
    expect(isUnansweredRecord({ code: 'APPROVAL_UNVERIFIED', error: 'the Command Surface could not be reached' })).toBe(true)
    expect(isUnansweredRecord({ code: 'EXISTS_IN_LANGUAGE' })).toBe(false)
    expect(isUnansweredRecord({ ok: true, audioId: 'x' })).toBe(false)
  })
  it('backs off through a restart and returns the answer when Popty is back', async () => {
    const answers = [() => { throw new Error('ECONNREFUSED') }, () => ({ status: 502, json: async () => { throw new Error('html') } }), () => ({ status: 200, json: async () => ({ ok: true, audioId: 'a' }) })]
    const waits = []
    const r = await postUntilAnswered('http://x', { body: {}, fetchImpl: async () => answers.shift()(), sleep: async (ms) => { waits.push(ms) }, log: () => {} })
    expect(r).toMatchObject({ tryLater: false, body: { ok: true, audioId: 'a' } })
    expect(waits).toEqual([30000, 60000])
  })
  it('past the budget it says try later with POPTY_UNAVAILABLE, never a refusal', async () => {
    let t = 0
    const r = await postUntilAnswered('http://x', { body: {}, budgetMs: 100000, fetchImpl: async () => { throw new Error('down') }, sleep: async (ms) => { t += ms }, now: () => t, log: () => {} })
    expect(r).toMatchObject({ tryLater: true, body: { ok: false, code: 'POPTY_UNAVAILABLE', tryLater: true } })
  })
})
