'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { assertNoCharacters } = require('./pod-solo-readers.cjs')

// Match stage-pilot-pod.cjs: the pilot marker identifies this seed set,
// and each sentence id is `${podId}:${seed.code.toLowerCase()}`.
const podId = 'cym_n_for_eng:health-ladder-pilot'
function seedPod(metadata = {}) {
  return {
    id: podId,
    speakers: {},
    metadata: {
      pilot: 'seed-and-splice',
      solo_readers: ['human_aran_cym_n', 'human_catrinlliar_cym_n'],
      ...metadata,
    },
  }
}
function line(seed, text) {
  return { id: `${podId}:${seed}`, pod_id: podId, speaker: '', target_text: text }
}

test('seed-set staging cannot bypass character validation by omitting solo_readers', () => {
  const pod = seedPod()
  delete pod.metadata.solo_readers
  pod.speakers = { 'Nurse Siân': {} }
  assert.throws(() => assertNoCharacters(pod, [
    { ...line('hg20', 'Mae angen help arna i.'), speaker: 'Nurse Siân' },
  ]), 'a declared seed set with characters must be refused even without solo_readers')
})

test('seed-set staging refuses a repeated seed id even when the text differs', () => {
  assert.throws(() => assertNoCharacters(seedPod(), [
    line('hg20', 'Mae angen help arna i.'),
    line('hg20', 'Dw i angen help.'),
  ]), 'different translations must not conceal two rows for the same seed')
})

test('seed-set staging accepts distinct seed ids with distinct text and no characters', () => {
  assert.doesNotThrow(() => assertNoCharacters(seedPod(), [
    line('hg20', 'Mae angen help arna i.'),
    line('hg21', 'Dw i wedi blino.'),
  ]))
})

// assertNoCharacters has one documented caller — a seed-set staging tool —
// and that caller always declares solo_readers. A pod reaching this guard
// without them is a staging bug, not an ordinary dialogue pod passing
// through: the guard has no way to tell "not a seed set" from "seed set
// that forgot its readers", so it refuses both. (Reconciled against Astra's
// original expectation here, which had this case pass silently — see the
// commit message.)
test('a pod reaching the guard without solo_readers is refused, not waved through', () => {
  assert.throws(() => assertNoCharacters(
    { id: 'dialogue', metadata: {}, speakers: { Customer: {} } },
    [{ id: 'dialogue:1', speaker: 'Customer', target_text: 'Hello.' }],
  ), /must declare metadata\.solo_readers/)
})
