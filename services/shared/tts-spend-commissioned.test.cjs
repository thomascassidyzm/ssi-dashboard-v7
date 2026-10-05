/**
 * Commissioned jobs pass; only runaways stop (job #661, Tom 2026-10-04).
 * A render whose job text names a LIVE surface job skips the 3-sends repeat limit and the
 * automatic soft caps; it still meets a 10-send loop stop and the 1,000,000 hard ceiling.
 * Run: npx vitest run services/shared/tts-spend-commissioned.test.cjs
 */
import { describe, it, expect } from 'vitest'
const fs = require('fs')
const os = require('os')
const path = require('path')
const { createSpendGuard, memorySpendStore, surfaceCommissionChecker, COMMISSIONED_REPEAT_MAX } = require('./tts-spend-guard.cjs')
const clipLibrary = require('./clip-library.cjs')

const t0 = Date.parse('2026-10-04T10:00:00Z')
function setup(liveJobs = [656]) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'commissioned-'))
  const store = memorySpendStore({ name: dir, now: () => t0 })
  const g = createSpendGuard({
    ledgerPath: path.join(dir, 'l.jsonl'), budgetPath: null, now: () => t0, store, notify() {}, logger: { warn() {}, error() {} },
    isCommissioned: async (jobText) => [...String(jobText || '').matchAll(/#(\d+)(?!\d)/g)].some(m => liveJobs.includes(Number(m[1]))),
  })
  const call = async (text, job, provider = 'cartesia') => {
    const voiceId = `${provider}_82db1f84`
    const { ticket } = await clipLibrary.lookupForRender({ text, language: 'hin', voiceId, voiceBound: true }, clipLibrary.memoryClipLibrary([]))
    return g.beforeProviderCall({ provider, voiceId, text, ticket, courseCode: 'x', job })
  }
  return { call, store }
}

describe('commissioned jobs', () => {
  it('a live job is not stopped by the 3-sends repeat limit, but a 10-send loop is', async () => {
    const { call } = setup()
    for (let i = 0; i < COMMISSIONED_REPEAT_MAX; i++) await call('same words', '#656·I')
    await expect(call('same words', '#656·I')).rejects.toMatchObject({ code: 'REPEAT' })
  })
  it('an unattributed render, and a number that is not live, keep the 3-sends limit', async () => {
    const { call } = setup()
    for (let i = 0; i < 3; i++) await call('words a', null)
    await expect(call('words a', null)).rejects.toMatchObject({ code: 'REPEAT' })
    for (let i = 0; i < 3; i++) await call('words b', '#999')
    await expect(call('words b', '#999')).rejects.toMatchObject({ code: 'REPEAT' })
  })
  it('skips the automatic 260k total cap but not the 1M ceiling', async () => {
    const { call, store } = setup()
    store.totalCapChars = 260_000
    await call('a'.repeat(250_000), 'other')
    await expect(call('b'.repeat(20_000), 'other2')).rejects.toMatchObject({ code: 'DAILY_TOTAL_CAP' })
    await call('c'.repeat(20_000), '#656')                      // 270k: past the soft cap, commissioned
    await expect(call('d'.repeat(740_000), '#656')).rejects.toMatchObject({ code: 'DAILY_TOTAL_CAP' })   // would pass 1M
  })
})

describe('the held combined cap (hold.combinedDailyCapChars) is a soft cap too', () => {
  it('a live commissioned job under the 1M ceiling passes it; an uncommissioned caller is refused', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'commissioned-hold-'))
    const budgetPath = path.join(dir, 'b.json')
    fs.writeFileSync(budgetPath, JSON.stringify({
      hold: { by: 'Tom', since: '2026-10-03', combinedDailyCapChars: 260_000, message: 'held' },
      providers: { cartesia: { dailyCapChars: 1e9, alertDailyChars: 1e9 } },
    }))
    const store = memorySpendStore({ name: dir, now: () => t0 })
    store.totalCapChars = Infinity
    const g = createSpendGuard({
      ledgerPath: path.join(dir, 'l.jsonl'), budgetPath, now: () => t0, store, notify() {}, logger: { warn() {}, error() {} },
      isCommissioned: async (j) => /#656/.test(String(j || '')),
    })
    const call = async (text, job) => {
      const voiceId = 'cartesia_82db1f84'
      const { ticket } = await clipLibrary.lookupForRender({ text, language: 'hin', voiceId, voiceBound: true }, clipLibrary.memoryClipLibrary([]))
      return g.beforeProviderCall({ provider: 'cartesia', voiceId, text, ticket, courseCode: 'x', job })
    }
    await call('a'.repeat(259_900), 'other')
    await expect(call('b'.repeat(200), 'other2')).rejects.toMatchObject({ code: 'DAILY_CAP' })
    await expect(call('c'.repeat(200), '#656·I')).resolves.toBeTruthy()
  })
})

describe('surfaceCommissionChecker', () => {
  const mk = (jobs, ok = true) => surfaceCommissionChecker({ now: () => 1, fetchImpl: async () => ({ ok, json: async () => ({ jobs }) }) })
  it('only a RUNNING surface job counts; a string alone or a finished job does not', async () => {
    const c = mk([{ job: 656, status: 'running' }, { job: 659, status: 'done' }])
    expect(await c('#656·I')).toBe(true)
    expect(await c('x (job #656)')).toBe(true)
    expect(await c('#659')).toBe(false)
    expect(await c('#6560')).toBe(false)
    expect(await c('no number')).toBe(false)
  })
  it('an unreachable or erroring surface means unattributed limits', async () => {
    expect(await mk([], false)('#656')).toBe(false)
    const down = surfaceCommissionChecker({ now: () => 1, fetchImpl: async () => { throw new Error('down') } })
    expect(await down('#656')).toBe(false)
  })
})
