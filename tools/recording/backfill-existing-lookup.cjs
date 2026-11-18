// The "is this take already filed?" lookup of backfill-orphan-takes.cjs, as a
// pure query shape so a test can hold it without running that script (it runs
// on require).
//
// course_audio.s3_key has no index, so the bare lookup seq-scans and dies at the
// agent login's 5 s statement cap (fry_for_eng, job #52). With --course it adds
// course_code, which gives the planner idx_course_audio_course. The cap stays.
//
// What scoping gives up: a take whose s3_key is already filed under a DIFFERENT
// course is no longer seen as filed here. S3 keys are per take (mastered/{UUID}),
// so that should not occur, and the caller's uuid check and the before-state
// check on the 5-column conflict key still stand behind this. With no --course
// the query is what it always was.
function existingByS3KeyQuery(keys, courseFilter = null) {
  const select = `select id, s3_key, course_code, text, language, role, voice_id, origin
                  from course_audio where s3_key = any($1)`
  if (!courseFilter) return { text: select, values: [keys] }
  return { text: `${select}\n                   and course_code = $2`, values: [keys, courseFilter] }
}

module.exports = { existingByS3KeyQuery }
