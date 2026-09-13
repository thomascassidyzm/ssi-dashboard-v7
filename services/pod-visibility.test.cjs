// The hold/release decision logic (Tom, 2026-08-23).
//
// Two things are pinned here because both are one careless edit away from
// breaking the ruling: RELEASE MUST BE DELIBERATE (a bare {visibility:'live'}
// is refused), and the metadata trail must be a read-modify-write that carries
// every existing key — scene_hashes in particular, which is pod-sync's diff
// baseline and would silently break re-syncs if a hold clobbered it.

// ESM import of vitest inside a .cjs test — the house style here
// (services/pod-voice-approvals.test.cjs does the same); vitest refuses a
// require() of itself.
import { describe, it, expect } from 'vitest'

const {
  parseVisibilityRequest, checkVisibilityTransition, nextVisibilityMetadata, describeActor, VISIBILITIES,
} = require('./pod-visibility.cjs')

const POD = 'cym_n_for_eng:pod-1'

describe('parseVisibilityRequest — release is a deliberate act', () => {
  it('holds on a bare request: erring towards invisible needs no ceremony', () => {
    expect(parseVisibilityRequest({ visibility: 'held' }, POD)).toEqual({ ok: true, visibility: 'held' })
  })

  it('REFUSES a bare release', () => {
    const r = parseVisibilityRequest({ visibility: 'live' }, POD)
    expect(r.ok).toBe(false)
    expect(r.status).toBe(400)
    expect(r.error).toContain(POD)
  })

  it('refuses a release that confirms a DIFFERENT pod', () => {
    // A copy-pasted curl aimed at the wrong course must not go through.
    expect(parseVisibilityRequest({ visibility: 'live', confirm: 'hrv_for_eng:pod-1' }, POD).ok).toBe(false)
  })

  it('releases when the caller names the pod it means', () => {
    expect(parseVisibilityRequest({ visibility: 'live', confirm: POD }, POD)).toEqual({ ok: true, visibility: 'live' })
    expect(parseVisibilityRequest({ visibility: 'live', confirm: ` ${POD} ` }, POD).ok).toBe(true)
  })

  it('rejects anything that is not one of the two stored values', () => {
    for (const bad of [undefined, '', 'draft', 'published', 'LIVE', true]) {
      expect(parseVisibilityRequest({ visibility: bad }, POD).ok).toBe(false)
    }
    expect(VISIBILITIES).toEqual(['live', 'held'])
  })

  it('survives a missing body', () => {
    expect(parseVisibilityRequest(undefined, POD).ok).toBe(false)
    expect(parseVisibilityRequest(null, POD).ok).toBe(false)
  })
})

describe('checkVisibilityTransition — a live pod is never pulled back (Tom, 2026-09-13)', () => {
  it('REFUSES live → held with 409, in Tom\'s words', () => {
    // "you can't unpublished a course, once it's gone live it can only ever be
    // fixed line by line" — the red Hold-back button on a live pod is gone, and
    // this is the lever behind it closing too.
    const r = checkVisibilityTransition('live', 'held')
    expect(r.ok).toBe(false)
    expect(r.status).toBe(409)
    expect(r.error).toMatch(/live pod is never pulled back/i)
    expect(r.error).toMatch(/line by line/i)
  })

  it('still lets a held pod be released — going live stays a human act (2026-08-23)', () => {
    expect(checkVisibilityTransition('held', 'live')).toEqual({ ok: true })
  })

  it('still lets a held pod be held (no-op), and a live pod stay live (no-op)', () => {
    expect(checkVisibilityTransition('held', 'held')).toEqual({ ok: true })
    expect(checkVisibilityTransition('live', 'live')).toEqual({ ok: true })
  })

  it('only an explicit live refuses a hold: an odd column value reads as held everywhere else', () => {
    expect(checkVisibilityTransition(null, 'held')).toEqual({ ok: true })
    expect(checkVisibilityTransition(undefined, 'held')).toEqual({ ok: true })
  })
})

