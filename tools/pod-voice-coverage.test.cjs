/**
 * Unit tests: A VOICE'S GENDER IS READ, NEVER ASSUMED (Tom, 2026-08-11).
 *
 * The premise this file kills: pod-voice-coverage.cjs used to carry, in prose
 * and in effect, "es and it natives are all-male", and topped Italian and
 * Spanish female slots up from multilingual voices because of it. The
 * 2026-08-11 xAI metadata reconciliation proved it wrong — `hqxr4yub` (Luca,
 * it) is FEMALE by xAI's own answer, now recorded in `voices.gender`.
 *
 * What has to hold:
 *   (a) gender comes from `voices.gender` for EVERY language and every tier —
 *       flip the column and the pool follows, with no language special-cased;
 *   (b) resolving is READ-ONLY: loading genders issues a select on `voices` and
 *       nothing else — no listening_pods, no courses.voice_config, no
 *       app_config, no write of any kind;
 *   (c) Italian: Luca is available as a NATIVE female voice, and the pool no
 *       longer claims Italian has no native F to top up from multilingual.
 *
 * Run: npx vitest run tools/pod-voice-coverage
 */

import { describe, it, expect, beforeEach } from 'vitest'

const coverage = require('./pod-voice-coverage.cjs')
const { resolveTargetPool, resolveKnownPool, loadVerifiedGenders, setVerifiedGenders, verifiedGenders } = coverage

// The live ids, so a rename in the JSON can't quietly make these tests vacuous.
const LUCA = 'hqxr4yub'        // it, xAI says FEMALE
const ENZO = 'x7avnu1k'        // it, xAI says male
const MANUEL = 'yis75yfp'      // es, xAI says male

/**
 * A Supabase client stub that records every call. Anything other than
 * `.from('voices').select(...).not(...)` is a test failure by construction:
 * there is no update/insert/upsert/delete on it at all, so a write throws.
 */
function fakeClient(rows) {
  const calls = []
  return {
    calls,
    from(table) {
      calls.push({ op: 'from', table })
      const builder = {
        select(cols) {
          calls.push({ op: 'select', table, cols })
          return builder
        },
        not(col, op, val) {
          calls.push({ op: 'not', table, col, args: [op, val] })
          return Promise.resolve({ data: rows, error: null })
        },
      }
      return builder
    },
  }
}

beforeEach(() => setVerifiedGenders(null))

describe('gender is read from voices.gender, not assumed', () => {
  it('loads the column and caches it', async () => {
    const client = fakeClient([
      { voice_id: LUCA, gender: 'f' },
      { voice_id: ENZO, gender: 'm' },
    ])
    const map = await loadVerifiedGenders({ client })
    expect(map.get(LUCA)).toBe('f')
    expect(verifiedGenders().get(ENZO)).toBe('m')

    // second call is served from cache — one read per process
    await loadVerifiedGenders({ client })
    expect(client.calls.filter(c => c.op === 'from').length).toBe(1)
    expect(client.calls.find(c => c.op === 'select').cols).toContain('gender')
  })

  it('reads ONLY the voices table, and only ever selects', async () => {
    const client = fakeClient([{ voice_id: LUCA, gender: 'f' }])
    await loadVerifiedGenders({ client })
    // Every table touched is `voices`; listening_pods / courses / app_config
    // are never even named, let alone written.
    expect([...new Set(client.calls.map(c => c.table))]).toEqual(['voices'])
    expect(client.calls.every(c => ['from', 'select', 'not'].includes(c.op))).toBe(true)
  })

  it('resolving a pool performs no database work at all', () => {
    setVerifiedGenders({ [LUCA]: 'f' })
    // No client is in play; if resolve tried to read or write anything it would
    // have to construct one, and this would throw on missing credentials.
    const pool = resolveTargetPool('ita')
    expect(pool.genderSource).toBe('voices.gender')
    expect(pool.f.length).toBeGreaterThan(0)
  })

  it('follows the column even when the JSON catalogue disagrees', () => {
    // The column, not the shipped label, decides. Flip Enzo (catalogue: male)
    // to female and he moves list; flip Luca back to male and she moves too.
    setVerifiedGenders({ [ENZO]: 'f', [LUCA]: 'm' })
    const pool = resolveTargetPool('ita')
    expect(pool.f.map(v => v.voice_id)).toContain(ENZO)
    expect(pool.m.map(v => v.voice_id)).toContain(LUCA)
    expect(pool.f.find(v => v.voice_id === ENZO).gender).toBe('f')
  })

  it('is generic — the same flip works on a language nobody hard-coded', () => {
    setVerifiedGenders({ [MANUEL]: 'f' })
    const spa = resolveTargetPool('spa')
    expect(spa.f.map(v => v.voice_id)).toContain(MANUEL)
    // and the same voice cannot appear in both lists
    expect(spa.m.map(v => v.voice_id)).not.toContain(MANUEL)
  })

  it('falls back to the catalogue, and says so, when nobody has loaded the column', () => {
    const pool = resolveTargetPool('ita')
    expect(pool.genderSource).toBe('catalogue')
  })

  it('a voice the provider states nothing about keeps its catalogue label', () => {
    setVerifiedGenders({ [LUCA]: 'f' })   // Enzo absent from the map
    const pool = resolveTargetPool('ita')
    expect(pool.m.map(v => v.voice_id)).toContain(ENZO)
  })
})

describe('Italian: the all-male assumption is gone', () => {
  beforeEach(() => setVerifiedGenders({ [LUCA]: 'f', [ENZO]: 'm' }))

  it('Luca is a NATIVE female option, ahead of any multilingual top-up', () => {
    const pool = resolveTargetPool('ita')
    expect(pool.tier).toBe(1)
    expect(pool.f[0].voice_id).toBe(LUCA)         // natives lead; multilingual only overflows
    expect(pool.f[0].name).toBe('Luca')
    expect(pool.f[0].gender).toBe('f')
  })

  it('the pool no longer claims Italian has no native F', () => {
    const pool = resolveTargetPool('ita')
    expect(pool.note).not.toMatch(/no native F/)
    expect(pool.note).not.toMatch(/all-male/)
  })

  it('a language that genuinely has no native female still tops up, by data not by list', () => {
    // Spanish, as the column actually stands: every native es voice male.
    const pool = resolveTargetPool('spa')
    expect(pool.note).toMatch(/no native F → from multilingual/)
    expect(pool.f.length).toBeGreaterThan(0)
    expect(pool.f.every(v => v.gender === 'f')).toBe(true)
  })
})

describe('shape is unchanged for everyone downstream', () => {
  it('voice objects keep exactly their old keys', () => {
    setVerifiedGenders({ [LUCA]: 'f' })
    const v = resolveTargetPool('fra').f[0]
    expect(Object.keys(v).sort()).toEqual(['gender', 'locale', 'name', 'provider', 'voice_id'])
  })

  it('Azure tiers and the English known pool still resolve', () => {
    setVerifiedGenders(new Map())
    const azure = resolveTargetPool('hun')
    expect(azure.tier).toBe(3)
    expect(azure.f.length + azure.m.length).toBeGreaterThan(0)
    expect(azure.f.every(v => v.provider === 'azure')).toBe(true)

    const known = resolveKnownPool('eng')
    expect(known.f[0].voice_id).toBe(known.m[0].voice_id)
  })

  it('human-only languages are untouched', () => {
    const bre = resolveTargetPool('bre')
    expect(bre.human).toBe(true)
    expect(bre.f).toEqual([])
  })
})
