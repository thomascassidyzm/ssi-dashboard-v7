/**
 * Unit tests: VOICE POOL ENTRIES MAY CARRY A LOCALE (Tom, 2026-08-16).
 *
 * The Spanish recast of 2026-08-14 put xAI Manuel on the male target seats at
 * an explicit es-ES — the Iberian-vs-Mexican steering tag Tom picked by ear off
 * the A/B page. app_config.pod_voice_pools could not express a locale, so the
 * approved cast lived only in listening_pods.speakers and any re-sync of
 * spa_for_eng from its markdown would have stomped Manuel back to Azure Alvaro,
 * self-invalidating Tom's own approval. Named twice and never fixed:
 * docs/pods/spa-t17-cast-approval-2026-08-14.md.
 *
 * What this file has to hold:
 *   (a) a pool entry with NO locale casts byte-identically to before the change
 *       — that is the whole safety argument for the ~145 locale-less entries;
 *   (b) a pool entry WITH a locale puts it on the cast voice;
 *   (c) a manual override still wins outright over a pool locale;
 *   (d) _default carries the locale too, so a speaker added between re-syncs
 *       does not silently land at a different locale from everyone else;
 *   (e) a malformed locale THROWS — a silently dropped locale is the bug.
 *
 * Run: npx vitest run tools/pod-sync-pool-locale
 */

import { describe, it, expect } from 'vitest'

const { resolveCast } = require('./pod-sync.cjs')

// Shaped like the live app_config.pod_voice_pools after the 2026-08-16 edit:
// the Spanish male slot is Manuel at an explicit es-ES, the female slot Elvira
// with a locale, and `eng` stays locale-less exactly as the estate has it.
const POOLS = {
  spa: {
    f: [{ provider: 'azure', voice_id: 'es-ES-ElviraNeural', name: 'Elvira', locale: 'es-ES' }],
    m: [{ provider: 'xai', voice_id: 'yis75yfp', name: 'Manuel', locale: 'es-ES' }],
  },
  // No locale anywhere: the shape every other pool on the estate still has.
  eng: {
    f: [{ provider: 'xai', voice_id: 'bedd6226', name: 'Olivia' }],
    m: [{ provider: 'xai', voice_id: 'leo', name: 'Leo' }],
  },
  bad: {
    f: [{ provider: 'xai', voice_id: 'x_f', name: 'F', locale: 'not a tag!' }],
    m: [{ provider: 'xai', voice_id: 'x_m', name: 'M', locale: 'not a tag!' }],
  },
}

const SPEAKERS = ['Elena (F)', 'Dani (M)', 'Narrator']

describe('resolveCast — pool entries with no locale (unchanged behaviour)', () => {
  it('invents no locale key on either track', () => {
    const cast = resolveCast(SPEAKERS, 'eng', 'eng', POOLS)
    for (const key of Object.keys(cast)) {
      for (const track of ['target', 'known']) {
        expect('locale' in cast[key][track]).toBe(false)
      }
    }
  })

  it('produces exactly the three-field voice object it always has', () => {
    const cast = resolveCast(SPEAKERS, 'eng', 'eng', POOLS)
    expect(cast['Elena'].target).toEqual({ provider: 'xai', voice_id: 'bedd6226', name: 'Olivia' })
    expect(cast._default.target).toEqual({ provider: 'xai', voice_id: 'leo', name: 'Leo' })
  })
})

describe('resolveCast — pool entries carrying a locale', () => {
  it('puts the pool locale on the target voice', () => {
    const cast = resolveCast(SPEAKERS, 'spa', 'eng', POOLS)
    expect(cast['Elena'].target).toEqual({
      provider: 'azure', voice_id: 'es-ES-ElviraNeural', name: 'Elvira', locale: 'es-ES',
    })
    expect(cast['Dani'].target).toEqual({
      provider: 'xai', voice_id: 'yis75yfp', name: 'Manuel', locale: 'es-ES',
    })
  })

  it('leaves the known track alone when its own pool has no locale', () => {
    const cast = resolveCast(SPEAKERS, 'spa', 'eng', POOLS)
    expect(cast['Dani'].known).toEqual({ provider: 'xai', voice_id: 'leo', name: 'Leo' })
    expect('locale' in cast['Dani'].known).toBe(false)
  })

  it('carries the locale onto _default too', () => {
    const cast = resolveCast(SPEAKERS, 'spa', 'eng', POOLS)
    expect(cast._default.target).toEqual({
      provider: 'xai', voice_id: 'yis75yfp', name: 'Manuel', locale: 'es-ES',
    })
    expect('locale' in cast._default.known).toBe(false)
  })

  it('gives every speaker its own voice object, locale included', () => {
    const cast = resolveCast(SPEAKERS, 'spa', 'eng', POOLS)
    expect(cast['Dani'].target).not.toBe(cast['Narrator'].target)
    cast['Dani'].target.locale = 'es-MX'
    expect(cast['Narrator'].target.locale).toBe('es-ES')
  })
})

describe('resolveCast — an override still wins over a pool locale', () => {
  it('replaces the pool voice whole, locale and all', () => {
    const cast = resolveCast(SPEAKERS, 'spa', 'eng', POOLS, {
      target: { m: { provider: 'xai', voice_id: 'xai_diego', name: 'Diego', locale: 'es-MX' } },
    })
    expect(cast['Dani'].target).toEqual({
      provider: 'xai', voice_id: 'xai_diego', name: 'Diego', locale: 'es-MX',
    })
    expect(cast._default.target.locale).toBe('es-MX')
    // The un-overridden female slot keeps its pool locale.
    expect(cast['Elena'].target.locale).toBe('es-ES')
  })

  it('an override with no locale carries none, even over a pool that has one', () => {
    const cast = resolveCast(SPEAKERS, 'spa', 'eng', POOLS, {
      target: { m: { provider: 'xai', voice_id: 'xai_diego', name: 'Diego' } },
    })
    expect('locale' in cast['Dani'].target).toBe(false)
  })
})

describe('resolveCast — a malformed pool locale is refused, never dropped', () => {
  it('throws, naming the pool key and the voice', () => {
    expect(() => resolveCast(SPEAKERS, 'bad', 'eng', POOLS))
      .toThrow(/not a BCP-47 tag/)
    expect(() => resolveCast(SPEAKERS, 'bad', 'eng', POOLS))
      .toThrow(/x_m|x_f/)
  })

  it('accepts the BCP-47 shapes the estate actually uses', () => {
    for (const locale of ['es', 'es-ES', 'en-GB', 'zh-Hans-CN', 'cy']) {
      const pools = { t: { m: [{ provider: 'xai', voice_id: 'v', name: 'V', locale }], f: [] }, eng: POOLS.eng }
      const cast = resolveCast(['Narrator'], 't', 'eng', pools)
      expect(cast['Narrator'].target.locale).toBe(locale)
    }
  })

  it('treats an empty-string locale as absent rather than malformed', () => {
    const pools = { t: { m: [{ provider: 'xai', voice_id: 'v', name: 'V', locale: '' }], f: [] }, eng: POOLS.eng }
    const cast = resolveCast(['Narrator'], 't', 'eng', pools)
    expect('locale' in cast['Narrator'].target).toBe(false)
  })
})
