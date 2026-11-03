import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cardChunks, chunkStats, syllablesFor } from './podChunkSizes.mjs'

const syl = (t) => t.split(/\s+/).length

test('a card without a fine map is one whole-sentence chunk', () => {
  const r = cardChunks({ targetText: 'Come stai oggi', fusionGroups: null, fusionContinuation: false }, syl)
  assert.equal(r.kind, 'plain')
  assert.deepEqual(r.chunks.map((c) => c.syl), [3])
})

test('a fusion card yields its fine units; a continuation row yields nothing', () => {
  const g = { takegAudioId: 't', wholeTargetClipId: 'w', sliceable: false,
    units: [{ target_surface: 'Buongiorno', target_start_ms: 0, target_end_ms: 950 }, { target_surface: 'Sarah' }] }
  const r = cardChunks({ targetText: 'Buongiorno, Sarah!', fusionGroups: [g], fusionContinuation: false }, syl)
  assert.deepEqual(r.chunks.map((c) => [c.text, c.startMs]), [['Buongiorno', 0], ['Sarah', null]])
  assert.equal(cardChunks({ targetText: 'x', fusionGroups: null, fusionContinuation: true }, syl), null)
})

test('chunkStats gives min/median/max and shares above 4/6/8', () => {
  assert.deepEqual(chunkStats([2, 3, 5, 9]), { chunks: 4, min: 2, median: 3, max: 9, over4: 50, over6: 25, over8: 25 })
})

test('syllablesFor counts Mandarin characters, uses the core counter elsewhere, throws otherwise', () => {
  const core = (t, l) => { if (l === 'ita') return 7; throw new Error('none') }
  assert.equal(syllablesFor('zho', '麻烦一下，这个位子有人坐吗？', core), 12)
  assert.equal(syllablesFor('ita', 'x', core), 7)
  assert.throws(() => syllablesFor('pol', 'x', core))
})
