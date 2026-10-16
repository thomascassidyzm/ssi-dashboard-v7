/**
 * What the booth's nav chips SAY to a voice actor.
 *
 * Aran, 2026-10-13, looking at Catrin's booth: the chips read "Course
 * cym_n_for_eng", "Course cym_nv2_for_eng" and "Northern Welsh (colloquial
 * Gogledd Cymru Welsh) Listening Pods — Pod 1" — course codes and catalogue
 * titles, which mean nothing to a reader. A chip is named here, for the booth
 * only: the course's own display_name and the pod's own title are read by other
 * screens (and learners), so neither is rewritten in the database.
 *
 * Anything not in these maps keeps the label it had before, so a new course or
 * pod is never hidden — it is just named by its code until someone names it.
 *
 * NOT RENAMED: the guess-game pod — nobody has chosen a booth name for it yet.
 */

// Aran's own words, 2026-10-13. North and South use the same words; only a
// booth that holds both dialects at once (Aran's English booth reads the known
// side of all four courses) adds which one, so the chips stay tellable apart.
export const BOOTH_COURSE_TITLES = {
  cym_n_for_eng: { title: 'Old Welsh', dialect: 'North' },
  cym_nv2_for_eng: { title: 'New Welsh', dialect: 'North' },
  cym_s_for_eng: { title: 'Old Welsh', dialect: 'South' },
  cym_sv2_for_eng: { title: 'New Welsh', dialect: 'South' },
}

// Keyed `${courseCode}/${podSlug}`: every course's core pod is `pod-1`.
export const BOOTH_POD_TITLES = {
  // 'Pod 1' — its display name (Kai and Aran, 2026-10-16, job #247; was 'Welsh Pod1').
  'cym_n_for_eng/pod-1': { title: 'Pod 1', dialect: 'North' },
  'cym_s_for_eng/pod-1': { title: 'Pod 1', dialect: 'South' },
}

// Pods named by slug alone, whichever course holds them (no dialect to add).
// Aran, 2026-10-13: display only — the pod rows and ids are untouched.
export const BOOTH_POD_SLUG_TITLES = {
  health: 'Health (scripts)',
  'health-ladder-pilot': 'Health (test)',
}

function named(entry, shownDialects) {
  return shownDialects.size > 1 ? `${entry.title} — ${entry.dialect}` : entry.title
}

function dialectsOf(keys, map) {
  return new Set(keys.map(k => map[k] && map[k].dialect).filter(Boolean))
}

// `allCodes`: every course whose chip is on this booth.
export function boothCourseChip(courseCode, allCodes = [courseCode]) {
  const entry = BOOTH_COURSE_TITLES[courseCode]
  if (entry) return named(entry, dialectsOf(allCodes, BOOTH_COURSE_TITLES))
  return allCodes.length === 1 ? 'Course' : `Course ${courseCode}`
}

// `allKeys`: every `${courseCode}/${podSlug}` whose chip is on this booth.
export function boothPodChip({ courseCode, podSlug, podTitle } = {}, allKeys = [`${courseCode}/${podSlug}`]) {
  const entry = BOOTH_POD_TITLES[`${courseCode}/${podSlug}`]
  if (entry) return named(entry, dialectsOf(allKeys, BOOTH_POD_TITLES))
  return BOOTH_POD_SLUG_TITLES[podSlug] || podTitle || podSlug
}

// A pod's SECTION HEADING on the booth page: the same words as its chip, so the
// page reads one way. Null when the pod has no booth name — the caller then
// keeps the heading it always had. A heading is keyed by pod slug alone (the
// queue's pod groups span courses), so it never adds the dialect.
export function boothPodHeading({ courseCode, podSlug } = {}) {
  if (BOOTH_POD_SLUG_TITLES[podSlug]) return BOOTH_POD_SLUG_TITLES[podSlug]
  const entry = BOOTH_POD_TITLES[`${courseCode}/${podSlug}`]
  return entry ? entry.title : null
}

// Where a course's own name is wanted in a sentence ("Pass 1 of 2 · New Welsh —
// North batch 3 of 30"): always with the dialect, the phrase queue spans both.
export function boothCourseWords(courseCode, fallback) {
  const entry = BOOTH_COURSE_TITLES[courseCode]
  return entry ? `${entry.title} — ${entry.dialect}` : (fallback || courseCode)
}

// THE RELAUNCH SANDBOXES, whose sentences are NEW reading in the booth even though their seed
// rows already exist in the course (Aran, 2026-10-14, job #347: #335 found his 640 new North
// sentences filed under "seeds already in the course — not new"). The same two courses the
// server's phrase queue records (services/voice-engine/phrase-queue.cjs PHRASE_QUEUE_COURSES).
export const BOOTH_NEW_COURSES = new Set(['cym_nv2_for_eng', 'cym_sv2_for_eng'])
export function isBoothNewCourse(courseCode) { return BOOTH_NEW_COURSES.has(courseCode) }
