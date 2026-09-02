/**
 * recordist-text-edit.test.cjs — the gate on rewriting a line's text.
 *
 * Tom, 2026-09-02: "it is a TEST course so it can have any rules we like", so
 * the booth may rewrite a zzz_ line in place. The thing worth testing is not
 * that the edit works — it is that it CANNOT REACH A LIVE COURSE. Editing live
 * pod text in place breaks the content-change migration protocol silently:
 * learner progress is filed under a sentence's slot, so the learner is credited
 * with a sentence they never heard, with no error and nothing in a log.
 *
 * The route has no login by design (link is identity), so this gate is the only
 * thing standing between a shared link and Catrin's Welsh course.
 */

'use strict'

const test = require('node:test')
const assert = require('node:assert')
const createRecordistRouter = require('./recordist-router.cjs')
const { isTestFixtureCourse } = require('./recordist-queue.cjs')

test('the test-fixture gate names zzz_ courses and nothing else', () => {
  assert.equal(isTestFixtureCourse('zzz_test2_for_eng'), true)
  assert.equal(isTestFixtureCourse('zzz_test_for_eng'), true)
  for (const live of ['cym_n_for_eng', 'cym_s_for_eng', 'fra_for_eng', 'eng_for_hin', '', null, undefined, 'my_zzz_course']) {
    assert.equal(isTestFixtureCourse(live), false, `${live} must never be editable from the booth`)
  }
})

const POLICY = [
  {
    language: 'cym',
    human_only: true,
    voices: { m: { name: 'Aran', email: 'aran@hey.com', voiceId: 'human_aran_cym_n' } },
  },
  {
    language: 'zzz',
    human_only: true,
    voices: { m: { name: 'Tom', email: 'tom@saysomethingin.com', voiceId: 'human_tom_zzz' } },
  },
]

function stubDb(updates) {
  const tables = {
    language_recording_policy: POLICY,
    courses: [
      { course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', voice_config: {}, dialect: 'north' },
      { course_code: 'zzz_test2_for_eng', target_lang: 'zzz', known_lang: 'eng', dialect: 'standard',
        voice_config: { podCast: { Customer: { gender: 'm', voiceId: 'human_tom_zzz', name: 'Tom', email: 'tom@saysomethingin.com' } } } },
    ],
    listening_pods: [
      { id: 'cym_n_for_eng:pod-0', course_code: 'cym_n_for_eng' },
      { id: 'zzz_test2_for_eng:pod-0', course_code: 'zzz_test2_for_eng' },
    ],
    listening_pod_sentences: [
      { id: 'LIVE', pod_id: 'cym_n_for_eng:pod-0', global_order: 1, speaker: 'Sarah', target_text: 'Bore da.', known_text: 'Good morning.', target_audio_id: null, rerecord_wanted: null },
      { id: 'TEST', pod_id: 'zzz_test2_for_eng:pod-0', global_order: 1, speaker: 'Customer', target_text: 'A coffee, please.', known_text: 'A coffee, please.', target_audio_id: null, rerecord_wanted: null },
    ],
    course_audio: [],
  }
  return {
    from(table) {
      let rows = (tables[table] || []).slice()
      const q = {
        select() { return q },
        eq(col, val) { rows = rows.filter((r) => r[col] === val); return q },
        in(col, vals) { rows = rows.filter((r) => vals.includes(r[col])); return q },
        not(col, op, val) { if (op === 'is' && val === null) rows = rows.filter((r) => r[col] != null); return q },
        order() { return q },
        limit(n) { return Promise.resolve({ data: rows.slice(0, n), error: null }) },
        range(from, to) { return Promise.resolve({ data: rows.slice(from, to + 1), error: null }) },
        maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }) },
        update(patch) { updates.push({ table, patch }); return q },
        then(resolve, reject) { return Promise.resolve({ data: rows, error: null }).then(resolve, reject) },
      }
      return q
    },
  }
}

function handler(updates) {
  const router = createRecordistRouter({
    getDb: () => stubDb(updates),
    logger: { log() {}, info() {}, error() {} },
    s3: {},
  })
  const layer = router.stack.find((l) => l.route && l.route.path === '/voice/:voiceId/line/:lineId/text')
  return layer.route.stack[0].handle
}

function mockRes() {
  const out = {}
  const res = {
    status(c) { out.status = c; return res },
    json(b) { out.body = b; out.resolve(out); return res },
  }
  out.settled = new Promise((r) => { out.resolve = r })
  return { res, out }
}

async function call({ voiceId, lineId, text }) {
  const updates = []
  const { res, out } = mockRes()
  await handler(updates)({ params: { voiceId, lineId }, body: { text }, query: {} }, res)
  return { ...out, updates }
}

test('a LIVE course line is refused, and nothing is written', async () => {
  const r = await call({ voiceId: 'human_aran_cym_n', lineId: 'LIVE', text: 'Prynhawn da.' })
  assert.equal(r.status, 403)
  assert.equal(r.body.reason, 'live_course')
  assert.match(r.body.error, /migration protocol/)
  assert.deepEqual(r.updates, [], 'a refused edit must not touch the database at all')
})

test('a TEST fixture line is rewritten, and the known crib follows it', async () => {
  const r = await call({ voiceId: 'human_tom_zzz', lineId: 'TEST', text: 'A tea, please.' })
  assert.equal(r.status, undefined, 'a 200 sets no explicit status')
  assert.equal(r.body.ok, true)
  assert.equal(r.body.text, 'A tea, please.')
  assert.equal(r.body.recorded, false, 'new text has no take — the line is outstanding again')
  assert.equal(r.body.previousText, 'A coffee, please.')
  assert.deepEqual(r.updates, [{ table: 'listening_pod_sentences', patch: { target_text: 'A tea, please.', known_text: 'A tea, please.' } }])
})

test('empty text is refused before anything is looked up', async () => {
  const r = await call({ voiceId: 'human_tom_zzz', lineId: 'TEST', text: '   ' })
  assert.equal(r.status, 400)
  assert.equal(r.body.reason, 'empty')
  assert.deepEqual(r.updates, [])
})
