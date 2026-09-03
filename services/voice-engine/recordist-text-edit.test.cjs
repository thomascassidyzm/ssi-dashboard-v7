/**
 * recordist-text-edit.test.cjs — rewriting a line's text from the booth.
 *
 * Tom, 2026-09-03: Aran is recording Welsh and could not fix a wrong line before
 * reading it. "build it and enable it so it's DELIGHTFUL to use." So a POD LINE
 * IS EDITABLE ON A LIVE COURSE — the two people best placed to catch a wrong
 * Welsh line are the two Welsh speakers reading it aloud.
 *
 * THE RULE THIS FILE EXISTS TO HOLD IS THE INVALIDATION RULE. Changing the text
 * changes the course, so any take of that line now says the wrong words:
 *
 *   1. the line reads as OUTSTANDING the instant the text changes — proved on
 *      the SERVER's own answer, not on the screen's optimism, and
 *   2. the slot is UNLINKED, so no learner is served yesterday's words under
 *      today's sentence. Nothing is DELETED: the clip keeps its bytes and its
 *      provenance, filed under the words it actually says. The alternative to
 *      unlinking here is not a working clip, it is a wrong one. And
 *   3. the learner's progress on that slot goes, because new words in an old
 *      slot is a NEW sentence (pod-migration-protocol rule 6) and a new
 *      sentence arrives UNSEEN (rule 4). Crediting somebody for the unheard is
 *      the harm the protocol exists to avoid.
 *
 * And the things that are still refused: a SEED sentence and a QUARRY piece are
 * course content whose LEGOs must recompose them, and somebody else's line is
 * not yours to rewrite. The route has no login by design (link is identity), so
 * these gates are the only thing standing between a shared link and the course.
 */

'use strict'

const test = require('node:test')
const assert = require('node:assert')
const createRecordistRouter = require('./recordist-router.cjs')
const { isTestFixtureCourse } = require('./recordist-queue.cjs')

test('the test-fixture gate still names zzz_ courses and nothing else', () => {
  // Kept because the known-side and minimal-set exceptions still hang off it.
  // It is NO LONGER the editability gate: Tom's 2026-09-03 ruling opened a live
  // pod line to the artist reading it.
  assert.equal(isTestFixtureCourse('zzz_test2_for_eng'), true)
  assert.equal(isTestFixtureCourse('zzz_test_for_eng'), true)
  for (const live of ['cym_n_for_eng', 'cym_s_for_eng', 'fra_for_eng', 'eng_for_hin', '', null, undefined, 'my_zzz_course']) {
    assert.equal(isTestFixtureCourse(live), false)
  }
})

