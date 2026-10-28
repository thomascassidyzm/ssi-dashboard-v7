/**
 * The cast voice's ElevenLabs settings reach a COURSE render (job #76·AA, Kai 2026-10-28): deu_at target1 is Tamara on
 * eleven_v4_turbo at stability 1.0, and before this both course paths dropped the model and phase8's render route the
 * stability too. A config that names none of them must render exactly as before.
 */
import { describe, it, expect } from 'vitest'

const { elevenLabsCastSettings } = require('./course-voice-config.cjs')
const { buildTTSConfig } = require('../voice-config-service.cjs')

const TAMARA = { name: 'Tamara', voiceId: 'elevenlabs_Zq8xdM7UEWBINjdZQdBE', provider: 'elevenlabs', language: 'de-AT', settings: { speed: 1, stability: 1, model: 'eleven_v4_turbo' } }
const CADENCES = { natural: { speedMultiplier: 1.0 } }

describe('elevenLabsCastSettings', () => {
  it('reads model and stability from the slot settings', () => {
    expect(elevenLabsCastSettings(TAMARA)).toEqual({ modelId: 'eleven_v4_turbo', stability: 1 })
  })
  it('returns nothing for a config that names nothing, so the house defaults stand', () => {
    expect(elevenLabsCastSettings({ voiceId: 'x', settings: { speed: 0.6 } })).toEqual({})
    expect(elevenLabsCastSettings(null)).toEqual({})
  })
  it('honours a stability of 0 and a similarityBoost', () => {
    expect(elevenLabsCastSettings({ settings: { stability: 0, similarityBoost: 0.9 } })).toEqual({ stability: 0, similarityBoost: 0.9 })
  })
  it('refuses a model off the allow-list and an out-of-range stability, loudly', () => {
    expect(() => elevenLabsCastSettings({ settings: { model: 'eleven_v4_trubo' } })).toThrow(/not one of/)
    expect(() => elevenLabsCastSettings({ settings: { stability: 1.5 } })).toThrow(/between 0 and 1/)
  })
})

describe('buildTTSConfig — ElevenLabs cast settings', () => {
  it('carries the cast model and stability to the provider config', () => {
    const cfg = buildTTSConfig({ ...TAMARA, voiceId: 'Zq8xdM7UEWBINjdZQdBE' }, 'natural', CADENCES, { explicitProvider: 'elevenlabs', language: 'de-AT' })
    expect(cfg).toMatchObject({ provider: 'elevenlabs', voiceId: 'Zq8xdM7UEWBINjdZQdBE', modelId: 'eleven_v4_turbo', stability: 1 })
  })
  it('leaves a config without a model on the house defaults (no modelId, stability 0.5)', () => {
    const cfg = buildTTSConfig({ provider: 'elevenlabs', voiceId: 'Zq8xdM7UEWBINjdZQdBE', language: 'de-AT', settings: { speed: 1 } }, 'natural', CADENCES, { explicitProvider: 'elevenlabs', language: 'de-AT' })
    expect(cfg.modelId).toBeUndefined()
    expect(cfg.stability).toBe(0.5)
    expect(cfg.similarityBoost).toBe(0.75)
  })
})
