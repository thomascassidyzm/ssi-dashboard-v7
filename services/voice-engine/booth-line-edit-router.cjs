/**
 * booth-line-edit-router.cjs — "Edit this line" in the booth, God admins only (Aran, 2026-10-15,
 * job #709). Mounted at /api/recording/admin/line-edit.
 *
 *   GET  /                      → 200 for a God admin (the booth's "may I show the button?"), else 401/403
 *   GET  /line/:lineId          → the row's words now, and whether this line can be edited here
 *   POST /line/:lineId/preview  → { targetText?, knownText? } — the door's DRY RUN, the tiling check,
 *                                 and what happens to every take of the line. Writes nothing.
 *   POST /line/:lineId/apply    → the same edit, applied, with the words read at preview time as
 *                                 the door's before-state assertion (drift aborts). Returns the undo.
 *   POST /undo                  → { courseCode, undoFile } — replays the door's own undo file.
 *
 * THE GATE is booth-artists-router's: an admin session (requireAdmin) AND the God-admin list
 * (booth-god-admins.cjs), on the server, before anything is read. A recordist, a private-link
 * visitor and an ordinary admin all get 401/403 and nothing else.
 *
 * NOTHING HERE WRITES COURSE CONTENT. Every write is a POST to Popty's course-edit door
 * (/api/production/:course/edit-batch, services/shared/course-edit-ops.cjs) carrying the CALLER'S
 * OWN admin session, so the door's editor-identity gate names Aran (or Tom, or Kai) on the edit,
 * and the door's transaction, triggers, undo file and content_version bump are the ones every
 * other course edit gets. The door lives on production Popty; COURSE_EDIT_DOOR_URL overrides where.
 *
 * The rules (which courses, which lines, the re-record rule) are in booth-line-edit.cjs.
 */

'use strict'

const express = require('express')
const { isGodAdmin } = require('./booth-god-admins.cjs')
const rules = require('./booth-line-edit.cjs')
const { checkTiling } = require('../course-builder/lib/validation.cjs')

const DEFAULT_DOOR = 'http://127.0.0.1:3470'
const PAGE = 1000

const ROW_COLUMNS = {
  course_seeds: 'id, course_code, seed_number, known_text, target_text, status, known_audio_id, target1_audio_id, target2_audio_id',
  course_legos: 'id, course_code, seed_number, lego_id, known_text, target_text, type, components, known_audio_id, target1_audio_id, target2_audio_id',
  course_practice_phrases: 'id, course_code, seed_number, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id',
}

