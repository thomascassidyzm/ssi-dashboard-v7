/**
 * The legacy importers' clip identity.
 *
 * These importers used to hard-code four different placeholders into the voice
 * column — 'legacy_import', 'human_recording', 'legacy' and a bare 'human'.
 * None of them is a voice, so a clip filed under one can never dedup against
 * the same recording imported under another. What replaces them has to be a
 * real, canonical voice id, and the two importers have to spell the same clip
 * the same way — that is what these tests pin.
 */
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const core = require('./import-legacy-course-core.cjs')
const { isCanonicalVoiceId, NON_VOICE_SENTINELS } = require('../../services/shared/clip-identity.cjs')

describe('legacyHumanVoiceId', () => {
  it('composes the registry convention, human_<course>_<role>', () => {
    // These four are LIVE rows of the `voices` registry (checked 2026-08-06) —
    // the scheme is the estate's, not this file's invention.
    expect(core.legacyHumanVoiceId('spa_for_eng', 'target1')).toBe('human_spa_for_eng_target1')
    expect(core.legacyHumanVoiceId('cym_s_for_eng', 'presentation')).toBe('human_cym_s_for_eng_presentation')
    expect(core.legacyHumanVoiceId('cym_n_for_eng', 'known')).toBe('human_cym_n_for_eng_known')
    expect(core.legacyHumanVoiceId('spa_for_eng', 'target2')).toBe('human_spa_for_eng_target2')
  })

  it('emits values that are already their own canonical form', () => {
    for (const role of ['known', 'target1', 'target2', 'presentation']) {
      expect(isCanonicalVoiceId(core.legacyHumanVoiceId('gle_for_eng', role))).toBe(true)
    }
  })

  it('never emits one of the placeholders it replaces', () => {
    const composed = core.legacyHumanVoiceId('zho_for_eng', 'known')
    expect(NON_VOICE_SENTINELS.has(composed)).toBe(false)
    expect(composed).not.toBe('legacy_import')
    expect(composed).not.toBe('human_recording')
  })

  it('refuses to compose from a missing course or role rather than guessing', () => {
    expect(() => core.legacyHumanVoiceId('', 'known')).toThrow()
    expect(() => core.legacyHumanVoiceId('spa_for_eng', undefined)).toThrow()
  })
})

describe('sharedHumanVoiceId', () => {
  it('stands the known language and audio type in for the course and role', () => {
    expect(core.sharedHumanVoiceId('eng', 'encouragement')).toBe('human_shared_eng_encouragement')
    expect(core.sharedHumanVoiceId('eng', 'instruction')).toBe('human_shared_eng_instruction')
  })

  it('canonicalises the language, so one store cannot get two spellings', () => {
    expect(core.sharedHumanVoiceId('en', 'instruction')).toBe(core.sharedHumanVoiceId('eng', 'instruction'))
  })

  it('emits a canonical voice id', () => {
    expect(isCanonicalVoiceId(core.sharedHumanVoiceId('eng', 'encouragement'))).toBe(true)
  })
})

describe('canonicalSharedIdentity — shared_audio -> course_audio', () => {
  it('canonicalises both columns instead of copying them verbatim', () => {
    expect(core.canonicalSharedIdentity({
      language: 'en', voice_id: 'en-GB-SoniaNeural', audio_type: 'instruction',
    })).toEqual({ language: 'eng', voice_id: 'azure_en-GB-SoniaNeural' })
  })

  it('resolves a legacy placeholder to the shared human scheme', () => {
    for (const placeholder of ['human_recording', 'legacy', 'human']) {
      expect(core.canonicalSharedIdentity({
        language: 'eng', voice_id: placeholder, audio_type: 'encouragement',
      })).toEqual({ language: 'eng', voice_id: 'human_shared_eng_encouragement' })
    }
  })

  it('returns null — never a guess — when the identity cannot be resolved', () => {
    // A placeholder with no audio_type to stand in for the role.
    expect(core.canonicalSharedIdentity({ language: 'eng', voice_id: 'legacy' })).toBeNull()
    // A voice with no provider and no way to infer one.
    expect(core.canonicalSharedIdentity({ language: 'eng', voice_id: 'elevenlabs', audio_type: 'instruction' })).toBeNull()
    // Not a language.
    expect(core.canonicalSharedIdentity({ language: 'auto', voice_id: 'eve', audio_type: 'instruction' })).toBeNull()
  })
})
