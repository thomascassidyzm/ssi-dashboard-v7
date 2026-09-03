/**
 * Unit tests: THE POD POOL'S PRIMARY IS DERIVED FROM THE LANGUAGE CAST.
 *
 * Tom's ruling, 2026-09-03: "his Cartesia clone becomes the default English
 * male voice, estate-wide". The estate stated that default in two places —
 * app_config.pod_voice_pools (pods) and voice_language_roles (courses) — and a
 * hardcoded list standing in for a derivation is exactly the shape that lets
 * two copies of one decision drift apart. So the pool's rank-0 entry per
 * (language, gender) now comes from the cast.
 *
 * The invariant that makes this safe is the first test: WITH NO CAST ROWS,
 * NOTHING CHANGES. Everything else is what happens once a row exists.
 *
 * Run: npx vitest run tools/pod-sync-cast-primary
 */

import { describe, it, expect } from 'vitest'

const { overlayCastPrimaries } = require('./pod-sync.cjs')

const POOLS = {
  eng: {
    f: [{ name: 'Olivia', provider: 'xai', voice_id: 'bedd6226' }],
    m: [
      { name: 'Tom', provider: 'xai', voice_id: 'gfzdpspr5fdp' },
      { name: 'Ryan', provider: 'azure', voice_id: 'en-GB-RyanNeural' },
    ],
  },
  spa: { f: [{ name: 'Elena', provider: 'xai', voice_id: 'elena' }], m: [{ name: 'Pablo', provider: 'xai', voice_id: 'pablo' }] },
}

const CLONE = {
  voice_id: 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2',
  tts_engine: 'cartesia', display_name: 'Tom', is_active: true,
}
const CAST_ENG_M = { language: 'eng', gender: 'm', slot: 'phrase', rank: 0, voice_id: CLONE.voice_id }

describe('the pod pool primary is derived, not stored', () => {
  it('with no cast rows the pools come back byte-identical', () => {
    expect(overlayCastPrimaries(POOLS, [], [])).toEqual(POOLS)
  })

  it('the cast voice becomes m[0], spelled bare for the provider API', () => {
    const out = overlayCastPrimaries(POOLS, [CAST_ENG_M], [CLONE])
    expect(out.eng.m[0]).toEqual({
      name: 'Tom', provider: 'cartesia', voice_id: '8fef4d59-0a7e-4ad2-a261-6a3bb50734d2',
    })
  })

  it('depth is kept behind the primary, never lost', () => {
    const out = overlayCastPrimaries(POOLS, [CAST_ENG_M], [CLONE])
    expect(out.eng.m.slice(1)).toEqual(POOLS.eng.m)
  })

  it('casting the male voice leaves the FEMALE pool untouched', () => {
    const out = overlayCastPrimaries(POOLS, [CAST_ENG_M], [CLONE])
    expect(out.eng.f).toEqual(POOLS.eng.f)
  })

  it('an uncast language is untouched', () => {
    const out = overlayCastPrimaries(POOLS, [CAST_ENG_M], [CLONE])
    expect(out.spa).toEqual(POOLS.spa)
  })

  it('a voice already in the pool is promoted, not duplicated', () => {
    const azureRyan = { voice_id: 'azure_en-GB-RyanNeural', tts_engine: 'azure', display_name: 'Ryan', is_active: true }
    const out = overlayCastPrimaries(POOLS, [{ ...CAST_ENG_M, voice_id: azureRyan.voice_id }], [azureRyan])
    expect(out.eng.m.map((v) => v.voice_id)).toEqual(['en-GB-RyanNeural', 'gfzdpspr5fdp'])
  })

  it('an inactive cast voice is skipped and the pool head stands', () => {
    const out = overlayCastPrimaries(POOLS, [CAST_ENG_M], [{ ...CLONE, is_active: false }])
    expect(out.eng.m).toEqual(POOLS.eng.m)
  })

  it('a cast voice missing from the voices table is skipped', () => {
    const out = overlayCastPrimaries(POOLS, [CAST_ENG_M], [])
    expect(out.eng.m).toEqual(POOLS.eng.m)
  })

  it('a human voice is never folded into a TTS pool', () => {
    const human = { voice_id: 'human_aran_cym_n', tts_engine: 'human', display_name: 'Aran', is_active: true }
    const out = overlayCastPrimaries(POOLS, [{ ...CAST_ENG_M, voice_id: human.voice_id }], [human])
    expect(out.eng.m).toEqual(POOLS.eng.m)
  })

  it('does not mutate the pools it was given', () => {
    const before = JSON.parse(JSON.stringify(POOLS))
    overlayCastPrimaries(POOLS, [CAST_ENG_M], [CLONE])
    expect(POOLS).toEqual(before)
  })
})
