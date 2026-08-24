/**
 * Unit tests for the missing-audio scan's pure half (no database).
 * Run: npx vitest run services/audio-preview-missing
 *
 * The assertions about the ACCOUNTING are the point of this file, not decoration.
 * The defect being guarded is under-counting: an earlier sweep of this same
 * damage scanned two of the three uuid array columns and reported a total that
 * looked complete. So the tests check that every column reports, that a zero
 * column still reports a zero, and that "no clip assigned" never leaks into the
 * missing count.
 */

import { describe, it, expect } from 'vitest'

const {
  POD_ARRAY_AUDIO_COLUMNS,
  POD_SCALAR_AUDIO_COLUMNS,
  collectReferencedAudioIds,
  computeMissingSlots,
} = require('./audio-preview-missing.cjs')

const POD = { id: 'fra_for_eng:pod-1', course_code: 'fra_for_eng', title: 'At the market', pod_order: 1 }

function sentence (over = {}) {
  return {
    id: 's1',
    pod_id: POD.id,
    global_order: 3,
    scene_number: 1,
    sentence_number: 2,
    speaker: 'Marie',
    target_text: 'je voudrais deux baguettes',
    known_text: "I'd like two baguettes",
    sentence_known_audio_ids: [],
    sentence_audio_ids: [],
    takeg_audio_ids: [],
    target_audio_id: null,
    known_audio_id: null,
    explainer_audio_id: null,
    note_audio_id: null,
    ...over,
  }
}

function scan (sentences, liveIds = []) {
  return computeMissingSlots({
    sentences,
    podsById: new Map([[POD.id, POD]]),
    liveAudioIds: new Set(liveIds),
  })
}

function column (result, name) {
  return result.byColumn.find(c => c.column === name)
}

describe('the columns scanned', () => {
  it('covers three uuid ARRAY columns — not two', () => {
    expect(POD_ARRAY_AUDIO_COLUMNS).toEqual([
      'sentence_known_audio_ids', 'sentence_audio_ids', 'takeg_audio_ids',
    ])
  })

  it('covers all four uuid SCALAR columns, including note_audio_id', () => {
    expect(POD_SCALAR_AUDIO_COLUMNS).toEqual([
      'target_audio_id', 'known_audio_id', 'explainer_audio_id', 'note_audio_id',
    ])
  })

  it('reports every column even when the whole course is clean', () => {
    const result = scan([sentence()])
    expect(result.byColumn).toHaveLength(7)
    expect(result.totals.missing).toBe(0)
    for (const c of result.byColumn) expect(c.missing).toBe(0)
  })
})

describe('computeMissingSlots', () => {
  it('flags a dangling array slot with its column, index and address', () => {
    const result = scan([sentence({ sentence_known_audio_ids: ['live-1', 'dead-1'] })], ['live-1'])

    expect(result.totals.missing).toBe(1)
    expect(result.slots[0]).toMatchObject({
      courseCode: 'fra_for_eng',
      podId: 'fra_for_eng:pod-1',
      sentenceId: 's1',
      globalOrder: 3,
      sceneNumber: 1,
      speaker: 'Marie',
      column: 'sentence_known_audio_ids',
      kind: 'array',
      index: 1,
      audioId: 'dead-1',
      targetText: 'je voudrais deux baguettes',
      knownText: "I'd like two baguettes",
    })
  })

  it('flags a dangling scalar with a null index', () => {
    const result = scan([sentence({ target_audio_id: 'dead-2' })])
    expect(result.slots[0]).toMatchObject({ column: 'target_audio_id', kind: 'scalar', index: null })
  })

  it('counts a zero column as a measured zero alongside a damaged one', () => {
    const result = scan([sentence({
      sentence_audio_ids: ['dead-3'],
      takeg_audio_ids: ['live-2'],
    })], ['live-2'])

    expect(column(result, 'sentence_audio_ids')).toMatchObject({ referenced: 1, missing: 1 })
    // The column that an earlier sweep forgot: present, referenced, and zero.
    expect(column(result, 'takeg_audio_ids')).toMatchObject({ referenced: 1, missing: 0 })
  })

  it('never counts an unassigned slot as missing', () => {
    const result = scan([sentence({
      sentence_audio_ids: [],       // empty array — nothing assigned
      known_audio_id: null,         // NULL scalar — nothing assigned
    })])

    expect(result.totals.missing).toBe(0)
    expect(column(result, 'sentence_audio_ids').unassignedSentences).toBe(1)
    expect(column(result, 'known_audio_id').unassignedSentences).toBe(1)
  })

  it('keeps a gap inside an array apart from a line with nothing at all', () => {
    const result = scan([
      sentence({ id: 'gappy', sentence_known_audio_ids: ['live-1', null] }),
      sentence({ id: 'bare', sentence_known_audio_ids: [] }),
    ], ['live-1'])

    const col = column(result, 'sentence_known_audio_ids')
    expect(col.missing).toBe(0)
    expect(col.unassignedSentences).toBe(1)   // 'bare'
    expect(col.unassignedSlots).toBe(1)       // the hole in 'gappy'
    expect(col.referenced).toBe(1)
  })

  it('counts affected lines distinctly from affected slots', () => {
    const result = scan([sentence({
      sentence_known_audio_ids: ['dead-a', 'dead-b'],
      target_audio_id: 'dead-c',
    })])

    expect(result.totals.missing).toBe(3)
    expect(result.totals.sentencesAffected).toBe(1)
    expect(column(result, 'sentence_known_audio_ids').sentencesAffected).toBe(1)
  })

  it('orders slots the way a person would work through them', () => {
    const result = computeMissingSlots({
      sentences: [
        sentence({ id: 'late', global_order: 9, sentence_audio_ids: ['x'] }),
        sentence({ id: 'early', global_order: 1, sentence_audio_ids: ['y'] }),
      ],
      podsById: new Map([[POD.id, POD]]),
      liveAudioIds: new Set(),
    })
    expect(result.slots.map(s => s.sentenceId)).toEqual(['early', 'late'])
  })

  it('never claims a dangling id was deleted — it cannot know that', () => {
    const result = scan([sentence({ target_audio_id: 'dead' })])
    expect(result.note).toMatch(/not as "deleted"/)
    expect(JSON.stringify(result.slots)).not.toMatch(/deleted/i)
  })
})

describe('collectReferencedAudioIds', () => {
  it('gathers ids from every column and deduplicates them', () => {
    const ids = collectReferencedAudioIds([sentence({
      sentence_known_audio_ids: ['a', 'b'],
      sentence_audio_ids: ['b'],
      takeg_audio_ids: ['c'],
      target_audio_id: 'd',
      note_audio_id: 'a',
    })])
    expect([...ids].sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('ignores holes rather than asking the database about null', () => {
    expect(collectReferencedAudioIds([sentence({ sentence_audio_ids: [null, ''] })])).toEqual([])
  })
})