const POLICY = [
  {
    language: 'cym',
    human_only: true,
    voices: { 'm:north': { name: 'Aran', email: 'aran@hey.com', voiceId: 'human_aran_cym_n', dialect: 'north' } },
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
      { course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', dialect: 'north',
        voice_config: { podCast: { Aled: { gender: 'm', voiceId: 'human_aran_cym_n', name: 'Aran', email: 'aran@hey.com' } } } },
      { course_code: 'zzz_test2_for_eng', target_lang: 'zzz', known_lang: 'eng', dialect: 'standard',
        voice_config: { podCast: { Customer: { gender: 'm', voiceId: 'human_tom_zzz', name: 'Tom', email: 'tom@saysomethingin.com' } } } },
    ],
    listening_pods: [
      { id: 'cym_n_for_eng:pod-0', course_code: 'cym_n_for_eng' },
      { id: 'zzz_test2_for_eng:pod-0', course_code: 'zzz_test2_for_eng' },
    ],
    listening_pod_sentences: [
      { id: 'LIVE', pod_id: 'cym_n_for_eng:pod-0', global_order: 1, speaker: 'Aled', target_text: 'Bore da.', known_text: 'Good morning.', target_audio_id: 'clip-1', rerecord_wanted: null },
      // The SAME words, further down the pod. The queue collapses these into one
      // line to read, and the roster says so out loud, so an edit has to move
      // both or the artist gets handed back a line they thought they had fixed.
      { id: 'LIVE-DUP', pod_id: 'cym_n_for_eng:pod-0', global_order: 9, speaker: 'Aled', target_text: 'Bore da.', known_text: 'Good morning.', target_audio_id: 'clip-1', rerecord_wanted: null },
      { id: 'TEST', pod_id: 'zzz_test2_for_eng:pod-0', global_order: 1, speaker: 'Customer', target_text: 'A coffee, please.', known_text: 'A coffee, please.', target_audio_id: null, rerecord_wanted: null },
    ],
    course_audio: [
      { id: 'clip-1', voice_id: 'human_aran_cym_n', s3_key: 'k1', text_normalized: 'bore da.', language: 'cym' },
    ],
    learner_pod_state: [
      { learner_id: 'L1', course_code: 'cym_n_for_eng', sentence_id: 'LIVE', exposures: 4 },
      { learner_id: 'L1', course_code: 'cym_n_for_eng', sentence_id: 'LIVE-DUP', exposures: 2 },
      { learner_id: 'L2', course_code: 'cym_n_for_eng', sentence_id: 'OTHER', exposures: 7 },
    ],
  }
  return {
    from(table) {
      let rows = (tables[table] || []).slice()
      // 'read' | 'update' | 'delete' — a write records WHICH rows it hit, which
      // is the whole point of the duplicate and the progress tests.
      let op = 'read'
      let patch = null
      const q = {
        select() { return q },
        eq(col, val) { rows = rows.filter((r) => r[col] === val); return q },
        in(col, vals) { rows = rows.filter((r) => vals.includes(r[col])); return q },
        not(col, op2, val) { if (op2 === 'is' && val === null) rows = rows.filter((r) => r[col] != null); return q },
        order() { return q },
        limit(n) { return Promise.resolve({ data: rows.slice(0, n), error: null }) },
        range(from, to) { return Promise.resolve({ data: rows.slice(from, to + 1), error: null }) },
        maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }) },
        update(p) { op = 'update'; patch = p; return q },
        delete() { op = 'delete'; return q },
        then(resolve, reject) {
          if (op !== 'read') {
            updates.push({ table, op, patch, ids: rows.map((r) => r.id ?? r.sentence_id) })
          }
          return Promise.resolve({ data: rows, error: null, count: rows.length }).then(resolve, reject)
        },
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

test('a live pod line IS rewritten -- Tom, 2026-09-03', async () => {
  const r = await call({ voiceId: 'human_aran_cym_n', lineId: 'LIVE', text: 'Prynhawn da.' })
  assert.equal(r.status, undefined, 'a 200 sets no explicit status')
  assert.equal(r.body.ok, true)
  assert.equal(r.body.text, 'Prynhawn da.')
  assert.equal(r.body.previousText, 'Bore da.')
  assert.equal(r.body.courseCode, 'cym_n_for_eng')
})

// ── THE INVALIDATION RULE ────────────────────────────────────────────────────

test('an edit puts the line back in the queue -- new words have no take', async () => {
  const r = await call({ voiceId: 'human_aran_cym_n', lineId: 'LIVE', text: 'Prynhawn da.' })
  assert.equal(r.body.recorded, false,
    'the whole point: the take that line had says the wrong words now, so the line is outstanding again')
})

test('an edit unlinks the take, so the wrong words are never served', async () => {
  const r = await call({ voiceId: 'human_aran_cym_n', lineId: 'LIVE', text: 'Prynhawn da.' })
  const patch = r.updates.find((u) => u.table === 'listening_pod_sentences').patch
  // THE REGRESSION THIS HOLDS. A filled slot counts as a take whatever the text
  // says (06189d68c), so leaving the FK behind left the queue answering
  // recorded:true and still handing out the old clip's URL after an edit —
  // observed in a browser on 2026-09-03 before this line existed.
  assert.equal(patch.target_audio_id, null, 'the take goes with the words')
  assert.equal(r.body.unlinkedAudioId, 'clip-1', 'and the caller is told which clip it was')
})

test('an edit deletes no audio -- the clip keeps its bytes and its provenance', async () => {
  const r = await call({ voiceId: 'human_aran_cym_n', lineId: 'LIVE', text: 'Prynhawn da.' })
  const touchedAudio = r.updates.filter((u) => u.table === 'course_audio')
  assert.deepEqual(touchedAudio, [],
    'unlinking is not deleting: the take is still findable under the words it actually says')
})

test("an edit drops the learner's progress on that slot, and only that slot", async () => {
  const r = await call({ voiceId: 'human_aran_cym_n', lineId: 'LIVE', text: 'Prynhawn da.' })
  const drops = r.updates.filter((u) => u.table === 'learner_pod_state' && u.op === 'delete')
  assert.equal(drops.length, 1, 'exactly one progress migration, in the same call as the content change')
  // New words in an old slot is a NEW sentence (protocol rule 6) and a new
  // sentence arrives UNSEEN (rule 4). Leaving the row alone IS the mis-credit.
  assert.deepEqual(drops[0].ids.sort(), ['LIVE', 'LIVE-DUP'])
  assert.equal(r.body.progressDropped, 2)
  assert.ok(!drops[0].ids.includes('OTHER'), "another sentence's progress is untouched")
})

