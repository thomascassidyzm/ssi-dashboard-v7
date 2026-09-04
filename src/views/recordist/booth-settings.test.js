// @vitest-environment jsdom
/**
 * The booth remembers how you left it — per artist AND per microphone.
 *
 * Tom, 2026-09-03: the settings did not survive, so he had to set them again
 * every time he opened the room. The cases below are the whole contract, and
 * the third one is why this is keyed per device rather than flat: a flat key
 * was what pinned a whole browser to a stale 'dry' profile on 2026-09-02.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { loadBoothSettings, saveBoothSettings, clearBoothSettings, micKeyFor, lastMicKey } from './booth-settings.js'

const TOM = 'human_tom_zzz'
const BUILT_IN = micKeyFor({ label: 'MacBook Air Microphone (Built-in)', deviceId: 'abc' })
const SNOWBALL = micKeyFor({ label: 'Blue Snowball', deviceId: 'def' })

describe('booth settings', () => {
  beforeEach(() => { localStorage.clear() })

  it('gives back nothing for an artist who has never been here', () => {
    expect(loadBoothSettings(TOM)).toBe(null)
  })

  it('is exactly as left, next time the room opens', () => {
    saveBoothSettings(TOM, BUILT_IN, { captureProfile: 'voice', autoAdvance: false, includeRecorded: true, maxSeed: 100 })
    const back = loadBoothSettings(TOM, BUILT_IN)
    expect(back.captureProfile).toBe('voice')
    expect(back.autoAdvance).toBe(false)
    expect(back.includeRecorded).toBe(true)
    expect(back.maxSeed).toBe(100)
    expect(back.source).toBe('device')
  })

  it('keeps two microphones apart — the raw tap is a fact about a mic', () => {
    saveBoothSettings(TOM, SNOWBALL, { captureProfile: 'dry', autoAdvance: true, includeRecorded: false, maxSeed: 30 })
    saveBoothSettings(TOM, BUILT_IN, { captureProfile: 'voice', autoAdvance: true, includeRecorded: false, maxSeed: 30 })
    expect(loadBoothSettings(TOM, SNOWBALL).captureProfile).toBe('dry')
    expect(loadBoothSettings(TOM, BUILT_IN).captureProfile).toBe('voice')
  })

  it('a mic never used here inherits nothing of its own', () => {
    saveBoothSettings(TOM, SNOWBALL, { captureProfile: 'dry', autoAdvance: true, includeRecorded: false, maxSeed: 30 })
    const fresh = loadBoothSettings(TOM, micKeyFor({ label: 'Some USB thing' }))
    // It falls back to the last session so the room is not blank — but it says
    // so, and the caller only overrides an on-screen choice for source:'device'.
    expect(fresh.source).toBe('last-session')
  })

  it('falls back to the last session when the mic is not known yet', () => {
    saveBoothSettings(TOM, BUILT_IN, { captureProfile: 'voice', autoAdvance: false, includeRecorded: false, maxSeed: 50 })
    const back = loadBoothSettings(TOM)
    expect(back.maxSeed).toBe(50)
    expect(back.source).toBe('last-session')
    expect(lastMicKey(TOM)).toBe(BUILT_IN)
  })

  it('names a mic by its label, so a rotated deviceId is not a new microphone', () => {
    expect(micKeyFor({ label: 'Blue Snowball', deviceId: 'one' }))
      .toBe(micKeyFor({ label: 'Blue Snowball', deviceId: 'two' }))
    expect(micKeyFor({ label: '', deviceId: 'raw-id' })).toBe('id:raw-id')
    expect(micKeyFor(null)).toBe('unknown-mic')
  })

  it('one artist forgetting does not forget another', () => {
    saveBoothSettings(TOM, BUILT_IN, { captureProfile: 'voice', autoAdvance: true, includeRecorded: false, maxSeed: 30 })
    saveBoothSettings('human_aran_cym_n', SNOWBALL, { captureProfile: 'dry', autoAdvance: true, includeRecorded: false, maxSeed: 30 })
    clearBoothSettings(TOM)
    expect(loadBoothSettings(TOM)).toBe(null)
    expect(loadBoothSettings('human_aran_cym_n').captureProfile).toBe('dry')
  })

  it('survives a browser that refuses localStorage', () => {
    const real = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new Error('private mode') },
    })
    expect(() => saveBoothSettings(TOM, BUILT_IN, { captureProfile: 'voice' })).not.toThrow()
    expect(loadBoothSettings(TOM)).toBe(null)
    Object.defineProperty(window, 'localStorage', real)
  })
})
