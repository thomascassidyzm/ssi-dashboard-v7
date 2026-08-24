/**
 * Voice-slot logic for the human voice engine (pure functions, no I/O).
 *
 * A course's voices live in courses.voice_config JSONB:
 *   { voices: { known, target1, target2, presentation }, providers, cadenceProfiles, ... }
 * Each voice entry: { provider, voiceId, settings, ... }  — this JSONB drives live
 * TTS serving, so every transform here MUST be surgical: touch only the one slot
 * being assigned/vacated and preserve every other key byte-for-byte.
 *
 * Human voice id format (keystone doc, docs/voice-engine/design/multi-voice-model.md):
 *   human_{email-localpart}_{course target lang}     e.g. human_maria_mkd
 * minted at slot-assignment time, collision-suffixed _2, _3, ...
 *
 * Vocabulary: known / target / seed. Never the banned legacy term.
 */

'use strict'

/** The two spliceable target voice slots a leader can assign a recorder to. */
const ASSIGNABLE_SLOTS = ['target1', 'target2']

/** Sentinel used by the API to mean "remove this person from their slot". */
const UNASSIGNED = 'unassigned'

/**
 * Sanitized local part of an email address (same rule the invite path uses).
 * maria.x@a.com -> maria_x
 */
function emailLocalPart(email) {
  return String(email || '')
    .split('@')[0]
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
}

/**
 * Target language segment of a course code: everything before '_for_'.
 * mkd_for_fra -> mkd, cym_n_for_eng -> cym_n.
 * (The learner's KNOWN language is the suffix; the voice records the TARGET.)
 */
function targetLangFromCourseCode(courseCode) {
  return String(courseCode || '').split('_for_')[0]
}

/**
 * Base (un-suffixed) human voice id for a person on a course.
 */
function voiceIdBase(email, courseCode) {
  return `human_${emailLocalPart(email)}_${targetLangFromCourseCode(courseCode)}`
}

/**
 * Does an existing voice id belong to this person+course mint family?
 * Matches the base exactly or base_{n} collision suffixes.
 */
function isOwnMint(existingVoiceId, email, courseCode) {
  if (!existingVoiceId) return false
  const base = voiceIdBase(email, courseCode)
  if (existingVoiceId === base) return true
  const m = existingVoiceId.startsWith(`${base}_`) && /^\d+$/.test(existingVoiceId.slice(base.length + 1))
  return !!m
}

/**
 * Mint a voice id, suffixing _2, _3, ... while `isTaken(candidate)` is truthy.
 * `isTaken` may be sync or async (it should answer "is this id used by ANOTHER person").
 *
 * @returns {Promise<string>}
 */
async function mintVoiceId({ email, courseCode, isTaken }) {
  const base = voiceIdBase(email, courseCode)
  let candidate = base
  let n = 1
  // Hard stop at 1000 — if a community course has a thousand Marias something else is wrong.
  while (await isTaken(candidate)) {
    n += 1
    if (n > 1000) throw new Error(`Could not mint a unique voice id from ${base}`)
    candidate = `${base}_${n}`
  }
  return candidate
}

/**
 * Deep-clone helper (voice_config objects are plain JSON).
 */
function clone(obj) {
  return obj == null ? obj : JSON.parse(JSON.stringify(obj))
}

/**
 * Assign a human voice to one slot of a voice_config. NON-DESTRUCTIVE:
 * - returns a new object; the input is never mutated
 * - every key outside `voices[slot]` is preserved exactly
 * - inside the slot, existing keys (settings, language, ...) are preserved;
 *   provider/voiceId (+ assignedEmail, + the display name) change
 * - the displaced non-human voice is stashed under `previousVoice` so an
 *   unassign can restore it (if the slot already held a human, its own
 *   previousVoice is carried forward — chains back to the original TTS voice)
 * - the slot's DISPLAY NAME becomes the person's, and the displaced voice's
 *   `gender` is dropped. Preserving them made every voice UI announce the
 *   departed TTS voice as the human on the slot ("Jonas — HUMAN" for a slot
 *   Sascha actually holds, deu_at_for_eng 2026-08), which is exactly how a
 *   leader loses the ability to see or pick their own cast. Both ride into
 *   previousVoice so an unassign restores the TTS voice intact.
 * - `assignedEmail` rides on the slot because dashboard_users.voice_id is a
 *   SINGLE column mirroring only the latest mint: a recorder assigned on two
 *   courses with different target langs no longer matches the first course's
 *   slot by voice_id alone. The per-course voice_config is the canonical
 *   "who holds this slot" record.
 *
 * @param {object|null} voiceConfig - raw courses.voice_config (may be null)
 * @param {string} slot - 'target1' | 'target2'
 * @param {string} voiceId - minted human voice id
 * @param {string|null} [assignedEmail] - the person holding the slot
 * @param {string|null} [assignedName] - the person's display name (falls back
 *   to the email's local part, then the voice id — never the displaced voice)
 * @returns {object} new voice_config
 */
