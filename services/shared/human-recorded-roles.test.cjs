/**
 * THE HUMAN-VOICE CASTING GUARD (Tom's ruling, 2026-08-31).
 *
 * Two invariants, and both are the point:
 *   1. A human-recorded (course, role) is NEVER cast over, by any of the three
 *      signals, with or without a database.
 *   2. A purely synthetic course is UNTOUCHED — the guard is additive safety,
 *      not a redesign, so every existing cast behaviour survives byte for byte.
 *
 * Welsh is the worked case throughout because it is the case Tom named.
 */
import { describe, it, expect } from 'vitest'
import guard from './human-recorded-roles.cjs'
import cast from './language-voice-cast.cjs'
const { humanRolesForCourse, humanRecordedForLanguage, PHRASE_ROLES } = guard
const { applyLanguageCast, CAST_ROLES, languageForRole } = cast

// A Cartesia voice a cast could put anywhere.
const CARTESIA = {
  voice_id: 'cartesia_abc', gender: 'f', tts_engine: 'cartesia',
  is_active: true, display_name: 'Nia', languages: ['cym', 'eng'],
}
const castRow = (language, gender = 'f', rank = 0, slot = 'phrase') =>
  ({ language, gender, rank, slot, voice_id: 'cartesia_abc' })

const WELSH = { course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng' }
const SPANISH = { course_code: 'spa_for_eng', target_lang: 'spa', known_lang: 'eng' }
const AUSTRIAN = { course_code: 'deu_at_for_eng', target_lang: 'deu', known_lang: 'eng' }

const AUSTRIAN_CONFIG = {
  voices: {
    target1: { voiceId: 'azure_de_at_jonas', provider: 'azure' },
    target2: { voiceId: 'human_sasha_wanasky_deu_at', provider: 'human' },
  },
}

describe('humanRolesForCourse — the three signals', () => {
  it('protects every TARGET-SIDE role of a human-voiced course, with no database at all', () => {
    const human = humanRolesForCourse({ course: WELSH, roles: CAST_ROLES })
    expect(human.get('target1').source).toBe('policy-course')
    expect(human.get('target2').source).toBe('policy-course')
  })

  it('leaves the KNOWN side of a human-voiced course to the data signals — English is per language (Tom, 2026-09-13)', () => {
    // The policy is about Welsh. With no stored human slot and no recorded
    // clips, cym_n's English known role is castable like any other course's…
    const bare = humanRolesForCourse({ course: WELSH, roles: CAST_ROLES })
    expect(bare.has('known')).toBe(false)
    expect(bare.has('instruction')).toBe(false)
    // …and with Aran's thousands of English recordings in the view it is still
    // refused — by the recording, which is the honest reason.
    const recorded = humanRolesForCourse({
      course: WELSH, roles: CAST_ROLES,
      humanRows: [{ course_code: 'cym_n_for_eng', role: 'known', clips: 6337, a_voice_id: 'human_aran_cym_n' }],
    })
    expect(recorded.get('known').source).toBe('recorded-clips')
  })

  it('protects the target roles of a human-voiced LANGUAGE on a course not named in the list', () => {
    // A hypothetical new Welsh course under a code the explicit set does not
    // carry: the prefix rule catches it, and so does the language rule.
    const future = { course_code: 'cym_mid_for_fra', target_lang: 'cym', known_lang: 'fra' }
    const human = humanRolesForCourse({ course: future, roles: CAST_ROLES })
    expect(human.has('target1')).toBe(true)
    expect(human.has('target2')).toBe(true)
  })

  it("honours the stored config's own human marker — the splicer's test", () => {
    const human = humanRolesForCourse({
      course: AUSTRIAN, voiceConfig: AUSTRIAN_CONFIG, roles: CAST_ROLES,
    })
    expect([...human.keys()]).toEqual(['target2'])
    expect(human.get('target2').source).toBe('stored-human-slot')
    expect(human.get('target2').voiceId).toBe('human_sasha_wanasky_deu_at')
  })

  it('protects a phrase role that only the measured clips know about', () => {
    const human = humanRolesForCourse({
      course: { course_code: 'fin_for_eng', target_lang: 'fin', known_lang: 'eng' },
      humanRows: [{ course_code: 'fin_for_eng', role: 'target1', clips: 44, a_voice_id: 'human_kai_fin' }],
      roles: CAST_ROLES,
    })
    expect(human.get('target1').source).toBe('recorded-clips')
    expect(human.get('target1').clips).toBe(44)
  })

  it('does NOT let stock guide clips protect the guide slot', () => {
    // 16 courses hold ~48 stock English instruction clips each. Letting those
    // block the guide cast would delete the feature the guard is guarding.
    const human = humanRolesForCourse({
      course: SPANISH,
      humanRows: [
        { course_code: 'spa_for_eng', role: 'instruction', clips: 48, a_voice_id: 'human_recording' },
        { course_code: 'spa_for_eng', role: 'encouragement', clips: 26, a_voice_id: 'human_recording' },
      ],
      roles: CAST_ROLES,
    })
    expect(human.size).toBe(0)
    expect(PHRASE_ROLES).not.toContain('instruction')
  })

  it('says nothing at all about a purely synthetic course', () => {
    expect(humanRolesForCourse({ course: SPANISH, roles: CAST_ROLES }).size).toBe(0)
  })
})

describe('the role→language twin', () => {
  it('agrees with language-voice-cast.languageForRole on every cast role', () => {
    // The guard keeps its own copy because the dependency runs the other way.
    // If these two ever disagree, the guard protects the wrong slot.
    const c = { course_code: 'eng_for_cym', known_lang: 'cym', target_lang: 'eng' }
    for (const role of CAST_ROLES) {
      const guarded = humanRolesForCourse({ course: c, roles: [role] })
      const speaks = languageForRole(role, c)
      // Every role that speaks Welsh is protected; no other role is.
      expect(guarded.has(role)).toBe(speaks === 'cym')
    }
  })
})

describe('applyLanguageCast — the guard on the render path', () => {
  it('refuses the Welsh KNOWN side of a course taught FROM Welsh', () => {
    // eng_for_cym teaches English; its target_lang is not human-voiced and its
    // course code is on no list. Only the role's SPOKEN language catches it.
    const course = { course_code: 'eng_for_cym', known_lang: 'cym', target_lang: 'eng' }
    const { config, decisions } = applyLanguageCast({
      voiceConfig: { voices: { known: { voiceId: 'azure_cy_gb_nia', provider: 'azure' } } },
      course, roles: [castRow('cym')], voices: [CARTESIA],
    })
    expect(decisions.find((d) => d.role === 'known').source).toBe('human-recorded')
    expect(decisions.find((d) => d.role === 'known').humanSource).toBe('policy-language')
    expect(config.voices.known.voiceId).toBe('azure_cy_gb_nia')
  })

  it('refuses to cast a Cartesia voice over a Welsh target role, and says why', () => {
    const cfg = { voices: { target1: { voiceId: 'legacy_import', provider: 'human' } } }
    const { config, decisions } = applyLanguageCast({
      voiceConfig: cfg, course: WELSH, roles: [castRow('cym')], voices: [CARTESIA],
    })
    // Reference equality: nothing about this course's resolution changed.
    expect(config).toBe(cfg)
    const t1 = decisions.find((d) => d.role === 'target1')
    expect(t1.source).toBe('human-recorded')
    expect(t1.reason).toMatch(/human-recorded only/)
    expect(decisions.some((d) => d.source === 'language-cast')).toBe(false)
  })

  it("refuses the Welsh courses' KNOWN role where Aran's English recordings exist, and casts it where none do", () => {
    // cym_n_for_eng's English prompts ARE Aran's recordings — the view says so,
    // and that is what refuses the cast. The course code alone no longer does:
    // English is per language (Tom, 2026-09-13), so a Welsh course with no
    // English recordings takes the English cast like every other course.
    const humanRows = [{ course_code: 'cym_n_for_eng', role: 'known', clips: 6337, a_voice_id: 'human_aran_cym_n' }]
    const recorded = applyLanguageCast({
      voiceConfig: { voices: { known: { voiceId: 'azure_en_gb_libby', provider: 'azure' } } },
      course: WELSH, roles: [castRow('eng')], voices: [CARTESIA], humanRows,
    })
    expect(recorded.decisions.find((d) => d.role === 'known').source).toBe('human-recorded')
    expect(recorded.config.voices.known.voiceId).toBe('azure_en_gb_libby')

    const unrecorded = applyLanguageCast({
      voiceConfig: { voices: { known: { voiceId: 'azure_en_gb_libby', provider: 'azure' } } },
      course: WELSH, roles: [castRow('eng')], voices: [CARTESIA],
    })
    expect(unrecorded.decisions.find((d) => d.role === 'known').source).toBe('language-cast')
    expect(unrecorded.config.voices.known.voiceId).toBe('cartesia_abc')
  })

  it('casts the synthetic role and refuses the human one on the SAME course', () => {
    const { config, decisions } = applyLanguageCast({
      voiceConfig: AUSTRIAN_CONFIG, course: AUSTRIAN,
      roles: [castRow('deu', 'f', 0), castRow('deu', 'm', 0)],
      voices: [CARTESIA, { ...CARTESIA, gender: 'm', languages: ['deu'] }],
    })
    expect(decisions.find((d) => d.role === 'target2').source).toBe('human-recorded')
    expect(config.voices.target2.voiceId).toBe('human_sasha_wanasky_deu_at')
  })

  it('leaves a purely synthetic course exactly as it was before the guard existed', () => {
    const { config, decisions } = applyLanguageCast({
      voiceConfig: { voices: { target1: { voiceId: 'azure_es_elvira', provider: 'azure' } } },
      course: SPANISH, roles: [castRow('spa')], voices: [{ ...CARTESIA, languages: ['spa'] }],
    })
    expect(config.voices.target1.voiceId).toBe('cartesia_abc')
    expect(decisions.find((d) => d.role === 'target1').source).toBe('language-cast')
  })
})

describe('humanRecordedForLanguage — what the screen says before the tap', () => {
  const COURSES = [
    { ...WELSH, voice_config: {} },
    { course_code: 'cym_s_for_eng', target_lang: 'cym', known_lang: 'eng', voice_config: {} },
    { ...SPANISH, voice_config: {} },
    { ...AUSTRIAN, voice_config: AUSTRIAN_CONFIG },
  ]

  it('names every Welsh course a phrase cast on cym would reach', () => {
    const out = humanRecordedForLanguage({ language: 'cym', slot: 'phrase', courses: COURSES })
    expect(out.courses.map((c) => c.course).sort()).toEqual(['cym_n_for_eng', 'cym_s_for_eng'])
    expect(out.roles).toContain('target1')
  })

  it('names the Welsh courses on a cast against ENGLISH only where their English is recorded, and leaves Spanish out of it', () => {
    const humanRows = [
      { course_code: 'cym_n_for_eng', role: 'known', clips: 6337, a_voice_id: 'human_aran_cym_n' },
      { course_code: 'cym_s_for_eng', role: 'known', clips: 6601, a_voice_id: 'legacy_import' },
    ]
    const out = humanRecordedForLanguage({ language: 'eng', slot: 'phrase', courses: COURSES, humanRows })
    expect(out.courses.map((c) => c.course).sort()).toEqual(['cym_n_for_eng', 'cym_s_for_eng'])
    expect(out.courses.every((c) => c.roles.includes('known'))).toBe(true)
    expect(out.courses.map((c) => c.course)).not.toContain('spa_for_eng')
    // Without the recordings the course code alone names nobody: English is
    // not a human-voiced language (Tom, 2026-09-13).
    const bare = humanRecordedForLanguage({ language: 'eng', slot: 'phrase', courses: COURSES })
    expect(bare.courses.map((c) => c.course)).not.toContain('cym_n_for_eng')
  })

  it('names deu_at_for_eng on a German cast, from the stored config alone', () => {
    const out = humanRecordedForLanguage({ language: 'deu', slot: 'phrase', courses: COURSES })
    expect(out.courses).toEqual([expect.objectContaining({ course: 'deu_at_for_eng', roles: ['target2'] })])
  })

  it('says nothing for a language with no human recordings anywhere', () => {
    expect(humanRecordedForLanguage({ language: 'spa', slot: 'phrase', courses: COURSES }).total).toBe(0)
  })
})
