/**
 * Production wiring for the Edit Guardian.
 *
 * Kept OUT of guardian-worker.cjs (which stays pure/testable). This module binds
 * the worker to the real Supabase client, the `claude --print` judge, the courses
 * list, the course_edit_reviews table, and a WebSocket emitter for inline status.
 *
 * GATED by EDIT_GUARDIAN_ENABLED — until that env var is 'true' (and Tom has run
 * database/migrations/20260617_edit_guardian.sql), enqueueEditReview() is an inert
 * no-op, so wiring the hook into edit endpoints changes nothing in production.
 *
 * Surfacing model (per Kai): NO browsable feed. Results stream inline to the
 * editor over the existing production-api WebSocket:
 *   guardian:progress  { courseCode, table, pk, stage }   // "checking-side-effects" …
 *   guardian:outcome   { …, outcome:'accepted'|'flagged', urgent, autoFixed, flags }
 * course_edit_reviews remains as the lightweight record + undo handle (batchId).
 */

const { createEditor } = require('./editor.cjs')
const { createOperations } = require('./operations.cjs')
const { createGuardianWorker } = require('./guardian-worker.cjs')

const ENABLED = () => process.env.EDIT_GUARDIAN_ENABLED === 'true'

let worker = null
let emitFn = null
let courseCache = { codes: [], at: 0 }

function isEnabled() { return ENABLED() }

/**
 * Initialise the guardian once, from production-api startup.
 * @param {object} deps
 * @param {object} deps.supabase - service-role Supabase client
 * @param {function} deps.emit   - (event, payload) => void  (e.g. io.emit)
 * @param {object} [deps.logger]
 */
function initGuardian({ supabase, emit, logger = console }) {
  if (!ENABLED()) { logger.info?.('[guardian] disabled (EDIT_GUARDIAN_ENABLED!=true)'); return null }
  if (worker) return worker
  emitFn = emit

  async function loadCourseCodes() {
    // cache for 5 minutes
    if (courseCache.codes.length && Date.now() - courseCache.at < 5 * 60_000) return courseCache.codes
    try {
      const { data } = await supabase.from('courses').select('course_code')
      courseCache = { codes: (data || []).map((r) => r.course_code), at: Date.now() }
    } catch (e) { logger.warn?.('[guardian] course list load failed:', e.message) }
    return courseCache.codes
  }

  worker = createGuardianWorker({
    makeEditor: () => createEditor({ client: supabase }),
    makeOps: (editor) => createOperations(editor),
    // llm defaults to claude --print inside the guardian
    get allCourseCodes() { return courseCache.codes }, // populated below per-job
    persistReview: async (record) => {
      try { await supabase.from('course_edit_reviews').insert(record) }
      catch (e) { logger.error?.('[guardian] persistReview failed:', e.message) }
    },
    notify: async (record) => {
      // "straight to me": emit an urgent event; the dashboard shows it inline.
      try { emitFn && emitFn('guardian:urgent', { courseCode: record.course_code, table: record.table_name, pk: record.primary_key, flags: record.flags }) }
      catch { /* best-effort */ }
    },
    onProgress: (job, stage, extra) => {
      const isOutcome = stage === 'accepted' || stage === 'flagged'
      try {
        emitFn && emitFn(isOutcome ? 'guardian:outcome' : 'guardian:progress', {
          courseCode: job.courseCode, table: job.table, pk: job.pk,
          ...(isOutcome ? { outcome: stage, ...extra } : { stage }),
        })
      } catch { /* best-effort */ }
    },
    onError: (err, job) => logger.error?.('[guardian] review failed for', job?.pk, err?.message),
    debounceMs: Number(process.env.EDIT_GUARDIAN_DEBOUNCE_MS || 4000),
    concurrency: Number(process.env.EDIT_GUARDIAN_CONCURRENCY || 2),
  })

  // keep the course list warm
  loadCourseCodes()
  worker._loadCourseCodes = loadCourseCodes
  logger.info?.('[guardian] enabled')
  return worker
}

/**
 * Enqueue a completed edit for background review. Call AFTER a successful write.
 * No-op unless the guardian is enabled + initialised. Never throws into the
 * caller's edit response.
 */
function enqueueEditReview(edit) {
  try {
    if (!ENABLED() || !worker) return false
    // refresh course codes opportunistically (async, non-blocking)
    if (worker._loadCourseCodes) worker._loadCourseCodes()
    worker.enqueue(edit)
    // immediate "saved, reviewing…" ping so the editor sees instant feedback
    if (emitFn) emitFn('guardian:progress', { courseCode: edit.courseCode, table: edit.table, pk: edit.pk, stage: 'queued' })
    return true
  } catch { return false }
}

module.exports = { initGuardian, enqueueEditReview, isEnabled }
