// THE BOOTH'S HOME SCREEN (job #347, Aran 2026-10-14): a summary of cards and batches, and one
// batch's lines on demand. Run with: node services/voice-engine/booth-home.test.cjs
//
//   - New sentences are cut into batches of 100 in queue order, recorded lines included, so a
//     batch does not move while it is being read.
//   - The batch the summary counts is exactly the batch selectBatch returns.
//   - A sandbox course's sentences are marked NEW even though their seed rows exist (#335).
//   - A Take G line belongs to its pod's card; phrase cards come from the whole plan, and only
//     the batch the queue is serving is marked current.
//   - Nothing is reordered, added or dropped: the tracks add back up to the queue.
'use strict'
const assert = require('assert')
const { buildHomeTracks, selectBatch, trackKeyOf } = require('./booth-home.cjs')
const { phraseBatchList } = require('./phrase-queue.cjs')

const seed = (i, extra = {}) => ({ id: `seed:${i}`, kind: 'seed', courseCode: 'cym_nv2_for_eng', seedExisting: true, recorded: false, ...extra })
const lines = [
  { id: 'p1', kind: 'pod', courseCode: 'cym_n_for_eng', podSlug: 'health-ladder-pilot', recorded: false },
  { id: 'g1', kind: 'takeg', courseCode: 'cym_n_for_eng', podSlug: 'health-ladder-pilot', recorded: true },
  ...Array.from({ length: 305 }, (_, i) => seed(`old${i}`, { courseCode: 'cym_n_for_eng', recorded: true })),
  ...Array.from({ length: 640 }, (_, i) => seed(i, { recorded: i % 3 === 0 })),
  { id: 'phrase:a:target2', kind: 'phrase', phrasePass: 1, courseCode: 'cym_nv2_for_eng', recorded: false },
]

const tracks = buildHomeTracks(lines)
assert.deepStrictEqual(tracks.map((t) => t.key), ['pod.health-ladder-pilot', 'seed.cym_n_for_eng', 'seed.cym_nv2_for_eng'])
const pod = tracks[0]
assert.strictEqual(pod.total, 2, 'a Take G line sits on its pod card')
assert.strictEqual(pod.batches.length, 1, 'a script is read whole')

const sentences = tracks[2]
assert.strictEqual(sentences.newCourse, true, 'v2 sandbox sentences are new reading')
assert.strictEqual(tracks[1].newCourse, false, 'the old course is not')
assert.deepStrictEqual(sentences.batches.map((b) => b.total), [100, 100, 100, 100, 100, 100, 40])
assert.strictEqual(sentences.recorded, 214)

// The card and the batch agree, for every batch.
for (const b of sentences.batches) {
  const got = selectBatch(lines, 'seed.cym_nv2_for_eng', b.n)
  assert.strictEqual(got.length, b.total)
  assert.strictEqual(got.filter((l) => l.recorded).length, b.recorded)
  assert.strictEqual(got[0].id, `seed:${b.from - 1}`, 'in queue order')
}
assert.deepStrictEqual(selectBatch(lines, 'seed.cym_nv2_for_eng', 8), [], 'no batch 8')
assert.deepStrictEqual(selectBatch(lines, 'nope.x', 1), [])
assert.deepStrictEqual(selectBatch(lines, 'pod.health-ladder-pilot', 1).map((l) => l.id), ['p1', 'g1'])

// Nothing lost: the non-phrase tracks add back up to the non-phrase lines.
const nonPhrase = lines.filter((l) => l.kind !== 'phrase').length
assert.strictEqual(tracks.reduce((n, t) => n + t.total, 0), nonPhrase)

// Phrase cards: every batch counted, the served one current, served lines selectable.
const pl = (id, pass, batch, seedNumber, flagged = false) => ({ id, pass, batch, courseCode: 'cym_nv2_for_eng', readingOrder: seedNumber, seedNumber, copies: [{ flagged }] })
const plan = [pl('x1', 1, 1, 14), pl('x2', 1, 1, 20), pl('x3', 1, 2, 30, true), pl('x4', 2, 1, 14)]
const batchList = phraseBatchList(plan, (l) => l.id === 'x1')
assert.deepStrictEqual(batchList.map((b) => [b.pass, b.batch, b.total, b.recorded, b.held]), [[1, 1, 2, 1, 0], [1, 2, 1, 0, 1], [2, 1, 1, 0, 0]])
const withPhrases = buildHomeTracks(lines, { pass: 1, batch: 1, courseCode: 'cym_nv2_for_eng' }, batchList)
const p1 = withPhrases.find((t) => t.key === 'phrase.1')
const p2 = withPhrases.find((t) => t.key === 'phrase.2')
assert.deepStrictEqual(p1.batches.map((b) => b.current), [true, false])
assert.deepStrictEqual(p2.batches.map((b) => b.current), [false])
assert.strictEqual(p1.total, 3)
assert.strictEqual(trackKeyOf(lines[lines.length - 1]), 'phrase.1')
assert.deepStrictEqual(selectBatch(lines, 'phrase.1', 1).map((l) => l.id), ['phrase:a:target2'])

console.log('booth-home: all assertions passed')
