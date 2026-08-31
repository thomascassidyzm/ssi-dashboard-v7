/**
 * VOICELAB · CONSENT — whose voice this is, who said yes, and when.
 *
 * Tom, 2026-08-31: "consent must be explicit and recorded — who the voice
 * belongs to, who authorised it, when — shown on the voice itself, because
 * these are real people." And, in the same day's amendment: "do NOT treat
 * existing recordings as implied permission — the voice starts marked as
 * awaiting authorisation until Tom says otherwise."
 *
 * ── WHY THIS MODULE IS PURE ─────────────────────────────────────────────────
 * Everything here is a function of a `voices` row and nothing else: no client,
 * no fetch, no clock it does not take as an argument. That is what lets the
 * consent rules be tested exhaustively without a database, and it is what stops
 * a second, quieter answer to "is this voice authorised?" growing inside a Vue
 * component. The screen renders `describe()`; it never decides.
 *
 * ── THE ONE RULE THAT MATTERS ───────────────────────────────────────────────
 * A recording existing is not permission to clone the person who made it. So
 * nothing in this module can move a voice to `authorised` without a named human
 * and a date, and nothing anywhere infers consent from provenance.
 *
 * ── AND SINCE 2026-08-31, IT IS ENFORCED, NOT ANNOUNCED ─────────────────────
 * Tom: "we are never going to use a voice without consent." This module still
 * only DESCRIBES; the refusal is services/shared/voice-consent-gate.cjs, which
 * reads these same functions and is required by the cast endpoint and by
 * tts-service.generate(). One decision, two chokepoints, no dialog through it.
 *
 * The column definitions and the reasoning behind the five states live in
 * database/migrations/20260831_voices_consent.sql.
 */

/** The five states, in the order a voice travels through them. */
const STATUSES = Object.freeze([
  'not_recorded',
  'awaiting_authorisation',
  'authorised',
  'refused',
  'withdrawn',
])

/**
 * The state a clone is BORN in when its sample came from recordings the estate
 * already holds. Named as a constant because it is a ruling, not a default:
 * Tom obtains consent, the tool never assumes it.
 */
const BIRTH_STATUS = 'awaiting_authorisation'

/** Only this one means a real person has said yes. Everything else has not. */
function isAuthorised (voice) {
  return statusOf(voice) === 'authorised'
}

function statusOf (voice) {
  const s = String((voice && voice.consent_status) || '').trim()
  return STATUSES.includes(s) ? s : 'not_recorded'
}

/**
 * The one line that appears next to the voice, everywhere the voice appears.
 *
 * Short by design — this is the Voice Lab's existing register, not a new panel
 * — and it never says "unknown". "Nobody has recorded consent" is a fact and
 * reads as one; "unknown" reads as a bug.
 */
function summarise (voice) {
  const status = statusOf(voice)
  const person = trim(voice && voice.consent_person)
  const by = trim(voice && voice.consent_authorised_by)
  const at = date(voice && voice.consent_authorised_at)
  const how = trim(voice && voice.consent_authorised_how)
  switch (status) {
    case 'authorised':
      return `${person || by || 'They'} authorised this voice${by && by !== person ? ` — via ${by}` : ''}${how ? `, ${how}` : ''}${at ? `, ${at}` : ''}.`
    case 'awaiting_authorisation':
      return `${person || 'This person'} has not been asked yet — awaiting authorisation.`
    case 'refused':
      return `${person || 'This person'} said no. Do not use this voice.`
    case 'withdrawn':
      return `${person || 'This person'} has withdrawn permission. Do not use this voice.`
    default:
      return 'No consent recorded.'
  }
}

/**
 * IS THE CONSENT QUESTION EVEN ABOUT THIS VOICE?
 *
 * A vendor's stock voice has no person behind it to ask, so drawing "no consent
 * recorded" on all 165 Azure rows would bury the handful of voices where the
 * question is real. Three things make it real: the voice is a HUMAN recordist,
 * it is a CLONE this estate made, or somebody has already recorded something
 * about it. Never inferred from anything softer than that.
 *
 * This is a DISPLAY decision, not a permission one. `needsAsking` still answers
 * honestly for every voice; this only decides whether the badge is drawn.
 */
