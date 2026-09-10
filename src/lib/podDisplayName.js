/**
 * What a pod is CALLED on screen, as against what its row is keyed by.
 *
 * Tom's ruling of 2026-08-22 — "We want to not have a Pod 0 from now on. We
 * want this first one to be called Pod 1" — renamed the product, and the rename
 * landed on 22 courses' slugs. It did not land on the other 45, Welsh among
 * them: `cym_n_for_eng:pod-0` still holds the 231 lines and its title column
 * still literally reads "… Listening Pods — Pod 0".
 *
 * The recordist's booth has said POD-1 over that same pod since 2026-09-02
 * (RecordistRoom.vue, POD_SECTIONS) and the production pages had not caught up,
 * so one body of work carried two names across two pages. Aran, who records it,
 * had stopped reporting the double name as a fault and started writing "Pod0/1"
 * as one word — carrying our inconsistency for us.
 *
 * This is a DISPLAY rule and nothing else. The slug is untouched, the route
 * parameter is untouched, and every page that shows the slug keeps showing it
 * verbatim beside the renamed title: renaming the identifier is a migration
 * with a learner-progress protocol attached, not a label change.
 *
 * Only the exact slug `pod-0` is renamed. `pod-0-retired-2026-08-22` is a
 * parked pod that keeps its own name, and `pod-1` already says Pod 1.
 */

import { slugOfPod } from './servingPod.js'

/** The one slug whose display name is out of step with the product's. */
const RENAMED_SLUG = 'pod-0'

/**
 * The pod's title as a person should read it.
 * @param {{title?:string, slug?:string, id?:string}} pod
 * @returns {string} the title, with "Pod 0" read as "Pod 1" where that is the pod meant
 */
export function podDisplayTitle(pod) {
  const title = (pod && pod.title) || ''
  if (!title || slugOfPod(pod) !== RENAMED_SLUG) return title
  // The separator and the case are the title's own; only the digit is ours.
  return title.replace(/\bPod([\s-]?)0\b/gi, (m, sep) => `${m.slice(0, 3)}${sep}1`)
}

/**
 * The name to put on a pod when there may be no title to work from.
 *
 * The pod CARDS and the detail header call podDisplayTitle directly, because a
 * pod row always has a title there. The manage card cannot assume that, and
 * before 2026-09-10 its fallback built a label straight off the slug — so on
 * Welsh, whose 231-line pod is still keyed `pod-0`, it read "Pod 0 — already
 * generated" directly under a card that had just said Pod 1. One body of work,
 * two names, on one screen, which is exactly what the rename exists to stop.
 *
 * Exported rather than inlined so the rule is pinned by a test of the thing
 * that ships, not by a copy of the expression in a test file.
 *
 * @param {{title?:string, slug?:string, id?:string}} pod
 */
export function podDisplayLabel(pod) {
  const titled = podDisplayTitle(pod)
  if (titled) return titled
  const slug = slugOfPod(pod)
  if (!slug) return ''
  return `Pod ${slug === RENAMED_SLUG ? '1' : slug.replace(/^pod-/, '')}`
}
