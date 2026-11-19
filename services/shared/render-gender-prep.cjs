/**
 * SPEAKER-GENDER PREP ON THE ONE AUDIO ROUTE (cs #989·AI, 2026-11-19; Kai's #984 finding, thread ww-03084ac1).
 *
 * POST /api/audio/render spoke its text exactly as given. In a gendered target language the row text is the male
 * form ("no estoy listo"), so a female (target1) clip rendered through the route said "listo", not "lista" — #984
 * re-recorded 8 such clips by hand, #129/#130 found 505 in ita. Phase 8's own render paths never had the gap: they
 * look the text up in course_gender_expansions and speak expanded_f for target1, expanded_m for target2
 * (services/gender-haiku-service.cjs storedGenderReading).
 *
 * STEP 1 (this commit): A HOLD. Until the real prep is in the route, a target1 (female seat) render in a course that
 * needs gender prep is refused 409 GENDER_PREP_PENDING, so nothing is served or paid for in the male form. Callers
 * log it and leave the slot for later.
 *
 * TARGET SIDE ONLY (r-2026-09-23-known-side-prompts-do-not-carry, r-2026-09-23-known-side-never-gets-a-second):
 * known and presentation are never touched here; gendered known voices have their own rule
 * (services/shared/known-voice-gender.cjs).
 */

class GenderPrepError extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code }
}

/** Does the route prep this request at all? Target seats only; pod lines take their own cast, trials link nothing. */
function prepsSlot(req) {
  return (req.role === 'target1' || req.role === 'target2') && !req.podSentenceId && !req.trial && !req.adoptS3Key
}

/**
 * The course's gendered-ness, by the same test as gender-haiku-service.ensureExpansionForText and the gender-prep
 * endpoint: an explicit needs_gender_prep wins, else the target language decides.
 */
function courseNeedsPrep(course, gendered) {
  if (!course) return false
  return course.needs_gender_prep === true || (course.needs_gender_prep == null && gendered.includes(course.target_lang))
}

/**
 * HOLD: throws GENDER_PREP_PENDING for a female-seat render in a gendered course. A re-record that names its own
 * spokenText (the #984/#142 method) already says the words it means and is let through.
 * deps.genderCourse(courseCode) → { needs_gender_prep, target_lang, gendered: string[] } | null
 */
async function holdIfPending(req, deps) {
  if (!prepsSlot(req) || req.role !== 'target1' || req.spokenText || !deps.genderCourse) return
  const c = await deps.genderCourse(req.courseCode)
  if (c && courseNeedsPrep(c, c.gendered || [])) {
    throw new GenderPrepError(`${req.courseCode} target1 (female seat) is held: the render route does not yet speak the female form ` +
      `(course_gender_expansions) — leave this slot for later, do not retry tonight (cs #989)`, 409, 'GENDER_PREP_PENDING')
  }
}

module.exports = { GenderPrepError, prepsSlot, courseNeedsPrep, holdIfPending }
