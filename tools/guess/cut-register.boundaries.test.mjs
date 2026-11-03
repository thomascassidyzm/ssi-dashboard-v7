import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cutLabel, registerCut } from './cut-register.mjs'

const take = { course_code: "course'--", voice_id: "voice'--", language: "lang'--", origin: 'tts' }
const text = "quote'); DROP TABLE course_audio; --"
const bytes = Buffer.from('offline audio fixture')
const id = 'abcdefab-1234-4567-8901-abcdefabcdef'

test('lookup binds caller values and a hit bypasses ID generation and upload', async () => {
  const pg = { async query(sql, args) {
    for (const value of [take.course_code, take.voice_id, take.language, text]) {
      assert.ok(!sql.includes(value))
    }
    assert.match(sql, /role = 'pod_atom'/)
    assert.deepEqual(args, [take.course_code, take.voice_id, take.language, cutLabel(text, bytes)])
    return { rows: [{ id }] }
  } }
  const unexpected = () => assert.fail('reuse crossed a write dependency boundary')
  assert.deepEqual(await registerCut(pg, unexpected, take, text, bytes, 200, unexpected),
    { id, ms: 200, reused: true })
})

test('a miss awaits upload before binding insertion values, preserving the audio bytes', async () => {
  const calls = []
  let finishUpload
  const pg = { async query(sql, args) {
    calls.push(sql.startsWith('select') ? 'lookup' : 'insert')
    if (sql.startsWith('select')) return { rows: [] }
    assert.ok(!sql.includes(text))
    assert.deepEqual(args, [id, take.course_code, cutLabel(text, bytes), take.language,
      'pod_atom', take.voice_id, take.origin, `mastered/${id.toUpperCase()}.mp3`, 200, bytes.length])
    return { rows: [] }
  } }
  const pending = registerCut(pg, async (key, body) => {
    calls.push('upload')
    assert.equal(key, `mastered/${id.toUpperCase()}.mp3`)
    assert.strictEqual(body, bytes)
    await new Promise((resolve) => { finishUpload = resolve })
  }, take, text, bytes, 200, () => { calls.push('id'); return id })
  // The lookup promise resolves before this continuation; upload is still pending.
  await Promise.resolve()
  assert.deepEqual(calls, ['lookup', 'id', 'upload'])
  finishUpload()
  assert.deepEqual(await pending, { id, ms: 200, reused: false })
  assert.deepEqual(calls, ['lookup', 'id', 'upload', 'insert'])
})

test('lookup and upload failures propagate without reaching later dependencies', async () => {
  for (const stage of ['lookup', 'upload']) {
    const failure = new Error(`${stage} failed`)
    const calls = []
    const pg = { async query() {
      calls.push('lookup')
      if (stage === 'lookup') throw failure
      return { rows: [] }
    } }
    await assert.rejects(registerCut(pg, async () => {
      calls.push('upload')
      throw failure
    }, take, text, bytes, 200, () => { calls.push('id'); return id }),
    (error) => error === failure)
    assert.deepEqual(calls, stage === 'lookup' ? ['lookup'] : ['lookup', 'id', 'upload'])
  }
})

test('insert failure propagates after upload, with no retry or compensating operation', async () => {
  const failure = new Error('insert failed')
  const calls = []
  const pg = { async query(sql) {
    if (sql.startsWith('select')) { calls.push('lookup'); return { rows: [] } }
    calls.push('insert')
    throw failure
  } }
  await assert.rejects(registerCut(pg, async () => { calls.push('upload') },
    take, text, bytes, 200, () => id), (error) => error === failure)
  assert.deepEqual(calls, ['lookup', 'upload', 'insert'])
})
