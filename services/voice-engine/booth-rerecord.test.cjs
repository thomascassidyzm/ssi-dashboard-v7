// THE RE-RECORD CARD'S LIST (Aran, 2026-10-15, job #788): skips before the furthest recorded line
// of a started batch, and lines whose words were edited after he recorded them.
import { describe, it, expect } from 'vitest'
import rr from './booth-rerecord.cjs'

const { buildRerecordList, rerecordBatchLines, recordedAmong, skippedIn, RERECORD_TRACK } = rr

const C = 'cym_nv2_for_eng'
const seedLine = (n, recorded, text = `brawddeg ${n} yma heddiw`) => ({ id: `seed:${C}:${n}:target1`, kind: 'seed', courseCode: C, seedNumber: n, role: 'target1', text, recorded })
// Batch 4 of the new sentences, cut at 100: S1301-S1400. He read to S1390, missing S1374 and S1379.
const batch4 = Array.from({ length: 100 }, (_, i) => seedLine(1301 + i, 1301 + i <= 1390 && ![1374, 1379].includes(1301 + i)))
const lead = Array.from({ length: 300 }, (_, i) => seedLine(1001 + i, true))
const later = Array.from({ length: 100 }, (_, i) => seedLine(1401 + i, false)) // batch 5: nothing saved yet
const queueOf = (lines, extra = {}) => ({ lines, ...extra })

describe('skipped lines', () => {
  it('lists unrecorded lines before the furthest recorded line of a started batch, and nothing after it', () => {
    const { items } = buildRerecordList(queueOf([...lead, ...batch4, ...later]))
    expect(items.map((i) => i.seedNumber)).toEqual([1374, 1379])
    expect(items.every((i) => i.why === 'skipped')).toBe(true)
    expect(items[0]).toMatchObject({ track: `seed.${C}`, batch: 4 })
  })

  it('an unstarted batch has no skips (batch 5 still on his device is not a miss)', () => {
    expect(skippedIn(later)).toEqual([])
  })

  it('a batch he never opened, with a few lines filled by takes read elsewhere, has no skips', () => {
    // Phrase and LEGO lines are often recorded by a take of the same words in another batch;
    // one such line near the end of a batch is not "how far he got".
    const untouched = Array.from({ length: 200 }, (_, i) => seedLine(2001 + i, [3, 120, 190].includes(i)))
    expect(skippedIn(untouched)).toEqual([])
  })

  it('an item drops off as soon as a good take saves', () => {
    const fixed = batch4.map((l) => (l.seedNumber === 1374 ? { ...l, recorded: true } : l))
    const { items } = buildRerecordList(queueOf([...lead, ...fixed, ...later]))
    expect(items.map((i) => i.seedNumber)).toEqual([1379])
  })

  it('finds skips in every phrase batch he has started, not only the served one', () => {
    const ph = (id, batch, recorded, seedNumber) => ({ id: `phrase:${id}:target1`, kind: 'phrase', phrasePass: 1, phraseBatch: batch, courseCode: C, seedNumber, role: 'target1', text: `ymadrodd ${id} hir`, recorded })
    const all = [ph('a', 1, true, 1), ph('b', 1, false, 1), ph('c', 1, true, 2), ph('d', 2, true, 3), ph('e', 2, false, 3), ph('f', 2, false, 4)]
    const q = {
      lines: [all[3], all[4], all[5]], // the queue serves batch 2 only
      allPhraseLines: () => all,
      phraseBatches: [{ pass: 1, batch: 1, courseCode: C }, { pass: 1, batch: 2, courseCode: C }],
    }
    const { items } = buildRerecordList(q)
    expect(items.map((i) => [i.lineId, i.track, i.batch])).toEqual([['phrase:b:target1', 'phrase.1', 1]])
  })
})

describe('text changed after he recorded it', () => {
  it('pairs an unrecorded line with his take of its old words, and says what they were', () => {
    const lines = [...lead, ...batch4.map((l) => (l.seedNumber === 1379 ? { ...l, recorded: false, text: 'dw i wedi bod yn brysur iawn' } : { ...l, recorded: l.seedNumber <= 1390 }))]
    const takes = [
      { id: 't1', course_code: C, role: 'target1', text: "dw i 'di bod yn brysur iawn", text_normalized: "dw i 'di bod yn brysur iawn", seedNumber: 1379, created_at: '2026-10-15T10:00:00Z' },
      // a take whose words still belong to a line is not an orphan, so it is never paired
      { id: 't2', course_code: C, role: 'target1', text: 'brawddeg 1380 yma heddiw', text_normalized: 'brawddeg 1380 yma heddiw', seedNumber: 1380 },
    ]
    const { items } = buildRerecordList(queueOf(lines), takes)
    const changed = items.find((i) => i.seedNumber === 1379)
    expect(changed).toMatchObject({ why: 'text_changed', oldText: "dw i 'di bod yn brysur iawn", text: 'dw i wedi bod yn brysur iawn' })
  })

  it('does not hand a neighbour phrase an old take without a seed to agree on', () => {
    const lines = [{ id: 'phrase:x:target1', kind: 'phrase', courseCode: C, role: 'target1', text: 'dw i eisiau bwyta', recorded: false }]
    const takes = [{ id: 't', course_code: C, role: 'target1', text: 'dw i eisiau mynd', text_normalized: 'dw i eisiau mynd' }]
    expect(buildRerecordList(queueOf(lines), takes).items).toEqual([])
  })
})

