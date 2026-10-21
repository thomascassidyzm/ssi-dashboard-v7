/**
 * booth-actor-queue.test.cjs — Dan's booth (Kai and Aran, 2026-10-16, job #247): only what we
 * put in his queue, in our order — Pod 1, then the 206 Southern seed sentences. Run: node <file>.
 */
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const q = require('./booth-actor-queue.cjs')

const DAN = 'human_dan_cym_s'
const pod = (id, slug, recorded, course = 'cym_s_for_eng') => ({ id, kind: 'pod', courseCode: course, podSlug: slug, podId: `${course}:${slug}`, recorded })
const seed = (n, recorded = false, course = 'cym_s_for_eng') => ({ id: `seed-${course}-${n}`, kind: 'seed', role: 'target1', courseCode: course, seedNumber: n, recorded })

/** Dan's queue as built: Pod 1 (62 read, 28 left), the guess pod, 206 seeds, and the cym_sv2 test-course backlog. */
function dansQueue() {
  const lines = []
  for (let i = 0; i < 90; i++) lines.push(pod(`p${i}`, 'pod-1', i < 62))
  lines.push(pod('g1', 'guess-i-love-you', false))
  for (let n = 1; n <= 206; n++) lines.push(seed(n))
  for (let n = 1; n <= 762; n++) lines.push(seed(n, false, 'cym_sv2_for_eng'))
  lines.push({ id: 'l1', kind: 'lego', role: 'target1', courseCode: 'cym_sv2_for_eng', recorded: false })
  lines.push({ id: 'ph1', kind: 'phrase', role: 'target1', courseCode: 'cym_sv2_for_eng', recorded: false })
  return { lines, total: lines.length, recorded: 62, phrases: { pass: 1, batch: 1, batches: 43 }, phraseBatches: [{}], notReady: [], handedOn: [], courses: ['cym_s_for_eng', 'cym_sv2_for_eng'] }
}

test("Dan's queue is Pod 1 then the seed sentences, nothing else", () => {
  const scoped = q.scopeQueue(DAN, dansQueue())
  assert.strictEqual(scoped.total, 90 + 206)
  assert.strictEqual(scoped.remaining, 28 + 206)
  assert.strictEqual(scoped.phrases, null, 'no practice-phrase batch card off the cym_sv2 plan')
  assert.ok(scoped.lines.every((l) => l.courseCode === 'cym_s_for_eng'))
  assert.ok(!scoped.lines.some((l) => l.podSlug === 'guess-i-love-you'), 'a pod outside the queue is not drawn')
})

test('on his Pod 1 link: called Pod 1, 28 left, and Seed sentences (206) comes next — not the guess pod', () => {
  const scoped = q.scopeQueue(DAN, dansQueue())
  const step = q.stepForLink(DAN, { course: 'cym_s_for_eng', pod: 'pod-1' })
  const done = q.nextStepFor(DAN, scoped.lines, step)
  assert.strictEqual(done.current.title, 'Pod 1')
  assert.strictEqual(done.current.remaining, 28)
  assert.strictEqual(done.nextPod.step, 'seeds')
  assert.strictEqual(done.nextPod.podSlug, null)
  assert.strictEqual(done.nextPod.label, 'Seed sentences (206)')
  assert.strictEqual(done.remainingOutsidePods, 0, 'nothing is said about lines outside the queue')
})

test('the seeds step link: its own lines, and Pod 1 is offered back while it still owes lines', () => {
  const scoped = q.scopeQueue(DAN, dansQueue())
  const step = q.stepForLink(DAN, { course: 'cym_s_for_eng', step: 'seeds' })
  assert.strictEqual(scoped.lines.filter((l) => q.lineInStep(l, step)).length, 206)
  assert.strictEqual(q.nextStepFor(DAN, scoped.lines, step).nextPod.step, 'pod-1')
  const allRead = scoped.lines.map((l) => ({ ...l, recorded: true }))
  assert.strictEqual(q.nextStepFor(DAN, allRead, step).nextPod, null)
})

test('job #457: the health pod is in his queue after the seeds, and a ?pod=health link opens it', () => {
  const built = dansQueue()
  built.lines.push(pod('h1', 'health', false), pod('h2', 'health', true))
  const scoped = q.scopeQueue(DAN, built)
  assert.strictEqual(scoped.lines.filter((l) => l.podSlug === 'health').length, 2)
  const step = q.stepForLink(DAN, { course: 'cym_s_for_eng', pod: 'health' })
  assert.strictEqual(step && step.key, 'health')
  const seedsStep = q.stepForLink(DAN, { course: 'cym_s_for_eng', step: 'seeds' })
  const allSeedsRead = scoped.lines.map((l) => (l.kind === 'seed' || l.podSlug === 'pod-1' ? { ...l, recorded: true } : l))
  assert.strictEqual(q.nextStepFor(DAN, allSeedsRead, seedsStep).nextPod.step, 'health')
})

test('a voice with no controlled queue is untouched', () => {
  const built = dansQueue()
  assert.strictEqual(q.scopeQueue('human_aran_cym_n', built), built)
  assert.strictEqual(q.nextStepFor('human_aran_cym_n', built.lines, null), null)
  assert.strictEqual(q.stepForLink('human_aran_cym_n', { pod: 'pod-1' }), null)
})

test('F31: total and recorded count the recorded lines the queue left out of `lines`', () => {
  const built = dansQueue()
  const unrecorded = built.lines.filter((l) => !l.recorded)
  const tally = [
    { courseCode: 'cym_s_for_eng', kind: 'pod', role: null, podSlug: 'pod-1', podId: 'cym_s_for_eng:pod-1', total: 90, recorded: 62 },
    { courseCode: 'cym_s_for_eng', kind: 'seed', role: 'target1', podSlug: null, podId: null, total: 206, recorded: 0 },
    { courseCode: 'cym_sv2_for_eng', kind: 'seed', role: 'target1', podSlug: null, podId: null, total: 762, recorded: 0 },
  ]
  const scoped = q.scopeQueue(DAN, { ...built, lines: unrecorded, tally })
  assert.strictEqual(scoped.total, 296)
  assert.strictEqual(scoped.recorded, 62)
  assert.strictEqual(scoped.remaining, 234)
})