describe('nextVisibilityMetadata — the trail, without clobbering the jsonb', () => {
  const actor = { name: 'Tom Cassidy', email: 'tom@saysomethingin.com' }
  const NOW = '2026-08-23T18:00:00.000Z'

  it('carries every existing key through a hold', () => {
    const existing = { scene_hashes: { 1: 'abc' }, sections: [{ number: 1 }], status: 'draft' }
    const next = nextVisibilityMetadata(existing, { visibility: 'held', actor, nowIso: NOW })
    expect(next.scene_hashes).toEqual({ 1: 'abc' })
    expect(next.sections).toEqual([{ number: 1 }])
    expect(next.status).toBe('draft')
    expect(next.held_at).toBe(NOW)
    expect(next.held_by).toBe('Tom Cassidy <tom@saysomethingin.com>')
  })

  it('does not mutate the row it was handed', () => {
    const existing = { status: 'draft' }
    nextVisibilityMetadata(existing, { visibility: 'held', actor, nowIso: NOW })
    expect(existing).toEqual({ status: 'draft' })
  })

  it('keeps held_at when releasing, so the hold stays on the record', () => {
    const held = nextVisibilityMetadata({}, { visibility: 'held', actor, nowIso: NOW })
    const released = nextVisibilityMetadata(held, {
      visibility: 'live', actor, nowIso: '2026-08-25T09:00:00.000Z',
    })
    expect(released.held_at).toBe(NOW)
    expect(released.released_at).toBe('2026-08-25T09:00:00.000Z')
    expect(released.released_by).toBe('Tom Cassidy <tom@saysomethingin.com>')
  })

  it('starts from an empty object when metadata is null or the wrong shape', () => {
    expect(nextVisibilityMetadata(null, { visibility: 'held', actor, nowIso: NOW }).held_at).toBe(NOW)
    expect(nextVisibilityMetadata([1, 2], { visibility: 'held', actor, nowIso: NOW }).held_at).toBe(NOW)
  })
})

describe('describeActor — the trail names a human', () => {
  it('prefers name + email', () => {
    expect(describeActor({ name: 'Kai', email: 'kai@x.com' })).toBe('Kai <kai@x.com>')
  })
  it('does not print an email twice when the name IS the email', () => {
    expect(describeActor({ name: 'kai@x.com', email: 'kai@x.com' })).toBe('kai@x.com')
  })
  it('falls back rather than writing an empty trail', () => {
    expect(describeActor({ email: 'kai@x.com' })).toBe('kai@x.com')
    expect(describeActor({ name: 'Kai' })).toBe('Kai')
    expect(describeActor(null)).toBe('unknown')
    expect(describeActor({})).toBe('unknown')
  })
})

// ---------------------------------------------------------------------------
// applyVisibilityChange — the race Astra found (cold-check #582, 2026-09-13):
// a hold that read 'held', then lost the CPU to a release, then wrote. The
// write must be a compare-and-swap on the state that was judged, and a no-op
// must not write at all (held → held re-stamped held_at on cym_s pod-1 at
// 20:07:45Z the same day).
// ---------------------------------------------------------------------------
const { applyVisibilityChange } = require('./pod-visibility.cjs')

/** An in-memory listening_pods with an honest WHERE visibility = <expected>. */
function fakeStore(initial) {
  const rows = new Map(Object.entries(initial).map(([id, r]) => [id, { id, ...r }]))
  const writes = []
  // Test hooks: stall a caller after its SELECT or before its UPDATE, so a
  // second caller can run start-to-finish in the gap — the interleaving Astra
  // described, made deterministic.
  const gates = { afterRead: null, beforeWrite: null }
  return {
    rows, writes, gates,
    readPod: async (id) => {
      const data = rows.has(id) ? { ...rows.get(id) } : null
      if (gates.afterRead) { const g = gates.afterRead; gates.afterRead = null; await g }
      return data
    },
    updateWhereVisibility: async (id, expected, patch) => {
      if (gates.beforeWrite) { const g = gates.beforeWrite; gates.beforeWrite = null; await g }
      const row = rows.get(id)
      if (!row) return null
      const matches = expected === null || expected === undefined ? row.visibility == null : row.visibility === expected
      if (!matches) { writes.push({ id, expected, hit: false }); return null }
      Object.assign(row, patch)
      writes.push({ id, expected, hit: true, patch })
      return { ...row }
    },
  }
}
const ACTOR = { name: 'Tom', email: 'tom@example.com' }
const T = '2026-09-13T21:00:00.000Z'

