/**
 * Unit tests: A REGIONAL VARIANT HOLDS ITS OWN CAST (T-21, 2026-08-17).
 *
 * `courses.target_lang` carries the BASE tag for a regional-variant course —
 * deu_at_for_eng is target_lang 'deu', ara_eg_for_eng is 'ara', spa_mx_for_eng
 * is 'spa'. Everything that cast pod voices resolved the pool from that column,
 * so a variant and its base shared ONE casting slot. Tom then ruled opposite
 * pairs either side of it (German on Moritz + Lena, Austrian German on Felix +
 * Sonja), and locking either would silently have recast the other. Six
 * languages sat unlockable on exactly this.
 *
 * What this file has to hold:
 *   (a) an explicit courses.voice_pool_key resolves to the VARIANT cast;
 *   (b) the base-language sibling still resolves to the BASE cast — the two are
 *       genuinely independent, which is the whole acceptance test;
 *   (c) a course with NO variant key resolves byte-identically to before this
 *       column existed — the safety argument for the other ~132 courses;
 *   (d) a malformed key THROWS rather than being silently dropped;
 *   (e) a key naming a pool that does not exist THROWS rather than falling back
 *       to the base language, because a silent fallback IS the miscast;
 *   (f) the column OUTRANKS the course code — the estate's standing
 *       "read the column, never the course code" lesson from spa_mx_for_eng.
 *
 * Run: npx vitest run tools/pod-sync-course-pool-key
 */

import { describe, it, expect } from 'vitest'

const { poolKeysForCourse, resolveCast } = require('./pod-sync.cjs')

// Shaped like app_config.pod_voice_pools after the T-21 split.
const POOLS = {
  deu: {
    f: [{ provider: 'xai', voice_id: '3a7889066fa2', name: 'Lena', locale: 'de' }],
    m: [{ provider: 'xai', voice_id: '41321eb41295', name: 'Moritz', locale: 'de' }],
  },
  deu_at: {
    f: [{ provider: 'xai', voice_id: '44c91d64', name: 'Sonja', locale: 'de' }],
    m: [{ provider: 'xai', voice_id: 'e1fc5a89', name: 'Felix', locale: 'de' }],
  },
  ara: {
    f: [{ provider: 'xai', voice_id: '025a38c5', name: 'Yasmin' }],
    m: [{ provider: 'xai', voice_id: '5f0c2251', name: 'Youssef' }],
  },
  eng: {
    f: [{ provider: 'xai', voice_id: 'bedd6226', name: 'Olivia' }],
    m: [{ provider: 'xai', voice_id: 'gfzdpspr5fdp', name: 'Tom' }],
  },
  // No 'deu_ch' key on purpose: a variant course whose pool was never created.
}

const SPEAKERS = ['Anna (F)', 'Bruno (M)']

const course = (over) => ({
  course_code: 'x_for_eng', target_lang: 'x', known_lang: 'eng', voice_pool_key: null, ...over,
})

// The cast a course would actually get, resolved end to end.
function castFor(row) {
  const keys = poolKeysForCourse(POOLS, row)
  return resolveCast(SPEAKERS, keys.target, keys.known, POOLS)
}

