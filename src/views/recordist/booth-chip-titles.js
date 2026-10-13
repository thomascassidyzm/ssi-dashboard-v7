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
  cym_n_for_eng: 'Welsh North — current course (live)',
  cym_nv2_for_eng: 'Welsh North — new course',
  cym_s_for_eng: 'Welsh South — current course (live)',
  cym_sv2_for_eng: 'Welsh South — new course',
}

// Keyed `${courseCode}/${podSlug}`: every course's core pod is `pod-1`.
export const BOOTH_POD_TITLES = {
  'cym_n_for_eng/pod-1': 'Listening pods — North, pod 1',
  'cym_s_for_eng/pod-1': 'Listening pods — South, pod 1',
}

export function boothCourseChip(courseCode, courseCount) {
  const named = BOOTH_COURSE_TITLES[courseCode]
  if (named) return named
  return courseCount === 1 ? 'Course' : `Course ${courseCode}`
}

export function boothPodChip({ courseCode, podSlug, podTitle } = {}) {
  return BOOTH_POD_TITLES[`${courseCode}/${podSlug}`] || podTitle || podSlug
}
