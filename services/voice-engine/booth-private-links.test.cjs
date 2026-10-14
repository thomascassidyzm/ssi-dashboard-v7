// Job #380 (Aran 2026-10-14): PRIVATE booth links. Every /api/recording/voice/:voiceId route
// answered on the voice id alone, so editing the id in your own link opened another artist's booth.
// Proves, through the real routers: with grace OFF a booth route without the right key is refused
// (and another artist's key does not open it); the right key opens it, by ?k= or x-booth-key; a
// signed-in God admin opens any booth without one while a plain admin does not; the artist signed in
// to their own voice gets in; with grace ON an id-only request is still served AND logged; and the
// God-admin panel route makes a link that opens the booth and retires the one before it.
//
// Deliberately requires only the routers, not booth-link-keys.cjs, so on the pre-#380 code every
// test runs and fails on its refusal/log assertion rather than on a missing module.
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const crypto = require('crypto')
const express = require('express')
const createRecordistRouter = require('./recordist-router.cjs')
const createBoothArtistsRouter = require('./booth-artists-router.cjs')

const POLICY = [{
  language: 'cym',
  human_only: true,
  voices: {
    m: { name: 'Aran', email: 'aran@hey.com', voiceId: 'human_aran_cym_n' },
    'm:south': { name: 'Dan', email: 'dan@example.com', voiceId: 'human_dan_cym_s', dialect: 'south' },
  },
}]
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex')
const DAN_KEY = 'dan-secret-key-0000001'
const ARAN_KEY = 'aran-secret-key-000001'

function stubDb(keyRows) {
  const tables = {
    language_recording_policy: POLICY,
    courses: [{ course_code: 'cym_s_for_eng', target_lang: 'cym', known_lang: 'eng', voice_config: {} }],
    course_audio: [],
    dashboard_users: [],
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

async function withApp({ grace, keyRows = [{ voice_id: 'human_dan_cym_s', key_hash: sha(DAN_KEY), nonce: null }, { voice_id: 'human_aran_cym_n', key_hash: sha(ARAN_KEY), nonce: null }] }, fn) {
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
  app.use('/api/recording/admin-test', createBoothArtistsRouter({ getDb: () => db, logger, requireAdmin, boothKeys }))
  app.use('/api/recording', createRecordistRouter({
    getDb: () => db, requireDashboardUser, requireAdmin, identifyCaller, logger, boothKeys,
    handleRecordingUpload: async (req, res) => res.json({ ok: true, uploaded: true }),
    s3: { getAudioSignedUrl: async () => 'https://s3/signed', listObjects: async () => [] },
  }))
  const server = app.listen(0)
  const base = `http://127.0.0.1:${server.address().port}/api/recording`
  const call = async (path, { who, key, header, method = 'GET' } = {}) => {
    const headers = {}
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

const ROUTES = ['/voice/human_dan_cym_s/casting', '/voice/human_dan_cym_s/summary', '/voice/human_dan_cym_s/line/S0001T1/clip', '/voice/human_dan_cym_s']

test('grace OFF: no key, or another artist\'s key, is refused on every booth route', async () => {
  await withApp({ grace: false }, async ({ call }) => {
    for (const p of ROUTES) {
      assert.strictEqual((await call(p)).status, 403, `no key: ${p}`)
      assert.strictEqual((await call(p, { key: ARAN_KEY })).status, 403, `Aran's key on Dan's booth: ${p}`)
    }
    assert.strictEqual((await call('/voice/human_dan_cym_s/take', { method: 'POST' })).status, 403, 'take upload')
    assert.strictEqual((await call('/voice/pack-setup-human_dan_cym_s/submit', { method: 'POST' })).status, 403, 'setup pack')
  })
})

test('grace OFF: the right key opens the booth, by ?k= and by x-booth-key; a wrong key does not', async () => {
  await withApp({ grace: false }, async ({ call }) => {
    assert.strictEqual((await call('/voice/human_dan_cym_s/casting', { key: 'not-the-key' })).status, 403)
    const byQuery = await call('/voice/human_dan_cym_s/casting', { key: DAN_KEY })
    assert.strictEqual(byQuery.status, 200)
    assert.strictEqual(byQuery.json.voiceId, 'human_dan_cym_s')
    assert.strictEqual((await call('/voice/human_dan_cym_s/casting', { header: DAN_KEY })).status, 200)
    // The setup-check pack is the same artist's booth and takes the same key.
    assert.notStrictEqual((await call('/voice/pack-setup-human_dan_cym_s/submit', { key: DAN_KEY, method: 'POST' })).status, 403)
  })
})

test('grace OFF: a signed-in God admin opens any booth without a key; a plain admin does not; the artist opens their own', async () => {
  await withApp({ grace: false }, async ({ call }) => {
    assert.strictEqual((await call('/voice/human_dan_cym_s/casting', { who: 'aran' })).status, 200, 'God admin')
    assert.strictEqual((await call('/voice/human_dan_cym_s/casting', { who: 'nick' })).status, 403, 'admin, not God')
    assert.strictEqual((await call('/voice/human_dan_cym_s/casting', { who: 'dan' })).status, 200, 'own voice, signed in')
    assert.strictEqual((await call('/voice/human_aran_cym_n/casting', { who: 'dan' })).status, 403, 'another voice, signed in')
  })
})

test('grace ON: an id-only request is still served, and logged', async () => {
  await withApp({ grace: true }, async ({ call, warnings }) => {
    assert.strictEqual((await call('/voice/human_dan_cym_s/casting')).status, 200)
    const line = warnings.find((w) => w.includes('[BoothKey] GRACE'))
    assert.ok(line, `expected a GRACE log line, got ${JSON.stringify(warnings)}`)
    assert.match(line, /human_dan_cym_s/)
    // With the right key nothing is logged.
    const before = warnings.length
    assert.strictEqual((await call('/voice/human_dan_cym_s/casting', { key: DAN_KEY })).status, 200)
    assert.strictEqual(warnings.filter((w) => w.includes('GRACE')).length, warnings.slice(0, before).filter((w) => w.includes('GRACE')).length)
  })
})

test('the God-admin panel makes a link that opens the booth, shows it again, and regenerating retires the old one', async () => {
  await withApp({ grace: false, keyRows: [] }, async ({ call }) => {
    assert.strictEqual((await call('/admin-test/booth-links/human_dan_cym_s', { who: 'nick', method: 'POST' })).status, 403, 'plain admin cannot make links')
    const first = await call('/admin-test/booth-links/human_dan_cym_s', { who: 'aran', method: 'POST' })
    assert.strictEqual(first.status, 200)
    assert.match(first.json.key, /^[A-Za-z0-9_-]{22}$/) // 128 bits, base64url
    assert.strictEqual((await call('/voice/human_dan_cym_s/casting', { key: first.json.key })).status, 200)
    const listed = await call('/admin-test/booth-links', { who: 'aran' })
    assert.strictEqual(listed.json.links.find((l) => l.voiceId === 'human_dan_cym_s').key, first.json.key)
    const second = await call('/admin-test/booth-links/human_dan_cym_s', { who: 'aran', method: 'POST' })
    assert.notStrictEqual(second.json.key, first.json.key)
    assert.strictEqual((await call('/voice/human_dan_cym_s/casting', { key: first.json.key })).status, 403, 'old link retired')
    assert.strictEqual((await call('/voice/human_dan_cym_s/casting', { key: second.json.key })).status, 200, 'new link works')
  })
})
