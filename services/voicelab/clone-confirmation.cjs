/**
 * CLONE CONFIRMATION — you can only consent to a clone once you have heard it.
 *
 * Tom's refinement, 2026-08-31, on the day the onboarding consent step landed:
 *
 *   "automatic consent is better and then a click to confirm or something,
 *    once voice clone has been generated"
 *
 * ── WHY A SECOND STAMP ──────────────────────────────────────────────────────
 * Agreeing in the abstract to "my voice being cloned" is signing blind. Nobody
 * knows what the clone will sound like at the moment they agree to it — not the
 * person, not the operator, not Cartesia. Hearing the thing speak in your own
 * voice and then saying yes is consent to the ACTUAL OBJECT, and it is also the
 * only moment where "that doesn't sound like me" can be said before a learner
 * hears it. So consent is now two stamps on one voice, in this order:
 *
 *   1. THE DECLARATION — the line read aloud and checked by whisper, or the
 *      signed attestation. Captured at sign-up or at clone time, unchanged:
 *      services/voicelab/declaration.cjs. Says WHO, and that they agree.
 *   2. THE CONFIRMATION — they hear their own clone and click. Yes, or no.
 *      This module. Says they agree to THIS voice.
 *
 * ── AND WHY IT ADDS NO NEW STATE ────────────────────────────────────────────
 * The obvious build is a "half-consented" flag, and it is the wrong one: a new
 * state is a new thing every gate in the estate has to learn about, and the one
 * that forgets waves an unconfirmed clone through. There is already a state
 * that means exactly "a person is attached to this voice and nobody has said
 * yes yet" — `awaiting_authorisation` — and the hard block
 * (services/shared/voice-consent-gate.cjs) already refuses it everywhere.
 *
 * So a clone between its declaration and its confirmation sits in that same
 * state, is refused by that same block, and needs no new rule anywhere. What
 * this module adds is the DISTINCTION between the two ways of being in it:
 *
 *   awaiting_authorisation, no declaration  → nobody has asked this person
 *   awaiting_authorisation, declaration     → they said yes at sign-up, and are
 *                                             waiting to hear their clone
 *
 * The distinction is drawn from a column that already exists
 * (`consent_declaration_kind`), so nothing here needs a migration, and a gate
 * that has never heard of this file still refuses both.
 *
 * ── THE REJECT IS NOT A CANCEL ──────────────────────────────────────────────
 * Rejecting writes `refused`, the same status a person gets when they say no to
 * being cloned at all, and the same one the block treats as final. It is not a
 * "try again" and it is not a softer word for "not yet". The screen gives it
 * the same weight as the yes — same size, same one tap — because a confirm step
 * where the no is harder than the yes is a consent theatre, not a consent.
 */

'use strict'

const consent = require('./consent.cjs')

/**
 * How this voice stands with respect to the two stamps.
 *
 * PURE: a function of a `voices` row and nothing else, for the same reason
 * consent.cjs is — so that the answer to "may this be cast" cannot grow a
 * second, quieter version inside a component.
 *
 * @returns {'confirmed'|'awaiting_hearing'|'rejected'|'withdrawn'|'unasked'}
 */
function stageOf (voice) {
  const status = consent.statusOf(voice)
  if (status === 'authorised') return 'confirmed'
  if (status === 'refused') return 'rejected'
  if (status === 'withdrawn') return 'withdrawn'
  if (status === 'awaiting_authorisation' && hasDeclaration(voice)) return 'awaiting_hearing'
  return 'unasked'
}

function hasDeclaration (voice) {
  return Boolean(consent.declarationOf(voice))
}

/**
 * MAY THIS VOICE BE PLAYED TO THE PERSON SO THEY CAN DECIDE?
 *
 * The one use of an unconsented voice that is not a use of it. Without it the
 * flow deadlocks: the block refuses to render an unconfirmed clone, and the
 * confirmation cannot happen until it has been rendered.
 *
 * Deliberately narrow, and narrow in the direction that costs the person
 * nothing if it is wrong:
 *   - `awaiting_hearing` ONLY. A voice nobody has declared for is not hearable
 *     here, because there is no consent event for this to be the second half of.
 *   - `refused` and `withdrawn` are never hearable. Somebody has said no; a
 *     "just play it once more" path is how a no gets worn down.
 *   - `confirmed` is hearable, but through the ordinary gate, not this.
 */
function isHearableForDecision (voice) {
  return stageOf(voice) === 'awaiting_hearing'
}

/**
 * THE DECLARATION, HELD SHORT OF AUTHORISED.
 *
 * Takes what declaration.captureDeclaration produced — which says `authorised`,
 * because before today the declaration WAS the whole of the consent — and lands
 * it as the first of two stamps. The words, the kind and what whisper heard are
 * kept exactly as they were: that record is the person's, and this does not
 * touch it. Only the three `authorised_*` fields are held back, because they
 * are the ones the block reads, and the person has not heard anything yet.
 *
 * @param {object} declarationRecord  from declaration.captureDeclaration
 * @returns {object} columns to write on the voice
 */
