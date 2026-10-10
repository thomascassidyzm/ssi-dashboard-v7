/**
 * Tom 2026-10-10 02:36Z (r-2026-10-10-no-clip-is-rendered-in-any): "No clips should be being made in ANY
 * course I haven't set Cartesia voices for." phase8 /generate plans with partitionByCast, so an uncast
 * role/language is logged once and never counted as planned spend or as a failure.
 */
import { describe, it, expect, afterEach } from 'vitest'
import gate from './voice-cast-gate.cjs'
const { partitionByCast, useCastRows, useCourseVoiceHolder } = gate

const CHARLOTTE = 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121'

describe('partitionByCast — the eng_for_sin shape (target English cast, known Sinhala uncast)', () => {
  afterEach(() => { useCastRows(null); useCourseVoiceHolder(null) })
  it('keeps the cast English items, sets aside the uncast Sinhala ones, one summary line per role/voice', async () => {
    useCastRows([{ language: 'eng', voice_id: CHARLOTTE }]); useCourseVoiceHolder(async () => true)
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
})
