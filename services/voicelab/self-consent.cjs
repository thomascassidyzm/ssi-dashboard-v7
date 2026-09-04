/**
 * VOICELAB · SELF-CONSENT — the owner, signed in, saying "this is my voice".
 *
 * Tom, 2026-09-04, blocked by his own estate from auditioning his own Italian
 * clone: "IT IS ASKING A PERSON FOR PERMISSION TO USE THEIR OWN VOICE… the
 * owner asking to hear their own clone IS the consent."
 *
 * ── WHY A TAP AND NOT A DERIVATION ──────────────────────────────────────────
 * The obvious fix is to derive it: authenticated user is the owner, therefore
 * consented, no record needed. It cannot be done today and the reason is a
 * finding rather than an inconvenience — THERE IS NO OWNER LINK IN THE SCHEMA.
 * 427 voices; one carries an email; the rest tie to a person by a free-text
 * NAME, and matching a session against a name would let anybody called Tom
 * Cassidy consent to Tom's clone (services/shared/voice-ownership.cjs).
 *
 * So the tap is the cheaper half AND the structural one: it records the consent
 * the person is standing there giving, and in the same write it MINTS the
 * identity link — their authenticated address onto the row — so every later
 * question about that voice is derived and this screen is never needed again
 * for it. One tap, and the wall does not come back for that voice or for the
 * next one they make.
 *
 * ── WHAT IT IS NOT ALLOWED TO DO ────────────────────────────────────────────
 * Tom's standing ruling is absolute: an unconsented cloned voice is BLOCKED,
 * never warned, enforced server-side. This touches exactly one case — a person
 * acting on their OWN voice — and every guard below is there to keep it there:
 *
 *   - a voice already linked to a DIFFERENT person's address is refused. That
 *     is the only fact in this estate that can tell two humans apart, and it
 *     outranks the tap.
 *   - `refused` and `withdrawn` are never walked back here, exactly as
 *     consent-capture refuses to: somebody said no, and a one-tap path to
 *     reversing a no is how a no gets worn down. The Voice Lab's own consent
 *     editor, at admin tier, remains the only way.
 *   - a voice the gate does not ask about — a vendor stock voice, a recordist's
 *     own takes — is refused with a sentence saying why. There is nobody to
 *     ask, so there is nothing to claim.
 *   - it CREATES NOTHING. No row, no voice, no language. If there is no row
 *     there is no block either, so there is nothing for this to answer.
 *
 * ── AND WHY THE CLAIM IS WRITTEN IN THE CLAIMANT'S OWN NAME ─────────────────
 * The tap replaces `consent_person` with the person making it, keeping whatever
 * the row said before on the note. It would be friendlier to leave the existing
 * name alone; it would also mean somebody could tap "this is my voice" on a row
 * reading "Aran Jones" and leave a record that still says Aran consented. A
 * claim must be legible as a claim, by the person who made it, forever. Nobody
 * gains a power here they did not have — recording consent on any voice is
 * already a dashboard-tier action (services/voicelab/consent-capture.cjs) — but
 * this one is signed.
 */

'use strict'

const consent = require('./consent.cjs')
const personhood = require('../shared/voice-personhood.cjs')
const ownership = require('../shared/voice-ownership.cjs')
const consentGate = require('../shared/voice-consent-gate.cjs')

/** Everything both this module and the gate need to classify one row. */
const SELECT = `voice_id, ${consent.COLUMNS}, display_name, human_name, human_email, notes, tts_engine, provider_id, tts_voice_name`

/** How the claim reads in the audit trail, forever after. */
const CLAIMED_HOW = (email) => `the owner confirmed it themselves in the Voice Lab, signed in as ${email}`

/**
 * Record that the signed-in person owns this voice and consents to it.
 *
 * @param {object} db                supabase client
 * @param {object} a
 * @param {string} a.voiceId
 * @param {object} a.user            the authenticated identity — { email, name }
 * @param {Date}   [a.now]
 * @returns {Promise<{voice: object, alreadyAuthorised: boolean, linked: boolean}>}
 */
