/**
 * Tom 2026-09-29 10:17Z: until cloned voices replace a course's English wholesale, a NEW English clip in an
 * EXISTING course takes the voice that course already speaks English in (ita_for_eng = Sonia, Azure), provider
 * and voice id together. Charlotte (the cast) is for a course that holds no English clip yet.
 */
import { describe, it, expect, afterEach } from 'vitest'
import pkg from './course-english-voice.cjs'
import gate from './voice-cast-gate.cjs'
const { pickCourseVoice } = pkg
const { assertCastVoice, useCastRows, useCourseVoiceHolder, useCourseVoiceCensus } = gate

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
  const castRows = [{ language: 'eng', voice_id: 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121', assigned_by: 'kai-ruling-2026-09-23-charlotte-everywhere' }]
  afterEach(() => { useCastRows(null); useCourseVoiceHolder(null); useCourseVoiceCensus(null) })
  it('refuses Sonia for a course with no Sonia clip', async () => {
    useCastRows(castRows); useCourseVoiceHolder(async () => false)
    await expect(assertCastVoice('eng', 'azure_en-GB-SoniaNeural', { courseCode: 'new_course' })).rejects.toThrow(/not cast/)
  })
  // Tom 2026-10-10 (r-2026-10-10-new-phrase-audio-may-render-only): a course keeps an Azure voice only where
  // its voices in that language are ALL Azure; a course whose English is mixed gets no new Sonia line.
  it('Sonia renders for a course whose English is all Sonia; refused where its English is mixed', async () => {
    useCastRows(castRows); useCourseVoiceHolder(async () => true)
    useCourseVoiceCensus(async (c) => c === 'ita_for_eng'
      ? [{ role: 'known', language: 'eng', voice_id: 'azure_en-GB-SoniaNeural', clips: 900 }]
      : [{ role: 'known', language: 'eng', voice_id: 'azure_en-GB-SoniaNeural', clips: 900 }, { role: 'known', language: 'eng', voice_id: 'xai_eve', clips: 2 }])
    await expect(assertCastVoice('eng', 'azure_en-GB-SoniaNeural', { courseCode: 'ita_for_eng' })).resolves.toBeUndefined()
    await expect(assertCastVoice('eng', 'azure_en-GB-SoniaNeural', { courseCode: 'mixed_for_eng' })).rejects.toMatchObject({ code: 'VOICE_NOT_CAST', reason: 'not-cartesia' })
  })
  it('still allows a Cartesia voice the course already speaks, though the cast lists another', async () => {
    const tom = 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2'
    useCastRows(castRows); useCourseVoiceHolder(async (c, l, v) => c === 'spa_for_eng' && v === tom)
    await expect(assertCastVoice('eng', tom, { courseCode: 'spa_for_eng' })).resolves.toBeUndefined()
    await expect(assertCastVoice('eng', tom, { courseCode: 'new_course' })).rejects.toMatchObject({ reason: 'not-in-cast' })
  })
  it('a language whose only cast rows are not Cartesia is uncast', async () => {
    useCastRows([{ language: 'urd', voice_id: 'azure_ur-PK-UzmaNeural' }]); useCourseVoiceHolder(async () => true)
    await expect(assertCastVoice('urd', 'azure_ur-PK-UzmaNeural', { courseCode: 'eng_for_urd' })).rejects.toMatchObject({ reason: 'uncast' })
  })
  it('an empty cast table refuses every render; an audition is still heard', async () => {
    useCastRows([]); useCourseVoiceHolder(async () => true)
    await expect(assertCastVoice('sin', 'azure_si-LK-SameeraNeural', { courseCode: 'eng_for_sin' })).rejects.toMatchObject({ reason: 'uncast' })
    await expect(assertCastVoice('sin', 'azure_si-LK-SameeraNeural', { audition: true })).resolves.toBeUndefined()
  })
})
