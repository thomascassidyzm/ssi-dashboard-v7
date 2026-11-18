/**
 * DRILL IS CUT (job #338, Tom 2026-10-24): the render route refuses a second performance of one sentence of a
 * served pod turn, in the turn's own voice — the Drill clip is cut from that take. Another voice is not refused.
 * No network, no DB. Run: npx vitest run services/shared/drill-cut-guard.test.cjs
 */
import { describe, it, expect } from 'vitest'
const guard = require('./drill-cut-guard.cjs')
const { renderClip, RenderRequestError } = require('./audio-render-entry.cjs')

const TURN = { id: 'zho_for_eng:pod-1:SC03-S004', global_order: 37, course_code: 'zho_for_eng', target_text: '谢谢你。我很好。', target_audio_id: 'turn-1', clip: { language: 'zho', voice_id: 'jpi39icg' } }

describe('findImmersionTurn', () => {
  it('finds the turn holding the words as ONE of two or more sentences, CJK stops included', () => {
    expect(guard.findImmersionTurn([TURN], { language: 'zho', text: '谢谢你' })).toMatchObject({ rowId: TURN.id, order: 37, audioId: 'turn-1' })
    expect(guard.findImmersionTurn([TURN], { language: 'zho', text: '谢谢' })).toBe(null) // a fragment is not a sentence
    expect(guard.findImmersionTurn([TURN], { language: 'jpn', text: '谢谢你' })).toBe(null) // another language's pod
    expect(guard.findImmersionTurn([{ ...TURN, target_text: '谢谢你。' }], { language: 'zho', text: '谢谢你' })).toBe(null) // one-sentence turn: no Drill
  })
  it('escapes LIKE wildcards in the words it searches for', () => {
    expect(guard.likeEscape('50%_off\\')).toBe('50\\%\\_off\\\\')
  })
})

/** The route's deps with nothing real behind them: a miss in the library, and a provider that records what it is asked. */
function deps(turn, paid) {
  return {
    resolve: async () => ({ language: 'zho', voiceId: 'xai_jpi39icg', provider: 'xai', providerConfig: {} }),
    link: async () => null,
    immersionTurn: async () => turn,
    speak: async (t) => { paid.push(t); return { audioBuffer: Buffer.alloc(8), charsSpent: t.length } },
    store: async () => ({ audioId: 'new', s3Key: 'mastered/new.mp3', durationMs: 900 }),
  }
}
const ask = (o = {}) => ({ courseCode: 'zho_for_eng', role: 'target1', text: '谢谢你。', purpose: 'test', requestedBy: 'job-338', ...o })

describe('the render route refuses a second take of a Drill sentence (job #338)', () => {
  it('same voice as the turn take (bare and xai_ spellings) → 409 DRILL_IS_CUT, nothing paid', async () => {
    const paid = []
    const turn = guard.findImmersionTurn([TURN], { language: 'zho', text: '谢谢你。' })
    const err = await renderClip(ask(), deps(turn, paid)).catch((e) => e)
    expect(err).toBeInstanceOf(RenderRequestError)
    expect(err).toMatchObject({ status: 409, code: 'DRILL_IS_CUT' })
    expect(err.message).toMatch(/splice-sentence-clips\.cjs zho_for_eng --orders=37/)
    expect(paid).toEqual([])
  })
  it('another voice (a main-flow second seat) is not refused', async () => {
    const paid = []
    const turn = guard.findImmersionTurn([{ ...TURN, clip: { language: 'zho', voice_id: 'azure_zh-CN-XiaoxiaoNeural' } }], { language: 'zho', text: '谢谢你。' })
    const out = await renderClip(ask(), deps(turn, paid))
    expect(out).toMatchObject({ ok: true, source: 'rendered' })
    expect(paid).toEqual(['谢谢你。'])
  })
  it('a known-side line is never looked up', async () => {
    const paid = []
    const out = await renderClip(ask({ role: 'known' }), deps(guard.findImmersionTurn([TURN], { language: 'zho', text: '谢谢你。' }), paid))
    expect(out).toMatchObject({ ok: true })
  })
})

// Needle + paging for the phase8 immersionTurn lookup (the DB read itself is not unit-tested).
describe('lookup misses (review 7ad1dfb8)', () => {
  const g = require('./drill-cut-guard.cjs')
  it('needle survives a curly/straight apostrophe difference', () => {
    expect(g.searchSegment("Qu'est-ce que c'est ?")).toBe('est')
    expect(g.searchSegment("I don't know.")).toBe('know')
  })
  it('pages past a single-page limit', async () => {
    const data = Array.from({ length: 2500 }, (_, i) => i)
    const out = await g.fetchAllPages(async (a, b) => data.slice(a, b + 1))
    expect(out).toHaveLength(2500)
  })
})

describe('findImmersionTurn voice (review #828)', () => {
  it('a same-voice turn is found even when another voice matches first', () => {
    const other = { ...TURN, id: 'other', clip: { language: 'zho', voice_id: 'azure_zh-CN-XiaoxiaoNeural' } }
    const got = guard.findImmersionTurn([other, TURN], { language: 'zho', text: '谢谢你。', voice: 'jpi39icg' })
    expect(got).toMatchObject({ rowId: TURN.id })
    expect(guard.drillCutRefusal(got, { voiceId: 'jpi39icg', text: '谢谢你。' })).not.toBeNull()
  })
})
