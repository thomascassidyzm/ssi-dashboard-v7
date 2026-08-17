/**
 * Unit tests: THE VOICE RECORD'S TWO T-21 HOLES (2026-08-17).
 *
 * The estate rule is "read gender off the target voice" (tools/pod-voice-coverage.cjs,
 * Tom 2026-08-11). T-21 found two places where the record itself could not
 * support that rule, and this file pins both shut.
 *
 *   (1) `sal` is NOT RELIABLY GENDERED. xAI's API states 'm' and `voices.gender`
 *       records that provider word, but the cast metadata calls sal both f and m
 *       and the acoustic measurement (140.4 Hz median, IQR 111-186 Hz) straddles
 *       the boundary. So sal must never be returned for a gendered pod seat —
 *       and, critically, a provider-stated 'm' in `voices.gender` must NOT be
 *       able to re-open that seat, because that stated gender is precisely the
 *       evidence being ruled insufficient.
 *
 *   (2) Bas and Lieke — the Dutch pod pair, cast at `pod_voice_pools` nld.m[0]
 *       and nld.f[0] — were absent from the catalogue entirely, so their genders
 *       had to be established acoustically rather than read.
 *
 * Plus the standing invariant that made a schema change risky in the first
 * place: every catalogue entry must still carry the fields its readers expect.
 *
 * Run: npx vitest run tools/pod-voice-record-gender
 */

import { describe, it, expect, beforeEach } from 'vitest'

const coverage = require('./pod-voice-coverage.cjs')
const { resolveTargetPool, setVerifiedGenders, UNRELIABLE_GENDER, MULTI } = coverage
const catalogue = require('./pod-voices-xai.json')

const SAL = 'sal'
const BAS = '18245f0d' // pod_voice_pools nld.m[0]
const LIEKE = 'cdb1cec8' // pod_voice_pools nld.f[0]

// Every language that resolves through the xAI multilingual pool, i.e. every
// pool sal could possibly leak into. Tier 2 uses MULTI alone; tier 1 appends it
// as overflow — so a per-language sweep is the honest check, not a spot check.
const XAI_TARGETS = Object.entries(coverage.TARGET)
  .filter(([, e]) => !e.human && !e.azure)
  .map(([k]) => k)

const allVoices = (pool) => [...pool.f, ...pool.m]

beforeEach(() => setVerifiedGenders(null))

describe('sal is not reliably gendered, and never fills a gendered seat', () => {
  it('is declared unreliable in the record, with no gender asserted', () => {
    const sal = catalogue.multilingual.find((v) => v.voice_id === SAL)
    expect(sal).toBeDefined()
    expect(sal.gender_reliable).toBe(false)
    expect(sal.gender).toBeNull()
  })

  it('the guard is derived from the record, not restated by hand', () => {
    expect(UNRELIABLE_GENDER.has(SAL)).toBe(true)
    // Nothing else in the catalogue claims unreliability, so nothing else is
    // silently being refused a seat.
    expect([...UNRELIABLE_GENDER]).toEqual([SAL])
  })

  it('is still a member of the multilingual pool — it is refused, not deleted', () => {
    expect(MULTI.some((v) => v.voice_id === SAL)).toBe(true)
  })

  it('appears in NO gendered slot of ANY xAI-resolved language', () => {
    expect(XAI_TARGETS.length).toBeGreaterThan(0)
    for (const lang of XAI_TARGETS) {
      const pool = resolveTargetPool(lang)
      expect(allVoices(pool).map((v) => v.voice_id), `sal leaked into ${lang}`).not.toContain(SAL)
    }
  })

  it('stays refused even when voices.gender states a gender for it', () => {
    // The exact regression this guard exists for: `voices` really does hold
    // gender 'm' for sal, from xAI's own API. The seat must stay shut anyway.
    setVerifiedGenders({ [SAL]: 'm' })
    for (const lang of XAI_TARGETS) {
      const pool = resolveTargetPool(lang)
      expect(allVoices(pool).map((v) => v.voice_id), `sal leaked into ${lang}`).not.toContain(SAL)
    }
    setVerifiedGenders({ [SAL]: 'f' })
    for (const lang of XAI_TARGETS) {
      const pool = resolveTargetPool(lang)
      expect(allVoices(pool).map((v) => v.voice_id), `sal leaked into ${lang}`).not.toContain(SAL)
    }
  })

  it('does not starve a pool that leans on multilingual overflow', () => {
    // Refusing sal must not be the reason a language loses a gender slot —
    // otherwise the guard trades one defect for another.
    for (const lang of XAI_TARGETS) {
      const pool = resolveTargetPool(lang)
      expect(pool.f.length, `${lang} has no female voice`).toBeGreaterThan(0)
      expect(pool.m.length, `${lang} has no male voice`).toBeGreaterThan(0)
    }
  })
})

