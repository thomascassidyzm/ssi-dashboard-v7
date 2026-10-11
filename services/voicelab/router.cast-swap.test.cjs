/**
 * PROMOTING A BACKUP VOICE TO PRIMARY MUST NOT TRIP no_self_backup (job #263).
 *
 * Tom, Admin → Labs, es-MX: casting a voice as female primary when that voice
 * already held female backup answered
 *   'duplicate key value violates unique constraint "voice_language_roles_no_self_backup"'.
 * The table allows a voice ONE rank per (slot, language, gender); the route
 * upserted the target rank directly. The fix is the cast_voice_role SQL
 * function (ops/sql/20261011-cast-voice-role-atomic.sql): leave the old rank,
 * fill the new one, displaced voice takes the vacated rank — one transaction.
 *
 * The stub enforces the SAME unique index on any direct upsert, so this test
 * is red against the old route (plain upsert → that error) and green against
 * the rpc route. The SQL itself was exercised on the live DB in a rolled-back
 * transaction.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import routerPkg from './router.cjs'
const { mount } = routerPkg

let roles
const key = (r) => `${r.slot}|${r.language}|${r.gender}`
const violates = (row) => roles.some((r) => key(r) === key(row) && r.voice_id === row.voice_id && r.rank !== row.rank)

function stubSupabase () {
  const table = (name) => {
    const chain = {
      select: () => chain, eq: () => chain, in: () => chain,
      limit: async () => ({ data: [], error: null }),
      maybeSingle: async () => ({ data: { voice_id: 'v', gender: 'f' } }),
      upsert: async (row) => {
        if (name !== 'voice_language_roles') return { error: null }
        if (violates(row)) return { error: { message: 'duplicate key value violates unique constraint "voice_language_roles_no_self_backup"' } }
        roles = roles.filter((r) => !(key(r) === key(row) && r.rank === row.rank)).concat(row)
        return { error: null }
      },
      then: (resolve) => resolve({ data: [], error: null }),
    }
    return chain
  }
  // mirrors cast_voice_role: leave old rank, fill target, displaced takes vacated rank
  const rpc = async (fn, a) => {
    if (fn !== 'cast_voice_role') return { data: null, error: { message: 'no such function' } }
    const k = `${a.p_slot}|${a.p_language}|${a.p_gender}`
    const cur = roles.find((r) => key(r) === k && r.voice_id === a.p_voice_id)
    const occ = roles.find((r) => key(r) === k && r.rank === a.p_rank)
    roles = roles.filter((r) => r !== cur && r !== occ)
    roles.push({ slot: a.p_slot, language: a.p_language, gender: a.p_gender, rank: a.p_rank, voice_id: a.p_voice_id })
    if (cur && occ) roles.push({ ...occ, rank: cur.rank })
    return { data: { swapped: !!(cur && occ), displaced: occ ? occ.voice_id : null }, error: null }
  }
  return { from: table, rpc }
}

let server, base
beforeAll(async () => {
  const app = express()
  app.use(express.json())
  mount(app, {
    requireAdmin: async () => ({ email: 'test@ssi' }),
    requireDashboardUser: async () => ({ email: 'test@ssi' }),
    logger: { log: () => {} },
    supabase: stubSupabase,
  })
  await new Promise((r) => { server = app.listen(0, r) })
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(() => server && server.close())

describe('PUT /languages/:language/slot — rank moves', () => {
  it('promotes the female backup to primary by swapping, without the unique-index error', async () => {
    roles = [
      { slot: 'phrase', language: 'spa_mx', gender: 'f', rank: 0, voice_id: 'cartesia_primary' },
      { slot: 'phrase', language: 'spa_mx', gender: 'f', rank: 1, voice_id: 'cartesia_backup' },
    ]
    const res = await fetch(`${base}/api/voicelab/languages/spa_mx/slot`, {
      method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slot: 'phrase', gender: 'f', rank: 0, voiceId: 'cartesia_backup' }),
    })
    const body = await res.json()
    expect(body.error).toBeUndefined()
    expect(res.status).toBe(200)
    expect(body.swapped).toBe(true)
    const f = (rank) => roles.find((r) => r.gender === 'f' && r.rank === rank).voice_id
    expect(f(0)).toBe('cartesia_backup')
    expect(f(1)).toBe('cartesia_primary')
    expect(roles).toHaveLength(2)
  })
})
