/**
 * Lane review #81·K: a recut must never reuse an id or write onto an S3 key, because /api/audio/<id> is cached
 * a year as immutable. Run: node --test tools/guess/cut-register.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerCut } from './cut-register.mjs'

function fakes() {
  const rows = [], puts = []
  const pg = { async query(sql, args) {
    if (sql.startsWith('select')) return { rows: rows.filter((r) => r.course_code === args[0] && r.voice_id === args[1] && r.language === args[2] && r.text === args[3]) }
    rows.push({ id: args[0], course_code: args[1], text: args[2], language: args[3], voice_id: args[5], s3_key: args[7] }); return { rows: [] }
  } }
  const put = async (key) => { assert.ok(!puts.includes(key), `wrote onto existing key ${key}`); puts.push(key) }
  return { pg, put, rows, puts }
}
const take = { course_code: 'zho_for_eng', language: 'zho', voice_id: 'v', origin: 'tts' }

test('a recut with different bytes gets a new id and a new key; the old object is never written again', async () => {
  const f = fakes()
  const a = await registerCut(f.pg, f.put, take, '我', Buffer.from('cut one'), 200)
  const b = await registerCut(f.pg, f.put, take, '我', Buffer.from('cut two'), 210)
  assert.notEqual(a.id, b.id)
  assert.equal(f.puts.length, 2)
  assert.notEqual(f.rows[0].s3_key, f.rows[1].s3_key)
})

test('the same bytes again reuse their row and upload nothing', async () => {
  const f = fakes()
  const a = await registerCut(f.pg, f.put, take, '我', Buffer.from('cut one'), 200)
  const b = await registerCut(f.pg, f.put, take, '我', Buffer.from('cut one'), 200)
  assert.equal(a.id, b.id)
  assert.equal(b.reused, true)
  assert.equal(f.puts.length, 1)
})