describe('Bas and Lieke are on the record', () => {
  const nl = catalogue.nl
  const bas = () => nl.find((v) => v.voice_id === BAS)
  const lieke = () => nl.find((v) => v.voice_id === LIEKE)

  it('are present in the nl block under their live pool voice_ids', () => {
    expect(bas(), 'Bas missing from the nl catalogue').toBeDefined()
    expect(lieke(), 'Lieke missing from the nl catalogue').toBeDefined()
    expect(bas().name).toBe('Bas')
    expect(lieke().name).toBe('Lieke')
  })

  it('carry the genders the provider states and voices.gender records', () => {
    expect(bas().gender).toBe('m')
    expect(lieke().gender).toBe('f')
  })

  it("record Bas's narrow male margin as a note, without weakening the label", () => {
    // Carried forward from the T-21 casting listen: Bas measures male, but by
    // the narrowest margin of anyone in the set. Recorded, not changed.
    expect(bas().note).toMatch(/narrowest margin/i)
    expect(bas().gender_reliable).toBeUndefined()
    expect(UNRELIABLE_GENDER.has(BAS)).toBe(false)
  })

  it('resolve into the Dutch pod pool in their cast slots', () => {
    const pool = resolveTargetPool('nld')
    expect(pool.m.map((v) => v.voice_id)).toContain(BAS)
    expect(pool.f.map((v) => v.voice_id)).toContain(LIEKE)
  })
})

describe('the record parses and every entry has the fields its readers expect', () => {
  const entries = Object.entries(catalogue).flatMap(([lang, vs]) => vs.map((v) => [lang, v]))

  it('is a non-empty map of language keys to voice lists', () => {
    expect(Object.keys(catalogue).length).toBeGreaterThan(1)
    for (const [lang, vs] of Object.entries(catalogue)) {
      expect(Array.isArray(vs), `${lang} is not a list`).toBe(true)
      expect(vs.length, `${lang} is empty`).toBeGreaterThan(0)
    }
  })

  it('every entry carries voice_id, name and a gender key', () => {
    // voice_id/name are what xai-voice-metadata-sync.cjs and the two voicelab
    // voice menus read; `gender` must be PRESENT on every entry even when it is
    // null, so a reader can tell "unknown" from "field forgotten".
    for (const [lang, v] of entries) {
      const where = `${lang}:${v.voice_id}`
      expect(typeof v.voice_id, where).toBe('string')
      expect(v.voice_id.length, where).toBeGreaterThan(0)
      expect(typeof v.name, where).toBe('string')
      expect(v.name.length, where).toBeGreaterThan(0)
      expect(Object.prototype.hasOwnProperty.call(v, 'gender'), `${where} has no gender key`).toBe(true)
    }
  })

  it('gender is f, m, or null — and null only where unreliability is declared', () => {
    for (const [lang, v] of entries) {
      const where = `${lang}:${v.voice_id}`
      expect(['f', 'm', null], where).toContain(v.gender)
      if (v.gender === null) expect(v.gender_reliable, `${where} is null-gendered but not declared unreliable`).toBe(false)
    }
  })

  it('gender_reliable, where present, is exactly false — never a truthy decoration', () => {
    for (const [lang, v] of entries) {
      if (!Object.prototype.hasOwnProperty.call(v, 'gender_reliable')) continue
      expect(v.gender_reliable, `${lang}:${v.voice_id}`).toBe(false)
    }
  })

  it('has no duplicate voice_id inside any one language block', () => {
    for (const [lang, vs] of Object.entries(catalogue)) {
      const ids = vs.map((v) => v.voice_id)
      expect(new Set(ids).size, `${lang} has a duplicate voice_id`).toBe(ids.length)
    }
  })
})
