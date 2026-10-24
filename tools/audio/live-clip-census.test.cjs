/** tools/audio/live-clip-census.cjs — the pure rules the census reports from (job #338). */
import { describe, it, expect } from 'vitest'
import census from './live-clip-census.cjs'
const { podFindings, drillRecordings, speakerVoice, summarise } = census

const speakers = { Li: { target: { voice_id: 'eve', provider: 'xai' } }, Wang: { voice_id: 'zh-CN-YunxiNeural', provider: 'azure' } }
const clip = (voice, extra = {}) => ({ voice_id: voice, language: 'zho', origin: 'tts', course_code: 'zho_for_eng', ...extra })

describe('speakerVoice', () => {
  it('reads the per-track shape and the legacy shape, with parens stripped from the speaker', () => {
    expect(speakerVoice(speakers, 'Li (F)')).toBe('xai_eve')
    expect(speakerVoice(speakers, 'Wang')).toBe('azure_zh-CN-YunxiNeural')
    expect(speakerVoice(speakers, 'Nobody')).toBe(null)
  })
})

describe('podFindings — Drill against its own turn (Tom 2026-10-24)', () => {
  const clips = new Map([
    ['turn', clip('xai_eve')],
    ['d1', clip('eve')], // same voice under the other spelling
    ['d2', clip('azure_zh-CN-XiaoxiaoNeural')], // a Drill clip in another voice: cannot be a cut of the turn
  ])
  const row = { course_code: 'zho_for_eng', speakers, id: 'r1', global_order: 1, speaker: 'Li', target_text: '你好。我是李。', target_audio_id: 'turn', sentence_audio_ids: ['d1', 'd2'] }

  it('flags a Drill clip whose voice differs from the turn clip, and only that clip', () => {
    const { turns, drill } = podFindings([row], clips)
    expect(turns[0].flags).toContain('drill-off-turn')
    expect(turns[0].offTurn).toEqual(['d2'])
    expect(drill.map((d) => d.text)).toEqual(['你好。', '我是李。'])
  })

  it('flags a turn clip off its speaker cast, and an unsplit multi-sentence turn', () => {
    const { turns } = podFindings([{ ...row, speaker: 'Wang', sentence_audio_ids: null }], clips)
    expect(turns[0].flags).toEqual(['turn-off-speaker', 'drill-unsplit'])
  })

  it('a human turn is never judged against the cast', () => {
    const { turns } = podFindings([{ ...row, speaker: 'Wang', sentence_audio_ids: null }], new Map([['turn', clip('human_aran', { origin: 'human' })]]))
    expect(turns[0].flags).toEqual(['drill-unsplit'])
  })
})

describe('drillRecordings — one sentence, how many recordings', () => {
  it('counts distinct s3 objects, not pointer rows, and marks which extras anything still points at', () => {
    const drill = [{ course: 'zho_for_eng', language: 'zho', text: '你好。', clipId: 'd1', voice: 'xai_eve', turnVoice: 'xai_eve' }]
    const rows = [
      { id: 'd1', language: 'zho', text_normalized: '你好', voice_id: 'eve', course_code: 'zho_for_eng', role: 'target1', s3_key: 'a.mp3' },
      { id: 'd1b', language: 'zho', text_normalized: '你好', voice_id: 'eve', course_code: 'zho_for_spa', role: 'target1', s3_key: 'a.mp3' }, // same object: a pointer
      { id: 'x1', language: 'zho', text_normalized: '你好', voice_id: 'zh-CN-XiaoxiaoNeural', course_code: 'zho_for_eng', role: 'target1', s3_key: 'b.mp3' },
      { id: 'x2', language: 'zho', text_normalized: '你好', voice_id: 'eve', course_code: 'zho_for_eng', role: 'target2', s3_key: 'c.mp3' },
    ]
    const [r] = drillRecordings(drill, rows, new Set(['x1']))
    expect(r.recordings).toBe(3)
    expect(r.extra.map((e) => [e.id, e.pointed])).toEqual([['x1', true], ['x2', false]])
    const s = summarise({ turns: [], drill }, [r], null, null)
    expect(s.drillTexts).toMatchObject({ texts: 1, withExtraRecordings: 1, extraRecordings: 2, extraUnpointed: 1 })
  })
})
