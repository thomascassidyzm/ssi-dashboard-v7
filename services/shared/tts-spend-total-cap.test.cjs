/**
 * The daily TOTAL cap (job #692, Tom 2026-09-29 00:25Z): 50,000 characters per
 * UTC day across every provider, caller and person; above it, refuse, alert once,
 * never retry; only a signed raise naming Tom lifts it.
 * Run: npx vitest run services/shared/tts-spend-total-cap.test.cjs
 */
import { describe, it, expect } from 'vitest'
const fs = require('fs')
const os = require('os')
const path = require('path')
const { createSpendGuard, memorySpendStore } = require('./tts-spend-guard.cjs')
const clipLibrary = require('./clip-library.cjs')

const t0 = Date.parse('2026-09-29T10:00:00Z')
function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'total-cap-'))
  let clock = t0
  const alerts = []
  const store = memorySpendStore({ name: dir, now: () => clock })
  const g = createSpendGuard({ ledgerPath: path.join(dir, 'l.jsonl'), budgetPath: null, now: () => clock, store, notify: (e) => alerts.push(e), logger: { warn() {}, error() {} } })
  const call = async (provider, text, extra = {}) => {
    const voiceId = `${provider}_v`
    const { ticket } = await clipLibrary.lookupForRender({ text, language: 'hin', voiceId, voiceBound: true }, clipLibrary.memoryClipLibrary([]))
    return g.beforeProviderCall({ provider, voiceId, text, ticket, courseCode: 'x', job: 'j', ...extra })
  }
  return { g, store, alerts, call, setClock: (ms) => { clock = ms } }
}
const word = (n, seed) => `${seed}${'x'.repeat(n - String(seed).length)}`

describe('the 50,000-char daily total cap', () => {
  it('sums every provider: 30k Cartesia + 15k Azure passes, the next 6k on a THIRD provider is refused', async () => {
    const { call, alerts } = setup()
    await call('cartesia', word(30000, 'a'))
    await call('azure', word(15000, 'b'))
    await expect(call('google', word(6000, 'c'))).rejects.toMatchObject({ code: 'DAILY_TOTAL_CAP' })
    await expect(call('google', word(6000, 'c'))).rejects.toThrow(/daily audio cap reached; only Tom can approve more/)
    await call('azure', word(5000, 'd'))                       // exactly 50,000: still allowed
    await expect(call('cartesia', 'z')).rejects.toMatchObject({ code: 'DAILY_TOTAL_CAP' })   // one char over
    expect(alerts.filter(a => /daily audio cap reached/.test(a.message))).toHaveLength(1)     // told ONCE
  })
  it('a refusal is 402-classed, so the door never retries it', async () => {
    const { call } = setup()
    await call('cartesia', word(50000, 'a'))
    await expect(call('cartesia', 'hi')).rejects.toThrow(/\(402\)/)
  })
  it('a job-scoped raise and the per-provider caps cannot lift it', async () => {
    const { call, store } = setup()
    await call('cartesia', word(50000, 'a'))
    await expect(call('azure', 'hi', { job: '#578' })).rejects.toMatchObject({ code: 'DAILY_TOTAL_CAP' })
    expect(store.rows.length).toBe(1)
  })
  it('resets on the next UTC day', async () => {
    const { call, setClock } = setup()
    await call('cartesia', word(50000, 'a'))
    setClock(Date.parse('2026-09-30T00:00:01Z'))
    await expect(call('cartesia', 'fresh day')).resolves.toBeTruthy()
  })
  it('only a signed raise naming Tom lifts it', async () => {
    const { call, store } = setup()
    await call('cartesia', word(50000, 'a'))
    const until = t0 + 5 * 86400e3
    store.totalCapRaises.push({ capChars: 90000, by: 'Dom', why: 'more', until, at: t0 })
    await expect(call('cartesia', 'hi')).rejects.toMatchObject({ code: 'DAILY_TOTAL_CAP' })
    store.totalCapRaises.push({ capChars: 90000, by: 'Tom', why: '', until, at: t0 })
    await expect(call('cartesia', 'hi')).rejects.toMatchObject({ code: 'DAILY_TOTAL_CAP' })
    store.totalCapRaises.push({ capChars: 90000, by: 'Tom (in chat)', why: 'bigger day', until: t0 - 1, at: t0 - 86400e3 })
    await expect(call('cartesia', 'hi')).rejects.toMatchObject({ code: 'DAILY_TOTAL_CAP' })   // expired
    store.totalCapRaises.push({ capChars: 90000, by: 'Tom (in chat)', why: 'bigger day', until, at: t0 })
    await expect(call('cartesia', 'hi')).resolves.toBeTruthy()
  })
})
