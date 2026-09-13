// The pod id a course SERVES, resolved — never a literal slug. Every listening-pod
// tool under tools/ used to build `${COURSE}:pod-0` by hand; since Tom's ruling of
// 2026-09-13 ("Pod-0 does not exist anymore … There is only pod-1 now") the serving
// rule lives once in tools/pods/serving-slug.cjs and this is the one-line way to
// ask it for a pod id. A course with no serving core pod is a NAMED failure, not a
// guessed slug.
const { fetchServingSlug, SERVING_POD_SLUGS } = require('../pods/serving-slug.cjs')

async function servingPodId (client, courseCode) {
  const slug = await fetchServingSlug(client, courseCode)
  if (!slug) throw new Error(`${courseCode} has no serving core pod (none of: ${SERVING_POD_SLUGS.join(', ')})`)
  return `${courseCode}:${slug}`
}

module.exports = { servingPodId }
