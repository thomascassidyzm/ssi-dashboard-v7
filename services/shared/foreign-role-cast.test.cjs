/**
 * Job #758: an English prompt rendered on a non-English role (ita_for_eng, role
 * target1 or a stored Azure English voice) must take the English CAST voice —
 * provider AND voice id together, in one place — never a stored voice of another
 * language, and never the cast provider carrying the stored voice's id.
 */
import { describe, it, expect } from 'vitest'
import pkg from './language-voice-cast.cjs'
const { castVoiceForLanguage } = pkg

const roles = [
  { language: 'eng', gender: 'f', rank: 0, voice_id: 'cartesia_charlotte', slot: 'known' },
  { language: 'eng', gender: 'f', rank: 0, voice_id: 'cartesia_charlotte', slot: 'phrase' },
  { language: 'eng', gender: 'm', rank: 0, voice_id: 'cartesia_tom', slot: 'phrase' },
]
const voices = [
  { voice_id: 'cartesia_charlotte', tts_engine: 'cartesia', is_active: true, display_name: 'Charlotte' },
  { voice_id: 'cartesia_tom', tts_engine: 'cartesia', is_active: true, display_name: 'Tom' },
]
const cast = { roles, voices }

describe('castVoiceForLanguage', () => {
  it('English on a non-English role resolves Charlotte on Cartesia, voice and provider together', () => {
    const v = castVoiceForLanguage(cast, 'eng', 'f')
    expect(v.provider).toBe('cartesia')
    expect(v.name).toBe('Charlotte')
    expect(v.voiceId).toBe('cartesia_charlotte')
  })
  it('honours the gender asked for', () => {
    expect(castVoiceForLanguage(cast, 'eng', 'm').name).toBe('Tom')
  })
  it('null when the language has no cast', () => {
    expect(castVoiceForLanguage(cast, 'ita', 'f')).toBeNull()
  })
})
