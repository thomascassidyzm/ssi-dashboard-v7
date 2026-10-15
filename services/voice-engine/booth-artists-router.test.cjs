// Job #350 (Aran 2026-10-14): the recording-artists overview is God-admin only, enforced on the
// SERVER. Proves: no token = 401, a recordist/editor = 403, an admin who is not a God admin
// = 403, Aran and Kai = 200 with the numbers; and that the
// session/time maths says what booth-artist-overview.cjs says it does.
// Job #371 (Aran 2026-10-14): Kai added to the God admins; another admin (Nick) is still 403.
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const express = require('express')

const queue = require('./recordist-queue.cjs')
queue.buildCoverage = async () => [{
  language: 'cym', languageName: 'Welsh',
  voices: [{ voiceId: 'human_dan_cym_s', name: 'Dan', total: 10, withTake: 4, kinds: { pod: { total: 10, withTake: 4 } } }],
}]
queue.resolveRecordist = async (_db, id) => (id === 'human_dan_cym_s' ? { voiceId: id, language: 'cym', spellings: [id] } : null)
queue.getPhrasePlan = async () => ({ byVoice: new Map([['human_dan_cym_s', [
  { text: 'dw i wedi dechrau', courseCode: 'cym_sv2_for_eng', pass: 1 },
]]]) })
// Dan's queue as the booth sees it (job #379): Pod 1 of the live South course, and one phrase batch.
queue.buildQueue = async () => ({
  lines: [
    { kind: 'pod', podSlug: 'pod-1', courseCode: 'cym_s_for_eng', text: 'Bore da', recorded: true },
    { kind: 'pod', podSlug: 'pod-1', courseCode: 'cym_s_for_eng', text: 'Shwmae', recorded: false },
  ],
  phrases: { pass: 1, batch: 1, courseCode: 'cym_sv2_for_eng' },
  phraseBatches: [{ pass: 1, batch: 1, courseCode: 'cym_sv2_for_eng', courseLabel: 'South', total: 200, recorded: 1, held: 0 }],
})
const ov = require('./booth-artist-overview.cjs')
const createRouter = require('./booth-artists-router.cjs')

const NOW = Date.parse('2026-10-14T12:00:00Z')
const rows = [
  { id: 'a', voice_id: 'human_dan_cym_s', course_code: 'cym_s_for_eng', text: 'Bore da', created_at: '2026-10-14T10:00:00Z', duration_ms: 2000, s3_key: null },
  { id: 'b', voice_id: 'human_dan_cym_s', course_code: 'cym_sv2_for_eng', text: 'Dw i wedi dechrau.', created_at: '2026-10-14T10:05:00Z', duration_ms: 3000, s3_key: null },
  { id: 'c', voice_id: 'human_archived-20a3405f-human_dan_cym_s', course_code: 'cym_s_for_eng', text: 'Croeso i gêm', created_at: '2026-10-01T09:00:00Z', duration_ms: null, s3_key: null },
]
function fakeDb() {
  const q = { select: () => q, eq: () => q, like: () => q, order: () => q, range: async () => ({ data: rows, error: null }) }
  return { from: () => q }
}

const USERS = {
  aran: { email: 'aran@hey.com', role: 'admin' },
  kai: { email: 'kai@saysomethingin.com', role: 'admin' },
  nick: { email: 'nick@saysomethingin.com', role: 'admin' },
  catrin: { email: 'catrinlliar@gmail.com', role: 'recorder' },
}
// production-api's requireAdmin, in miniature: 401 without a token, 403 for a non-admin.
async function requireAdmin(req, res) {
  const who = (req.headers.authorization || '').replace('Bearer ', '')
  if (!who) { res.status(401).json({ error: 'Authentication required' }); return null }
  const user = USERS[who]
  if (!user || user.role !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return null }
  return user
}

async function get(path, who) {
  const app = express()
  app.use('/api/recording/admin', createRouter({
    getDb: fakeDb, requireAdmin, now: () => NOW, logger: { log() {}, warn() {}, error() {} },
  }))
  const server = app.listen(0)
  try {
    const r = await fetch(`http://127.0.0.1:${server.address().port}/api/recording/admin${path}`, {
      headers: who ? { Authorization: `Bearer ${who}` } : {},
    })
    return { status: r.status, json: await r.json() }
  } finally { server.close() }
}

test('no token is 401, a recordist is 403, and nothing is read for either', async () => {
  assert.strictEqual((await get('/artists')).status, 401)
  assert.strictEqual((await get('/artists', 'catrin')).status, 403)
  assert.strictEqual((await get('/artists/human_dan_cym_s', 'catrin')).status, 403)
})

test('an admin who is not a God admin is refused', async () => {
  const r = await get('/artists', 'nick')
  assert.strictEqual(r.status, 403)
  assert.strictEqual(r.json.artists, undefined)
  assert.strictEqual((await get('/artists/human_dan_cym_s', 'nick')).status, 403)
})

