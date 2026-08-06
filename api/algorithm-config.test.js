/**
 * The config write path, pinned where a silent regression would be expensive.
 *
 * Two classes of thing are asserted here and they matter for different reasons:
 *
 *   1. NOTHING THAT WORKS TODAY CHANGED. The GET response keeps its shape, a
 *      published PATCH still returns { row } and still writes algorithm_config.
 *      ListeningConfig, SpeakingConfig, VadLab, PodLab and the learning app all
 *      read this endpoint and none of them was touched.
 *   2. A DRAFT NEVER REACHES A LEARNER. channel:'draft' must write a version
 *      and a pointer and leave algorithm_config strictly alone — if that ever
 *      silently starts writing the live row, a lab experiment becomes a
 *      production deploy within five minutes and nobody would see it happen.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase, createFakeRes } from './lib/fake-supabase.js'
import { hashConfig } from './lib/config-hash.js'

const state = vi.hoisted(() => ({ db: null, user: { email: 'tom@ssi.app' } }))

vi.mock('./lib/supabase.js', () => ({ getSupabase: () => state.db }))
vi.mock('./lib/auth.js', () => ({ verifySupabaseJWT: async () => state.user }))

const { default: handler } = await import('./algorithm-config.js')

const PODS = { gap: 1.5, tail: 2 }
const LISTENING = { cycles: 3 }

function seed() {
  return createFakeSupabase({
    algorithm_config: [
      { key: 'listening', config: LISTENING, description: 'listening', updated_at: '2026-01-01T00:00:00Z', updated_by: 'old' },
      { key: 'pods', config: PODS, description: 'pods', updated_at: '2026-01-01T00:00:00Z', updated_by: 'old' },
    ],
    algorithm_config_versions: [
      { config_hash: hashConfig('pods', PODS), key: 'pods', config: PODS, created_at: '2026-01-01T00:00:00Z' },
    ],
    algorithm_config_pointers: [
      { key: 'pods', channel: 'published', config_hash: hashConfig('pods', PODS) },
    ],
  })
}

function patch(body, { auth = 'Bearer t' } = {}) {
  const res = createFakeRes()
  return handler({ method: 'PATCH', headers: { authorization: auth }, body }, res).then(() => res)
}

beforeEach(() => {
  state.db = seed()
  state.user = { email: 'tom@ssi.app' }
})

describe('GET /api/algorithm-config', () => {
  it('keeps its existing response shape, and adds the published config_hash', async () => {
    const res = createFakeRes()
    await handler({ method: 'GET', query: {} }, res)

    expect(res.statusCode).toBe(200)
    expect(res.body.rows).toHaveLength(2)
    const pods = res.body.rows.find(r => r.key === 'pods')
    expect(pods).toEqual({
      key: 'pods',
      config: PODS,
      description: 'pods',
      updated_at: '2026-01-01T00:00:00Z',
      updated_by: 'old',
      config_hash: hashConfig('pods', PODS),
    })
  })

  it('reports config_hash: null for a key with no published pointer, rather than failing the read', async () => {
    const res = createFakeRes()
    await handler({ method: 'GET', query: {} }, res)
    expect(res.body.rows.find(r => r.key === 'listening').config_hash).toBeNull()
  })

  it('still serves the rows when the pointer table is unreachable', async () => {
    state.db.errors.algorithm_config_pointers = { message: 'relation does not exist' }
    const res = createFakeRes()
    await handler({ method: 'GET', query: {} }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body.rows).toHaveLength(2)
    expect(res.body.rows.every(r => r.config_hash === null)).toBe(true)
  })
})

describe('PATCH — publish', () => {
  it('writes the version, the pointer AND algorithm_config, and returns the old { row } shape', async () => {
    const next = { gap: 9 }
    const res = await patch({ key: 'pods', config: next })
    const hash = hashConfig('pods', next)

    expect(res.statusCode).toBe(200)
    expect(res.body.row.config).toEqual(next)
    expect(res.body.row.updated_by).toBe('tom@ssi.app')
    expect(res.body.config_hash).toBe(hash)

    expect(state.db.tables.algorithm_config.find(r => r.key === 'pods').config).toEqual(next)
    expect(state.db.tables.algorithm_config_versions.find(v => v.config_hash === hash)).toMatchObject({ key: 'pods', config: next })
    expect(state.db.tables.algorithm_config_pointers.find(p => p.key === 'pods' && p.channel === 'published').config_hash).toBe(hash)
  })

  it('defaults to the published channel when the caller sends none — every existing caller', async () => {
    await patch({ key: 'pods', config: { gap: 4 } })
    expect(state.db.tables.algorithm_config.find(r => r.key === 'pods').config).toEqual({ gap: 4 })
    expect(state.db.tables.algorithm_config_pointers.filter(p => p.channel === 'draft')).toHaveLength(0)
  })

  it('records the note and the actor on the version', async () => {
    await patch({ key: 'pods', config: { gap: 7 }, note: 'VOICELAB experiment 0' })
    const v = state.db.tables.algorithm_config_versions.find(x => x.config_hash === hashConfig('pods', { gap: 7 }))
    expect(v.note).toBe('VOICELAB experiment 0')
    expect(v.created_by).toBe('tom@ssi.app')
  })

  it('does not grow the history when the same config is saved again', async () => {
    await patch({ key: 'pods', config: PODS })
    await patch({ key: 'pods', config: PODS })
    expect(state.db.tables.algorithm_config_versions.filter(v => v.key === 'pods')).toHaveLength(1)
  })

  it('is unaffected by key insertion order — a reordered save is the same version', async () => {
    await patch({ key: 'pods', config: { tail: 2, gap: 1.5 } })
    expect(state.db.tables.algorithm_config_versions.filter(v => v.key === 'pods')).toHaveLength(1)
  })
})

describe('PATCH — draft', () => {
  it('writes a version and a draft pointer and NEVER touches algorithm_config', async () => {
    const draft = { gap: 42 }
    const res = await patch({ key: 'pods', config: draft, channel: 'draft' })
    const hash = hashConfig('pods', draft)

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ draft: { key: 'pods', config_hash: hash, config: draft } })
    expect(res.body.row).toBeUndefined()

    // The live value is exactly what it was.
    expect(state.db.tables.algorithm_config.find(r => r.key === 'pods')).toMatchObject({
      config: PODS, updated_by: 'old', updated_at: '2026-01-01T00:00:00Z',
    })
    expect(state.db.tables.algorithm_config_versions.find(v => v.config_hash === hash)).toBeTruthy()
    expect(state.db.tables.algorithm_config_pointers.find(p => p.key === 'pods' && p.channel === 'draft').config_hash).toBe(hash)
    // ...and the published pointer has not moved.
    expect(state.db.tables.algorithm_config_pointers.find(p => p.key === 'pods' && p.channel === 'published').config_hash)
      .toBe(hashConfig('pods', PODS))
  })

  it('rejects a channel that is neither published nor draft', async () => {
    const res = await patch({ key: 'pods', config: { a: 1 }, channel: 'staging' })
    expect(res.statusCode).toBe(400)
    expect(state.db.tables.algorithm_config_versions).toHaveLength(1)
  })
})

describe('PATCH — auth and validation, unchanged', () => {
  it('401s with no token', async () => {
    const res = await patch({ key: 'pods', config: { a: 1 } }, { auth: '' })
    expect(res.statusCode).toBe(401)
  })

  it('401s when the token does not verify, and writes nothing', async () => {
    state.user = null
    const res = await patch({ key: 'pods', config: { a: 1 } })
    expect(res.statusCode).toBe(401)
    expect(state.db.tables.algorithm_config_versions).toHaveLength(1)
  })

  it('400s on a missing key or a non-object config', async () => {
    expect((await patch({ config: { a: 1 } })).statusCode).toBe(400)
    expect((await patch({ key: 'pods' })).statusCode).toBe(400)
    expect((await patch({ key: 'pods', config: [1, 2] })).statusCode).toBe(400)
  })

  it('CREATES a key that does not exist yet, rather than failing', async () => {
    // Deliberate flip of the old assertion (2026-08-06). The write was a bare
    // .update().eq('key'), so a key with no row came back as an error and
    // "add a learning mode" was an engineering ticket — a hand-written SQL
    // insert — instead of an admin action. Creating `easy_mode` from the
    // Speaking page was exactly that case. onConflict:'key' keeps an existing
    // row's identity, so the update path is unchanged.
    const res = await patch({ key: 'easy_mode', config: { pause_boot_ms: 4000 } })
    expect(res.statusCode).toBe(200)
    expect(res.body.row.config).toEqual({ pause_boot_ms: 4000 })
    expect(res.body.config_hash).toBe(hashConfig('easy_mode', { pause_boot_ms: 4000 }))
    expect(state.db.tables.algorithm_config.find(r => r.key === 'easy_mode').config)
      .toEqual({ pause_boot_ms: 4000 })
  })
})
