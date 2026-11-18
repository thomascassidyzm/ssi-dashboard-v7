// A POD LINE'S SCENE REACHES THE WIRE (Kai, 2026-10-28, job #44·AA). Job #8·AA put `scene` on pod
// lines in buildLanguageLines so the booth home could say "Starts at scene 15", but finishQueue's
// wire object did not carry it: Dan's live Priority card read "Starts at line 69 of 90." with no scene.
// Run with: node services/voice-engine/recordist-queue-scene-wire.test.cjs
'use strict'
const assert = require('assert')
const { finishQueue } = require('./recordist-queue.cjs')

const recordist = { voiceId: 'human_dan_cym_s', dialect: 'south', gender: 'm', spellings: ['human_dan_cym_s'] }
const line = (id, order, scene) => ({
  id, kind: 'pod', courseCode: 'cym_s_for_eng', podId: 'p1', podSlug: 'pod-1', podTitle: 'Pod 1',
  order, scene, text: 'Can mil.', knownText: '100,000.', speaker: 'Narrator', duplicateOf: [],
})
const language = { courses: ['cym_s_for_eng'], notReady: new Map(), handedOn: new Map(), uncast: 0, duplicatesCollapsed: 0 }

;(async () => {
  const q = await finishQueue(null, recordist, [line('a', 151, 15), line('b', 160, null)], language, { recordedKeys: new Set() })
  assert.strictEqual(q.lines[0].scene, 15, 'a pod line carries its scene on the wire')
  assert.strictEqual(q.lines[1].scene, null, 'no scene is null, never a guess')
  console.log('recordist-queue-scene-wire: ok')
})().catch((e) => { console.error(e); process.exit(1) })
