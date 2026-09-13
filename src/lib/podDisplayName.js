/**
 * What a pod is CALLED on screen.
 *
 * Every course's core listening pod is `pod-1`, keyed and titled as such
 * (Tom, 2026-09-13: "There is only pod-1 now"). The display name is therefore
 * the row's own title, and only when a row has no title does the slug stand in.
 *
 * This module used to translate a numbering the product had already retired;
 * that translation is gone with the slugs that needed it. It stays as the ONE
 * place the pod cards, the detail header and the manage card get a pod's name,
 * so the next naming decision is one edit and is pinned by a test of the thing
 * that ships rather than by a copy of the expression in a test file.
 */

import { slugOfPod } from './servingPod.js'

/**
 * The pod's title as a person should read it.
 * @param {{title?:string, slug?:string, id?:string}} pod
 * @returns {string} the title, unchanged
 */
export function podDisplayTitle(pod) {
  return (pod && pod.title) || ''
}

/**
 * The name to put on a pod when there may be no title to work from: the manage
 * card cannot assume a title exists, so it falls back to a label built off the
 * slug — `pod-1` reads "Pod 1", a topic slug reads as itself.
 *
 * @param {{title?:string, slug?:string, id?:string}} pod
 */
export function podDisplayLabel(pod) {
  const titled = podDisplayTitle(pod)
  if (titled) return titled
  const slug = slugOfPod(pod)
  if (!slug) return ''
  return `Pod ${slug.replace(/^pod-/, '')}`
}
