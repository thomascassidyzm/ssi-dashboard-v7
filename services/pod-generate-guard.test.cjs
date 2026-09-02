/**
 * Unit tests for the POST /api/admin/pods/generate request gate and the pod
 * generator's serving-slug refusal (2026-09-02, job "the last three doors").
 *
 * The failure they exist to prevent. `POST /api/admin/pods/generate` is a button in
 * the Popty pods page behind `requireAdmin`, and its slug parameter READ
 * `String(req.body?.slug || 'pod-0').trim()` — it DEFAULTED to a slug the player
 * serves for ~68 courses, while the same body may carry `force: true` and
 * `mode: 'full'`, which is the wipe-and-re-flex path (deleteAllSentences, then
 * re-generate). That is the shortest route in the estate from a human hand to an
 * emptied live pod, and the pods behind it are the ones ~32,000 former Welsh
 * learners are waiting on. The generator underneath it (`upsertPodRow`) reasoned that
 * `visibility='held'`-on-creation kept a new pod off learners; it does not — no learner
 * consumer reads `listening_pods.visibility` (api/courses/[code]/bundle.ts says so in
 * its own comment), so a core header row on a serving slug is served the moment it exists.
 *
 * RECORDED RED, against the pre-fix logic lifted verbatim out of the route
 * (`services/.pod-generate-guard.prefix.scaffold.cjs`, deleted after the run):
 *
 *   FAIL  REFUSES a request with no slug at all, instead of defaulting to pod-0
 *     AssertionError: expected undefined to be truthy
 *   FAIL  REFUSES an empty or whitespace slug for the same reason
 *     TypeError: .toMatch() expects to receive a string, but got undefined
 *   FAIL  reads serveNow from the body, mirroring the CLI --serve-now flag
 *     AssertionError: expected undefined to be true // Object.is equality
 *   FAIL  REFUSES a generation onto pod-0, the slug the route used to default to
 *     AssertionError: expected null to be truthy
 *   FAIL  REFUSES a generation onto pod-1 as well
 *     AssertionError: expected null to be truthy
 *   FAIL  REFUSES a held pod — the resolver never reads visibility, so held is not a guard
 *     AssertionError: expected null to be truthy
 *   FAIL  REFUSES when the pod row does not exist yet — creating the header row IS the serving
 *     AssertionError: expected null to be truthy
 *   FAIL  names the learners at risk, not a generic guard
 *     TypeError: .toMatch() expects to receive a string, but got object
 *   FAIL  says "0 learners currently" rather than staying silent, and still refuses
 *     AssertionError: expected null to be truthy
 *   FAIL  refuses when the learner count could not be read, and SAYS it was unavailable
 *     AssertionError: expected null to be truthy
 *   FAIL  names the serveNow escape in the refusal
 *     TypeError: .toMatch() expects to receive a string, but got object
 *
 *   Test Files  1 failed (1)
 *        Tests  11 failed | 7 passed (18)
 *
 * The 7 that passed are the checks the route already had — courseCode required, the
 * force literal, the mode allowlist, canonicalSlug — which is what proves the
 * extraction was faithful rather than a rewrite.
 */

import { describe, it, expect } from 'vitest'

const MOD = process.env.POD_GENERATE_GUARD_MODULE || './pod-generate-guard.cjs'
const { parsePodGenerateRequest, generationRefusal } = require(MOD)