describe('applyVisibilityChange — the write is conditional on the state it was judged against', () => {
  it('a hold that races a release NEVER writes held over a now-live pod (Astra #582)', async () => {
    const store = fakeStore({ [POD]: { visibility: 'held', metadata: { scene_hashes: { s1: 'x' } } } })
    // The hold has read 'held' and stalls (its check would pass on that read)…
    let releaseDone
    store.gates.afterRead = new Promise((r) => { releaseDone = r })
    const hold = applyVisibilityChange({ podId: POD, requested: 'held', actor: ACTOR, nowIso: T, store })
    await new Promise((r) => setImmediate(r))
    // …while a release runs start to finish.
    const release = await applyVisibilityChange({ podId: POD, requested: 'live', actor: ACTOR, nowIso: T, store })
    expect(release.status).toBe(200)
    expect(store.rows.get(POD).visibility).toBe('live')
    releaseDone()
    const r = await hold
    // The stale hold must not have written 'held' over the live pod. It is a
    // no-op on what it read (held → held), so it answers 200 without a write;
    // had it reached the UPDATE, the WHERE visibility = 'held' would miss and
    // the re-read would refuse it with the 409 rule text. Either way: no write.
    expect([200, 409]).toContain(r.status)
    if (r.status === 200) expect(r.body.noop).toBe(true)
    else expect(r.body.error).toMatch(/live pod is never pulled back/i)
    expect(store.rows.get(POD).visibility).toBe('live')
    expect(store.rows.get(POD).metadata.held_at).toBeUndefined()
    expect(store.rows.get(POD).metadata.scene_hashes).toEqual({ s1: 'x' })
    expect(store.writes.filter((w) => w.hit).map((w) => w.patch.visibility)).toEqual(['live'])
  })

  it('held → held is a 200 that writes NOTHING (no re-stamped held_at)', async () => {
    const meta = { held_at: '2026-09-13T20:00:00.000Z', held_by: 'Kai' }
    const store = fakeStore({ [POD]: { visibility: 'held', metadata: meta } })
    const r = await applyVisibilityChange({ podId: POD, requested: 'held', actor: ACTOR, nowIso: T, store })
    expect(r.status).toBe(200)
    expect(r.body.noop).toBe(true)
    expect(store.writes).toEqual([])
    expect(store.rows.get(POD).metadata).toEqual(meta)
  })

  it('live → live is likewise a silent 200', async () => {
    const store = fakeStore({ [POD]: { visibility: 'live', metadata: { released_at: T } } })
    const r = await applyVisibilityChange({ podId: POD, requested: 'live', actor: ACTOR, nowIso: T, store })
    expect(r.status).toBe(200)
    expect(store.writes).toEqual([])
  })

  it('a plain held → live still lands, with the trail carried through', async () => {
    const store = fakeStore({ [POD]: { visibility: 'held', metadata: { held_at: 'a', scene_hashes: {} } } })
    const r = await applyVisibilityChange({ podId: POD, requested: 'live', actor: ACTOR, nowIso: T, store })
    expect(r.status).toBe(200)
    expect(r.body.was).toBe('held')
    expect(store.rows.get(POD).visibility).toBe('live')
    expect(store.rows.get(POD).metadata).toMatchObject({ held_at: 'a', released_at: T, scene_hashes: {} })
  })

  it('live → held is refused up front, before any write', async () => {
    const store = fakeStore({ [POD]: { visibility: 'live', metadata: {} } })
    const r = await applyVisibilityChange({ podId: POD, requested: 'held', actor: ACTOR, nowIso: T, store })
    expect(r.status).toBe(409)
    expect(store.writes).toEqual([])
  })

  it('two releases racing: the loser is a 200 no-op, not an error', async () => {
    const store = fakeStore({ [POD]: { visibility: 'held', metadata: {} } })
    let go
    store.gates.beforeWrite = new Promise((r) => { go = r })
    const first = applyVisibilityChange({ podId: POD, requested: 'live', actor: ACTOR, nowIso: T, store })
    await new Promise((r) => setImmediate(r))
    const second = await applyVisibilityChange({ podId: POD, requested: 'live', actor: ACTOR, nowIso: T, store })
    go()
    const r = await first
    expect(second.status).toBe(200)
    expect(r.status).toBe(200)
    expect(r.body.noop).toBe(true)
    expect(store.writes.filter((w) => w.hit)).toHaveLength(1)
  })

  it('404 when the pod does not exist', async () => {
    const r = await applyVisibilityChange({ podId: POD, requested: 'held', actor: ACTOR, nowIso: T, store: fakeStore({}) })
    expect(r.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// required_role on the same lever (job #605, 2026-09-13). Before this the only
// way to open the Senedd pod to every learner was a hand UPDATE.
// ---------------------------------------------------------------------------
const {
  parseRequiredRoleRequest, checkRequiredRoleTransition, applyRequiredRoleChange, nextRequiredRoleMetadata,
} = require('./pod-visibility.cjs')

const SENEDD = 'cym_n_for_eng:senedd-s4c-steve'

describe('parseRequiredRoleRequest — opening to everyone is as deliberate as a release', () => {
  it('REFUSES a bare {required_role: null}', () => {
    const r = parseRequiredRoleRequest({ required_role: null }, SENEDD)
    expect(r.ok).toBe(false)
    expect(r.status).toBe(400)
    expect(r.error).toContain(SENEDD)
  })
  it('clears the role when the caller names the pod it means', () => {
    expect(parseRequiredRoleRequest({ required_role: null, confirm: SENEDD }, SENEDD)).toEqual({ ok: true, requiredRole: null })
    expect(parseRequiredRoleRequest({ required_role: null, confirm: 'cym_n_for_eng:pod-1' }, SENEDD).ok).toBe(false)
  })
  it('sets a role with no ceremony, trimmed', () => {
    expect(parseRequiredRoleRequest({ required_role: ' previewer_002 ' }, SENEDD)).toEqual({ ok: true, requiredRole: 'previewer_002' })
  })
  it('rejects an empty or non-string role', () => {
    for (const bad of ['', '   ', 7, true, {}]) {
      expect(parseRequiredRoleRequest({ required_role: bad }, SENEDD).ok).toBe(false)
    }
  })
})

describe('checkRequiredRoleTransition — a live pod is only ever widened', () => {
  it('opens a live pod to everyone', () => {
    expect(checkRequiredRoleTransition({ visibility: 'live', required_role: 'previewer_001' }, null).ok).toBe(true)
  })
  it('REFUSES setting or changing the role of a live pod with 409', () => {
    expect(checkRequiredRoleTransition({ visibility: 'live', required_role: null }, 'previewer_001').status).toBe(409)
    expect(checkRequiredRoleTransition({ visibility: 'live', required_role: 'previewer_001' }, 'previewer_002').status).toBe(409)
  })
  it('a held pod may be addressed, re-addressed or opened freely', () => {
    expect(checkRequiredRoleTransition({ visibility: 'held', required_role: null }, 'previewer_001').ok).toBe(true)
    expect(checkRequiredRoleTransition({ visibility: 'held', required_role: 'previewer_001' }, 'previewer_002').ok).toBe(true)
    expect(checkRequiredRoleTransition({ visibility: 'held', required_role: 'previewer_001' }, null).ok).toBe(true)
  })
  it('the same value on a live pod is not a change', () => {
    expect(checkRequiredRoleTransition({ visibility: 'live', required_role: 'previewer_001' }, 'previewer_001').ok).toBe(true)
  })
})

/** In-memory listening_pods with an honest WHERE required_role IS <expected>. */
function fakeRoleStore(initial) {
  const rows = new Map(Object.entries(initial).map(([id, r]) => [id, { id, ...r }]))
  const writes = []
  const gates = { afterRead: null }
  return {
    rows, writes, gates,
    readPod: async (id) => {
      const data = rows.has(id) ? { ...rows.get(id) } : null
      if (gates.afterRead) { const g = gates.afterRead; gates.afterRead = null; await g }
      return data
    },
    updateWhereRequiredRole: async (id, expected, patch) => {
      const row = rows.get(id)
      if (!row) return null
      const matches = expected === null ? row.required_role == null : row.required_role === expected
      if (!matches) { writes.push({ id, expected, hit: false }); return null }
      Object.assign(row, patch)
      writes.push({ id, expected, hit: true, patch })
      return { ...row }
    },
  }
}

describe('applyRequiredRoleChange — the Senedd opening as a request, not a hand statement', () => {
  it('opens the pod: previewer_001 → NULL, trail carried through, scene_hashes intact', async () => {
    const store = fakeRoleStore({ [SENEDD]: { visibility: 'live', required_role: 'previewer_001', metadata: { scene_hashes: { s1: 'x' }, released_at: '2026-09-13T16:20:59.833Z' } } })
    const r = await applyRequiredRoleChange({ podId: SENEDD, requested: null, actor: ACTOR, nowIso: T, store })
    expect(r.status).toBe(200)
    expect(r.body.wasRole).toBe('previewer_001')
    expect(store.rows.get(SENEDD).required_role).toBe(null)
    const meta = store.rows.get(SENEDD).metadata
    expect(meta.scene_hashes).toEqual({ s1: 'x' })
    expect(meta.released_at).toBe('2026-09-13T16:20:59.833Z')
    expect(meta.required_role_was).toBe('previewer_001')
    expect(meta.required_role_now).toBe(null)
    expect(meta.required_role_set_by).toBe('Tom <tom@example.com>')
  })
  it('a repeat is a 200 that writes NOTHING', async () => {
    const store = fakeRoleStore({ [SENEDD]: { visibility: 'live', required_role: null, metadata: {} } })
    const r = await applyRequiredRoleChange({ podId: SENEDD, requested: null, actor: ACTOR, nowIso: T, store })
    expect(r.status).toBe(200)
    expect(r.body.noop).toBe(true)
    expect(store.writes).toEqual([])
  })
  it('refuses to narrow a live pod before any write', async () => {
    const store = fakeRoleStore({ [SENEDD]: { visibility: 'live', required_role: null, metadata: {} } })
    const r = await applyRequiredRoleChange({ podId: SENEDD, requested: 'previewer_001', actor: ACTOR, nowIso: T, store })
    expect(r.status).toBe(409)
    expect(store.writes).toEqual([])
  })
  it('two openings racing: the loser is a 200 no-op, never a second stamp', async () => {
    const store = fakeRoleStore({ [SENEDD]: { visibility: 'live', required_role: 'previewer_001', metadata: {} } })
    let release
    store.gates.afterRead = new Promise((res) => { release = res })
    const first = applyRequiredRoleChange({ podId: SENEDD, requested: null, actor: ACTOR, nowIso: T, store })
    await new Promise((r) => setTimeout(r, 0))
    const second = await applyRequiredRoleChange({ podId: SENEDD, requested: null, actor: ACTOR, nowIso: '2026-09-13T21:00:01.000Z', store })
    expect(second.status).toBe(200)
    expect(second.body.noop).toBeUndefined()
    release()
    const r = await first
    expect(r.status).toBe(200)
    expect(r.body.noop).toBe(true)
    expect(store.writes.filter((w) => w.hit)).toHaveLength(1)
    expect(store.rows.get(SENEDD).metadata.required_role_set_at).toBe('2026-09-13T21:00:01.000Z')
  })
  it('404 when the pod does not exist', async () => {
    const r = await applyRequiredRoleChange({ podId: 'nope:pod', requested: null, actor: ACTOR, nowIso: T, store: fakeRoleStore({}) })
    expect(r.status).toBe(404)
  })
  it('the trail never mutates the row it was handed', () => {
    const existing = { scene_hashes: { s1: 'x' } }
    nextRequiredRoleMetadata(existing, { requiredRole: null, was: 'previewer_001', actor: ACTOR, nowIso: T })
    expect(existing).toEqual({ scene_hashes: { s1: 'x' } })
  })
})
