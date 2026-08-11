/**
 * Unit tests: MANUAL VOICE CHOICE in pod casting (Tom, 2026-08-11).
 *
 *   "should the casting process, in the PODLAB allow voice choice? I think it
 *    should […] it's worth choosing the voices manually if there's only 2 of
 *    them"
 *
 * The thing this file has to hold is that the override is a SURGICAL swap of
 * the voice and of nothing else. The Spanish pod-0 rejection that started this
 * ("Spanish needs Iberian Spanish, not Mexican pronounciation") is fixed by
 * changing WHICH voice a slot lands on — never by changing how speakers collapse
 * to slots, which gender they resolve to, or how the known track locks to the
 * target rank. So:
 *
 *   (a) with no override, the resolved cast is byte-identical to today's pick;
 *   (b) with an override, both genders land on the chosen voices and every other
 *       field is unchanged.
 *
 * Run: npx vitest run tools/pod-sync-cast-overrides
 */

import { describe, it, expect } from 'vitest'

// resolveCast is the pure half of assignVoices: same rules, pools handed in
// rather than fetched. Requiring pod-sync opens no connection — its Supabase
// client is lazy — and resolveCast never asks for one.
const { resolveCast, normaliseOverrides } = require('./pod-sync.cjs')

// A two-region pool, shaped like the live app_config.pod_voice_pools: `spa` is
// the Iberian pool, `spa_mx` the Mexican one. Both are reachable — poolKeyFor
// takes the exact code first — and the manual picker has to be able to reach a
// voice that is in NEITHER (the discovered xAI inventory).
const POOLS = {
  spa: {
    f: [{ provider: 'xai', voice_id: 'xai_elena', name: 'Elena' }, { provider: 'xai', voice_id: 'xai_rosa', name: 'Rosa' }],
    m: [{ provider: 'xai', voice_id: 'xai_pablo', name: 'Pablo' }, { provider: 'xai', voice_id: 'xai_luis', name: 'Luis' }],
  },
  spa_mx: {
    f: [{ provider: 'xai', voice_id: 'xai_lupita', name: 'Lupita' }],
    m: [{ provider: 'xai', voice_id: 'xai_jorge', name: 'Jorge' }],
  },
  eng: {
    f: [{ provider: 'xai', voice_id: 'xai_eve', name: 'Eve' }],
    m: [{ provider: 'xai', voice_id: 'xai_sal', name: 'Sal' }],
  },
}

// Speaker labels as the markdown / the DB carries them: variants of one
// character (parens, timestamps, gender markers) must still collapse to one key.
const SPEAKERS = ['Ana (F)', 'Ana', 'Pablo (M)', 'Camarera', 'Narrator', 'Vecino (08:00)']

describe('resolveCast — no override (today\'s behaviour, unchanged)', () => {
  it('casts a two-hander off index 0 of the resolved pool', async () => {
    const cast = resolveCast(SPEAKERS, 'spa', 'eng', POOLS)

    // One canonical key per character; the (F)/(08:00) variants collapsed.
    expect(Object.keys(cast).sort()).toEqual(
      ['Ana', 'Camarera', 'Narrator', 'Pablo', 'Vecino', '_default'].sort(),
    )
    // Aran's two-hander: exactly one male and one female target voice.
    const targetVoices = new Set(Object.values(cast).map((c) => c.target.voice_id))
    expect(targetVoices).toEqual(new Set(['xai_elena', 'xai_pablo']))
    expect(cast.Ana.gender).toBe('f')
    expect(cast.Ana.target).toEqual({ provider: 'xai', voice_id: 'xai_elena', name: 'Elena' })
    expect(cast.Ana.known).toEqual({ provider: 'xai', voice_id: 'xai_eve', name: 'Eve' })
    // No locale key invented where the pool carries none.
    expect('locale' in cast.Ana.target).toBe(false)
    // Ungendered speakers default male, and _default matches the male slot.
    expect(cast.Narrator.gender).toBe('n')
    expect(cast.Narrator.target.voice_id).toBe('xai_pablo')
    expect(cast._default.target.voice_id).toBe('xai_pablo')
  })

  it('is byte-identical whether overrides is omitted, null, or empty', async () => {
    const base = resolveCast(SPEAKERS, 'spa', 'eng', POOLS)
    for (const ov of [null, undefined, {}, { target: {} }, { target: { f: null }, known: {} }]) {
      expect(resolveCast(SPEAKERS, 'spa', 'eng', POOLS, ov)).toEqual(base)
    }
  })

  it('resolves the exact regional pool before the base language', async () => {
    const mx = resolveCast(SPEAKERS, 'spa_mx', 'eng', POOLS)
    expect(mx.Ana.target.voice_id).toBe('xai_lupita')
    expect(mx.Pablo.target.voice_id).toBe('xai_jorge')
  })
})

