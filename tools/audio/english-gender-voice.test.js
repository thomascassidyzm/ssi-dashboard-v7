import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const { targetGender, targetVoice, TOM_006, CHARLOTTE } = createRequire(import.meta.url)('./english-gender-voice.cjs')

describe('English gender variance (job #24)', () => {
  it('female-origin clips (eve, Sonia, Olivia) go to Charlotte', () => {
    for (const v of ['xai_eve', 'azure_en-GB-SoniaNeural', 'en-GB-LibbyNeural', 'bedd6226']) expect(targetVoice(targetGender(v))).toBe(CHARLOTTE)
  })
  it('male-origin and unlisted voices go to Tom-006', () => {
    for (const v of ['xai_leo', 'azure_en-GB-RyanNeural', 'azure_en-GB-SomeNewNeural', null]) expect(targetVoice(targetGender(v))).toBe(TOM_006)
  })
})
