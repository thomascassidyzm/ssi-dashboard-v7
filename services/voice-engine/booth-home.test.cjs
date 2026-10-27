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
const { phraseBatchList, servePhraseBatch } = require('./phrase-queue.cjs')

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
const servedFirst = { phrases: { pass: 1, batch: 1, courseCode: 'cym_nv2_for_eng' }, phraseBatches: batchList }
assert.deepStrictEqual(selectBatch(lines, 'phrase.1', 1, servedFirst).map((l) => l.id), ['phrase:a:target2'])

// #365: once batch 1 is done the queue serves batch 2, which is card n=2. The queue's lines are
// that batch alone, so opening card 2 must return them (it used to index a one-batch array → []),
// and a card that is not the served batch returns nothing.
const servedSecond = { phrases: { pass: 1, batch: 2, courseCode: 'cym_nv2_for_eng' }, phraseBatches: batchList }
const p1Later = buildHomeTracks(lines, servedSecond.phrases, batchList).find((t) => t.key === 'phrase.1')
assert.deepStrictEqual(p1Later.batches.filter((b) => b.current).map((b) => b.n), [2])
assert.deepStrictEqual(selectBatch(lines, 'phrase.1', 2, servedSecond).map((l) => l.id), ['phrase:a:target2'], 'the served batch opens by its card number')

// #697 (Aran): ANY phrase batch of the plan opens on request. The booth's queue carries only the
// served batch; the others are read from the plan, and reading one moves nobody's pointer.
const planCounts = { cym_nv2_for_eng: { 1: 2, 2: 1 } }
const isRec = (l) => l.id === 'x1'
const wireOf = (l) => ({ id: `phrase:${l.id}:target2`, kind: 'phrase', phrasePass: l.pass, courseCode: l.courseCode, recorded: !!l.recorded })
const openPhraseBatch = (want) => {
  const got = servePhraseBatch(plan, isRec, planCounts, want)
  return { summary: got.summary, lines: got.lines.map(wireOf) }
}
const servedFromQueue = servePhraseBatch(plan, isRec, planCounts)
assert.strictEqual(servedFromQueue.summary.batch, 1, 'batch 1 is served: x2 is still unread')
const ctx697 = { phrases: servedFromQueue.summary, phraseBatches: batchList, openPhraseBatch }
const queueLines = servedFromQueue.lines.map(wireOf)
assert.deepStrictEqual(selectBatch(queueLines, 'phrase.1', 1, ctx697).map((l) => l.id), ['phrase:x1:target2', 'phrase:x2:target2'], 'the served batch still opens')
// A FUTURE phrase batch: batch 2's only line is held for proofing, so it is counted and not served;
// pass 2's batch 1 has a line and opens although pass 1 is unfinished.
assert.deepStrictEqual(selectBatch(queueLines, 'phrase.2', 1, ctx697).map((l) => l.id), ['phrase:x4:target2'], 'a future pass opens by its card number')
assert.deepStrictEqual(selectBatch(queueLines, 'phrase.1', 2, ctx697), [], 'a batch of only held lines serves nothing')
assert.deepStrictEqual(selectBatch(queueLines, 'phrase.1', 9, ctx697), [], 'no such batch')
assert.deepStrictEqual(servePhraseBatch(plan, isRec, planCounts).summary.batch, 1, 'reading a batch left the served batch where it was')
// The opened batch is described as itself.
assert.strictEqual(servePhraseBatch(plan, isRec, planCounts, { pass: 2, batch: 1, courseCode: 'cym_nv2_for_eng' }).summary.pass, 2)
const plan2 = [...plan, pl('x5', 1, 3, 40), pl('x6', 1, 3, 41)]
const batchList2 = phraseBatchList(plan2, isRec)
const open2 = (want) => { const g = servePhraseBatch(plan2, isRec, planCounts, want); return { summary: g.summary, lines: g.lines.map(wireOf) } }
assert.deepStrictEqual(selectBatch(queueLines, 'phrase.1', 3, { ...ctx697, phraseBatches: batchList2, openPhraseBatch: open2 }).map((l) => l.id), ['phrase:x5:target2', 'phrase:x6:target2'], 'a future phrase batch opens with its own lines')
// A future SENTENCE batch opens with its own lines too (the server never locked these).
assert.strictEqual(selectBatch(lines, 'seed.cym_nv2_for_eng', 5)[0].id, 'seed:400')

// #378: LEGO lines (the gated 'lego' kind, #366) are a card of their own, cut into batches of
// 100 in queue order like new sentences, and the card and the batch agree.
const lego = (i) => ({ id: `lego:${i}:target1`, kind: 'lego', role: 'target1', courseCode: 'cym_sv2_for_eng', recorded: i < 5 })
const withLegos = [...lines.filter((l) => l.kind !== 'phrase'), ...Array.from({ length: 1291 }, (_, i) => lego(i))]
const legoTrack = buildHomeTracks(withLegos).find((t) => t.key === 'lego.cym_sv2_for_eng')
assert.ok(legoTrack, 'LEGOs get their own card')
assert.strictEqual(legoTrack.kind, 'lego')
assert.strictEqual(legoTrack.newCourse, true)
assert.strictEqual(legoTrack.batches.length, 13)
assert.deepStrictEqual([legoTrack.batches[0].from, legoTrack.batches[12].to, legoTrack.batches[12].total], [1, 1291, 91])
assert.deepStrictEqual(selectBatch(withLegos, 'lego.cym_sv2_for_eng', 13).map((l) => l.id)[0], 'lego:1200:target1')

