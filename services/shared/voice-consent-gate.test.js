/**
 * THE CONSENT BLOCK — the tests that stop it becoming a warning again.
 *
 * Tom's ruling, 2026-08-31: "we are never going to use a voice without
 * consent." The feature it replaced was a dialog you could click through, and
 * the way a hard block quietly turns back into a warning is that somebody adds
 * a caller that forgets to check. So the tests here are not about the happy
 * path; each one locks a specific way the gate could be got round.
 */
import { describe, it, expect } from 'vitest'
import gate from './voice-consent-gate.cjs'

const clone = (over = {}) => ({
  voice_id: 'cartesia_abc', type: 'tts', metadata_source: 'cartesia-clone (Voice Lab)',
  consent_status: 'not_recorded', display_name: 'Tom_002', ...over,
})

describe('who the gate is even about', () => {
  it('lets a vendor stock voice through — there is nobody behind it to ask', () => {
    const v = gate.verdict({ voiceId: 'azure_en-GB-SoniaNeural', voice: { type: 'tts', consent_status: 'not_recorded' } })
    expect(v.allowed).toBe(true)
    expect(v.aboutAPerson).toBe(false)
  })

  it('refuses a clone nobody has authorised', () => {
    const v = gate.verdict({ voiceId: 'cartesia_abc', voice: clone() })
    expect(v.allowed).toBe(false)
    expect(v.code).toBe('NO_RECORDED_CONSENT')
  })

  it('allows the clone once a real person has said yes', () => {
    const v = gate.verdict({ voiceId: 'cartesia_abc', voice: clone({ consent_status: 'authorised' }) })
    expect(v.allowed).toBe(true)
  })

  it('refuses a clone that is only AWAITING authorisation — the birth state', () => {
    // Every clone made from recordings the estate already holds is born here.
    // "We have not asked yet" is not a yes.
    const v = gate.verdict({ voiceId: 'cartesia_abc', voice: clone({ consent_status: 'awaiting_authorisation', consent_person: 'Aran' }) })
    expect(v.allowed).toBe(false)
    expect(v.message).toMatch(/Aran has not authorised/)
  })

  it('refuses a refusal and a withdrawal, and says so as a fact about a person', () => {
    for (const status of ['refused', 'withdrawn']) {
      const v = gate.verdict({ voiceId: 'cartesia_abc', voice: clone({ consent_status: status, consent_person: 'Catrin' }) })
      expect(v.allowed).toBe(false)
      expect(v.message).toMatch(/Catrin/)
    }
  })

  it('refuses a human_* voice with NO ROW AT ALL', () => {
    // `human_sasha_wanasky_deu_at` is cast into deu_at_for_eng today and has no
    // `voices` row. Knowing nothing about a person is the strongest reason to
    // refuse, never a reason to wave them through.
    const v = gate.verdict({ voiceId: 'human_sasha_wanasky_deu_at', voice: null })
    expect(v.allowed).toBe(false)
  })
})

describe('the sentence a human reads', () => {
  it('says what is missing and what to do, and blames nobody', () => {
    const { message } = gate.verdict({ voiceId: 'cartesia_abc', voice: clone() })
    expect(message).toMatch(/No consent is recorded/)
    expect(message).toMatch(/Record consent for this voice/)
    expect(message).not.toMatch(/error|invalid|failed|403|409/i)
  })

  it('names the person rather than an id wherever one is known', () => {
    const { message } = gate.verdict({ voiceId: 'cartesia_abc', voice: clone({ consent_person: 'Sasha' }) })
    expect(message).toMatch(/Sasha/)
    expect(message).not.toMatch(/cartesia_abc/)
  })
})

describe('the ways round it', () => {
  it('finds the row under EVERY spelling of a voice id', () => {
    // The registry holds `cartesia_e7ed…`; the render path is handed the bare
    // uuid. A single-spelling lookup would find nothing, call it a stock voice
    // and render the clone.
    const tried = gate.spellingsToTry('e7ed10ad-8aaa-41fd-b3a2-eb7d5e0b4bac', null)
    expect(tried).toContain('cartesia_e7ed10ad-8aaa-41fd-b3a2-eb7d5e0b4bac')
    expect(tried).toContain('e7ed10ad-8aaa-41fd-b3a2-eb7d5e0b4bac')
  })

  it('fails CLOSED when the consent record cannot be read', async () => {
    const db = { from: () => ({ select: () => ({ in: () => ({ limit: async () => ({ data: null, error: { message: 'connection refused' } }) }) }) }) }
    const v = await gate.verdictFor('cartesia_abc', { db, cache: new Map() })
    expect(v.allowed).toBe(false)
    expect(v.code).toBe('CONSENT_UNREADABLE')
  })

  it('throws a 409 carrying the reason, so a caller can branch without reading prose', async () => {
    const db = { from: () => ({ select: () => ({ in: () => ({ limit: async () => ({ data: [clone()], error: null }) }) }) }) }
    await expect(gate.assertConsented('cartesia_abc', { db, cache: new Map() })).rejects.toMatchObject({
      status: 409, code: 'NO_RECORDED_CONSENT',
    })
  })

  it('marks a TTS refusal as a client error so it is never retried', async () => {
    const db = { from: () => ({ select: () => ({ in: () => ({ limit: async () => ({ data: [clone()], error: null }) }) }) }) }
    await expect(gate.assertConsented('cartesia_abc', { db, tts: true, cache: new Map() }))
      .rejects.toThrow(/\(403\)/)
  })
})
