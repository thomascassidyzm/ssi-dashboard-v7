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
  parseVisibilityRequest, nextVisibilityMetadata, describeActor, VISIBILITIES,
} = require('./pod-visibility.cjs')

const POD = 'cym_n_for_eng:pod-0'

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
