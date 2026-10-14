// Job #371 (Aran 2026-10-14): artists must not see each other's work. GET
// /api/recording/voice/:voiceId/latest-takes lists and SIGNS a voice's takes, and it was
// link-is-identity, so swapping the voice id in a booth link handed anyone another artist's
// recordings. Proves: no sign-in = 401, an artist asking for ANOTHER artist's voice = 403 with
// nothing read, an artist asking for their OWN voice = 200, a God admin = 200 for anyone, and an
// admin who is not a God admin (Kai) is still refused another artist's takes.
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const express = require('express')
const createRecordistRouter = require('./recordist-router.cjs')
const { GOD_ADMIN_EMAILS } = require('./booth-god-admins.cjs')

const POLICY = [{
  language: 'cym',
  human_only: true,
  voices: {
    m: { name: 'Aran', email: 'aran@hey.com', voiceId: 'human_aran_cym_n' },
    'm:south': { name: 'Dan', email: 'dan@example.com', voiceId: 'human_dan_cym_s', dialect: 'south' },
  },
}]
const AUDIO = [
  { id: 'A1', voice_id: 'human_aran_cym_n', language: 'cym', course_code: 'cym_n_for_eng', role: 'target1', text: 'Bore da.', s3_key: 'mastered/A1.mp3', created_at: '2026-10-14T10:00:00Z' },
  { id: 'D1', voice_id: 'human_dan_cym_s', language: 'cym', course_code: 'cym_s_for_eng', role: 'target1', text: 'Shwmae.', s3_key: 'mastered/D1.mp3', created_at: '2026-10-14T11:00:00Z' },
]
function stubDb() {
  const tables = {
    language_recording_policy: POLICY,
    courses: [{ course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', voice_config: {} }],
    course_audio: AUDIO,
    dashboard_users: [],
  }
  return {
    from(table) {
      let rows = (tables[table] || []).slice()
      const q = {
        select() { return q },
        eq(col, val) { rows = rows.filter((r) => r[col] === val); return q },
        ilike(col, val) { rows = rows.filter((r) => String(r[col]).toLowerCase() === String(val).toLowerCase()); return q },
        in(col, vals) { rows = rows.filter((r) => vals.includes(r[col])); return q },
        not() { return q },
        order() { return q },
        limit(n) { return Promise.resolve({ data: rows.slice(0, n), error: null }) },
        range(from, to) { return Promise.resolve({ data: rows.slice(from, to + 1), error: null }) },
        maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }) },
        then(resolve, reject) { return Promise.resolve({ data: rows, error: null }).then(resolve, reject) },
      }
      return q
    },
  }
}

const USERS = {
  aran: { email: 'aran@hey.com', role: 'admin' },
  tom: { email: 'thomas.cassidy+ssi@gmail.com', role: 'admin' },
  dan: { email: 'dan@example.com', role: 'recorder' },
  nick: { email: 'nick@saysomethingin.com', role: 'admin' },
}
// production-api's requireDashboardUser, in miniature.
async function requireDashboardUser(req, res) {
  const who = (req.headers.authorization || '').replace('Bearer ', '')
  if (!who) { res.status(401).json({ error: 'Authentication required' }); return null }
  if (!USERS[who]) { res.status(403).json({ error: 'Dashboard access required' }); return null }
  return USERS[who]
}

async function get(voiceId, who) {
  const app = express()
  app.use('/api/recording', createRecordistRouter({
    getDb: stubDb,
    requireDashboardUser,
    requireAdmin: requireDashboardUser,
    logger: { log() {}, warn() {}, error() {} },
    s3: { getAudioSignedUrl: async (id, exp, o) => `https://s3/signed/${o.s3Key}` },
  }))
  const server = app.listen(0)
  try {
    const r = await fetch(`http://127.0.0.1:${server.address().port}/api/recording/voice/${voiceId}/latest-takes`, {
      headers: who ? { Authorization: `Bearer ${who}` } : {},
    })
    return { status: r.status, json: await r.json() }
  } finally { server.close() }
}

test('no sign-in gets nothing — a booth link alone no longer lists takes', async () => {
  const r = await get('human_dan_cym_s')
  assert.strictEqual(r.status, 401)
  assert.strictEqual(r.json.takes, undefined)
})

test('an artist asking for another artist’s voice is refused and is given no URL', async () => {
  const r = await get('human_aran_cym_n', 'dan')
  assert.strictEqual(r.status, 403)
  assert.strictEqual(r.json.takes, undefined)
})

test('an artist gets their own takes', async () => {
  const r = await get('human_dan_cym_s', 'dan')
  assert.strictEqual(r.status, 200)
  assert.deepStrictEqual(r.json.takes.map((t) => t.audioId), ['D1'])
  assert.strictEqual(r.json.takes[0].url, 'https://s3/signed/mastered/D1.mp3')
})

test('a God admin hears any artist; a plain admin hears only their own', async () => {
  assert.deepStrictEqual((await get('human_dan_cym_s', 'aran')).json.takes.map((t) => t.audioId), ['D1'])
  assert.deepStrictEqual((await get('human_aran_cym_n', 'tom')).json.takes.map((t) => t.audioId), ['A1'])
  assert.strictEqual((await get('human_dan_cym_s', 'nick')).status, 403)
})

test('the God-admin list is pinned', () => {
  assert.deepStrictEqual([...GOD_ADMIN_EMAILS].sort(), ['aran@hey.com', 'thomas.cassidy+ssi@gmail.com'])
})
