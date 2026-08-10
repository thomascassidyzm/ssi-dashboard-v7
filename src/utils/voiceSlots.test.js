import { describe, it, expect } from 'vitest'
import {
  resolveAssignedSlot,
  humanVoiceIdForSlot,
  slotVoiceName,
  slotLabel,
  recordableSlotOptions
} from './voiceSlots'

// The real deu_at_for_eng shape as of 2026-08-10: voice 1 is still Azure
// Ingrid, voice 2 is Sascha — and the slot's stale `name` still said Jonas,
// the TTS voice she displaced.
const DEU_AT = {
  voices: {
    known: { name: 'Eve', voiceId: 'eve', provider: 'xai' },
    target1: { name: 'Ingrid', voiceId: 'de-AT-IngridNeural', provider: 'azure' },
    target2: {
      name: 'Jonas',
      voiceId: 'human_sasha_wanasky_deu_at',
      provider: 'human',
      assignedEmail: 'sasha.wanasky@gmail.com',
      previousVoice: { voiceId: 'de-AT-JonasNeural', provider: 'azure' }
    },
    presentation: { name: 'Eve', voiceId: 'eve', provider: 'xai' }
  }
}

describe('resolveAssignedSlot', () => {
  it('finds the slot by assignedEmail — the recordist cast as voice 2 gets voice 2', () => {
    expect(resolveAssignedSlot(DEU_AT, { email: 'sasha.wanasky@gmail.com' })).toBe('target2')
  })

  it('returns null for someone with no slot rather than falling through to voice 1', () => {
    expect(resolveAssignedSlot(DEU_AT, { email: 'kai@example.com' })).toBeNull()
  })

  it('falls back to voice_id only for configs written before assignedEmail existed', () => {
    const legacy = { voices: { target2: { voiceId: 'human_maria_mkd', provider: 'human' } } }
    expect(resolveAssignedSlot(legacy, { email: 'maria@a.com', voiceId: 'human_maria_mkd' })).toBe('target2')
  })

  it('never matches a stale voice_id against a slot that names someone else', () => {
    // Sascha's slot carries assignedEmail, so another person whose latest mint
    // happens to equal that id cannot claim it.
    expect(resolveAssignedSlot(DEU_AT, { email: 'other@a.com', voiceId: 'human_sasha_wanasky_deu_at' })).toBeNull()
  })

  it('handles a missing or empty config', () => {
    expect(resolveAssignedSlot(null, { email: 'a@b.c' })).toBeNull()
    expect(resolveAssignedSlot({}, { email: 'a@b.c' })).toBeNull()
  })
})

describe('humanVoiceIdForSlot', () => {
  it('gives the human voice id for a slot a person holds', () => {
    expect(humanVoiceIdForSlot(DEU_AT, 'target2')).toBe('human_sasha_wanasky_deu_at')
  })

  it('gives NOTHING for a slot still holding its TTS voice', () => {
    // The deu_at defect: a real take stamped de-AT-IngridNeural.
    expect(humanVoiceIdForSlot(DEU_AT, 'target1')).toBeNull()
  })

  it('is null for an unknown slot or absent config', () => {
    expect(humanVoiceIdForSlot(DEU_AT, 'target3')).toBeNull()
    expect(humanVoiceIdForSlot(null, 'target1')).toBeNull()
  })
})

describe('slotVoiceName / slotLabel', () => {
  it('reads the slot name, falling back to email then voice id', () => {
    expect(slotVoiceName(DEU_AT, 'target1')).toBe('Ingrid')
    expect(slotVoiceName({ voices: { target1: { voiceId: 'v', provider: 'human', assignedEmail: 'a@b.c' } } }, 'target1'))
      .toBe('a@b.c')
    expect(slotVoiceName({ voices: { target1: { voiceId: 'v' } } }, 'target1')).toBe('v')
  })

  it('labels slots in the course\'s own languages, no jargon', () => {
    const langs = { targetLanguage: 'German', knownLanguage: 'English' }
    expect(slotLabel('target1', langs)).toBe('German — Voice 1')
    expect(slotLabel('target2', langs)).toBe('German — Voice 2')
    expect(slotLabel('known', langs)).toBe('English voice')
    expect(slotLabel('presentation', langs)).toBe('Presenter voice')
  })
})

describe('recordableSlotOptions', () => {
  it('lists only configured slots, each with the voice actually in it', () => {
    const opts = recordableSlotOptions(DEU_AT, { targetLanguage: 'German', knownLanguage: 'English' })
    expect(opts.map(o => o.slot)).toEqual(['target1', 'target2', 'known', 'presentation'])
    expect(opts.find(o => o.slot === 'target2')).toMatchObject({
      label: 'German — Voice 2',
      isHuman: true
    })
    expect(opts.find(o => o.slot === 'target1').isHuman).toBe(false)
  })

  it('omits slots with no voice configured', () => {
    const partial = { voices: { target1: { voiceId: 'x', provider: 'azure' }, target2: { voiceId: '', provider: 'azure' } } }
    expect(recordableSlotOptions(partial).map(o => o.slot)).toEqual(['target1'])
  })
})
