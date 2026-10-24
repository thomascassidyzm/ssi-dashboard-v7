import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const { tailVerdict, rollbackLines, staleAsks, isStop, castFromVoiceConfig, postWith } = createRequire(import.meta.url)('./revoice-seeds-to-cast.cjs')

// job #864: Popty restarting under an auto-deploy (ECONNREFUSED) is waited out; an answer, a 402 included, comes back first time
describe('postWith', () => {
  const refused = () => { const e = new Error('fetch failed'); e.cause = { code: 'ECONNREFUSED' }; throw e }
  const answer = (status, body) => async () => ({ status, json: async () => body })
  it('waits out a dropped connection, never retries an answer', async () => {
    const calls = []; const waits = []
    const seq = [refused, refused, answer(200, { ok: true, audioId: 'x' })]
    const r = await postWith(async (...a) => { calls.push(a); return seq.shift()() }, async (ms) => { waits.push(ms) }, '/api/audio/render', {})
    expect(r).toEqual({ status: 200, body: { ok: true, audioId: 'x' } })
    expect(waits).toHaveLength(2)
    let n = 0
    const r402 = await postWith(async () => { n++; return answer(402, { code: 'REPEAT' })() }, async () => {}, '/api/audio/render', {})
    expect([r402.status, n]).toEqual([402, 1])
  })
})

// job #863: only TTS clips off the cast voice move; human takes and cast clips stay; one ask per (role, words), course order
describe('revoice-seeds-to-cast', () => {
  const cast = { target1: 'cartesia_f1', target2: 'cartesia_m1' }
  const clips = new Map([
    ['a', { id: 'a', voice_id: 'es-ES-ElviraNeural', origin: 'tts' }],
    ['b', { id: 'b', voice_id: 'f1', origin: 'tts' }],           // already the cast voice (bare id)
    ['c', { id: 'c', voice_id: 'azure_es-ES-AlvaroNeural', origin: 'human' }], // a human take: never replaced
    ['d', { id: 'd', voice_id: 'xai_eve', origin: 'tts' }],
  ])
  const rows = [
    { seed_number: 7, target_text: 'mucho', target1_audio_id: 'a', target2_audio_id: 'c', slot: { legoId: 'S0007L01' } },
    { seed_number: 3, target_text: 'mucho', target1_audio_id: 'd', target2_audio_id: 'd', slot: { phraseId: 'x:S0003L01B01' } },
    { seed_number: 2, target_text: 'ir', target1_audio_id: 'b', target2_audio_id: null, slot: { seedNumber: 2 } },
  ]
  it('selects only off-cast TTS slots and groups them', () => {
    const asks = staleAsks(rows, clips, cast)
    expect(asks.map((a) => [a.role, a.text, a.firstSeed, a.slots.length])).toEqual([
      ['target1', 'mucho', 3, 2],
      ['target2', 'mucho', 3, 1],
    ])
    expect(asks[0].slots.map((s) => s.current).sort()).toEqual(['a', 'd'])
  })
  it('treats a spend-guard refusal as the answer', () => {
    expect(isStop({ status: 402, body: {} })).toBe(true)
    expect(isStop({ status: 200, body: { code: 'DAILY_TOTAL_CAP' } })).toBe(true)
    expect(isStop({ status: 500, body: { ok: false } })).toBe(false)
  })
  // job #864: por_for_eng stores Azure Raquel/Duarte but its language cast resolves to Cartesia Mariana/Matias; the cast wins
  it('takes the resolved cast over a stale stored Azure row, and stops when nothing is Cartesia', () => {
    const az = (n) => ({ provider: 'azure', voiceId: `pt-PT-${n}Neural` })
    const vc = {
      stored: { voices: { target1: az('Raquel'), target2: az('Duarte') } },
      resolved: { voices: { target1: { provider: 'cartesia', voiceId: 'cartesia_d93' }, target2: { provider: 'cartesia', voiceId: 'b1d' } } },
    }
    expect(castFromVoiceConfig(vc)).toEqual({ castByRole: { target1: 'cartesia_d93', target2: 'cartesia_b1d' }, missing: null })
    expect(castFromVoiceConfig({ stored: vc.stored }).missing.role).toBe('target1')
  })
})

// Tom 2026-10-17: every repoint keeps the old pointer so any course can be rolled back
describe('rollbackLines', () => {
  it('records old and new pointer per slot, one JSON line each', () => {
    const out = rollbackLines('ita_for_eng', [{ seedNumber: 3, role: 'target1', audioId: 'N1', expectCurrent: 'O1' }, { phraseId: 'p9', role: 'target2', audioId: 'N2', expectCurrent: 'O2' }], 'T')
    const rows = out.trim().split('\n').map((l) => JSON.parse(l))
    expect(rows).toEqual([
      { at: 'T', course: 'ita_for_eng', seedNumber: 3, role: 'target1', old: 'O1', new: 'N1' },
      { at: 'T', course: 'ita_for_eng', phraseId: 'p9', role: 'target2', old: 'O2', new: 'N2' },
    ])
  })
})

// job #366: a clip with a tail click (or one the audit cannot measure) is not swapped in
describe('tailVerdict', () => {
  it('passes clean, refuses click and unmeasurable', () => {
    expect(tailVerdict('{"click":false,"tail_spike":3,"end_abs":0.01}')).toBeNull()
    expect(tailVerdict('{"click":true,"tail_spike":40,"end_abs":0.2}')).toMatch(/tail click/)
    expect(tailVerdict('{"error":"short"}')).toMatch(/error/)
    expect(tailVerdict('')).toMatch(/nothing/)
  })
})
