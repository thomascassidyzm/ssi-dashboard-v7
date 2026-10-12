/**
 * resolveVoice (services/shared/resolve-voice.cjs): one `describe` per POLICY line, plus the pointer check.
 * A failing case here means the coded voice policy changed — that needs a ruling from Tom, not a test edit.
 */
import { describe, it, expect } from 'vitest'
import rv from './resolve-voice.cjs'
const { resolveVoice, applyResolvedVoices, checkPointer, POLICY, TOM_006, CHARLOTTE, TOM006_INTRO_COURSES, roleOfColumn, canonVoice } = rv

const TOM = 'thomas.cassidy+ssi@gmail.com'
const DRAFT = 'draft casting 2026-09-04 — mechanical fill from the Cartesia catalogue'
const row = (language, gender, rank, voice_id, extra = {}) => ({ language, gender, rank, slot: 'phrase', voice_id, assigned_by: TOM, notes: null, ...extra })
const CAST = {
  roles: [
    row('eng', 'f', 0, CHARLOTTE, { assigned_by: 'kai-ruling-2026-09-23-charlotte-everywhere' }),
    row('eng', 'm', 0, TOM_006, { assigned_by: 'tom-ruling-2026-10-12-tom006-english-male-via-watson' }),
    row('eng', 'f', 0, CHARLOTTE, { slot: 'known', assigned_by: 'kai-deborah-ruling-2026-09-23' }),
    row('fra', 'f', 0, 'cartesia_fra-f0'), row('fra', 'm', 0, 'cartesia_fra-m0'),
    row('fra', 'f', 1, 'cartesia_fra-f1-draft', { notes: DRAFT, assigned_by: 'e2e-pod-recording-test@ssi-test.invalid' }),
    row('spa', 'm', 0, 'cartesia_spa-m0-gone'), row('spa', 'm', 1, 'cartesia_spa-m1'), row('spa', 'f', 0, 'cartesia_spa-f0'),
    row('spa_mx', 'f', 0, 'cartesia_spamx-f0'), row('spa_mx', 'm', 0, 'cartesia_spamx-m0'),
    row('jpn', 'f', 0, 'cartesia_jpn-f0', { notes: DRAFT, assigned_by: 'e2e-pod-recording-test@ssi-test.invalid' }),
    row('jpn', 'm', 0, 'cartesia_jpn-m0', { notes: DRAFT, assigned_by: 'e2e-pod-recording-test@ssi-test.invalid' }),
  ],
  voices: [].concat(
    [CHARLOTTE, TOM_006, 'cartesia_fra-f0', 'cartesia_fra-m0', 'cartesia_fra-f1-draft', 'cartesia_spa-m1', 'cartesia_spa-f0', 'cartesia_spamx-f0', 'cartesia_spamx-m0', 'cartesia_jpn-f0', 'cartesia_jpn-m0']
      .map((voice_id) => ({ voice_id, is_active: true })),
    [{ voice_id: 'cartesia_spa-m0-gone', is_active: false }],
  ),
}
const C = {
  fra_for_eng: { course_code: 'fra_for_eng', known_lang: 'eng', target_lang: 'fra' },
  spa_for_eng: { course_code: 'spa_for_eng', known_lang: 'eng', target_lang: 'spa' },
  spa_mx_for_eng: { course_code: 'spa_mx_for_eng', known_lang: 'eng', target_lang: 'spa', voice_pool_key: 'spa_mx' },
  jpn_for_eng: { course_code: 'jpn_for_eng', known_lang: 'eng', target_lang: 'jpn' },
  hin_for_eng: { course_code: 'hin_for_eng', known_lang: 'eng', target_lang: 'hin' },
  deu_at_for_eng: { course_code: 'deu_at_for_eng', known_lang: 'eng', target_lang: 'deu', voice_pool_key: 'deu_at' },
  eng_for_hin: { course_code: 'eng_for_hin', known_lang: 'hin', target_lang: 'eng' },
  eng_for_spa: { course_code: 'eng_for_spa', known_lang: 'spa', target_lang: 'eng' },
  fra_for_jpn: { course_code: 'fra_for_jpn', known_lang: 'jpn', target_lang: 'fra' },
}
const R = (course, role, extra = {}) => resolveVoice({ course: C[course], role, ...extra }, CAST)

describe('english-known: English as the KNOWN language is Tom-006, any course, any gender', () => {
  it('every English-known course, both genders, with or without a cast loaded', () => {
    for (const c of ['fra_for_eng', 'spa_mx_for_eng', 'jpn_for_eng', 'hin_for_eng', 'deu_at_for_eng']) {
      for (const gender of ['f', 'm', null]) expect(R(c, 'known', { gender })).toMatchObject({ status: 'voice', voiceId: TOM_006, rule: 'english-known' })
      expect(resolveVoice({ course: C[c], role: 'known' }, null)).toMatchObject({ voiceId: TOM_006 })
    }
  })
  it("the Voice Lab's eng/known Charlotte row does not override it (the coded policy wins for the known side)", () => {
    expect(R('fra_for_eng', 'known', { gender: 'f' }).voiceId).not.toBe(CHARLOTTE)
  })
})

