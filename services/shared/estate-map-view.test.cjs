// Characterisation test for the estate map's pure half. The fixture is a
// two-course estate; the expected text was produced by the functions as they
// lived inline in production-api.cjs, and the blocker reason strings are an API
// contract other readers key on (see the doc comment on estateMapBlockers).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { estateMapBlockers, estateMapAsText } = require('./estate-map-view.cjs')

const SERVING = { exists: true, slug: 'pod-1', slots: 40, target_linked: 38, known_linked: 30, target_empty: 2, known_empty: 7, known_dead_stubs: 3 }

test('estateMapBlockers returns EVERY applicable blocker, in a fixed order', () => {
  const course = { audio: { clips: 0 }, serving_pod: SERVING }
  const approval = { ok: false, reason: 'stale_approval', message: 'Voices changed since approval.' }
  assert.deepEqual(estateMapBlockers(course, approval).map(b => b.reason), [
    'no_audio', 'pod_stale_voice_approval', 'pod_known_track_incomplete', 'pod_target_track_incomplete',
  ])
  assert.equal(estateMapBlockers(course, approval)[2].detail,
    'The pod-1 known-language track has 7 empty slots and 3 linked-but-dead clips out of 40.')
})

test('estateMapBlockers: a course with audio, no pod, is unblocked; a non-stale refusal is "awaiting"', () => {
  assert.deepEqual(estateMapBlockers({ audio: { clips: 12 } }, null), [])
  const b = estateMapBlockers({ audio: { clips: 12 }, serving_pod: { exists: true, slots: 1 } }, { ok: false, reason: 'unapproved', message: 'm' })
  assert.deepEqual(b.map(x => x.reason), ['pod_awaiting_voice_approval'])
})

test('estateMapAsText renders the fixture exactly', () => {
  const payload = {
    generated_at: '2026-11-02T18:00:00.000Z',
    totals: {
      courses: 2, released: 1, new_app_live: 1, new_app_beta: 0,
      voice_mode: { tts: 1, human: 1, mixed: 0, unknown: 0 },
      with_serving_pod: 1, serving_pod_slugs: 'pod-1', blocked: 1,
      blocked_by_reason: { pod_target_track_incomplete: 1 },
      serving_pod_lines: { per_course_counting: 40, distinct_per_language: 40 },
    },
    pods_by_language: [{ lang: 'spa', slots_per_course_counting: 40, distinct_lines: 40, collapse_factor: 1, courses_with_serving_pod: 1 }],
    courses: [
      { course_code: 'spa_for_eng', released: true, audio: { voice_mode: 'tts', clips: 1234 }, serving_pod: SERVING, blocked_reasons: ['pod_target_track_incomplete'] },
      { course_code: 'cym_for_eng', released: false, audio: { voice_mode: 'human', clips: 99 }, serving_pod: { exists: false }, blocked_reasons: [] },
    ],
    semantics: { released: 'Shipped to learners.' },
  }
  const expected = [
    'ESTATE MAP — computed 2026-11-02T18:00:00.000Z (fresh per read, never cached)',
    '',
    'courses 2 | released 1 (live 1 + beta 0) | unreleased 1 (drafts/never-shipped) | tts 1 human 1 mixed 0 unknown 0',
    'serving pod: 1 courses have one (pod-1) | blocked: 1',
    '    1  pod_target_track_incomplete',
    '',
    'pod lines, per-course counting 40 -> per-LANGUAGE 40 distinct. Pods are per language, not per course.',
    '    spa       40 slots ->    40 lines  (1x)  across 1 courses',
    '',
    'COURSE                          REL  VOICE   CLIPS    SERVING POD (tgt/known of slots)  BLOCKED ON',
    'spa_for_eng                     yes  tts     1234     pod-1 38/30 of 40               pod_target_track_incomplete',
    'cym_for_eng                     no   human   99       —                               ',
    '',
    'SEMANTICS — what these words mean here',
    '',
    'released:',
    '  Shipped to learners.',
    '',
  ].join('\n')
  assert.equal(estateMapAsText(payload), expected)
})
