/**
 * The cast gate (services/shared/voice-cast-gate.cjs).
 *
 * Tom 2026-10-10 (r-2026-10-10-new-phrase-audio-may-render-only): new-phrase audio renders ONLY for
 * (a) a language Tom has cast in Cartesia, in his cast voices, or (b) a course whose existing voices in the
 * language are all Azure, in those same voices. Draft-cast, uncast and mixed render nothing; xAI never.
 * phase8 /generate plans with partitionByCast + limitCastFirst, so a refused line is logged once, never
 * counted as planned spend, and never starves the renderable lines behind it (#689).
 */
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import gate from './voice-cast-gate.cjs'
const { partitionByCast, limitCastFirst, castVerdict, isTomCastRow, useCastRows, useCourseCastRow, useCourseVoiceHolder, useCourseVoiceCensus } = gate

const TOM_ACCT = 'thomas.cassidy+ssi@gmail.com'
const CHARLOTTE = 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121'
const DRAFT = 'draft casting 2026-09-04 — mechanical fill from the Cartesia catalogue in vendor order, no taste applied'
const tom = (language, voice_id) => ({ language, voice_id, assigned_by: TOM_ACCT, notes: null })
const draft = (language, voice_id) => ({ language, voice_id, assigned_by: 'e2e-pod-recording-test@ssi-test.invalid', notes: DRAFT })

// The courses' cast-key columns (#724): the gate resolves the key from these via cast-language-key.cjs,
// exactly as Voice Lab and the selector do — never from the course-code spelling.
const COURSES = {
  fra_for_eng: { target_lang: 'fra', known_lang: 'eng' },
  fra_ca_for_eng: { target_lang: 'fra', known_lang: 'eng', voice_pool_key: 'fra_ca' },
  spa_mx_for_eng: { target_lang: 'spa', known_lang: 'eng', voice_pool_key: 'spa_mx' },
  eng_for_spa_mx: { target_lang: 'eng', known_lang: 'spa', known_dialect: 'mx' },
  deu_at_for_eng: { target_lang: 'deu', known_lang: 'eng', voice_pool_key: 'deu_at' },
  por_br_for_eng: { target_lang: 'por', known_lang: 'eng', voice_pool_key: 'por_br' },
  gle_for_eng: { target_lang: 'gle', known_lang: 'eng', dialect: 'standard' },
  gle_munster_for_eng: { target_lang: 'gle', known_lang: 'eng', dialect: 'munster' },
}
const plainRow = (code) => { const [t, k] = String(code).split('_for_'); return { target_lang: t, known_lang: k } }
beforeEach(() => useCourseCastRow(async (code) => COURSES[code] || plainRow(code)))
afterEach(() => { useCastRows(null); useCourseCastRow(null); useCourseVoiceHolder(null); useCourseVoiceCensus(null) })

describe('isTomCastRow — Tom\'s casting vs the 2026-09-04 draft', () => {
  it('Tom\'s Voice Lab account, a named ruling, or a "Tom …" note is a cast', () => {
    expect(isTomCastRow(tom('ita', 'cartesia_x'))).toBe(true)
    expect(isTomCastRow({ assigned_by: 'tom-ruling-2026-09-03', notes: 'Tom\'s ruling 2026-09-03: his clone' })).toBe(true)
    expect(isTomCastRow({ assigned_by: 'kai-ruling-2026-09-23-charlotte-everywhere', notes: 'Kai, 2026-09-23' })).toBe(true)
    expect(isTomCastRow({ assigned_by: 'voice-lab-cast-agent@ssi-agent.invalid', notes: 'Tom 2026-09-21: cast Aran\'s clone as the English GUIDE' })).toBe(true)
  })
  it('the draft rows, and a test identity\'s row with no ruling, are not', () => {
    expect(isTomCastRow(draft('por', 'cartesia_y'))).toBe(false)
    expect(isTomCastRow({ ...draft('deu', 'cartesia_y'), assigned_by: TOM_ACCT })).toBe(false)   // a draft note wins
    expect(isTomCastRow({ language: 'ara_eg', voice_id: 'cartesia_z', assigned_by: 'e2e-pod-recording-test@ssi-test.invalid', notes: '' })).toBe(false)
  })
})

