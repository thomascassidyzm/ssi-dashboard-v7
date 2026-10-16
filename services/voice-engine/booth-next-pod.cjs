/**
 * booth-next-pod.cjs — WHERE A POD LINK GOES WHEN ITS POD IS FINISHED.
 *
 * Kai, 2026-10-16 (job #189): a human actor is sent a pod-specific booth link
 * (/r/:voiceId?course=<code>&pod=<slug>; Dan, cym_s_for_eng pod-1). When every line
 * of theirs in that pod is recorded, the booth used to show a dead "Nothing left to
 * read" and somebody had to send a new link. Now it offers "Next pod: <name>" — the
 * next pod, in queue order, where the same actor still has unrecorded lines — or
 * says all their pods are done.
 *
 * WHAT IS SKIPPED, AND WHAT IS NOT. Kai asked to skip pods that are "held, draft or
 * awaiting voice approval". Read against the data, literally:
 *   - `visibility = 'held'` is NOT a skip. Held means "kept back from LEARNERS until
 *     it is recorded and a human releases it" (pod-visibility.cjs, Tom 2026-08-23),
 *     which is exactly the state of every pod a human is recording — cym_s_for_eng
 *     pod-1, Dan's own pod, is held. Skipping held pods would skip the work itself.
 *   - `metadata.status = 'draft'` is NOT a skip either, for the same reason: pod-1
 *     carries it while being recorded.
 *   - A pod STAGED AS A DRAFT (metadata.staged_draft, pod-stage-draft.cjs: unproofread
 *     text, no cast) IS skipped, and so is an ARCHIVED or gated placeholder pod.
 *   - Voice approval (pod-voice-approvals.cjs) gates TTS renders per course; there is
 *     no per-pod voice-approval state for a human cast, so nothing is checked for it.
 * The queue itself already decides which lines an actor is cast on and that a line
 * has text to read; this only picks among the pods those lines belong to.
 *
 * Pure: no I/O. The router reads the pods' metadata and passes it in.
 */
'use strict'

const POD_KINDS = new Set(['pod', 'takeg'])

/** Why a pod is not offered as somebody's next pod, or null when it may be. */
function podNotOfferedBecause(pod) {
  const m = (pod && pod.metadata) || {}
  if (m.archived === true || m.gated_placeholder === true) return 'archived'
  if (m.staged_draft) return 'staged_draft'
  return null
}

/**
 * @param {object[]} lines the voice's whole queue (recorded lines INCLUDED), in queue order
 * @param {string} currentPod the link's ?pod= — a slug or a full pod id
 * @param {Map<string, object>|object} podsById listening_pods rows ({id, metadata}) by id
 * @returns {{nextPod: object|null, remainingOutsidePods: number}}
 */
function nextPodFor(lines, currentPod, podsById) {
  const meta = podsById instanceof Map ? podsById : new Map(Object.entries(podsById || {}))
  const pods = []
  const byId = new Map()
  let remainingOutsidePods = 0
  for (const l of lines || []) {
    const kind = l.kind || 'pod'
    if (!POD_KINDS.has(kind) || !l.podSlug) {
      if (!l.recorded) remainingOutsidePods += 1
      continue
    }
    const id = l.podId || `${l.courseCode}:${l.podSlug}`
    let p = byId.get(id)
    if (!p) {
      p = { podId: id, courseCode: l.courseCode || null, podSlug: l.podSlug, podTitle: l.podTitle || null, remaining: 0 }
      byId.set(id, p)
      pods.push(p)
    }
    if (!l.recorded) p.remaining += 1
  }
  const at = pods.findIndex((p) => p.podSlug === currentPod || p.podId === currentPod)
  // After the current pod first, then round from the top: an earlier pod with lines
  // still owed is still work, and a link into the last pod must not end the run.
  const order = at === -1 ? pods : [...pods.slice(at + 1), ...pods.slice(0, at)]
  const next = order.find((p) => p.remaining > 0 && !podNotOfferedBecause(meta.get(p.podId))) || null
  return { nextPod: next, remainingOutsidePods }
}

module.exports = { nextPodFor, podNotOfferedBecause }
