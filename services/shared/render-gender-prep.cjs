/**
 * SPEAKER-GENDER PREP ON THE ONE AUDIO ROUTE (cs #989·AI, 2026-11-19; Kai's #984 finding, thread ww-03084ac1).
 *
 * POST /api/audio/render used to speak its text exactly as given. In a gendered target language the row text is the
 * male form ("no estoy listo"), so a female (target1) clip rendered through the route said "listo", not "lista" —
 * #984 re-recorded 8 such clips by hand, #129/#130 found 505 in ita. Phase 8's own render paths never had the gap,
 * and this module makes the route do EXACTLY what they do — nothing new is invented here:
 *
 *   - target1 is the female seat and speaks course_gender_expansions.expanded_f; target2 the male seat and speaks
 *     expanded_m (services/gender-haiku-service.cjs loadGenderMap / storedGenderReading). The row is keyed by the
 *     course, the exact target text and text_side 'target'. A null expanded_* means "no different form": the text is
 *     spoken as written.
 *   - a text with no row yet, in a course that needs prep, gets its row the way an edit gets it:
 *     gender-haiku-service.ensureExpansionForText (female form only where the word refers back to the speaker; it never
 *     overwrites a row, hand fixes included). A course that does not need prep answers 'not-gendered' and is untouched.
 *     If that model call FAILS the render is refused 503 GENDER_PREP_MISSING — never rendered in the male form.
 *   - the marker fallback ("cansado(a)") phase8 applies when there is no stored reading: gender-expansion-service.
 *
 * WHAT IS STORED: the clip row keeps the ROW text as its label, as every phase8 clip does ("course_audio.text keeps
 * the ORIGINAL text — it is the lookup key", gender-haiku-service storedGenderReading). That is what lets the caller's
 * link-clip (text must equal the slot's text) attach it, and what lets library-first find it again for the same seat.
 * A re-record (replaceAudioId) with no spokenText is given the female form as its spokenText — the #984/#142 method,
 * which leaves a clip_spoken_text verdict (shared/clip-spoken-words.cjs).
 *
 * TARGET SIDE ONLY (r-2026-09-23-known-side-prompts-do-not-carry, r-2026-09-23-known-side-never-gets-a-second):
 * known and presentation are never touched here; gendered known voices have their own rule
 * (services/shared/known-voice-gender.cjs). Pod lines take their pod cast; trials and adopts link nothing.
 */

class GenderPrepError extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code }
}

/** Does the route prep this request at all? Target seats only. */
function prepsSlot(req) {
  return (req.role === 'target1' || req.role === 'target2') && !req.podSentenceId && !req.trial && !req.adoptS3Key
}

/** The seat's reading from one course_gender_expansions row: expanded_f for target1, expanded_m for target2. Pure. */
function readingOf(row, role) {
  if (!row) return null
  const r = role === 'target1' ? row.expanded_f : role === 'target2' ? row.expanded_m : null
  return r && String(r).trim() ? String(r) : null
}

/**
 * The words this request should SPEAK, or null when the route does not prep it (not a target seat, or the caller
 * named its own spokenText). Answer: { spoken, status } where status is
 *   'stored'        — a course_gender_expansions row gives this seat its form (spoken may equal the text: no variant)
 *   'ensured'       — no row existed; ensureExpansionForText wrote it now
 *   'marker'        — the "(a)" marker fallback
 *   'as-written'    — the course needs no prep, or the text has no speaker-gendered word
 * deps.genderRow({ courseCode, text }) → { expanded_f, expanded_m } | null          one row, text_side 'target'
 * deps.ensureGender({ courseCode, text }) → { status, row? }                         gender-haiku-service.ensureExpansionForText
 * deps.markerForm({ text, language, role }) → string | null                          gender-expansion-service marker fallback
 */
async function speakerForm(req, { language }, deps) {
  if (!prepsSlot(req) || req.spokenText || !deps.genderRow) return null
  const text = req.text
  const done = (spoken, status) => ({ spoken: spoken || text, status })
  let row = await deps.genderRow({ courseCode: req.courseCode, text })
  if (row) return done(readingOf(row, req.role), 'stored')
  let ensured
  try {
    ensured = deps.ensureGender ? await deps.ensureGender({ courseCode: req.courseCode, text }) : { status: 'skipped' }
  } catch (e) {
    throw new GenderPrepError(`gender prep for "${text.slice(0, 60)}" failed (${e.message}) — not rendered in the unprepared form; try again later`, 503, 'GENDER_PREP_MISSING')
  }
  if (ensured.status === 'llm-failed') {
    throw new GenderPrepError(`gender prep for "${text.slice(0, 60)}" could not be made (the expansion model failed) — not rendered in the unprepared form; try again later`, 503, 'GENDER_PREP_MISSING')
  }
  if (ensured.status === 'written') return done(readingOf(ensured.row, req.role), 'ensured')
  if (ensured.status === 'exists') {          // written between our read and the ensure (an edit, Kai's room): read it
    row = await deps.genderRow({ courseCode: req.courseCode, text })
    if (row) return done(readingOf(row, req.role), 'stored')
  }
  // 'no-variants' | 'not-gendered' | 'skipped': nothing stored to speak; phase8's marker fallback, else as written.
  const marked = deps.markerForm ? deps.markerForm({ text, language, role: req.role }) : null
  if (marked && marked !== text) return done(marked, 'marker')
  return done(null, 'as-written')
}

/** The answer fields every prepped response carries, so a dry run shows what WOULD be spoken. */
function echo(prep) {
  return prep ? { renderText: prep.spoken, genderPrep: prep.status } : {}
}

module.exports = { GenderPrepError, prepsSlot, readingOf, speakerForm, echo }
