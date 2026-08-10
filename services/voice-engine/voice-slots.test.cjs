/**
 * Unit tests: human voice-id minting + surgical voice_config slot merge.
 * Run: npx vitest run services/voice-engine
 */

import { describe, it, expect } from 'vitest'

const {
  emailLocalPart,
  targetLangFromCourseCode,
  voiceIdBase,
  isOwnMint,
  mintVoiceId,
  assignVoiceToSlot,
  vacateSlot,
  findSlotForVoice,
  findSlotForMember,
  slotSummary,
  holdsCourse,
} = require('./voice-slots.cjs')

// Real-shaped fixture — mirrors the live zho_for_eng courses.voice_config
// (audit 06 §3.1). The merge MUST preserve every key outside the touched slot.
function liveShapedConfig() {
  return {
    version: '1.0',
    courseCode: 'zho_for_eng',
    voices: {
      known: { provider: 'azure', voiceId: 'en-GB-SoniaNeural', language: 'en-GB', settings: { speed: 0.95 } },
      target1: { provider: 'azure', voiceId: 'zh-CN-XiaoxiaoMultilingualNeural', settings: { speed: 0.8 } },
      target2: { provider: 'azure', voiceId: 'zh-CN-YunyiMultilingualNeural', settings: { speed: 0.8 } },
      presentation: { provider: 'azure', voiceId: 'en-GB-SoniaNeural', language: 'en-GB', settings: { speed: 0.95 } },
    },
    providers: {
      azure: { enabled: true, apiKeyEnvVar: 'AZURE_SPEECH_KEY', regionEnvVar: 'AZURE_SPEECH_REGION' },
      elevenlabs: { enabled: true, apiKeyEnvVar: 'ELEVENLABS_API_KEY' },
    },
    cadenceProfiles: {
      fast: { speedMultiplier: 1.2, pauseMs: 0, description: 'Slightly faster pace' },
      slow: { speedMultiplier: 0.75, pauseMs: 500, description: 'Slower pace for learning' },
      natural: { speedMultiplier: 1.0, pauseMs: 0, description: 'Normal speaking pace' },
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  }
}

// ── voice_id minting ─────────────────────────────────────────────────────────

describe('emailLocalPart', () => {
  it('extracts and sanitizes the local part', () => {
    expect(emailLocalPart('maria@example.com')).toBe('maria')
    expect(emailLocalPart('Maria.Petrova+rec@example.com')).toBe('maria_petrova_rec')
    expect(emailLocalPart('richard-x@a.b.c')).toBe('richard_x')
  })
  it('is safe on empty input', () => {
    expect(emailLocalPart('')).toBe('')
    expect(emailLocalPart(null)).toBe('')
  })
})

describe('targetLangFromCourseCode', () => {
  it('takes the target-language segment before _for_', () => {
    expect(targetLangFromCourseCode('mkd_for_fra')).toBe('mkd')
    expect(targetLangFromCourseCode('zho_for_eng')).toBe('zho')
  })
  it('keeps multi-segment target codes whole', () => {
    expect(targetLangFromCourseCode('cym_n_for_eng')).toBe('cym_n')
  })
})

describe('voiceIdBase / isOwnMint', () => {
  it('builds human_{localpart}_{target lang}', () => {
    expect(voiceIdBase('maria@a.com', 'mkd_for_fra')).toBe('human_maria_mkd')
  })
  it('recognises its own mints incl. collision suffixes', () => {
    expect(isOwnMint('human_maria_mkd', 'maria@a.com', 'mkd_for_fra')).toBe(true)
    expect(isOwnMint('human_maria_mkd_2', 'maria@a.com', 'mkd_for_fra')).toBe(true)
    expect(isOwnMint('human_maria_fra', 'maria@a.com', 'mkd_for_fra')).toBe(false)
    expect(isOwnMint('human_maria_mkd_x', 'maria@a.com', 'mkd_for_fra')).toBe(false)
    expect(isOwnMint(null, 'maria@a.com', 'mkd_for_fra')).toBe(false)
  })
})

describe('mintVoiceId', () => {
  it('returns the base id when free', async () => {
    const id = await mintVoiceId({ email: 'maria@a.com', courseCode: 'mkd_for_fra', isTaken: () => false })
    expect(id).toBe('human_maria_mkd')
  })
  it('suffixes _2, _3 on collision (two Marias, different emails)', async () => {
    const taken = new Set(['human_maria_mkd', 'human_maria_mkd_2'])
    const id = await mintVoiceId({ email: 'maria@b.com', courseCode: 'mkd_for_fra', isTaken: c => taken.has(c) })
    expect(id).toBe('human_maria_mkd_3')
  })
  it('supports async isTaken', async () => {
    const id = await mintVoiceId({
      email: 'maria@a.com',
      courseCode: 'mkd_for_fra',
      isTaken: async c => c === 'human_maria_mkd',
    })
    expect(id).toBe('human_maria_mkd_2')
  })
})

// ── voice_config merge (MUST be non-destructive) ────────────────────────────

describe('assignVoiceToSlot', () => {
  it('writes only the one slot: provider human + minted voiceId', () => {
    const next = assignVoiceToSlot(liveShapedConfig(), 'target1', 'human_maria_mkd')
    expect(next.voices.target1.provider).toBe('human')
    expect(next.voices.target1.voiceId).toBe('human_maria_mkd')
  })

  it('preserves EVERY other key exactly (live-shaped fixture)', () => {
    const original = liveShapedConfig()
    const next = assignVoiceToSlot(original, 'target1', 'human_maria_mkd')

    // Untouched siblings byte-identical
    expect(next.voices.known).toEqual(original.voices.known)
    expect(next.voices.target2).toEqual(original.voices.target2)
    expect(next.voices.presentation).toEqual(original.voices.presentation)
    // Top-level keys preserved
    expect(next.providers).toEqual(original.providers)
    expect(next.cadenceProfiles).toEqual(original.cadenceProfiles)
    expect(next.version).toBe(original.version)
    expect(next.createdAt).toBe(original.createdAt)
    expect(next.updatedAt).toBe(original.updatedAt)
    // No keys lost or invented at the top level
    expect(Object.keys(next).sort()).toEqual(Object.keys(original).sort())
    // Slot-internal keys (settings) preserved
    expect(next.voices.target1.settings).toEqual(original.voices.target1.settings)
  })

  it('does not mutate the input object', () => {
    const original = liveShapedConfig()
    const snapshot = JSON.parse(JSON.stringify(original))
    assignVoiceToSlot(original, 'target2', 'human_richard_zho')
    expect(original).toEqual(snapshot)
  })

  it('stashes the displaced TTS voice under previousVoice', () => {
    const next = assignVoiceToSlot(liveShapedConfig(), 'target1', 'human_maria_zho')
    expect(next.voices.target1.previousVoice).toEqual({
      provider: 'azure',
      voiceId: 'zh-CN-XiaoxiaoMultilingualNeural',
    })
  })

  it('carries previousVoice forward when replacing one human with another', () => {
    const first = assignVoiceToSlot(liveShapedConfig(), 'target1', 'human_maria_zho')
    const second = assignVoiceToSlot(first, 'target1', 'human_petar_zho')
    expect(second.voices.target1.voiceId).toBe('human_petar_zho')
    expect(second.voices.target1.previousVoice).toEqual({
      provider: 'azure',
      voiceId: 'zh-CN-XiaoxiaoMultilingualNeural',
    })
  })

  it('handles a null voice_config (course never configured) without inventing siblings', () => {
    const next = assignVoiceToSlot(null, 'target2', 'human_maria_mkd')
    // `name` is now always written (it defaults to the voice id when no
    // person name is supplied) — a slot with no name at all shows as blank
    // in every voice UI.
    expect(next.voices.target2).toEqual({ provider: 'human', voiceId: 'human_maria_mkd', name: 'human_maria_mkd' })
    expect(Object.keys(next)).toEqual(['voices'])
    expect(Object.keys(next.voices)).toEqual(['target2'])
  })

  // deu_at_for_eng, 2026-08: Sascha held target2 while every voice UI still
  // announced "Jonas — HUMAN" (the Azure voice she displaced), so a leader
  // could not see or pick their own cast.
  it('names the slot after the PERSON, not the TTS voice they displaced', () => {
    const config = liveShapedConfig()
    config.voices.target2.name = 'Yunyi'
    config.voices.target2.gender = 'Male'
    const next = assignVoiceToSlot(config, 'target2', 'human_sasha_zho', 'sasha@a.com', 'Sasha')
    expect(next.voices.target2.name).toBe('Sasha')
    expect('gender' in next.voices.target2).toBe(false)
    // ...and the displaced voice's own name/gender survive for the restore.
    expect(next.voices.target2.previousVoice).toEqual({
      provider: 'azure',
      voiceId: 'zh-CN-YunyiMultilingualNeural',
      name: 'Yunyi',
      gender: 'Male',
    })
  })

  it('falls back to the email local part, then the voice id, for the display name', () => {
    const byEmail = assignVoiceToSlot(liveShapedConfig(), 'target1', 'human_kai_zho', 'kai@a.com')
    expect(byEmail.voices.target1.name).toBe('kai')
    const byVoiceId = assignVoiceToSlot(liveShapedConfig(), 'target1', 'human_kai_zho')
    expect(byVoiceId.voices.target1.name).toBe('human_kai_zho')
  })

  it('vacating restores the TTS voice complete with its own name and gender', () => {
    const config = liveShapedConfig()
    config.voices.target2.name = 'Yunyi'
    config.voices.target2.gender = 'Male'
    const assigned = assignVoiceToSlot(config, 'target2', 'human_sasha_zho', 'sasha@a.com', 'Sasha')
    const vacated = vacateSlot(assigned, 'target2')
    expect(vacated.voices.target2).toMatchObject({
      provider: 'azure',
      voiceId: 'zh-CN-YunyiMultilingualNeural',
      name: 'Yunyi',
      gender: 'Male',
    })
    // The person leaves nothing behind.
    expect('assignedEmail' in vacated.voices.target2).toBe(false)
    expect('previousVoice' in vacated.voices.target2).toBe(false)
  })

  it('vacating a slot that never had a TTS name leaves no stale human name', () => {
    const assigned = assignVoiceToSlot(liveShapedConfig(), 'target1', 'human_kai_zho', 'kai@a.com', 'Kai')
    const vacated = vacateSlot(assigned, 'target1')
    expect(vacated.voices.target1.voiceId).toBe('zh-CN-XiaoxiaoMultilingualNeural')
    expect('name' in vacated.voices.target1).toBe(false)
  })

  it('rejects non-target slots and missing voiceId', () => {
    expect(() => assignVoiceToSlot(liveShapedConfig(), 'known', 'human_x_y')).toThrow()
    expect(() => assignVoiceToSlot(liveShapedConfig(), 'presentation', 'human_x_y')).toThrow()
    expect(() => assignVoiceToSlot(liveShapedConfig(), 'target1', '')).toThrow()
  })
})

describe('vacateSlot', () => {
  it('restores the stashed previousVoice', () => {
    const assigned = assignVoiceToSlot(liveShapedConfig(), 'target1', 'human_maria_zho')
    const restored = vacateSlot(assigned, 'target1')
    expect(restored.voices.target1.provider).toBe('azure')
    expect(restored.voices.target1.voiceId).toBe('zh-CN-XiaoxiaoMultilingualNeural')
    expect(restored.voices.target1.previousVoice).toBeUndefined()
    // settings survived the round trip
    expect(restored.voices.target1.settings).toEqual({ speed: 0.8 })
    // siblings untouched
    expect(restored.voices.target2).toEqual(liveShapedConfig().voices.target2)
  })

  it('round-trips to the original config exactly (assign then vacate)', () => {
    const original = liveShapedConfig()
    const roundTripped = vacateSlot(assignVoiceToSlot(original, 'target1', 'human_maria_zho'), 'target1')
    expect(roundTripped).toEqual(original)
  })

  it('leaves an empty default-shaped slot when there was no previousVoice', () => {
    const assigned = assignVoiceToSlot(null, 'target1', 'human_maria_mkd')
    const vacated = vacateSlot(assigned, 'target1')
    expect(vacated.voices.target1).toEqual({ provider: 'azure', voiceId: '' })
  })

  it('is a no-op on a slot not held by a human', () => {
    const original = liveShapedConfig()
    expect(vacateSlot(original, 'target2')).toEqual(original)
  })
})

describe('findSlotForVoice / slotSummary', () => {
  it('finds which slot a human voice holds', () => {
    const config = assignVoiceToSlot(liveShapedConfig(), 'target2', 'human_maria_zho')
    expect(findSlotForVoice(config, 'human_maria_zho')).toBe('target2')
    expect(findSlotForVoice(config, 'human_other_zho')).toBeNull()
    expect(findSlotForVoice(config, null)).toBeNull()
  })

  it('summarises both target slots', () => {
    const config = assignVoiceToSlot(liveShapedConfig(), 'target1', 'human_maria_zho')
    const summary = slotSummary(config)
    expect(summary).toHaveLength(2)
    expect(summary[0]).toEqual({ slot: 'target1', provider: 'human', voiceId: 'human_maria_zho', isHuman: true, assignedEmail: null })
    expect(summary[1].isHuman).toBe(false)
    expect(slotSummary(null).every(s => s.voiceId === null)).toBe(true)
  })
})

// assignedEmail is the per-course "who holds this slot" record — it must
// survive the same person being re-minted on a second course (which
// overwrites the single dashboard_users.voice_id column).
describe('assignedEmail on the slot', () => {
  it('assign stores it; vacate strips it; round-trip stays exact', () => {
    const original = liveShapedConfig()
    const assigned = assignVoiceToSlot(original, 'target1', 'human_maria_zho', 'maria@a.com')
    expect(assigned.voices.target1.assignedEmail).toBe('maria@a.com')
    expect(slotSummary(assigned)[0].assignedEmail).toBe('maria@a.com')
    expect(vacateSlot(assigned, 'target1')).toEqual(original)
  })

  it('findSlotForMember matches by email even after the voice_id was re-minted elsewhere', () => {
    const config = assignVoiceToSlot(liveShapedConfig(), 'target1', 'human_maria_zho', 'maria@a.com')
    // Maria later got assigned on mkd_for_fra → dashboard_users.voice_id is now human_maria_mkd.
    expect(findSlotForMember(config, { email: 'maria@a.com', voiceId: 'human_maria_mkd' })).toBe('target1')
    // Voice-id fallback still works for configs written before assignedEmail existed.
    const legacy = assignVoiceToSlot(liveShapedConfig(), 'target2', 'human_petar_zho')
    expect(findSlotForMember(legacy, { email: 'petar@a.com', voiceId: 'human_petar_zho' })).toBe('target2')
    // Someone else's slot is never claimed.
    expect(findSlotForMember(config, { email: 'other@a.com', voiceId: 'human_other_xxx' })).toBeNull()
  })
})

describe('holdsCourse', () => {
  it('handles wildcard, arrays, and junk', () => {
    expect(holdsCourse('*', 'mkd_for_fra')).toBe(true)
    expect(holdsCourse(['mkd_for_fra'], 'mkd_for_fra')).toBe(true)
    expect(holdsCourse(['zho_for_eng'], 'mkd_for_fra')).toBe(false)
    expect(holdsCourse(null, 'mkd_for_fra')).toBe(false)
    expect(holdsCourse('mkd_for_fra', 'mkd_for_fra')).toBe(false) // bare string ≠ array
  })
})
