/* Runnable: node services/voice-engine/voice-colouring.test.cjs */
const assert = require('assert')
const { colourSpeakers } = require('./voice-colouring.cjs')

const POOL = (nf, nm) => ({
  f: Array.from({ length: nf }, (_, i) => ({ name: `F${i}`, voice_id: `f${i}`, provider: 'x' })),
  m: Array.from({ length: nm }, (_, i) => ({ name: `M${i}`, voice_id: `m${i}`, provider: 'x' })),
})
// assert no two CONSECUTIVE turns share a voice id
function assertNoConsecutive(turns, assign) {
  for (let i = 1; i < turns.length; i++) {
    const a = turns[i - 1].speaker, b = turns[i].speaker
    if (a === b) continue
    assert.notStrictEqual(assign[a]?.voice_id, assign[b]?.voice_id, `consecutive ${a}/${b} share a voice`)
  }
}
let n = 0
const t = (name, fn) => { fn(); n++; console.log('  ✓', name) }

t('two speakers, different genders → distinct voices', () => {
  const turns = [{ speaker: 'A', gender: 'f', scene: 1 }, { speaker: 'B', gender: 'm', scene: 1 }, { speaker: 'A', gender: 'f', scene: 1 }]
  const a = colourSpeakers(turns, POOL(2, 2))
  assert.notStrictEqual(a.A.voice_id, a.B.voice_id)
  assertNoConsecutive(turns, a)
})

t('3 same-gender in one scene, pool 3 → all distinct', () => {
  const turns = [['A'], ['B'], ['C'], ['A'], ['B']].map(([s], i) => ({ speaker: s, gender: 'm', scene: 1 }))
  const a = colourSpeakers(turns, POOL(1, 3))
  assert.strictEqual(new Set(['A', 'B', 'C'].map((s) => a[s].voice_id)).size, 3)
  assertNoConsecutive(turns, a)
})

t('4 same-gender, realistic back-and-forth, pool 3 → consecutive never collide', () => {
  // a natural dialogue (not a 4-clique): each speaker mostly talks to 1-2 others
  const seq = ['A', 'B', 'C', 'B', 'A', 'D', 'C', 'D', 'A', 'B', 'C']
  const turns = seq.map((s) => ({ speaker: s, gender: 'm', scene: 1 }))
  assertNoConsecutive(turns, colourSpeakers(turns, POOL(1, 3)))
})

t('consecutive guarantee holds ACROSS a scene boundary (the bug we caught)', () => {
  const turns = [
    { speaker: 'A', gender: 'm', scene: 1 }, { speaker: 'B', gender: 'm', scene: 1 },
    { speaker: 'C', gender: 'm', scene: 2 }, { speaker: 'D', gender: 'm', scene: 2 }, // C is consecutive to B across the boundary
  ]
  assertNoConsecutive(turns, colourSpeakers(turns, POOL(1, 2)))
})

t('mixed-gender scene of 5, pool 3+3 → consecutive guarantee holds', () => {
  const seq = [['A', 'f'], ['B', 'm'], ['C', 'f'], ['D', 'm'], ['E', 'f'], ['A', 'f'], ['D', 'm'], ['C', 'f'], ['B', 'm']]
  const turns = seq.map(([s, g]) => ({ speaker: s, gender: g, scene: 1 }))
  assertNoConsecutive(turns, colourSpeakers(turns, POOL(3, 3)))
})

t('separate scenes can reuse voices freely', () => {
  const turns = [
    { speaker: 'A', gender: 'm', scene: 1 }, { speaker: 'B', gender: 'm', scene: 1 },
    { speaker: 'C', gender: 'm', scene: 2 }, { speaker: 'D', gender: 'm', scene: 2 },
  ]
  const a = colourSpeakers(turns, POOL(1, 2))
  assertNoConsecutive(turns, a)
  // A and C are in different scenes → allowed to share
})

console.log(`\n${n} passed`)
