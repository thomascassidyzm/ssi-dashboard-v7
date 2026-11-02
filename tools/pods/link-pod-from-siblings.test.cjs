/**
 * link-pod-from-siblings (job #340): a staged pod's empty slots are filled from ONE sibling per side, only with a clip
 * whose language and text match the slot, fill-only, and a speaker never ends up with two voices.
 */
import { describe, it, expect } from 'vitest'

const { buildLinkPlan, libKey } = require('./link-pod-from-siblings.cjs')

const M = 'cartesia_m', F = 'cartesia_f', ZM = 'cartesia_zm', ZF = 'cartesia_zf'
const row = (go, speaker, target_text, known_text, extra = {}) => ({
  id: `X:p:SC01-S00${go}`, scene_number: 1, sentence_number: go, global_order: go, speaker,
  target_text, known_text, target_audio_id: null, known_audio_id: null, ...extra,
})
const clip = (id, text, voice_id, language) => ({ id, text, voice_id, language, s3_key: `k/${id}.mp3`, origin: 'tts' })

function fixture() {
  const staged = { podId: 'eng_for_zho:pod-1-231', course: 'eng_for_zho', speakers: {}, rows: [
    row(1, 'Anna', 'Hello.', '你好。'),
    row(2, 'Guest', 'Hi there.', '嗨。'),
    row(3, 'Anna', 'I am learning English.', '我在学英文。'),
  ] }
  const tgt = { podId: 'eng_for_fra:pod-1', side: 'target', speakers: { Anna: { gender: 'f' }, Guest: { gender: 'm' } }, rows: [
    row(1, 'Anna', 'Hello.', 'Bonjour.', { target_audio_id: 't1' }),
    row(2, 'Guest', 'Hi there.', 'Salut.', { target_audio_id: 't2' }),
    row(3, 'Anna', 'I am learning English.', "J'apprends l'anglais.", { target_audio_id: 't3' }),
  ] }
  const kn = { podId: 'zho_for_eng:pod-1', side: 'target', speakers: {}, rows: [
    row(1, 'Anna', '你好。', 'Hello.', { target_audio_id: 'k1' }),
    row(2, 'Guest', '嗨。', 'Hi there.', { target_audio_id: 'k2' }),
    row(3, 'Anna', '我在学中文。', 'I am learning Chinese.', { target_audio_id: 'k3' }),
  ] }
  const clips = new Map([
    clip('t1', 'Hello.', F, 'eng'), clip('t2', 'Hi there.', M, 'eng'), clip('t3', 'I am learning English.', F, 'eng'),
    clip('k1', '你好。', ZF, 'zho'), clip('k2', '嗨。', ZM, 'zho'), clip('k3', '我在学中文。', ZF, 'zho'),
  ].map((c) => [c.id, c]))
  return { staged, sources: { target: tgt, known: kn }, langs: { target: 'eng', known: 'zho' }, clips }
}

