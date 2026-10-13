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
 * NOT RENAMED: the Health pods (health, health-ladder-pilot) and the
 * guess-game pod — nobody has chosen a booth name for them yet.
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
  'cym_n_for_eng/pod-1': { title: 'Welsh Pod1', dialect: 'North' },
  'cym_s_for_eng/pod-1': { title: 'Welsh Pod1', dialect: 'South' },
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
  return podTitle || podSlug
}
