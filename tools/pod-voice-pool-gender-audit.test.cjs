/**
 * Unit tests: POOL GENDER LABELS vs THE PROVIDER'S CATALOGUE (Tom, 2026-08-11).
 *
 * The live defect this encodes: `tur.f[0]` — the voice pod-sync casts every
 * Turkish female character to — was `tr-TR-AhmetNeural`, which Azure calls
 * Male, while `tr-TR-EmelNeural` (Female) sat in the male list. A clean
 * transposition of two Azure voices.
 *
 * What has to hold:
 *   (a) a mismatch is detected from the CATALOGUE, never from the display name;
 *   (b) xai entries are checked against the gender xAI itself states for the id
 *       (`voices.gender`, filled by tools/xai-voice-metadata-sync.cjs from
 *       GET /v1/tts/voices/{id}), and are 'unverifiable' — never guessed —
 *       only when the provider has stated no gender at all;
 *   (c) the fix moves voices between lists and neither adds nor drops one;
 *   (d) anything worse than a one-per-list transposition REFUSES, so a real
 *       scramble reaches a human instead of being guessed at.
 *
 * Run: npx vitest run tools/pod-voice-pool-gender-audit
 */

import { describe, it, expect } from 'vitest'

const { audit, correctPool } = require('./pod-voice-pool-gender-audit.cjs')

// Shaped like the live app_config row: `tur` as it was found, `fra` clean.
const POOLS = {
  tur: {
    f: [{ provider: 'azure', voice_id: 'tr-TR-AhmetNeural', name: 'Ahmet' }],
    m: [
      { provider: 'xai', voice_id: 'f331ee80', name: 'Ahmet' },
      { provider: 'azure', voice_id: 'tr-TR-EmelNeural', name: 'Emel' },
    ],
  },
  fra: {
    f: [{ provider: 'azure', voice_id: 'fr-FR-CelesteNeural', name: 'Celeste' }],
    m: [{ provider: 'azure', voice_id: 'fr-FR-HenriNeural', name: 'Henri' }],
  },
}

const CATALOGUE = new Map([
  ['tr-TR-AhmetNeural', { Gender: 'Male', Locale: 'tr-TR' }],
  ['tr-TR-EmelNeural', { Gender: 'Female', Locale: 'tr-TR' }],
  ['fr-FR-CelesteNeural', { Gender: 'Female', Locale: 'fr-FR' }],
  ['fr-FR-HenriNeural', { Gender: 'Male', Locale: 'fr-FR' }],
])

// `voices` rows as tools/xai-voice-metadata-sync.cjs writes them: only ids xAI
// stated a gender for appear at all. 'gfzdpspr5fdp' (Tom) is deliberately
// absent — xAI 404s on it, so it has no provider-stated gender.
const XAI = new Map([
  ['f331ee80', { voice_id: 'f331ee80', gender: 'm', tts_locale: null, languages: ['tr'] }],
])

