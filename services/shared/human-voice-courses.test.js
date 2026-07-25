// Unit tests for the human-voice-only course exclusion (Tom's ruling 2026-07-25:
// Welsh cym_* courses are human-recorded — no TTS ever).
// Run: npx vitest run services/shared/human-voice-courses.test.js
import { describe, it, expect } from 'vitest'
import { HUMAN_VOICE_COURSES, isHumanVoiceCourse } from './human-voice-courses.cjs'
import ttsService from '../tts-service.cjs'

describe('isHumanVoiceCourse', () => {
  it('flags the two named Welsh courses', () => {
    expect(isHumanVoiceCourse('cym_n_for_eng')).toBe(true)
    expect(isHumanVoiceCourse('cym_s_for_eng')).toBe(true)
    expect(HUMAN_VOICE_COURSES.has('cym_n_for_eng')).toBe(true)
    expect(HUMAN_VOICE_COURSES.has('cym_s_for_eng')).toBe(true)
  })

  it('flags any cym_* course by prefix (future Welsh courses covered)', () => {
    expect(isHumanVoiceCourse('cym_for_spa')).toBe(true)
    expect(isHumanVoiceCourse('cym_mid_for_eng')).toBe(true)
  })

  it('does not flag other courses', () => {
    expect(isHumanVoiceCourse('fra_for_eng')).toBe(false)
    expect(isHumanVoiceCourse('eng_for_cym')).toBe(false) // Welsh as KNOWN, not target
    expect(isHumanVoiceCourse('spa_for_eng')).toBe(false)
  })

  it('is null-safe', () => {
    expect(isHumanVoiceCourse(null)).toBe(false)
    expect(isHumanVoiceCourse(undefined)).toBe(false)
    expect(isHumanVoiceCourse('')).toBe(false)
  })
})

describe('tts-service.assertNotHumanVoiceCourse (chokepoint)', () => {
  it('throws a non-retriable (403) error for a human-voice course', () => {
    expect(() => ttsService.assertNotHumanVoiceCourse({ courseCode: 'cym_s_for_eng' }))
      .toThrow(/Human-voice course blocked \(403\)/)
    // (403) => isRetriableTtsError must classify it as a client error (no retry)
    let err
    try { ttsService.assertNotHumanVoiceCourse({ courseCode: 'cym_s_for_eng' }) } catch (e) { err = e }
    expect(ttsService.isRetriableTtsError(err)).toBe(false)
  })

  it('is a no-op when no course code is present or the course is voiceable', () => {
    expect(() => ttsService.assertNotHumanVoiceCourse({})).not.toThrow()
    expect(() => ttsService.assertNotHumanVoiceCourse({ courseCode: 'fra_for_eng' })).not.toThrow()
  })
})

describe('tts-service.generate refuses human-voice courses', () => {
  it('rejects before dispatching to any provider', async () => {
    await expect(
      ttsService.generate('helo', 'xai', { courseCode: 'cym_n_for_eng', voiceId: 'x', apiKey: 'x' })
    ).rejects.toThrow(/Human-voice course blocked \(403\)/)
  })
})
