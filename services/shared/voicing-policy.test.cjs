/**
 * The voicing policy (services/shared/voicing-policy.cjs): Tom's 2026-10-09..11 voicing rulings enforced by construction.
 * Each describe is one ruling; the cases are the ones that failed on the code before the policy existed.
 */
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import policy from './voicing-policy.cjs'
const { checkRender, checkRevoice, introSplicePlan, assertRevoiceAllowed, assertRenderAllowed, useCastRowsWithDates, config } = policy

const CHARLOTTE = config.englishVoice
const COURSES = {
  spa_mx_for_eng: { course_code: 'spa_mx_for_eng', known_lang: 'eng', target_lang: 'spa', voice_pool_key: 'spa_mx' },
  spa_for_eng: { course_code: 'spa_for_eng', known_lang: 'eng', target_lang: 'spa' },
  por_br_for_eng: { course_code: 'por_br_for_eng', known_lang: 'eng', target_lang: 'por', voice_pool_key: 'por_br' },
  ita_for_eng: { course_code: 'ita_for_eng', known_lang: 'eng', target_lang: 'ita' },
  deu_for_eng: { course_code: 'deu_for_eng', known_lang: 'eng', target_lang: 'deu' },
  fra_for_eng: { course_code: 'fra_for_eng', known_lang: 'eng', target_lang: 'fra' },
  eng_for_spa: { course_code: 'eng_for_spa', known_lang: 'spa', target_lang: 'eng' },
}
const TOM = 'thomas.cassidy+ssi@gmail.com'
const cast = (language, gender, updated_at) => ({ language, gender, slot: 'phrase', rank: 0, voice_id: `cartesia_${language}-${gender}`, assigned_by: TOM, notes: null, updated_at })
const ROWS = [cast('spa', 'f', '2026-10-09T10:00:00Z'), cast('spa', 'm', '2026-10-11T10:00:00Z'), cast('spa_mx', 'f', '2026-10-11T10:00:00Z'), cast('spa_mx', 'm', '2026-10-11T09:00:00Z'),
  cast('ita', 'f', '2026-10-03T10:00:00Z'), cast('ita', 'm', '2026-10-03T10:00:00Z'), cast('deu', 'f', '2026-10-07T10:00:00Z'), cast('deu', 'm', '2026-10-07T10:00:00Z'),
  cast('fra', 'f', '2026-10-08T10:00:00Z'), cast('fra', 'm', '2026-10-07T10:00:00Z')]
afterEach(() => useCastRowsWithDates(null))

