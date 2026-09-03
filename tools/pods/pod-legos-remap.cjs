/**
 * The pure half of the `pod_legos.first_seen_sentence` repair, so the rule can be
 * unit-tested without a database and so `pod-switchover.cjs` can apply the SAME
 * rule inside its own transaction rather than letting the residue accrue one
 * course at a time (job #157's finding, 2026-09-03).
 *
 * A switchover rewrites only the SLUG segment of a sentence id — the tail is
 * carried verbatim — so the remap is mechanical. It is also REFUSED unless the
 * rewritten id already exists: a value that cannot be proved is left alone and
 * reported, never guessed.
 */
'use strict'

const SERVING_SLUGS_FOR_REMAP = ['pod-1', 'pod-0']

/** `<course>:<slug>:<tail>` → parts, or null when the value is not a slot key at
 *  all. ~4,600 rows hold a bare integer from an older, unrelated defect; they are
 *  not this rule's business and must be reported rather than mangled. */
function parseSlotKey (id) {
  const parts = String(id == null ? '' : id).split(':')
  if (parts.length < 3) return null
  const [course, slug] = parts
  const tail = parts.slice(2).join(':')
  if (!course || !slug || !tail) return null
  return { course, slug, tail }
}

/**
 * @param {{legos: Array<{id:any, first_seen_sentence:string}>, liveSentenceIds: Set<string>}} o
 * @returns {{alive:Array, remap:Array<{legoId:any, from:string, to:string}>,
 *            notASlotKey:Array, unresolvable:Array}}
 */
function planPodLegoRemap ({ legos, liveSentenceIds }) {
  const alive = []; const remap = []; const notASlotKey = []; const unresolvable = []
  for (const l of legos || []) {
    const from = l.first_seen_sentence
    if (from == null || from === '') continue
    if (liveSentenceIds.has(from)) { alive.push(l); continue }
    const k = parseSlotKey(from)
    if (!k) { notASlotKey.push({ legoId: l.id, value: from }); continue }
    const candidates = SERVING_SLUGS_FOR_REMAP
      .filter(s => s !== k.slug)
      .map(s => `${k.course}:${s}:${k.tail}`)
      .filter(id => liveSentenceIds.has(id))
    // Exactly one live candidate, or it is not proved. Two would mean the course
    // serves both slugs, which is not a thing this rule may pick between.
    if (candidates.length === 1) remap.push({ legoId: l.id, from, to: candidates[0] })
    else unresolvable.push({ legoId: l.id, value: from, candidates })
  }
  return { alive, remap, notASlotKey, unresolvable }
}

module.exports = { planPodLegoRemap, parseSlotKey, SERVING_SLUGS_FOR_REMAP }