describe('audit', () => {
  const rows = audit(POOLS, CATALOGUE)
  const at = (pool, slot, index) => rows.find(r => r.pool === pool && r.slot === slot && r.index === index)

  it('flags the two transposed Turkish Azure voices and nothing else', () => {
    expect(rows.filter(r => r.verdict === 'mismatch').map(r => `${r.pool}.${r.slot}[${r.index}]`))
      .toEqual(['tur.f[0]', 'tur.m[1]'])
  })

  it('reads gender from the catalogue, not the display name', () => {
    // Both Turkish Azure voices are named for a person; only the catalogue
    // knows which is which, and the male one is the one named Ahmet.
    expect(at('tur', 'f', 0)).toMatchObject({ name: 'Ahmet', catalogue_gender: 'm', verdict: 'mismatch' })
  })

  it('calls an xai entry unverifiable when no provider gender is on record', () => {
    expect(at('tur', 'm', 0)).toMatchObject({ provider: 'xai', verdict: 'unverifiable', catalogue_gender: null })
  })

  it('checks an xai entry against the gender xAI states for the id', () => {
    // f331ee80 is xAI's Ahmet: GET /v1/tts/voices/f331ee80 → gender "male".
    // Sitting in the male list, that is 'ok'; the same row in the female list
    // is a mismatch, exactly as an Azure row would be.
    const rows = audit(POOLS, CATALOGUE, XAI)
    const row = rows.find(r => r.voice_id === 'f331ee80')
    expect(row).toMatchObject({ verdict: 'ok', catalogue_gender: 'm', locale: 'tr' })

    const swapped = { p: { f: [POOLS.tur.m[0]], m: [{ provider: 'azure', voice_id: 'tr-TR-AhmetNeural', name: 'Ahmet' }] } }
    expect(audit(swapped, CATALOGUE, XAI)[0]).toMatchObject({ verdict: 'mismatch', catalogue_gender: 'm' })
  })

  it('never guesses an xai voice the provider has no gender for', () => {
    const pools = { p: { f: [{ provider: 'xai', voice_id: 'gfzdpspr5fdp', name: 'Tom' }], m: [] } }
    expect(audit(pools, CATALOGUE, XAI)[0]).toMatchObject({ verdict: 'unverifiable', catalogue_gender: null })
  })

  it('passes a pool whose labels match the catalogue', () => {
    expect(rows.filter(r => r.pool === 'fra').every(r => r.verdict === 'ok')).toBe(true)
  })

  it('reports an azure voice the catalogue has never heard of as absent, not ok', () => {
    const pools = { x: { f: [{ provider: 'azure', voice_id: 'xx-XX-GhostNeural', name: 'Ghost' }], m: [] } }
    expect(audit(pools, CATALOGUE)[0].verdict).toBe('absent')
  })
})

describe('correctPool', () => {
  const mismatches = audit(POOLS, CATALOGUE).filter(r => r.pool === 'tur')
    .filter(r => r.verdict === 'mismatch')

  it('swaps the two voices into the lists azure says they belong in', () => {
    const after = correctPool(POOLS.tur, mismatches)
    expect(after.f.map(v => v.voice_id)).toEqual(['tr-TR-EmelNeural'])
    expect(after.m.map(v => v.voice_id)).toEqual(['f331ee80', 'tr-TR-AhmetNeural'])
  })

  it('leaves the unverifiable xai voice exactly where it was', () => {
    expect(correctPool(POOLS.tur, mismatches).m[0]).toBe(POOLS.tur.m[0])
  })

  it('is clean afterwards', () => {
    const after = correctPool(POOLS.tur, mismatches)
    expect(audit({ tur: after }, CATALOGUE).filter(r => r.verdict === 'mismatch')).toEqual([])
  })

  it('never mutates the pool it was given', () => {
    const snapshot = JSON.stringify(POOLS.tur)
    correctPool(POOLS.tur, mismatches)
    expect(JSON.stringify(POOLS.tur)).toBe(snapshot)
  })

  it('refuses two mismatches in one list — that is a scramble, not a transposition', () => {
    const pool = {
      f: [
        { provider: 'azure', voice_id: 'tr-TR-AhmetNeural', name: 'Ahmet' },
        { provider: 'azure', voice_id: 'fr-FR-HenriNeural', name: 'Henri' },
      ],
      m: [{ provider: 'azure', voice_id: 'tr-TR-EmelNeural', name: 'Emel' }],
    }
    const bad = audit({ p: pool }, CATALOGUE).filter(r => r.verdict === 'mismatch')
    expect(() => correctPool(pool, bad)).toThrow(/scramble/)
  })

  it('refuses a fix that would empty a gender list', () => {
    const pool = {
      f: [{ provider: 'azure', voice_id: 'tr-TR-AhmetNeural', name: 'Ahmet' }],
      m: [{ provider: 'azure', voice_id: 'fr-FR-HenriNeural', name: 'Henri' }],
    }
    const bad = audit({ p: pool }, CATALOGUE).filter(r => r.verdict === 'mismatch')
    expect(() => correctPool(pool, bad)).toThrow(/empty/)
  })
})
