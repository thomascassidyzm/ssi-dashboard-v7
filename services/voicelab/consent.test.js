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

describe('the declaration block — what the person actually agreed to', () => {
  // Tom, 2026-09-01: the words read aloud or ticked ARE the consent record, so
  // describe() has to be able to produce them. Stored per voice and rendered
  // from the row, never from the code's current copy of the wording — that is
  // the whole reason the column exists.

  it('is null for a voice that never had one', () => {
    // Every voice cloned before there was a phrase to read, and every
    // clone-from-estate, where no live speaker is present to declare anything.
    // Null, not an empty block: an empty block reads like a missing one.
    expect(consent.describe({ consent_status: 'awaiting_authorisation', consent_person: 'Aran' }).declaration).toBeNull()
    expect(consent.describe({}).declaration).toBeNull()
  })

  it('carries the words and the evidence for a spoken declaration', () => {
    const d = consent.describe({
      consent_status: 'authorised',
      consent_person: 'Aran',
      consent_authorised_by: 'Aran',
      consent_declaration: 'This is my own voice, and I am happy for SaySomethingin to copy it.',
      consent_declaration_kind: 'spoken',
      consent_declaration_heard: 'this is my own voice and i am happy for say something in to copy it',
    })
    expect(d.declaration.kind).toBe('spoken')
    expect(d.declaration.words).toBe('This is my own voice, and I am happy for SaySomethingin to copy it.')
    // The evidence, so a human can disagree with the machine's reading later.
    expect(d.declaration.heard).toMatch(/say something in/)
  })

  it('carries no "heard" for an attestation, because nothing was listened to', () => {
    const d = consent.describe({
      consent_status: 'authorised',
      consent_person: 'Aran',
      consent_authorised_by: 'tom@hey.com',
      consent_declaration: 'This is my own voice, or I have the right to use this recording.',
      consent_declaration_kind: 'attested',
      consent_declaration_heard: null,
    })
    expect(d.declaration.kind).toBe('attested')
    expect(d.declaration.heard).toBeNull()
  })

  it('changes nothing else describe() already said', () => {
    // The declaration block is additive. A voice with one is still described by
    // every field the 2026-08-31 screen renders, with the same values.
    const voice = {
      type: 'tts',
      metadata_source: 'cartesia-clone (Voice Lab)',
      consent_status: 'authorised',
      consent_person: 'Aran',
      consent_authorised_by: 'Aran',
      consent_authorised_how: 'read the consent line aloud on the recording',
      consent_authorised_at: '2026-09-01T10:00:00.000Z',
      consent_recorded_by: 'tom@hey.com',
      consent_source: 'recorded in the browser',
    }
    const before = consent.describe(voice)
    const after = consent.describe({ ...voice, consent_declaration: 'x', consent_declaration_kind: 'spoken' })
    for (const k of Object.keys(before)) {
      if (k === 'declaration') continue
      expect(after[k]).toEqual(before[k])
    }
    expect(after.authorised).toBe(true)
    expect(after.castWarning).toBeNull()
    expect(after.summary).toMatch(/Aran authorised this voice/)
  })
})

describe('the columns a read needs', () => {
  it('asks for the declaration columns, or describe() can never see them', () => {
    // A SELECT that omits a column makes describe() silently answer null for it
    // — the failure is invisible and the screen just stops mentioning consent.
    for (const c of ['consent_declaration', 'consent_declaration_kind', 'consent_declaration_heard']) {
      expect(consent.COLUMNS).toContain(c)
    }
  })
})
