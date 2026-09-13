/**
 * LEGACY POD-SLUG TOMBSTONES — old pod links, kept working on their way out.
 *
 * WHY THIS EXISTS. Tom's ruling of 2026-09-13: "Pod-0 does not exist anymore.
 * There should be zero references to it in code or docs or briefs. There is
 * only pod-1 now." Every course's core pod is `pod-1`, and the parked slugs that
 * carried the old number were renamed with it (`unrecorded`, `gated-<date>`,
 * `retired-<date>`). Before that, on 2026-09-10, the old name had already cost
 * real hours: two workers and Watson each read the old slug, found it live and
 * populated with 231 current lines, and reasoned confidently from a name that
 * no longer meant anything, producing two contradictory wrong answers to a voice
 * artist who was at a microphone waiting. A name that is wrong but still
 * resolves is worse than one that is missing, because nothing ever fails loudly
 * enough to be noticed.
 *
 * THIS IS A TOMBSTONE, NOT A SECOND REAL POD, and the difference is visible in
 * the address bar. Tom's constraint, in his own words: "Do NOT leave the old slug
 * resolving silently as an equal alias, which would recreate the exact ambiguity
 * being removed." So this is a redirect and not a lookup — the URL CHANGES to the
 * new slug, every page under it reads the new slug, and the old name appears
 * nowhere except in this table. It is deliberately NOT an entry in the serving
 * resolvers (`SERVING_SLUGS` in src/lib/servingPod.js and its server-side twins),
 * because an entry there would be exactly the equal alias he ruled out.
 *
 * IT EXISTS ONLY FOR LINKS ALREADY SENT. Aran and Tom both shared the Welsh pod's
 * old URL on 2026-09-10, and Aran's own report to Tom carried it. Those links are
 * in a voice artist's chat history, not in our code — and Aran has no channel
 * through which to be told the new one.
 *
 * WHEN IT CAN GO. When nobody is still holding a link from before the rename —
 * call it a few months, and certainly the moment Aran and Catrin have finished
 * recording this pod and moved on. Deleting this file costs one import and
 * breaks nothing but a bookmark; it is meant to be deleted. Nothing else in the
 * repo may spell the retired name.
 */

/**
 * The retired numbering, as it appeared in a URL's pod segment, and where each
 * spelling lives now. Exact segment only — matched against the WHOLE segment,
 * never as a prefix — so `unrecorded` and `retired-2026-08-22` map to their own
 * new names rather than being caught by the core pod's entry.
 */
const RETIRED_SEGMENT = /^pod-0(?:-(.+))?$/
function currentSlugFor(segment) {
  const m = RETIRED_SEGMENT.exec(segment)
  if (!m) return null
  return m[1] ? m[1] : 'pod-1'
}

/**
 * Where an old pod link should land, or null when the path is not a tombstone.
 *
 * A pure function of the path so a test can assert every retired link still
 * resolves without booting the router and its twenty eagerly-imported views —
 * the same reason ./legacyLabRedirects.js is its own module. A moved path with no
 * redirect is a 404 that only shows up when someone clicks an old link, which is
 * the worst possible moment to find out.
 *
 * Matches both the production path and the older /courses/... shape, which the
 * router already forwards to /production. Takes the PATH only — the caller carries
 * the query and hash across, so a `?line=` on an old link survives.
 *
 * @param {string} path e.g. '/production/cym_n_for_eng/pods/<retired slug>'
 * @returns {string|null} the same path with the pod's current slug, or null
 */
export function retiredPodSlugRedirect(path) {
  const p = String(path || '')
  const m = /^(\/production|\/courses)\/([^/]+)\/pods\/([^/]+)(\/.*)?$/.exec(p)
  if (!m) return null
  const [, prefix, courseCode, segment, rest = ''] = m
  const to = currentSlugFor(segment)
  if (!to) return null
  return `${prefix}/${courseCode}/pods/${to}${rest}`
}
