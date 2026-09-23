import { describe, it, expect } from 'vitest'
import pkg from './voice-loudness.cjs'
const { loudnessOffsetDb, masteringTargetLufs, offsetOfVoiceRow, HOUSE_TARGET_LUFS } = pkg

const voices = [
  { voice_id: 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121', display_name: 'Charlotte', loudness_offset_db: 5 },
  { voice_id: 'cartesia_62ae83ad-4f6a-430b-af41-a9bede9286ca', display_name: 'Gemma', loudness_offset_db: 0 },
  { voice_id: 'xai_eve', display_name: 'Eve' },                      // column absent
  { voice_id: 'cartesia_typo', display_name: 'Typo', loudness_offset_db: 40 },
]

describe('per-voice loudness offset (Kai, 2026-09-23: Charlotte +5 dB)', () => {
  it('Charlotte masters 5 dB above the house target', () => {
    expect(loudnessOffsetDb(voices, 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121')).toBe(5)
    expect(masteringTargetLufs(5)).toBe(-11)
  })
  it('finds the voice under its bare provider spelling too', () => {
    expect(loudnessOffsetDb(voices, '71a7ad14-091c-4e8e-a314-022ece01c121', 'cartesia')).toBe(5)
  })
  it('Gemma, a voice with no column, and an unknown voice all stay at the house target', () => {
    expect(loudnessOffsetDb(voices, 'cartesia_62ae83ad-4f6a-430b-af41-a9bede9286ca')).toBe(0)
    expect(loudnessOffsetDb(voices, 'xai_eve')).toBe(0)
    expect(loudnessOffsetDb(voices, 'nobody')).toBe(0)
    expect(masteringTargetLufs(0)).toBe(HOUSE_TARGET_LUFS)
    expect(masteringTargetLufs(undefined)).toBe(-16)
  })
  it('clamps a wild offset so a typo cannot master a course at -4 LUFS', () => {
    expect(loudnessOffsetDb(voices, 'cartesia_typo')).toBe(12)
    expect(masteringTargetLufs(40)).toBe(-4)
    expect(offsetOfVoiceRow({ loudness_offset_db: 'abc' })).toBe(0)
  })
})
