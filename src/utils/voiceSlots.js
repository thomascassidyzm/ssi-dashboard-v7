/**
 * Which voice slot is THIS person recording as?
 *
 * A course's cast lives in courses.voice_config.voices — one entry per slot
 * (known / target1 / target2 / presentation). A slot assigned to a real person
 * carries provider:'human' plus assignedEmail, the per-course record of who
 * holds it (dashboard_users.voice_id only mirrors that person's LATEST mint
 * across courses, so it is the fallback, never the primary match).
 *
 * This lived inline in RecordRoom.vue, which meant the studio mounted from the
 * production console had no idea who was at the microphone and silently
 * recorded as voice 1 — stamping a human take with voice 1's TTS voice id.
 * Both mounts now share this resolution.
 *
 * Vocabulary: known / target / seed.
 */

/** Slot lookup order: a person holds at most one, targets first. */
export const RECORDABLE_SLOTS = ['target1', 'target2', 'known', 'presentation']

/**
 * The slot this person holds on this course, or null if they hold none.
 *
 * @param {object|null} voiceConfig - courses.voice_config
 * @param {{email?: string|null, voiceId?: string|null}} person
 * @returns {string|null}
 */
export function resolveAssignedSlot(voiceConfig, person = {}) {
  const voices = voiceConfig?.voices
  if (!voices) return null
  const email = person.email || null
  const voiceId = person.voiceId || null
  for (const slot of RECORDABLE_SLOTS) {
    const v = voices[slot]
    if (!v?.voiceId) continue
    // assignedEmail is canonical — it survives a re-mint on another course.
    if (email && v.assignedEmail && v.assignedEmail === email) return slot
    // Fallback for configs written before assignedEmail existed.
    if (!v.assignedEmail && voiceId && v.voiceId === voiceId) return slot
  }
  return null
}

/**
 * The voice id a take recorded in this slot must be stamped with — only ever
 * a HUMAN voice. A slot still holding its TTS voice returns null rather than
 * that voice's id: a real person's take must never claim a synthetic voice
 * sang it.
 *
 * @returns {string|null}
 */
export function humanVoiceIdForSlot(voiceConfig, slot) {
  const v = voiceConfig?.voices?.[slot]
  if (!v || v.provider !== 'human') return null
  return v.voiceId || null
}

/**
 * Display name for a slot's voice — the person's name when a human holds it.
 * Falls back to the voice id, never to a bare slot key.
 */
export function slotVoiceName(voiceConfig, slot) {
  const v = voiceConfig?.voices?.[slot]
  if (!v) return null
  return v.name || v.assignedEmail || v.voiceId || null
}

/**
 * Jargon-free label for a slot, in the course's own languages.
 * 'target2' + German -> 'German — Voice 2'.
 */
export function slotLabel(slot, { targetLanguage = '', knownLanguage = '' } = {}) {
  const target = targetLanguage || 'Target'
  const known = knownLanguage || 'Known'
  switch (slot) {
    case 'target1': return `${target} — Voice 1`
    case 'target2': return `${target} — Voice 2`
    case 'known': return `${known} voice`
    case 'presentation': return 'Presenter voice'
    default: return slot || ''
  }
}

/**
 * The slots a recordist can be offered for this course, each carrying the
 * voice actually configured there so a multi-voice cast is visible rather
 * than guessed at. Slots with no voice configured at all are omitted.
 *
 * @returns {{slot: string, label: string, voiceName: string|null, isHuman: boolean}[]}
 */
export function recordableSlotOptions(voiceConfig, languages = {}) {
  const voices = voiceConfig?.voices || {}
  return RECORDABLE_SLOTS
    .filter(slot => voices[slot]?.voiceId)
    .map(slot => ({
      slot,
      label: slotLabel(slot, languages),
      voiceName: slotVoiceName(voiceConfig, slot),
      isHuman: voices[slot]?.provider === 'human'
    }))
}
