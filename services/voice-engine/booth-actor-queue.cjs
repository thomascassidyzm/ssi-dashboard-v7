/**
 * booth-actor-queue.cjs — A HUMAN ACTOR SEES ONLY WHAT WE PUT IN THEIR QUEUE, IN OUR ORDER.
 *
 * Kai and Aran, 2026-10-16 (job #247, after #189's Next pod button), starting with Dan
 * (cym_s_for_eng, human_dan_cym_s):
 *   1. Show only what we deliberately put in the actor's queue. Dan's whole cast backlog is
 *      ~2,456 lines, most of them cym_sv2_for_eng test-course lines; he was shown a practice-
 *      phrase batch card off that plan on his Pod 1 link, and offered "See your other lines".
 *   2. Name the current pod by its display name ('Pod 1'), not by anything else.
 *   3. After Pod 1 comes the 206 silent Southern seed sentences (released cym_s_for_eng seeds,
 *      Welsh target1 slot, Dan cast fill-only; job #180) — NOT the one-line guess-game pod
 *      (job #867), and not behind every later pod. Pods not in the queue are not offered.
 *
 * A voice listed here has an EXPLICIT, ORDERED queue. Every read of its booth (home summary,
 * whole list, pod link, step link) is cut to the lines of these steps and nothing else, and the
 * practice-phrase plan is not sent at all. A voice NOT listed here keeps the booth it had: this
 * is opt-in per actor, so Aran's and Catrin's booths are untouched.
 *
 * To change what an actor is asked to read, edit their list: a step is either a pod
 * ({pod: '<slug>'}) or a kind of course line ({kind: 'seed', role: 'target1'}). Order is the
 * order the Next button walks.
 *
 * Pure: no I/O. The router passes the built queue in.
 */
'use strict'

const POD_KINDS = new Set(['pod', 'takeg'])

const ACTOR_QUEUES = {
  human_dan_cym_s: [
    { key: 'pod-1', title: 'Pod 1', courseCode: 'cym_s_for_eng', pod: 'pod-1' },
    { key: 'seeds', title: 'Seed sentences', courseCode: 'cym_s_for_eng', kind: 'seed', role: 'target1' },
  ],
}

/** The ordered steps of this voice's queue, or null when it has no controlled queue. */
function stepsFor(voiceId, queues = ACTOR_QUEUES) {
  const steps = queues[voiceId]
  return Array.isArray(steps) && steps.length ? steps : null
}

function lineInStep(line, step) {
  if (!line || !step || line.courseCode !== step.courseCode) return false
  if (step.pod) return POD_KINDS.has(line.kind || 'pod') && (line.podSlug === step.pod || line.podId === `${step.courseCode}:${step.pod}`)
  return line.kind === step.kind && (!step.role || line.role === step.role)
}

function stepOf(line, steps) {
  return steps.find((s) => lineInStep(line, s)) || null
}

/**
 * The queue cut to the actor's steps: lines outside every step are gone, the practice-phrase
 * plan is not sent, and the counts are counted over what is left. The same object back when the
 * voice has no controlled queue.
 */
function scopeQueue(voiceId, queue, queues = ACTOR_QUEUES) {
  const steps = stepsFor(voiceId, queues)
  if (!steps || !queue) return queue
  const lines = (queue.lines || []).filter((l) => stepOf(l, steps))
  const recorded = lines.filter((l) => l.recorded).length
  const inPods = (p) => steps.some((s) => s.pod && s.courseCode === p.courseCode && (p.podSlug === s.pod || p.podId === `${s.courseCode}:${s.pod}`))
  return {
    ...queue,
    lines,
    total: lines.length,
    recorded,
    remaining: lines.length - recorded,
    phrases: null,
    phraseBatches: null,
    openPhraseBatch: null,
    notReady: (queue.notReady || []).filter(inPods),
    handedOn: (queue.handedOn || []).filter(inPods),
    actorQueue: true,
  }
}

/** The step a link names: ?step=<key>, else the step holding ?pod=<slug or id>, else null. */
function stepForLink(voiceId, { course, pod, step } = {}, queues = ACTOR_QUEUES) {
  const steps = stepsFor(voiceId, queues)
  if (!steps) return null
  return steps.find((s) => (step && s.key === step && (!course || s.courseCode === course)) ||
    (!step && pod && s.pod && (s.pod === pod || `${s.courseCode}:${s.pod}` === pod) && (!course || s.courseCode === course))) || null
}

/** What the booth says a step is: a pod by its name, a set of lines by its name and how many are left. */
function stepLabel(step, remaining) {
  return step.pod ? step.title : `${step.title} (${remaining})`
}

/**
 * Where a step link goes when its step is finished: the next step in the actor's order with
 * lines still owed, then round from the top. Shaped as the router's `podsDone` so the booth's
 * Next button reads it unchanged; `remainingOutsidePods` is always 0, because nothing outside
 * the queue is the actor's to see.
 * @returns {{current: object|null, nextPod: object|null, remainingOutsidePods: 0}|null}
 */
function nextStepFor(voiceId, lines, currentStep, queues = ACTOR_QUEUES) {
  const steps = stepsFor(voiceId, queues)
  if (!steps) return null
  const tally = steps.map((s) => {
    const mine = (lines || []).filter((l) => lineInStep(l, s))
    const remaining = mine.filter((l) => !l.recorded).length
    return {
      step: s.key,
      title: s.title,
      label: stepLabel(s, remaining),
      courseCode: s.courseCode,
      podSlug: s.pod || null,
      podTitle: stepLabel(s, remaining),
      total: mine.length,
      remaining,
    }
  })
  const at = currentStep ? steps.findIndex((s) => s.key === currentStep.key) : -1
  const order = at === -1 ? tally : [...tally.slice(at + 1), ...tally.slice(0, at)]
  return {
    current: at === -1 ? null : tally[at],
    nextPod: order.find((t) => t.remaining > 0) || null,
    remainingOutsidePods: 0,
  }
}

module.exports = { ACTOR_QUEUES, stepsFor, lineInStep, scopeQueue, stepForLink, stepLabel, nextStepFor }
