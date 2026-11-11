import { describe, it, expect } from 'vitest'
const { slotVoiceException, EXCEPTIONS } = require('./slot-voice-exceptions.cjs')
const { courseSpokenFor } = require('./pronunciation-overrides.cjs')
const { checkRender } = require('./voicing-policy.cjs')

const TOM = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'
const CHARLOTTE = 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121'

describe('one-slot voice exceptions', () => {
  it('lets Tom-006 into swe_for_eng S0059L02 presentation only (Kai 2026-11-11)', () => {
    expect(slotVoiceException({ courseCode: 'swe_for_eng', legoId: 'S0059L02', role: 'presentation', voiceId: TOM })).toBeTruthy()
    expect(slotVoiceException({ courseCode: 'swe_for_eng', legoId: 'S0059L02', role: 'presentation', voiceId: 'd293d509-eb96-4df4-8cfd-80a693aa49a9' })).toBeTruthy()
  })
  it('is no general bypass: other slot, role, course or voice is checked as normal', () => {
    expect(slotVoiceException({ courseCode: 'swe_for_eng', legoId: 'S0059L01', role: 'presentation', voiceId: TOM })).toBeNull()
    expect(slotVoiceException({ courseCode: 'swe_for_eng', legoId: 'S0059L02', role: 'known', voiceId: TOM })).toBeNull()
    expect(slotVoiceException({ courseCode: 'kor_for_eng', legoId: 'S0059L02', role: 'presentation', voiceId: TOM })).toBeNull()
    expect(slotVoiceException({ courseCode: 'swe_for_eng', legoId: 'S0059L02', role: 'presentation', voiceId: CHARLOTTE })).toBeNull()
    expect(slotVoiceException({ courseCode: 'swe_for_eng', legoId: null, role: 'presentation', voiceId: TOM })).toBeNull()
    expect(EXCEPTIONS).toHaveLength(1)
  })
  it('the S0059L02 intro line is sent with the IPA does', () => {
    expect(courseSpokenFor({ courseCode: 'swe_for_eng', text: "The Swedish for: 'does', is:" })).toBe("The Swedish for: '<<ˈ|d|ʌ|z>>', is:")
  })
  it('the voicing policy lets the whole Tom-006 intro through for S0059L02 only', () => {
    const course = { course_code: 'swe_for_eng', known_lang: 'eng', target_lang: 'swe' }
    const r = { text: "The Swedish for: 'does', is:", language: 'eng', voiceId: TOM, course, role: 'presentation' }
    expect(checkRender({ ...r, legoId: 'S0059L02' }).allowed).toBe(true)
    expect(checkRender({ ...r, legoId: 'S0059L01' }).allowed).toBe(false)
  })
})
