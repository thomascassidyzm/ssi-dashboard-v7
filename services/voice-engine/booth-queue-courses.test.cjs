// WHICH COURSES THE BOOTH QUEUES LEGOS AND PRACTICE PHRASES FOR (job #587, Kai 2026-11-03).
// Run with: node services/voice-engine/booth-queue-courses.test.cjs
//
// Why this test exists: Frisian (fry_for_eng) joined both lists so Auke can record all of it, under
// Kai's hard requirement of ZERO impact on the Welsh recorders. The Welsh entries, their labels and
// their ORDER are what decide a Welsh reader's lines and serving order (compareServed and
// mergeAcrossCourses walk PHRASE_QUEUE_COURSES in order), so this pins them exactly: a future edit
// that reorders, relabels or drops a Welsh course fails here before it moves anybody's booth.
'use strict'
const assert = require('assert')
const { PHRASE_QUEUE_COURSES, isPhraseQueueCourse } = require('./phrase-queue.cjs')
const { LEGO_QUEUE_COURSES, isLegoQueueCourse } = require('./recordist-queue.cjs')

// The Welsh lists, byte-for-byte as they stood before job #587 — and still first.
assert.deepStrictEqual(LEGO_QUEUE_COURSES.slice(0, 2), ['cym_sv2_for_eng', 'cym_nv2_for_eng'])
assert.deepStrictEqual(Object.entries(PHRASE_QUEUE_COURSES).slice(0, 2).map(([c, v]) => [c, { ...v }]),
  [['cym_nv2_for_eng', { label: 'North' }], ['cym_sv2_for_eng', { label: 'South' }]])

// Frisian is in both, after Welsh; nothing else is.
assert.deepStrictEqual([...LEGO_QUEUE_COURSES], ['cym_sv2_for_eng', 'cym_nv2_for_eng', 'fry_for_eng'])
assert.deepStrictEqual(Object.keys(PHRASE_QUEUE_COURSES), ['cym_nv2_for_eng', 'cym_sv2_for_eng', 'fry_for_eng'])
assert.ok(isLegoQueueCourse('fry_for_eng') && isPhraseQueueCourse('fry_for_eng'))

// The live Welsh courses are still never queued here.
for (const live of ['cym_n_for_eng', 'cym_s_for_eng']) {
  assert.ok(!isLegoQueueCourse(live), `${live} must never be a LEGO queue course`)
  assert.ok(!isPhraseQueueCourse(live), `${live} must never be a phrase queue course`)
}
console.log('booth-queue-courses: ok')
