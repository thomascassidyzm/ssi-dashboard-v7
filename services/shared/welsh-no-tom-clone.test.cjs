/**
 * HARD RULE (Tom 2026-10-13): no Tom clone in any Welsh course. Each case failed on the code before welsh-no-tom-clone.cjs:
 * English-known resolved to Tom-006 "in ANY course", and the render door / pointer check let that through.
 */
import { describe, it, expect } from 'vitest'
import rv from './resolve-voice.cjs'
import policy from './voicing-policy.cjs'
import guard from './welsh-no-tom-clone.cjs'
const { resolveVoice, checkPointer, TOM_006, CHARLOTTE } = rv
const { checkRender, assertRenderAllowed } = policy
const { isTomCloneVoice, isWelshCourse, TOM_CLONE_VOICES } = guard

const WELSH = [
  { course_code: 'cym_n_for_eng', known_lang: 'eng', target_lang: 'cym' },
  { course_code: 'cym_s_for_eng', known_lang: 'eng', target_lang: 'cym' },
  { course_code: 'cym_nv2_for_eng', known_lang: 'eng', target_lang: 'cym' },
  { course_code: 'cym_sv2_for_eng', known_lang: 'eng', target_lang: 'cym' },
  { course_code: 'cym_for_yor', known_lang: 'yor', target_lang: 'cym' },
]
const TOM_VOICES = ['cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2', TOM_006, 'gfzdpspr5fdp', 'xai_gfzdpspr5fdp']

describe('who counts', () => {
  it('Welsh = cym in the code or either language; nothing else', () => {
    for (const c of WELSH) expect(isWelshCourse(c)).toBe(true)
    expect(isWelshCourse('cym_anthem_for_jpn')).toBe(true)
    expect(isWelshCourse('eng_for_cym')).toBe(true)
    expect(isWelshCourse({ course_code: 'x', target_lang: 'cym' })).toBe(true)
    for (const c of ['fra_for_eng', 'gle_for_eng', 'cor_for_eng', 'cyma_for_eng']) expect(isWelshCourse(c)).toBe(false)
  })
  it('every Tom clone is recognised under any provider prefix; Charlotte is not one', () => {
    for (const v of TOM_CLONE_VOICES) { expect(isTomCloneVoice(v)).toBe(true); expect(isTomCloneVoice(`cartesia_${v}`)).toBe(true) }
    expect(isTomCloneVoice(CHARLOTTE)).toBe(false)
  })
})

describe('resolveVoice never answers a Tom clone for a Welsh course', () => {
  it('English known side: refused (was Tom-006)', () => {
    for (const c of WELSH.filter(c => c.known_lang === 'eng')) {
      expect(resolveVoice({ course: c, role: 'known' }, null)).toMatchObject({ status: 'refuse', reason: 'tom-clone-welsh', rule: 'welsh-no-tom-clone' })
    }
  })
  it('the same rule still answers Tom-006 for a non-Welsh course', () => {
    expect(resolveVoice({ course: { course_code: 'fra_for_eng', known_lang: 'eng', target_lang: 'fra' }, role: 'known' }, null)).toMatchObject({ status: 'voice', voiceId: TOM_006 })
  })
})

describe('the pointer check refuses a Tom-clone clip in any Welsh slot', () => {
  it('every Tom clone, every Welsh course, every role', () => {
    for (const c of WELSH) for (const role of ['known', 'target1', 'target2', 'presentation']) for (const v of TOM_VOICES) {
      expect(checkPointer({ course: c, role, clip: { voice_id: v, language: 'eng', origin: 'tts' } }, null)).toMatchObject({ ok: false, reason: 'tom-clone-welsh' })
    }
  })
  it('a human recording is untouched (legacy_import Welsh English prompts)', () => {
    expect(checkPointer({ course: WELSH[0], role: 'known', clip: { voice_id: 'legacy_import', language: 'eng', origin: 'human' } }, null)).toMatchObject({ ok: true })
  })
})

describe('the render door refuses a Tom clone for a Welsh course', () => {
  it('checkRender, by course row', () => {
    for (const c of WELSH) for (const v of TOM_VOICES) {
      const r = checkRender({ text: 'I want', language: 'eng', voiceId: v, course: c })
      expect(r.allowed).toBe(false)
      expect(r.reason).toBe(/^xai_/.test(v) ? 'xai-banned' : 'tom-clone-welsh')   // an xai_-prefixed spelling is refused by the older xAI ban first
    }
  })
  it('assertRenderAllowed, by course code alone (no course row needed)', async () => {
    await expect(assertRenderAllowed({ text: 'I want', language: 'eng', voiceId: TOM_006, courseCode: 'cym_s_for_eng', role: 'known' })).rejects.toMatchObject({ code: 'VOICING_POLICY', reason: 'tom-clone-welsh' })
    await expect(assertRenderAllowed({ text: 'x', language: 'eng', voiceId: 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2', courseCode: 'cym_nv2_for_eng', intro: true })).rejects.toMatchObject({ reason: 'tom-clone-welsh' })
  })
  it('an audition (writes no course clip) is not a Welsh render', () => {
    expect(checkRender({ text: 'x', language: 'eng', voiceId: TOM_006, course: WELSH[0], audition: true }).allowed).toBe(true)
  })
})
