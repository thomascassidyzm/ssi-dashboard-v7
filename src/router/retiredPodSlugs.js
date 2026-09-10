/**
 * LEGACY POD-SLUG TOMBSTONES — old pod links, kept working on their way out.
 *
 * WHY THIS EXISTS. Tom's ruling of 2026-09-10: "THERE IS NO POD-0 anymore by
 * name, so giving it that slug name is legacy naming debt, we will trip up over
 * it again at a later date with new agents." On 2026-09-10 `cym_n_for_eng:pod-0`
 * was re-slugged to `pod-1` — the name it has had in the product since Tom's
 * 2026-08-22 ruling and the only name anyone says out loud. That day the old name
 * had already cost real hours: two workers and Watson each read `pod-0`, found it
 * live and populated with 231 current lines, and reasoned confidently from a name
 * that no longer means anything, producing two contradictory wrong answers to a
 * voice artist who was at a microphone waiting. A name that is wrong but still
 * resolves is worse than one that is missing, because nothing ever fails loudly
 * enough to be noticed.
 *
 * THIS IS A TOMBSTONE, NOT A SECOND REAL POD, and the difference is visible in
 * the address bar. Tom's constraint, in his own words: "Do NOT leave the old slug
 * resolving silently as an equal alias, which would recreate the exact ambiguity
 * being removed." So this is a redirect and not a lookup — the URL CHANGES to the
 * new slug, every page under it reads the new slug, and the old name appears
 * nowhere except in this table. It is deliberately NOT an entry in the serving
 * resolvers (`SERVING_SLUGS` in src/lib/servingPod.js and its two server-side
 * twins), because an entry there would be exactly the equal alias he ruled out.
 *
 * IT EXISTS ONLY FOR LINKS ALREADY SENT. Aran and Tom both shared
 * /production/cym_n_for_eng/pods/pod-0 on 2026-09-10, and Aran's own report to
 * Tom carried that URL. Those links are in a voice artist's chat history, not
 * in our code.
 *
 * WHEN IT CAN GO. When nobody is still holding a link from before 2026-09-10 —
 * call it a few months, and certainly the moment Aran and Catrin have finished
 * recording this pod and moved on. Deleting a row here costs one line and breaks
 * nothing but a bookmark; it is meant to be deleted.
 *
 * IT IS PER-COURSE ON PURPOSE. `pod-0` is still the REAL, CURRENT slug on 44
 * other courses, whose pods hold the older slate. Redirecting their `pod-0` would
 * send them to a pod that does not exist. Only a course listed here has been
 * re-slugged.
 */
export const RETIRED_POD_SLUGS = [
  // cym_n_for_eng: re-slugged 2026-09-10, 231 lines, 143 linked clips, 43 rows of
  // learner progress carried in the same transaction.
  { courseCode: 'cym_n_for_eng', from: 'pod-0', to: 'pod-1', retiredOn: '2026-09-10' },
]

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
 * @param {string} path e.g. '/production/cym_n_for_eng/pods/pod-0'
 * @returns {string|null} the same path with the pod's current slug, or null
 */
export function retiredPodSlugRedirect(path) {
  const p = String(path || '')
  for (const t of RETIRED_POD_SLUGS) {
    for (const prefix of ['/production', '/courses']) {
      const head = `${prefix}/${t.courseCode}/pods/${t.from}`
      // Exact segment only: `pods/pod-0-unrecorded` is a DIFFERENT pod and must
      // never be caught by a prefix match, so the slug has to END here.
      if (p !== head && !p.startsWith(`${head}/`)) continue
      return `${prefix}/${t.courseCode}/pods/${t.to}${p.slice(head.length)}`
    }
  }
  return null
}
