/**
 * CONSENT — the rules that stop a real person's voice being used without a yes.
 *
 * These are tested rather than trusted because every one of them is a rule Tom
 * stated in words, and the failure mode they prevent is silent: a consent field
 * that is optional is a consent field that is empty, and a screen that renders
 * "unknown" for a voice nobody asked about is a screen that has stopped saying
 * anything. Each test names the ruling it locks.
 */
import { describe, it, expect } from 'vitest'
import consent from './consent.cjs'

describe('the birth state — a clone from existing recordings', () => {
  it('is born awaiting authorisation, never authorised', () => {
    // Tom's amendment, 2026-08-31: "do NOT treat existing recordings as implied
    // permission — the voice starts marked as awaiting authorisation".
    const rec = consent.birthRecord({ person: 'Aran', recordedBy: 'tom@hey.com' })
    expect(rec.consent_status).toBe('awaiting_authorisation')
    expect(rec.consent_authorised_by).toBeNull()
    expect(rec.consent_authorised_at).toBeNull()
  })

  it('refuses to be created without naming whose voice it is', () => {
    // A record nobody can attach to a human is decorative on day one — there is
    // no one to go and ask.
    expect(() => consent.birthRecord({ person: '   ' })).toThrow(/Name whose voice this is/)
  })

  it('records the operator separately from the person', () => {
    const rec = consent.birthRecord({ person: 'Aran', recordedBy: 'tom@hey.com' })
    expect(rec.consent_person).toBe('Aran')
    expect(rec.consent_recorded_by).toBe('tom@hey.com')
    expect(rec.consent_authorised_by).not.toBe('tom@hey.com')
  })
})

describe('recording a decision — a yes cannot be invented', () => {
  const base = { person: 'Aran', authorisedBy: 'Aran', authorisedHow: 'in person', authorisedAt: '2026-09-01' }

  it('accepts a fully evidenced yes', () => {
    const rec = consent.decisionRecord({ status: 'authorised', ...base })
    expect(rec.consent_status).toBe('authorised')
    expect(rec.consent_authorised_at).toMatch(/^2026-09-01/)
  })

  it('refuses "authorised" with nobody named', () => {
    expect(() => consent.decisionRecord({ status: 'authorised', person: '', authorisedBy: '' }))
      .toThrow(/Name whose voice this is/)
  })

  it('refuses "authorised" with no means', () => {
    expect(() => consent.decisionRecord({ status: 'authorised', ...base, authorisedHow: '' }))
      .toThrow(/how they authorised it/i)
  })

  it('keeps a refusal apart from never having asked', () => {
    // "we never asked" and "they said no" are opposite facts and a voice must
    // never drift from the second back to the first.
    const no = consent.decisionRecord({ status: 'refused', person: 'Aran' })
    expect(no.consent_status).toBe('refused')
    expect(consent.describe(no).blocked).toBe(true)
    expect(consent.describe({ consent_status: 'not_recorded' }).blocked).toBe(false)
  })

  it('rejects a status it does not know', () => {
    expect(() => consent.decisionRecord({ status: 'probably', person: 'Aran' })).toThrow(/must be one of/)
  })
})

describe('what the screen is told', () => {
  it('never says "unknown"', () => {
    // Tom named a consent panel reading "unknown" as one of the three ways this
    // fails in front of Aran. "No consent recorded" is a fact; "unknown" is a bug.
    for (const status of consent.STATUSES) {
      const d = consent.describe({ consent_status: status, consent_person: 'Aran', consent_authorised_by: 'Aran', consent_authorised_at: '2026-09-01' })
      expect(d.summary.toLowerCase()).not.toContain('unknown')
      expect(d.label).toBeTruthy()
    }
  })

  it('treats a voice with no record at all as not_recorded, not as broken', () => {
    const d = consent.describe(null)
    expect(d.status).toBe('not_recorded')
    expect(d.summary).toBe('No consent recorded.')
    expect(d.authorised).toBe(false)
  })

  it('warns before casting anything that is not authorised, and only then', () => {
    expect(consent.describe({ consent_status: 'authorised', consent_person: 'Aran', consent_authorised_by: 'Aran', consent_authorised_at: '2026-09-01' }).castWarning).toBeNull()
    for (const status of ['not_recorded', 'awaiting_authorisation', 'refused', 'withdrawn']) {
      expect(consent.describe({ consent_status: status, consent_person: 'Aran' }).castWarning).toBeTruthy()
    }
  })

  it('draws the badge only for voices the question is about', () => {
    // 165 Azure stock rows reading "no consent recorded" would bury the handful
    // where a real person is behind the voice.
    expect(consent.describe({ type: 'tts', tts_engine: 'azure' }).aboutAPerson).toBe(false)
    expect(consent.describe({ type: 'human' }).aboutAPerson).toBe(true)
    expect(consent.describe({ metadata_source: 'cartesia-clone (Voice Lab)' }).aboutAPerson).toBe(true)
    expect(consent.describe({ type: 'tts', consent_status: 'awaiting_authorisation' }).aboutAPerson).toBe(true)
  })
})
