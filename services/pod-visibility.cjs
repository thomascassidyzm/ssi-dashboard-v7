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
// The ONE write path to `listening_pods.visibility` (and, since job #605,
// `required_role`) in this codebase is
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
// REQUIRED_ROLE RIDES THE SAME ROUTE (job #605, 2026-09-13). The Senedd/S4C pod
// was addressed to one person through `listening_pods.required_role`
// (database/changes/20260903_restricted_content_by_role.sql), and opening it
// to every learner (Tom, 2026-09-13 20:31Z) had to be a hand UPDATE because
// this lever never touched that column. It does now, under the same rules:
// CLEARING the role puts content in front of everyone, so it needs the same
// named-pod `confirm` as a release; a LIVE pod is never narrowed (setting or
// changing a role on it would pull it back from learners — the 2026-09-13
// ruling again), so a role is set while the pod is held; and the write is a
// compare-and-swap on the role that was read. See parseRequiredRoleRequest,
// checkRequiredRoleTransition.
//
// ONE WRITE FOR BOTH (job #611, 2026-09-13, after GPT-6 Astra #608): the two
// levers used to be two UPDATEs, each guarding only its own column, so a
// narrow could land on a pod that went live between read and write, and a
// combined body could half-succeed. applyPodAccessChange is now the only
// write: one read, one judgement, one UPDATE whose WHERE asserts both columns.
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
 * (held → held, live → live) proceeds but WRITES NOTHING — see
 * applyVisibilityChange; a re-fired request must neither error nor re-stamp
 * held_at/released_at.
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


const LIVE_POD_NEVER_HELD = checkVisibilityTransition('live', 'held').error

/**
 * THE ONE WRITE: visibility and/or required_role, as a SINGLE atomic transition.
 *
 * WHY THIS IS NOT JUST "check, then update". The check reads the pod's
 * visibility and the update used to be unconditional, so a hold that raced a
 * release could read 'held', pass checkVisibilityTransition, and then stamp
 * 'held' over a pod that had gone live in between (GPT-6 Astra cold-check
 * #582, 2026-09-13, reproduced against the real handler). Job #605 then gave
 * the role its own compare-and-swap — on the ROLE only — and Astra #608 showed
 * the gap: a narrow that read 'held', lost the CPU to a release, and then
 * matched WHERE required_role IS NULL landed a role on a LIVE pod with a 200.
 * And a body carrying both fields ran as two writes, so the role could clear
 * and the hold then fail with 409 — a partial success.
 *
 * So (job #611): ONE read, ONE judgement over both fields, ONE UPDATE whose
 * WHERE asserts BOTH the visibility AND the role that were read —
 * `updateWhereState(podId, {visibility, required_role}, patch)` touches the
 * row only if both still match and reports a miss as null. A miss is re-read
 * and re-judged on what the row is NOW: a refused transition gets the same 409
 * rule text as the up-front check; a row that already carries every requested
 * value is a 200 no-op; anything else is a 409 "changed under you". There is
 * no partial write because there is only one write.
 *
 * NO-OPS WRITE NOTHING. held → held on cym_s_for_eng:pod-1 re-stamped held_at
 * at 2026-09-13T20:07:45Z (content_audit_log). A request that changes nothing
 * returns 200 with the row as it is and leaves the trail alone.
 *
 * @param {object} args
 * @param {string} args.podId
 * @param {string} [args.visibility] validated by parseVisibilityRequest; undefined = leave alone
 * @param {string|null} [args.requiredRole] validated by parseRequiredRoleRequest; undefined = leave alone
 * @param {{name?:string,email?:string}|null} args.actor
 * @param {string} args.nowIso
 * @param {{
 *   readPod: (podId:string) => Promise<{id:string, visibility:string|null, required_role?:string|null, metadata:object|null}|null>,
 *   updateWhereState: (podId:string, expected:{visibility:string|null, required_role:string|null}, patch:object) => Promise<object|null>,
 * }} args.store
 * @returns {Promise<{status:number, body:object}>}
 */
