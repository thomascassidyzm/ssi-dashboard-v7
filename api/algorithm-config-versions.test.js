/**
 * The history and the way back.
 *
 * The load-bearing assertion is that a ROLLBACK CREATES NO VERSION — it moves
 * a pointer. If a rollback ever starts minting rows, rolling back and forth
 * twice buries the value you were comparing against, which is the exact
 * failure the versioning exists to remove. The other one is the cross-key 404:
 * serving `pods` a `listening` config would be the hardest kind of wrong to
 * notice afterwards.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase, createFakeRes } from './lib/fake-supabase.js'
import { hashConfig } from './lib/config-hash.js'

const state = vi.hoisted(() => ({ db: null, user: { email: 'tom@ssi.app' } }))

vi.mock('./lib/supabase.js', () => ({ getSupabase: () => state.db }))
vi.mock('./lib/auth.js', () => ({ verifySupabaseJWT: async () => state.user }))

const { default: handler } = await import('./algorithm-config-versions.js')

const OLD = { gap: 1 }
const NEW = { gap: 2 }
const DRAFTED = { gap: 3 }
const LISTENING = { cycles: 3 }

const OLD_HASH = hashConfig('pods', OLD)
const NEW_HASH = hashConfig('pods', NEW)
const DRAFT_HASH = hashConfig('pods', DRAFTED)
const LISTENING_HASH = hashConfig('listening', LISTENING)

function seed() {
  return createFakeSupabase({
    algorithm_config: [
      { key: 'pods', config: NEW, description: 'pods', updated_at: '2026-03-01T00:00:00Z', updated_by: 'someone' },
    ],
    algorithm_config_versions: [
      { config_hash: OLD_HASH, key: 'pods', config: OLD, created_at: '2026-01-01T00:00:00Z', created_by: 'a', note: 'first' },
      { config_hash: NEW_HASH, key: 'pods', config: NEW, created_at: '2026-03-01T00:00:00Z', created_by: 'b', note: null },
      { config_hash: DRAFT_HASH, key: 'pods', config: DRAFTED, created_at: '2026-02-01T00:00:00Z', created_by: 'c', note: 'trying' },
      { config_hash: LISTENING_HASH, key: 'listening', config: LISTENING, created_at: '2026-02-15T00:00:00Z', created_by: 'a', note: null },
    ],
    algorithm_config_pointers: [
      { key: 'pods', channel: 'published', config_hash: NEW_HASH },
      { key: 'pods', channel: 'draft', config_hash: DRAFT_HASH },
      { key: 'listening', channel: 'published', config_hash: LISTENING_HASH },
    ],
  })
}

function get(query = {}) {
  const res = createFakeRes()
  return handler({ method: 'GET', query }, res).then(() => res)
}

function post(body, { auth = 'Bearer t' } = {}) {
  const res = createFakeRes()
  return handler({ method: 'POST', headers: { authorization: auth }, body }, res).then(() => res)
}

beforeEach(() => {
  state.db = seed()
  state.user = { email: 'tom@ssi.app' }
})

describe('GET — the history for a key', () => {
  it('returns that key only, newest first, flagged with what is live and what is drafted', async () => {
    const res = await get({ key: 'pods' })

    expect(res.statusCode).toBe(200)
    expect(res.body.versions.map(v => v.config_hash)).toEqual([NEW_HASH, DRAFT_HASH, OLD_HASH])
    expect(res.body.versions.map(v => v.key)).toEqual(['pods', 'pods', 'pods'])

    const [live, drafted, old] = res.body.versions
    expect(live).toMatchObject({ is_published: true, is_draft: false, config: NEW })
    expect(drafted).toMatchObject({ is_published: false, is_draft: true, note: 'trying' })
    expect(old).toMatchObject({ is_published: false, is_draft: false, created_by: 'a' })
  })

  it('returns every key when none is given', async () => {
    const res = await get({})
    expect(res.body.versions).toHaveLength(4)
    expect(res.body.versions.map(v => v.key)).toContain('listening')
  })

  it('does not flag another key version as published just because the hash is somewhere', async () => {
    const res = await get({ key: 'listening' })
    expect(res.body.versions).toHaveLength(1)
    expect(res.body.versions[0]).toMatchObject({ key: 'listening', is_published: true })
  })
})

describe('POST — rollback', () => {
  it('repoints published and rewrites the live config, creating NO new version', async () => {
    const before = state.db.tables.algorithm_config_versions.length

    const res = await post({ key: 'pods', config_hash: OLD_HASH })

    expect(res.statusCode).toBe(200)
    expect(res.body.config_hash).toBe(OLD_HASH)
    expect(res.body.row.config).toEqual(OLD)
    expect(res.body.row.updated_by).toBe('tom@ssi.app')

    expect(state.db.tables.algorithm_config_versions).toHaveLength(before)
    expect(state.db.tables.algorithm_config.find(r => r.key === 'pods').config).toEqual(OLD)
    expect(state.db.tables.algorithm_config_pointers.find(p => p.key === 'pods' && p.channel === 'published').config_hash)
      .toBe(OLD_HASH)
  })

  it('leaves the draft pointer alone — rolling back production is not abandoning the draft', async () => {
    await post({ key: 'pods', config_hash: OLD_HASH })
    expect(state.db.tables.algorithm_config_pointers.find(p => p.key === 'pods' && p.channel === 'draft').config_hash)
      .toBe(DRAFT_HASH)
  })

  it('can be rolled back and forth without growing the history', async () => {
    const before = state.db.tables.algorithm_config_versions.length
    await post({ key: 'pods', config_hash: OLD_HASH })
    await post({ key: 'pods', config_hash: NEW_HASH })
    await post({ key: 'pods', config_hash: OLD_HASH })
    expect(state.db.tables.algorithm_config_versions).toHaveLength(before)
    expect(state.db.tables.algorithm_config.find(r => r.key === 'pods').config).toEqual(OLD)
  })

  it('404s on a hash that belongs to a DIFFERENT key, and changes nothing', async () => {
    const res = await post({ key: 'pods', config_hash: LISTENING_HASH })
    expect(res.statusCode).toBe(404)
    expect(state.db.tables.algorithm_config.find(r => r.key === 'pods').config).toEqual(NEW)
    expect(state.db.tables.algorithm_config_pointers.find(p => p.key === 'pods' && p.channel === 'published').config_hash)
      .toBe(NEW_HASH)
  })

  it('404s on a hash that does not exist at all', async () => {
    const res = await post({ key: 'pods', config_hash: 'f'.repeat(64) })
    expect(res.statusCode).toBe(404)
  })

  it('needs the same session a save needs', async () => {
    expect((await post({ key: 'pods', config_hash: OLD_HASH }, { auth: '' })).statusCode).toBe(401)
    state.user = null
    expect((await post({ key: 'pods', config_hash: OLD_HASH })).statusCode).toBe(401)
    expect(state.db.tables.algorithm_config.find(r => r.key === 'pods').config).toEqual(NEW)
  })

  it('400s without a key or a config_hash', async () => {
    expect((await post({ config_hash: OLD_HASH })).statusCode).toBe(400)
    expect((await post({ key: 'pods' })).statusCode).toBe(400)
  })
})

describe('method handling', () => {
  it('405s anything else', async () => {
    const res = createFakeRes()
    await handler({ method: 'DELETE', query: {} }, res)
    expect(res.statusCode).toBe(405)
  })
})
