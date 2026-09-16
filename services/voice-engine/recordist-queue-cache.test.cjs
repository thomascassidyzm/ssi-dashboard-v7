/**
 * recordist-queue-cache.test.cjs — the recordist queue's cache is never
 * allowed to outlive its own writes.
 *
 * buildLanguageLines is now cached in-process, keyed by the `db` client
 * instance (recordist-queue-cache.cjs) — which is how production's memoized
 * singleton client gets ONE cache for the process, while a fresh stub per
 * test gets its own. This file's whole job is proving the one guarantee that
 * makes the cache safe to have added: a write THIS PROCESS makes is never
 * served stale by a later read on the SAME db client.
 */

'use strict'

const test = require('node:test')
const assert = require('node:assert')
const createRecordistRouter = require('./recordist-router.cjs')
const { resolveRecordist, buildQueue, invalidateLanguageQueueCache } = require('./recordist-queue.cjs')

function fixtureTables() {
  return {
    language_recording_policy: [
      {
        language: 'cym',
        human_only: true,
        voices: { 'm:north': { name: 'Aran', email: 'aran@hey.com', voiceId: 'human_aran_cym_n', dialect: 'north' } },
      },
    ],
    courses: [
      {
        course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', dialect: 'north',
        voice_config: { podCast: { Aled: { gender: 'm', voiceId: 'human_aran_cym_n', name: 'Aran' } } },
      },
    ],
    listening_pods: [{ id: 'pod-1', course_code: 'cym_n_for_eng' }],
    listening_pod_sentences: [
      { id: 'LIVE', pod_id: 'pod-1', global_order: 1, speaker: 'Aled', target_text: 'Bore da.', known_text: 'Good morning.', target_audio_id: null, rerecord_wanted: null },
    ],
    course_audio: [],
  }
}

/** A SINGLE stub client, reused for every `db()` call — production's shape. */
function singletonStubDb(tables) {
  return {
    from(table) {
      let rows = (tables[table] || []).slice()
      let op = 'read', patch = null
      const q = {
        select() { return q },
        eq(col, val) { rows = rows.filter((r) => r[col] === val); return q },
        in(col, vals) { rows = rows.filter((r) => vals.includes(r[col])); return q },
        not(col, op2, val) { if (op2 === 'is' && val === null) rows = rows.filter((r) => r[col] != null); return q },
        order() { return q },
        limit(n) { return Promise.resolve({ data: rows.slice(0, n), error: null }) },
        range(from, to) { return Promise.resolve({ data: rows.slice(from, to + 1), error: null }) },
        maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }) },
        update(p) {
          op = 'update'; patch = p
          // Applied to the LIVE `tables` store, so a second `.from()` call —
          // even on a fresh `q` — sees the write. This is what a real
          // Supabase client does and what makes the staleness bug reachable.
          for (const r of tables[table] || []) {
            if (rows.includes(r)) Object.assign(r, patch)
          }
          return q
        },
        single() { return Promise.resolve({ data: rows[0] || null, error: null }) },
        then(resolve, reject) { return Promise.resolve({ data: rows, error: null }).then(resolve, reject) },
      }
      return q
    },
  }
}

test('a PATCH followed by a queue read returns the new text', async () => {
  invalidateLanguageQueueCache() // isolate from any earlier test's cache entries
  const tables = fixtureTables()
  const db = singletonStubDb(tables)
  const router = createRecordistRouter({ getDb: () => db, logger: { log() {}, info() {}, error() {} }, s3: {} })
  const textHandler = router.stack.find((l) => l.route && l.route.path === '/voice/:voiceId/line/:lineId/text').route.stack[0].handle

  // 1. Warm the cache exactly as the booth's first load would.
  const recordist = await resolveRecordist(db, 'human_aran_cym_n')
  const before = await buildQueue(db, recordist)
  assert.equal(before.lines[0].text, 'Bore da.', 'sanity: the line reads its original words before any edit')

  // 2. PATCH the line's text through the real route — the write path a
  //    recordist's own edit takes.
  const res = { status(c) { this._status = c; return this }, json(b) { this.body = b; return this } }
  await textHandler({ params: { voiceId: 'human_aran_cym_n', lineId: 'LIVE' }, body: { text: 'Prynhawn da.' }, query: {} }, res)
  assert.equal(res.body.ok, true, `PATCH should succeed: ${JSON.stringify(res.body)}`)

  // 3. THE ASSERTION THIS FILE EXISTS FOR: a queue read on the SAME db client,
  //    immediately after, sees the new words — never the cached pre-edit read.
  const after = await buildQueue(db, recordist)
  assert.equal(after.lines[0].text, 'Prynhawn da.', 'the queue must never serve a row older than the last write')
})