describe('resolveCast — with a manual override', () => {
  const IBERIAN = {
    target: {
      f: { provider: 'xai', voice_id: 'xai_carmen', name: 'Carmen', locale: 'es-ES' },
      m: { provider: 'xai', voice_id: 'xai_diego', name: 'Diego', locale: 'es-ES' },
    },
  }

  it('lands both genders on the chosen voices, off-pool included', async () => {
    const cast = resolveCast(SPEAKERS, 'spa_mx', 'eng', POOLS, IBERIAN)
    expect(cast.Ana.target).toEqual({ provider: 'xai', voice_id: 'xai_carmen', name: 'Carmen', locale: 'es-ES' })
    expect(cast.Camarera.target.voice_id).toBe('xai_carmen')
    expect(cast.Pablo.target).toEqual({ provider: 'xai', voice_id: 'xai_diego', name: 'Diego', locale: 'es-ES' })
    // Ungendered → male slot, and the _default the next re-sync would use.
    expect(cast.Narrator.target.voice_id).toBe('xai_diego')
    expect(cast._default.target.voice_id).toBe('xai_diego')
  })

  it('changes the target track and NOTHING else', async () => {
    const before = resolveCast(SPEAKERS, 'spa_mx', 'eng', POOLS)
    const after = resolveCast(SPEAKERS, 'spa_mx', 'eng', POOLS, IBERIAN)

    expect(Object.keys(after)).toEqual(Object.keys(before))
    for (const key of Object.keys(before)) {
      expect(after[key].gender).toBe(before[key].gender)
      expect(after[key].variants).toEqual(before[key].variants)
      // Known track untouched by a target-only override — this is the
      // known-rank lock, and it must survive a manual target pick.
      expect(after[key].known).toEqual(before[key].known)
    }
  })

  it('overrides the known track independently when asked', async () => {
    const cast = resolveCast(SPEAKERS, 'spa', 'eng', POOLS, {
      known: { f: { provider: 'azure', voice_id: 'en-GB-SoniaNeural', name: 'Sonia', locale: 'en-GB' } },
    })
    expect(cast.Ana.known.voice_id).toBe('en-GB-SoniaNeural')
    // Male known slot un-overridden → still the pool pick.
    expect(cast.Pablo.known.voice_id).toBe('xai_sal')
    // Target untouched throughout.
    expect(cast.Ana.target.voice_id).toBe('xai_elena')
  })

  it('gives every speaker its own voice object, never one shared reference', async () => {
    const cast = resolveCast(SPEAKERS, 'spa', 'eng', POOLS, IBERIAN)
    expect(cast.Ana.target).not.toBe(cast.Camarera.target)
    cast.Ana.target.name = 'edited'
    expect(cast.Camarera.target.name).toBe('Carmen')
  })

  it('ignores a half-filled pick rather than blanking a track', async () => {
    const cast = resolveCast(SPEAKERS, 'spa', 'eng', POOLS, {
      target: { f: { provider: 'xai', name: 'no voice_id here' }, m: null },
    })
    expect(cast.Ana.target.voice_id).toBe('xai_elena')
    expect(cast.Pablo.target.voice_id).toBe('xai_pablo')
  })

  it('can cast a language with no pool at all, which otherwise throws', async () => {
    // A course whose language has no pod_voice_pools entry. Without an override
    // this throws; with one it is castable by hand — that is the point of the
    // picker for a language the curated pools have not reached yet.
    expect(() => resolveCast(SPEAKERS, 'zzz_none', 'eng', POOLS)).toThrow(/No target voice available/)
    const cast = resolveCast(SPEAKERS, 'zzz_none', 'eng', POOLS, IBERIAN)
    expect(cast.Ana.target.voice_id).toBe('xai_carmen')
    expect(cast.Pablo.target.voice_id).toBe('xai_diego')
    // The known track still comes from its own live pool.
    expect(cast.Ana.known.voice_id).toBe('xai_eve')
  })
})

describe('normaliseOverrides', () => {
  it('defaults provider to xai and name to the voice id', () => {
    const ov = normaliseOverrides({ target: { f: { voice_id: 'v1' } } })
    expect(ov.target.f).toEqual({ provider: 'xai', voice_id: 'v1', name: 'v1' })
  })
  it('drops anything without a voice_id, and unknown tracks', () => {
    const ov = normaliseOverrides({ target: { f: {}, m: 'nope' }, bogus: { f: { voice_id: 'x' } } })
    expect(ov).toEqual({ target: {}, known: {} })
  })
  it('survives junk input', () => {
    for (const junk of [null, undefined, 'x', 42, []]) {
      expect(normaliseOverrides(junk)).toEqual({ target: {}, known: {} })
    }
  })
})