describe('poolKeysForCourse — a variant course selects its own pool', () => {
  it('(a) an explicit voice_pool_key resolves to the variant cast', () => {
    const cast = castFor(course({
      course_code: 'deu_at_for_eng', target_lang: 'deu', voice_pool_key: 'deu_at',
    }))
    expect(cast['Bruno'].target.name).toBe('Felix')
    expect(cast['Anna'].target.name).toBe('Sonja')
  })

  it('(b) the base-language sibling keeps the base cast — the two are independent', () => {
    const cast = castFor(course({ course_code: 'deu_for_eng', target_lang: 'deu' }))
    expect(cast['Bruno'].target.name).toBe('Moritz')
    expect(cast['Anna'].target.name).toBe('Lena')
  })

  it('(b) German and Austrian German resolve to different pool keys at once', () => {
    const base = poolKeysForCourse(POOLS, course({ course_code: 'deu_for_eng', target_lang: 'deu' }))
    const variant = poolKeysForCourse(POOLS, course({
      course_code: 'deu_at_for_eng', target_lang: 'deu', voice_pool_key: 'deu_at',
    }))
    expect(base.target).toBe('deu')
    expect(variant.target).toBe('deu_at')
    // Same known track: only the target side forks.
    expect(base.known).toBe('eng')
    expect(variant.known).toBe('eng')
  })

  it('(c) a course with no variant key falls back to target_lang, unchanged', () => {
    const keys = poolKeysForCourse(POOLS, course({ course_code: 'ara_for_eng', target_lang: 'ara' }))
    expect(keys).toEqual({ target: 'ara', known: 'eng' })
    const cast = castFor(course({ course_code: 'ara_for_eng', target_lang: 'ara' }))
    expect(cast['Bruno'].target.name).toBe('Youssef')
  })

  it('(c) an absent variant key still falls back to base when the pool has no variant', () => {
    // deu_ch_for_eng: the course code carries a region, but no deu_ch pool
    // exists, so it resolves to the base exactly as it always did.
    const keys = poolKeysForCourse(POOLS, course({ course_code: 'deu_ch_for_eng', target_lang: 'deu' }))
    expect(keys.target).toBe('deu')
  })

  it('(d) a malformed key throws rather than being silently dropped', () => {
    for (const bad of ['de-AT', 'DEU AT', 'deutsch_austria', 'deu_at_extra', '../deu']) {
      expect(() => poolKeysForCourse(POOLS, course({ voice_pool_key: bad })))
        .toThrow(/is not a pool key/)
    }
  })

  it('(e) a key naming a pool that does not exist throws, never falls back to base', () => {
    expect(() => poolKeysForCourse(POOLS, course({
      course_code: 'deu_ch_for_eng', target_lang: 'deu', voice_pool_key: 'deu_ch',
    }))).toThrow(/has no pod_voice_pools entry/)
    // And it says WHY falling back would be wrong, so the message is actionable.
    expect(() => poolKeysForCourse(POOLS, course({
      course_code: 'deu_ch_for_eng', target_lang: 'deu', voice_pool_key: 'deu_ch',
    }))).toThrow(/silently miscast/)
  })

  it('(f) the column outranks the course code', () => {
    // Code says deu_at, the human ruling says base German. The column wins.
    const keys = poolKeysForCourse(POOLS, course({
      course_code: 'deu_at_for_eng', target_lang: 'deu', voice_pool_key: 'deu',
    }))
    expect(keys.target).toBe('deu')
  })

  it('(f) the course code still resolves a variant when the column is unset', () => {
    // The behaviour tools/pod-sync.cjs and tools/pod-recast.cjs already had, kept
    // as tier 2 so nothing they cast correctly today can regress.
    const keys = poolKeysForCourse(POOLS, course({ course_code: 'deu_at_for_eng', target_lang: 'deu' }))
    expect(keys.target).toBe('deu_at')
  })

  it('rejects a missing course row rather than casting off undefined', () => {
    expect(() => poolKeysForCourse(POOLS, null)).toThrow(/course row is required/)
  })

  it('names the offending course in the error, so a failure is actionable', () => {
    expect(() => poolKeysForCourse(POOLS, course({
      course_code: 'ara_eg_for_eng', voice_pool_key: 'nope_nope',
    }))).toThrow(/ara_eg_for_eng/)
  })

  it('normalises case on an explicit key', () => {
    const keys = poolKeysForCourse(POOLS, course({
      course_code: 'deu_at_for_eng', target_lang: 'deu', voice_pool_key: ' DEU_AT ',
    }))
    expect(keys.target).toBe('deu_at')
  })
})
