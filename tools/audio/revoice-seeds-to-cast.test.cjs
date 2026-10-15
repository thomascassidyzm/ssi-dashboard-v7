import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const { staleAsks, isStop } = createRequire(import.meta.url)('./revoice-seeds-to-cast.cjs')

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
})