test('a refused edit migrates no progress and writes nothing', async () => {
  const r = await call({ voiceId: 'human_aran_cym_n', lineId: 'seed:1:target1', text: 'Prynhawn da.' })
  assert.equal(r.status, 403)
  assert.deepEqual(r.updates, [], 'a refused edit must not touch the database at all')
})

// ── ONE LINE ON SCREEN IS ONE LINE IN THE COURSE ─────────────────────────────

test('collapsed duplicates move with the line the artist edited', async () => {
  const r = await call({ voiceId: 'human_aran_cym_n', lineId: 'LIVE', text: 'Prynhawn da.' })
  const writes = r.updates.filter((u) => u.table === 'listening_pod_sentences' && u.op === 'update')
  assert.equal(writes.length, 1)
  assert.deepEqual(writes[0].ids.sort(), ['LIVE', 'LIVE-DUP'],
    'the queue showed one line and the artist meant one line -- both rows move or the collapse splits in two')
  assert.equal(r.body.alsoChanged, 1, 'and the screen is told, so it can say so in one short line')
})

test('a live pod leaves the English crib alone', async () => {
  const r = await call({ voiceId: 'human_aran_cym_n', lineId: 'LIVE', text: 'Prynhawn da.' })
  const patch = r.updates.find((u) => u.table === 'listening_pod_sentences').patch
  // The draft/approval fields come from buildSentenceEditPatch, shared with the
  // pods surface: a human editing the line IS the proofread, and a verdict about
  // the old words must not outlive them.
  assert.deepEqual(patch, {
    target_text: 'Prynhawn da.',
    target_audio_id: null,
    target_text_draft: false,
    target_text_approved_at: null,
    target_text_approved_by: null,
    target_text_review: null,
  })
  assert.equal(r.body.knownText, 'Good morning.', 'the known side is a real translation and is not ours to rewrite')
})

test('a TEST fixture line is rewritten, and the known crib follows it', async () => {
  const r = await call({ voiceId: 'human_tom_zzz', lineId: 'TEST', text: 'A tea, please.' })
  assert.equal(r.status, undefined)
  assert.equal(r.body.ok, true)
  assert.equal(r.body.text, 'A tea, please.')
  assert.equal(r.body.recorded, false, 'new text has no take -- the line is outstanding again')
  assert.equal(r.body.previousText, 'A coffee, please.')
  const patch = r.updates.find((u) => u.table === 'listening_pod_sentences').patch
  assert.deepEqual(patch, {
    target_text: 'A tea, please.',
    target_audio_id: null,
    target_text_draft: false,
    target_text_approved_at: null,
    target_text_approved_by: null,
    target_text_review: null,
    known_text: 'A tea, please.',
    // The crib's own clip goes with the crib's own words, for exactly the
    // reason the target clip goes with the target words.
    known_audio_id: null,
  })
})

// ── WHAT IS STILL REFUSED ────────────────────────────────────────────────────

test('a SEED sentence is refused -- its LEGOs have to recompose it', async () => {
  const r = await call({ voiceId: 'human_aran_cym_n', lineId: 'seed:1:target1', text: 'Prynhawn da.' })
  assert.equal(r.status, 403)
  assert.equal(r.body.reason, 'seed_line')
  assert.deepEqual(r.updates, [])
})

test("somebody else's line is refused", async () => {
  const r = await call({ voiceId: 'human_tom_zzz', lineId: 'LIVE', text: 'Prynhawn da.' })
  assert.equal(r.status, 403)
  assert.deepEqual(r.updates, [])
})

test('empty text is refused before anything is looked up', async () => {
  const r = await call({ voiceId: 'human_tom_zzz', lineId: 'TEST', text: '   ' })
  assert.equal(r.status, 400)
  assert.equal(r.body.reason, 'empty')
  assert.deepEqual(r.updates, [])
})

test('a line too long to read in one take is refused', async () => {
  const r = await call({ voiceId: 'human_tom_zzz', lineId: 'TEST', text: 'a'.repeat(601) })
  assert.equal(r.status, 400)
  assert.equal(r.body.reason, 'too_long')
  assert.deepEqual(r.updates, [])
})
