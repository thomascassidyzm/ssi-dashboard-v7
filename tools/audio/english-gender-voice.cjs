/**
 * English has two homes and they are voiced differently (Tom 2026-10-12, job #52, superseding the two "female English" rulings for X_for_eng):
 *   X_for_eng  — English is the KNOWN side: EVERY known line is Tom-006, whatever voice it had before. No gender variance, no Charlotte.
 *   eng_for_X  — English is the TARGET side (target2 slot): gender variance is kept. A line whose old clip is a female voice (eve, Sonia, Olivia...) goes to
 *                Charlotte; every other line (male, or a voice in neither list) goes to Tom-006. Clips already on a Cartesia voice there are left alone.
 * Used by tools/audio/tom006-english.cjs (job #813).
 */
const { voiceGender, CHARLOTTE } = require('./charlotte-backfill.cjs')
const TOM_006 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'
const targetGender = oldVoice => (voiceGender(oldVoice) === 'f' ? 'f' : 'm')
const targetVoice = g => (g === 'f' ? CHARLOTTE : TOM_006)
const isEngForX = course => String(course).startsWith('eng_for_')
/** The voice an English slot belongs in, or null when it is to be left alone. */
function englishSlotVoice({ course, col, clipVoice }) {
  if (!isEngForX(course)) return col === 'known_audio_id' && clipVoice !== TOM_006 ? TOM_006 : null
  if (col !== 'target2_audio_id' || /^cartesia_/.test(String(clipVoice))) return null
  return targetVoice(targetGender(clipVoice))
}
module.exports = { targetGender, targetVoice, englishSlotVoice, isEngForX, TOM_006, CHARLOTTE }
