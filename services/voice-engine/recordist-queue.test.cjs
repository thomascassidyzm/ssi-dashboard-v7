/**
 * recordist-queue.test.cjs — the queue derivation, over a stub db.
 *
 * These cover the four rules that decide whether a recordist is asked to read
 * the right thing: by-LANGUAGE not by-course, gender from the course's own
 * cast, collapse by clip identity, and recorded-under-ANY-spelling. The last
 * one is the reason Aran keeps his 111 Welsh takes instead of being asked to
 * read 42 of them again.
 */

'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { buildQueue, resolveRecordist, recordedSpellings } = require('./recordist-queue.cjs')

/** Minimal PostgREST-shaped stub: only the calls this module actually makes. */
function stubDb(tables) {
  return {
    from(table) {
      let rows = (tables[table] || []).slice()
      const q = {
        select() { return q },
        eq(col, val) { rows = rows.filter((r) => r[col] === val); return q },
        in(col, vals) { rows = rows.filter((r) => vals.includes(r[col])); return q },
        order() { return q },
        range(from, to) { return Promise.resolve({ data: rows.slice(from, to + 1), error: null }) },
        maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }) },
        then(resolve, reject) { return Promise.resolve({ data: rows, error: null }).then(resolve, reject) },
      }
      return q
    },
  }
}

const CAST = {
  podCast: {
    Aran: { name: 'Aran', gender: 'm', voiceId: 'human_aran_cym_n' },
    Catrin: { name: 'Catrin', gender: 'f', voiceId: 'human_catrinlliar_cym_n' },
    Ghost: { name: 'Uncast', voiceId: 'human_ghost' },   // no gender on purpose
  },
}

function fixture({ audio = [] } = {}) {
  return {
    language_recording_policy: [{
      language: 'cym',
      human_only: true,
      voices: {
        m: { name: 'Aran', email: 'aran@hey.com', voiceId: 'human_aran_cym_n' },
        f: { name: 'Catrin', email: 'c@x.com', voiceId: 'human_catrinlliar_cym_n' },
      },
    }],
    courses: [
      { course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', voice_config: { ...CAST, podCastAliases: { human_aran_cym_n: ['human_aran_cym_n_2'] } } },
      { course_code: 'cym_s_for_eng', target_lang: 'cym', known_lang: 'eng', voice_config: CAST },
      { course_code: 'fra_for_eng', target_lang: 'fra', known_lang: 'eng', voice_config: CAST },
    ],
    listening_pods: [
      { id: 'p_n', course_code: 'cym_n_for_eng', slug: 'pod-0' },
      { id: 'p_s', course_code: 'cym_s_for_eng', slug: 'pod-0' },
      { id: 'p_f', course_code: 'fra_for_eng', slug: 'pod-0' },
    ],
    listening_pod_sentences: [
      { id: 's1', pod_id: 'p_n', global_order: 1, speaker: 'Aran', target_text: 'Bore da.', known_text: 'Good morning.' },
      { id: 's2', pod_id: 'p_n', global_order: 2, speaker: 'Catrin', target_text: 'Sut wyt ti?', known_text: 'How are you?' },
      { id: 's3', pod_id: 'p_n', global_order: 3, speaker: 'Ghost', target_text: 'Dim byd.', known_text: 'Nothing.' },
      // Same line as s1, another course — ONE recording, not two.
      { id: 's4', pod_id: 'p_s', global_order: 1, speaker: 'Aran', target_text: 'Bore da!', known_text: 'Good morning.' },
      { id: 's5', pod_id: 'p_s', global_order: 2, speaker: 'Aran', target_text: 'Nos da.', known_text: 'Good night.' },
      // French: a different language entirely, never in a Welsh queue.
      { id: 's6', pod_id: 'p_f', global_order: 1, speaker: 'Aran', target_text: 'Bonjour.', known_text: 'Hello.' },
    ],
    course_audio: audio,
  }
}

test('the queue spans every course of the language and no other language', async () => {
  const db = stubDb(fixture())
  const aran = await resolveRecordist(db, 'human_aran_cym_n')
  const q = await buildQueue(db, aran, { includeRecorded: true })
  assert.deepEqual(q.courses.sort(), ['cym_n_for_eng', 'cym_s_for_eng'])
  assert.equal(q.lines.some((l) => l.text === 'Bonjour.'), false, 'French must never enter a Welsh queue')
  assert.deepEqual(q.lines.map((l) => l.text).sort(), ['Bore da.', 'Nos da.'])
})

test('gender comes from the course cast, and an uncast speaker is counted, not guessed', async () => {
  const db = stubDb(fixture())
  const catrin = await resolveRecordist(db, 'human_catrinlliar_cym_n')
  const q = await buildQueue(db, catrin, { includeRecorded: true })
  assert.deepEqual(q.lines.map((l) => l.text), ['Sut wyt ti?'])
  assert.equal(q.uncast, 1, 'the gender-less speaker is reported, not dropped in silence')
  const aran = await buildQueue(stubDb(fixture()), await resolveRecordist(stubDb(fixture()), 'human_aran_cym_n'), {})
  assert.equal(aran.uncast, 1, 'and it is reported to both queues, never assigned to one')
})

test('one recording per clip identity — the same line in two courses collapses', async () => {
  const db = stubDb(fixture())
  const aran = await resolveRecordist(db, 'human_aran_cym_n')
  const q = await buildQueue(db, aran, { includeRecorded: true })
  // 'Bore da.' and 'Bore da!' normalise to one key: one read fills both pods.
  assert.equal(q.duplicatesCollapsed, 1)
  assert.equal(q.lines.find((l) => l.text === 'Bore da.').alsoFills, 1)
})

test('a take recorded under an ALIAS spelling counts as recorded', async () => {
  const db = stubDb(fixture({
    audio: [{ language: 'cym', voice_id: 'human_aran_cym_n_2', text_normalized: 'bore da' }],
  }))
  const aran = await resolveRecordist(db, 'human_aran_cym_n')
  assert.ok(aran.spellings.includes('human_aran_cym_n_2'), 'aliases widen the read')
  const q = await buildQueue(db, aran, { includeRecorded: true })
  assert.equal(q.recorded, 1)
  assert.equal(q.lines.find((l) => l.text === 'Bore da.').recorded, true)
  const hidden = await buildQueue(db, aran, {})
  assert.deepEqual(hidden.lines.map((l) => l.text), ['Nos da.'], 'recorded lines are skipped by default')
})

test('an alias spelling in the link opens the canonical voice’s queue', async () => {
  const db = stubDb(fixture())
  const viaAlias = await resolveRecordist(db, 'human_aran_cym_n_2')
  assert.equal(viaAlias.voiceId, 'human_aran_cym_n')
  assert.equal(await resolveRecordist(db, 'human_nobody'), null)
})

test('recordedSpellings reaches canonical, alias and bare forms', () => {
  const spellings = recordedSpellings('human_aran_cym_n', new Map([['human_aran_cym_n', new Set(['human_aran_cym_n_2'])]]))
  assert.ok(spellings.includes('human_aran_cym_n'))
  assert.ok(spellings.includes('human_aran_cym_n_2'))
  assert.ok(spellings.includes('aran_cym_n'), 'the bare form is half the estate’s rows')
})
