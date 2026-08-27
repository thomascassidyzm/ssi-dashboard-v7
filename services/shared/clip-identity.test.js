import { describe, it, expect } from 'vitest'
const {
  canonicalLanguage,
  canonicalVoiceId,
  clipIdentity,
  tryCanonicalLanguage,
  tryCanonicalVoiceId,
  isCanonicalLanguage,
  isCanonicalVoiceId,
  ClipIdentityError,
} = require('./clip-identity.cjs')

describe('canonicalLanguage — every spelling of a language collapses to one', () => {
  it('passes a database_code through unchanged', () => {
    expect(canonicalLanguage('eng')).toBe('eng')
    expect(canonicalLanguage('zho')).toBe('zho')
    expect(canonicalLanguage('cym')).toBe('cym')
  })

  it('maps ISO-639-1 to the database_code', () => {
    expect(canonicalLanguage('en')).toBe('eng')
    expect(canonicalLanguage('de')).toBe('deu')
    expect(canonicalLanguage('el')).toBe('ell')  // needs the quoted CSV name row
    expect(canonicalLanguage('zh')).toBe('zho')
  })

  it('drops the region — the voice carries the accent, not the language column', () => {
    expect(canonicalLanguage('en-GB')).toBe('eng')
    expect(canonicalLanguage('fr-CA')).toBe('fra')
    expect(canonicalLanguage('pt-BR')).toBe('por')
    expect(canonicalLanguage('pt-PT')).toBe('por')
    expect(canonicalLanguage('es-MX')).toBe('spa')
    // the ara / ara_lb case that started this work
    expect(canonicalLanguage('ar-LB')).toBe('ara')
    expect(canonicalLanguage('ara')).toBe('ara')
  })

  it('is case- and separator-insensitive', () => {
    expect(canonicalLanguage(' EN-gb ')).toBe('eng')
    expect(canonicalLanguage('pt_BR')).toBe('por')
  })

  it('prefers the estate code where the CSV offers two', () => {
    expect(canonicalLanguage('cmn')).toBe('zho')
  })

  // 2026-08-14: the guard rejected fourteen languages the estate builds courses
  // in — pdc, hak, nan, yue, yor, lmo, rgn, vec, fur, nap, scn, roh, sme, yid —
  // purely because the reference CSV had no database_code for them. That was
  // history, not policy (docs/audio-language-guard-scoping-2026-08-14.md): the
  // Celtic block was hand-written years ago and these rows never were. Zero
  // audio rows existed under any of the fourteen, so filling the column was a
  // data fix with nothing to migrate.
  it('admits the fourteen languages the CSV had no database_code for', () => {
    for (const code of [
      'pdc', 'hak', 'nan', 'yue', 'yor', 'lmo', 'rgn',
      'vec', 'fur', 'nap', 'scn', 'roh', 'sme', 'yid',
    ]) {
      expect(canonicalLanguage(code)).toBe(code)
    }
  })

  it('resolves the manifest spellings of the four renamed rows', () => {
    // The CSV files these under a 639-1 manifest code; the database_code is the
    // 639-3 one the course codes use.
    expect(canonicalLanguage('rm')).toBe('roh')
    expect(canonicalLanguage('se')).toBe('sme')
    expect(canonicalLanguage('yi')).toBe('yid')
    expect(canonicalLanguage('yo')).toBe('yor')
  })

  it('throws on a value that is not a language rather than guessing', () => {
    expect(() => canonicalLanguage('auto')).toThrow(ClipIdentityError)
    expect(() => canonicalLanguage('')).toThrow(ClipIdentityError)
    expect(() => canonicalLanguage(null)).toThrow(ClipIdentityError)
    expect(() => canonicalLanguage('klingon')).toThrow(ClipIdentityError)
    expect(tryCanonicalLanguage('auto')).toBeNull()
  })
})

