/**
 * LEGO proof page — HTTP side (job #496, Aran 2026-10-13: "a list showing ONLY the Welsh LEGO text, with the LEGO's
 * number on the left and a flag on the right he can tick to say there is an issue; tapping the Welsh reveals the English").
 *
 *   GET /           the WHOLE course's LEGOs in RUNNING ORDER (old seeds 1..insert_after, the Hadau Creiddiol block, then
 *                   the remaining old seeds; dropped seeds excluded), each with its proof flag (if any) and an `hc` mark.
 *                   Job #522, Aran 2026-10-13: the first row must be the first thing the course teaches, not "mor aml â phosib".
 *   PUT /flag       { legoId, flagged, note } — upsert one flag. Saved the moment it is ticked; there is no Submit.
 *
 * READ-ONLY on course content: course_legos / course_running_order / course_seed_weave are only SELECTed. The one write
 * is to lego_proof_flags (database/changes/20261013_lego_proof_flags.sql), a note ABOUT a LEGO — not course content, so
 * it is not an editor-identity content-write surface; it still records who ticked it (flagged_by).
 *
 * Scope is the two Welsh relaunch sandboxes only. Never the live cym_n / cym_s courses.
 * Mounted under /api/production/:courseCode/lego-proof so the app.param course-scope gate fires (mergeParams; the router
 * must not declare :courseCode itself).
 */
'use strict'

const express = require('express')

// The courses this page proofs. Anything else is refused, so it can never be pointed at a live course.
const PROOF_COURSES = ['cym_nv2_for_eng', 'cym_sv2_for_eng']
const LEGO_ID = /^S\d{4,}L\d{2}$/
const NOTE_MAX = 1000

/** Every row of a query, past supabase's 1000-row page. */
async function allRows(build) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data || []))
    if (!data || data.length < 1000) return out
  }
}

/**
 * The proof list, pure. `order` is course_running_order rows ({seed_number, position, in_block}); a LEGO whose seed is
 * absent from the running order (a dropped seed) is not listed — the course does not play it, so there is nothing to
 * proof. Sorted by the seed's running position, then lego_index.
 * `n` is the LEGO's place among the WHOLE course's NEW LEGOs (1..N) in running order — the number Aran reads, so #1 is
 * the first LEGO a learner meets; taught (is_new=false) LEGOs get n = null, so "show taught" and the HC / Old filter
 * never renumber anything. `hc` is true for a LEGO in the Hadau Creiddiol block (in_block).
 */
function buildProofList(legos, order, flags) {
  const posOf = new Map(order.map((o) => [o.seed_number, o.position]))
  const hcSeeds = new Set(order.filter((o) => o.in_block).map((o) => o.seed_number))
  const flagOf = new Map((flags || []).map((f) => [f.lego_id, f]))
  const rows = legos
    .filter((l) => posOf.has(l.seed_number))
    .sort((a, b) => posOf.get(a.seed_number) - posOf.get(b.seed_number) || a.lego_index - b.lego_index)
  let n = 0
  return rows.map((l) => {
    const f = flagOf.get(l.lego_id)
    return {
      id: l.lego_id,
      n: l.is_new ? ++n : null,
      isNew: !!l.is_new,
      hc: hcSeeds.has(l.seed_number),
      cy: l.target_text,
      en: l.known_text,
      flagged: !!(f && f.flagged),
      note: (f && f.note) || '',
      by: (f && f.flagged_by) || null,
      at: (f && f.updated_at) || null,
    }
  })
}

/** The flag write, validated. Returns { row } or { error, status? }. */
function flagRow(courseCode, body, who) {
  const legoId = String((body && body.legoId) || '')
  if (!LEGO_ID.test(legoId)) return { error: 'legoId must look like S1087L02' }
  if (typeof body.flagged !== 'boolean') return { error: 'flagged must be true or false' }
  const note = body.note == null ? '' : String(body.note).trim()
  if (note.length > NOTE_MAX) return { error: `note is over ${NOTE_MAX} characters` }
  if (!who) return { error: 'who is flagging? (no signed-in user and no x-agent-id)', status: 401 }
  return { row: { course_code: courseCode, lego_id: legoId, flagged: body.flagged, note: note || null, flagged_by: who, updated_at: new Date().toISOString() } }
}

function createLegoProofRouter({ getDb, logger }) {
  const router = express.Router({ mergeParams: true })
  const log = logger || console

  router.use((req, res, next) => {
    if (!PROOF_COURSES.includes(req.params.courseCode)) {
      return res.status(404).json({ error: `LEGO proof is for ${PROOF_COURSES.join(' / ')} only` })
    }
    next()
  })

  router.get('/', async (req, res) => {
    try {
      const db = getDb()
      const { courseCode } = req.params
      const { data: weave, error: we } = await db.from('course_seed_weave').select('block_start').eq('course_code', courseCode).maybeSingle()
      if (we) throw new Error(we.message)
      if (!weave) return res.status(409).json({ error: `${courseCode} has no Hadau Creiddiol weave row` })
      const [order, legos, flags] = await Promise.all([
        allRows((a, b) => db.from('course_running_order').select('seed_number,position,in_block')
          .eq('course_code', courseCode).order('seed_number').range(a, b)),
        allRows((a, b) => db.from('course_legos').select('lego_id,seed_number,lego_index,is_new,target_text,known_text')
          .eq('course_code', courseCode).order('seed_number').order('lego_index').range(a, b)),
        allRows((a, b) => db.from('lego_proof_flags').select('lego_id,flagged,note,flagged_by,updated_at')
          .eq('course_code', courseCode).order('lego_id').range(a, b)),
      ])
      res.set('Cache-Control', 'no-store')
      res.json({ courseCode, legos: buildProofList(legos, order, flags) })
    } catch (e) {
      log.error(`[lego-proof] GET ${req.params.courseCode}: ${e.message}`)
      res.status(500).json({ error: e.message })
    }
  })

  router.put('/flag', express.json({ limit: '8kb' }), async (req, res) => {
    try {
      const db = getDb()
      const { courseCode } = req.params
      const who = (req.dashboardUser && req.dashboardUser.email) || req.get('x-agent-id') || null
      const { row, error, status } = flagRow(courseCode, req.body || {}, who)
      if (error) return res.status(status || 400).json({ error })
      const { data: lego, error: le } = await db.from('course_legos').select('lego_id')
        .eq('course_code', courseCode).eq('lego_id', row.lego_id).maybeSingle()
      if (le) throw new Error(le.message)
      if (!lego) return res.status(404).json({ error: `${row.lego_id} is not a LEGO of ${courseCode}` })
      const { data, error: ue } = await db.from('lego_proof_flags').upsert(row, { onConflict: 'course_code,lego_id' })
        .select('lego_id,flagged,note,flagged_by,updated_at').single()
      if (ue) throw new Error(ue.message)
      res.json({ ok: true, flag: data })
    } catch (e) {
      log.error(`[lego-proof] PUT ${req.params.courseCode}: ${e.message}`)
      res.status(500).json({ error: e.message })
    }
  })

  return router
}

module.exports = { createLegoProofRouter, buildProofList, flagRow, PROOF_COURSES }
