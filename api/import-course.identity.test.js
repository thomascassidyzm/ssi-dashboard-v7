/**
 * The API importer's clip identity — and, most importantly, that it agrees with
 * the CLI importer. Two importers that spell the same clip two ways is the
 * defect this whole change exists to remove, so the agreement is pinned here
 * rather than left to the two files' comments.
 */
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import * as api from './import-course.js'

const require = createRequire(import.meta.url)
const core = require('../database/lib/import-legacy-course-core.cjs')
const { isCanonicalVoiceId } = require('../services/shared/clip-identity.cjs')

describe('api/import-course.js voice ids', () => {
  it('composes the same value the CLI importer does, for every legacy course and role', () => {
    for (const course of ['cym_n_for_eng', 'cym_s_for_eng', 'spa_for_eng', 'gle_for_eng', 'zho_for_eng']) {
      for (const role of ['known', 'target1', 'target2', 'presentation']) {
        expect(api.legacyHumanVoiceId(course, role)).toBe(core.legacyHumanVoiceId(course, role))
      }
    }
  })

  it('derives the known database_code from the course code, with no reference file', () => {
    expect(api.knownDbCode('cym_s_for_eng')).toBe('eng')
    expect(api.knownDbCode('eng_for_jpn')).toBe('jpn')
    expect(api.knownDbCode('nonsense')).toBeNull()
  })

  it('spells shared_audio rows the same way the CLI importer does', () => {
    for (const type of ['instruction', 'encouragement']) {
      expect(api.sharedHumanVoiceId('cym_s_for_eng', type)).toBe(core.sharedHumanVoiceId('eng', type))
    }
  })

  it('emits canonical values', () => {
    expect(isCanonicalVoiceId(api.legacyHumanVoiceId('spa_for_eng', 'known'))).toBe(true)
    expect(isCanonicalVoiceId(api.sharedHumanVoiceId('spa_for_eng', 'instruction'))).toBe(true)
  })

  it('returns null rather than composing from a missing course or role', () => {
    expect(api.legacyHumanVoiceId('', 'known')).toBeNull()
    expect(api.legacyHumanVoiceId('spa_for_eng', '')).toBeNull()
    expect(api.sharedHumanVoiceId('nonsense', 'instruction')).toBeNull()
  })
})

describe('copiedVoiceId — shared_audio -> course_audio', () => {
  it('canonicalises a real voice on the way across', () => {
    expect(copied({ voice_id: 'en-GB-SoniaNeural', audio_type: 'instruction' })).toBe('azure_en-GB-SoniaNeural')
    expect(copied({ voice_id: 'comp:leo', audio_type: 'instruction' })).toBe('comp:xai_leo')
  })

  it('resolves each legacy placeholder to the shared human scheme', () => {
    for (const placeholder of ['legacy', 'human_recording', 'human', 'legacy_import']) {
      expect(copied({ voice_id: placeholder, audio_type: 'encouragement' }))
        .toBe('human_shared_eng_encouragement')
    }
  })

  it('carries an unresolvable value across UNCHANGED rather than guessing', () => {
    // 'elevenlabs' is a provider name with no voice in it — live shared rows
    // carry it. Losing the clip would be worse than a stale spelling.
    expect(copied({ voice_id: 'elevenlabs', audio_type: 'instruction' })).toBe('elevenlabs')
  })

  function copied(row) {
    return api.copiedVoiceId(row, 'cym_s_for_eng')
  }
})
