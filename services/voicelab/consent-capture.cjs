/**
 * VOICELAB · CONSENT CAPTURE — the yes recorded onto a voice THAT ALREADY EXISTS.
 *
 * Tom's ruling, 2026-08-31, carried forward to the screens: "we are never going
 * to use a voice without consent" — and, once that block was real, the thing it
 * exposed: a lock with no key.
 *
 * ── THE HOLE THIS FILLS ─────────────────────────────────────────────────────
 * Consent could be captured in exactly two places, and both of them are moments
 * when a voice is BORN:
 *
 *   the clone routes        services/voicelab/router.cjs — declaration taken as
 *                           part of creating the clone.
 *   recordist onboarding    services/voice-engine/recordist-consent.cjs — the
 *                           id minted with the yes already on it.
 *
 * Neither helps the far commoner case: a voice that exists ALREADY, refused by
 * the standing gate at the moment somebody tries to cast it. PodLab's cast
 * screen is the specimen — the gate correctly refuses an unconsented voice and
 * the screen had no way at all to satisfy it, so a new pod speaker could not be
 * cast by anybody. And there is a whole population in this shape: on 2026-08-31
 * twenty voices in the estate were refusable, nineteen of them created months
 * before the block, four of them `human_*` ids with no `voices` row at all.
 *
 * So: the SAME declaration, on a voice that is already here.
 *
 * ── AND WHY IT IS NOT A SECOND CONSENT MECHANISM ────────────────────────────
 * Nothing about consent is decided in this file. The words, the whisper check,
 * the three ways through and the columns written are all
 * `services/voicelab/declaration.cjs` and `services/voicelab/consent.cjs`,
 * exactly as the clone route and onboarding use them. This module does the one
 * thing neither of those can: it writes the record onto a voice_id it did not
 * create. That is the whole of it — a row write and a cache drop.
 *
 * ── IT WILL CREATE A ROW, AND THAT IS THE POINT ─────────────────────────────
 * Four of the nine unconsented voices found cast in the estate are `human_*`
 * ids with NO `voices` row: slot assignment wrote the id onto the person and
 * onto the course and never registered the voice anywhere a consent question
 * could be asked of it. `UPDATE … WHERE voice_id = …` matches nothing for those,
 * which would leave the exact people the gate is protecting permanently
 * unconsentable. So a missing row is CREATED, minimally and honestly: the id,
 * what its shape says it is, the language the caller named, and the yes.
 *
 * ── WHAT IT REFUSES TO DO ───────────────────────────────────────────────────
 * It will not write anything but consent onto a row that already exists. A
 * voice's provider, languages, gender and name are somebody else's facts and a
 * consent step is not the place to quietly change them.
 */

'use strict'

const consent = require('./consent.cjs')
const personhood = require('../shared/voice-personhood.cjs')

/**
 * A voice id that names a person by construction — the estate's convention.
 *
 * Delegated to the shared answer since 2026-08-31: this was the fifth inline
 * copy of "is there a person behind this voice", and copies of that rule are
 * how a rule about people ends up applied to things
 * (services/shared/voice-personhood.cjs).
 */
function looksLikeAPerson (voiceId) {
  return personhood.looksLikeARecordist(voiceId)
}

/**
 * Write a consent declaration onto a voice that already exists.
 *
 * @param {object} db  supabase client
 * @param {object} a
 * @param {string} a.voiceId
 * @param {object} a.declarationRecord   from declaration.captureDeclaration
 * @param {string} a.person              whose voice this is, named
 * @param {string|null} [a.personContact]
 * @param {string|null} [a.recordedBy]   the operator at the screen
 * @param {string|null} [a.source]       where the sample came from, in one line
 * @param {string|null} [a.note]
 * @param {string|null} [a.language]     only used when a row has to be created
 * @returns {Promise<{voice: object, created: boolean}>}
 */
async function recordConsentOnVoice (db, {
  voiceId,
  declarationRecord,
  person,
  personContact = null,
  recordedBy = null,
  source = null,
  note = null,
  language = null,
}) {
  const id = String(voiceId || '').trim()
  if (!id) throw Object.assign(new Error('voiceId is required'), { status: 400 })
  if (!declarationRecord || declarationRecord.consent_status !== 'authorised') {
    // Belt and braces on this module's reason for existing, the same guard
    // recordist-consent.cjs carries: nothing here may write a yes that the
    // declaration itself did not produce.
    throw Object.assign(
      new Error('Consent cannot be recorded without a declaration — the line read aloud, or the written statement.'),
      { status: 400, code: 'NO_RECORDED_CONSENT' },
    )
  }

  // birthRecord is what insists on a NAMED person: a yes nobody can be matched
  // to is a record nobody can ever act on. The declaration is merged OVER it,
  // exactly as the clone path does, so the status the declaration carries wins.
  const record = {
    ...consent.birthRecord({ person, personContact, source, note, recordedBy }),
    ...declarationRecord,
  }

  const { data: existing, error: readErr } = await db
    .from('voices').select(`voice_id, ${consent.COLUMNS}`).eq('voice_id', id).maybeSingle()
  if (readErr) throw Object.assign(new Error(`read voice: ${readErr.message}`), { status: 400 })

  // A NO IS NEVER WALKED BACK HERE. `refused` and `withdrawn` mean a human
  // actively said no, and the migration keeps them apart from `not_recorded`
  // precisely so a voice can never drift from "they said no" back to "we never
  // asked". A cast screen is not the place to overturn that: whoever is at the
  // microphone now, the estate already holds a recorded refusal from the person
  // whose voice it is, and reversing it is a deliberate act for the Voice Lab's
  // own consent editor with an operator who can see the whole record.
  if (existing && (consent.statusOf(existing) === 'refused' || consent.statusOf(existing) === 'withdrawn')) {
    throw Object.assign(
      new Error(`${existing.consent_person || id} has already said no to their voice being used. That decision is not something to overturn from here — pick a different voice.`),
      { status: 409, code: 'CONSENT_REFUSED_ALREADY', detail: { voiceId: id, consentStatus: consent.statusOf(existing) } },
    )
  }

  if (existing) {
    const { data, error } = await db
      .from('voices')
      .update({ ...record, updated_at: new Date().toISOString() })
      .eq('voice_id', id).select().single()
    if (error) throw Object.assign(new Error(`record consent: ${error.message}`), { status: 400 })
    return { voice: data, created: false }
  }

  // No row. Create the minimum the table insists on — voice_id, type and
  // languages are NOT NULL — and nothing beyond it. `type` is read off the id's
  // own shape rather than guessed: `human_*` is the estate's word for a person.
  if (!language) {
    throw Object.assign(
      new Error(`There is no record of ${id} in the voices table at all, so recording consent has to create one — say which language this voice is for.`),
      { status: 400, code: 'VOICE_ROW_MISSING', detail: { needsLanguage: true, voiceId: id } },
    )
  }
  const row = {
    voice_id: id,
    type: looksLikeAPerson(id) ? 'human' : 'tts',
    languages: [String(language)],
    is_active: true,
    display_name: person || id,
    metadata_source: 'consent recorded on a voice that had no row',
    updated_at: new Date().toISOString(),
    ...record,
  }
  if (looksLikeAPerson(id)) row.human_name = person || id
  const { data, error } = await db.from('voices').insert(row).select().single()
  if (error) throw Object.assign(new Error(`create voice row: ${error.message}`), { status: 400 })
  return { voice: data, created: true }
}

module.exports = { recordConsentOnVoice, looksLikeAPerson }
