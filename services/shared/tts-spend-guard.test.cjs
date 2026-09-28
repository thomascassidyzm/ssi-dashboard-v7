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

describe('(e2) a provider whose usage cannot be read is a known limit, said once per host', () => {
  it('Cartesia with no admin key: told once, not again in a new process or on a new day', async () => {
    const sent = []
    await call(guard({ notify: (e) => sent.push(e) }), 'one')
    await call(guard({ notify: (e) => sent.push(e) }), 'two')   // a fresh process on the same host
    clock += 2 * 86_400_000                                      // and days later
    await call(guard({ notify: (e) => sent.push(e) }), 'three')
    const told = sent.filter(s => s.provider === 'cartesia' && /usage/.test(s.key))
    expect(told.map(s => s.key)).toEqual(['usage-known-limit:cartesia'])
    expect(told[0].message).toMatch(/Known limit.*CARTESIA_ADMIN_API_KEY/)
  })

  it('Azure, and any provider with no reader: told once, naming what would switch the check on (job #521)', async () => {
    const sent = []
    for (const provider of ['azure', 'google']) {
      const extra = { provider, voiceId: `${provider}_v` }
      await call(guard({ notify: (e) => sent.push(e) }), 'one', extra)
      await call(guard({ notify: (e) => sent.push(e) }), 'two', extra)
      clock += 2 * 86_400_000
      await call(guard({ notify: (e) => sent.push(e) }), 'three', extra)
    }
    const told = sent.filter(s => /usage/.test(s.key))
    expect(told.map(s => s.key)).toEqual(['usage-known-limit:azure', 'usage-known-limit:google'])
    expect(told[0].message).toMatch(/Known limit.*Cost Management.*AZURE_CLIENT_SECRET/)
    expect(told[1].message).toMatch(/Known limit.*liveUsageReaders/)
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
    const kinds = sent.map(s => s.key.split(':')[0]).filter(k => !k.startsWith('usage-'))
    expect(kinds.filter(k => k === 'daily')).toHaveLength(1)
    expect(kinds.filter(k => k === 'pool')).toHaveLength(1)
    expect(kinds.filter(k => k === 'trip')).toHaveLength(1)
    // (#430 adds a "no usage reader" line and a limits-in-force line — not counted here.)
    expect(fs.readFileSync(path.join(dir, 'ledger.alerts.jsonl'), 'utf8').trim().split('\n').filter(l => !l.includes('"usage-') && !l.includes('"limits:'))).toHaveLength(3)
  })
})

describe('(f2) a pool stop is raised once per caller per cycle, not on every refused call (job #516)', () => {
  it('an editor saving phrase after phrase past the stop, across a service restart: one card, then one more only for a new caller or a new cycle', async () => {
    const sent = []
    const b = budgets({ providers: { cartesia: { monthlyPoolChars: 100, dailyCapChars: 1000, alertDailyChars: 1e9, stopAtShareOfPool: 0.5 } } })
    const phase8 = () => guard({ budgetPath: b, notify: (e) => sent.push(e) })
    const edit = (g, text, course = 'cat_for_eng') => call(g, text, { courseCode: course, job: null })
    let g = phase8()
    await edit(g, 'x'.repeat(50))                                             // reaches the stop
    await expect(edit(g, 'I need to know it')).rejects.toThrow(/POOL_SHARE/)
    clock += 30 * 60e3
    await expect(edit(g, "I don't need to know it")).rejects.toThrow(/POOL_SHARE/)
    g = phase8()                                                              // phase8 restarted
    clock += 30 * 60e3
    await expect(edit(g, 'you know what I want')).rejects.toThrow(/POOL_SHARE/)
    clock += 2 * 86_400_000                                                   // days later, same cycle
    await expect(edit(phase8(), 'another save')).rejects.toThrow(/POOL_SHARE/)
    const trips = () => sent.filter(s => s.code === 'POOL_SHARE')
    expect(trips()).toHaveLength(1)
    expect(trips()[0].message).toMatch(/Caller: cat_for_eng\. Said once/)

    await expect(edit(phase8(), 'a different course', 'spa_for_eng')).rejects.toThrow(/POOL_SHARE/)
    expect(trips()).toHaveLength(2)                                           // a new caller is news
  })
})

describe('(f3) a limits change is said once per host, not on every restart (job #533)', () => {
  it('a restarted process with the same raise says nothing; a new raise is said', async () => {
    const sent = []
    const b = (share) => budgets({ providers: { cartesia: { monthlyPoolChars: 10 ** 6, dailyCapChars: 10 ** 6, raise: { stopAtShareOfPool: share, by: 'Tom', why: 'test', until: '2026-10-28' } } } })
    const limitCards = () => sent.filter(e => String(e.key).startsWith('limits:'))
    await call(guard({ notify: (e) => sent.push(e), budgetPath: b(1.25) }), 'hello')
    await call(guard({ notify: (e) => sent.push(e), budgetPath: b(1.25) }), 'hello again')
    expect(limitCards()).toHaveLength(1)
    await call(guard({ notify: (e) => sent.push(e), budgetPath: b(1.1) }), 'hello once more')
    expect(limitCards()).toHaveLength(2)
  })
})

