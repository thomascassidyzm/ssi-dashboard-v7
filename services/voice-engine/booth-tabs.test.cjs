// Job #392 (Aran 2026-10-14): ONE booth page for a person with several voices, as language tabs.
// Proves, through the real router, the rule booth-tabs.cjs states: a person is the EMAIL that names
// a voice; a sibling voice is a tab only when the caller could open it on its own (its own key, or
// signed in as its artist or a God admin); grace mode adds no tabs; a voice no email links, or a
// one-voice artist, gets exactly one tab (so the page shows none). On the pre-#392 code the route
// does not exist and every test fails on its 404.
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const crypto = require('crypto')
const express = require('express')
const createRecordistRouter = require('./recordist-router.cjs')

const POLICY = [{
  language: 'cym',
  human_only: true,
  voices: {
    m: { name: 'Aran', email: 'aran@hey.com', voiceId: 'human_aran_cym_n' },
    f: { name: 'Catrin', email: 'catrin@example.com', voiceId: 'human_catrin_cym_n' },
    'm:south': { name: 'Dan', email: 'dan@example.com', voiceId: 'human_dan_cym_s', dialect: 'south' },
    'f:south': { name: 'Aran', voiceId: 'human_otheraran_cym_s', dialect: 'south' },
  },
}, {
  language: 'eng',
  human_only: true,
  voices: {
    'm:known': { name: 'Aran', email: 'aran@hey.com', voiceId: 'human_aran_eng', gender: 'm' },
  },
}]
// Catrin's second voice is a community cast on one course, named by her email there.
const COURSES = [
  { course_code: 'cym_s_for_eng', target_lang: 'cym', known_lang: 'eng', voice_config: {} },
  { course_code: 'gle_for_eng', target_lang: 'gle', known_lang: 'eng', voice_config: { podCast: { A: { voiceId: 'human_catrin_gle', email: 'Catrin@Example.com', name: 'Catrin', gender: 'f' } } } },
]
const USERS_ROWS = []
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex')
const KEYS = { human_aran_cym_n: 'aran-cym-key-000000001', human_aran_eng: 'aran-eng-key-000000001', human_dan_cym_s: 'dan-key-00000000000001', human_catrin_cym_n: 'catrin-cym-key-0000001', human_catrin_gle: 'catrin-gle-key-0000001', human_otheraran_cym_s: 'other-aran-key-0000001' }

function stubDb(keyRows) {
  const tables = {
    language_recording_policy: POLICY,
    courses: COURSES,
    course_audio: [],
    dashboard_users: USERS_ROWS,
    booth_link_keys: keyRows,
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
        upsert(row) {
          const i = keyRows.findIndex((r) => r.voice_id === row.voice_id)
          if (i >= 0) keyRows[i] = row; else keyRows.push(row)
          return Promise.resolve({ data: null, error: null })
        },
        then(resolve, reject) { return Promise.resolve({ data: rows, error: null }).then(resolve, reject) },
      }
      return q
    },
  }
}

const USERS = {
  aran: { email: 'aran@hey.com', role: 'admin' },
  catrin: { email: 'catrin@example.com', role: 'recorder' },
  dan: { email: 'dan@example.com', role: 'recorder' },
  nick: { email: 'nick@saysomethingin.com', role: 'admin' },
}
async function requireDashboardUser(req, res) {
  const who = (req.headers.authorization || '').replace('Bearer ', '')
  if (!who) { res.status(401).json({ error: 'Authentication required' }); return null }
  if (!USERS[who]) { res.status(403).json({ error: 'Dashboard access required' }); return null }
  return USERS[who]
}
async function requireAdmin(req, res) {
  const u = await requireDashboardUser(req, res)
  if (!u) return null
  if (u.role !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return null }
  return u
}
const identifyCaller = async (req) => USERS[(req.headers.authorization || '').replace('Bearer ', '')] || null

async function withApp({ grace, keyRows = Object.entries(KEYS).map(([voice_id, k]) => ({ voice_id, key_hash: sha(k), nonce: null })) }, fn) {
  const prev = process.env.BOOTH_LINK_GRACE
  process.env.BOOTH_LINK_GRACE = grace ? 'on' : 'off'
  const prevSecret = process.env.BOOTH_LINK_SECRET
  process.env.BOOTH_LINK_SECRET = 'test-secret'
  const warnings = []
  const logger = { log() {}, info() {}, warn(m) { warnings.push(String(m)) }, error() {} }
  const db = stubDb(keyRows)
  // ONE store shared by the booth routes and the panel route, as production-api.cjs wires it.
  let boothKeys = null
  try { boothKeys = require('./booth-link-keys.cjs').createBoothKeyStore({ getDb: () => db }) } catch { /* pre-#380 */ }
  const app = express()
  app.use(express.json())
  app.use('/api/recording', createRecordistRouter({
    getDb: () => db, requireDashboardUser, requireAdmin, identifyCaller, logger, boothKeys,
    handleRecordingUpload: async (req, res) => res.json({ ok: true, uploaded: true }),
    s3: { getAudioSignedUrl: async () => 'https://s3/signed', listObjects: async () => [] },
  }))
  const server = app.listen(0)
  const base = `http://127.0.0.1:${server.address().port}/api/recording`
  const call = async (path, { who, key, header, held, method = 'GET' } = {}) => {
    const headers = {}
    if (held) headers['x-booth-keys'] = Object.entries(held).map(([v, k]) => `${v}:${k}`).join(',')
    if (who) headers.Authorization = `Bearer ${who}`
    if (header) headers['x-booth-key'] = header
    const url = `${base}${path}${key ? `${path.includes('?') ? '&' : '?'}k=${encodeURIComponent(key)}` : ''}`
    const r = await fetch(url, { method, headers })
    return { status: r.status, json: await r.json().catch(() => ({})) }
  }
  try { await fn({ call, warnings, keyRows }) } finally {
    server.close()
    if (prev === undefined) delete process.env.BOOTH_LINK_GRACE; else process.env.BOOTH_LINK_GRACE = prev
    if (prevSecret === undefined) delete process.env.BOOTH_LINK_SECRET; else process.env.BOOTH_LINK_SECRET = prevSecret
  }
}


