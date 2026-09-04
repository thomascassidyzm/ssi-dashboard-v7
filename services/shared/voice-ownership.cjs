/**
 * IS THE PERSON AT THE SCREEN THE PERSON THIS VOICE BELONGS TO?
 *
 * Tom, 2026-09-04, having been told by his own estate to go and ask himself:
 *
 *   "it is asking a person for permission to use their own voice… when the
 *   authenticated user is the owner of the voice, consent is self-evident."
 *
 * He is right, and the reason it kept happening is worth naming, because it is
 * the same shape twice in one day: the wall was answered by CONSENTING ONE
 * VOICE ID by hand (tom_001, 01:13 UTC), and eight hours later the identical
 * wall stood in front of a different clone of the same person. A hardcoded
 * instance standing in for a missing derivation always comes back.
 *
 * ── THE GAP, STATED FIRST, BECAUSE IT DECIDES THE DESIGN ────────────────────
 * There is NO owner link in this schema. Measured on the live `voices` table,
 * 2026-09-04, 427 rows:
 *
 *   consent_person          a FREE-TEXT NAME. "Tom Cassidy", "tom", "Aran Jones".
 *   consent_person_contact  an email — populated on 1 row of 427.
 *   human_email             an email — populated on 0 rows of 427.
 *   notes                   prose, and what it records is the operator who ran
 *                           the clone flow, which is not the owner: an operator
 *                           clones other people's voices for a living.
 *
 * So the only thing tying nearly every voice to a person is a NAME, and a name
 * is not an identity. Matching on it would mean anybody who can put "Tom
 * Cassidy" on a screen — or who is themselves called Tom Cassidy — could
 * consent to Tom's clone. That is not a smaller version of the protection; it
 * is the protection removed. THIS MODULE THEREFORE NEVER MATCHES ON A NAME, and
 * that is the whole reason it is a module rather than a comparison inline.
 *
 * ── WHAT IT MATCHES ON INSTEAD ──────────────────────────────────────────────
 * A VERIFIED EMAIL, and only that: the address Supabase authenticated the
 * session with, against an address recorded on the voice. An email on the row
 * is identity-grade because the only way one gets there is somebody putting it
 * there deliberately; a name gets there by typing.
 *
 * And since almost no row has one, the link is MINTED at the moment somebody
 * claims their own voice (services/voicelab/self-consent.cjs) — which is the
 * point of that flow and the half that makes this one ever true. The first tap
 * writes the address; every later question about that voice is derived.
 *
 * `+` addressing is NOT folded. thomas.cassidy+ssi@gmail.com is the address
 * this estate's sessions carry and is what gets written, so there is nothing to
 * fold — and folding it would mean deciding, in a consent check, that two
 * different strings are the same human because of one vendor's mailbox rules.
 */

'use strict'

/** An address, in the one form comparisons happen in. */
function normaliseEmail (value) {
  const s = String(value === null || value === undefined ? '' : value).trim().toLowerCase()
  // A shape test, not a validator: what matters is that a NAME cannot pass it.
  // "Tom Cassidy" must never be comparable with an authenticated address.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : ''
}

/**
 * The identity-grade address recorded on this voice, or null.
 *
 * Two columns, in the order they are trusted. `consent_person_contact` is the
 * consent flow's own field — how to reach the person whose voice this is.
 * `human_email` is the recordist columns' equivalent. Anything else on the row
 * (consent_person, consent_authorised_by, consent_recorded_by, notes) is a name
 * or an operator and is deliberately not consulted.
 */
function ownerEmailOf (voice) {
  if (!voice) return null
  return normaliseEmail(voice.consent_person_contact) || normaliseEmail(voice.human_email) || null
}

/** Is this authenticated address the person this voice belongs to? */
function isOwnedBy (voice, email) {
  const owner = ownerEmailOf(voice)
  const asking = normaliseEmail(email)
  return Boolean(owner && asking && owner === asking)
}

/**
 * The whole ownership answer for one voice and one signed-in person.
 *
 * `claimable` is the interesting one, and it is deliberately permissive in
 * exactly one direction: a voice with NO recorded owner can be claimed, because
 * that is the state 426 of 427 rows are in and refusing there would leave the
 * derivation permanently unreachable. A voice that already names a DIFFERENT
 * owner cannot — that is somebody else's identity on the row, and this is the
 * only place in the estate that can tell.
 *
 * @param {object|null} voice  the `voices` row
 * @param {string|null} email  the authenticated address of whoever is asking
 */
function ownership (voice, email) {
  const owner = ownerEmailOf(voice)
  const asking = normaliseEmail(email)
  const isOwner = isOwnedBy(voice, email)
  return {
    /** Does this voice carry an identity-grade owner at all? */
    linked: Boolean(owner),
    owner,
    isOwner,
    /** May this person say "this is mine"? */
    claimable: Boolean(asking) && (!owner || isOwner),
  }
}

module.exports = { normaliseEmail, ownerEmailOf, isOwnedBy, ownership }
