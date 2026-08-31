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
import { readFileSync } from 'node:fs'

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
  // A CLONE, and now the row says so. This fixture read `type: 'human'` while
  // testing a `cartesia_` clone, which was redundant even then — the block
  // treats any voice carrying a consent status as being about a person — and
  // became actively wrong on 2026-08-31, when `type` started answering the
  // separate question of WHAT THE PERSON HEARS. A real Cartesia clone row in
  // this estate is `type: 'tts'` with a `cartesia-clone` metadata_source
  // (verified against the live `voices` table), so that is what it says now.
  const held = { ...DECLARED, type: 'tts', metadata_source: 'cartesia-clone (Voice Lab)' }

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


/**
 * ── HEARING YOUR OWN RECORDING ──────────────────────────────────────────────
 *
 * Tom's ruling, 2026-08-31: "play back their OWN RECORDED TAKE as the
 * confirmation instead of a generated clone... the principle stays the same —
 * hear the actual thing that will be used, then consent to it."
 *
 * The load-bearing assertions here are the ones a carve-out would break: there
 * is NO language in this file, the state machine is the same one, the block is
 * the same block, and a person with nothing recorded is not offered a button.
 */
describe('hearing your own recording instead of a clone', () => {
  const RECORDIST = { ...DECLARED, type: 'human', voice_id: 'human_cym_n_for_eng_target1' }

  it('asks what will be HEARD from what the voice IS, never from its language', () => {
    expect(confirmation.hearingSourceOf(RECORDIST)).toBe('own_recording')
    expect(confirmation.hearingSourceOf({ ...DECLARED, type: 'tts' })).toBe('clone')
    // A human_* id with no row at all is a person by construction — the same
    // call the gate's looksLikeAPerson makes, for the same reason.
    expect(confirmation.hearingSourceOf(null, 'human_breton_target1')).toBe('own_recording')
    // AND NO LANGUAGE CODE APPEARS IN THE CODE. The prose names Welsh, Breton
    // and Cornish because they are why Tom ruled; the rule itself must not know
    // about them, or it is the carve-out he refused. Comments stripped, then
    // checked — a doc mentioning `cym` is fine, a branch on it is not.
    const src = readFileSync(new URL('./clone-confirmation.cjs', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
    expect(src).not.toMatch(/\b(cym|bre|cor|kw|welsh|breton|cornish)\b/i)
  })

  it('is the SAME state machine — no new stage, nothing for another gate to learn', () => {
    expect(confirmation.stageOf(RECORDIST)).toBe('awaiting_hearing')
    expect(gate.verdict({ voiceId: RECORDIST.voice_id, voice: RECORDIST }).allowed).toBe(false)
    const confirmed = { ...RECORDIST, ...confirmation.confirmedRecord({ voice: RECORDIST }) }
    expect(confirmation.stageOf(confirmed)).toBe('confirmed')
    expect(gate.verdict({ voiceId: RECORDIST.voice_id, voice: confirmed }).allowed).toBe(true)
  })

  it('tells the operator to play a TAKE, never a clone that cannot exist', () => {
    const v = gate.verdict({ voiceId: RECORDIST.voice_id, voice: RECORDIST })
    expect(v.message).toMatch(/has not heard their own recording back yet/i)
    expect(v.message).toMatch(/play one of their takes/i)
    expect(v.message).not.toMatch(/clone/i)
    // The clone path keeps its own sentence, word for word.
    expect(gate.verdict({ voiceId: 'cartesia_abc', voice: { ...DECLARED, type: 'tts' } }).message)
      .toMatch(/has not heard this clone yet/i)
  })

  it('records what they ACTUALLY heard, because that record is the audit trail', () => {
    const yes = confirmation.confirmedRecord({ voice: RECORDIST })
    expect(yes.consent_authorised_how).toBe('heard their own recording and confirmed it')
    expect(yes.consent_authorised_how).not.toMatch(/clone/i)
    const no = confirmation.rejectedRecord({ voice: RECORDIST, note: 'I sound tired' })
    expect(no.consent_status).toBe('refused')
    expect(no.consent_note).toMatch(/heard their own recording and said it should not be used/i)
    expect(no.consent_note).toMatch(/I sound tired/)
  })

  it('asks the right question in the right words, and both answers stay one shape', () => {
    const d = confirmation.describe(RECORDIST, { recordings: 12 })
    expect(d.hearing.source).toBe('own_recording')
    expect(d.hearing.spends).toBe(false)
    expect(d.heading).toMatch(/play their own recording back to them/i)
    expect(d.answers.map((a) => a.decision)).toEqual(['confirm', 'reject'])
    expect(d.answers[0].label).toMatch(/that is my recording/i)
    expect(d.answers[1].label).toMatch(/do not use my recording/i)
    // Same length within a hair — the no is never the smaller word.
    expect(Math.abs(d.answers[0].label.length - d.answers[1].label.length)).toBeLessThan(12)
  })

  it('asks voice-personhood, so there is ONE answer about who is a recordist', () => {
    // Built on #543's correction, landed the same day: personhood decides what a
    // voice IS, and this file must never grow a second opinion about it.
    // A stock catalogue voice is not a recordist, whatever gets written on it.
    expect(confirmation.hearingSourceOf({ ...DECLARED, tts_engine: 'azure' }, 'azure_en-GB-ThomasNeural')).toBe('clone')
    // And the clone #543 rescued — a real clone whose only evidence is its
    // display name — is still a clone here, not somebody's own recording.
    expect(confirmation.hearingSourceOf(
      { ...DECLARED, type: 'tts', tts_engine: 'elevenlabs', display_name: 'English Narrator (Aran Clone - Presentation)' },
      'elevenlabs_FOIN928B9X0jwgJ95cLt',
    )).toBe('clone')
  })

  it('leaves the clone path exactly as it was', () => {
    const d = confirmation.describe({ ...DECLARED, type: 'tts' })
    expect(d.hearing.source).toBe('clone')
    expect(d.hearing.spends).toBe(true)
    expect(d.heading).toMatch(/play the clone to them/i)
    expect(d.answers[0].label).toBe('Yes, that sounds like me — use it')
    expect(confirmation.confirmedRecord({ voice: { ...DECLARED, type: 'tts' } }).consent_authorised_how)
      .toBe(confirmation.CONFIRMED_HOW)
  })

  it('offers NO answers to a person with nothing recorded — a button above silence is blind signing', () => {
    const d = confirmation.describe(RECORDIST, { recordings: 0 })
    expect(d.canDecide).toBe(false)
    expect(d.answers).toEqual([])
    expect(d.hearing.nothingRecorded).toBe(true)
    expect(d.heading).toMatch(/holds no recording of them yet/i)
    // And the stage has NOT moved: they are still waiting to be asked, which is
    // what makes this answerable the moment they record something.
    expect(d.stage).toBe('awaiting_hearing')
  })

  it('does not ask the question at all on the clone path, so nothing there changes shape', () => {
    const d = confirmation.describe({ ...DECLARED, type: 'tts' })
    expect(d.hearing.recordings).toBeNull()
    expect(d.hearing.nothingRecorded).toBe(false)
    expect(d.canDecide).toBe(true)
  })
})