describe('castVerdict — leg (a), Tom\'s Cartesia cast', () => {
  const POR_DRAFT = 'cartesia_cb2694c3-715f-4da9-99f3-1c974fff2928'
  const DEU_TOM = 'cartesia_b9de4a89-2257-424b-94c2-db18ba68c81a'
  const DEU_AT_DRAFT = 'cartesia_deu-at-draft'
  const rows = [tom('deu', DEU_TOM), draft('deu_at', DEU_AT_DRAFT), draft('por', POR_DRAFT), draft('por_br', POR_DRAFT)]

  it('the 2026-10-10 por_br_for_eng leak: a draft-only language renders nothing, even in a voice the course already holds', async () => {
    useCastRows(rows); useCourseVoiceHolder(async () => true); useCourseVoiceCensus(async () => [])
    expect(await castVerdict('por', POR_DRAFT, { courseCode: 'por_br_for_eng', role: 'target1' })).toMatchObject({ allowed: false, reason: 'draft-cast' })
  })
  it('Tom\'s German renders for German; a draft dialect voice does not, held or not', async () => {
    useCastRows(rows); useCourseVoiceHolder(async () => true)
    expect(await castVerdict('deu', DEU_TOM, { courseCode: 'deu_for_eng' })).toMatchObject({ allowed: true, via: 'tom-cast' })
    expect(await castVerdict('deu', DEU_AT_DRAFT, { courseCode: 'deu_at_for_eng' })).toMatchObject({ allowed: false, reason: 'draft-cast' })
  })
  it('xAI is banned outright — even where the course is Azure-only otherwise', async () => {
    useCastRows(rows); useCourseVoiceCensus(async () => [{ role: 'target1', language: 'urd', voice_id: 'xai_eve', clips: 3 }])
    expect(await castVerdict('urd', 'xai_eve', { courseCode: 'eng_for_urd' })).toMatchObject({ allowed: false, reason: 'banned-provider' })
  })
  it('an audition is still heard', async () => {
    useCastRows([])
    expect(await castVerdict('sin', 'azure_si-LK-SameeraNeural', { audition: true })).toMatchObject({ allowed: true })
  })
})

describe('castVerdict — Tom\'s cast is per VARIETY (#721: "Not Canadian French!!! I haven\'t set that")', () => {
  const FRA = 'cartesia_ab636c8b-9960-4fb3-bb0c-b7b655fb9745'
  const FRA_CA = 'cartesia_63fdecc2-4e1d-4aa3-a442-27204e3cd3b5'
  const fraOnly = [tom('fra', FRA), draft('fra_ca', 'cartesia_draft-ca')]
  it('fra_ca with only fra Tom-cast rows → refused uncast/draft; plain fra stays allowed', async () => {
    useCastRows(fraOnly); useCourseVoiceCensus(async () => [])
    expect(await castVerdict('fra', FRA, { courseCode: 'fra_ca_for_eng', role: 'target1' })).toMatchObject({ allowed: false, reason: 'draft-cast', castKey: 'fra_ca' })
    useCastRows([tom('fra', FRA)])
    expect(await castVerdict('fra', FRA, { courseCode: 'fra_ca_for_eng', role: 'target1' })).toMatchObject({ allowed: false, reason: 'uncast' })
    expect(await castVerdict('fra', FRA, { courseCode: 'fra_for_eng', role: 'target1' })).toMatchObject({ allowed: true, via: 'tom-cast' })
  })
  it('a variety\'s Tom row covers that variety only, never the base', async () => {
    useCastRows([tom('fra_ca', FRA_CA)]); useCourseVoiceCensus(async () => [])
    expect(await castVerdict('fra', FRA_CA, { courseCode: 'fra_ca_for_eng' })).toMatchObject({ allowed: true, via: 'tom-cast' })
    expect(await castVerdict('fra', FRA_CA, { courseCode: 'fra_for_eng' })).toMatchObject({ allowed: false, reason: 'uncast' })
  })
  it('a known-side variety is found too, and English (base rows, no variety) is unaffected', async () => {
    useCastRows([tom('eng', CHARLOTTE), tom('spa', 'cartesia_s')]); useCourseVoiceCensus(async () => [])
    expect(await castVerdict('spa', 'cartesia_s', { courseCode: 'eng_for_spa_mx' })).toMatchObject({ allowed: false, reason: 'uncast' })
    expect(await castVerdict('eng', CHARLOTTE, { courseCode: 'spa_mx_for_eng' })).toMatchObject({ allowed: true })
    expect(await castVerdict('eng', CHARLOTTE, { courseCode: 'fra_ca_for_eng' })).toMatchObject({ allowed: true })
  })
  it('the Azure-only leg stays per course, in a variety course', async () => {
    useCastRows([tom('fra', FRA)])
    useCourseVoiceCensus(async () => [{ role: 'target1', language: 'fra', voice_id: 'azure_fr-CA-SylvieNeural', clips: 5 }])
    expect(await castVerdict('fra', 'azure_fr-CA-SylvieNeural', { courseCode: 'fra_ca_for_eng', role: 'target1' })).toMatchObject({ allowed: true, via: 'azure-only' })
  })
})

