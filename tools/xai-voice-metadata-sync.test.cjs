/**
 * Unit tests: xAI VOICE METADATA, RESOLVED BY ID (Tom, 2026-08-11).
 *
 * The belief this replaces: "our opaque hex ids appear in no catalogue xAI
 * serves". They appear in one — GET /v1/tts/voices/{voice_id} — and the earlier
 * check missed it by comparing ids against the by-name LIST endpoint.
 *
 * What has to hold:
 *   (a) the provider's word is what lands, normalised to the pools' f/m;
 *   (b) a 404 id yields NO row — an unknown gender stays unknown, never a guess;
 *   (c) an id xAI knows but states no gender for still records name/language/age,
 *       with gender NULL;
 *   (d) 'ca-ES' keeps its locale (that IS the accent) while 'de' does not invent one;
 *   (e) every place an id can be used is collected, so nothing is silently skipped.
 *
 * Run: npx vitest run tools/xai-voice-metadata-sync
 */

import { describe, it, expect } from 'vitest'

const { normaliseGender, splitLanguage, voiceRow, collectIds, fetchVoice } = require('./xai-voice-metadata-sync.cjs')

const AT = '2026-08-11T00:00:00.000Z'

describe('normaliseGender', () => {
  it('speaks the pools’ f/m', () => {
    expect(normaliseGender('female')).toBe('f')
    expect(normaliseGender('Male')).toBe('m')
  })

  it('returns null rather than a guess for anything else', () => {
    for (const v of [undefined, null, '', 'unknown', 'neutral']) expect(normaliseGender(v)).toBe(null)
  })
})

describe('splitLanguage', () => {
  it('keeps a locale when the provider gives one — the locale is the accent', () => {
    expect(splitLanguage('ca-ES')).toEqual({ locale: 'ca-ES', base: 'ca' })
  })

  it('does not invent a locale from a bare language', () => {
    expect(splitLanguage('de')).toEqual({ locale: null, base: 'de' })
  })

  it('treats multilingual as the pseudo-language it is, not a locale', () => {
    expect(splitLanguage('multilingual')).toEqual({ locale: null, base: 'mul' })
  })
})

describe('voiceRow', () => {
  it('writes the provider’s gender, age and locale', () => {
    const row = voiceRow('4d3af3e1', { name: 'Mireia', language: 'ca-ES', gender: 'female', age: 'middle-aged' }, AT)
    expect(row).toMatchObject({
      voice_id: '4d3af3e1', tts_engine: 'xai', display_name: 'Mireia',
      gender: 'f', age: 'middle-aged', tts_locale: 'ca-ES', languages: ['ca'],
      metadata_source: 'xai:GET /v1/tts/voices/{id}', metadata_checked_at: AT,
    })
  })

  it('records the rest but leaves gender NULL when xAI states none', () => {
    // Live case: jupvcf34 (Diego) — xAI answers 200 with no `gender` field.
    const row = voiceRow('jupvcf34', { name: 'Diego', language: 'es' }, AT)
    expect(row.gender).toBe(null)
    expect(row).toMatchObject({ display_name: 'Diego', languages: ['es'], age: null })
  })
})

describe('fetchVoice', () => {
  const ok = (body) => async () => ({ status: 200, ok: true, text: async () => JSON.stringify(body) })

  it('returns the provider’s metadata for an id it knows', async () => {
    const meta = { voice_id: 'f331ee80', name: 'Ahmet', language: 'tr', gender: 'male', age: 'middle-aged' }
    expect(await fetchVoice('f331ee80', 'k', ok(meta))).toEqual({ status: 200, meta })
  })

  it('yields no metadata at all on 404 — an unknown id is never filled in', async () => {
    const res = await fetchVoice('gfzdpspr5fdp', 'k', async () => ({ status: 404, ok: false, text: async () => 'nope' }))
    expect(res).toEqual({ status: 404, meta: null })
  })

  it('does not treat an unparseable 200 as an answer', async () => {
    const res = await fetchVoice('x', 'k', async () => ({ status: 200, ok: true, text: async () => '<html>' }))
    expect(res.meta).toBe(null)
  })
})

describe('collectIds', () => {
  const pools = {
    tur: {
      f: [{ provider: 'azure', voice_id: 'tr-TR-EmelNeural', name: 'Emel' }],
      m: [{ provider: 'xai', voice_id: 'f331ee80', name: 'Ahmet' }],
    },
  }
  const catalogueFile = { tr: [{ voice_id: 'f331ee80', name: 'Ahmet', gender: 'm' }], da: [{ voice_id: '0ih5oi34', name: 'Kasper', gender: 'm' }] }
  const voiceRows = [{ voice_id: 'gfzdpspr5fdp', display_name: 'Tom' }]

  const ids = collectIds({ pools, catalogueFile, voiceRows })

  it('finds every xai id in play across all three places, once each', () => {
    expect(ids.map(i => i.voice_id).sort()).toEqual(['0ih5oi34', 'f331ee80', 'gfzdpspr5fdp'])
  })

  it('records where each id is used, so a residual can be traced to its slot', () => {
    expect(ids.find(i => i.voice_id === 'f331ee80').used_in).toEqual(['pool:tur.m[0]', 'pod-voices-xai.json:tr'])
  })

  it('never picks up an azure pool entry', () => {
    expect(ids.some(i => i.voice_id.startsWith('tr-TR-'))).toBe(false)
  })
})