test('Kai is a God admin (Aran, job #371)', async () => {
  assert.strictEqual((await get('/artists', 'kai')).status, 200)
  assert.strictEqual((await get('/artists/human_dan_cym_s', 'kai')).status, 200)
})

test('Aran sees every artist, with archived takes folded into their voice', async () => {
  const r = await get('/artists', 'aran')
  assert.strictEqual(r.status, 200)
  const dan = r.json.artists.find((a) => a.voiceId === 'human_dan_cym_s')
  assert.strictEqual(dan.lines.withTake, 4)
  assert.strictEqual(dan.activity.takes, 3)
  assert.strictEqual(dan.activity.archivedTakes, 1)
  assert.strictEqual(dan.activity.takesToday, 2)
  assert.strictEqual(dan.activity.audioMs, 5000)
  assert.strictEqual(dan.activity.missingDuration, 1)
  const d = await get('/artists/human_dan_cym_s', 'aran')
  assert.strictEqual(d.status, 200)
  assert.strictEqual(d.json.daily.length, 30)
  assert.strictEqual(d.json.daily[29].takes, 2)
})

test('work is split by project in plain words, each take filed under its line (Aran, job #379)', async () => {
  const r = await get('/artists', 'aran')
  const dan = r.json.artists.find((a) => a.voiceId === 'human_dan_cym_s')
  const by = Object.fromEntries(dan.projects.map((p) => [p.label, p]))
  assert.deepStrictEqual(Object.keys(by), [
    'South Welsh: new practice phrases, pass 1', 'South Welsh: Pod 1', 'South Welsh: earlier lines, not in the queue now',
  ])
  assert.deepStrictEqual([by['South Welsh: Pod 1'].recorded, by['South Welsh: Pod 1'].total], [1, 2])
  assert.strictEqual(by['South Welsh: Pod 1'].activity.takesToday, 1)
  assert.deepStrictEqual([by['South Welsh: new practice phrases, pass 1'].recorded, by['South Welsh: new practice phrases, pass 1'].total], [1, 200])
  assert.strictEqual(by['South Welsh: earlier lines, not in the queue now'].total, null)
  assert.strictEqual(by['South Welsh: earlier lines, not in the queue now'].activity.takes, 1)
  assert.strictEqual(dan.lines.withTake, 4)
  const d = await get('/artists/human_dan_cym_s', 'aran')
  // (the fake DB hands rows back in the order written, not newest first)
  assert.deepStrictEqual(d.json.recentTakes.map((t) => t.projectLabel), [
    'South Welsh: Pod 1', 'South Welsh: new practice phrases, pass 1', 'South Welsh: earlier lines, not in the queue now',
  ])
  assert.strictEqual(d.json.phraseBatches[0].project, 'phrase.cym_sv2_for_eng.1')
})

test('project names: Pod 1, old and new sentences, LEGOs, and the English known side', () => {
  assert.strictEqual(ov.projectLabel({ kind: 'pod', podSlug: 'pod-1', courseCode: 'cym_n_for_eng' }, 'cym'), 'North Welsh: Pod 1')
  assert.strictEqual(ov.projectLabel({ kind: 'seed', courseCode: 'cym_nv2_for_eng', newCourse: true, seedExisting: false }, 'cym'), 'North Welsh: new sentences')
  assert.strictEqual(ov.projectLabel({ kind: 'seed', courseCode: 'cym_n_for_eng', seedExisting: true }, 'cym'), 'North Welsh: old sentences')
  assert.strictEqual(ov.projectLabel({ kind: 'lego', courseCode: 'cym_nv2_for_eng' }, 'cym'), 'North Welsh: new LEGOs')
  assert.strictEqual(ov.projectLabel({ kind: 'seed', courseCode: 'cym_sv2_for_eng', seedExisting: true }, 'eng'), 'English known lines: South Welsh new sentences')
})

test('the God-admin list is exactly Tom, Aran and Kai', () => {
  assert.deepStrictEqual([...ov.GOD_ADMIN_EMAILS].sort(), ['aran@hey.com', 'kai@saysomethingin.com', 'thomas.cassidy+ssi@gmail.com'])
  assert.strictEqual(ov.isGodAdmin({ email: 'Aran@Hey.com', role: 'admin' }), true)
  assert.strictEqual(ov.isGodAdmin({ email: 'aran@hey.com', role: 'editor' }), false)
})

test('a sitting ends at a 15-minute gap; session time is first-to-last take', () => {
  const m = 60 * 1000
  const s = ov.sessionize([0, 5 * m, 14 * m, 40 * m])
  assert.deepStrictEqual(s.map((x) => [x.takes, x.end - x.start]), [[3, 14 * m], [1, 0]])
})
