/**
 * The shared spend ledger (ops/sql/20260927-tts-spend-ledger.sql) against a
 * REAL Postgres, under real concurrency: several connection pools stand in for
 * several hosts, all reserving at once. This is the property #425's
 * host-local check-then-append could not have — and the whole point of
 * findings 3+4 in job #430.
 *
 * Needs a THROWAWAY Postgres (never the shared Supabase): set
 *   TTS_SPEND_TEST_PG=postgres://postgres:pw@localhost:55432/postgres
 * and it creates, uses and drops its own database. Without it the suite is
 * skipped — say so if you report it.
 * Run: TTS_SPEND_TEST_PG=… npx vitest run services/shared/tts-spend-ledger.pg.test.cjs
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
const fs = require('fs')
const path = require('path')

const ADMIN = process.env.TTS_SPEND_TEST_PG
const MIGRATION = path.resolve(__dirname, '../../ops/sql/20260927-tts-spend-ledger.sql')
const DB = `tts_spend_test_${process.pid}`

describe.skipIf(!ADMIN)('the shared ledger under real concurrency (job #430)', () => {
  const { Pool, Client } = require('pg')
  const { pgSpendStore, createSpendGuard } = require('./tts-spend-guard.cjs')
  let url
  const pools = []
  /** A pool acting as service_role — one per simulated host. */
  const hostPool = () => {
    const p = new Pool({ connectionString: url, max: 6 })
    p.on('connect', (c) => { c.query('set role service_role') })
    pools.push(p)
    return p
  }
  const limits = (o = {}) => ({ dailyCapChars: 200, cycleStartDay: 1, cycleCapChars: 4_000_000, maxPerKey: 6, windowHours: 24, ...o })
  const req = (provider, i, o = {}) => ({ provider, voice: 'v', chars: 10, key: `${provider}-line-${i}`, textHash: 'h', course: 'zzz', job: 'pg-test', language: 'en', attempt: 1, limits: limits(), ...o })
  const settle = (ps) => Promise.allSettled(ps).then(rs => rs.map(r => r.status === 'fulfilled' ? r.value : { ok: false, code: 'THREW', message: String(r.reason) }))

  beforeAll(async () => {
    const admin = new Client({ connectionString: ADMIN }); await admin.connect()
    await admin.query(`drop database if exists ${DB}`)
    await admin.query(`create database ${DB}`)
    for (const r of ['anon', 'authenticated', 'service_role']) {
      await admin.query(`do $$ begin if not exists (select 1 from pg_roles where rolname = '${r}') then create role ${r}; end if; end $$`)
    }
    await admin.query('alter role service_role bypassrls')   // as on Supabase
    await admin.end()
    url = ADMIN.replace(/\/[^/?]*(\?|$)/, `/${DB}$1`)
    const c = new Client({ connectionString: url }); await c.connect()
    await c.query(fs.readFileSync(MIGRATION, 'utf8'))
    await c.end()
  }, 60000)

  afterAll(async () => {
    await Promise.all(pools.map(p => p.end()))
    const admin = new Client({ connectionString: ADMIN }); await admin.connect()
    await admin.query(`drop database if exists ${DB}`); await admin.end()
  })

  it('60 simultaneous reservations from 3 hosts against a 200-char daily cap: exactly 20 land, and the ledger sums to 200', async () => {
    const hosts = [pgSpendStore({ pool: hostPool() }), pgSpendStore({ pool: hostPool() }), pgSpendStore({ pool: hostPool() })]
    const out = await settle(Array.from({ length: 60 }, (_, i) => hosts[i % 3].reserve(req('race', i))))
    expect(out.filter(r => r.ok)).toHaveLength(20)
    expect(out.filter(r => !r.ok).every(r => r.code === 'DAILY_CAP')).toBe(true)
    const t = await hosts[0].totals('race', 1)
    expect(Number(t.today)).toBe(200)
  })

  it('30 simultaneous sends of the same words from 3 hosts: the repeat limit of 6 holds exactly', async () => {
    const hosts = [pgSpendStore({ pool: hostPool() }), pgSpendStore({ pool: hostPool() }), pgSpendStore({ pool: hostPool() })]
    const out = await settle(Array.from({ length: 30 }, (_, i) => hosts[i % 3].reserve(req('rep', 0, { key: 'same-words', limits: limits({ dailyCapChars: 10 ** 6 }) }))))
    expect(out.filter(r => r.ok)).toHaveLength(6)
    expect(out.filter(r => !r.ok).every(r => r.code === 'REPEAT')).toBe(true)
  })

  it('the full guard over the pg store: 40 concurrent door calls, cap 100 chars, 10 paid', async () => {
    const store = pgSpendStore({ pool: hostPool() })
    const g = createSpendGuard({ store, budgetPath: null, ledgerPath: path.join(require('os').tmpdir(), `pg-guard-${process.pid}.jsonl`), notify() {}, logger: { warn() {}, error() {} } })
    // Limits come from the committed baseline; a 100-char cap comes from a lower daily cap via the store request.
    const orig = store.reserve.bind(store)
    store.reserve = (r) => orig({ ...r, provider: 'guarded', limits: { ...r.limits, dailyCapChars: 100 } })
    const out = await Promise.allSettled(Array.from({ length: 40 }, (_, i) => (async () => { const text = `line ${String(i).padStart(5, '0')}`; const { lookupForRender, memoryClipLibrary } = require('./clip-library.cjs'); const { ticket } = await lookupForRender({ text, language: 'eng', voiceId: 'v', voiceBound: true }, memoryClipLibrary([])); return g.beforeProviderCall({ provider: 'guarded', voiceId: 'v', text, ticket }) })()))   // 10 chars each
    expect(out.filter(r => r.status === 'fulfilled')).toHaveLength(10)
  })

  it('the September seed is in the ledger: Cartesia is past its 50% stop the day the migration runs', async () => {
    const s = pgSpendStore({ pool: hostPool() })
    const r = await s.reserve(req('cartesia', 1, { limits: limits({ dailyCapChars: 10 ** 6 }) }))
    // The seed is dated 2026-09-26; inside September's cycle it refuses, after the reset it would not.
    if (new Date().toISOString() < '2026-10-01') expect(r).toMatchObject({ ok: false, code: 'POOL_SHARE' })
    const t = await s.totals('cartesia', 1)
    expect(t.tripped).toBeNull()
  })

  it('money rows cannot be edited or deleted by the service role, and a forced edit breaks the hash chain', async () => {
    const p = hostPool()
    const s = pgSpendStore({ pool: p })
    const ok = await s.reserve(req('tamper', 1))
    await s.reserve(req('tamper', 2))
    await expect(p.query('update tts_spend_ledger set chars = 0 where id = $1', [ok.id])).rejects.toThrow(/immutable/)
    await expect(p.query('delete from tts_spend_ledger where id = $1', [ok.id])).rejects.toThrow(/permission denied|never deleted/)
    await expect(p.query('truncate tts_spend_ledger')).rejects.toThrow(/permission denied|never truncated/)
    expect((await p.query("select tts_spend_verify_chain('tamper') as b")).rows[0].b).toBeNull()
    // A superuser who disables the trigger can still edit — and the chain names the row.
    const su = new Client({ connectionString: url }); await su.connect()
    await su.query('alter table tts_spend_ledger disable trigger tts_spend_ledger_immutable')
    await su.query('update tts_spend_ledger set chars = 0 where id = $1', [ok.id])
    await su.query('alter table tts_spend_ledger enable trigger tts_spend_ledger_immutable')
    await su.end()
    expect(String((await p.query("select tts_spend_verify_chain('tamper') as b")).rows[0].b)).toBe(String(ok.id))
  })

  it('anon cannot reserve, read or trip', async () => {
    const c = new Client({ connectionString: url }); await c.connect()
    await c.query('set role anon')
    await expect(c.query("select tts_spend_reserve('x','v',1,null,null,null,null,null,1,null,1,1,1,1,1,1,null)")).rejects.toThrow(/permission denied/)
    await expect(c.query('select * from tts_spend_ledger')).rejects.toThrow(/permission denied/)
    await expect(c.query("select tts_spend_trip('x','X','y',null)")).rejects.toThrow(/permission denied/)
    await c.end()
  })
})
