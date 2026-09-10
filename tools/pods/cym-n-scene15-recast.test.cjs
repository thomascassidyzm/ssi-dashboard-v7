/**
 * The editorial cast of cym_n_for_eng:pod-1 scenes 15-22, asserted.
 *
 * This test is the rule, not a document about the rule: it says which lines the
 * other person speaks, that the learner is Aran everywhere else from scene 15,
 * and that scene 22 keeps the female learner voice because Aran has already
 * recorded the Friend side of that conversation and one voice cannot hold both
 * halves of a real exchange.
 */
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { relabel, CAST_AFTER, LOCAL_SPEAKER, CHAT_LEARNER, LOCAL_SPEAKER_LINES } =
  require('./cym-n-scene15-recast-2026-09-10.cjs')

const voiceOf = (label) => CAST_AFTER[label].name

test('the learner’s own practice lines go to Aran', () => {
  for (const [sc, sn] of [[15, 1], [18, 6], [19, 10], [20, 3], [21, 9]]) {
    assert.equal(relabel(sc, sn), 'Learner')
    assert.equal(voiceOf(relabel(sc, sn)), 'Aran')
  }
})

test('the other person’s half of an exchange stays with Catrin', () => {
  // "Can we pay by card?" is answered by "No, we only take cash" — if both are
  // Aran he is answering himself, which is what the August recast removed.
  assert.equal(relabel(16, 8), 'Learner')
  assert.equal(relabel(16, 9), LOCAL_SPEAKER)
  assert.equal(voiceOf(relabel(16, 9)), 'Catrin')
  assert.equal(LOCAL_SPEAKER_LINES.size, 11)
  for (const key of LOCAL_SPEAKER_LINES) {
    const [sc, sn] = key.split('-').map(Number)
    assert.equal(relabel(sc, sn), LOCAL_SPEAKER)
  }
})

test('scene 22 is cast exactly as it is today — only the label moves', () => {
  for (const sn of [1, 3, 5, 7, 9, 11]) {
    assert.equal(relabel(22, sn), CHAT_LEARNER)
    assert.equal(voiceOf(relabel(22, sn)), 'Catrin')
  }
})

test('every label this plan can produce has a voice', () => {
  for (let sc = 15; sc <= 22; sc++) {
    for (let sn = 1; sn <= 14; sn++) assert.ok(CAST_AFTER[relabel(sc, sn)])
  }
})
