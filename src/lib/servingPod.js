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