describe('canonicalVoiceId — one voice, one spelling', () => {
  it('keeps a provider-prefixed id as it is', () => {
    expect(canonicalVoiceId('azure_en-GB-SoniaNeural')).toBe('azure_en-GB-SoniaNeural')
    expect(canonicalVoiceId('xai_eve')).toBe('xai_eve')
    expect(canonicalVoiceId('elevenlabs_FVdzAUsp8apoOdc0907A')).toBe('elevenlabs_FVdzAUsp8apoOdc0907A')
  })

  it('adds the prefix to a bare Azure voice name', () => {
    expect(canonicalVoiceId('en-GB-SoniaNeural')).toBe('azure_en-GB-SoniaNeural')
    expect(canonicalVoiceId('ta-LK-SaranyaNeural')).toBe('azure_ta-LK-SaranyaNeural')
  })

  it('collapses the two spellings of the same xAI voice', () => {
    expect(canonicalVoiceId('leo')).toBe('xai_leo')
    expect(canonicalVoiceId('xai_leo')).toBe('xai_leo')
  })

  it('keeps a composite in its own namespace and canonicalises each part', () => {
    // A spliced explainer is not the same audio as a plain single-voice render,
    // so 'comp:leo' must NOT collapse onto 'xai_leo'.
    expect(canonicalVoiceId('comp:leo')).toBe('comp:xai_leo')
    expect(canonicalVoiceId('comp:leo')).not.toBe(canonicalVoiceId('leo'))
    expect(canonicalVoiceId('comp:ga-IE-OrlaNeural+en-GB-SoniaNeural'))
      .toBe('comp:azure_ga-IE-OrlaNeural+azure_en-GB-SoniaNeural')
  })

  it('does not lowercase the provider voice name — Azure names are case-significant', () => {
    expect(canonicalVoiceId('azure_en-GB-SoniaNeural')).not.toBe('azure_en-gb-sonianeural')
  })

  it('uses the caller provider for an opaque id', () => {
    expect(canonicalVoiceId('EXAVITQu4vr4xnSDxMaL', { provider: 'elevenlabs' }))
      .toBe('elevenlabs_EXAVITQu4vr4xnSDxMaL')
    expect(canonicalVoiceId('yis75yfp', { provider: 'xai' })).toBe('xai_yis75yfp')
  })

  it('refuses an opaque id with no provider rather than inventing one', () => {
    expect(() => canonicalVoiceId('yis75yfp')).toThrow(ClipIdentityError)
    expect(tryCanonicalVoiceId('f15c6a6a')).toBeNull()
  })

  it('throws when the id and the caller disagree about the provider', () => {
    expect(() => canonicalVoiceId('azure_en-GB-SoniaNeural', { provider: 'xai' })).toThrow(/provider/)
  })

  // Added with the forward-only Cartesia wiring, 2026-08-27. A Cartesia voice
  // id is a bare UUID — it looks like nothing in particular, which is exactly
  // why the provider has to be carried explicitly and why the alias entry is
  // the keystone of the whole integration.
  it('canonicalises a Cartesia id from the caller provider, and keeps a prefixed one', () => {
    const clone = '8fef4d59-0a7e-4ad2-a261-6a3bb50734d2'
    expect(canonicalVoiceId(clone, { provider: 'cartesia' })).toBe(`cartesia_${clone}`)
    expect(canonicalVoiceId(`cartesia_${clone}`)).toBe(`cartesia_${clone}`)
    expect(isCanonicalVoiceId(`cartesia_${clone}`)).toBe(true)
  })

  it('still refuses a bare Cartesia UUID with no provider — the shape proves nothing', () => {
    // This is the fail-CLOSED half of the pair. Its fail-OPEN twin lived in
    // audio-repair-core's decodeVoiceId, which defaulted any bare id to xAI and
    // would have repaired a Cartesia clip through xAI's API without a word.
    expect(() => canonicalVoiceId('8fef4d59-0a7e-4ad2-a261-6a3bb50734d2')).toThrow(ClipIdentityError)
  })

  it('does not let a Cartesia id pass as another provider', () => {
    expect(() => canonicalVoiceId('cartesia_8fef4d59', { provider: 'xai' })).toThrow(/provider/)
  })

  it('throws on placeholders that are not voices', () => {
    for (const sentinel of ['legacy_import', 'human', 'human_recording', 'unknown', '']) {
      expect(() => canonicalVoiceId(sentinel)).toThrow(ClipIdentityError)
    }
  })

  it('keeps a per-course human voice id whole', () => {
    expect(canonicalVoiceId('human_spa_for_eng_target1')).toBe('human_spa_for_eng_target1')
  })
})

