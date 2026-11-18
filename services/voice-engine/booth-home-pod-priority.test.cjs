// WHERE AN UNFINISHED POD PICKS UP (Kai, 2026-10-28, job #8·AA). Dan read 68 of his 91 South Pod 1
// lines and moved on to new sentences; the booth home now says "starts at scene 15". The summary's
// pod batch carries `firstLeft` — the first unrecorded line's place, pod order and scene.
// Run with: node services/voice-engine/booth-home-pod-priority.test.cjs
'use strict'
const assert = require('assert')
const { buildHomeTracks, firstLeftOf } = require('./booth-home.cjs')

// Dan's shape: 91 pod lines, the first 68 recorded, the rest from scene 15 at pod order 151.
const pod = Array.from({ length: 91 }, (_, i) => ({
  id: `cym_s_for_eng:pod-1:L${i}`, kind: 'pod', courseCode: 'cym_s_for_eng', podSlug: 'pod-1',
  order: i < 68 ? i * 2 + 1 : 151 + (i - 68) * 3, scene: i < 68 ? 1 + Math.floor(i / 5) : 15 + Math.floor((i - 68) / 4),
  recorded: i < 68,
}))
const seeds = Array.from({ length: 150 }, (_, i) => ({ id: `seed:${i}`, kind: 'seed', courseCode: 'cym_sv2_for_eng', recorded: i < 120 }))

const tracks = buildHomeTracks([...pod, ...seeds])
const p = tracks.find((t) => t.key === 'pod.pod-1')
assert.strictEqual(p.recorded, 68)
assert.deepStrictEqual(p.batches[0].firstLeft, { at: 69, order: 151, scene: 15 }, 'the pod says where it picks up')
// Sentence and LEGO batches carry no firstLeft: they are cut into batches of 100 and named by range.
for (const b of tracks.find((t) => t.key === 'seed.cym_sv2_for_eng').batches) assert.ok(!('firstLeft' in b))
// A finished pod has nowhere to pick up; a line with no scene says so with null, never a guess.
assert.strictEqual(firstLeftOf(pod.map((l) => ({ ...l, recorded: true }))), null)
assert.deepStrictEqual(firstLeftOf([{ id: 'x', recorded: false }]), { at: 1, order: null, scene: null })
console.log('booth-home-pod-priority: ok')
