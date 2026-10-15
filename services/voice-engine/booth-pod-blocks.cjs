/**
 * booth-pod-blocks.cjs — the pods a voice reads in one course, in COURSE ORDER,
 * as the booth's "block N of M" (Kai, 2026-10-15, job #682).
 *
 * Eleri and Dan were each handed ONE link, /r/<voice>?course=cym_s_for_eng&pod=pod-1,
 * and they must never need another. So when the pod a link names is finished,
 * the booth offers the next block from here and loads it in place.
 *
 * A BLOCK IS A POD WITH LINES FOR THIS VOICE. It is counted over the queue the
 * booth already built (recordist-queue buildQueue), never re-derived: a pod the
 * voice has no readable line in is not a block of theirs, whatever the pod table
 * holds. COURSE ORDER is listening_pods.pod_order; a pod with no pod_order goes
 * after those that have one, core pods before others, then by slug with numbers
 * read as numbers (pod-2 before pod-10).
 */

'use strict'

const bySlugNatural = (a, b) => String(a || '').localeCompare(String(b || ''), 'en', { numeric: true })

function comparePodsInCourseOrder(a, b) {
  const oa = Number.isFinite(a.pod_order) ? a.pod_order : Infinity
  const ob = Number.isFinite(b.pod_order) ? b.pod_order : Infinity
  if (oa !== ob) return oa < ob ? -1 : 1
  const ca = a.pod_type === 'core' ? 0 : 1
  const cb = b.pod_type === 'core' ? 0 : 1
  return (ca - cb) || bySlugNatural(a.slug, b.slug) || bySlugNatural(a.id, b.id)
}

/**
 * @param {Array} lines  queue lines already narrowed to ONE course (any kind; only
 *                       those carrying a podId count)
 * @param {Array} pods   listening_pods rows for that course ({ id, slug, title, pod_type, pod_order })
 * @returns {Array<{ podId, slug, title, total, recorded }>} in course order
 */
function podBlocksFor(lines, pods) {
  const tally = new Map()
  for (const l of lines || []) {
    if (!l || !l.podId) continue
    const t = tally.get(l.podId) || { total: 0, recorded: 0 }
    t.total += 1
    if (l.recorded) t.recorded += 1
    tally.set(l.podId, t)
  }
  return (pods || [])
    .filter((p) => tally.has(p.id))
    .slice()
    .sort(comparePodsInCourseOrder)
    .map((p) => ({ podId: p.id, slug: p.slug || null, title: p.title || null, ...tally.get(p.id) }))
}

module.exports = { podBlocksFor, comparePodsInCourseOrder }
