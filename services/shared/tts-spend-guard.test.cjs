/**
 * The spend guard's rules, each against a fake clock, a temp ledger and fake
 * provider-usage readers. No provider, no network, no DB.
 * Run: npx vitest run services/shared/tts-spend-guard.test.cjs
 */
import { describe, it, expect, beforeEach } from 'vitest'
const fs = require('fs')
const os = require('os')
const path = require('path')
const { createSpendGuard, cycleStart, effectiveStopShare, repeatKey } = require('./tts-spend-guard.cjs')

let dir
let clock
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spend-guard-'))
  clock = Date.parse('2026-09-26T10:00:00Z')
})
const budgets = (obj) => { const p = path.join(dir, 'budgets.json'); fs.writeFileSync(p, JSON.stringify(obj)); return p }
const guard = (o = {}) => createSpendGuard({
  ledgerPath: path.join(dir, 'ledger.jsonl'), budgetPath: o.budgetPath ?? null,
  now: () => clock, notify: o.notify || (() => {}), usageReaders: o.usageReaders || {},
  logger: { warn() {}, error() {} },
})
const call = (g, text, extra = {}) => g.beforeProviderCall({ provider: 'cartesia', voiceId: 'cartesia_kriti', text, courseCode: 'eng_for_hin', job: 'test', ...extra })
// The local mirror (job #430): an intent line ahead of each reservation, a call line after.
const ledger = () => fs.readFileSync(path.join(dir, 'ledger.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).filter(e => e.kind === 'call')

describe('(a) ledger: every provider call is written down before it is made', () => {
  it('records provider, voice, chars, course, job and a text hash — never the text itself', async () => {
    const g = guard()
    await call(g, 'मैं ठीक हूँ')
    const [e] = ledger()
    expect(e).toMatchObject({ kind: 'call', provider: 'cartesia', voice: 'cartesia_kriti', chars: 'मैं ठीक हूँ'.length, course: 'eng_for_hin', job: 'test' })
    expect(e.text_hash).toMatch(/^[0-9a-f]{16}$/)
    expect(JSON.stringify(e)).not.toContain('ठीक')
  })

  it('an unwritable ledger refuses the render (fail closed)', async () => {
    // A ledger whose parent is a FILE cannot be created. (Not /proc: Node's
    // recursive mkdir spins forever there.)
    fs.writeFileSync(path.join(dir, 'a-file'), 'x')
    const g = createSpendGuard({ ledgerPath: path.join(dir, 'a-file', 'ledger.jsonl'), budgetPath: null, now: () => clock, notify() {}, logger: { warn() {}, error() {} } })
    await expect(call(g, 'hello')).rejects.toThrow(/LEDGER/)
  })
})

describe('(b) global budgets: daily cap and a stop share of the monthly pool', () => {
  it('refuses the call that would pass the daily cap, and a new UTC day starts afresh', async () => {
    const g = guard({ budgetPath: budgets({ providers: { cartesia: { dailyCapChars: 25, alertDailyChars: 1e9 } } }) })
    await call(g, 'a'.repeat(20))
    await expect(call(g, 'b'.repeat(10))).rejects.toThrow(/DAILY_CAP/)
    clock += 24 * 3600e3
    await expect(call(g, 'b'.repeat(10))).resolves.toBeTruthy()
  })

  it('is GLOBAL: two processes sharing one ledger see each other\'s spend', async () => {
    const b = budgets({ providers: { cartesia: { dailyCapChars: 25, alertDailyChars: 1e9 } } })
    const p1 = guard({ budgetPath: b }); const p2 = guard({ budgetPath: b })
    await call(p1, 'a'.repeat(20))
    await expect(call(p2, 'b'.repeat(10))).rejects.toThrow(/DAILY_CAP/)
  })

  it('stops at 50% of the pool by default — the #382 loop would have stopped near 4M, not 7.6M', async () => {
    const g = guard({ budgetPath: budgets({ providers: { cartesia: { monthlyPoolChars: 100, dailyCapChars: 1e9, alertDailyChars: 1e9 } } }) })
    await call(g, 'x'.repeat(45))
    await expect(call(g, 'y'.repeat(10))).rejects.toThrow(/POOL_SHARE.*stop is 50%/)
  })

  it('a raise counts only when dated, signed and explained; an expired raise falls back to 50%', () => {
    const now = Date.parse('2026-09-26T00:00:00Z')
    expect(effectiveStopShare({ stopAtShareOfPool: 0.5, raise: { share: 0.8 } }, now).share).toBe(0.5)
    expect(effectiveStopShare({ stopAtShareOfPool: 0.5, raise: { share: 0.8, by: 'Tom', why: 'Hindi render', until: '2026-10-01' } }, now).share).toBe(0.8)
    expect(effectiveStopShare({ stopAtShareOfPool: 0.5, raise: { share: 0.8, by: 'Tom', why: 'x', until: '2026-09-20' } }, now).share).toBe(0.5)
  })

  it('billing cycles honour the provider\'s reset day', () => {
    expect(new Date(cycleStart(Date.parse('2026-09-26T10:00Z'), 1)).toISOString()).toBe('2026-09-01T00:00:00.000Z')
    expect(new Date(cycleStart(Date.parse('2026-09-10T10:00Z'), 15)).toISOString()).toBe('2026-08-15T00:00:00.000Z')
  })

  it('an unreadable budget file refuses the render rather than rendering unbudgeted', async () => {
    const p = path.join(dir, 'broken.json'); fs.writeFileSync(p, '{ nope')
    await expect(call(guard({ budgetPath: p }), 'hello')).rejects.toThrow(/CONFIG/)
  })
})

describe('(c) idempotency: the same words, voice and provider are not bought over and over', () => {
  it('refuses the (maxPerKey+1)th send inside the window, whatever the caller thinks is missing', async () => {
    const g = guard({ budgetPath: budgets({ repeat: { maxPerKey: 3, windowHours: 24 } }) })
    for (let i = 0; i < 3; i++) await call(g, 'her name')
    await expect(call(g, 'Her name.')).rejects.toThrow(/REPEAT.*3 times/)
    await expect(call(g, 'her name', { voiceId: 'cartesia_rehan' })).resolves.toBeTruthy() // another voice is another clip
    clock += 25 * 3600e3
    await expect(call(g, 'her name')).resolves.toBeTruthy() // the window slid past
  })

  it('keys ignore case, spacing and punctuation but not voice or provider', () => {
    expect(repeatKey('cartesia', 'v', 'Her  name.')).toBe(repeatKey('cartesia', 'v', 'her name'))
    expect(repeatKey('cartesia', 'v', 'her name')).not.toBe(repeatKey('xai', 'v', 'her name'))
  })
})

describe('(e) provider-side check: the provider\'s own count against the ledger', () => {
  it('stops every render when the provider has billed far more than the ledger recorded, and the stop persists across processes', async () => {
    let used = 1_000_000
    const usageReaders = { cartesia: async () => ({ usedChars: used, limitChars: 8_000_000 }) }
    const g = guard({ usageReaders })
    await call(g, 'first')               // baseline taken
    used += 500_000                      // someone else spent 500k outside the door
    clock += 11 * 60e3                   // past the check interval
    await expect(call(g, 'second')).rejects.toThrow(/PROVIDER_DIVERGENCE/)
    await expect(call(guard(), 'third')).rejects.toThrow(/TRIPPED/)
  })

  it('stops when the provider itself reports usage past the stop share', async () => {
    const g = guard({ usageReaders: { cartesia: async () => ({ usedChars: 7_600_000, limitChars: 8_000_000 }) } })
    await expect(call(g, 'anything')).rejects.toThrow(/PROVIDER_POOL/)
  })

  it('an unreadable usage endpoint warns and falls back to the ledger, it does not block', async () => {
    const warned = []
    const g = guard({ usageReaders: { cartesia: async () => { throw new Error('502') } }, notify: (e) => warned.push(e) })
    await expect(call(g, 'hello')).resolves.toBeTruthy()
    expect(warned.map(w => w.message).join(' ')).toMatch(/usage could not be read/)
  })
})

describe('(f) a human is told — once — when a guard trips or a line is crossed', () => {
  it('alerts on the trip, on the daily line and on 50% of the pool, each only once', async () => {
    const sent = []
    const g = guard({ notify: (e) => sent.push(e), budgetPath: budgets({ providers: { cartesia: { monthlyPoolChars: 100, dailyCapChars: 60, alertDailyChars: 10, raise: { stopAtShareOfPool: 0.9, by: 'test', why: 'alert lines below the stop', until: '2026-10-01' } } } }) })
    await call(g, 'x'.repeat(12))     // daily line
    await call(g, 'y'.repeat(40))     // 52% of pool
    await call(g, 'z')                // nothing new
    await expect(call(g, 'w'.repeat(20))).rejects.toThrow(/DAILY_CAP/)
    await expect(call(g, 'w'.repeat(20))).rejects.toThrow(/DAILY_CAP/)
    const kinds = sent.map(s => s.key.split(':')[0]).filter(k => k !== 'usage-none')
    expect(kinds.filter(k => k === 'daily')).toHaveLength(1)
    expect(kinds.filter(k => k === 'pool')).toHaveLength(1)
    expect(kinds.filter(k => k === 'trip')).toHaveLength(1)
    // (#430 adds a "no usage reader" line and a limits-in-force line — not counted here.)
    expect(fs.readFileSync(path.join(dir, 'ledger.alerts.jsonl'), 'utf8').trim().split('\n').filter(l => !l.includes('usage-none') && !l.includes('"limits:'))).toHaveLength(3)
  })
})
