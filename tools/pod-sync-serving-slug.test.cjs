/**
 * Unit tests for the pod-sync DESTINATION gate (2026-09-02, job "the last three doors").
 *
 * The failure they exist to prevent. `tools/pod-sync.cjs` has WHOLESALE REPLACE
 * semantics: it deletes every sentence row of the named pod
 * (`.from('listening_pod_sentences').delete().eq('pod_id', podId)`) and re-inserts what
 * the markdown says. It had no serving-slug check, no learner-progress migration, and
 * the re-inserted rows carry NO AUDIO — its own header says the links "must be
 * re-established by the Phase 8 pod-audio step". And `--slug=pod-0` was the worked
 * example in its own usage block, twice. Run it on a live course's pod-0 with a markdown
 * that is one line different and you empty and refill a served pod under learners,
 * orphaning their progress rows against sentence ids that no longer exist, and the pod
 * plays silent until it is re-recorded.
 *
 * RECORDED RED, against the pre-fix behaviour. There was no gate at all, so the honest
 * reconstruction is a function that refuses nothing (tools/.pod-sync-prefix.scaffold.cjs,
 * deleted after the run):
 *   FAIL  REFUSES a resync onto pod-0, the slug its own usage examples used to hand you
 *     AssertionError: expected null to be truthy
 *   FAIL  REFUSES a resync onto pod-1 as well
 *     AssertionError: expected null to be truthy
 *   FAIL  REFUSES a held pod — the resolver never reads visibility
 *     AssertionError: expected null to be truthy
 *   FAIL  REFUSES a pod that does not exist yet — creating the core header row IS the serving
 *     AssertionError: expected null to be truthy
 *   FAIL  names the learners at risk, not a generic guard
 *     TypeError: .toMatch() expects to receive a string, but got object
 *   FAIL  says "0 learners currently" rather than staying silent, and still refuses
 *     AssertionError: expected null to be truthy
 *   FAIL  refuses when the learner count could not be read, and SAYS it was unavailable
 *     AssertionError: expected null to be truthy
 *   FAIL  names the --serve-now escape, and says the re-inserted rows carry no audio
 *     TypeError: .toMatch() expects to receive a string, but got object
 *
 *   Test Files  1 failed (1)
 *        Tests  8 failed | 3 passed (11)
 *
 * The 3 that passed are the not-a-door cases — a parked slug, a choice pod, and
 * --serve-now — which pass trivially against a gate that refuses nothing, and are here
 * so the fix has to keep them passing.
 */

import { describe, it, expect } from 'vitest'

const MOD = process.env.POD_SYNC_MODULE || './pod-sync.cjs'
const { syncRefusal } = require(MOD)

const serving = (over = {}) => ({
  podId: 'cym_for_eng:pod-0',
  slug: 'pod-0',
  podType: 'core',
  podExists: true,
  podVisibility: 'live',
  rows: 240,
  learnersOnCourse: 12,
  learnersOnPod: 9,
  serveNow: false,
  ...over,
})

describe('syncRefusal — a destination slug the player serves', () => {
  it('REFUSES a resync onto pod-0, the slug its own usage examples used to hand you', () => {
    const r = syncRefusal(serving())
    expect(r).toBeTruthy()
    expect(r).toMatch(/pod-0/)
    expect(r).toMatch(/serv/i)
  })

  it('REFUSES a resync onto pod-1 as well', () => {
    expect(syncRefusal(serving({ slug: 'pod-1', podId: 'hrv_for_eng:pod-1' }))).toBeTruthy()
  })

  it('REFUSES a held pod — the resolver never reads visibility', () => {
    expect(syncRefusal(serving({ podVisibility: 'held' }))).toBeTruthy()
  })

  it('REFUSES a pod that does not exist yet — creating the core header row IS the serving', () => {
    expect(syncRefusal(serving({ podExists: false, podVisibility: null, rows: 0, learnersOnPod: 0 }))).toBeTruthy()
  })

  it('names the learners at risk, not a generic guard', () => {
    const r = syncRefusal(serving())
    expect(r).toMatch(/12 learner/)
    expect(r).toMatch(/9/)
  })

  it('says "0 learners currently" rather than staying silent, and still refuses', () => {
    const r = syncRefusal(serving({ learnersOnCourse: 0, learnersOnPod: 0 }))
    expect(r).toBeTruthy()
    expect(r).toMatch(/0 learners currently/)
  })

  it('refuses when the learner count could not be read, and SAYS it was unavailable', () => {
    const r = syncRefusal(serving({ learnersOnCourse: null, learnersOnPod: null }))
    expect(r).toBeTruthy()
    expect(r).toMatch(/unavailable/i)
  })

  it('names the --serve-now escape, and says the re-inserted rows carry no audio', () => {
    const r = syncRefusal(serving())
    expect(r).toMatch(/--serve-now/)
    expect(r).toMatch(/audio/i)
  })
})

describe('syncRefusal — what is NOT a door', () => {
  it('allows a parked working slug', () => {
    expect(syncRefusal(serving({ slug: 'pod-0-unrecorded', podId: 'cym_for_eng:pod-0-unrecorded' }))).toBeNull()
  })

  it('allows a choice pod even on a serving slug — the resolver filters pod_type', () => {
    expect(syncRefusal(serving({ podType: 'choice' }))).toBeNull()
  })

  it('lets --serve-now through, deliberately', () => {
    expect(syncRefusal(serving({ serveNow: true }))).toBeNull()
  })
})
