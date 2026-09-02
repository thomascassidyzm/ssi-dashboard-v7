/**
 * The gate on POD GENERATION — the HTTP route and the generator underneath it.
 *
 * WHY. `POST /api/admin/pods/generate` is a button in the Popty pods page. Its slug
 * parameter read `String(req.body?.slug || 'pod-0').trim()`: it DEFAULTED to a slug the
 * player serves for ~68 courses, while the same body may carry `force: true` and
 * `mode: 'full'` — the wipe-and-re-flex path that calls `deleteAllSentences()` first.
 * That made it the shortest route in the estate from a human hand to an emptied live
 * pod, and the pods behind it are the ones ~32,000 former Welsh learners are waiting on.
 *
 * The generator (`pod-dialogue-generator.cjs`) is the same door with a command line
 * instead of a button, so both call `generationRefusal()` and there is ONE rule, held
 * in tools/pods/serving-slug.cjs, which clone-pod.cjs also uses. Not a second copy.
 *
 * WHAT THIS IS NOT. It is not a wall in front of legitimate pod work. It refuses an
 * UNDELIBERATE write onto a serving slug; `serveNow: true` (the body's mirror of
 * clone-pod's `--serve-now`) says the operator means it, and it goes through. The route
 * is already behind requireAdmin, so this flag is about deliberateness, not authentication.
 *
 * Pure and separately required so it is TESTABLE: the route logic lived inside a 4,600-line
 * Express file, which is exactly why nothing tested it.
 */
const { servingRefusal } = require('../tools/pods/serving-slug.cjs')

/**
 * PURE. Parse and validate the request body of POST /api/admin/pods/generate.
 * Returns `{ error }` for a 400, otherwise the generation parameters.
 *
 * THE SLUG HAS NO DEFAULT, deliberately. An absent or blank slug is a 400 exactly as an
 * absent courseCode already is. A destructive write must name its own destination; a
 * default meant the caller could omit the single most dangerous parameter and still hit
 * a live pod.
 */
function parsePodGenerateRequest (body) {
  const courseCode = String(body?.courseCode || '').trim()
  const slug = String(body?.slug || '').trim()
  const canonicalSlug = body?.canonicalSlug ? String(body.canonicalSlug).trim() : undefined
  const force = body?.force === true
  // mode: 'full' | 'sync' | 'resume'. 'sync' propagates a canonical edit surgically.
  const mode = ['full', 'sync', 'resume'].includes(body?.mode) ? body.mode : undefined
  const serveNow = body?.serveNow === true
  if (!courseCode) return { error: 'courseCode required' }
  if (!slug) return { error: 'slug required — it has no default, because the default was pod-0, which the player serves' }
  return { courseCode, slug, canonicalSlug, force, mode, serveNow }
}

/**
 * PURE. The refusal text for generating onto a slug the player serves, or null.
 * `podType` is 'core' because that is what `upsertPodRow()` writes, unconditionally.
 */
function generationRefusal ({
  podId, slug, podExists, podVisibility, rows = 0,
  learnersOnCourse, learnersOnPod, serveNow = false, podType = 'core',
}) {
  return servingRefusal({
    podId, slug, podType, podExists, podVisibility, rows,
    learnersOnCourse, learnersOnPod, serveNow,
    action: 'Generating here rewrites the pod these learners are being served,',
    harm: 'and a full/force generation deletes every sentence row first, so their progress rows point at sentences that no longer exist and the pod plays silent until Phase 8 re-records it.',
    escape: 'serveNow:true (--serve-now on the CLI)',
    remedy: 'Generate to a parked slug and switch over with tools/pods/pod-switchover.cjs, which carries learner progress across',
  })
}

module.exports = { parsePodGenerateRequest, generationRefusal }
