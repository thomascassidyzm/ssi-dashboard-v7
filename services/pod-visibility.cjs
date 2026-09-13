// services/pod-visibility.cjs
//
// The hold/release gate on a listening pod, as pure decision logic.
//
// TOM'S RULING (2026-08-23): "Can we not make PODS live in certain courses? It
// would be good to be able to keep them back in a human course until … after
// all until they exist!!!" A pod that a human is still recording must be
// unreachable by learners until it is finished AND a human has decided to
// release it. GOING LIVE IS A HUMAN ACT. Completeness is a precondition for
// release, never a trigger for it — so nothing in this module, and nothing
// that calls it, may infer 'live' from a sentence count, an audio coverage
// figure, a sync, a render or a recording upload.
//
// The column and its RLS policies are database/changes/20260823_listening_pod_visibility.sql.
// The ONE write path to `listening_pods.visibility` in this codebase is
// POST /api/admin/pods/:courseCode/:slug/visibility in production-api.cjs,
// which is this module plus an admin gate. Keep it that way: a second writer
// is how "it went live on its own" happens.
//
// Why the confirm token. A hold is cheap to undo; a RELEASE puts content in
// front of learners and cannot be un-seen. So release refuses a bare
// `{visibility:'live'}` — the caller must name the pod it means in `confirm`.
// A stray script, a re-fired request or a fat-fingered curl cannot release a
// pod it did not deliberately name. Holding needs no token: erring towards
// invisible is the safe direction.
//
// TOM'S RULING (2026-09-13), which closes the other direction for good: "it
// shouldn't be there any more should it? you can't unpublished a course, once
// it's gone live it can only ever be fixed line by line". A LIVE pod is never
// pulled back from learners — not by this route, not by anything. Hold/release
// stays exactly as it is for a pod that is still 'held' (going live remains a
// human act); the only change is that live → held is refused. See
// checkVisibilityTransition.
//
// Pure. No DB, no clock, no identity lookup — the caller passes those in, which
// is what makes all three decisions unit-testable.

const VISIBILITIES = ['live', 'held']

/**
 * Validate a hold/release request body against the pod it claims to be for.
 *
 * @param {{visibility?:string, confirm?:string}} body
 * @param {string} podId `<course_code>:<slug>`
 * @returns {{ok:true, visibility:string} | {ok:false, status:number, error:string}}
 */
function parseVisibilityRequest(body, podId) {
  const visibility = String((body && body.visibility) || '').trim()
  if (!VISIBILITIES.includes(visibility)) {
    return { ok: false, status: 400, error: `visibility must be one of: ${VISIBILITIES.join(', ')}` }
  }
  if (visibility === 'live') {
    const confirm = String((body && body.confirm) || '').trim()
    if (confirm !== podId) {
      return {
        ok: false,
        status: 400,
        error: `Releasing a pod to learners is a deliberate act: send {"confirm": "${podId}"} `
          + 'alongside {"visibility": "live"} to release it. Holding needs no confirmation.',
      }
    }
  }
  return { ok: true, visibility }
}

/**
 * The second gate, run AFTER the route has read the pod's current visibility.
 *
 * live → held is refused with 409. Tom, 2026-09-13, verbatim: "it shouldn't be
 * there any more should it? you can't unpublished a course, once it's gone live
 * it can only ever be fixed line by line". Once learners can reach a pod, the
 * only fix is a line-by-line one; taking the pod away from them is not a fix
 * this system offers.
 *
 * held → live (already confirmed by parseVisibilityRequest) proceeds. A no-op
 * (held → held, live → live) proceeds and the route writes the same value —
 * harmless, and it keeps a re-fired request from turning into an error.
 *
 * @param {string|null|undefined} currentVisibility what listening_pods.visibility says now
 * @param {string} requested the already-validated visibility from parseVisibilityRequest
 * @returns {{ok:true} | {ok:false, status:number, error:string}}
 */
function checkVisibilityTransition(currentVisibility, requested) {
  if (currentVisibility === 'live' && requested === 'held') {
    return {
      ok: false,
      status: 409,
      error: 'This pod is live. A live pod is never pulled back from learners; '
        + 'it is fixed line by line (Tom, 2026-09-13).',
    }
  }
  return { ok: true }
}

/**
 * The metadata jsonb to write — the WHOLE object, with every existing key
 * carried through. Read-modify-write, never a bare `{held_at: …}` patch:
 * `metadata` holds scene_hashes (the pod-sync diff baseline), sections, the
 * consistency ledger and the name map, and clobbering any of those to record a
 * hold would be a far worse bug than the one the hold prevents.
 *
 * BOTH timestamps are kept, always. A pod that was held on Tuesday and released
 * on Thursday should read as exactly that; clearing `held_at` on release would
 * erase the only record that the hold happened.
 *
 * @param {object|null} existing current listening_pods.metadata
 * @param {{visibility:string, actor:{name?:string,email?:string}|null, nowIso:string}} args
 */
function nextVisibilityMetadata(existing, { visibility, actor, nowIso }) {
  const meta = (existing && typeof existing === 'object' && !Array.isArray(existing)) ? { ...existing } : {}
  const by = describeActor(actor)
  if (visibility === 'held') {
    meta.held_at = nowIso
    meta.held_by = by
  } else {
    meta.released_at = nowIso
    meta.released_by = by
  }
  return meta
}

/**
 * Who did it, as one readable string. Email is the stable identity (the
 * dashboard_users / learners authority order resolves a display name that may
 * change), so it is always present when we have one; the name is for a human
 * reading the trail on a phone.
 */
function describeActor(actor) {
  if (!actor) return 'unknown'
  const name = (actor.name || '').trim()
  const email = (actor.email || '').trim()
  if (name && email && name !== email) return `${name} <${email}>`
  return email || name || 'unknown'
}

module.exports = {
  VISIBILITIES, parseVisibilityRequest, checkVisibilityTransition, nextVisibilityMetadata, describeActor,
}
