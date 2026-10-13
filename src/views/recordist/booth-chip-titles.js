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
 * NOT RENAMED ON PURPOSE: the Health pods (health, health-ladder-pilot) and the
 * guess-game pod are Tom's projects; their names are his call, not this map's.
 */

export const BOOTH_COURSE_TITLES = {
  cym_n_for_eng: 'Old Welsh',
  cym_nv2_for_eng: 'New Welsh',
  cym_s_for_eng: 'Old Welsh',
  cym_sv2_for_eng: 'New Welsh',
}

// Welsh North and South listening pods are 'Welsh Pod<n>' (Aran, 2026-10-13);
// every course's core pod is `pod-1`.
const WELSH_POD_COURSES = new Set(['cym_n_for_eng', 'cym_s_for_eng'])

export function boothCourseChip(courseCode, courseCount) {
  const named = BOOTH_COURSE_TITLES[courseCode]
  if (named) return named
  return courseCount === 1 ? 'Course' : `Course ${courseCode}`
}

export function boothPodChip({ courseCode, podSlug, podTitle } = {}) {
  const n = WELSH_POD_COURSES.has(courseCode) && /^pod-(\d+)$/.exec(podSlug || '')
  if (n) return `Welsh Pod${n[1]}`
  return podTitle || podSlug
}
