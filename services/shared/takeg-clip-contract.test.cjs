/**
 * takeg-clip-contract.test.cjs — UPLOAD, THEN SLICE, against a fixture take.
 *
 * The two ends of `listening_pod_sentences.takeg_audio_ids` used to disagree.
 * services/voice-engine/recordist-router.cjs APPENDED a booth take to the array;
 * tools/slice-take-g.cjs indexes that array BY SENTENCE GROUP. So a human
 * re-record landed at index 1 and became "group 1's clip": the slicer would have
 * carved the back half of a sentence out of a take of the whole thing while the
 * front half still pointed at the superseded one. These lock the single contract
 * both ends now read from this module.
 */
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { groupsForTakes, nextTakeGIds } = require('./takeg-clip-contract.cjs')

// A two-sentence turn — the shape that made the two ends disagree.
const TEXT = "Mae'r fraich chwith yn iawn rŵan. Mi fydd y cwff yn gwasgu am chydig eiliadau."
const ATOMS = [
  { kind: 'atom', target_surface: "mae'r fraich chwith" },
  { kind: 'atom', target_surface: 'yn iawn rŵan' },
  { kind: 'atom', target_surface: 'mi fydd y cwff yn gwasgu' },
  { kind: 'atom', target_surface: 'am chydig eiliadau' },
]

test('a TTS render keeps one clip per group, and the slicer reads them by index', () => {
  const groups = groupsForTakes(TEXT, ATOMS, ['clip-a', 'clip-b'])
  assert.deepEqual(groups.map((g) => g.length), [2, 2], 'the full stop is a group boundary')
})

test('upload then slice: a booth take is ONE whole-turn read, and carves every unit', () => {
  // Upload. The row held nothing; the router files the clip and writes the link.
  const afterFirst = nextTakeGIds(null, 'take-1')
  assert.deepEqual(afterFirst, ['take-1'])

  // Slice. One clip against a two-group turn is the whole turn: every unit is
  // that clip's, so the seams are found across the lot and nothing is orphaned.
  const groups = groupsForTakes(TEXT, ATOMS, afterFirst)
  assert.equal(groups.length, 1)
  assert.equal(groups[0].length, ATOMS.length, 'every declared unit is sliced from the take')
  assert.equal(afterFirst[0], 'take-1', 'group 0 — the only group — is this take')
})

test('a re-record REPLACES the pointer; it never becomes another group', () => {
  const next = nextTakeGIds(['take-1'], 'take-2')
  assert.deepEqual(next, ['take-2'], 'appending would have claimed take-2 was group 1')
  const groups = groupsForTakes(TEXT, ATOMS, next)
  assert.equal(groups.length, 1, 'still one whole-turn read')
  assert.equal(groups[0].length, ATOMS.length)
  // Re-uploading the same clip id is not a second take.
  assert.deepEqual(nextTakeGIds(['take-2'], 'take-2'), ['take-2'])
})

test('a single-group turn is unaffected by any of it', () => {
  const text = 'yn ara deg rŵan — steddwch ar ochr y gwely gynta'
  const atoms = [
    { kind: 'atom', target_surface: 'yn ara deg' },
    { kind: 'atom', target_surface: 'steddwch ar ochr y gwely gynta' },
  ]
  assert.equal(groupsForTakes(text, atoms, ['one']).length, 1)
  assert.equal(groupsForTakes(text, atoms, []).length, 1)
})
