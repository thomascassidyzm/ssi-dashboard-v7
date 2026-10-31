/**
 * EDIT-LOG ENTRIES FOR AUDIO WRITES (Tom, 2026-10-31; plan 692a71dd step 1).
 *
 * Before this, the render route (POST /api/audio/render → phase8 /render) and the bulk filler (phase8 /generate,
 * /generate-components) wrote course_audio rows and slot pointers and left NO content_edit_events row, so the nightly
 * provenance check could not tell a legitimate render from a back-door write. Both now record ONE event per request,
 * through the same recordContentEdit the edit-batch and link-clip routes use (row shape: surface, operation, scope, detail),
 * as a named service identity — never anonymous.
 *
 * A failed log write never undoes the audio write (the characters are spent, the object is in S3): it is logged loudly and
 * returned as editLogError on the response, so the gap is visible instead of silent.
 */
const { recordContentEdit } = require('./content-edit-log.cjs')
const { serviceIdentity } = require('./editor-identity.cjs')

const RENDER_SERVICE = 'render-route'
const FILL_SERVICE = 'phase8-fill'

async function record(supabase, { service, courseCode, surface, operation, scope, detail, recorder = recordContentEdit, logger = console }) {
  try {
    const eventId = await recorder(supabase, { identity: serviceIdentity(service), courseCode, surface, operation, scope, detail })
    return { eventId, editLogError: null }
  } catch (e) {
    logger.error(`[edit-log] ${service} could NOT record its write on ${courseCode}: ${e.message}`)
    return { eventId: null, editLogError: e.message }
  }
}

/** Does this render answer mean a course write happened? A dry run, a trial and a no-op write nothing. */
function renderWroteCourse(req, out) {
  if (!out || out.dryRun || req.dryRun || req.trial || !req.courseCode) return false
  return !!(out.audioId || out.spliced || out.legoLinked)
}

/**
 * Run the render and, when it wrote to a course, record the edit. `renderFn` is renderClip; injected so the wiring is testable.
 */
async function renderWithEditLog({ renderFn, input, deps, supabase, recorder, logger }) {
  const out = await renderFn(input, deps)
  const req = input || {}
  if (!renderWroteCourse(req, out)) return out
  const { eventId, editLogError } = await record(supabase, {
    service: RENDER_SERVICE, courseCode: req.courseCode, surface: 'phase8:POST /render', operation: 'insert',
    scope: { audio_ids: [out.audioId].filter(Boolean), lego_ids: req.legoId ? [req.legoId] : [], rows: 1 },
    detail: { role: req.role, source: out.source || null, voiceId: out.voiceId || null, charsSpent: out.charsSpent || 0, requestedBy: req.requestedBy || null, purpose: req.purpose || null, job: req.job || null },
    recorder, logger,
  })
  return { ...out, editEventId: eventId, ...(editLogError ? { editLogError } : {}) }
}

/** The bulk filler's pass: one event covering every slot it filled (reuse, render, closing linker). Nothing filled = nothing logged. */
async function recordFillPass({ supabase, courseCode, surface, results, linked = 0, recorder, logger }) {
  const filled = (results.attached || 0) + (linked || 0) + (results.success || 0)
  if (!filled) return { eventId: null, editLogError: null }
  return record(supabase, {
    service: FILL_SERVICE, courseCode, surface, operation: 'insert',
    scope: { rows: filled },
    detail: { attached: results.attached || 0, linked: linked || 0, rendered: results.success || 0, reused: (results.reuse && results.reuse.reused) || 0 },
    recorder, logger,
  })
}

module.exports = { renderWithEditLog, recordFillPass, renderWroteCourse, RENDER_SERVICE, FILL_SERVICE }