describe('clipIdentity', () => {
  it('normalises text the way the DB trigger does', () => {
    const id = clipIdentity({ language: 'en-GB', text: '  How Long?  ', voiceId: 'en-GB-SoniaNeural' })
    expect(id).toEqual({
      language: 'eng',
      text_normalized: 'how long',
      voice_id: 'azure_en-GB-SoniaNeural',
      key: ['eng','how long','azure_en-GB-SoniaNeural'].join('\u001f'),
    })
  })

  it('gives two differently-spelt writes of the same clip one key', () => {
    const a = clipIdentity({ language: 'en', text: 'I want to learn.', voiceId: 'en-GB-SoniaNeural' })
    const b = clipIdentity({ language: 'eng', text: 'i want to learn', voiceId: 'azure_en-GB-SoniaNeural' })
    expect(a.key).toBe(b.key)
  })

  it('keeps the two target voices of one text apart — voice is in the identity', () => {
    const t1 = clipIdentity({ language: 'kor', text: '안녕하세요', voiceId: 'ara', provider: 'xai' })
    const t2 = clipIdentity({ language: 'kor', text: '안녕하세요', voiceId: 'leo', provider: 'xai' })
    expect(t1.key).not.toBe(t2.key)
  })

  it('refuses to build an identity it had to guess at', () => {
    expect(() => clipIdentity({ language: 'auto', text: 'hola', voiceId: 'xai_eve' })).toThrow()
    expect(() => clipIdentity({ language: 'spa', text: '   ', voiceId: 'xai_eve' })).toThrow()
  })
})

describe('is*Canonical — what an audit asks of a stored row', () => {
  it('is true only for the exact canonical spelling', () => {
    expect(isCanonicalLanguage('eng')).toBe(true)
    expect(isCanonicalLanguage('en-GB')).toBe(false)
    expect(isCanonicalVoiceId('azure_en-GB-SoniaNeural')).toBe(true)
    expect(isCanonicalVoiceId('en-GB-SoniaNeural')).toBe(false)
    expect(isCanonicalVoiceId('legacy_import')).toBe(false)
  })
})

describe('the database copy is generated from this module, not written twice', () => {
  const fs = require('fs')
  const path = require('path')
  const { rows, sql } = require('../../tools/generate-language-canonical-sql.cjs')
  const MIGRATION = path.join(
    __dirname, '..', '..', 'database', 'migrations',
    '20260806_clip_identity_canonical_functions.sql'
  )

  it('every generated row is what canonicalLanguage would say', () => {
    for (const [raw, canonical] of rows()) {
      expect(canonicalLanguage(raw), `language_canonical row for ${raw}`).toBe(canonical)
    }
  })

  it('covers the codes the estate actually stores', () => {
    const map = new Map(rows())
    // one from each family the live column holds
    for (const [raw, want] of [['eng','eng'],['en','eng'],['zho','zho'],['zh','zho'],['ell','ell'],['el','ell']]) {
      expect(map.get(raw), `language_canonical is missing ${raw}`).toBe(want)
    }
  })

  it('the committed migration holds the current generated output', () => {
    // If this fails the CSV changed and the migration was not regenerated:
    //   node tools/generate-language-canonical-sql.cjs /tmp/rows.sql
    // then splice /tmp/rows.sql back into the migration.
    const committed = fs.readFileSync(MIGRATION, 'utf8')
    for (const line of sql().split('\n')) {
      if (line.startsWith("  ('")) expect(committed).toContain(line.replace(/,$/, ''))
    }
  })
})
