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
 *
 * ── AND SOMETIMES THE THING THEY HEAR IS NOT A CLONE ────────────────────────
 * Tom's ruling, 2026-08-31, the same day, on the hole this file's own write-up
 * named and left open:
 *
 *   "play back their OWN RECORDED TAKE as the confirmation instead of a
 *    generated clone... the principle stays the same — hear the actual thing
 *    that will be used, then consent to it."
 *
 * Welsh, Breton and Cornish recordists are human-voiced BY DESIGN and Cartesia
 * cannot clone those languages at all, so there was never going to be a clone
 * for them to hear. The first reading of that is a carve-out — three languages
 * that skip the second stamp — and it is the wrong one, because the second
 * stamp is not about clones. It is about hearing THE ACTUAL THING THAT WILL BE
 * USED and then consenting to it. For a cloned voice the actual thing is the
 * clone. For a human-recorded voice the actual thing is their own take: it is
 * literally the audio the learner will hear, which makes it a STRONGER object
 * to consent to than a clone, not a weaker one.
 *
 * So there is no carve-out and no second flow. The stages are the same, the
 * state machine is the same, the block is the same, the two answers are the
 * same shape. The only thing that varies is WHERE THE AUDIO COMES FROM, and
 * that is one function — hearingSourceOf() — and some words.
 *
 * It is drawn from the voice row's own `type`, which is already in
 * consent.COLUMNS and so is already on every row the gate reads. NOT from a
 * language list: `cym`/`bre`/`kw` hard-coded anywhere here would be a rule
 * about three languages, and the real rule is about whether this voice IS a
 * recording or a synthesis. A human recordist in any language gets the same
 * treatment, and the day Cartesia can clone Welsh nothing here has to change.
 */

'use strict'

const consent = require('./consent.cjs')
const personhood = require('../shared/voice-personhood.cjs')

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

/** The two things a person can be asked to listen to. There is no third. */
const HEARING_SOURCES = Object.freeze({ CLONE: 'clone', OWN_RECORDING: 'own_recording' })

/**
 * IS THIS VOICE A RECORDING OF A PERSON, OR A SYNTHESIS OF ONE?
 *
 * ONE ANSWER, and it is not this file's — services/shared/voice-personhood.cjs
 * already decides what every voice in the estate IS (`recordist`, `clone`,
 * `stock`, `named`), it was written the same day for the neighbouring
 * correction, and the consent gate and the census tools all read it. A second
 * opinion here about whether somebody is a recordist is exactly the drift this
 * subsystem keeps refusing everywhere else.
 *
 * `recordist` is the whole of the answer: a person whose own takes ARE the
 * voice. It resolves from a `human_*` id or `type: 'human'`, which means a
 * recordist with no `voices` row at all still gets it — and "we hold no row for
 * this person" must never be the reason we offer them a clone that does not
 * exist.
 */
function isHumanRecorded (voice, voiceId = null) {
  return personhood.classify(voiceId || (voice && voice.voice_id) || '', voice) === 'recordist'
}

/**
 * WHAT WILL THIS PERSON ACTUALLY HEAR?
 *
 * PURE, and deliberately total: every voice has an answer, so no caller has to
 * carry a null branch and no screen can end up with a confirm button and
 * nothing to play.
 *
 * @returns {'clone'|'own_recording'}
 */
function hearingSourceOf (voice, voiceId = null) {
  return isHumanRecorded(voice, voiceId) ? HEARING_SOURCES.OWN_RECORDING : HEARING_SOURCES.CLONE
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

/**
 * How the confirmation is described on the voice, FOREVER AFTER — so it says
 * what they actually heard.
 *
 * Not cosmetic. `consent_authorised_how` is the audit trail: it is the sentence
 * somebody reads in a year when they want to know what this person agreed to.
 * Writing "heard their own clone" onto a Welsh recordist who heard their own
 * take would be a false record of a consent event, which is the one thing this
 * whole subsystem exists to prevent.
 */
const CONFIRMED_HOW = 'heard their own clone and confirmed it'
const REJECTED_NOTE = 'Heard their own clone and said it should not be used.'
const CONFIRMED_HOW_OWN_RECORDING = 'heard their own recording and confirmed it'
const REJECTED_NOTE_OWN_RECORDING = 'Heard their own recording and said it should not be used.'

/** The pair of sentences for whichever thing this voice actually is. */
function wordingFor (source) {
  return source === HEARING_SOURCES.OWN_RECORDING
    ? { how: CONFIRMED_HOW_OWN_RECORDING, note: REJECTED_NOTE_OWN_RECORDING }
    : { how: CONFIRMED_HOW, note: REJECTED_NOTE }
}

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
    consent_authorised_how: wordingFor(hearingSourceOf(voice)).how,
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
  const rejected = wordingFor(hearingSourceOf(voice)).note
  return {
    consent_status: 'refused',
    consent_person: person,
    consent_authorised_by: null,
    consent_authorised_how: null,
    consent_authorised_at: null,
    consent_recorded_by: trim(recordedBy) || null,
    consent_recorded_at: now.toISOString(),
    consent_note: mergeNote(voice, said ? `${rejected} They said: ${said}` : rejected),
  }
}

/**
 * Everything the confirm screen needs, in the words it should use.
 *
 * The wording is plain, short and blames nobody: the person in front of this
 * screen has done nothing wrong in either direction, and a no is as ordinary an
 * answer as a yes.
 */