// #823 (Aran, 15 Oct: whole sections kept disappearing): a FULLY RECORDED section is still a
// section, and a summary whose phrase-plan read failed carries the phrase sections it last sent,
// marked `counting`, instead of dropping them.
{
  const bh = require('./booth-home.cjs')
  const done = [...lines.filter((l) => l.kind !== 'phrase'), ...Array.from({ length: 30 }, (_, i) => lego(i))].map((l) => ({ ...l, recorded: true }))
  const doneTracks = bh.buildHomeTracks(done)
  assert.deepStrictEqual(doneTracks.map((t) => t.key), ['pod.health-ladder-pilot', 'seed.cym_n_for_eng', 'seed.cym_nv2_for_eng', 'lego.cym_sv2_for_eng'], 'fully recorded sections stay listed')
  assert.ok(doneTracks.every((t) => t.total > 0 && t.recorded === t.total))

  const pb = [{ pass: 1, batch: 1, courseCode: 'cym_nv2_for_eng', total: 197, recorded: 17 }, { pass: 2, batch: 1, courseCode: 'cym_nv2_for_eng', total: 150, recorded: 3 }]
  const good = bh.buildHomeTracks(lines, { pass: 1, batch: 1, courseCode: 'cym_nv2_for_eng' }, pb)
  const failedQueue = { lines: lines.filter((l) => l.kind !== 'phrase'), phrases: { unavailable: true } }
  assert.deepStrictEqual(bh.partialKinds(failedQueue), ['phrase'], 'a failed phrase read says the answer is partial')
  assert.deepStrictEqual(bh.partialKinds({ phrases: { pass: 1 } }), [])
  const failed = bh.buildHomeTracks(failedQueue.lines, failedQueue.phrases, null)
  const kept = bh.withLastKnownSections(failed, bh.partialKinds(failedQueue), good)
  assert.deepStrictEqual(kept.map((t) => t.key), good.map((t) => t.key), 'no section dropped when its count failed')
  assert.deepStrictEqual(kept.filter((t) => t.counting).map((t) => [t.key, t.total, t.recorded]), [['phrase.1', 197, 17], ['phrase.2', 150, 3]])
  assert.strictEqual(bh.withLastKnownSections(failed, [], good), failed, 'a full answer is its own')
}

// ONE PHRASE CARD PER COURSE AND PASS (Aran, 2026-10-27, job #179): his English booth reads the
// known side of North AND South, and both courses' batches sat on one card per pass, titled
// North. Each course now has its own pass-1 and pass-2 card; the first course keeps the old key.
{
  const bh = require('./booth-home.cjs')
  const N = 'cym_nv2_for_eng'
  const S = 'cym_sv2_for_eng'
  const b = (pass, batch, courseCode, total, recorded) => ({ pass, batch, courseCode, courseLabel: courseCode === N ? 'North' : 'South', firstSeed: 1, lastSeed: 9, total, recorded, held: 0 })
  // Served order (phraseBatchList): pass, batch, course — North 1, South 1, North 2, …
  const both = [b(1, 1, N, 198, 198), b(1, 1, S, 163, 0), b(1, 2, N, 196, 4), b(2, 1, N, 150, 2), b(2, 1, S, 170, 0)]
  const served = { pass: 1, batch: 1, courseCode: S }
  const t = bh.buildHomeTracks([], served, both).filter((x) => x.kind === 'phrase')
  assert.deepStrictEqual(t.map((x) => [x.key, x.courseCode, x.pass, x.total, x.recorded]), [
    ['phrase.1', N, 1, 394, 202],
    [`phrase.1.${S}`, S, 1, 163, 0],
    ['phrase.2', N, 2, 150, 2],
    [`phrase.2.${S}`, S, 2, 170, 0],
  ], 'North and South each get a pass-1 and a pass-2 card')
  assert.ok(t.every((x) => x.batches.every((y) => y.courseCode === x.courseCode)), 'no card holds another course\'s batch')
  assert.deepStrictEqual(t[1].batches.map((y) => [y.n, y.current]), [[1, true]], 'the served South batch is South card batch 1')
  assert.strictEqual(bh.servedPhraseBatchN(`phrase.1.${S}`, served, both), 1)
  assert.strictEqual(bh.servedPhraseBatchN('phrase.1', served, both), null, 'the North card is not serving')
  // A wire line names its card; opening South batch 1 returns the served lines.
  const wire = { id: 'phrase:s1:known', kind: 'phrase', phrasePass: 1, phraseTrack: bh.phraseTrackKey(1, S, N), courseCode: S, recorded: false }
  assert.strictEqual(bh.trackKeyOf(wire), `phrase.1.${S}`)
  assert.deepStrictEqual(bh.selectBatch([wire], `phrase.1.${S}`, 1, { phrases: served, phraseBatches: both }).map((l) => l.id), ['phrase:s1:known'])
  // North card batch 2 is the plan's North batch 2 (it was card batch 3 when South sat between).
  let asked = null
  bh.selectBatch([wire], 'phrase.1', 2, { phrases: served, phraseBatches: both, openPhraseBatch: (w) => { asked = w; return { lines: [], summary: {} } } })
  assert.deepStrictEqual(asked, { pass: 1, batch: 2, courseCode: N })
  // A one-course reader (Dan, South only) keeps the bare keys it always had.
  const dan = bh.buildHomeTracks([], served, [b(1, 1, S, 163, 0), b(2, 1, S, 170, 0)]).map((x) => x.key)
  assert.deepStrictEqual(dan, ['phrase.1', 'phrase.2'])
}

console.log('booth-home: all assertions passed')
