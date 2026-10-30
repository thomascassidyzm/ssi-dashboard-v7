/**
 * Re-sync lego_introductions.presentation_audio_id from course_legos.presentation_audio_id (job #143).
 * The LEGO's own link is the truth about WHICH intro clip belongs to a LEGO (the player prefers it); the
 * legacy lego_introductions row is a 2025 import that nothing keeps honest, and no other Popty door edits it.
 * Route: POST /api/production/:courseCode/sync-intro-links  (production-api). courseCode 'all' is dry-run only.
 *
 * Rules, each one a refusal rather than a warning:
 *   - DRY RUN unless apply === true.
 *   - Only rows whose presentation_audio_id is set AND differs from the LEGO's link are touched.
 *   - Only LEGOs that HAVE a link: a LEGO with no link never changes its row. A row is never nulled, never created.
 *   - Rows with a null presentation_audio_id (legacy audio_uuid rows) are reported as `skippedNullRows`, never written.
 *   - The write is conditional on the row still holding what was read (RACE otherwise); no clip is deleted.
 *   - One courses.content_version patch bump per apply that moved a row.
 */
const { bumpCourseVersion } = require('./course-version.cjs')

const PAGE = 1000

async function pageAll(build) {
  const out = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    out.push(...(data || []))
    if (!data || data.length < PAGE) break
  }
  return out
}

async function findDrift(db, courseCode) {
  const intros = await pageAll(() => {
    let q = db.from('lego_introductions').select('id, course_code, lego_id, presentation_audio_id').order('id')
    if (courseCode !== 'all') q = q.eq('course_code', courseCode)
    return q
  })
  const courses = [...new Set(intros.map((r) => r.course_code))]
  const link = new Map() // `${course}|${lego}` -> presentation_audio_id
  for (const c of courses) {
    const legos = await pageAll(() => db.from('course_legos').select('id, lego_id, presentation_audio_id').eq('course_code', c).not('presentation_audio_id', 'is', null).order('id'))
    for (const l of legos) link.set(`${c}|${l.lego_id}`, l.presentation_audio_id)
  }
  const drift = []
  let skippedNullRows = 0
  for (const r of intros) {
    const want = link.get(`${r.course_code}|${r.lego_id}`)
    if (!want) continue
    if (!r.presentation_audio_id) { skippedNullRows++; continue }
    if (String(r.presentation_audio_id) !== String(want)) drift.push({ courseCode: r.course_code, legoId: r.lego_id, rowId: r.id, oldClipId: r.presentation_audio_id, newClipId: want })
  }
  drift.sort((a, b) => a.courseCode.localeCompare(b.courseCode) || a.legoId.localeCompare(b.legoId))
  return { drift, skippedNullRows }
}

async function syncIntroLinks({ db, courseCode, apply = false, recordEdit = null, bump = bumpCourseVersion }) {
  if (!courseCode) return { ok: false, code: 'NO_COURSE', error: 'courseCode required' }
  if (apply && courseCode === 'all') return { ok: false, code: 'ALL_IS_DRY_RUN_ONLY', error: "apply needs a single course; 'all' is dry-run only" }
  const { drift, skippedNullRows } = await findDrift(db, courseCode)
  const rows = drift.map(({ rowId, ...d }) => d)
  const perCourse = {}
  for (const d of drift) perCourse[d.courseCode] = (perCourse[d.courseCode] || 0) + 1
  if (!apply) return { ok: true, dryRun: true, count: drift.length, perCourse, skippedNullRows, rows }

  let eventId = null
  if (drift.length && recordEdit) {
    eventId = await recordEdit({
      scope: { lego_ids: drift.map((d) => d.legoId), rows: drift.length },
      detail: { syncIntroLinks: rows },
    })
  }
  let synced = 0
  const failed = []
  for (const d of drift) {
    const { data, error } = await db.from('lego_introductions')
      .update({ presentation_audio_id: d.newClipId })
      .eq('id', d.rowId).eq('presentation_audio_id', d.oldClipId).select('id')
    if (error) failed.push({ legoId: d.legoId, code: 'WRITE_FAILED', error: error.message })
    else if (!data || !data.length) failed.push({ legoId: d.legoId, code: 'RACE', error: 'row changed between read and write; nothing written' })
    else synced++
  }
  const contentVersion = synced ? await bump(db, courseCode, 'patch') : null
  return { ok: failed.length === 0, dryRun: false, eventId, contentVersion, synced, failed, rows }
}

module.exports = { syncIntroLinks, findDrift }
