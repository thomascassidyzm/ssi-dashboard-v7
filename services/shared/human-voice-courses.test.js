// Unit tests for the human-voice-only course exclusion (Tom's ruling 2026-07-25:
// Welsh cym_* courses are human-recorded — no TTS ever).
// Run: npx vitest run services/shared/human-voice-courses.test.js
import { describe, it, expect } from 'vitest'
import {
  HUMAN_VOICE_COURSES,
  isHumanVoiceCourse,
  isHumanVoiceLang,
  renderableLangSql,
  assertNoHumanVoiceInQueue,
} from './human-voice-courses.cjs'
import ttsService from '../tts-service.cjs'

describe('isHumanVoiceCourse', () => {
  it('flags the two named Welsh courses', () => {
    expect(isHumanVoiceCourse('cym_n_for_eng')).toBe(true)
    expect(isHumanVoiceCourse('cym_s_for_eng')).toBe(true)
    expect(HUMAN_VOICE_COURSES.has('cym_n_for_eng')).toBe(true)
    expect(HUMAN_VOICE_COURSES.has('cym_s_for_eng')).toBe(true)
  })

  it('flags bre_for_fra (Breton, 2026-07-27 ruling)', () => {
    expect(isHumanVoiceCourse('bre_for_fra')).toBe(true)
    expect(HUMAN_VOICE_COURSES.has('bre_for_fra')).toBe(true)
  })

  // Tom 2026-08-14, taken with admitting pdc to clip identity: pdc can now be
  // written as a clip language and can never be synthesised.
  it('covers Pennsylvania Dutch', () => {
    expect(isHumanVoiceCourse('pdc_for_eng')).toBe(true)
    expect(HUMAN_VOICE_COURSES.has('pdc_for_eng')).toBe(true)
    expect(isHumanVoiceCourse('pdc_for_deu')).toBe(true)  // prefix rule, future courses
    expect(isHumanVoiceCourse('eng_for_pdc')).toBe(false) // pdc as KNOWN, not target
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

// Tom's ruling 2026-08-13: Welsh is permanently excluded from every render queue.
// The 2026-08-13 recount was LANGUAGE-keyed, so the course-code rule above could
// not see it — these cover the language-keyed half.
describe('isHumanVoiceLang', () => {
  it('flags every Welsh target-language code the estate stores', () => {
    expect(isHumanVoiceLang('cym')).toBe(true)
    expect(isHumanVoiceLang('cym_n')).toBe(true)
    expect(isHumanVoiceLang('cym_s')).toBe(true)
  })

  it('flags Breton (2026-07-27 ruling)', () => {
    expect(isHumanVoiceLang('bre')).toBe(true)
  })

  it('is true for Pennsylvania Dutch', () => {
    expect(isHumanVoiceLang('pdc')).toBe(true)
  })

  it('does not flag renderable languages, including near-misses', () => {
    expect(isHumanVoiceLang('spa')).toBe(false)
    expect(isHumanVoiceLang('eng')).toBe(false)
    expect(isHumanVoiceLang('cymric')).toBe(false) // prefix rule must not over-match
    expect(isHumanVoiceLang('pdcx')).toBe(false)
  })

  it('is null-safe', () => {
    expect(isHumanVoiceLang(null)).toBe(false)
    expect(isHumanVoiceLang(undefined)).toBe(false)
    expect(isHumanVoiceLang('')).toBe(false)
  })
})

describe('renderableLangSql', () => {
  it('excludes every human-voice language and covers future cym_* codes', () => {
    const sql = renderableLangSql('c.target_lang')
    for (const lang of ['cym', 'cym_n', 'cym_s', 'bre', 'pdc']) expect(sql).toContain(`'${lang}'`)
    expect(sql).toContain("!~ '^cym(_|$)'")
    expect(sql).toContain("!~ '^pdc(_|$)'")
    expect(sql).toContain('c.target_lang')
  })
})

describe('assertNoHumanVoiceInQueue (the gate on a finished queue)', () => {
  it('passes a clean queue', () => {
    expect(() => assertNoHumanVoiceInQueue(
      [{ lang: 'spa' }, { lang: 'jpn' }],
      { context: 'test', lang: r => r.lang }
    )).not.toThrow()
  })

  it('throws on a Welsh language row — the 2026-08-13 regression', () => {
    expect(() => assertNoHumanVoiceInQueue(
      [{ lang: 'spa' }, { lang: 'cym' }],
      { context: 'recount', lang: r => r.lang }
    )).toThrow(/Human-voice content in a TTS render queue \(recount\): cym/)
  })

  it('throws on a Welsh course row', () => {
    expect(() => assertNoHumanVoiceInQueue(
      [{ course_code: 'cym_s_for_eng' }],
      { context: 'render plan', course: r => r.course_code }
    )).toThrow(/cym_s_for_eng/)
  })

  it('names the recording worklist so the error teaches the policy', () => {
    let err
    try {
      assertNoHumanVoiceInQueue([{ lang: 'cym_n' }], { context: 'x', lang: r => r.lang })
    } catch (e) { err = e }
    expect(err.message).toMatch(/recording worklist/)
    expect(err.message).toMatch(/no runtime override/)
  })

  it('throws on a Pennsylvania Dutch language or course row', () => {
    expect(() => assertNoHumanVoiceInQueue(
      [{ lang: 'spa' }, { lang: 'pdc' }],
      { context: 'recount', lang: r => r.lang }
    )).toThrow(/pdc/)
    expect(() => assertNoHumanVoiceInQueue(
      [{ course_code: 'pdc_for_eng' }],
      { context: 'render plan', course: r => r.course_code }
    )).toThrow(/pdc_for_eng/)
  })

  it('tolerates an empty or absent queue', () => {
    expect(() => assertNoHumanVoiceInQueue([], { context: 'x', lang: r => r.lang })).not.toThrow()
    expect(() => assertNoHumanVoiceInQueue(null, { context: 'x', lang: r => r.lang })).not.toThrow()
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