describe('parsePodGenerateRequest — the slug must be asked for, never assumed', () => {
  it('REFUSES a request with no slug at all, instead of defaulting to pod-0', () => {
    const r = parsePodGenerateRequest({ courseCode: 'cym_for_eng' })
    expect(r.error).toBeTruthy()
    expect(r.error).toMatch(/slug/)
    expect(r.slug).toBeUndefined()
  })

  it('REFUSES an empty or whitespace slug for the same reason', () => {
    expect(parsePodGenerateRequest({ courseCode: 'cym_for_eng', slug: '' }).error).toMatch(/slug/)
    expect(parsePodGenerateRequest({ courseCode: 'cym_for_eng', slug: '   ' }).error).toMatch(/slug/)
  })

  it('carries an explicit slug through', () => {
    const r = parsePodGenerateRequest({ courseCode: 'cym_for_eng', slug: 'pod-0-unrecorded' })
    expect(r.error).toBeUndefined()
    expect(r.slug).toBe('pod-0-unrecorded')
  })

  it('reads serveNow from the body, mirroring the CLI --serve-now flag', () => {
    expect(parsePodGenerateRequest({ courseCode: 'c_for_e', slug: 'pod-0', serveNow: true }).serveNow).toBe(true)
    expect(parsePodGenerateRequest({ courseCode: 'c_for_e', slug: 'pod-0' }).serveNow).toBe(false)
  })

  // These four passed pre-fix; they are here to prove the extraction was faithful
  // rather than a rewrite.
  it('still requires courseCode', () => {
    expect(parsePodGenerateRequest({ slug: 'pod-0' }).error).toMatch(/courseCode/)
  })
  it('still carries force through only as a literal true', () => {
    expect(parsePodGenerateRequest({ courseCode: 'c_for_e', slug: 'x', force: true }).force).toBe(true)
    expect(parsePodGenerateRequest({ courseCode: 'c_for_e', slug: 'x', force: 'yes' }).force).toBe(false)
  })
  it('still whitelists mode', () => {
    expect(parsePodGenerateRequest({ courseCode: 'c_for_e', slug: 'x', mode: 'full' }).mode).toBe('full')
    expect(parsePodGenerateRequest({ courseCode: 'c_for_e', slug: 'x', mode: 'nonsense' }).mode).toBeUndefined()
  })
  it('still carries canonicalSlug through', () => {
    expect(parsePodGenerateRequest({ courseCode: 'c_for_e', slug: 'x', canonicalSlug: 'pod-1' }).canonicalSlug).toBe('pod-1')
  })
})

const serving = (over = {}) => ({
  podId: 'cym_for_eng:pod-0',
  slug: 'pod-0',
  podExists: true,
  podVisibility: 'held',
  rows: 240,
  learnersOnCourse: 12,
  learnersOnPod: 9,
  serveNow: false,
  ...over,
})

describe('generationRefusal — generating onto a slug the player serves', () => {
  it('REFUSES a generation onto pod-0, the slug the route used to default to', () => {
    const r = generationRefusal(serving())
    expect(r).toBeTruthy()
    expect(r).toMatch(/pod-0/)
    expect(r).toMatch(/serv/i)
  })

  it('REFUSES a generation onto pod-1 as well', () => {
    expect(generationRefusal(serving({ slug: 'pod-1', podId: 'cym_for_eng:pod-1' }))).toBeTruthy()
  })

  it('REFUSES a held pod — the resolver never reads visibility, so held is not a guard', () => {
    expect(generationRefusal(serving({ podVisibility: 'held' }))).toBeTruthy()
  })

  it('REFUSES when the pod row does not exist yet — creating the header row IS the serving', () => {
    expect(generationRefusal(serving({ podExists: false, podVisibility: null, rows: 0, learnersOnPod: 0 }))).toBeTruthy()
  })

  it('names the learners at risk, not a generic guard', () => {
    const r = generationRefusal(serving())
    expect(r).toMatch(/12 learner/)
    expect(r).toMatch(/9/)
  })

  it('says "0 learners currently" rather than staying silent, and still refuses', () => {
    const r = generationRefusal(serving({ learnersOnCourse: 0, learnersOnPod: 0 }))
    expect(r).toBeTruthy()
    expect(r).toMatch(/0 learners currently/)
  })

  it('refuses when the learner count could not be read, and SAYS it was unavailable', () => {
    const r = generationRefusal(serving({ learnersOnCourse: null, learnersOnPod: null }))
    expect(r).toBeTruthy()
    expect(r).toMatch(/unavailable/i)
  })

  it('names the serveNow escape in the refusal', () => {
    expect(generationRefusal(serving())).toMatch(/serveNow|--serve-now/)
  })

  it('lets serveNow through, deliberately', () => {
    expect(generationRefusal(serving({ serveNow: true }))).toBeNull()
  })

  it('allows a parked slug, which is where a draft generation belongs', () => {
    expect(generationRefusal(serving({ slug: 'pod-0-unrecorded', podId: 'cym_for_eng:pod-0-unrecorded' }))).toBeNull()
  })
})
