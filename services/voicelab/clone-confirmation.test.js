/**
 * CLONE CONFIRMATION — the second stamp, and the fact that nothing is castable
 * without it.
 *
 * These are Tom's rules stated as tests, and the two that carry the weight are
 * the two a refactor could quietly lose: a declared-but-unheard clone must be
 * refused by the SAME block that refuses every other unconsented voice, and the
 * reject must write something as final as the confirm does.
 */
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const confirmation = require('./clone-confirmation.cjs')
const consent = require('./consent.cjs')
const gate = require('../shared/voice-consent-gate.cjs')

const DECLARED = {
  consent_status: 'awaiting_authorisation',
  consent_person: 'Aran',
  consent_declaration_kind: 'spoken',
  consent_declaration: 'I agree to my voice being recorded and cloned.',
  consent_declaration_heard: 'i agree to my voice being recorded and cloned',
}

describe('the two ways of being unconsented', () => {
  it('tells a declared-but-unheard clone apart from one nobody has asked', () => {
    expect(confirmation.stageOf(DECLARED)).toBe('awaiting_hearing')
    expect(confirmation.stageOf({ consent_status: 'awaiting_authorisation', consent_person: 'Aran' })).toBe('unasked')
  })

  it('reads confirmed, rejected and withdrawn off the same status ladder', () => {
    expect(confirmation.stageOf({ ...DECLARED, consent_status: 'authorised' })).toBe('confirmed')
    expect(confirmation.stageOf({ ...DECLARED, consent_status: 'refused' })).toBe('rejected')
    expect(confirmation.stageOf({ ...DECLARED, consent_status: 'withdrawn' })).toBe('withdrawn')
  })
})

describe('the declaration is held one stamp short', () => {
  it('keeps the words and the kind, and holds back only the authorisation', () => {
    const declarationRecord = {
      consent_status: 'authorised',
      consent_declaration: DECLARED.consent_declaration,
      consent_declaration_kind: 'spoken',
      consent_declaration_heard: DECLARED.consent_declaration_heard,
      consent_authorised_by: 'Aran',
      consent_authorised_how: 'read the line aloud',
      consent_authorised_at: '2026-08-31T10:00:00.000Z',
    }
    const held = confirmation.awaitingHearing(declarationRecord)
    expect(held.consent_status).toBe('awaiting_authorisation')
    expect(held.consent_declaration).toBe(declarationRecord.consent_declaration)
    expect(held.consent_declaration_heard).toBe(declarationRecord.consent_declaration_heard)
    expect(held.consent_authorised_by).toBeNull()
    expect(held.consent_authorised_how).toBeNull()
    expect(held.consent_authorised_at).toBeNull()
    expect(consent.isAuthorised(held)).toBe(false)
  })

  it('refuses to build a voice with no declaration at all', () => {
    expect(() => confirmation.awaitingHearing(null)).toThrow(/without a recorded declaration/i)
  })
})

describe('the block refuses a clone that has not been heard', () => {
  const held = { ...DECLARED, type: 'human' }

  it('refuses it exactly as it refuses any other unconsented voice', () => {
    const v = gate.verdict({ voiceId: 'cartesia_abc', voice: held })
    expect(v.allowed).toBe(false)
    expect(v.code).toBe('NO_RECORDED_CONSENT')
  })

  it('says which step is missing, without asking again for the one already done', () => {
    const v = gate.verdict({ voiceId: 'cartesia_abc', voice: held })
    expect(v.message).toMatch(/agreed at sign-up but has not heard this clone yet/i)
    expect(v.message).not.toMatch(/Record their consent/i)
  })

  it('allows it the moment the confirmation is written, and nothing else changed', () => {
    const confirmed = { ...held, ...confirmation.confirmedRecord({ voice: held, now: new Date('2026-08-31T12:00:00Z') }) }
    const v = gate.verdict({ voiceId: 'cartesia_abc', voice: confirmed })
    expect(v.allowed).toBe(true)
    expect(confirmed.consent_authorised_by).toBe('Aran')
    expect(confirmed.consent_authorised_how).toBe(confirmation.CONFIRMED_HOW)
    expect(confirmed.consent_authorised_at).toBe('2026-08-31T12:00:00.000Z')
  })
})

describe('hearing it in order to decide', () => {
  it('is allowed for a declared clone waiting to be heard', () => {
    expect(confirmation.isHearableForDecision(DECLARED)).toBe(true)
  })

  it('is not a way to play a voice somebody has said no to', () => {
    expect(confirmation.isHearableForDecision({ ...DECLARED, consent_status: 'refused' })).toBe(false)
    expect(confirmation.isHearableForDecision({ ...DECLARED, consent_status: 'withdrawn' })).toBe(false)
  })

  it('is not a way to play a voice nobody has declared for', () => {
    expect(confirmation.isHearableForDecision({ consent_status: 'awaiting_authorisation', consent_person: 'Aran' })).toBe(false)
    expect(confirmation.isHearableForDecision(null)).toBe(false)
  })
})

describe('the reject is a real answer', () => {
  it('writes refused — the status the block treats as final — not a softer one', () => {
    const rejected = { ...DECLARED, ...confirmation.rejectedRecord({ voice: DECLARED }) }
    expect(rejected.consent_status).toBe('refused')
    expect(gate.verdict({ voiceId: 'cartesia_abc', voice: rejected }).allowed).toBe(false)
    expect(confirmation.isHearableForDecision(rejected)).toBe(false)
  })

  it('keeps their own words on the record when they gave any', () => {
    const rejected = confirmation.rejectedRecord({ voice: DECLARED, note: 'the accent is wrong' })
    expect(rejected.consent_note).toMatch(/the accent is wrong/)
  })

  it('adds to a note the voice already carried rather than replacing it', () => {
    const rejected = confirmation.rejectedRecord({ voice: { ...DECLARED, consent_note: 'Cloned at the Bologna demo.' } })
    expect(rejected.consent_note).toMatch(/Bologna demo/)
    expect(rejected.consent_note).toMatch(/should not be used/)
  })
})

describe('the screen is offered both answers, equally', () => {
  it('offers exactly two, in one shape, when a decision is due', () => {
    const d = confirmation.describe(DECLARED)
    expect(d.answers.map((a) => a.decision)).toEqual(['confirm', 'reject'])
    expect(d.answers.every((a) => a.label && a.label.length < 60)).toBe(true)
    expect(d.canDecide).toBe(true)
    expect(d.castable).toBe(false)
  })

  it('offers none once the answer is in, in either direction', () => {
    expect(confirmation.describe({ ...DECLARED, consent_status: 'authorised' }).answers).toEqual([])
    expect(confirmation.describe({ ...DECLARED, consent_status: 'refused' }).answers).toEqual([])
  })

  it('names the person rather than blaming anyone', () => {
    expect(confirmation.describe(DECLARED).heading).toMatch(/^Aran agreed to this at sign-up/)
  })

  it('will not record a decision for a voice with nobody named on it', () => {
    expect(() => confirmation.confirmedRecord({ voice: { consent_status: 'awaiting_authorisation' } })).toThrow(/nobody named/i)
  })
})