function isAboutAPerson (voice) {
  if (!voice) return false
  if (statusOf(voice) !== 'not_recorded') return true
  if (voice.type === 'human') return true
  return /clone/i.test(String(voice.metadata_source || ''))
}

/** The whole consent fact, shaped for a screen. Never null, never partial. */
function describe (voice) {
  const status = statusOf(voice)
  return {
    status,
    /** Whether a screen should draw this at all — see isAboutAPerson. */
    aboutAPerson: isAboutAPerson(voice),
    label: LABELS[status],
    authorised: status === 'authorised',
    /** True for the two states that mean a human has actively said no. */
    blocked: status === 'refused' || status === 'withdrawn',
    /** True whenever a voice may reach a learner without a yes behind it. */
    needsAsking: status !== 'authorised',
    person: trim(voice && voice.consent_person) || null,
    personContact: trim(voice && voice.consent_person_contact) || null,
    authorisedBy: trim(voice && voice.consent_authorised_by) || null,
    authorisedHow: trim(voice && voice.consent_authorised_how) || null,
    authorisedAt: (voice && voice.consent_authorised_at) || null,
    recordedBy: trim(voice && voice.consent_recorded_by) || null,
    recordedAt: (voice && voice.consent_recorded_at) || null,
    source: trim(voice && voice.consent_source) || null,
    note: trim(voice && voice.consent_note) || null,
    summary: summarise(voice),
    /**
     * THE WORDS THEMSELVES, when there are any. Null for every voice cloned
     * before there was a phrase to read, and for the estate-clone path, where
     * no live speaker is present to declare anything — and null is the honest
     * answer for those, never an empty block that reads like a missing one.
     *
     * `words` is the copy stored ON THIS VOICE, not the copy in the code: the
     * wording will be redlined and this block must keep saying what THIS person
     * actually agreed to. `heard` is the evidence behind a spoken declaration —
     * what the machine reported hearing — so a human can disagree with it.
     */
    declaration: declarationOf(voice),
    /**
     * Why this voice cannot be cast, in a sentence a human reads. Null when
     * there is nothing wrong.
     *
     * It used to be a warning you could click through, and this comment used to
     * say "casting is deliberately NOT blocked — a hard block is Tom's call and
     * he has not made it". He made it on 2026-08-31: "we are never going to use
     * a voice without consent". So the same sentence is now the REFUSAL, shown
     * where the Cast button used to be, and the enforcement lives at the two
     * chokepoints in services/shared/voice-consent-gate.cjs rather than here —
     * this module still only describes.
     */
    castWarning: castWarning(status, trim(voice && voice.consent_person)),
  }
}

/** The declaration block, or null. See describe(). */
function declarationOf (voice) {
  const kind = trim(voice && voice.consent_declaration_kind) || null
  const words = trim(voice && voice.consent_declaration) || null
  const heard = trim(voice && voice.consent_declaration_heard) || null
  // Either of the first two is enough to say a declaration happened. Neither
  // alone is a state anything writes, but a row half-written by hand should
  // still surface rather than vanish — the whole point of the block is that a
  // consent event can be produced later.
  if (!kind && !words) return null
  return { kind, words, heard }
}

const LABELS = Object.freeze({
  not_recorded: 'no consent recorded',
  awaiting_authorisation: 'awaiting authorisation',
  authorised: 'authorised',
  refused: 'refused',
  withdrawn: 'withdrawn',
})

function castWarning (status, person) {
  if (status === 'authorised') return null
  const who = person || 'the person this voice was cloned from'
  if (status === 'refused') return `${who} said NO to this voice being used. Casting it would go against a recorded refusal.`
  if (status === 'withdrawn') return `${who} has withdrawn permission for this voice. Casting it would go against a recorded withdrawal.`
  if (status === 'awaiting_authorisation') return `${who} has not authorised this voice yet. Casting it puts it in front of learners before anyone has asked.`
  return 'Nobody has recorded who this voice belongs to or who authorised it. Casting it puts an unattributed voice in front of learners.'
}