describe('english-target: English as the TARGET (eng_for_X) is the English cast at the slot gender', () => {
  it('target1 is Charlotte, target2 is Tom-006', () => {
    expect(R('eng_for_hin', 'target1')).toMatchObject({ status: 'voice', voiceId: CHARLOTTE, rule: 'english-target', gender: 'f' })
    expect(R('eng_for_hin', 'target2')).toMatchObject({ status: 'voice', voiceId: TOM_006, rule: 'english-target', gender: 'm' })
    expect(R('eng_for_spa', 'target1').voiceId).toBe(CHARLOTTE)
  })
  it('an explicit slot gender overrides the slot default', () => {
    expect(R('eng_for_hin', 'target1', { gender: 'm' }).voiceId).toBe(TOM_006)
  })
})

describe('target-cast: any other target language is Tom\'s Voice Lab cast for its variety', () => {
  it('rank 0 at the slot gender', () => {
    expect(R('fra_for_eng', 'target1')).toMatchObject({ status: 'voice', voiceId: 'cartesia_fra-f0', rule: 'target-cast', rank: 0 })
    expect(R('fra_for_eng', 'target2')).toMatchObject({ voiceId: 'cartesia_fra-m0' })
    expect(R('fra_for_jpn', 'target1').voiceId).toBe('cartesia_fra-f0')   // casting is by language, never by course
  })
  it('rank 1 only when the rank-0 voice is inactive or gone', () => {
    expect(R('spa_for_eng', 'target2')).toMatchObject({ voiceId: 'cartesia_spa-m1', rank: 1 })
    expect(R('spa_for_eng', 'target1')).toMatchObject({ voiceId: 'cartesia_spa-f0', rank: 0 })
  })
  it('a variety is its own language: spa_mx reads spa_mx rows, never spa', () => {
    expect(R('spa_mx_for_eng', 'target1').voiceId).toBe('cartesia_spamx-f0')
    expect(R('spa_mx_for_eng', 'target2').voiceId).toBe('cartesia_spamx-m0')
  })
  it('a draft row is never a fallback for a Tom row', () => {
    const noF0 = { roles: CAST.roles.filter((r) => r.voice_id !== 'cartesia_fra-f0'), voices: CAST.voices }
    expect(resolveVoice({ course: C.fra_for_eng, role: 'target1' }, noF0)).toMatchObject({ status: 'refuse', reason: 'draft-cast' })
  })
})

describe('target-uncast: a target with no cast Tom chose refuses — never a guess', () => {
  it('draft-only (the 2026-09-04 fill) refuses as draft-cast', () => {
    expect(R('jpn_for_eng', 'target1')).toMatchObject({ status: 'refuse', reason: 'draft-cast', rule: 'target-uncast' })
  })
  it('no rows at all refuses as uncast; a base cast never covers a variety', () => {
    expect(R('hin_for_eng', 'target1')).toMatchObject({ status: 'refuse', reason: 'uncast' })
    expect(R('deu_at_for_eng', 'target2')).toMatchObject({ status: 'refuse', reason: 'uncast' })
  })
  it('without the cast loaded a target slot has no answer rather than a guess', () => {
    expect(resolveVoice({ course: C.fra_for_eng, role: 'target1' }, null)).toMatchObject({ status: 'no-ruling' })
  })
})

describe('intros: presentation follows the Tom-006 intro ruling where Tom gave it, Charlotte elsewhere', () => {
  it('the Tom-006 intro courses (job #794 list) resolve to Tom-006', () => {
    expect(TOM006_INTRO_COURSES).toEqual(expect.arrayContaining(['fra_for_eng', 'spa_for_eng', 'ita_for_eng', 'deu_for_eng', 'spa_mx_for_eng', 'jpn_for_eng']))
    expect(R('fra_for_eng', 'presentation')).toMatchObject({ status: 'voice', voiceId: TOM_006, rule: 'intro-tom006' })
    expect(R('jpn_for_eng', 'presentation').voiceId).toBe(TOM_006)
  })
  it('any other English-known course resolves to Charlotte', () => {
    expect(R('hin_for_eng', 'presentation')).toMatchObject({ status: 'voice', voiceId: CHARLOTTE, rule: 'intro-charlotte' })
    expect(R('deu_at_for_eng', 'presentation').voiceId).toBe(CHARLOTTE)
  })
})