async function applyPodAccessChange({ podId, visibility, requiredRole, actor, nowIso, store }) {
  const wantsVisibility = visibility !== undefined
  const wantsRole = requiredRole !== undefined
  if (!wantsVisibility && !wantsRole) return { status: 400, body: { error: 'nothing requested' } }

  const judge = (pod) => {
    // Judge the ROLE against the visibility the row will have after this
    // request, not only the one it has now: a held pod released and narrowed
    // in one body would be a live pod with a role, which is a narrowing.
    if (wantsVisibility) {
      const t = checkVisibilityTransition(pod.visibility, visibility)
      if (!t.ok) return t
    }
    if (wantsRole) {
      const after = wantsVisibility ? visibility : pod.visibility
      const t = checkRequiredRoleTransition({ visibility: after, required_role: pod.required_role }, requiredRole)
      if (!t.ok) return t
    }
    return { ok: true }
  }
  const isNoop = (pod) =>
    (!wantsVisibility || pod.visibility === visibility)
    && (!wantsRole || (pod.required_role ?? null) === requiredRole)
  const summary = (pod, updated, noop) => {
    const body = { ok: true, pod: updated || pod, was: pod.visibility, wasRole: pod.required_role ?? null }
    if (noop) body.noop = true
    if (wantsRole) body.roleNoop = (pod.required_role ?? null) === requiredRole
    return body
  }

  const pod = await store.readPod(podId)
  if (!pod) return { status: 404, body: { error: `Pod not found: ${podId}` } }
  const first = judge(pod)
  if (!first.ok) return { status: first.status, body: { error: first.error } }
  if (isNoop(pod)) return { status: 200, body: summary(pod, null, true) }

  let metadata = pod.metadata
  const patch = {}
  if (wantsRole && (pod.required_role ?? null) !== requiredRole) {
    metadata = nextRequiredRoleMetadata(metadata, { requiredRole, was: pod.required_role ?? null, actor, nowIso })
    patch.required_role = requiredRole
  }
  if (wantsVisibility && pod.visibility !== visibility) {
    metadata = nextVisibilityMetadata(metadata, { visibility, actor, nowIso })
    patch.visibility = visibility
  }
  patch.metadata = metadata
  const expected = { visibility: pod.visibility ?? null, required_role: pod.required_role ?? null }
  const updated = await store.updateWhereState(podId, expected, patch)
  if (updated) return { status: 200, body: summary(pod, updated, false) }

  // Zero rows: the pod moved between our read and our write. Judge it again
  // on what it is NOW, never on what we read. Nothing has been written.
  const now = await store.readPod(podId)
  if (!now) return { status: 404, body: { error: `Pod not found: ${podId}` } }
  const again = judge(now)
  if (!again.ok) return { status: again.status, body: { error: again.error } }
  if (isNoop(now)) return { status: 200, body: summary(now, null, true) }
  const roleNow = now.required_role === null || now.required_role === undefined ? 'NULL' : `'${now.required_role}'`
  return {
    status: 409,
    body: { error: `This pod changed while the request was in flight (now '${now.visibility}', required_role ${roleNow}); nothing was written. Re-read it and try again.` },
  }
}

/** Visibility only — a thin name over applyPodAccessChange, kept for callers and tests. */
async function applyVisibilityChange({ podId, requested, actor, nowIso, store }) {
  const r = await applyPodAccessChange({ podId, visibility: requested, actor, nowIso, store })
  if (r.status === 200) { delete r.body.wasRole; delete r.body.roleNoop }
  return r
}

/**
 * Validate a required_role request body against the pod it claims to be for.
 * Only called when the body carries the key at all (`'required_role' in body`).
 *
 * null      = open to everyone. A release-grade act: needs `confirm: podId`.
 * 'string'  = address the pod to holders of that role. No confirm — erring
 *             towards fewer readers is the safe direction, as with a hold.
 *
 * @param {{required_role?:string|null, confirm?:string}} body
 * @param {string} podId
 * @returns {{ok:true, requiredRole:string|null} | {ok:false, status:number, error:string}}
 */
function parseRequiredRoleRequest(body, podId) {
  const raw = body ? body.required_role : undefined
  if (raw === null) {
    const confirm = String((body && body.confirm) || '').trim()
    if (confirm !== podId) {
      return {
        ok: false,
        status: 400,
        error: `Opening a pod to every learner is a deliberate act: send {"confirm": "${podId}"} `
          + 'alongside {"required_role": null} to clear its role. Setting a role needs no confirmation.',
      }
    }
    return { ok: true, requiredRole: null }
  }
  const role = typeof raw === 'string' ? raw.trim() : ''
  if (!role) {
    return { ok: false, status: 400, error: 'required_role must be null (everyone) or a non-empty role name such as previewer_002' }
  }
  return { ok: true, requiredRole: role }
}

/**
 * The second gate for a role change, run AFTER the pod's current state is read.
 * A LIVE pod may only be opened (role → null): setting or changing its role
 * would take it away from learners who can reach it now, which is the pull-back
 * Tom closed on 2026-09-13. Narrow it while it is held.
 *
 * @param {{visibility:string|null|undefined, required_role:string|null|undefined}} current
 * @param {string|null} requested
 * @returns {{ok:true} | {ok:false, status:number, error:string}}
 */
function checkRequiredRoleTransition(current, requested) {
  if (current.visibility === 'live' && requested !== null && requested !== (current.required_role ?? null)) {
    return {
      ok: false,
      status: 409,
      error: 'This pod is live. A live pod is never pulled back from learners, and setting or changing '
        + 'its role would do exactly that (Tom, 2026-09-13). Hold-and-narrow is not offered either; '
        + 'a role is set while a pod is still held.',
    }
  }
  return { ok: true }
}

/** The metadata trail for a role change — read-modify-write, every key kept (see nextVisibilityMetadata). */
function nextRequiredRoleMetadata(existing, { requiredRole, was, actor, nowIso }) {
  const meta = (existing && typeof existing === 'object' && !Array.isArray(existing)) ? { ...existing } : {}
  meta.required_role_set_at = nowIso
  meta.required_role_set_by = describeActor(actor)
  meta.required_role_was = was ?? null
  meta.required_role_now = requiredRole
  return meta
}

/** Role only — a thin name over applyPodAccessChange, kept for callers and tests. */
async function applyRequiredRoleChange({ podId, requested, actor, nowIso, store }) {
  const r = await applyPodAccessChange({ podId, requiredRole: requested, actor, nowIso, store })
  if (r.status === 200) { delete r.body.was; delete r.body.roleNoop }
  return r
}

module.exports = {
  VISIBILITIES, LIVE_POD_NEVER_HELD, parseVisibilityRequest, checkVisibilityTransition, nextVisibilityMetadata, describeActor,
  applyPodAccessChange, applyVisibilityChange,
  parseRequiredRoleRequest, checkRequiredRoleTransition, nextRequiredRoleMetadata, applyRequiredRoleChange,
}
