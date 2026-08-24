/**
 * dialect.cjs — the one spelling rule for a dialect tag.
 *
 * Tom, 2026-08-19: "dialect lives on the COURSE, not on the casting. A Southern
 * Welsh course is Southern as a fact of its content." So there are exactly two
 * places a dialect is stated — `courses.dialect` and a
 * `language_recording_policy.voices` entry's own `dialect` — and the recording
 * queue routes by matching one against the other. It is never inferred from a
 * course code, never inferred from who happens to be cast, and never guessed.
 *
 * WHY A DEFAULT AT ALL. Every language but Welsh has one dialect, and for those
 * languages this must change nothing whatsoever. Giving every course and every
 * voice the SAME explicit default means the match is trivially true everywhere
 * it used to be unasked — a no-op by construction rather than by a special case
 * somewhere in the queue. `courses.dialect` is NOT NULL DEFAULT 'standard' for
 * the same reason: there is no null to handle, so there is no null branch to
 * get wrong.
 *
 * 'standard' is deliberately not a real dialect name. A language that later
 * grows a second dialect renames its own courses' tags explicitly, which is a
 * visible content decision, not a silent reinterpretation of old rows.
 */

'use strict'

/** What a course or a voice means when it does not say. */
const DEFAULT_DIALECT = 'standard'

/**
 * Normalise a dialect tag for comparison and storage.
 *
 * Empty, null, whitespace and non-strings all mean "unstated", which IS the
 * default — see the header. Case and surrounding space never distinguish two
 * dialects, so they are folded away rather than becoming a way for 'North' and
 * 'north' to route to two different queues.
 *
 * @param {*} value
 * @returns {string} a non-empty lowercase tag
 */
function canonicalDialect(value) {
  if (typeof value !== 'string') return DEFAULT_DIALECT
  const trimmed = value.trim().toLowerCase()
  return trimmed || DEFAULT_DIALECT
}

/** The dialect a course's content is in. */
function courseDialect(course) {
  return canonicalDialect(course && course.dialect)
}

/**
 * The routing bucket a line or a recordist belongs to.
 *
 * Both halves are canonicalised here rather than at each call site, so the two
 * sides of the match cannot be normalised differently — which is the only way
 * this comparison could silently fail.
 */
function bucketKey(dialect, gender) {
  return `${canonicalDialect(dialect)}::${String(gender || '').toLowerCase()}`
}

module.exports = { DEFAULT_DIALECT, canonicalDialect, courseDialect, bucketKey }