describe('no-ruling: what the policy does not cover is answered "no ruling", never guessed', () => {
  it('a non-English known side and its intros', () => {
    expect(R('eng_for_hin', 'known')).toMatchObject({ status: 'no-ruling' })
    expect(R('eng_for_hin', 'presentation')).toMatchObject({ status: 'no-ruling' })
  })
  it('a line in a language its role does not speak, and roles that are not slots', () => {
    expect(R('fra_for_eng', 'target1', { language: 'eng' })).toMatchObject({ status: 'no-ruling' })
    expect(R('fra_for_eng', 'instruction')).toMatchObject({ status: 'no-ruling' })
    expect(resolveVoice({ role: 'known' }, CAST)).toMatchObject({ status: 'no-ruling' })
  })
  it('every rule the function can answer is a line in POLICY, with a ruling named', () => {
    const rules = new Set(POLICY.map((p) => p.rule))
    for (const c of Object.keys(C)) for (const role of ['known', 'target1', 'target2', 'presentation']) expect(rules.has(R(c, role).rule)).toBe(true)
    for (const p of POLICY) expect(p.ruling.length).toBeGreaterThan(5)
  })
  it('never resolves to an xAI voice, even when one is cast', () => {
    const xai = { roles: [row('fra', 'f', 0, 'xai_eve')], voices: [{ voice_id: 'xai_eve', is_active: true }] }
    expect(resolveVoice({ course: C.fra_for_eng, role: 'target1' }, xai).status).toBe('refuse')
  })
})

describe('checkPointer: a slot may point only at a clip in the resolved voice', () => {
  it('agrees, disagrees, and refuses', () => {
    expect(checkPointer({ course: C.fra_for_eng, role: 'known', clip: { voice_id: TOM_006, language: 'eng' } }, CAST).ok).toBe(true)
    expect(checkPointer({ course: C.fra_for_eng, role: 'known', clip: { voice_id: 'd293d509-eb96-4df4-8cfd-80a693aa49a9', language: 'eng' } }, CAST).ok).toBe(true)   // bare uuid = same voice
    expect(checkPointer({ course: C.fra_for_eng, role: 'known', clip: { voice_id: CHARLOTTE, language: 'eng' } }, CAST)).toMatchObject({ ok: false, reason: 'disagrees' })
    expect(checkPointer({ course: C.eng_for_hin, role: 'target1', clip: { voice_id: CHARLOTTE, language: 'eng' } }, CAST).ok).toBe(true)
    expect(checkPointer({ course: C.eng_for_hin, role: 'target2', clip: { voice_id: CHARLOTTE, language: 'eng' } }, CAST).ok).toBe(false)
    expect(checkPointer({ course: C.jpn_for_eng, role: 'target1', clip: { voice_id: 'azure_ja-JP-MayuNeural', language: 'jpn' } }, CAST)).toMatchObject({ ok: false, reason: 'draft-cast' })
    expect(checkPointer({ course: C.eng_for_hin, role: 'known', clip: { voice_id: 'anything', language: 'hin' } }, CAST).ok).toBe(true)   // no ruling: not governed
  })
  it('maps pointer columns to slot roles', () => {
    expect(roleOfColumn('known_audio_id')).toBe('known')
    expect(roleOfColumn('presentation_audio_id')).toBe('presentation')
    expect(roleOfColumn('audio_id')).toBe(null)
    expect(canonVoice('D293D509-EB96-4DF4-8CFD-80A693AA49A9')).toBe(TOM_006)
  })
})

describe('applyResolvedVoices: the course voice config phase8 renders and links from carries resolveVoice', () => {
  it('overrides a stored Charlotte known and a stale target, keeps what already agrees, never touches a human-recorded role', () => {
    const stored = { voices: {
      known: { voiceId: '71a7ad14-091c-4e8e-a314-022ece01c121', provider: 'cartesia', settings: { speed: 0.9 } },
      target1: { voiceId: 'cartesia_fra-f0', provider: 'cartesia' },
      target2: { voiceId: 'azure_fr-FR-HenriNeural', provider: 'azure' },
      presentation: { voiceId: 'human_take', provider: 'human' } } }
    const { config, decisions } = applyResolvedVoices({ voiceConfig: stored, course: C.fra_for_eng, cast: CAST, humanRoles: new Set(['presentation']) })
    expect(config.voices.known).toMatchObject({ voiceId: TOM_006, provider: 'cartesia', resolvedBy: 'english-known', settings: { speed: 1.0 } })
    expect(config.voices.target1).toBe(stored.voices.target1)
    expect(config.voices.target2).toMatchObject({ voiceId: 'cartesia_fra-m0' })
    expect(config.voices.presentation).toBe(stored.voices.presentation)
    expect(decisions.map((d) => d.role).sort()).toEqual(['known', 'target2'])
  })
  it('returns the same object when everything already agrees', () => {
    const ok = { voices: { known: { voiceId: TOM_006 }, target1: { voiceId: 'cartesia_fra-f0' }, target2: { voiceId: 'cartesia_fra-m0' }, presentation: { voiceId: TOM_006 } } }
    expect(applyResolvedVoices({ voiceConfig: ok, course: C.fra_for_eng, cast: CAST }).config).toBe(ok)
  })
  it('a human recording is never outranked at the pointer either', () => {
    expect(checkPointer({ course: C.fra_for_eng, role: 'known', clip: { voice_id: 'human_aran', language: 'eng', origin: 'human' } }, CAST)).toMatchObject({ ok: true, human: true })
  })
})