module.exports = function createBoothLineEditRouter({
  getDb,
  requireAdmin,
  logger = console,
  doorUrl = process.env.COURSE_EDIT_DOOR_URL || DEFAULT_DOOR,
  doorFetch = (...a) => fetch(...a),
  onEdited = () => {},
} = {}) {
  if (typeof requireAdmin !== 'function') throw new Error('booth-line-edit-router needs requireAdmin')
  const router = express.Router()
  router.use(express.json({ limit: '64kb' }))
  const db = () => {
    const d = getDb()
    if (!d) { const e = new Error('Database not initialised'); e.status = 503; throw e }
    return d
  }

  // THE GATE, on every route, before anything is read.
  router.use(async (req, res, next) => {
    try {
      const user = await requireAdmin(req, res)
      if (!user) return
      if (!isGodAdmin(user)) {
        logger.warn(`[BoothLineEdit] refused ${user.email || 'unknown'} (admin, not a God admin)`)
        return res.status(403).json({ error: 'Only Tom, Aran and Kai can edit a line from the booth.' })
      }
      req.godAdmin = user
      next()
    } catch (err) {
      logger.error(`[BoothLineEdit] gate: ${err.message}`)
      res.status(500).json({ error: 'Access check failed' })
    }
  })

  router.get('/', (req, res) => res.json({ ok: true, email: req.godAdmin.email, courses: rules.LINE_EDIT_COURSES }))

  /** The line's row, its course read off the ROW (never off the client). Answers and returns null on refusal. */
  async function resolveLine(req, res) {
    const target = rules.lineTarget(req.params.lineId)
    if (!target) {
      res.status(422).json({ error: 'This line is not a sentence, LEGO or phrase of its own, so it cannot be edited here.', reason: 'not_a_row', editable: false })
      return null
    }
    const { data: row, error } = await db().from(target.table).select(ROW_COLUMNS[target.table]).eq('id', target.rowId).maybeSingle()
    if (error) throw new Error(`line lookup failed: ${error.message}`)
    if (!row) { res.status(404).json({ error: `No line ${req.params.lineId}` }); return null }
    return { target, row }
  }

  function describe(target, row) {
    const editable = rules.isEditableCourse(row.course_code)
    return {
      kind: target.kind,
      role: target.role,
      courseCode: row.course_code,
      seedNumber: row.seed_number ?? null,
      legoId: row.lego_id || null,
      targetText: row.target_text || '',
      knownText: row.known_text || '',
      editable,
      note: editable ? null : rules.LIVE_COURSE_NOTE,
    }
  }

  router.get('/line/:lineId', async (req, res) => {
    try {
      const got = await resolveLine(req, res)
      if (!got) return
      res.json({ ...describe(got.target, got.row), lineId: req.params.lineId })
    } catch (err) {
      logger.error(`[BoothLineEdit] read: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  async function legosUpTo(courseCode, seedNumber) {
    const out = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db().from('course_legos').select('id, seed_number, target_text, type, components')
        .eq('course_code', courseCode).lte('seed_number', seedNumber).order('seed_number').range(from, from + PAGE - 1)
      if (error) throw new Error(`LEGO read failed: ${error.message}`)
      out.push(...(data || []))
      if (!data || data.length < PAGE) return out
    }
  }

  /**
   * THE TILING CHECK, the course-builder's own (checkTiling): the sentence must be made of words
   * taught by LEGOs up to and including its seed. A seed or LEGO edit checks the SEED sentence; a
   * phrase edit checks the phrase. Only a target-side change is checked; the known side has its
   * own contract, which this editor does not run.
   */
  async function tilingFor(target, row, nextTarget) {
    if (nextTarget === null) return { checked: false, reason: 'Only the English side changes, so there is no Welsh tiling to check.' }
    const n = Number(row.seed_number)
    let legos = await legosUpTo(row.course_code, n)
    let sentence = nextTarget
    if (target.kind === 'lego') {
      legos = legos.map((l) => (l.id === row.id ? { ...l, target_text: nextTarget } : l))
      const { data: seed, error } = await db().from('course_seeds').select('target_text')
        .eq('course_code', row.course_code).eq('seed_number', n).maybeSingle()
      if (error) throw new Error(`seed read failed: ${error.message}`)
      if (!seed) return { checked: false, reason: `Seed ${n} was not found, so its tiling cannot be checked.` }
      sentence = seed.target_text
    }
    if (target.kind !== 'phrase' && !legos.some((l) => Number(l.seed_number) === n)) {
      return { checked: false, reason: `Seed ${n} has no LEGOs yet, so there is nothing to tile it from.` }
    }
    const shaped = legos.map((l) => ({
      target: l.target_text || '',
      type: l.type,
      components: Array.isArray(l.components) ? l.components.map((c) => ({ ...c, target: c.target || c.target_text || '' })) : l.components,
    }))
    const t = checkTiling(sentence, shaped, row.course_code, null, { seedNumber: n })
    return t.valid
      ? { checked: true, valid: true, sentence, message: `Seed ${n} still tiles: every word is taught by its LEGOs.` }
      : { checked: true, valid: false, sentence, untiled: t.untiled, message: `Seed ${n} would no longer tile — not taught by any LEGO up to here: ${t.untiled}` }
  }

  async function callDoor(req, courseCode, body) {
    const r = await doorFetch(`${doorUrl}/api/production/${encodeURIComponent(courseCode)}/edit-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // The CALLER'S OWN session: the door names the person who made the edit.
        Authorization: req.headers.authorization,
        'x-agent-id': 'booth-line-edit',
      },
      body: JSON.stringify(body),
    })
    let json = null
    try { json = await r.json() } catch { json = { error: `The edit door answered ${r.status} with no JSON.` } }
    return { status: r.status, ok: r.ok && json && json.ok !== false, json }
  }

  function readEdit(req) {
    const b = req.body || {}
    const pick = (v) => (typeof v === 'string' ? v : undefined)
    return { targetText: pick(b.targetText), knownText: pick(b.knownText) }
  }

  async function preparedEdit(req, res) {
    const got = await resolveLine(req, res)
    if (!got) return null
    const { target, row } = got
    if (!rules.isEditableCourse(row.course_code)) {
      res.status(403).json({ error: `${row.course_code} is a live course: ${rules.LIVE_COURSE_NOTE}.`, reason: 'live_course', editable: false })
      return null
    }
    const next = readEdit(req)
    if ((next.targetText !== undefined && !next.targetText.trim()) || (next.knownText !== undefined && !next.knownText.trim())) {
      res.status(400).json({ error: 'A line cannot be empty.', reason: 'empty' })
      return null
    }
    const { ops, changes } = rules.buildOps(target.kind, row, next)
    if (!ops.length) {
      res.status(400).json({ error: 'Nothing changed.', reason: 'no_change' })
      return null
    }
    return { target, row, ops, changes }
  }

  router.post('/line/:lineId/preview', async (req, res) => {
    try {
      const p = await preparedEdit(req, res)
      if (!p) return
      const targetChange = p.changes.find((c) => c.side === 'target')
      const [door, tiling] = await Promise.all([
        callDoor(req, p.row.course_code, { ops: p.ops }), // no "apply": the door's dry run
        tilingFor(p.target, p.row, targetChange ? targetChange.after : null),
      ])
      if (!door.ok) return res.status(door.status >= 400 ? door.status : 502).json({ error: door.json?.error || 'The edit door refused the preview.', code: door.json?.code, door: door.json })
      const recordings = rules.recordingFates(door.json.results).map((f) => ({ ...f, words: rules.fateWords(f) }))
      res.json({
        ok: true,
        dryRun: true,
        courseCode: p.row.course_code,
        kind: p.target.kind,
        changes: p.changes,
        tiling,
        recordings,
        doorNote: door.json.note || null,
      })
    } catch (err) {
      logger.error(`[BoothLineEdit] preview: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  router.post('/line/:lineId/apply', async (req, res) => {
    try {
      const p = await preparedEdit(req, res)
      if (!p) return
      const door = await callDoor(req, p.row.course_code, { ops: p.ops, apply: true })
      if (!door.ok) return res.status(door.status >= 400 ? door.status : 502).json({ error: door.json?.error || 'The edit door refused the edit.', code: door.json?.code, door: door.json })
      logger.info(`[BoothLineEdit] ${req.godAdmin.email} edited ${req.params.lineId} (${p.row.course_code}) — event ${door.json.event_id}, undo ${door.json.undo_file}`)
      try { onEdited({ courseCode: p.row.course_code }) } catch { /* a cache refresh never fails an edit */ }
      res.json({
        ok: true,
        applied: true,
        courseCode: p.row.course_code,
        changes: p.changes,
        recordings: rules.recordingFates(door.json.results).map((f) => ({ ...f, words: rules.fateWords(f) })),
        eventId: door.json.event_id || null,
        undoFile: door.json.undo_file || null,
        undoFileError: door.json.undo_file_error || null,
      })
    } catch (err) {
      logger.error(`[BoothLineEdit] apply: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  router.post('/undo', async (req, res) => {
    try {
      const { courseCode, undoFile } = req.body || {}
      if (!rules.isEditableCourse(courseCode)) return res.status(403).json({ error: `${courseCode} is not a course this editor writes to.`, reason: 'live_course' })
      if (typeof undoFile !== 'string' || !/^[\w.-]+\.json$/.test(undoFile)) return res.status(400).json({ error: 'No undo to replay.' })
      const door = await callDoor(req, courseCode, { undo_file: undoFile, apply: true })
      if (!door.ok) return res.status(door.status >= 400 ? door.status : 502).json({ error: door.json?.error || 'The edit door refused the undo.', code: door.json?.code })
      logger.info(`[BoothLineEdit] ${req.godAdmin.email} undid ${undoFile} (${courseCode}) — event ${door.json.event_id}`)
      try { onEdited({ courseCode }) } catch { /* as above */ }
      res.json({ ok: true, undone: true, eventId: door.json.event_id || null })
    } catch (err) {
      logger.error(`[BoothLineEdit] undo: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  return router
}
