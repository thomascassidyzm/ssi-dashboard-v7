/**
 * The spend guard's hardening (job #430), one describe per review finding.
 * Every test here failed against #425's guard (31e2f0edb) and passes now.
 * Fake clock, temp mirror, the in-memory store, fake usage readers and a
 * stubbed fetch. No provider, no network, no DB.
 * Run: npx vitest run services/shared/tts-spend-guard.hardening.test.cjs
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
const fs = require('fs')
const os = require('os')
const path = require('path')
const guardMod = require('./tts-spend-guard.cjs')
const { createSpendGuard } = guardMod

let dir
let clock
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spend-harden-'))
  clock = Date.parse('2026-09-26T10:00:00Z')
})
afterEach(() => { delete process.env.TTS_SPEND_BUDGETS })

const budgets = (obj, name = 'budgets.json') => { const p = path.join(dir, name); fs.writeFileSync(p, JSON.stringify(obj)); return p }
const guard = (o = {}) => createSpendGuard({
  ledgerPath: path.join(dir, 'ledger.jsonl'), now: () => clock,
  notify: o.notify || (() => {}), usageReaders: o.usageReaders || {}, logger: { warn() {}, error() {} },
  ...('budgetPath' in o ? { budgetPath: o.budgetPath } : {}),
})
// Every call carries a ticket from a real (empty) clip-library lookup (job #677):
// the guard pays nobody who has not asked the library.
const lookedUp = async (voiceId, text) => (await require('./clip-library.cjs').lookupForRender({ text, language: 'hin', voiceId, voiceBound: true }, require('./clip-library.cjs').memoryClipLibrary([]))).ticket
const call = async (g, text, extra = {}) => {
  const ctx = { provider: 'cartesia', voiceId: 'cartesia_kriti', text, courseCode: 'eng_for_hin', job: 'test', ...extra }
  return g.beforeProviderCall({ ticket: await lookedUp(ctx.voiceId, ctx.text), ...ctx })
}
const settle = (ps) => Promise.allSettled(ps).then(rs => ({ ok: rs.filter(r => r.status === 'fulfilled').length, refused: rs.filter(r => r.status === 'rejected') }))

describe('#3+4 concurrent callers cannot overshoot a cap or the repeat limit', () => {
  it('20 simultaneous 10-char calls against a 50-char daily cap: exactly 5 are paid', async () => {
    const g = guard({ budgetPath: budgets({ providers: { cartesia: { dailyCapChars: 50 } } }) })
    const { ok, refused } = await settle(Array.from({ length: 20 }, (_, i) => call(g, `line ${String(i).padStart(5, '0')}`)))
    expect(ok).toBe(5)
    expect(refused.every(r => /DAILY_CAP/.test(r.reason.message))).toBe(true)
  })

  it('two guards (two hosts) racing on the same words: the repeat limit holds across both', async () => {
    const b = budgets({ repeat: { maxPerKey: 3 } })
    const a = guard({ budgetPath: b }); const c = guard({ budgetPath: b })
    const { ok } = await settle(Array.from({ length: 12 }, (_, i) => call(i % 2 ? a : c, 'her name')))
    expect(ok).toBe(3)
  })
})

describe('#6 limits above the committed baseline need a signed, expiring raise', () => {
  it('an unsigned raise of the daily cap is ignored — the baseline 1,000,000 holds — and a human is told', async () => {
    const sent = []
    const g = guard({ notify: (e) => sent.push(e), budgetPath: budgets({ providers: { cartesia: { dailyCapChars: 5_000_000 } } }) })
    await expect(call(g, 'x'.repeat(1_500_000))).rejects.toThrow(/DAILY_CAP/)
    expect(sent.map(s => s.message).join(' ')).toMatch(/IGNORED providers\.cartesia\.dailyCapChars=5000000/)
  })

  it('a signed raise in date counts; one dated more than 31 days out does not', async () => {
    const ok = guard({ budgetPath: budgets({ providers: { cartesia: { raise: { dailyCapChars: 2_000_000, by: 'Tom', why: 'Hindi render', until: '2026-10-03' } } } }) })
    await expect(call(ok, 'x'.repeat(1_500_000))).resolves.toBeTruthy()
    clock += 86400e3
    const tooLong = guard({ budgetPath: budgets({ providers: { cartesia: { raise: { dailyCapChars: 2_000_000, by: 'Tom', why: 'forever', until: '2027-06-01' } } } }, 'long.json') })
    await expect(call(tooLong, 'y'.repeat(1_500_000))).rejects.toThrow(/DAILY_CAP/)
  })

  it('a raise stops counting the moment it expires', async () => {
    const g = guard({ budgetPath: budgets({ providers: { cartesia: { raise: { dailyCapChars: 2_000_000, by: 'Tom', why: 'x', until: '2026-09-27T00:00:00Z' } } } }) })
    await expect(call(g, 'x'.repeat(1_500_000))).resolves.toBeTruthy()
    clock = Date.parse('2026-09-27T01:00:00Z')
    await expect(call(g, 'y'.repeat(1_500_000))).rejects.toThrow(/DAILY_CAP/)
  })

  it('a looser repeat window (shorter than 24h) without a signature is ignored', async () => {
    const g = guard({ budgetPath: budgets({ repeat: { maxPerKey: 2, windowHours: 1 } }) })
    await call(g, 'her name'); await call(g, 'her name')
    clock += 2 * 3600e3            // past the unsigned 1h window, inside the baseline 24h
    await expect(call(g, 'her name')).rejects.toThrow(/REPEAT/)
  })

  it('an override file named by TTS_SPEND_BUDGETS is refused unless it is signed', async () => {
    process.env.TTS_SPEND_BUDGETS = budgets({ providers: { cartesia: { dailyCapChars: 10 } } }, 'override.json')
    // Unsigned: ignored, so the committed limits (1,000,000/day) apply, not 10.
    const g = guard()
    await expect(call(g, 'x'.repeat(100))).resolves.toBeTruthy()
    process.env.TTS_SPEND_BUDGETS = budgets({ signed: { by: 'Tom', why: 'test', until: '2026-10-01' }, providers: { cartesia: { dailyCapChars: 10 } } }, 'override2.json')
    const signed = createSpendGuard({ ledgerPath: path.join(dir, 'other.jsonl'), now: () => clock, notify() {}, logger: { warn() {}, error() {} } })
    await expect(call(signed, 'x'.repeat(100))).rejects.toThrow(/DAILY_CAP/)
  })
})

describe('#7 provider reconciliation fails closed when a configured reader cannot be read', () => {
  it('tiny calls pass; a run past the unverified allowance is refused', async () => {
    const g = guard({ usageReaders: { cartesia: async () => { throw new Error('502') } } })
    await expect(call(g, 'x'.repeat(15_000))).resolves.toBeTruthy()
    await expect(call(g, 'y'.repeat(10_000))).rejects.toThrow(/USAGE_UNREADABLE/)
  })

  it('a reader that answers nonsense counts as unreadable, not as "fine"', async () => {
    const g = guard({ usageReaders: { cartesia: async () => null } })
    await call(g, 'x'.repeat(19_000))
    await expect(call(g, 'y'.repeat(5_000))).rejects.toThrow(/USAGE_UNREADABLE/)
  })

  it('the Cartesia reader asks /usage/credits with the admin key and sums the buckets', async () => {
    const seen = []
    const realFetch = global.fetch
    global.fetch = async (url, opts) => { seen.push({ url: String(url), auth: opts.headers.Authorization }); return { ok: true, json: async () => ({ data: [{ credits: 1200 }, { credits: 980 }] }) } }
    try {
      const readers = guardMod.liveUsageReaders({ CARTESIA_ADMIN_API_KEY: 'sk_car_admin_test' }, { now: () => clock })
      expect(await readers.cartesia()).toEqual({ usedChars: 2180, limitChars: null })
      expect(seen[0].url).toMatch(/^https:\/\/api\.cartesia\.ai\/usage\/credits\?start_ts=2026-09-01T00%3A00%3A00\.000Z&end_ts=/)
      expect(seen[0].auth).toBe('Bearer sk_car_admin_test')
    } finally { global.fetch = realFetch }
  })
})

describe('#8 damage to local files cannot reopen a provider', () => {
  it('a corrupt trips file does not lift a provider trip', async () => {
    let used = 1_000_000
    const usageReaders = { cartesia: async () => ({ usedChars: used, limitChars: 8_000_000 }) }
    const g = guard({ usageReaders })
    await call(g, 'first')
    used += 500_000; clock += 11 * 60e3
    await expect(call(g, 'second')).rejects.toThrow(/PROVIDER_DIVERGENCE/)
    fs.writeFileSync(path.join(dir, 'ledger.trips.json'), '{ this is not json')
    await expect(call(guard(), 'third')).rejects.toThrow(/TRIPPED/)
  })

  it('truncating the local ledger file does not give back the day\'s spend', async () => {
    const b = budgets({ providers: { cartesia: { dailyCapChars: 30 } } })
    const g = guard({ budgetPath: b })
    await call(g, 'a'.repeat(25))
    fs.writeFileSync(path.join(dir, 'ledger.jsonl'), '')
    await expect(call(guard({ budgetPath: b }), 'b'.repeat(10))).rejects.toThrow(/DAILY_CAP/)
  })
})

describe('September\'s spend before the ledger counts toward the monthly stop', () => {
  it('with the #382 drain seeded, Cartesia is stopped at 50% of 8M until the pool resets', async () => {
    clock = Date.parse('2026-09-27T10:00:00Z')      // the day after the drain: today's cap is clear
    const g = guard()
    g.store.seed('cartesia', 7_631_695, Date.parse('2026-09-26T12:00:00Z'))
    await expect(call(g, 'hello')).rejects.toThrow(/POOL_SHARE/)
    clock = Date.parse('2026-10-01T00:05:00Z')
    await expect(call(g, 'hello')).resolves.toBeTruthy()
  })
})
