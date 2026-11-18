import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as lib from './podChunkSizes.mjs'

// Job #381 (Tom r-2026-11-03): the English side of a pod cut is timed by the render's own Cartesia
// word timings, carried on the card by the dump tool, never by a transcription.
const cartesia = { words: ['Good', 'morning.'], starts: [0.118, 0.36], ends: [0.28, 0.76], source: 'cartesia' }
const read = (c) => c.word_timings ?? c.word_boundaries ?? null

test('each card carries its English clip timings, matched on the bare uuid', () => {
  assert.equal(typeof lib.attachKnownTimings, 'function')
  const cards = [
    { id: 'a', knownAudioId: '2e48c420-08f1-4875-9578-6ae20b2c04d2.v2' },
    { id: 'b', knownAudioId: 'ffffffff-0000-0000-0000-000000000000' },
    { id: 'c', knownAudioId: null },
  ]
  const out = lib.attachKnownTimings(cards, [{ id: '2e48c420-08f1-4875-9578-6ae20b2c04d2', word_timings: cartesia }], read)
  assert.deepEqual(out.map((c) => c.knownWordTimings), [cartesia, null, null])
  assert.equal(out[0].id, 'a')
})
