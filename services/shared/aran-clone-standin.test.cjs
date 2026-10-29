/**
 * Aran's clone as a stand-in on the nv2/sv2 English known side (Aran 2026-10-29, job #557;
 * services/shared/aran-clone-standin.cjs). The ALLOWED case is one slot in one voice; every neighbour of it —
 * the Welsh side, the live courses, intros, other voices, Tom's clones — is REFUSED exactly as before.
 */
import { describe, it, expect } from 'vitest'
import standIn from './aran-clone-standin.cjs'
import hv from './human-voice-courses.cjs'
import rv from './resolve-voice.cjs'
import policy from './voicing-policy.cjs'
import providerPolicy from './tts-provider-policy.cjs'
const { STANDIN_VOICE: ARAN_ENGLISH_CLONE, isCloneStandInSlot, isReplaceableStandIn } = standIn  // the switchable voice
const { isHumanVoiceSlotBlocked, isHumanVoiceCourse } = hv
const { resolveVoice, checkPointer, TOM_006 } = rv
const { checkRender } = policy
const { selectProvider } = providerPolicy

const course = (code) => ({ course_code: code, known_lang: 'eng', target_lang: 'cym' })
const NV2 = course('cym_nv2_for_eng'), SV2 = course('cym_sv2_for_eng')
const LIVE = [course('cym_n_for_eng'), course('cym_s_for_eng')]
const BARE_CLONE = ARAN_ENGLISH_CLONE.replace(/^cartesia_/, '')

describe('allowed: the English known slot of cym_nv2_for_eng / cym_sv2_for_eng, in Aran\'s clone', () => {
  it('the slot test, the human-voice slot gate, resolveVoice, the render door, the pointer check and the provider ladder all agree', () => {
    for (const c of [NV2, SV2]) {
      expect(isCloneStandInSlot({ courseCode: c.course_code, role: 'known', language: 'eng' })).toBe(true)
      expect(isHumanVoiceSlotBlocked({ courseCode: c.course_code, role: 'known', language: 'eng' })).toBe(false)
      expect(isHumanVoiceSlotBlocked({ courseCode: c.course_code, role: 'known', language: 'en-GB' })).toBe(false)
      expect(resolveVoice({ course: c, role: 'known' }, null)).toMatchObject({ status: 'voice', voiceId: ARAN_ENGLISH_CLONE, rule: 'aran-clone-standin' })
      expect(checkRender({ text: 'I want to speak', language: 'eng', voiceId: ARAN_ENGLISH_CLONE, course: c, role: 'known' })).toMatchObject({ allowed: true })
      expect(checkPointer({ course: c, role: 'known', clip: { voice_id: ARAN_ENGLISH_CLONE, language: 'eng', origin: 'tts' } }, null)).toMatchObject({ ok: true })
      expect(selectProvider({ courseCode: c.course_code, role: 'known', language: 'eng', voiceId: BARE_CLONE, explicitProvider: 'cartesia' }))
        .toMatchObject({ provider: 'cartesia', voiceId: BARE_CLONE })
    }
  })
  it('a clone clip in that slot is a stand-in a real take may replace', () => {
    expect(isReplaceableStandIn({ courseCode: 'cym_nv2_for_eng', role: 'known', voiceId: ARAN_ENGLISH_CLONE })).toBe(true)
    expect(isReplaceableStandIn({ courseCode: 'cym_sv2_for_eng', role: 'known', voiceId: BARE_CLONE })).toBe(true)
  })
})

describe('refused: everything else stays human-only', () => {
  it('the Welsh side of the stand-in courses (target1/target2) and their intros', () => {
    for (const c of [NV2, SV2]) {
      expect(isHumanVoiceCourse(c.course_code)).toBe(true)
      for (const role of ['target1', 'target2']) {
        expect(isHumanVoiceSlotBlocked({ courseCode: c.course_code, role, language: 'cym' })).toBe(true)
        expect(() => selectProvider({ courseCode: c.course_code, role, language: 'cym', voiceId: BARE_CLONE, explicitProvider: 'cartesia' })).toThrow(/Human-voice/)
      }
      expect(isHumanVoiceSlotBlocked({ courseCode: c.course_code, role: 'presentation', language: 'eng' })).toBe(true)
      expect(resolveVoice({ course: c, role: 'presentation' }, null).voiceId).not.toBe(ARAN_ENGLISH_CLONE)
    }
  })
  it('a known-role call that names Welsh, or names nothing, is not the stand-in slot', () => {
    expect(isHumanVoiceSlotBlocked({ courseCode: 'cym_nv2_for_eng', role: 'known', language: 'cym' })).toBe(true)
    expect(isHumanVoiceSlotBlocked({ courseCode: 'cym_nv2_for_eng', role: 'known', language: 'cy' })).toBe(true)
    expect(isHumanVoiceSlotBlocked({ courseCode: 'cym_nv2_for_eng', role: 'known', language: null })).toBe(true)
  })
  it('the live courses cym_n_for_eng / cym_s_for_eng: no clone, every slot blocked, the Tom-clone refusal unchanged', () => {
    for (const c of LIVE) {
      for (const role of ['known', 'target1', 'target2', 'presentation']) {
        expect(isHumanVoiceSlotBlocked({ courseCode: c.course_code, role, language: role === 'known' ? 'eng' : 'cym' })).toBe(true)
      }
      expect(resolveVoice({ course: c, role: 'known' }, null)).toMatchObject({ status: 'refuse', rule: 'welsh-no-tom-clone' })
      expect(checkRender({ text: 'I want to speak', language: 'eng', voiceId: ARAN_ENGLISH_CLONE, course: c, role: 'known' }).allowed).toBe(false)
      expect(() => selectProvider({ courseCode: c.course_code, role: 'known', language: 'eng', voiceId: BARE_CLONE, explicitProvider: 'cartesia' })).toThrow(/Human-voice/)
      expect(isReplaceableStandIn({ courseCode: c.course_code, role: 'known', voiceId: ARAN_ENGLISH_CLONE })).toBe(false)
    }
  })
  it('only the clone: Tom-006 or any other voice on the stand-in slot is refused by the door and the ladder', () => {
    expect(checkRender({ text: 'I want to speak', language: 'eng', voiceId: TOM_006, course: NV2, role: 'known' }).allowed).toBe(false)
    expect(checkRender({ text: 'I want to speak', language: 'eng', voiceId: 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121', course: NV2, role: 'known' }).allowed).toBe(false)
    expect(() => selectProvider({ courseCode: 'cym_nv2_for_eng', role: 'known', language: 'eng', voiceId: '71a7ad14-091c-4e8e-a314-022ece01c121', explicitProvider: 'cartesia' })).toThrow(/Human-voice/)
    expect(isReplaceableStandIn({ courseCode: 'cym_nv2_for_eng', role: 'known', voiceId: TOM_006 })).toBe(false)
  })
  it('other Welsh courses, Breton and Pennsylvania Dutch are untouched', () => {
    for (const code of ['cym_for_yor', 'cym_anthem_for_eng', 'bre_for_fra', 'pdc_for_eng']) {
      expect(isHumanVoiceSlotBlocked({ courseCode: code, role: 'known', language: 'eng' })).toBe(true)
    }
    expect(isHumanVoiceSlotBlocked({ courseCode: 'fra_for_eng', role: 'known', language: 'eng' })).toBe(false) // not a human-voice course at all
  })
})