function describe (voice, { voiceId = null, recordings = null } = {}) {
  const stage = stageOf(voice)
  const person = (voice && String(voice.consent_person || '').trim()) || null
  const who = person || 'this person'
  const decl = consent.declarationOf(voice)
  const source = hearingSourceOf(voice, voiceId)
  // "Have they got anything to hear?" is a fact about the world, not about the
  // row, so this module never goes looking for it — the caller who already has
  // the answer passes it in. Passing nothing means "not checked", which reads
  // as no obstacle: the clone path has never needed the question asked.
  const nothingRecorded = source === HEARING_SOURCES.OWN_RECORDING && recordings === 0
  const canDecide = stage === 'awaiting_hearing' && !nothingRecorded
  return {
    stage,
    person,
    /** What they are being asked to listen to, and where it comes from. */
    hearing: hearingOf(source, { who, recordings, nothingRecorded }),
    /** Can they be asked right now? */
    canDecide,
    /** May the clone be played so they can decide? */
    hearable: isHearableForDecision(voice),
    /** True once the second stamp exists, which is the only thing that casts. */
    castable: stage === 'confirmed',
    /** The words of the first stamp, so the screen can show what they agreed to. */
    declaration: decl,
    heading: nothingRecorded ? NOTHING_RECORDED(who) : HEADINGS[stage](who, source),
    /**
     * The two answers, always both, always the same shape — and NOT OFFERED AT
     * ALL when there is nothing to play. A confirm button above silence is the
     * blind signing this whole step exists to abolish, wearing its own uniform.
     */
    answers: canDecide
      ? [
        { decision: 'confirm', label: ANSWERS[source].confirm },
        { decision: 'reject', label: ANSWERS[source].reject },
      ]
      : [],
  }
}

/**
 * The block a screen needs in order to know HOW to play the thing, held here
 * rather than worked out in a component — the same reason the headings are:
 * a second opinion about consent living in a component is how a screen starts
 * disagreeing with its database.
 */
function hearingOf (source, { who, recordings, nothingRecorded }) {
  const own = source === HEARING_SOURCES.OWN_RECORDING
  return {
    source,
    /** In words, for the sentence on the screen. */
    what: own ? 'their own recording' : 'the clone',
    /** Where the audio comes from, which is what tells a screen how to get it. */
    from: own
      ? 'a take this person has already recorded — the exact audio a learner will hear'
      : 'a rendered audition of the clone',
    /**
     * Playing a clone costs money at a vendor and goes through the daily
     * ceiling. Playing somebody's own take costs nothing and renders nothing:
     * it is an existing file in the estate's own bucket, so the deliberate hole
     * in the consent block (assertHearableForDecision) is not involved at all.
     * One fewer thing that can ever be widened.
     */
    spends: !own,
    /** How many of their own takes the estate holds, when the caller looked. */
    recordings: recordings === null || recordings === undefined ? null : Number(recordings),
    nothingRecorded,
    waiting: own
      ? 'Play their own recording back to them, then ask.'
      : 'Play the clone to them, then ask.',
    blocked: nothingRecorded ? NOTHING_RECORDED(who) : null,
  }
}

/**
 * THE SENTENCE FOR A PERSON WITH NOTHING RECORDED YET.
 *
 * Not an error and not their fault — it is simply the ordinary shape of a
 * recordist's first week: they agree at sign-up, then they record, then they
 * confirm. So it says what has to happen next and stops there.
 */
const NOTHING_RECORDED = (who) =>
  `${who} agreed at sign-up, and the estate holds no recording of them yet. There is nothing to play back, so there is nothing to confirm — this becomes answerable the moment they have recorded something.`

const HEADINGS = Object.freeze({
  awaiting_hearing: (who, source) => (source === HEARING_SOURCES.OWN_RECORDING
    ? `${who} agreed to this at sign-up. Now play their own recording back to them and let them decide.`
    : `${who} agreed to this at sign-up. Now play the clone to them and let them decide.`),
  confirmed: (who, source) => (source === HEARING_SOURCES.OWN_RECORDING
    ? `${who} heard their own recording and confirmed it.`
    : `${who} heard this clone and confirmed it.`),
  rejected: (who, source) => (source === HEARING_SOURCES.OWN_RECORDING
    ? `${who} heard their own recording and said not to use it.`
    : `${who} heard this clone and said not to use it.`),
  withdrawn: (who) => `${who} has withdrawn permission for this voice.`,
  unasked: (who) => `Nobody has recorded ${who} agreeing to this voice.`,
})

/**
 * BOTH ANSWERS, ONE SHAPE, whichever thing they heard. The words change because
 * "that sounds like me" is the wrong question to ask somebody about their own
 * recording — it does not sound like them, it IS them, and the real question is
 * whether they are happy for it to be used.
 */
const ANSWERS = Object.freeze({
  [HEARING_SOURCES.CLONE]: {
    confirm: 'Yes, that sounds like me — use it',
    reject: 'No, that is not right — do not use it',
  },
  [HEARING_SOURCES.OWN_RECORDING]: {
    confirm: 'Yes, that is my recording — use it',
    reject: 'No, do not use my recording',
  },
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
  CONFIRMED_HOW_OWN_RECORDING,
  REJECTED_NOTE_OWN_RECORDING,
  HEARING_SOURCES,
  NOTHING_RECORDED,
  isHumanRecorded,
  hearingSourceOf,
  wordingFor,
  stageOf,
  hasDeclaration,
  isHearableForDecision,
  awaitingHearing,
  confirmedRecord,
  rejectedRecord,
  describe,
}