const tabsOf = (r) => (r.json.tabs || []).map((t) => t.voiceId)

test('link only: one voice\'s key shows that voice alone; holding the other voice\'s key adds its tab, Welsh first', async () => {
  await withApp({ grace: false }, async ({ call }) => {
    const alone = await call('/voice/human_aran_cym_n/tabs', { key: KEYS.human_aran_cym_n })
    assert.strictEqual(alone.status, 200)
    assert.deepStrictEqual(tabsOf(alone), ['human_aran_cym_n'])
    const both = await call('/voice/human_aran_cym_n/tabs', { key: KEYS.human_aran_cym_n, held: { human_aran_eng: KEYS.human_aran_eng } })
    assert.deepStrictEqual(tabsOf(both), ['human_aran_cym_n', 'human_aran_eng'])
    // Opened on the English link, the order is the same: the tabs do not jump about.
    const fromEng = await call('/voice/human_aran_eng/tabs', { key: KEYS.human_aran_eng, held: { human_aran_cym_n: KEYS.human_aran_cym_n } })
    assert.deepStrictEqual(tabsOf(fromEng), ['human_aran_cym_n', 'human_aran_eng'])
    assert.strictEqual(both.json.tabs[1].language, 'eng')
    assert.strictEqual(both.json.tabs[1].boothKey, null, 'a link-only caller is never handed a key')
  })
})

test('a wrong key, or another person\'s key, adds no tab', async () => {
  await withApp({ grace: false }, async ({ call }) => {
    const wrong = await call('/voice/human_aran_cym_n/tabs', { key: KEYS.human_aran_cym_n, held: { human_aran_eng: 'not-the-key' } })
    assert.deepStrictEqual(tabsOf(wrong), ['human_aran_cym_n'])
    const dans = await call('/voice/human_aran_cym_n/tabs', { key: KEYS.human_aran_cym_n, held: { human_dan_cym_s: KEYS.human_dan_cym_s } })
    assert.deepStrictEqual(tabsOf(dans), ['human_aran_cym_n'], 'Dan is not Aran: his key is no tab here')
  })
})

test('grace mode is not a right: an id-only caller sees only the voice the link names', async () => {
  await withApp({ grace: true }, async ({ call }) => {
    assert.deepStrictEqual(tabsOf(await call('/voice/human_aran_cym_n/tabs')), ['human_aran_cym_n'])
  })
})

test('signed in: the artist gets every voice of theirs with its key; a God admin gets the person\'s voices; a plain admin does not', async () => {
  await withApp({ grace: false }, async ({ call }) => {
    const catrin = await call('/voice/human_catrin_cym_n/tabs', { who: 'catrin' })
    assert.deepStrictEqual(tabsOf(catrin), ['human_catrin_gle', 'human_catrin_cym_n'], 'by language name: Irish, Welsh')
    assert.ok(catrin.json.tabs.every((t) => t.boothKey === null || typeof t.boothKey === 'string'))
    const god = await call('/voice/human_catrin_cym_n/tabs', { who: 'aran' })
    assert.deepStrictEqual(tabsOf(god).sort(), ['human_catrin_cym_n', 'human_catrin_gle'])
    const nick = await call('/voice/human_catrin_cym_n/tabs', { who: 'nick', key: KEYS.human_catrin_cym_n })
    assert.deepStrictEqual(tabsOf(nick), ['human_catrin_cym_n'])
  })
})

test('a one-voice artist, and a voice no email names, get one tab; a shared display name links nobody', async () => {
  await withApp({ grace: false }, async ({ call }) => {
    assert.deepStrictEqual(tabsOf(await call('/voice/human_dan_cym_s/tabs', { key: KEYS.human_dan_cym_s })), ['human_dan_cym_s'])
    const other = await call('/voice/human_otheraran_cym_s/tabs', { who: 'aran', held: { human_aran_cym_n: KEYS.human_aran_cym_n, human_aran_eng: KEYS.human_aran_eng } })
    assert.deepStrictEqual(tabsOf(other), ['human_otheraran_cym_s'], 'another artist called Aran, with no email, is not Aran')
    assert.strictEqual((await call('/voice/human_nobody_cym/tabs', { who: 'aran' })).status, 404)
  })
})
