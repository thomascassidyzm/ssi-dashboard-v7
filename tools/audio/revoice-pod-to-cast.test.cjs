import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const { podAsks } = createRequire(import.meta.url)('./revoice-pod-to-cast.cjs')

// job #864: every target clip of a pod line (the line's clip and its sentence / take-G arrays) moves to the cast voice of the
// speaker's sex; cast and human clips stay; one ask per (role, voice, words)
describe('revoice-pod-to-cast', () => {
  const cast = { target1: 'cartesia_f1', target2: 'cartesia_m1' }
  const clips = new Map([
    ['t', { id: 't', text: 'Bom dia, Sarah! Tudo bem?', voice_id: 'rex', origin: 'tts', role: 'target1' }],
    ['s1', { id: 's1', text: 'Bom dia, Sarah!', voice_id: 'rex', origin: 'tts', role: 'target1' }],
    ['g1', { id: 'g1', text: 'Bom dia, [pause] Sarah!', voice_id: 'rex', origin: 'tts', role: 'pod_take_g' }],
    ['e', { id: 'e', text: 'Olá!', voice_id: 'xai_eve', origin: 'tts', role: 'target1' }],
    ['done', { id: 'done', text: 'Sim.', voice_id: 'f1', origin: 'tts', role: 'target1' }],
    ['h', { id: 'h', text: 'Não.', voice_id: 'human_x', origin: 'human', role: 'target1' }],
    ['u', { id: 'u', text: 'Talvez.', voice_id: 'mystery', origin: 'tts', role: 'target1' }],
  ])
  const rows = [
    { id: 'p:2', speaker: 'Sarah', global_order: 2, target_audio_id: 'e', sentence_audio_ids: ['done', 'h'], takeg_audio_ids: null },
    { id: 'p:1', speaker: 'João', global_order: 1, target_audio_id: 't', sentence_audio_ids: ['s1'], takeg_audio_ids: ['g1'] },
    { id: 'p:3', speaker: 'Nobody', global_order: 3, target_audio_id: 'u', sentence_audio_ids: [], takeg_audio_ids: [] },
  ]
  it('moves off-cast TTS clips by speaker sex, keeps take-G role, skips what it cannot sex', () => {
    const { asks, skipped } = podAsks(rows, clips, { João: 'm', Sarah: 'f' }, cast)
    expect(asks.map((a) => [a.role, a.voice, a.text, a.slots.map((s) => s.role).join()])).toEqual([
      ['target2', 'cartesia_m1', 'Bom dia, Sarah! Tudo bem?', 'target'],
      ['target2', 'cartesia_m1', 'Bom dia, Sarah!', 'segment'],
      ['pod_take_g', 'cartesia_m1', 'Bom dia, [pause] Sarah!', 'takeg'],
      ['target1', 'cartesia_f1', 'Olá!', 'target'],
    ])
    expect(skipped).toHaveLength(1)
  })
})

// F49b: link-clip refuses more than 500 links per request, and a flush can hold more than that
describe('chunkLinks', () => {
  it('splits 1,203 links into requests of at most 500, keeping order and losing none', async () => {
    const { createRequire } = await import('node:module')
    const { chunkLinks } = createRequire(import.meta.url)('./revoice-pod-to-cast.cjs')
    const links = Array.from({ length: 1203 }, (_, i) => i)
    const parts = chunkLinks(links)
    expect(parts.map((p) => p.length)).toEqual([500, 500, 203])
    expect(parts.flat()).toEqual(links)
    expect(chunkLinks([])).toEqual([])
  })
})
