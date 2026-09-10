/**
 * Which pod does a course actually serve?
 *
 * It used to be `<course>:pod-0` everywhere, so admin pages hard-coded that id.
 * Tom's ruling of 2026-08-22 — "We want to not have a Pod 0 from now on. We
 * want this first one to be called Pod 1" — makes the serving slug a PER-COURSE
 * fact: hrv_for_eng is the first course across and serves `hrv_for_eng:pod-1`
 * (231 lines), with its old content parked on `pod-0-retired-2026-08-22` and
 * `pod-1-retired-2026-08-22`. The other ~68 courses still serve `pod-0` and
 * must not change behaviour, which is why this is a lookup and not a rename.
 *
 * Server-side twin: `resolveCurrentPod0()` in services/pod-voice-approvals.cjs.
 * That one carries an extra first preference for the `pod-0-unrecorded` working
 * copy, because voice approval reviews unrecorded content before release; these
 * pages want what is LIVE, so the working copy is deliberately not preferred
 * here.
 *
 * HELD PODS (Tom, 2026-08-23: "keep them back in a human course until … after
 * all until they exist!!!"). `listening_pods.visibility` is 'live' or 'held';
 * RLS already makes a held pod's row and sentences invisible to the learner
 * app's anon key. This resolver is the ADMIN-side half of the same gate, and it
 * runs under a service-role client that sees held pods perfectly well — so the
 * exclusion has to be written here, explicitly, or an admin page reading "the
 * serving pod" would quietly hand a held pod to something learner-shaped.
 *
 * The default is EXCLUSION, and it FAILS CLOSED: in default mode a pod counts
 * as servable only when its row says `visibility === 'live'`. A missing
 * `visibility` key is treated as not-live, not as "probably fine" — the
 * opposite of how `pod_type` is handled two comments down, deliberately, because
 * a thin projection getting pod_type wrong shows an admin the wrong pill, while
 * a thin projection getting THIS wrong puts held content in front of a learner.
 * Any caller in default mode must therefore select the column; `fetchServingPodId`
 * does.
 *
 * Admin listings pass `{ includeHeld: true }` and get the old behaviour back
 * unchanged — they SHOULD see the held pod, badged HELD, because it is the pod
 * they are working on. The two callers today are both of that kind and both opt
 * in: PodsView.vue (the manage/regenerate card must point at the pod the course
 * actually has) and ListeningConfig.vue (auditioning a pod before release is the
 * whole point of the audition). The default exists for what comes next, not for
 * them.
 *
 * Nothing here writes the column. Release is a human act through the one write
 * path, POST /api/admin/pods/:courseCode/:slug/visibility.
 */

// Serving slugs, most-preferred first. An explicit allowlist, not a prefix
// match: archived pods keep pod_type='core' through the rename, so a
// `pod-0-retired-…` holding 300 lines must never be mistaken for the live pod.
export const SERVING_SLUGS = ['pod-1', 'pod-0']

export function slugOfPod(pod) {
  if (!pod) return ''
  if (pod.slug) return pod.slug
  const id = String(pod.id || '')
  const i = id.indexOf(':')
  return i < 0 ? id : id.slice(i + 1)
}

/** A pod is servable to learners only if it SAYS it is live. See the header. */
export function isLivePod(pod) {
  return !!pod && pod.visibility === 'live'
}

/**
 * @param {Array<{id?:string, slug?:string, pod_type?:string, visibility?:string, sentence_count?:number}>} pods
 * @param {{includeHeld?:boolean}} [opts] `includeHeld: true` for ADMIN listings
 *   that must show the held pod; omit it for anything learner-shaped.
 * @returns the pod row the course serves, or null.
 */
export function pickServingPod(pods, opts = {}) {
  const core = (pods || [])
    .filter((p) => p && (p.pod_type == null || p.pod_type === 'core'))
    .filter((p) => opts.includeHeld || isLivePod(p))
  for (const slug of SERVING_SLUGS) {
    const hit = core.find((p) => slugOfPod(p) === slug)
    if (hit) return hit
  }
  return null
}

/**
 * One small query against listening_pods, then the same preference order.
 * Returns `<course>:<slug>` or null when the course has no serving core pod.
 *
 * `visibility` is always selected, so the default fail-closed rule above has the
 * evidence it needs; pass `{ includeHeld: true }` from an admin surface.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {string} courseCode
 * @param {{includeHeld?:boolean}} [opts]
 */
