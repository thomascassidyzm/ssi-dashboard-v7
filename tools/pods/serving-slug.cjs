/**
 * THE ONE IMPLEMENTATION of "does writing here put content in front of learners?"
 *
 * WHY THIS FILE EXISTS. Job #91 fixed the known-side readiness hole at ONE door and
 * found the lesson that governs this thread: an invariant guarded at one door is not
 * guarded. Job #93 then enumerated the doors — ten write paths create, rename, empty
 * or move a pod on a slug the player serves — shut two of them, and left three open.
 * Shutting those three means writing the same rule three more times, and a rule written
 * four times is four rules that will drift. So the rule lives here, once, and every
 * door composes its own wording around it.
 *
 * WHAT "SERVING" MEANS, checked against the code and not against a doc. The learning
 * app resolves a course's pod by SLUG: `pod_type = 'core'` and `slug in ('pod-1','pod-0')`,
 * first match wins (packages/player-vue/src/composables/servedPod.ts, duplicated as a
 * literal in api/courses/[code]/bundle.ts). It counts no rows, reads no text, and —
 * verified 2026-09-02 — reads no `visibility`. Two consequences that every door inherits:
 *
 *   1. `visibility` IS NOT A GUARD, anywhere. Tom's ruling, 2026-09-02, verbatim: "do not
 *      let visibility stand in for a guard anywhere." A 'held' pod on a serving slug is
 *      served. Nothing in this file reads visibility except to REPORT it in the refusal.
 *   2. A pod that does not exist yet is not safety. Creating the core header row IS the
 *      moment serving begins, so creating one is the harm, not the prelude to it.
 *
 * WHAT THIS RULE IS *NOT* FOR. It refuses an UNDELIBERATE write onto a serving slug —
 * an admin button whose slug defaults to pod-0, a markdown resync with no serving check.
 * It is NOT a wall in front of legitimate pod swaps. Tom, 2026-09-02: "are you saying
 * learner progress blocks a POD being swapped? because we do NOT want that — we built a
 * progress migration protocol already." Migration is the goal; refusal is correct only
 * where no migration exists in the path at all and the operator has not asked for one.
 * So the learner counts here NAME who is at risk; they never decide the answer. A door
 * that carries progress properly (pod-switchover.cjs) does not consult this file.
 *
 * The slug list is duplicated rather than imported: the two repos share a database, not
 * a module graph. If servedPod.ts ever widens its list, widen this one in the same change.
 */
const SERVING_POD_SLUGS = ['pod-1', 'pod-0']

/**
 * PURE. Would a core pod on this slug be resolved to a learner? Every door's
 * question, asked once.
 */
function servesLearners ({ slug, podType }) {
  if (!SERVING_POD_SLUGS.includes(slug)) return false
  // The resolver filters pod_type='core'; anything else on a serving slug is not served.
  return podType === 'core'
}

/**
 * PURE. Who is at risk, in plain words. A guard that says "refused: policy" teaches the
 * operator nothing and gets waved through; "9 of this course's 12 learners have progress
 * on this pod" does not. A count that could not be READ says so and still refuses —
 * a risk that cannot be measured is not a risk that has been cleared.
 */
function learnersAtRisk ({ learnersOnCourse, learnersOnPod }) {
  const n = (v) => (v === null || v === undefined ? null : Number(v))
  const onCourse = n(learnersOnCourse)
  const onPod = n(learnersOnPod)
  if (onCourse === null || onPod === null) {
    return 'the learner count was UNAVAILABLE — refusing anyway, because a risk that cannot be measured is not a risk that has been cleared'
  }
  if (onCourse === 0) return '0 learners currently have progress on this course'
  return `${onPod} of this course's ${onCourse} learners have progress on this pod`
}

/**
 * PURE. The refusal text for a write onto a serving slug, or null if this write is not
 * onto one (or the operator asked for it deliberately via `serveNow`).
 *
 * `action`, `harm`, `escape` and `remedy` are the CALL SITE'S wording — what this
 * particular tool is about to do, what that does to the learners, the flag that says
 * "yes, deliberately", and where to send the write instead. The rule is shared; the
 * sentence is the door's own, because "clone here" and "empty and refill this from a
 * markdown file" are not the same warning.
 */
function servingRefusal ({
  podId, slug, podType, podExists, podVisibility, rows = 0,
  learnersOnCourse, learnersOnPod, serveNow = false,
  action, harm, escape, remedy,
}) {
  if (!servesLearners({ slug, podType })) return null
  if (serveNow) return null

  const who = learnersAtRisk({ learnersOnCourse, learnersOnPod })
  const existence = podExists
    ? `already exists (visibility '${podVisibility}', which the resolver does not read)`
    : 'does not exist yet, and creating it is what starts the serving'
  return `${podId} is a SERVING slug — ${slug} is one of ${SERVING_POD_SLUGS.join(', ')}, which is what the ` +
    `player resolves by (packages/player-vue/src/composables/servedPod.ts). ` +
    `The pod row ${existence} and holds ${rows} sentence row(s). ${who}. ` +
    `${action} ${harm} ` +
    `${remedy} — or pass ${escape} if serving this destination immediately is the deliberate intent.`
}

/**
 * The facts `servingRefusal()` needs, read through a supabase-js client. THREE tools now
 * ask this question in that dialect (pod-sync, pod-dialogue-generator,
 * align-welsh-pod0-to-canonical), so the query is written once here rather than three
 * times; clone-pod and promote-pod ask it in SQL through `pg` because that is the client
 * they hold. The RULE above is shared by all of them either way.
 *
 * A read that fails yields null, which the rule treats as a reason to REFUSE — never as
 * a reason to allow.
 */
async function readServingFactsSupabase (client, courseCode, podId, { warn = () => {} } = {}) {
  const { data: pod } = await client
    .from('listening_pods').select('id, pod_type, visibility').eq('id', podId).maybeSingle()
  const { count: rows } = await client
    .from('listening_pod_sentences').select('id', { count: 'exact', head: true }).eq('pod_id', podId)
  let learnersOnCourse = null
  let learnersOnPod = null
  try {
    const { data: state, error } = await client
      .from('learner_pod_state').select('learner_id, sentence_id').eq('course_code', courseCode)
    if (error) throw new Error(error.message)
    learnersOnCourse = new Set((state || []).map(r => r.learner_id)).size
    learnersOnPod = new Set((state || []).filter(r => String(r.sentence_id || '').startsWith(`${podId}:`)).map(r => r.learner_id)).size
  } catch (e) {
    warn(`learner_pod_state count failed (${e.message}) — the serving gate will treat the count as unavailable`)
  }
  return { pod, rows: rows || 0, learnersOnCourse, learnersOnPod }
}

module.exports = { SERVING_POD_SLUGS, servesLearners, learnersAtRisk, servingRefusal, readServingFactsSupabase }
