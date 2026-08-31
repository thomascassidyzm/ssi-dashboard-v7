/**
 * RECORDIST ONBOARDING · CONSENT — the voice id is minted WITH a yes attached,
 * or it is not minted.
 *
 * Tom's ruling, 2026-08-31, closing the one door the hard-block sweep left open:
 *
 *   "Consent becomes part of onboarding a recordist. A person being onboarded
 *    to record for us is exactly who should be stating, on the record, that
 *    they agree to their voice being used and cloned."
 *
 * ── WHY THIS EXISTS RATHER THAN A CARVE-OUT ─────────────────────────────────
 * `POST /assign-slot` mints a `human_*` voice id for a person and casts it into
 * a course's `voice_config` in one motion. The consent hard block
 * (services/shared/voice-consent-gate.cjs) refuses any `human_*` id with no
 * recorded consent — correctly, because "we know nothing about this person" is
 * the strongest possible reason to refuse. Which left the previous worker with
 * a choice between blocking onboarding outright and exempting it, and it took
 * the honest third option of naming the problem and stopping.
 *
 * The third option is this: DO NOT WEAKEN THE GATE, MOVE THE CONSENT EARLIER.
 * If the voice id is born with a recorded yes on it, the standing block simply
 * never fires for a properly onboarded recordist — no exemption exists to be
 * widened later, and the estate keeps exactly one rule.
 *
 * ── THE SAME MECHANISM, NOT A SECOND ONE ────────────────────────────────────
 * The declaration itself is `services/voicelab/declaration.cjs` — the phrase
 * read aloud and checked by whisper when they are at a microphone, the explicit
 * attestation when they are not — and the record it writes is the same
 * `consent_*` columns every other consented voice in the estate carries. This
 * module adds no new consent vocabulary, no new status, and no new opinion
 * about what counts. It does two things declaration.cjs cannot: it mints the
 * id, and it writes the `voices` row.
 *
 * ── AND IT WRITES A `voices` ROW, WHICH ONBOARDING NEVER DID ────────────────
 * That absence is not incidental. Six of the nine unconsented voices found cast
 * in the estate on 2026-08-31 were `human_*` ids with NO `voices` row at all —
 * `human_sasha_wanasky_deu_at`, the Welsh recordists — because slot assignment
 * wrote `dashboard_users.voice_id` and `courses.voice_config` and never
 * registered the voice anywhere a consent question could be asked of it. A
 * person who has agreed deserves a row saying so.
 */

'use strict'

const consent = require('../voicelab/consent.cjs')
const { mintVoiceId, isOwnMint, targetLangFromCourseCode } = require('./voice-slots.cjs')

/**
 * Mint (or re-use) this person's voice id for this course and write the
 * `voices` row with their consent already on it.
 *
 * ONE WRITE FOR THE VOICE. The birth record and the declaration are merged and
 * upserted together, so there is no instant at which the row exists without the
 * yes that justifies it — the failure mode of a follow-up update is a voice
 * whose consent write failed, which is indistinguishable from a voice nobody
 * asked.
 *
 * Re-use is deliberate and idempotent: a person re-declaring (a second reading,
 * or repairing a legacy id that has no row) refreshes the same voice rather
 * than accumulating `_2`, `_3` identities that split their recordings.
 *
 * @param {object} db                   supabase service-role client
 * @param {object} a
 * @param {string} a.email              the recordist's dashboard email
 * @param {string} a.courseCode         the course they are being onboarded to
 * @param {string} a.person             whose voice this is, in their own name
 * @param {object} a.declarationRecord  from declaration.captureDeclaration
 * @param {string|null} [a.existingVoiceId]  dashboard_users.voice_id today
 * @param {string|null} [a.name]        display name, if we have one
 * @param {string|null} [a.recordedBy]  the operator who was at the screen
 * @param {(candidate:string)=>Promise<boolean>} a.isTaken
 * @returns {Promise<{voiceId:string, voice:object, minted:boolean}>}
 */
async function onboardConsentedVoice (db, {
  email,
  courseCode,
  person,
  declarationRecord,
  existingVoiceId = null,
  name = null,
  recordedBy = null,
  isTaken,
}) {
  if (!declarationRecord || declarationRecord.consent_status !== 'authorised') {
    // Belt and braces on the module's whole reason for existing. Nothing in
    // this file may write a voice row for a person who has not said yes.
    throw Object.assign(
      new Error('A recordist voice cannot be created without a recorded consent declaration.'),
      { status: 400, code: 'NO_RECORDED_CONSENT' },
    )
  }

  const reused = isOwnMint(existingVoiceId, email, courseCode)
  const voiceId = reused
    ? existingVoiceId
    : await mintVoiceId({ email, courseCode, isTaken })

  // birthRecord is what insists on a named person — a yes nobody can be matched
  // to is a record nobody can ever act on — and the declaration is merged OVER
  // it, exactly as the clone path does, so the status it carries wins.
  const birth = consent.birthRecord({
    person,
    personContact: email,
    source: `recordist onboarding for ${courseCode}`,
    recordedBy,
  })

  const row = {
    voice_id: voiceId,
    type: 'human',
    human_name: person,
    human_email: email,
    display_name: name || person,
    // The TARGET language of the course — the language this person is being
    // onboarded to speak. voice-slots mints the id from the same segment, so
    // the row and the id cannot disagree about what the voice is for.
    languages: [targetLangFromCourseCode(courseCode)],
    is_active: true,
    metadata_source: 'recordist onboarding (team roster)',
    metadata_checked_at: new Date().toISOString(),
    notes: `Recordist on ${courseCode}${recordedBy ? `, onboarded by ${recordedBy}` : ''}.`,
    updated_at: new Date().toISOString(),
    ...birth,
    ...declarationRecord,
  }

  const { data, error } = await db.from('voices').upsert(row, { onConflict: 'voice_id' }).select().single()
  if (error) throw Object.assign(new Error(`voices upsert failed: ${error.message}`), { status: 400 })
  return { voiceId, voice: data, minted: !reused }
}

module.exports = { onboardConsentedVoice }
