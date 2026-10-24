/** tools/audio/live-clip.cjs — one default per (course, seat, text); choose-voice falls back to it (job #338). */
import { describe, it, expect } from 'vitest'
import lc from './live-clip.cjs'
const { defaultFor, playedFor, forkPlan, recutPlan } = lc

const clips = new Map([
  ['a', { voice_id: 'azure_zh-CN-XiaoxiaoNeural', origin: 'tts', created_at: '2026-05-01' }],
  ['b', { voice_id: 'zh-CN-XiaoxiaoNeural', origin: 'tts', created_at: '2026-09-01' }],
  ['c', { voice_id: 'xai_eve', origin: 'tts', created_at: '2026-10-01' }],
  ['h', { voice_id: 'human_aran', origin: 'human', created_at: '2026-01-01' }],
])

describe('defaultFor', () => {
  it('the clip most rows already play is the default; a tie goes to human, then the newest take', () => {
    expect(defaultFor('target1', [{ seat: 'target1', audio: 'a', n: 5 }, { seat: 'target1', audio: 'c', n: 2 }], clips)).toMatchObject({ default: 'a', forked: true, sameVoice: false })
    expect(defaultFor('target1', [{ seat: 'target1', audio: 'a', n: 1 }, { seat: 'target1', audio: 'b', n: 1 }], clips)).toMatchObject({ default: 'b', sameVoice: true })
    expect(defaultFor('target1', [{ seat: 'target1', audio: 'c', n: 1 }, { seat: 'target1', audio: 'h', n: 1 }], clips).default).toBe('h')
    expect(defaultFor('target1', [{ seat: 'target1', audio: 'a', n: 3 }], clips)).toMatchObject({ default: 'a', forked: false })
  })
})

describe('playedFor — choose-voice falls back to the default', () => {
  const def = { default: 'a' }
  it('plays the chosen voice when the index holds these words in it, else the default', () => {
    const index = new Map([['eve', 'c']])
    expect(playedFor(def, index, 'xai_eve').audio).toBe('c')
    expect(playedFor(def, index, 'cartesia_tom').audio).toBe('a')
    expect(playedFor(def, index, null).audio).toBe('a')
  })
})

describe('forkPlan', () => {
  it('keeps the default, repoints the rest, splits same-voice from cross-voice, and holds fra_for_eng seeds 1-10', () => {
    const rows = [
      { course_code: 'zho_for_eng', seat: 'target1', text: '不是这样', audio: 'a', n: '3', min_seed: '40' },
      { course_code: 'zho_for_eng', seat: 'target1', text: '不是这样', audio: 'b', n: '1', min_seed: '41' },
      { course_code: 'zho_for_eng', seat: 'target2', text: '不是这样', audio: 'c', n: '2', min_seed: '40' },
      { course_code: 'fra_for_eng', seat: 'target1', text: 'je veux', audio: 'a', n: '1', min_seed: '3' },
      { course_code: 'fra_for_eng', seat: 'target1', text: 'je veux', audio: 'c', n: '1', min_seed: '12' },
    ]
    const plan = forkPlan(rows, clips)
    expect(plan).toHaveLength(2) // the target2 seat has one clip: not a fork
    expect(plan[0]).toMatchObject({ keep: 'a', sameVoice: true, held: null, rowsChanged: 1, repoint: [{ from: 'b', rows: 1 }] })
    expect(plan[1].held).toMatch(/#320/)
  })
})

describe('recutPlan', () => {
  it('lists only Drill-off-turn turns, with the row\'s current Drill ids kept for rollback', () => {
    const turns = [
      { course: 'zho_for_eng', rowId: 'r1', order: 37, turnClip: 't', turnVoice: 'jpi39icg', drillVoices: ['33g9t0jl'], offTurn: ['d1', 'd2'], flags: ['drill-off-turn'] },
      { course: 'zho_for_eng', rowId: 'r2', order: 38, offTurn: [], flags: ['drill-unsplit'] },
    ]
    const plan = recutPlan(turns, new Map([['r1', { sentence_audio_ids: ['d1', 'd2'] }]]))
    expect(plan).toEqual([expect.objectContaining({ rowId: 'r1', offTurn: 2, rollback: { sentence_audio_ids: ['d1', 'd2'] }, command: 'node tools/pods/splice-sentence-clips.cjs zho_for_eng --orders=37' })])
  })
})