export async function fetchServingPodId(sb, courseCode, opts = {}) {
  const { data, error } = await sb
    .from('listening_pods')
    .select('id, slug, pod_type, visibility')
    .eq('course_code', courseCode)
    .in('slug', SERVING_SLUGS)
  if (error) throw error
  const pod = pickServingPod(data || [], opts)
  return pod ? pod.id : null
}

/**
 * IS THIS POD PARKED — retired, gated, staged, superseded or empty?
 *
 * Tom, 2026-09-10, looking at the production pods page: "what the hell is this
 * abomination of a page??? why are we even displaying the old archived PODS?"
 * The row he was reading was `cym_n_for_eng:pod-0-gated-2026-08-06`, titled
 * "[ARCHIVED 2026-08-11] [GATED 2026-08-06] placeholder — sentences moved to …
 * until Aran/Catrin record them — supersed…", holding ZERO sentences. Production
 * bookkeeping on a working page.
 *
 * DERIVED FROM THE ROW, never a list of courses or slugs (the hardcoded-list
 * heuristic): a pod is parked if the switchover stamped a date suffix on its
 * slug, or a sweep stamped a marker on its title, or it holds nothing. That
 * means the next retirement is parked the day it lands, with nothing to update
 * here.
 *
 * TWO THINGS THIS MUST NOT DO, and both are pinned by tests:
 *
 * 1. HELD IS NOT PARKED. `visibility: 'held'` means no learner can reach it yet
 *    — which is the state of every pod anyone is actively working on, including
 *    the 231-line Welsh pod Aran is recording right now. Hiding held pods would
 *    hide exactly the pod this page exists to follow. The column is not read
 *    here at all, deliberately.
 * 2. A SERVING SLUG IS NEVER PARKED. `pod-0`/`pod-1` are the pods the course
 *    actually serves; if one is somehow empty that is a fact the producer needs
 *    to SEE, not a row to hide. So the allowlist above short-circuits the
 *    empty rule, and no filter built on this can ever hide the live pod.
 *
 * Choice pods (`senedd-s4c-steve`, `music`, `travel-situations`, `method-pod`)
 * are real content with real names and match none of these rules, so they keep
 * showing. So does the `pod-0-unrecorded` working copy, which is unrecorded, not
 * retired.
 */

// The switchover tools stamp the date onto the slug: `pod-0-retired-2026-08-22`,
// `pod-1-staged-2026-08-23`, `pod-0-gated-2026-08-06`. The date is optional here
// so a hand-made `pod-0-retired` parks too.
const PARKED_SLUG_SUFFIX = /-(retired|gated|staged)(-\d{4}-\d{2}-\d{2})?$/i
// The marker a sweep writes into the title when it parks a pod's content.
const PARKED_TITLE_MARKER = /\[\s*(archived|retired|gated)\b|\bsupersed(ed|es|ing)\b/i

/**
 * Why this pod is parked, or null if it is current.
 * @param {{slug?:string, id?:string, title?:string, sentence_count?:number}} pod
 * @returns {'retired'|'gated'|'staged'|'superseded'|'empty'|null}
 */
export function podParkedReason(pod) {
  if (!pod) return null
  const slug = slugOfPod(pod)
  const suffix = slug.match(PARKED_SLUG_SUFFIX)
  if (suffix) return suffix[1].toLowerCase()
  const marker = String(pod.title || '').match(PARKED_TITLE_MARKER)
  if (marker) return marker[1] ? marker[1].toLowerCase() : 'superseded'
  // A serving slug is never parked — see rule 2 in the header.
  if (SERVING_SLUGS.includes(slug)) return null
  if (Number(pod.sentence_count || 0) === 0) return 'empty'
  return null
}

/** @returns {boolean} true when this pod is bookkeeping rather than working content. */
export function isParkedPod(pod) {
  return podParkedReason(pod) !== null
}

/**
 * Split a course's pods into what a producer is working on and what is parked.
 * The page shows `current` and puts `parked` behind a counted disclosure — the
 * count is the point: nothing goes dark, it just stops shouting.
 *
 * `current` keeps the serving pod first, so "what is the state of this course's
 * listening content" is answered by the first card on the page.
 *
 * @param {Array} pods
 * @returns {{current: Array, parked: Array}}
 */
export function partitionPods(pods) {
  const current = []
  const parked = []
  for (const p of pods || []) (isParkedPod(p) ? parked : current).push(p)
  const serving = pickServingPod(current, { includeHeld: true })
  if (serving) {
    const i = current.indexOf(serving)
    if (i > 0) current.splice(i, 1), current.unshift(serving)
  }
  return { current, parked }
}