describe('link-pod-from-siblings', () => {
  it('fills an empty slot from the right sibling, and casts each speaker from the clips', () => {
    const f = fixture()
    const lib = new Map([[libKey(ZF, 'zho', '我在学英文。'), clip('lib3', '我在学英文。', ZF, 'zho')]])
    const r = buildLinkPlan({ ...f, library: lib })
    expect(r.problems).toEqual([])
    expect(r.ok).toBe(true)
    const byId = Object.fromEntries(r.plan.rows.map((x) => [x.id.slice(-3), x.after]))
    expect(byId['001']).toEqual({ target_audio_id: 't1', known_audio_id: 'k1' }) // target from eng_for_fra, known from zho_for_eng
    expect(byId['003']).toEqual({ target_audio_id: 't3', known_audio_id: 'lib3' }) // language-name line: library, same voice
    expect(r.plan.speakers.after.Anna.target.voice_id).toBe(F)
    expect(r.plan.speakers.after.Anna.known.voice_id).toBe(ZF)
  })

  it('refuses a clip whose text does not match the slot — it is a hole, not a link', () => {
    const r = buildLinkPlan(fixture())
    expect(r.ok).toBe(false)
    expect(r.holes).toHaveLength(1)
    expect(r.holes[0]).toMatchObject({ side: 'known', go: 3, voiceId: ZF, text: '我在学英文。' })
    expect(r.holes[0].why).toMatch(/text differs/)
    expect(r.plan.rows.find((x) => x.id.endsWith('003')).after).not.toHaveProperty('known_audio_id')
  })

  it('refuses a speaker whose linked clips carry two voices', () => {
    const f = fixture()
    f.clips.set('t3', clip('t3', 'I am learning English.', M, 'eng')) // Anna now F on line 1, M on line 3
    const lib = new Map([[libKey(ZF, 'zho', '我在学英文。'), clip('lib3', '我在学英文。', ZF, 'zho')]])
    const r = buildLinkPlan({ ...f, library: lib })
    expect(r.ok).toBe(false)
    expect(r.problems.join('\n')).toMatch(/Anna would have 2 target voices/)
  })

  it('never replaces a slot that already holds a clip', () => {
    const f = fixture()
    f.staged.rows[0].target_audio_id = 'mine'
    f.clips.set('mine', clip('mine', 'Hello.', F, 'eng'))
    const r = buildLinkPlan(f)
    const r1 = r.plan.rows.find((x) => x.id.endsWith('001'))
    expect(r1.after).not.toHaveProperty('target_audio_id')
    expect(r1.after.known_audio_id).toBe('k1')
    expect(r.linked.kept).toBe(1)
  })

  it('carries the target sibling\'s speaker relabel (scene-21 Narrator 2)', () => {
    const f = fixture()
    f.sources.target.rows[1].speaker = 'Guest 2'
    const lib = new Map([[libKey(ZF, 'zho', '我在学英文。'), clip('lib3', '我在学英文。', ZF, 'zho')]])
    const r = buildLinkPlan({ ...f, library: lib })
    const r2 = r.plan.rows.find((x) => x.id.endsWith('002'))
    expect(r2.before.speaker).toBe('Guest')
    expect(r2.after.speaker).toBe('Guest 2')
    expect(r.plan.speakers.after['Guest 2'].target.voice_id).toBe(M)
  })

  it('a hole recorded only as another course\'s KNOWN-side clip in another voice is "recorded already", never "to render" (job #352)', () => {
    const f = fixture()
    // The words exist only on the known side of some other course, in a different Chinese voice than Anna's (ZF).
    const other = { ...clip('kx', '我在学英文。', 'azure_zh-CN-XiaoxiaoNeural', 'zh'), course_code: 'eng_for_zho_old', role: 'known' }
    const r = buildLinkPlan({ ...f, library: [other] })
    expect(r.holes).toEqual([]) // nothing to render
    expect(r.inLanguage).toHaveLength(1)
    expect(r.inLanguage[0]).toMatchObject({ side: 'known', go: 3, voiceId: ZF, text: '我在学英文。' })
    expect(r.inLanguage[0].existing).toEqual([{ audioId: 'kx', voiceId: 'azure_zh-CN-XiaoxiaoNeural', courseCode: 'eng_for_zho_old', side: 'known' }])
    expect(r.ok).toBe(false) // a voice decision is still owed before the pod is complete
    expect(r.plan.rows.find((x) => x.id.endsWith('003')).after).not.toHaveProperty('known_audio_id') // never linked across voices
  })

  it('takes a clip stored with the pod pause cue (" … ") as the recording of its row, and Basque eu as eus', () => {
    const { clipRefusal } = require('./link-pod-from-siblings.cjs')
    expect(clipRefusal(clip('p', 'Mi chiamo Anna. … E tu?', F, 'ita'), 'ita', 'Mi chiamo Anna. E tu?')).toBeNull()
    expect(clipRefusal(clip('q', 'Mi chiamo Anna. … E lei?', F, 'ita'), 'ita', 'Mi chiamo Anna. E tu?')).toMatch(/text differs/)
    expect(clipRefusal(clip('e', 'Kaixo.', F, 'eu'), 'eus', 'Kaixo.')).toBeNull()
  })
})