function awaitingHearing (declarationRecord) {
  if (!declarationRecord) {
    throw Object.assign(
      new Error('A voice cannot be created for a person without a recorded declaration.'),
      { status: 400, code: 'NO_RECORDED_CONSENT' },
    )
  }
  return {
    ...declarationRecord,
    consent_status: consent.BIRTH_STATUS,
    // Held back, not lost: the confirmation writes all three, naming the person
    // who heard it, how they said yes, and when.
    consent_authorised_by: null,
    consent_authorised_how: null,
    consent_authorised_at: null,
  }
}

/** How the confirmation is described on the voice, forever after. */
const CONFIRMED_HOW = 'heard their own clone and confirmed it'
const REJECTED_NOTE = 'Heard their own clone and said it should not be used.'

/**
 * The columns to write when the person has heard the clone and said yes.
 *
 * The person authorises THEMSELVES here — that is the whole point of the step —
 * so `consent_authorised_by` is their name, and the operator at the screen is
 * recorded separately as `consent_recorded_by`, exactly as the declaration does.
 */
function confirmedRecord ({ voice, note = null, recordedBy = null, now = new Date() }) {
  const person = requirePerson(voice)
  return {
    consent_status: 'authorised',
    consent_person: person,
    consent_authorised_by: person,
    consent_authorised_how: CONFIRMED_HOW,
    consent_authorised_at: now.toISOString(),
    consent_recorded_by: trim(recordedBy) || null,
    consent_recorded_at: now.toISOString(),
    consent_note: mergeNote(voice, trim(note)),
  }
}

/**
 * The columns to write when the person has heard the clone and said no.
 *
 * `refused` and not a softer state, because the block treats refused as final
 * and that is what "don't use this" means. Their own words, if they gave any,
 * are kept on the note — the reason a clone was rejected is the most useful
 * thing anybody will have when deciding whether to make another one.
 */
function rejectedRecord ({ voice, note = null, recordedBy = null, now = new Date() }) {
  const person = requirePerson(voice)
  const said = trim(note)
  return {
    consent_status: 'refused',
    consent_person: person,
    consent_authorised_by: null,
    consent_authorised_how: null,
    consent_authorised_at: null,
    consent_recorded_by: trim(recordedBy) || null,
    consent_recorded_at: now.toISOString(),
    consent_note: mergeNote(voice, said ? `${REJECTED_NOTE} They said: ${said}` : REJECTED_NOTE),
  }
}

/**
 * Everything the confirm screen needs, in the words it should use.
 *
 * The wording is plain, short and blames nobody: the person in front of this
 * screen has done nothing wrong in either direction, and a no is as ordinary an
 * answer as a yes.
 */
function describe (voice) {
  const stage = stageOf(voice)
  const person = (voice && String(voice.consent_person || '').trim()) || null
  const who = person || 'this person'
  const decl = consent.declarationOf(voice)
  return {
    stage,
    person,
    /** Can they be asked right now? */
    canDecide: stage === 'awaiting_hearing',
    /** May the clone be played so they can decide? */
    hearable: isHearableForDecision(voice),
    /** True once the second stamp exists, which is the only thing that casts. */
    castable: stage === 'confirmed',
    /** The words of the first stamp, so the screen can show what they agreed to. */
    declaration: decl,
    heading: HEADINGS[stage](who),
    /** The two answers, always both, always the same shape. */
    answers: stage === 'awaiting_hearing'
      ? [
        { decision: 'confirm', label: 'Yes, that sounds like me — use it' },
        { decision: 'reject', label: 'No, that is not right — do not use it' },
      ]
      : [],
  }
}

const HEADINGS = Object.freeze({
  awaiting_hearing: (who) => `${who} agreed to this at sign-up. Now play the clone to them and let them decide.`,
  confirmed: (who) => `${who} heard this clone and confirmed it.`,
  rejected: (who) => `${who} heard this clone and said not to use it.`,
  withdrawn: (who) => `${who} has withdrawn permission for this voice.`,
  unasked: (who) => `Nobody has recorded ${who} agreeing to this voice.`,
})

function requirePerson (voice) {
  const person = trim(voice && voice.consent_person)
  if (!person) {
    throw Object.assign(
      new Error('This voice has nobody named on it, so there is nobody whose confirmation this would be. Record whose voice it is first.'),
      { status: 400 },
    )
  }
  return person
}

/** Keep whatever the voice already said about itself; add, never replace. */
function mergeNote (voice, addition) {
  const existing = trim(voice && voice.consent_note)
  if (!addition) return existing || null
  if (!existing) return addition
  if (existing.includes(addition)) return existing
  return `${existing} ${addition}`
}

function trim (v) { return v === null || v === undefined ? '' : String(v).trim() }

module.exports = {
  CONFIRMED_HOW,
  REJECTED_NOTE,
  stageOf,
  hasDeclaration,
  isHearableForDecision,
  awaitingHearing,
  confirmedRecord,
  rejectedRecord,
  describe,
}