describe('the re-record batch', () => {
  it('walks the listed lines plus the page refused ones, unrecorded only, in course order', () => {
    const list = buildRerecordList(queueOf([...lead, ...batch4, ...later]))
    const refusedId = later[3].id // S1404: refused on the device
    const recordedId = lead[5].id // refused once, since recorded
    const lines = rerecordBatchLines(list, [refusedId, recordedId])
    expect(lines.map((l) => [l.seedNumber, l.rerecordWhy])).toEqual([[1374, 'skipped'], [1379, 'skipped'], [1404, 'refused']])
    expect(recordedAmong(list, [refusedId, recordedId])).toEqual([recordedId])
    expect(RERECORD_TRACK).toBe('rerecord')
  })
})

// JOB #806 (Aran, 15 Oct): the card said "1 line to re-record" and the batch it opened said everything
// was recorded. The card's count must equal the lines in the batch it opens, whatever the device holds.
describe('the card count and the batch it opens are one list', () => {
  const list = buildRerecordList(queueOf([...lead, ...batch4, ...later]))
  const goneId = 'seed:cym_nv2_for_eng:9999:target1' // refused once, no longer in his lines
  const recordedId = lead[5].id
  const refusedId = later[3].id
  const also = [goneId, recordedId, refusedId]
  it('every refused id is exactly one of: a batch line, recorded, or gone', () => {
    const batch = rerecordBatchLines(list, also).map((l) => l.id)
    const recorded = rr.recordedAmong(list, also)
    const gone = rr.goneAmong(list, also)
    expect(gone).toEqual([goneId])
    expect(recorded).toEqual([recordedId])
    // what the card counts: server items + refused ids that are neither recorded nor gone
    const counted = new Set([...list.items.map((i) => i.lineId), ...also.filter((id) => !recorded.includes(id) && !gone.includes(id))])
    expect(counted.size).toBe(batch.length)
    expect([...counted].sort()).toEqual([...batch].sort())
  })
  it('a lone stale refused take gives an empty batch AND a zero count', () => {
    const none = buildRerecordList(queueOf([...lead]))
    expect(rerecordBatchLines(none, [goneId])).toHaveLength(0)
    expect(rr.goneAmong(none, [goneId])).toEqual([goneId])
  })
})

// A TAKE THAT SAVED BUT DID NOT MATCH ITS WORDS (job #842): the background script check's failure
// comes back as a re-record, although the line IS recorded.
describe("didn't match the words", () => {
  const failure = (n, extra = {}) => ({ lineId: `seed:${C}:${n}:target1`, takeId: `T${n}`, heard: 'rhywbeth arall', reason: 'cer_above_threshold', takenAt: '2026-10-15T16:00:00Z', ...extra })

  it('a recorded line whose take failed its check is on the list, in course order, with what was heard', () => {
    const list = rr.withTextCheckFailures(buildRerecordList(queueOf([...lead, ...batch4, ...later])), [failure(1380), failure(1010)])
    expect(list.items.map((i) => [i.seedNumber, i.why])).toEqual([[1010, 'didnt_match'], [1374, 'skipped'], [1379, 'skipped'], [1380, 'didnt_match']])
    expect(list.items[0]).toMatchObject({ heard: 'rhywbeth arall', takeId: 'T1010', track: `seed.${C}`, batch: 1 })
  })

  it('the re-record batch opens it although it is recorded, carrying what was heard and the take', () => {
    const list = rr.withTextCheckFailures(buildRerecordList(queueOf([...lead, ...batch4, ...later])), [failure(1380)])
    const lines = rerecordBatchLines(list)
    const l = lines.find((x) => x.seedNumber === 1380)
    expect(l).toMatchObject({ recorded: true, rerecordWhy: 'didnt_match', rerecordHeard: 'rhywbeth arall', rerecordTakeId: 'T1380' })
  })

  it('a failure for a line no longer in his lines is dropped', () => {
    const list = rr.withTextCheckFailures(buildRerecordList(queueOf([...lead])), [failure(9999)])
    expect(list.items).toEqual([])
  })
})
