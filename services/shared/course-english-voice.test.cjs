/**
 * Tom 2026-09-29 10:17Z: until cloned voices replace a course's English wholesale, a NEW English clip in an
 * EXISTING course takes the voice that course already speaks English in (ita_for_eng = Sonia, Azure), provider
 * and voice id together. Charlotte (the cast) is for a course that holds no English clip yet.
 */
import { describe, it, expect, afterEach } from 'vitest'
import pkg from './course-english-voice.cjs'
import gate from './voice-cast-gate.cjs'
const { pickCourseVoice } = pkg
const { assertCastVoice, useCastRows, useCourseVoiceHolder } = gate

describe('pickCourseVoice', () => {
  it('takes the voice most of the recent English clips are in, with its provider', () => {
    const rows = [
      { voice_id: 'azure_en-GB-SoniaNeural' }, { voice_id: 'azure_en-GB-SoniaNeural' },
      { voice_id: 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121' },
    ]
    expect(pickCourseVoice(rows)).toEqual({ provider: 'azure', voiceId: 'en-GB-SoniaNeural' })
  })
  it('reads a bare Azure Neural name as Azure', () => {
    expect(pickCourseVoice([{ voice_id: 'en-GB-SoniaNeural' }])).toEqual({ provider: 'azure', voiceId: 'en-GB-SoniaNeural' })
  })
  it('ignores retired / unprefixed provider ids and human recordings', () => {
    expect(pickCourseVoice([{ voice_id: 'xai_eve' }, { voice_id: 'human_recording' }, { voice_id: 'leo' }])).toBeNull()
  })
  it('null when the course holds no English clip, so the cast (Charlotte) applies', () => {
    expect(pickCourseVoice([])).toBeNull()
  })
})

describe('cast gate honours the voice the course already holds', () => {
  const castRows = [{ language: 'eng', voice_id: 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121' }]
  afterEach(() => { useCastRows(null); useCourseVoiceHolder(null) })
  it('refuses Sonia for a course with no Sonia clip', async () => {
    useCastRows(castRows); useCourseVoiceHolder(async () => false)
    await expect(assertCastVoice('eng', 'azure_en-GB-SoniaNeural', { courseCode: 'new_course' })).rejects.toThrow(/not cast/)
  })
  it('allows Sonia for a course that already speaks English in Sonia', async () => {
    useCastRows(castRows); useCourseVoiceHolder(async (c, l, v) => c === 'ita_for_eng' && v === 'azure_en-GB-SoniaNeural')
    await expect(assertCastVoice('eng', 'azure_en-GB-SoniaNeural', { courseCode: 'ita_for_eng' })).resolves.toBeUndefined()
  })
})