function assignVoiceToSlot(voiceConfig, slot, voiceId, assignedEmail = null, assignedName = null) {
  if (!ASSIGNABLE_SLOTS.includes(slot)) {
    throw new Error(`Slot must be one of ${ASSIGNABLE_SLOTS.join(', ')} (got: ${slot})`)
  }
  if (!voiceId) throw new Error('voiceId is required')

  const config = clone(voiceConfig) || {}
  if (!config.voices || typeof config.voices !== 'object') config.voices = {}

  const existing = config.voices[slot] || {}
  const entry = { ...existing, provider: 'human', voiceId }
  if (assignedEmail) entry.assignedEmail = assignedEmail
  else delete entry.assignedEmail

  // The name every voice UI shows for this slot is now the PERSON's.
  entry.name = assignedName
    || (assignedEmail ? String(assignedEmail).split('@')[0] : null)
    || voiceId
  // `gender` described the displaced synthetic voice, not this person.
  delete entry.gender

  if (existing.voiceId && existing.provider !== 'human') {
    // Displacing a TTS voice — remember it (name and gender included) so
    // unassign can restore the slot exactly as it was.
    entry.previousVoice = { provider: existing.provider || null, voiceId: existing.voiceId }
    if (existing.name) entry.previousVoice.name = existing.name
    if (existing.gender) entry.previousVoice.gender = existing.gender
  }
  // (If the slot already held a human, ...existing already carried its previousVoice.)

  config.voices[slot] = entry
  return config
}

/**
 * Vacate a slot (only if it currently holds a human voice). Restores the
 * stashed previousVoice if present; otherwise leaves an empty default-shaped
 * slot ({ provider: 'azure', voiceId: '' } — matches DEFAULT_VOICE_CONFIG's
 * "unconfigured" shape, which downstream validation skips).
 * Non-destructive to every other key.
 *
 * @returns {object} new voice_config
 */
function vacateSlot(voiceConfig, slot) {
  if (!ASSIGNABLE_SLOTS.includes(slot)) {
    throw new Error(`Slot must be one of ${ASSIGNABLE_SLOTS.join(', ')} (got: ${slot})`)
  }
  const config = clone(voiceConfig) || {}
  const existing = config.voices && config.voices[slot]
  if (!existing || existing.provider !== 'human') return config

  // `name`/`gender` on a human slot describe the PERSON — they must not
  // survive them leaving. The displaced voice's own name/gender come back
  // from previousVoice when it stashed them.
  const { previousVoice, assignedEmail, name, gender, ...rest } = existing
  if (previousVoice && previousVoice.voiceId) {
    config.voices[slot] = {
      ...rest,
      provider: previousVoice.provider || 'azure',
      voiceId: previousVoice.voiceId,
      ...(previousVoice.name ? { name: previousVoice.name } : {}),
      ...(previousVoice.gender ? { gender: previousVoice.gender } : {})
    }
  } else {
    config.voices[slot] = { ...rest, provider: 'azure', voiceId: '' }
  }
  return config
}

/**
 * Which assignable slot (if any) a given human voice id currently holds.
 * @returns {string|null}
 */
function findSlotForVoice(voiceConfig, voiceId) {
  if (!voiceId || !voiceConfig || !voiceConfig.voices) return null
  for (const slot of ASSIGNABLE_SLOTS) {
    const v = voiceConfig.voices[slot]
    if (v && v.provider === 'human' && v.voiceId === voiceId) return slot
  }
  return null
}

/**
 * Which assignable slot (if any) a PERSON holds on this course — matched by
 * the slot's assignedEmail first (per-course canonical), falling back to
 * voice_id for configs written before assignedEmail existed. This is the
 * lookup that survives the same person being assigned on a second course
 * (which re-mints dashboard_users.voice_id).
 * @returns {string|null}
 */
function findSlotForMember(voiceConfig, { email = null, voiceId = null } = {}) {
  if (!voiceConfig || !voiceConfig.voices) return null
  for (const slot of ASSIGNABLE_SLOTS) {
    const v = voiceConfig.voices[slot]
    if (!v || v.provider !== 'human') continue
    if (v.assignedEmail) {
      // assignedEmail is canonical — a stale voice_id never claims a slot
      // that has been reassigned to someone else.
      if (email && v.assignedEmail === email) return slot
      continue
    }
    if (voiceId && v.voiceId === voiceId) return slot
  }
  return null
}

/**
 * Summary of the two target slots for the roster UI.
 * @returns {{ slot: string, provider: string|null, voiceId: string|null,
 *             isHuman: boolean, assignedEmail: string|null }[]}
 */
function slotSummary(voiceConfig) {
  return ASSIGNABLE_SLOTS.map(slot => {
    const v = (voiceConfig && voiceConfig.voices && voiceConfig.voices[slot]) || {}
    return {
      slot,
      provider: v.provider || null,
      voiceId: v.voiceId || null,
      isHuman: v.provider === 'human' && !!v.voiceId,
      assignedEmail: v.assignedEmail || null,
    }
  })
}

/** Does a dashboard_users.courses value grant access to courseCode? */
function holdsCourse(courses, courseCode) {
  if (courses === '*') return true
  if (Array.isArray(courses)) return courses.includes(courseCode)
  return false
}

module.exports = {
  ASSIGNABLE_SLOTS,
  UNASSIGNED,
  emailLocalPart,
  targetLangFromCourseCode,
  voiceIdBase,
  isOwnMint,
  mintVoiceId,
  assignVoiceToSlot,
  vacateSlot,
  findSlotForVoice,
  findSlotForMember,
  slotSummary,
  holdsCourse,
}
