/**
 * Unit tests for the clone-pod DESTINATION gate (2026-09-02).
 *
 * The failure they exist to prevent. `clone-pod.cjs` exists SO THAT a destructive
 * align can run off the live pod: clone pod-0 to a parked slug, rewrite that, swap
 * only when it is complete. Nothing in it ever asked whether the destination slug is
 * one the player SERVES. The resolver — packages/player-vue/src/composables/servedPod.ts
 * and its literal twin in api/courses/[code]/bundle.ts — serves a course's pod by SLUG:
 * `pod_type = 'core'` and `slug in ('pod-1','pod-0')`, first match wins. It counts no
 * rows and reads no text, and it does not read `visibility` either. So the moment a core
 * pod-1 header row exists for a course, learners are served it — and `clone-pod --to=pod-1`
 * would create exactly that row, then let the align tool empty it underneath them, with
 * no promotion tool involved at all.
 *
 * RECORDED RED (against the pre-fix gate, which only ever refused a destination that
 * already held sentence rows — it returned null for every serving-slug case):
 *   FAIL  REFUSES a clone onto pod-1, which the player serves
 *     AssertionError: expected null to be truthy
 *   FAIL  REFUSES a clone onto pod-0, the fallback slug every course serves
 *     AssertionError: expected null to be truthy
 *   FAIL  REFUSES even when the destination pod row does not exist yet — creating it IS the harm
 *     AssertionError: expected null to be truthy
 *   FAIL  REFUSES a held destination too — the serving resolver never reads visibility
 *     AssertionError: expected null to be truthy
 *   FAIL  says "0 learners currently" rather than staying silent, and still refuses
 *     AssertionError: expected null to be truthy
 *   FAIL  refuses when the learner count could not be read, and SAYS the count was unavailable
 *     AssertionError: expected null to be truthy
 *   FAIL  names the learners at risk, not a generic guard
 *     TypeError: .toMatch() expects to receive a string, but got object
 *   FAIL  names the --serve-now escape in the refusal
 *     TypeError: .toMatch() expects to receive a string, but got object
 *
 *   Test Files  1 failed (1)
 *        Tests  8 failed | 5 passed (13)
 *
 * The 5 that passed are the destination-holds-rows refusal this tool already had, and
 * the two not-a-door cases — which is what proves the extraction was faithful.
 */

import { describe, it, expect } from 'vitest'

const { serviceRefusal } = require('./clone-pod.cjs')

const dstPodId = 'spa_for_eng:pod-1'

/** Cloning onto pod-1 of a live course with 12 learners on it. */
const serving = (over = {}) => ({
  dstPodId,
  toSlug: 'pod-1',
  podType: 'core',
  destExists: true,
  destVisibility: 'live',
  destRows: 0,
  learnersOnCourse: 12,
  learnersOnDestPod: 9,
  serveNow: false,
  ...over,
})

describe('serviceRefusal — a destination slug the player serves', () => {
  it('REFUSES a clone onto pod-1, which the player serves', () => {
    const refusal = serviceRefusal(serving())
    expect(refusal).toBeTruthy()
    expect(refusal).toMatch(/pod-1/)
    expect(refusal).toMatch(/serv/i)
  })

  it('REFUSES a clone onto pod-0, the fallback slug every course serves', () => {
    const refusal = serviceRefusal(serving({ toSlug: 'pod-0', dstPodId: 'spa_for_eng:pod-0' }))
    expect(refusal).toBeTruthy()
  })

  it('REFUSES even when the destination pod row does not exist yet — creating it IS the harm', () => {
    // The resolver asks only whether a core row on a serving slug EXISTS. Cloning
    // creates it, so "not there yet" is not safety, it is the moment of the harm.
    const refusal = serviceRefusal(serving({ destExists: false, destVisibility: null, learnersOnDestPod: 0 }))
    expect(refusal).toBeTruthy()
  })

  it('REFUSES a held destination too — the serving resolver never reads visibility', () => {
    const refusal = serviceRefusal(serving({ destVisibility: 'held' }))
    expect(refusal).toBeTruthy()
  })

  it('names the learners at risk, not a generic guard', () => {
    const refusal = serviceRefusal(serving())
    expect(refusal).toMatch(/12 learner/)
    expect(refusal).toMatch(/9/)
  })

  it('says "0 learners currently" rather than staying silent, and still refuses', () => {
    const refusal = serviceRefusal(serving({ learnersOnCourse: 0, learnersOnDestPod: 0 }))
    expect(refusal).toBeTruthy()
    expect(refusal).toMatch(/0 learners currently/)
  })

  it('refuses when the learner count could not be read, and SAYS the count was unavailable', () => {
    const refusal = serviceRefusal(serving({ learnersOnCourse: null, learnersOnDestPod: null }))
    expect(refusal).toBeTruthy()
    expect(refusal).toMatch(/unavailable/i)
  })

  it('names the --serve-now escape in the refusal', () => {
    expect(serviceRefusal(serving())).toMatch(/--serve-now/)
  })

  it('lets --serve-now through, deliberately', () => {
    expect(serviceRefusal(serving({ serveNow: true }))).toBeNull()
  })
})

describe('serviceRefusal — what is NOT a door', () => {
  it('allows a parked working slug, which is the whole point of this tool', () => {
    expect(serviceRefusal(serving({ toSlug: 'pod-0-unrecorded', dstPodId: 'spa_for_eng:pod-0-unrecorded', destExists: false }))).toBeNull()
  })

  it('allows a non-core pod even on a serving slug — the resolver filters pod_type', () => {
    expect(serviceRefusal(serving({ podType: 'bonus' }))).toBeNull()
  })
})

describe('serviceRefusal — the refusal clone-pod already had', () => {
  it('still refuses a destination that holds sentence rows', () => {
    const refusal = serviceRefusal(serving({ toSlug: 'pod-0-unrecorded', dstPodId: 'spa_for_eng:pod-0-unrecorded', destRows: 128 }))
    expect(refusal).toMatch(/128 sentence row/)
  })

  it('and --serve-now does NOT waive that one — it is about destroying work, not about learners', () => {
    const refusal = serviceRefusal(serving({ toSlug: 'pod-0-unrecorded', dstPodId: 'spa_for_eng:pod-0-unrecorded', destRows: 128, serveNow: true }))
    expect(refusal).toMatch(/128 sentence row/)
  })
})
