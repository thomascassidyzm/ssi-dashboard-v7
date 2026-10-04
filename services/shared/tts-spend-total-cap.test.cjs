/**
 * The daily TOTAL cap (job #692, Tom 2026-09-29 00:25Z): 260,000 characters per
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

describe('the 260,000-char daily total cap', () => {
  it('sums every provider: 60k Cartesia + 30k Azure passes, the next 11k on a THIRD provider is refused', async () => {
    const { call, alerts } = setup()
    await call('cartesia', word(160000, 'a'))
    await call('azure', word(90000, 'b'))
    await expect(call('google', word(11000, 'c'))).rejects.toMatchObject({ code: 'DAILY_TOTAL_CAP' })
    await expect(call('google', word(11000, 'c'))).rejects.toThrow(/daily audio cap reached; only Tom can approve more/)
    await call('azure', word(10000, 'd'))                       // exactly 260,000: still allowed
    await expect(call('cartesia', 'z')).rejects.toMatchObject({ code: 'DAILY_TOTAL_CAP' })   // one char over
    expect(alerts.filter(a => /daily audio cap reached/.test(a.message))).toHaveLength(1)     // told ONCE
  })
  it('the refusal alert carries chars requested, the cap and who asked, so Watson can ask Tom cold', async () => {
    const { call, alerts } = setup()
    await call('cartesia', word(260000, 'a'))
    await expect(call('azure', word(700, 'b'), { courseCode: 'ita_for_eng' })).rejects.toBeTruthy()
    const a = alerts.find(x => x.code === 'DAILY_TOTAL_CAP')
    expect(a).toMatchObject({ chars: 700, cap: 260000, total: 260000, course: 'ita_for_eng' })
  })
  it('a refusal is 402-classed, so the door never retries it', async () => {
    const { call } = setup()
    await call('cartesia', word(260000, 'a'))
    await expect(call('cartesia', 'hi')).rejects.toThrow(/\(402\)/)
  })
  it('a job-scoped raise and the per-provider caps cannot lift it', async () => {
    const { call, store } = setup()
    await call('cartesia', word(260000, 'a'))
    await expect(call('azure', 'hi', { job: '#578' })).rejects.toMatchObject({ code: 'DAILY_TOTAL_CAP' })
    expect(store.rows.length).toBe(1)
  })
  it('resets on the next UTC day', async () => {
    const { call, setClock } = setup()
    await call('cartesia', word(260000, 'a'))
    setClock(Date.parse('2026-09-30T00:00:01Z'))
    await expect(call('cartesia', 'fresh day')).resolves.toBeTruthy()
  })
  it('only a signed raise naming Tom lifts it', async () => {
    const { call, store } = setup()
    await call('cartesia', word(260000, 'a'))
    const until = t0 + 5 * 86400e3
    store.totalCapRaises.push({ capChars: 400000, by: 'Dom', why: 'more', until, at: t0 })
    await expect(call('cartesia', 'hi')).rejects.toMatchObject({ code: 'DAILY_TOTAL_CAP' })
    store.totalCapRaises.push({ capChars: 400000, by: 'Tom', why: '', until, at: t0 })
    await expect(call('cartesia', 'hi')).rejects.toMatchObject({ code: 'DAILY_TOTAL_CAP' })
    store.totalCapRaises.push({ capChars: 400000, by: 'Tom (in chat)', why: 'bigger day', until: t0 - 1, at: t0 - 86400e3 })
    await expect(call('cartesia', 'hi')).rejects.toMatchObject({ code: 'DAILY_TOTAL_CAP' })   // expired
    store.totalCapRaises.push({ capChars: 400000, by: 'Tom (in chat)', why: 'bigger day', until, at: t0 })
    await expect(call('cartesia', 'hi')).resolves.toBeTruthy()
  })
})

describe('the Tom-approved run tier (job #913, Tom 2026-09-30: automatic 260k, an approved run up to the ceiling, 300k since job #596)', () => {
  const until = t0 + 5 * 86400e3
  const approve = (store, job, capChars = 1000000, by = 'Tom (in chat)') => store.totalCapRaises.push({ capChars, by, why: 'Irish gaps render', until, at: t0, job })
  it('an approved job runs past 260k on its own allowance; everyone else still gets their automatic 260k', async () => {
    const { call, store } = setup()
    approve(store, '#913')
    await call('cartesia', word(30000, 'a'), { job: 'irish gaps (job #913)' })
    await call('azure', word(259000, 'b'), { job: 'someone else' })              // 30k approved spend is not counted against them
    await expect(call('azure', word(2000, 'c'), { job: 'someone else' })).rejects.toThrow(/daily audio cap reached; only Tom can approve more/)
    await call('cartesia', word(5000, 'd'), { job: '#913·A' })
  })
  it('nothing passes the 300k ceiling, approved or not, and an approval cannot name more than the ceiling', async () => {
    const { call, store } = setup()
    approve(store, '#913', 9000000)
    await call('cartesia', word(290000, 'a'), { job: '#913' })
    await expect(call('cartesia', word(20000, 'b'), { job: '#913' })).rejects.toThrow(/hard daily ceiling/)
    await expect(call('azure', word(20000, 'c'), { job: 'other' })).rejects.toThrow(/hard daily ceiling/)
  })
  it('the approval is the job it names only (#9130 is not #913), and must be signed by Tom', async () => {
    const { call, store } = setup()
    approve(store, '#913')
    approve(store, '#77', 1000000, 'Dom')
    await call('cartesia', word(260000, 'a'), { job: '#9130' })
    await expect(call('cartesia', 'hi', { job: '#9130' })).rejects.toThrow(/daily audio cap reached/)
    await expect(call('cartesia', 'hi', { job: '#77' })).rejects.toThrow(/daily audio cap reached/)
    await expect(call('cartesia', 'hi', { job: '#913' })).resolves.toBeTruthy()
  })
})

// job #596: the JS ceiling matches the stricter DB function (ops/sql/20261003-tts-spend-total-cap-260k.sql v_ceiling 300000)
describe('hard ceiling matches the DB', () => {
  it('is 300000, the DB v_ceiling, never above it', async () => {
    const { TOTAL_DAILY_CEILING_CHARS } = await import('./tts-spend-guard.cjs')
    const fs = await import('node:fs')
    const sql = fs.readFileSync(new URL('../../ops/sql/20261003-tts-spend-total-cap-260k.sql', import.meta.url), 'utf8')
    const db = Number(/v_ceiling constant bigint := (\d+)/.exec(sql)[1])
    expect(db).toBe(300000)
    expect(TOTAL_DAILY_CEILING_CHARS).toBeLessThanOrEqual(db)
  })
})
