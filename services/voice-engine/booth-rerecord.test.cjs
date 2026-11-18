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

  // Job #261, Aran's live card on 16 Oct: the S1379 seed was edited Affrica → Affrig and he read it
  // again; the old take stayed an orphan and was pinned on an unread phrase of the same seed.
  it('an orphan take of a line that was edited AND read again is not put on an unread neighbour', () => {
    const ph = (id, recorded, text) => ({ id: `phrase:${C}:${id}:target2`, kind: 'phrase', phrasePass: 1, phraseBatch: 16, courseCode: C, seedNumber: 1379, role: 'target2', text, recorded })
    const lines = [
      { id: 'seed:406880b4:target2', kind: 'seed', courseCode: C, seedNumber: 1379, role: 'target2', text: 'do, o’n i’n ddigon lwcus i deithio i’r Affrig', recorded: true },
      ph('S1379L01B02', true, 'ond o’n i’n ddigon lwcus'),
      ph('S1379L01B04', false, 'llynedd o’n i’n ddigon lwcus'),
    ]
    const takes = [{ id: 'old', course_code: C, role: 'target2', text: 'do, o’n i’n ddigon lwcus i deithio i Affrica', text_normalized: 'do, o’n i’n ddigon lwcus i deithio i affrica', seedNumber: 1379, created_at: '2026-10-15T14:43:21Z' }]
    const q = queueOf([lines[0]], { allPhraseLines: () => lines.slice(1), phraseBatches: [{ pass: 1, batch: 16, courseCode: C }] })
    expect(buildRerecordList(q, takes).items.filter((i) => i.why === 'text_changed')).toEqual([])
  })

  it('an edited line nobody has re-read still gets its old take, even beside a recorded line as alike', () => {
    const ph = (id, recorded, text) => ({ id: `phrase:${C}:${id}:target1`, kind: 'phrase', phrasePass: 1, phraseBatch: 1, courseCode: C, seedNumber: 7, role: 'target1', text, recorded })
    const lines = [ph('a', true, 'dw i eisiau mynd heddiw'), ph('b', false, 'dw i eisiau mynd adre')]
    const takes = [{ id: 't', course_code: C, role: 'target1', text: 'dw i eisiau mynd', text_normalized: 'dw i eisiau mynd', seedNumber: 7 }]
    const { items } = buildRerecordList(queueOf([], { allPhraseLines: () => lines, phraseBatches: [{ pass: 1, batch: 1, courseCode: C }] }), takes)
    expect(items).toMatchObject([{ lineId: `phrase:${C}:b:target1`, why: 'text_changed', oldText: 'dw i eisiau mynd' }])
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

// Job #261: a text change says who made it and when, from the row's last_edit_event_id.
describe('who changed the words', () => {
  it('finds the content row a line lives in', () => {
    expect(rr.editRowOf(`phrase:${C}:S1379L01B04:target2`)).toEqual({ table: 'course_practice_phrases', id: `${C}:S1379L01B04` })
    expect(rr.editRowOf('seed:406880b4-197c-400b-9c6a-d7faf0917ff8:target2')).toEqual({ table: 'course_seeds', id: '406880b4-197c-400b-9c6a-d7faf0917ff8' })
    expect(rr.editRowOf('lego:df926d18:target1')).toEqual({ table: 'course_legos', id: 'df926d18' })
    expect(rr.editRowOf('pod:abc:s1')).toBe(null)
  })
  it('puts the editor on text changes only, and leaves an unattributed row unattributed', () => {
    const list = { items: [{ lineId: 'a', why: 'text_changed' }, { lineId: 'b', why: 'skipped' }, { lineId: 'c', why: 'text_changed' }] }
    const out = rr.withEditors(list, new Map([['a', { by: 'Kai', at: '2026-10-15T09:00:00Z' }], ['b', { by: 'X', at: 'y' }]]))
    expect(out.items).toEqual([
      { lineId: 'a', why: 'text_changed', changedBy: 'Kai', changedAt: '2026-10-15T09:00:00Z' },
      { lineId: 'b', why: 'skipped' },
      { lineId: 'c', why: 'text_changed' },
    ])
  })
})

describe('one old take is the old words of two edited lines (job #159)', () => {
  const ph = (id, text) => ({ id: `phrase:${C}:${id}:target2`, kind: 'phrase', courseCode: C, seedNumber: 1642, role: 'target2', text, recorded: false })
  const b01 = ph('S1642L02B01', 'esgusodwch fi, sut dach chi’n teimlo?')
  const b03 = ph('S1642L02B03', 'ond sut wyt ti’n teimlo?')
  // B01 and B03 both used to say "ond sut dach chi'n teimlo?" and shared one recording of it.
  const take = { id: 't1', text: 'ond sut dach chi’n teimlo?', text_normalized: 'ond sut dach chin teimlo', course_code: C, role: 'target2', seedNumber: 1642, created_at: '2026-10-15T15:46:00Z' }
  const queue = queueOf([], { allPhraseLines: () => [b01, b03], phraseBatches: [] })
  const pairIds = (m) => [...m.keys()].sort()

  it('pairTextChanges gives the take to both lines, marking the second as shared', () => {
    const m = rr.pairTextChanges([b01, b03], new Set(['x']), [take])
    expect(pairIds(m)).toEqual([b01.id, b03.id].sort())
    expect(m.shared.size).toBe(1)
  })

  it('withEditors keeps a shared line only when its own edit came after the take', () => {
    const list = { items: [
      { lineId: b01.id, why: 'text_changed', oldText: take.text, recordedAt: take.created_at },
      { lineId: b03.id, why: 'text_changed', oldText: take.text, recordedAt: take.created_at, sharedTake: true, was: null },
    ], pool: new Map(), firstIndex: new Map() }
    const edited = rr.withEditors(list, new Map([[b03.id, { by: 'x', at: '2026-10-27T11:11:00Z' }]]))
    expect(edited.items.map((i) => i.lineId)).toEqual([b01.id, b03.id])
    expect(rr.withEditors(list, new Map()).items.map((i) => i.lineId)).toEqual([b01.id])
  })
})

// AUKE'S CARD (fry_for_eng, Kai 2026-11-11, job #234): after #229 (takommende → takommend jier) the
// seed-176 sentence take and LEGO take were shared out to unread seed-176 phrases, which the card
// then showed as "text changed" with words those lines never had. Texts are the live ones.
describe('a shared take must read as the line before one edit (job #234)', () => {
  const F = 'fry_for_eng'
  const ph = (id, text) => ({ id: `phrase:${F}:${id}:target1`, kind: 'phrase', courseCode: F, seedNumber: 176, role: 'target1', text, recorded: false })
  const seed = { id: `seed:x176:target1`, kind: 'seed', courseCode: F, seedNumber: 176, role: 'target1', text: 'Ik sil him freegje oft er takommend jier helpe kin.', recorded: false }
  const lego = { id: `lego:l176:target1`, kind: 'lego', courseCode: F, seedNumber: 176, role: 'target1', text: 'takommend jier', recorded: false }
  const unread = [
    ph('S0176L01B02', 'miskien takommend jier'),
    ph('S0176L01B03', 'ik sil takommend jier oefenje'),
    ph('S0176L01U02', 'ik kin takommend jier weromkomme'),
    ph('S0176L02U06', "ik sil him freegje om't ik it net begryp"),
    ph('S0176L03B03', 'sy wol witte oft er helpe kin'),
    ph('S0176L03U02', 'silstû freegje oft er helpe kin?'),
  ]
  const take = (id, text, at) => ({ id, text, course_code: F, role: 'target1', seedNumber: 176, created_at: at })
  const takes = [
    take('seedTake', 'Ik sil him freegje oft er takommende jier helpe kin.', '2026-11-03T13:57:02Z'),
    take('legoTake', 'takommende jier', '2026-11-04T17:48:39Z'),
  ]

  it('the seed and LEGO keep their own old takes; no unread phrase is handed one', () => {
    const m = rr.pairTextChanges([seed, lego, ...unread], new Set(['x']), takes)
    expect(m.get(seed.id).id).toBe('seedTake')
    expect(m.get(lego.id).id).toBe('legoTake')
    for (const l of unread) expect(m.has(l.id)).toBe(false)
    expect(m.shared.size).toBe(0)
  })

  it('a phrase that said the seed sentence word for word still shares the seed take (seed 57)', () => {
    const s57 = { ...seed, id: 'seed:x57:target1', seedNumber: 57, text: "Ik kin my net heuge hoe't ik sizze moat wat ik sizze woe." }
    const u07 = { ...ph('S0057L02U07', "ik kin my net heuge hoe't ik sizze moat wat ik sizze woe"), seedNumber: 57 }
    const b01 = { ...ph('S0057L01B01', "ik kin my net heuge hoe't ik antwurdzje soe"), seedNumber: 57 }
    const old = { ...take('t57', "Ik kin net mear betinke hoe't ik sizze moat wat ik sizze woe.", '2026-11-03T15:02:57Z'), seedNumber: 57 }
    const m = rr.pairTextChanges([s57, u07, b01], new Set(['x']), [old])
    expect(m.get(s57.id).id).toBe('t57')
    expect(m.get(u07.id).id).toBe('t57')
    expect(m.shared.has(u07.id)).toBe(true)
    expect(m.has(b01.id)).toBe(false)
  })

  it('couldBeEditOf: one edited stretch passes, a different sentence does not', () => {
    expect(rr.couldBeEditOf('ond sut wyt ti’n teimlo?', 'ond sut dach chi’n teimlo?')).toBe(true)
    expect(rr.couldBeEditOf('takommend jier', 'takommende jier')).toBe(true)
    expect(rr.couldBeEditOf('miskien takommend jier', 'takommende jier')).toBe(false)
    expect(rr.couldBeEditOf('sy wol witte oft er helpe kin', 'Ik sil him freegje oft er takommende jier helpe kin.')).toBe(false)
  })
})