/**
 * The columns to write when a clone is created. Every clone carries a consent
 * record from its first second of existence — an absent record is the failure
 * this whole feature exists to prevent.
 *
 * @param {object} a
 * @param {string} a.person    whose voice this is. REQUIRED.
 * @param {string} a.source    where the sample came from, in one line.
 * @param {string} a.recordedBy the operator.
 * @param {Date}   [a.now]
 */
function birthRecord ({ person, personContact = null, source = null, note = null, recordedBy = null, now = new Date() }) {
  const named = trim(person)
  if (!named) {
    // The one thing the tool insists on at clone time. Not "did they say yes"
    // — Tom obtains that later — but "whose voice is this", because without a
    // name there is nobody to ask, and the record becomes decorative on day one.
    throw Object.assign(
      new Error('Name whose voice this is before cloning it. Consent comes later, but a voice with no person attached is a record nobody can ever act on.'),
      { status: 400 },
    )
  }
  return {
    consent_status: BIRTH_STATUS,
    consent_person: named,
    consent_person_contact: trim(personContact) || null,
    consent_authorised_by: null,
    consent_authorised_how: null,
    consent_authorised_at: null,
    consent_recorded_by: trim(recordedBy) || null,
    consent_recorded_at: now.toISOString(),
    consent_source: trim(source) || null,
    consent_note: trim(note) || null,
  }
}

/**
 * The columns to write when a human records an authorisation decision.
 *
 * Refuses to write `authorised` without a named person and a date, which is the
 * same rule the database's own CHECK enforces — stated twice on purpose, so the
 * operator gets a sentence rather than a constraint violation.
 */
function decisionRecord ({ status, person = null, personContact = null, authorisedBy = null, authorisedHow = null, authorisedAt = null, note = null, recordedBy = null, now = new Date() }) {
  const s = String(status || '').trim()
  if (!STATUSES.includes(s)) {
    throw Object.assign(new Error(`consent status must be one of ${STATUSES.join(', ')}`), { status: 400 })
  }
  const named = trim(person)
  if (s !== 'not_recorded' && !named) {
    throw Object.assign(new Error('Name whose voice this is — a consent record with no person named cannot be acted on.'), { status: 400 })
  }
  const who = trim(authorisedBy) || named
  if (s === 'authorised' && !who) {
    throw Object.assign(new Error('Say who authorised it. "Authorised" with nobody named is a tick box, not a permission.'), { status: 400 })
  }
  const when = s === 'authorised' ? (authorisedAt ? new Date(authorisedAt) : now) : (authorisedAt ? new Date(authorisedAt) : null)
  if (s === 'authorised' && (!when || Number.isNaN(when.getTime()))) {
    throw Object.assign(new Error('Say when they authorised it.'), { status: 400 })
  }
  if (s === 'authorised' && !trim(authorisedHow)) {
    throw Object.assign(new Error('Say how they authorised it — in person, by email, by message, on a call.'), { status: 400 })
  }
  return {
    consent_status: s,
    consent_person: named || null,
    consent_person_contact: trim(personContact) || null,
    consent_authorised_by: s === 'authorised' ? who : (trim(authorisedBy) || null),
    consent_authorised_how: trim(authorisedHow) || null,
    consent_authorised_at: when ? when.toISOString() : null,
    consent_recorded_by: trim(recordedBy) || null,
    consent_recorded_at: now.toISOString(),
    consent_note: trim(note) || null,
  }
}

function trim (v) { return v === null || v === undefined ? '' : String(v).trim() }

/** A date a human reads, not an ISO string. Empty for a missing one. */
function date (v) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

/** The columns any read of a voice needs in order to describe its consent. */
const COLUMNS = 'type, metadata_source, consent_status, consent_person, consent_person_contact, consent_authorised_by, consent_authorised_how, consent_authorised_at, consent_recorded_by, consent_recorded_at, consent_source, consent_note, consent_declaration, consent_declaration_kind, consent_declaration_heard'

module.exports = {
  STATUSES, BIRTH_STATUS, COLUMNS, LABELS,
  statusOf, isAuthorised, isAboutAPerson, summarise, describe, castWarning, birthRecord, decisionRecord, declarationOf,
}
