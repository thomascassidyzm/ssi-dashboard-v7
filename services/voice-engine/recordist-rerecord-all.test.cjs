// Proves "Re-record all" archives a voice's takes (kept, never deleted), empties
// the slots that held them, and that restore puts both back. Runs against the
// live database INSIDE ONE TRANSACTION that is always rolled back, so nothing
// persists; skipped when no database URL is reachable.
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { databaseUrl } = require('../shared/round-index-refresh.cjs')
const { previewReset, applyReset, restoreReset, ARCHIVE_PREFIX } = require('./recordist-rerecord-all.cjs')
const setup = require('./recordist-setup-check.cjs')

let url = null
try { url = databaseUrl() } catch { /* no database here */ }

test('setup check: ten phrases spread by length, script locked until approved', () => {
  const lines = Array.from({ length: 40 }, (_, i) => ({ text: `Dyma frawddeg rhif ${i} ${'a'.repeat(i)}` }))
  const picked = setup.pickSetupPhrases(lines)
  assert.strictEqual(picked.length, 10)
  assert.ok(picked[0].text.length < picked[9].text.length)
  assert.strictEqual(setup.locksScript(null), false)
  for (const status of ['open', 'submitted', 'changes']) assert.strictEqual(setup.locksScript({ status }), true)
  assert.strictEqual(setup.locksScript({ status: 'approved' }), false)
})

test('setup check: only a full ten-phrase sample may be created (3-9 refused)', () => {
  for (const n of [0, 3, 9]) assert.strictEqual(setup.isFullSetupSample(Array.from({ length: n }, () => ({}))), false)
  assert.strictEqual(setup.isFullSetupSample(Array.from({ length: setup.SETUP_PHRASE_COUNT }, () => ({}))), true)
})

test('re-record all: archives takes, empties slots, restore undoes it', { skip: !url }, async () => {
  const { Client } = require('pg')
  const client = new Client({ connectionString: url })
  await client.connect()
  await client.query('begin')
  try {
    const sentence = (await client.query('select id, pod_id from listening_pod_sentences where target_audio_id is null limit 1')).rows[0]
    const course = (await client.query("select course_code from courses where course_code = 'cym_s_for_eng'")).rows[0]
    assert.ok(sentence && course, 'fixture rows exist')
    const voice = 'human_testreset838_cym_s'
    const clip = (await client.query(
      `insert into course_audio (course_code, text, text_normalized, language, role, voice_id, origin, s3_key)
       values ($1,'prawf','prawf','cym','target1',$2,'human','test/rerecord-all.mp3') returning id`, [course.course_code, voice])).rows[0]
    await client.query('update listening_pod_sentences set target_audio_id = $1 where id = $2', [clip.id, sentence.id])

    // the module's own begin/commit/rollback become savepoints inside our outer transaction
    const connect = async () => ({
      query: (sql, args) => {
        const m = { begin: 'savepoint rr', commit: 'release savepoint rr', rollback: 'rollback to savepoint rr' }[sql]
        return client.query(m || sql, args)
      },
      end: async () => {},
    })
    const args = { voiceId: voice, language: 'cym', spellings: [voice], connect }

    // a LEGO's presentation slot is a TEXT column holding the clip id (job #844)
    const lego = (await client.query('select id from course_legos where presentation_audio_id is null limit 1')).rows[0]
    assert.ok(lego, 'fixture lego exists')
    await client.query('update course_legos set presentation_audio_id = $1 where id = $2', [String(clip.id), lego.id])

    const pre = await previewReset(args)
    assert.strictEqual(pre.slots['course_legos.presentation_audio_id'], 1)
    assert.strictEqual(pre.clips, 1)
    assert.strictEqual(pre.slots['listening_pod_sentences.target_audio_id'], 1)

    const done = await applyReset({ ...args, actor: 'test' })
    assert.strictEqual(done.archived, 1)
    const after = (await client.query('select voice_id, s3_key from course_audio where id = $1', [clip.id])).rows[0]
    assert.ok(after.voice_id.startsWith(ARCHIVE_PREFIX), 'clip kept, voice archived')
    assert.strictEqual(after.s3_key, 'test/rerecord-all.mp3')
    assert.strictEqual((await client.query('select target_audio_id from listening_pod_sentences where id = $1', [sentence.id])).rows[0].target_audio_id, null)
    assert.strictEqual((await client.query('select presentation_audio_id from course_legos where id = $1', [lego.id])).rows[0].presentation_audio_id, null, 'lego presentation slot emptied')
    assert.strictEqual((await previewReset(args)).clips, 0, 'the artist now has nothing recorded')

    const back = await restoreReset({ resetId: done.resetId, actor: 'test', connect })
    assert.strictEqual(back.restored, 1)
    assert.strictEqual((await client.query('select voice_id from course_audio where id = $1', [clip.id])).rows[0].voice_id, voice)
    assert.strictEqual((await client.query('select target_audio_id from listening_pod_sentences where id = $1', [sentence.id])).rows[0].target_audio_id, clip.id)
    assert.strictEqual((await client.query('select presentation_audio_id from course_legos where id = $1', [lego.id])).rows[0].presentation_audio_id, String(clip.id), 'lego presentation slot restored')
  } finally {
    await client.query('rollback')
    await client.end()
  }
})
