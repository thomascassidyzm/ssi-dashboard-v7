// Job #885 (Tom 2026-10-07): an artist can Re-record all on their OWN voice
// through the same POST route the admin button uses, via {"asArtist": true}.
// Proves: no admin token + no flag = refused (the old behaviour); the flag
// works without admin, needs confirm, and resets only the voice in the URL.
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const express = require('express')

const queue = require('./recordist-queue.cjs')
const rerecordAll = require('./recordist-rerecord-all.cjs')
queue.resolveRecordist = async (_db, id) =>
  id === 'human_dan_cym_s' ? { voiceId: id, language: 'cym', spellings: [id, 'dan_cym_s'] } : null
const calls = []
let liveFor = []
rerecordAll.liveCoursesForVoice = async () => liveFor
rerecordAll.applyReset = async (a) => { calls.push(a); return { resetId: 'r1', archived: 3, slotsEmptied: 3 } }
const createRecordistRouter = require('./recordist-router.cjs')

async function post(voice, body) {
  liveFor = body.__live || []; delete body.__live
  const app = express()
  app.use(express.json())
  app.use('/api/recording', createRecordistRouter({
    getDb: () => ({}), logger: { log() {}, error() {}, warn() {} },
    requireAdmin: async (_req, res) => { res.status(401).json({ error: 'Authentication required' }); return null },
  }))
  const server = app.listen(0)
  try {
    const r = await fetch(`http://127.0.0.1:${server.address().port}/api/recording/voice/${voice}/rerecord-all`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    return { status: r.status, json: await r.json() }
  } finally { server.close() }
}

test('without asArtist the admin gate still refuses', async () => {
  calls.length = 0
  assert.strictEqual((await post('human_dan_cym_s', { confirm: true })).status, 401)
  assert.strictEqual(calls.length, 0)
})

test('asArtist resets the artist\'s own voice, attributed to them, no admin needed', async () => {
  calls.length = 0
  const r = await post('human_dan_cym_s', { confirm: true, asArtist: true })
  assert.strictEqual(r.status, 200)
  assert.strictEqual(r.json.archived, 3)
  assert.strictEqual(calls.length, 1)
  assert.strictEqual(calls[0].voiceId, 'human_dan_cym_s')
  assert.strictEqual(calls[0].actor, 'artist:human_dan_cym_s')
})

test('asArtist still needs confirm, and an unknown voice is 404', async () => {
  calls.length = 0
  assert.strictEqual((await post('human_dan_cym_s', { asArtist: true })).status, 400)
  assert.strictEqual((await post('human_nobody_cym_s', { confirm: true, asArtist: true })).status, 404)
  assert.strictEqual(calls.length, 0)
})

test('SECURITY #887: anonymous asArtist on a voice live to learners is refused, nothing archived', async () => {
  calls.length = 0
  const r = await post('human_dan_cym_s', { confirm: true, asArtist: true, __live: ['cym_s_for_eng'] })
  assert.strictEqual(r.status, 403)
  assert.match(r.json.error, /live to learners; ask an admin/)
  assert.strictEqual(calls.length, 0)
})