describe('castVerdict — the key is Voice Lab\'s castKeyForCourse, not the course-code spelling (#724)', () => {
  const GLE = 'cartesia_gle-base'
  const GLE_M = 'cartesia_gle-munster'
  it('a dialect course whose code says nothing (dialect column only) uses its variety row', async () => {
    useCastRows([tom('gle_munster', GLE_M)]); useCourseVoiceCensus(async () => [])
    expect(await castVerdict('gle', GLE_M, { courseCode: 'gle_munster_for_eng', role: 'target1' })).toMatchObject({ allowed: true, via: 'tom-cast', castKey: 'gle_munster' })
  })
  it('refusal: a dialect course is uncast when Tom cast only the base', async () => {
    useCastRows([tom('gle', GLE)]); useCourseVoiceCensus(async () => [])
    expect(await castVerdict('gle', GLE, { courseCode: 'gle_munster_for_eng', role: 'target1' })).toMatchObject({ allowed: false, reason: 'uncast', castKey: 'gle_munster' })
  })
  it('leakage: a Munster-only cast never authorises plain Irish', async () => {
    useCastRows([tom('gle_munster', GLE_M)]); useCourseVoiceCensus(async () => [])
    expect(await castVerdict('gle', GLE_M, { courseCode: 'gle_for_eng', role: 'target1' })).toMatchObject({ allowed: false, reason: 'uncast', castKey: 'gle' })
  })
  it('a course code with a variety spelling but no variety column is the base language', async () => {
    useCastRows([tom('fra', 'cartesia_f')]); useCourseVoiceCensus(async () => [])
    useCourseCastRow(async () => ({ target_lang: 'fra', known_lang: 'eng' }))
    expect(await castVerdict('fra', 'cartesia_f', { courseCode: 'fra_ca_for_eng', role: 'target1' })).toMatchObject({ allowed: true, castKey: 'fra' })
  })
  it('English stays allowed on every course, dialect or not', async () => {
    useCastRows([tom('eng', CHARLOTTE)]); useCourseVoiceCensus(async () => [])
    for (const c of Object.keys(COURSES)) {
      const lang = COURSES[c].known_lang === 'eng' ? 'eng' : 'eng'
      expect(await castVerdict(lang, CHARLOTTE, { courseCode: c, role: 'known' }), c).toMatchObject({ allowed: true })
    }
  })
})

describe('castVerdict — leg (b), Azure-only courses render in their own Azure voices', () => {
  const SAMEERA = 'azure_si-LK-SameeraNeural', THILINI = 'azure_si-LK-ThiliniNeural'
  const SONIA = 'azure_en-GB-SoniaNeural'
  const rows = [{ ...tom('eng', CHARLOTTE), assigned_by: 'kai-ruling-2026-09-23-charlotte-everywhere' }]

  it('eng_for_sin: Sinhala clips all Azure → a new Sinhala line renders in a voice the course holds, not another', async () => {
    useCastRows(rows)
    useCourseVoiceCensus(async () => [{ role: 'known', language: 'sin', voice_id: SAMEERA, clips: 900 }, { role: 'target1', language: 'eng', voice_id: CHARLOTTE, clips: 900 }])
    expect(await castVerdict('sin', SAMEERA, { courseCode: 'eng_for_sin', role: 'known' })).toMatchObject({ allowed: true, via: 'azure-only' })
    expect(await castVerdict('sin', THILINI, { courseCode: 'eng_for_sin', role: 'known' })).toMatchObject({ allowed: false, reason: 'uncast' })
  })
  it('mixed: one non-Azure clip in the language and the Azure leg is closed', async () => {
    useCastRows(rows)
    useCourseVoiceCensus(async () => [{ role: 'known', language: 'sin', voice_id: SAMEERA, clips: 900 }, { role: 'target2', language: 'sin', voice_id: 'xai_eve', clips: 1 }])
    expect(await castVerdict('sin', SAMEERA, { courseCode: 'eng_for_sin', role: 'known' })).toMatchObject({ allowed: false })
  })
  it('an Azure intro voice renders where the course\'s lines are otherwise allowed (Tom-cast English lines)', async () => {
    useCastRows(rows)
    useCourseVoiceCensus(async () => [{ role: 'known', language: 'eng', voice_id: CHARLOTTE, clips: 500 }, { role: 'presentation', language: 'eng', voice_id: SONIA, clips: 500 }])
    expect(await castVerdict('eng', SONIA, { courseCode: 'ita_for_eng', role: 'presentation' })).toMatchObject({ allowed: true, via: 'azure-only' })
    // …but not as a LINE voice: the course's English lines are Cartesia, so Sonia lines are not Azure-only
    expect(await castVerdict('eng', SONIA, { courseCode: 'ita_for_eng', role: 'known' })).toMatchObject({ allowed: false, reason: 'not-cartesia' })
  })
  it('an Azure intro voice in a draft-cast language with mixed lines renders nothing', async () => {
    useCastRows([draft('por', 'cartesia_p')])
    useCourseVoiceCensus(async () => [{ role: 'target1', language: 'por', voice_id: 'cartesia_p', clips: 5 }, { role: 'target1', language: 'por', voice_id: 'azure_pt-BR-JulioNeural', clips: 5 }, { role: 'presentation', language: 'por', voice_id: 'azure_pt-BR-JulioNeural', clips: 5 }])
    expect(await castVerdict('por', 'azure_pt-BR-JulioNeural', { courseCode: 'x', role: 'presentation' })).toMatchObject({ allowed: false, reason: 'draft-cast' })
  })
  it('pod and narration roles do not make a course "mixed"', async () => {
    useCastRows([])
    useCourseVoiceCensus(async () => [{ role: 'target1', language: 'urd', voice_id: 'azure_ur-PK-UzmaNeural', clips: 9 }, { role: 'pod_atom', language: 'urd', voice_id: 'xai_leo', clips: 9 }])
    expect(await castVerdict('urd', 'azure_ur-PK-UzmaNeural', { courseCode: 'eng_for_urd', role: 'target1' })).toMatchObject({ allowed: true })
  })
})

