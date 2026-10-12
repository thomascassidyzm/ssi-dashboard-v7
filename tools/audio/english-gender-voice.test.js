import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const { targetGender, targetVoice, englishSlotVoice, TOM_006, CHARLOTTE } = createRequire(import.meta.url)('./english-gender-voice.cjs')

describe('English voices: X_for_eng known is ALL Tom-006; gender variance is eng_for_X only (job #52)', () => {
  it('every X_for_eng known slot not on Tom-006 belongs to Tom-006, female origin and Charlotte included', () => {
    for (const v of ['xai_eve', 'azure_en-GB-SoniaNeural', CHARLOTTE, 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2', 'xai_leo'])
      for (const course of ['ara_for_eng', 'ita_for_eng', 'cym_for_eng']) expect(englishSlotVoice({ course, col: 'known_audio_id', clipVoice: v })).toBe(TOM_006)
    expect(englishSlotVoice({ course: 'jpn_for_eng', col: 'known_audio_id', clipVoice: TOM_006 })).toBe(null)
  })
  it('an X_for_eng slot never goes to Charlotte', () => {
    for (const v of ['xai_eve', 'azure_en-GB-SoniaNeural', 'en-GB-LibbyNeural', 'bedd6226', CHARLOTTE])
      expect(englishSlotVoice({ course: 'spa_for_eng', col: 'known_audio_id', clipVoice: v })).not.toBe(CHARLOTTE)
  })
  it('eng_for_X target2 keeps gender: female-origin to Charlotte, male to Tom-006, Cartesia left alone', () => {
    for (const v of ['xai_eve', 'azure_en-GB-SoniaNeural', 'en-GB-LibbyNeural', 'bedd6226']) expect(englishSlotVoice({ course: 'eng_for_hin', col: 'target2_audio_id', clipVoice: v })).toBe(CHARLOTTE)
    for (const v of ['xai_leo', 'azure_en-GB-RyanNeural', null]) expect(englishSlotVoice({ course: 'eng_for_hin', col: 'target2_audio_id', clipVoice: v })).toBe(TOM_006)
    expect(englishSlotVoice({ course: 'eng_for_hin', col: 'target2_audio_id', clipVoice: CHARLOTTE })).toBe(null)
    expect(englishSlotVoice({ course: 'eng_for_hin', col: 'known_audio_id', clipVoice: 'xai_eve' })).toBe(null)
  })
  it('targetVoice/targetGender still split by gender (the eng_for_X rule)', () => {
    expect(targetVoice(targetGender('xai_eve'))).toBe(CHARLOTTE)
    expect(targetVoice(targetGender('xai_leo'))).toBe(TOM_006)
  })
})