describe('(h) the standing hold: 100,000 chars a day across all providers (Tom 2026-09-28, jobs #569, #570)', () => {
  // The COMMITTED budget file, not a fixture: this is the rule as it ships.
  const committed = path.join(__dirname, '..', '..', 'ops', 'tts-spend-budgets.json')

  for (const provider of ['cartesia', 'azure', 'xai', 'google']) {
    it(`${provider}: a 100,001-char day is refused, naming Tom's go`, async () => {
      const g = guard({ budgetPath: committed })
      const err = await call(g, 'x'.repeat(100_001), { provider }).catch(e => e)
      expect(err.code).toBe('DAILY_CAP')
      expect(err.message).toMatch(/HELD: .*TOM'S EXPLICIT GO/)
    })
  }

  it('a small clip passes, and a day of them stops at exactly 100,000', async () => {
    const g = guard({ budgetPath: committed })
    await expect(call(g, 'Croeso i Voice Lab.')).resolves.toBeTruthy()
    await call(g, 'y'.repeat(100_000 - 'Croeso i Voice Lab.'.length))
    await expect(call(g, 'z')).rejects.toThrow(/DAILY_CAP.*HELD/)
  })

  it('the 100,000 is ONE figure across Cartesia + Azure, not 100,000 each', async () => {
    const g = guard({ budgetPath: committed })
    await call(g, 'c'.repeat(60_000), { provider: 'cartesia' })
    await expect(call(g, 'a'.repeat(40_000), { provider: 'azure', voiceId: 'azure_x' })).resolves.toBeTruthy()
    const err = await call(g, 'a', { provider: 'azure', voiceId: 'azure_x' }).catch(e => e)
    expect(err.code).toBe('DAILY_CAP')
    expect(err.message).toMatch(/across all TTS providers.*combined daily cap of 100000.*TOM'S EXPLICIT GO/)
  })

  it('without a hold block the old signed-raise hint still stands', async () => {
    const g = guard({ budgetPath: budgets({ providers: { cartesia: { dailyCapChars: 25, alertDailyChars: 1e9 } } }) })
    await expect(call(g, 'a'.repeat(30))).rejects.toThrow(/Raise dailyCapChars only through a signed raise/)
  })
})

describe('(i) a retired provider is refused outright (Tom 2026-09-28: "We don\'t use Eleven Labs any more", job #575)', () => {
  const committed = path.join(__dirname, '..', '..', 'ops', 'tts-spend-budgets.json')

  it('ElevenLabs: even a one-character call is refused, saying it is retired', async () => {
    const g = guard({ budgetPath: committed })
    const err = await call(g, 'a', { provider: 'elevenlabs', voiceId: 'el_x' }).catch(e => e)
    expect(err.code).toBe('RETIRED')
    expect(err.message).toMatch(/ElevenLabs retired \(Tom 2026-09-28\)/)
    expect(fs.existsSync(path.join(dir, 'ledger.jsonl')) ? ledger() : []).toHaveLength(0)
  })

  it('the committed file carries no ElevenLabs alert line above the baseline (none the guard would ignore)', async () => {
    const f = JSON.parse(fs.readFileSync(committed, 'utf8'))
    expect(f.providers.elevenlabs.dailyCapChars).toBe(0)
    expect(f.providers.elevenlabs.alertDailyChars).toBeUndefined()
  })

  it('other providers still render', async () => {
    const g = guard({ budgetPath: committed })
    await expect(call(g, 'Croeso.', { provider: 'azure', voiceId: 'azure_x' })).resolves.toBeTruthy()
  })
})

describe('(j) a job-scoped raise: Tom\'s go for ONE job above the cap starves nobody (Tom 2026-09-28, job #578)', () => {
  const held = (jobRaises) => budgets({
    hold: { by: 'Tom', since: '2026-09-26', combinedDailyCapChars: 100, message: 'held' },
    providers: { cartesia: { dailyCapChars: 100, alertDailyChars: 1e9 }, azure: { dailyCapChars: 100, alertDailyChars: 1e9 } },
    jobRaises,
  })
  const go = { job: '#578', extraDailyChars: 1000, by: 'Tom', why: 'render the held backlog in one go', until: '2026-09-26T23:59:59Z' }

  it('the raised job renders past the daily cap, from its own allowance', async () => {
    const g = guard({ budgetPath: held([go]) })
    await expect(call(g, 'a'.repeat(600), { job: 'phase8 /generate x (job #578)' })).resolves.toBeTruthy()
    await expect(call(g, 'b'.repeat(300), { provider: 'azure', voiceId: 'az', job: 'phase8 /generate y (job #578)' })).resolves.toBeTruthy()
    const err = await call(g, 'c'.repeat(200), { job: 'job #578' }).catch(e => e)
    expect(err.code).toBe('DAILY_CAP')
    expect(err.message).toMatch(/job #578 has spent 900 chars today .* allowance of 1000/)
  })

  it('every other caller keeps the whole ordinary cap, as though the raised job had spent nothing', async () => {
    const g = guard({ budgetPath: held([go]) })
    await call(g, 'a'.repeat(900), { job: 'job #578' })
    await expect(call(g, 'd'.repeat(90), { job: 'job #600' })).resolves.toBeTruthy()
    const err = await call(g, 'e'.repeat(20), { job: 'job #600' }).catch(e => e)
    expect(err.code).toBe('DAILY_CAP')
  })

  it('only that job: "#5780" is not "#578", and an expired or unsigned raise lifts nothing', async () => {
    const g = guard({ budgetPath: held([go]) })
    expect((await call(g, 'f'.repeat(150), { job: 'job #5780' }).catch(e => e)).code).toBe('DAILY_CAP')
    const expired = guard({ budgetPath: held([{ ...go, until: '2026-09-25T23:59:59Z' }]) })
    expect((await call(expired, 'g'.repeat(150), { job: 'job #578' }).catch(e => e)).code).toBe('DAILY_CAP')
    const unsigned = guard({ budgetPath: held([{ job: '#578', extraDailyChars: 1000, until: go.until }]) })
    expect((await call(unsigned, 'h'.repeat(150), { job: 'job #578' }).catch(e => e)).code).toBe('DAILY_CAP')
  })
})
