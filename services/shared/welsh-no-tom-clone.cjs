/**
 * HARD RULE (Tom, 2026-10-13, r-2026-10-13-hard-rule-tom-s-voice-clone): "my clone should never have been used for
 * anything in the WELSH courses!!!!"
 *
 * Specimen: English-known resolved to Tom-006 "in ANY course" (resolve-voice.cjs), so 1,500+ English prompts of
 * cym_n/s_for_eng and their sandboxes were pointed at Tom clones on 2026-10-12/13. Welsh English prompts are human recordings.
 *
 * This is the ONE definition of "a Tom clone" and "a Welsh course". resolveVoice, checkPointer and the voicing policy
 * (the render door) all ask it; none of them may carve an exception. A Tom clone in a Welsh course is refused, not warned.
 */

/** Every voice that is a clone of Tom (display names Tom_001..Tom-006, his Italian clones, the older xAI "Tom" gfzdpspr5fdp). Compared bare, any provider prefix. */
const TOM_CLONE_VOICES = Object.freeze([
  '8fef4d59-0a7e-4ad2-a261-6a3bb50734d2',   // tom_001
  'e7ed10ad-8aaa-41fd-b3a2-eb7d5e0b4bac',   // Tom_002
  'f56e05e2-d043-4b41-a7cb-faf528b99e01',   // Tom_003
  'b478fefe-f18a-4f3a-b3d3-cbef52732e2e',   // Tom-005
  'd293d509-eb96-4df4-8cfd-80a693aa49a9',   // Tom-006
  '0b09cc76-ea7e-4f07-bd7f-26ea2c66d1d4',   // Tom Italian clone sample 2026-09-04
  '5ab58db1-f66d-408e-955f-5f0c1f7445e4',   // tom_ita_002
  'gfzdpspr5fdp',                           // the original "Tom" clone (xAI-hosted, 2026-02..08)
])

const bareVoice = v => String(v || '').trim().toLowerCase().replace(/^(cartesia|xai|elevenlabs|azure)_/, '')
const isTomCloneVoice = v => !!v && TOM_CLONE_VOICES.includes(bareVoice(v))

/** A Welsh course: cym appears as a language segment of the code (cym_n_for_eng, cym_sv2_for_eng, cym_for_yor, eng_for_cym) or as the course's target/known language. */
function isWelshCourse(course) {
  if (!course) return false
  const code = typeof course === 'string' ? course : course.course_code
  if (/(^|_)cym(_|$)/i.test(String(code || ''))) return true
  return typeof course === 'object' && [course.target_lang, course.known_lang].some(l => /^cym(_|$)/i.test(String(l || '')))
}

const WELSH_TOM_MESSAGE = (courseCode, voiceId) => `${courseCode || 'a Welsh course'}: ${voiceId} is a Tom clone, and Tom's clone is never used in any Welsh course (Tom 2026-10-13, r-2026-10-13-hard-rule-tom-s-voice-clone). Welsh English prompts are human recordings; a synthetic voice for them needs Tom's say-so.`

module.exports = { TOM_CLONE_VOICES, isTomCloneVoice, isWelshCourse, WELSH_TOM_MESSAGE }