describe('partitionByCast + limitCastFirst — the phase8 plan', () => {
  it('eng_for_sin shape: cast English kept, Sinhala in an uncast voice set aside, one summary line per role/voice', async () => {
    useCastRows([tom('eng', CHARLOTTE)]); useCourseVoiceHolder(async () => true); useCourseVoiceCensus(async () => [])
    const items = [
      { role: 'target1', language: 'eng', voiceId: CHARLOTTE, text: 'I want' },
      { role: 'target2', language: 'eng', voiceId: CHARLOTTE, text: 'I want' },
      { role: 'known', language: 'sin', voiceId: 'azure_si-LK-SameeraNeural', text: 'a' },
      { role: 'known', language: 'sin', voiceId: 'azure_si-LK-SameeraNeural', text: 'b' },
      { role: 'known', language: 'eng', voiceId: 'azure_en-GB-SoniaNeural', text: 'c' },
      { role: 'known', language: 'eng', voiceId: null, text: 'no voice fails on its own' },
    ]
    const { cast, uncast, summary } = await partitionByCast(items, 'eng_for_sin')
    expect(cast.map(i => i.text)).toEqual(['I want', 'I want', 'no voice fails on its own'])
    expect(uncast).toHaveLength(3)
    expect(summary).toEqual([
      { role: 'known', language: 'sin', voiceId: 'azure_si-LK-SameeraNeural', reason: 'uncast', count: 2 },
      { role: 'known', language: 'eng', voiceId: 'azure_en-GB-SoniaNeural', reason: 'not-cartesia', count: 1 },
    ])
  })

  // #689 bug 1: phase8 sliced to `limit` BEFORE partitioning, so an uncast head starved the cast tail.
  it('a limit taken after the split serves cast lines first; uncast lines only fill leftover room', async () => {
    useCastRows([tom('eng', CHARLOTTE)]); useCourseVoiceCensus(async () => [])
    const items = [
      ...Array.from({ length: 5 }, (_, i) => ({ role: 'known', language: 'sin', voiceId: 'azure_si-LK-SameeraNeural', text: `s${i}` })),
      { role: 'target1', language: 'eng', voiceId: CHARLOTTE, text: 'e0' },
      { role: 'target1', language: 'eng', voiceId: CHARLOTTE, text: 'e1' },
    ]
    const plan = limitCastFirst(await partitionByCast(items, 'eng_for_sin'), 3)
    expect(plan.cast.map(i => i.text)).toEqual(['e0', 'e1'])
    expect(plan.items.map(i => i.text)).toEqual(['e0', 'e1', 's0'])
    expect(plan.summary[0].count).toBe(5)   // the tally is the whole queue's
    expect(limitCastFirst(await partitionByCast(items, 'eng_for_sin'), undefined).items).toHaveLength(7)
  })
})

describe('a named course with no course row (lane review #728)', () => {
  it('refuses instead of falling back to the base-language cast', async () => {
    useCastRows([{ language: 'fra', voice_id: 'cartesia_f', assigned_by: 'thomas.cassidy+ssi@gmail.com' }])
    useCourseCastRow(async () => null)
    await expect(castVerdict('fra', 'cartesia_f', { courseCode: 'fra_ca_for_eng' })).rejects.toThrow(/no course row/)
  })
})
