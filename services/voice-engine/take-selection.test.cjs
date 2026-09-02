/**
 * The two questions, pinned. The case that forced this file: a pod line whose
 * text gained a "…" pause cue on 2026-08-11 while the recordist's take of the
 * same sentence stays filed under the un-cued spelling — linked, playing to
 * learners, and reported to its own recordist as never recorded.
 */
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { lineHasTake, countsAsRecorded, pickCurrentTake } = require('./take-selection.cjs')

const spellings = ['human_aran_cym_n', 'human_aran_cym_n_2']

test.describe('lineHasTake', () => {
  test('sees a take filed under the line\'s own text', () => {
    const line = { kind: 'pod', text: 'A be ydy cyfrinair y wifi?' }
    const recordedKeys = new Set(['a be ydy cyfrinair y wifi'])
    assert.strictEqual(lineHasTake(line, { recordedKeys, spellings }), true)
  })

  test('sees a take through the SLOT when the pause cue broke the text match', () => {
    const line = { kind: 'pod', text: 'A be ydy… cyfrinair y wifi?', filledBy: ['human_aran_cym_n_2'] }
    const recordedKeys = new Set(['a be ydy cyfrinair y wifi'])
    assert.strictEqual(lineHasTake(line, { recordedKeys, spellings }), true)
  })

  test('does not claim a slot filled by somebody else', () => {
    const line = { kind: 'pod', text: 'Bore da, Sarah!', filledBy: ['human_catrinlliar_cym_n'] }
    assert.strictEqual(lineHasTake(line, { recordedKeys: new Set(), spellings }), false)
  })

  test('leaves an unlinked, unrecorded line outstanding', () => {
    const line = { kind: 'pod', text: 'Noswaith dda.', filledBy: [] }
    assert.strictEqual(lineHasTake(line, { recordedKeys: new Set(), spellings }), false)
  })

  test('still scores a SEED line by every copy of its slot', () => {
    const filled = { kind: 'seed', text: 'x', seedFilledBy: ['human_aran_cym_n', 'human_aran_cym_n'] }
    const partial = { kind: 'seed', text: 'x', seedFilledBy: ['human_aran_cym_n', 'human_catrinlliar_cym_n'] }
    assert.strictEqual(lineHasTake(filled, { recordedKeys: new Set(), spellings }), true)
    assert.strictEqual(lineHasTake(partial, { recordedKeys: new Set(), spellings }), false)
  })
})

test.describe('countsAsRecorded', () => {
  test('is take-and-not-wanted-again, in one place', () => {
    assert.strictEqual(countsAsRecorded({ rerecordWanted: false }, true), true)
    assert.strictEqual(countsAsRecorded({ rerecordWanted: true }, true), false)
    assert.strictEqual(countsAsRecorded({ rerecordWanted: false }, false), false)
  })
})

test.describe('pickCurrentTake', () => {
  test('takes the newest by the server\'s own clock', () => {
    const rows = [
      { id: 'june', created_at: '2026-06-15T15:43:24.708Z' },
      { id: 'august', created_at: '2026-08-23T17:17:01.985Z' },
    ]
    assert.strictEqual(pickCurrentTake(rows).id, 'august')
    assert.strictEqual(pickCurrentTake([]), null)
  })
})