describe('presentation intros are spliced, naming the BASE language', () => {
  it('spa_mx says "The Spanish for", never "The Mexican Spanish for"', () => {
    expect(introSplicePlan(COURSES.spa_mx_for_eng)).toMatchObject({ fragmentText: 'The Spanish for', voiceId: CHARLOTTE, role: 'presentation' })
    expect(introSplicePlan(COURSES.por_br_for_eng).fragmentText).toBe('The Portuguese for')
    expect(checkRender({ text: 'The Mexican Spanish for', language: 'eng', voiceId: CHARLOTTE, course: COURSES.spa_mx_for_eng, intro: true })).toMatchObject({ allowed: false, reason: 'intro-wrong-language-name' })
  })
  it('the fragment renders; a whole intro does not; a remainder does', () => {
    const base = { language: 'eng', voiceId: CHARLOTTE, course: COURSES.spa_mx_for_eng, intro: true }
    expect(checkRender({ ...base, text: 'The Spanish for' }).allowed).toBe(true)
    expect(checkRender({ ...base, text: 'The Spanish for:' }).allowed).toBe(true)
    expect(checkRender({ ...base, text: "The Spanish for: 'I want', as in — 'I want to speak with you now', is:" })).toMatchObject({ allowed: false, reason: 'intro-not-spliced' })
    expect(checkRender({ ...base, text: "'I want', as in — 'I want to speak with you now', is:" }).allowed).toBe(true)
  })
  it('an intro in a voice other than Charlotte is refused (no target voices, no Tom clone)', () => {
    expect(checkRender({ text: 'The Spanish for', language: 'eng', voiceId: 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2', course: COURSES.spa_for_eng, intro: true })).toMatchObject({ allowed: false, reason: 'english-not-charlotte' })
  })
  it('a course not taught from English has no splice rule', () => {
    expect(introSplicePlan(COURSES.eng_for_spa)).toBeNull()
  })
  it('the door reads the policy for the intro slot (assertRenderAllowed → course row)', async () => {
    policy.useCourseRow(async c => COURSES[c])
    await expect(assertRenderAllowed({ text: "The Spanish for: 'x', is:", language: 'eng', voiceId: CHARLOTTE, courseCode: 'spa_mx_for_eng', intro: true })).rejects.toMatchObject({ code: 'VOICING_POLICY', reason: 'intro-not-spliced' })
    policy.useCourseRow(null)
  })
})

describe('voices: English known = Charlotte, xAI never', () => {
  it('xAI is refused on every path, auditions and no-course renders included', () => {
    for (const voiceId of ['xai_eve', 'xai_gfzdpspr5fdp']) {
      expect(checkRender({ text: 'hola', language: 'spa', voiceId, course: COURSES.spa_for_eng, role: 'target1' })).toMatchObject({ allowed: false, reason: 'xai-banned' })
      expect(checkRender({ text: 'hi', language: 'eng', voiceId, audition: true })).toMatchObject({ allowed: false, reason: 'xai-banned' })
    }
  })
  it('an English known line in any voice but Charlotte is refused; the target side is left to the cast gate', () => {
    expect(checkRender({ text: 'I want', language: 'eng', voiceId: 'azure_en-GB-SoniaNeural', course: COURSES.spa_for_eng, role: 'known' })).toMatchObject({ allowed: false, reason: 'english-not-charlotte' })
    expect(checkRender({ text: 'I want', language: 'eng', voiceId: CHARLOTTE, course: COURSES.spa_for_eng, role: 'known' }).allowed).toBe(true)
    expect(checkRender({ text: 'quiero', language: 'spa', voiceId: 'cartesia_whoever', course: COURSES.spa_for_eng, role: 'target1' }).allowed).toBe(true)
    expect(checkRender({ text: 'I want', language: 'eng', voiceId: 'cartesia_tom', course: COURSES.eng_for_spa, role: 'target1' }).allowed).toBe(true)   // English as the TARGET is not the known side
  })
})

describe('re-voice eligibility, scope and done', () => {
  it('a variety cast before the cutoff is refused: Italian, German, French, Chinese-era casts', () => {
    for (const c of ['ita_for_eng', 'deu_for_eng', 'fra_for_eng']) expect(checkRevoice({ course: COURSES[c], rows: ROWS, maxSeed: 100 })).toMatchObject({ allowed: false, reason: 'revoice-pre-cutoff' })
  })
  it('a variety Tom cast on/after 2026-10-09 is eligible, default scope seeds 1-100', () => {
    expect(checkRevoice({ course: COURSES.spa_for_eng, rows: ROWS })).toMatchObject({ allowed: true, maxSeed: 100 })
    expect(checkRevoice({ course: COURSES.spa_mx_for_eng, rows: ROWS, maxSeed: 40 })).toMatchObject({ allowed: true, maxSeed: 40 })
    expect(checkRevoice({ course: COURSES.spa_for_eng, rows: ROWS, maxSeed: 500 })).toMatchObject({ allowed: false, reason: 'revoice-out-of-scope' })
  })
  it('the cutoff is data: moving it moves eligibility', () => {
    expect(checkRevoice({ course: COURSES.deu_for_eng, rows: ROWS, cutoff: '2026-10-07' })).toMatchObject({ allowed: false, reason: 'revoice-done' })
  })
  it('an uncast, draft-cast or un-Tom-cast variety is never re-voiced (por_br is draft)', () => {
    const rows = [{ ...cast('por_br', 'f', '2026-10-10T00:00:00Z'), assigned_by: 'e2e@ssi-test.invalid', notes: 'draft casting 2026-09-04' }]
    expect(checkRevoice({ course: COURSES.por_br_for_eng, rows })).toMatchObject({ allowed: false, reason: 'revoice-uncast' })
  })
  it('assertRevoiceAllowed throws a VoicingRefusal for the pre-cutoff course and returns the ceiling for Spanish', async () => {
    useCastRowsWithDates(async () => ROWS)
    const getCourse = async c => COURSES[c]
    await expect(assertRevoiceAllowed({ courseCode: 'deu_for_eng', maxSeed: 100, getCourse })).rejects.toMatchObject({ code: 'VOICING_POLICY', status: 403 })
    expect(await assertRevoiceAllowed({ courseCode: 'spa_mx_for_eng', getCourse })).toBe(100)
  })
})

describe('never delete a clip; the rerecord gate stays', () => {
  const root = path.join(__dirname, '../..')
  const read = f => fs.readFileSync(path.join(root, f), 'utf8')
  it('the re-voice tools hold no course_audio delete', () => {
    for (const f of ['tools/audio/charlotte-backfill.cjs', 'services/shared/voicing-policy.cjs']) expect(read(f)).not.toMatch(/delete\s+from\s+course_audio|from\(['"]course_audio['"]\)\.delete/i)
  })
  it('the door runs the voicing policy and then the rerecord gate; the re-voice tools call the policy', () => {
    const door = read('services/tts-service.cjs')
    expect(door.indexOf('assertRenderAllowed(')).toBeGreaterThan(0)
    expect(door.indexOf('assertRenderAllowed(')).toBeLessThan(door.indexOf('await assertMayRerecord('))
    expect(read('tools/audio/charlotte-backfill.cjs')).toContain('assertRevoiceAllowed')
    expect(read('tools/revoice-clips.cjs')).toContain('assertRevoiceAllowed')
  })
})