async function claimOwnVoice (db, { voiceId, user, now = new Date() }) {
  const id = String(voiceId || '').trim()
  if (!id) throw Object.assign(new Error('voiceId is required'), { status: 400 })

  // THE IDENTITY IS THE SESSION'S, NEVER THE REQUEST'S. Nothing in the body
  // reaches this function, so no caller can claim a voice as somebody else by
  // posting a different address.
  const email = ownership.normaliseEmail(user && user.email)
  if (!email) {
    throw Object.assign(
      new Error('This session has no verified email address on it, so there is nothing to record a claim against. Sign in again.'),
      { status: 403, code: 'NO_VERIFIED_IDENTITY' },
    )
  }
  const name = String((user && user.name) || '').trim() || email

  // EVERY SPELLING, THE SAME ONES THE GATE REFUSED ON. A browser is handed the
  // bare uuid the provider speaks (`e7ed10ad-…`) while the registry stores
  // `cartesia_e7ed10ad-…`, and six voices in this estate already exist under
  // both. Claiming one spelling and leaving the other unconsented would put the
  // identical wall back the moment a different call site asked — which is the
  // recurrence this whole change exists to end. So the claim lands on every row
  // that IS this voice.
  const spellings = consentGate.spellingsToTry(id, null)
  const { data, error: readErr } = await db.from('voices').select(SELECT).in('voice_id', spellings)
  if (readErr) throw Object.assign(new Error(`read voice: ${readErr.message}`), { status: 400 })
  const rows = Array.isArray(data) ? data : (data ? [data] : [])
  if (!rows.length) {
    throw Object.assign(
      new Error(`There is no record of ${id} in the voices table, so there is nothing here to consent to.`),
      { status: 404, code: 'VOICE_ROW_MISSING' },
    )
  }

  // NOBODY TO ASK. Stock catalogue voices and a recordist's own takes are not
  // gated at all (services/shared/voice-personhood.cjs), so a claim on one
  // would be a consent record about a thing.
  if (!rows.some((row) => personhood.requiresConsent(row.voice_id, row))) {
    throw Object.assign(
      new Error(`${rows[0].display_name || id} is not a voice the consent block asks about, so there is nothing to consent to.`),
      { status: 400, code: 'NOT_A_GATED_VOICE' },
    )
  }

  // ── THE THREE REFUSALS, CHECKED ACROSS EVERY SPELLING ─────────────────────
  // A no recorded under either spelling is a no.
  const said = rows.find((row) => ['refused', 'withdrawn'].includes(consent.statusOf(row)))
  if (said) {
    throw Object.assign(
      new Error(`${said.consent_person || id} has already said no to this voice being used. That decision is not something to overturn with a tap — it is changed in the Voice Lab's consent editor or not at all.`),
      { status: 409, code: 'CONSENT_REFUSED_ALREADY', detail: { voiceId: said.voice_id, consentStatus: consent.statusOf(said) } },
    )
  }
  const someoneElses = rows.map((row) => ownership.ownership(row, email)).find((own) => own.linked && !own.isOwner)
  if (someoneElses) {
    throw Object.assign(
      new Error(`This voice is recorded as belonging to ${someoneElses.owner}, so only they can consent to it. If it is yours, have that address corrected first.`),
      { status: 403, code: 'NOT_YOUR_VOICE', detail: { voiceId: id, owner: someoneElses.owner } },
    )
  }

  const outstanding = rows.filter((row) => consent.statusOf(row) !== 'authorised' || !ownership.isOwnedBy(row, email))
  if (!outstanding.length) {
    // Idempotent on purpose: two taps, a double-click, or a second person
    // arriving at the same screen must not rewrite a consent record that is
    // already complete and already linked.
    return { voice: rows[0], voices: rows, alreadyAuthorised: true, linked: true }
  }

  const written = []
  for (const row of outstanding) {
    const record = {
      consent_status: 'authorised',
      consent_person: name,
      // THE LINK. The one write that stops this happening again.
      consent_person_contact: email,
      consent_authorised_by: email,
      consent_authorised_how: CLAIMED_HOW(email),
      consent_authorised_at: now.toISOString(),
      consent_recorded_by: email,
      consent_recorded_at: now.toISOString(),
      consent_note: mergeNote(row, claimNote(row, name, email)),
      updated_at: now.toISOString(),
    }
    const { data: updated, error } = await db.from('voices').update(record).eq('voice_id', row.voice_id).select().single()
    if (error) throw Object.assign(new Error(`record consent: ${error.message}`), { status: 400 })
    written.push(updated)
  }
  return { voice: written[0], voices: written, alreadyAuthorised: false, linked: true }
}

/** The sentence that makes a claim legible as a claim, including what it replaced. */
function claimNote (voice, name, email) {
  const was = String((voice && voice.consent_person) || '').trim()
  const base = `${name} (${email}) claimed this voice as their own and consented to it.`
  return was && was.toLowerCase() !== name.toLowerCase()
    ? `${base} The voice previously named ${was}.`
    : base
}

/** Keep whatever the voice already said about itself; add, never replace. */
function mergeNote (voice, addition) {
  const existing = String((voice && voice.consent_note) || '').trim()
  if (!addition) return existing || null
  if (!existing) return addition
  if (existing.includes(addition)) return existing
  return `${existing} ${addition}`
}

module.exports = { claimOwnVoice, CLAIMED_HOW, SELECT }
