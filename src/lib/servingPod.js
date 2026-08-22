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

/**
 * @param {Array<{id?:string, slug?:string, pod_type?:string, sentence_count?:number}>} pods
 * @returns the pod row the course serves, or null.
 */
export function pickServingPod(pods) {
  const core = (pods || []).filter((p) => p && (p.pod_type == null || p.pod_type === 'core'))
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
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {string} courseCode
 */
export async function fetchServingPodId(sb, courseCode) {
  const { data, error } = await sb
    .from('listening_pods')
    .select('id, slug, pod_type')
    .eq('course_code', courseCode)
    .in('slug', SERVING_SLUGS)
  if (error) throw error
  const pod = pickServingPod(data || [])
  return pod ? pod.id : null
}
