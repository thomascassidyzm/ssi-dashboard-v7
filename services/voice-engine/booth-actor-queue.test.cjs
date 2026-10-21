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

test("job #754: Dan's queue is Pod 1, cym_sv2 seeds/LEGOs/phrases, then the 206 cym_s seeds", () => {
  const scoped = q.scopeQueue(DAN, dansQueue())
  assert.strictEqual(scoped.total, 90 + 206 + 764)
  assert.strictEqual(scoped.remaining, 28 + 206 + 764)
  assert.deepStrictEqual(scoped.phrases, { pass: 1, batch: 1, batches: 43 }, 'his phrase batch plan shows now he has a phrase step')
  assert.deepStrictEqual(scoped.phraseBatches, [{}])
  assert.ok(!scoped.lines.some((l) => l.podSlug === 'guess-i-love-you'), 'a pod outside the queue is not drawn')
  assert.deepStrictEqual(q.stepsFor(DAN).map((s) => s.key), ['pod-1', 'sv2-seeds', 'sv2-legos', 'sv2-phrases', 'seeds'])
})

test('on his Pod 1 link: called Pod 1, 28 left, and the cym_sv2 seeds (762) come next', () => {
  const scoped = q.scopeQueue(DAN, dansQueue())
  const step = q.stepForLink(DAN, { course: 'cym_s_for_eng', pod: 'pod-1' })
  const done = q.nextStepFor(DAN, scoped.lines, step)
  assert.strictEqual(done.current.title, 'Pod 1')
  assert.strictEqual(done.current.remaining, 28)
  assert.strictEqual(done.nextPod.step, 'sv2-seeds')
  assert.strictEqual(done.nextPod.courseCode, 'cym_sv2_for_eng')
  assert.strictEqual(done.nextPod.label, 'New course: seed sentences (762)')
  assert.strictEqual(done.remainingOutsidePods, 0)
})

test('the seeds step link: its own lines, and Pod 1 is offered back while it still owes lines', () => {
  const scoped = q.scopeQueue(DAN, dansQueue())
  const step = q.stepForLink(DAN, { course: 'cym_s_for_eng', step: 'seeds' })
  assert.strictEqual(scoped.lines.filter((l) => q.lineInStep(l, step)).length, 206)
  assert.strictEqual(q.nextStepFor(DAN, scoped.lines, step).nextPod.step, 'pod-1')
  const allRead = scoped.lines.map((l) => ({ ...l, recorded: true }))
  assert.strictEqual(q.nextStepFor(DAN, allRead, step).nextPod, null)
})

test('job #467: the health pod is in nobody\'s queue — Dan\'s booth is Pod 1 then the seeds', () => {
  const built = dansQueue()
  built.lines.push(pod('h1', 'health', false), pod('h2', 'health', true))
  const scoped = q.scopeQueue(DAN, built)
  assert.strictEqual(scoped.lines.filter((l) => l.podSlug === 'health').length, 0)
  assert.strictEqual(q.stepForLink(DAN, { course: 'cym_s_for_eng', pod: 'health' }), null)
  assert.deepStrictEqual(q.stepsFor(DAN).map((s) => s.key).slice(-1), ['seeds'])
  assert.ok(!q.stepsFor('human_eleri_cym_s').some((s) => s.pod === 'health'))
})

test("job #467: Eleri's booth is Pod 1, then cym_sv2 seeds/LEGOs/phrases in order, then the 206 cym_s seeds; no health", () => {
  const ELERI = 'human_eleri_cym_s'
  const lines = []
  for (let i = 0; i < 141; i++) lines.push(pod(`p${i}`, 'pod-1', true))
  for (let i = 0; i < 5; i++) lines.push(pod(`h${i}`, 'health', false))
  for (let n = 1; n <= 206; n++) lines.push({ ...seed(n), role: 'target2' })
  for (let n = 1; n <= 762; n++) lines.push({ ...seed(n, n <= 699, 'cym_sv2_for_eng'), role: 'target2' })
  lines.push({ id: 'l1', kind: 'lego', role: 'target2', courseCode: 'cym_sv2_for_eng', recorded: false })
  lines.push({ id: 'ph1', kind: 'phrase', role: 'target2', courseCode: 'cym_sv2_for_eng', recorded: false })
  const open = () => 'batch'
  const queue = { lines, phrases: { pass: 1 }, phraseBatches: [{ n: 1 }], notReady: [], handedOn: [] }
  Object.defineProperty(queue, 'openPhraseBatch', { enumerable: false, value: open })
  const scoped = q.scopeQueue(ELERI, queue)
  assert.strictEqual(scoped.lines.filter((l) => l.podSlug === 'health').length, 0, 'no health line')
  assert.strictEqual(scoped.lines.filter((l) => l.courseCode === 'cym_sv2_for_eng').length, 764)
  assert.deepStrictEqual(scoped.phrases, { pass: 1 }, 'the practice-phrase batch card stays')
  assert.strictEqual(scoped.openPhraseBatch, open, 'the batch opener survives the copy')
  assert.strictEqual(scoped.total, 141 + 206 + 764)
  assert.deepStrictEqual(q.stepsFor(ELERI).map((s) => s.key), ['pod-1', 'sv2-seeds', 'sv2-legos', 'sv2-phrases', 'seeds'])
  const done = q.nextStepFor(ELERI, scoped.lines, q.stepForLink(ELERI, { course: 'cym_s_for_eng', pod: 'pod-1' }))
  assert.strictEqual(done.nextPod.step, 'sv2-seeds')
  assert.strictEqual(done.nextPod.remaining, 63)
})

test('a voice without a phrase step still gets no phrase plan', () => {
  const steps = { x: [{ key: 'pod-1', title: 'Pod 1', courseCode: 'cym_s_for_eng', pod: 'pod-1' }] }
  const scoped = q.scopeQueue('x', { ...dansQueue(), phrases: { pass: 1 }, phraseBatches: [{ n: 1 }] }, steps)
  assert.strictEqual(scoped.phrases, null)
  assert.strictEqual(scoped.phraseBatches, null)
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
  assert.strictEqual(scoped.total, 1058)
  assert.strictEqual(scoped.recorded, 62)
  assert.strictEqual(scoped.remaining, 996)
})
