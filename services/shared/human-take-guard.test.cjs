/**
 * HUMAN TAKE GUARD (job #609, Tom HARD RULE 2026-10-13, r-2026-10-13-hard-rule-a-human-recorded-clip):
 * a human-recorded clip is NEVER replaced automatically by a cloned or synthetic voice, in any course.
 * Failing-first: written before services/shared/human-take-guard.cjs existed.
 */
import { describe, it, expect } from 'vitest'
import g from './human-take-guard.cjs'
import rv from './resolve-voice.cjs'

const CLIPS = {
  sasha: { id: 'sasha', voice_id: 'human_sasha_wanasky_deu_at', origin: 'human', language: 'deu' },
  welshLegacy: { id: 'welshLegacy', voice_id: 'human_aran_cym_n', origin: 'legacy_import', language: 'cym' },
  welshMislabelled: { id: 'welshMislabelled', voice_id: 'human_aran_cym_n', origin: 'tts', language: 'cym' },
  originOnly: { id: 'originOnly', voice_id: 'xai_eve', origin: 'human', language: 'eng' },
  clone: { id: 'clone', voice_id: 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9', origin: 'tts', language: 'eng' },
  cloneB: { id: 'cloneB', voice_id: 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121', origin: 'tts', language: 'eng' },
  take2: { id: 'take2', voice_id: 'human_sasha_wanasky_deu_at', origin: 'human', language: 'deu' },
}
const APPROVAL = 'tom:2026-10-13:replace the 11 rejected Austrian takes'

describe('isHumanClip: identified from the clip row (origin / voice id), not from the course', () => {
  it('origin human, a human_ voice id (even when mislabelled tts), but never a clone', () => {
    expect(g.isHumanClip(CLIPS.sasha)).toBe(true)
    expect(g.isHumanClip(CLIPS.originOnly)).toBe(true)
    expect(g.isHumanClip(CLIPS.welshMislabelled)).toBe(true)
    expect(g.isHumanClip(CLIPS.clone)).toBe(false)
    expect(g.isHumanClip(null)).toBe(false)
  })
})

describe('checkReplacement: human -> synthetic is refused unless Tom approved it', () => {
  it('refuses a human take replaced by a clone, names the rule', () => {
    const v = g.checkReplacement({ current: CLIPS.sasha, next: CLIPS.clone })
    expect(v.ok).toBe(false)
    expect(v.reason).toBe('human-take-protected')
    expect(v.message).toMatch(/human/i)
  })
  it('refuses a legacy_import Welsh take replaced by a clone', () => {
    expect(g.checkReplacement({ current: CLIPS.welshLegacy, next: CLIPS.cloneB }).ok).toBe(false)
  })
  it('allows human -> human (a re-take), synthetic -> synthetic, synthetic -> human, and nothing -> anything', () => {
    expect(g.checkReplacement({ current: CLIPS.sasha, next: CLIPS.take2 }).ok).toBe(true)
    expect(g.checkReplacement({ current: CLIPS.clone, next: CLIPS.cloneB }).ok).toBe(true)
    expect(g.checkReplacement({ current: CLIPS.clone, next: CLIPS.sasha }).ok).toBe(true)
    expect(g.checkReplacement({ current: null, next: CLIPS.clone }).ok).toBe(true)
  })
  it('an explicit Tom-approval token lets it through, and says so; a vague token does not', () => {
    const v = g.checkReplacement({ current: CLIPS.sasha, next: CLIPS.clone, tomApproval: APPROVAL })
    expect(v).toMatchObject({ ok: true, approvedBy: APPROVAL })
    expect(g.checkReplacement({ current: CLIPS.sasha, next: CLIPS.clone, tomApproval: 'yes' }).ok).toBe(false)
    expect(g.checkReplacement({ current: CLIPS.sasha, next: CLIPS.clone, tomApproval: true }).ok).toBe(false)
  })
  it('a next clip that cannot be read refuses (not knowing is not permission)', () => {
    expect(g.checkReplacement({ current: CLIPS.sasha, next: undefined }).ok).toBe(false)
  })
})

// fake supabase: select().eq('id').maybeSingle() over tables
function fakeDb(tables) {
  return { from(tbl) { const q = {}; const api = { select() { return api }, in() { return api }, eq(k, v) { q[k] = v; return api },
    async maybeSingle() { const key = q.id ?? q.course_code; return { data: (tables[tbl] || {})[key] || null, error: null } } }; return api } }
}
const allClips = Object.fromEntries(Object.values(CLIPS).map((c) => [c.id, c]))

describe("assertNotReplacingHuman reads the slot's CURRENT pointer itself", () => {
  const db = fakeDb({
    course_audio: allClips,
    course_practice_phrases: { p1: { id: 'p1', target2_audio_id: 'sasha' }, p2: { id: 'p2', target2_audio_id: 'clone' }, p3: { id: 'p3', target2_audio_id: null } },
  })
  const slot = (key, to, extra = {}) => ({ tbl: 'course_practice_phrases', key, col: 'target2_audio_id', to, ...extra })
  it('throws HumanTakeRefusal for a slot holding a human take', async () => {
    await expect(g.assertNotReplacingHuman(db, slot('p1', 'clone'))).rejects.toMatchObject({ name: 'HumanTakeRefusal', code: 'HUMAN_TAKE' })
  })
  it('passes for a synthetic or empty slot, for human->human, and with approval', async () => {
    await g.assertNotReplacingHuman(db, slot('p2', 'cloneB'))
    await g.assertNotReplacingHuman(db, slot('p3', 'clone'))
    await g.assertNotReplacingHuman(db, slot('p1', 'take2'))
    await g.assertNotReplacingHuman(db, slot('p1', 'clone', { tomApproval: APPROVAL }))
  })
  it('fails closed when the slot cannot be identified', async () => {
    await expect(g.assertNotReplacingHuman(db, { col: 'target2_audio_id', to: 'clone' })).rejects.toMatchObject({ code: 'HUMAN_TAKE' })
  })
  it('a null pointer or a ledgered restore is not a synthetic replacement', async () => {
    await g.assertNotReplacingHuman(db, slot('p1', null))
    await g.assertNotReplacingHuman(db, slot('p1', 'clone', { restore: true }))
  })
})

describe('the shared pointer gate (resolve-voice) enforces it before any voice policy', () => {
  const db = fakeDb({
    course_audio: allClips,
    courses: { cym_n_for_eng: { course_code: 'cym_n_for_eng', known_lang: 'eng', target_lang: 'cym' } },
    course_legos: { l1: { id: 'l1', target1_audio_id: 'welshLegacy' } },
  })
  it('mayPoint refuses a clone onto a Welsh human slot even though resolveVoice has no ruling for it', async () => {
    rv.useCast({ roles: [], voices: [] })
    const said = []
    const p = { courseCode: 'cym_n_for_eng', col: 'target1_audio_id', tbl: 'course_legos', key: 'l1', to: 'cloneB' }
    expect(await rv.mayPoint(db, { ...p, log: (l) => said.push(l) })).toBe(false)
    expect(said[0]).toMatch(/human/i)
    expect(await rv.mayPoint(db, { ...p, tomApproval: APPROVAL })).toBe(true)
    rv.useCast(null)
  })
})
