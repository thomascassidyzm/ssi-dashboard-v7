// A CAST-ONLY VOICE RE-RECORDS ON ITS CAST COURSE AND NOWHERE ELSE (job #335,
// closing the narrow gap #334's cold-verify of #329 found). Every other door
// opened for a community voice -- the queue (isCastOnlyLine), the link and the
// pod-line take (boothArrival), casting-rights' castCourses fallback -- confines
// a podCast-only voice (no language_recording_policy row) to the courses its
// cast names. recordRerecordClip gated on the clip's LANGUAGE alone, so a voice
// that knew the uuid of a rerecord_wanted clip on a sibling course of the same
// language could re-record it. The queue never showed it that uuid; the
// guarantee still has to hold at the take.
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
process.env.CASTING_ACCESS_LEDGER = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rerecord-cast-')), 'casting-access.jsonl')

const test = require('node:test')
const assert = require('node:assert')
const createRecordistRouter = require('./recordist-router.cjs')

const BEA = 'bea@example.com', BEA_VOICE = 'human_bea_swa'
const OWN_CLIP = '11111111-1111-4111-8111-111111111111'
const SIBLING_CLIP = '22222222-2222-4222-8222-222222222222'

// Swahili: NO policy row. Bea is cast on swa_for_eng only; swa_for_fra is a
// sibling course of the SAME language with its own flagged narration clip.
function fixture() {
  return {
    language_recording_policy: [],
    dashboard_users: [],
    courses: [
      { course_code: 'swa_for_eng', target_lang: 'swa', known_lang: 'eng', voice_config: { podCast: {
        Bea: { name: 'Bea', gender: 'f', voiceId: BEA_VOICE, email: BEA },
      } } },
      { course_code: 'swa_for_fra', target_lang: 'swa', known_lang: 'fra', voice_config: { podCast: {
        Zawadi: { name: 'Zawadi', gender: 'f', voiceId: 'human_zawadi_swa', email: 'zawadi@example.com' },
      } } },
    ],
    listening_pods: [],
    listening_pod_sentences: [],
    course_audio: [
      { id: OWN_CLIP, course_code: 'swa_for_eng', text: 'Habari.', role: 'narration', language: 'swa', voice_id: 'human', s3_key: 'k1', rerecord_wanted: 'clipped' },
      { id: SIBLING_CLIP, course_code: 'swa_for_fra', text: 'Karibu.', role: 'narration', language: 'swa', voice_id: 'human', s3_key: 'k2', rerecord_wanted: 'clipped' },
    ],
  }
}

function stubDb(tables, updates) {
  return {
    from(table) {
      let rows = (tables[table] || []).slice()
      let op = 'read', patch = null
      const q = {
        select() { return q },
        eq(col, val) { rows = rows.filter((r) => r[col] === val); return q },
        in(col, vals) { rows = rows.filter((r) => vals.includes(r[col])); return q },
        ilike(col, val) { const w = String(val).toLowerCase(); rows = rows.filter((r) => String(r[col] || '').toLowerCase() === w); return q },
        not(col, op2, val) { if (op2 === 'is' && val === null) rows = rows.filter((r) => r[col] != null); return q },
        order() { return q },
        limit(n) { return Promise.resolve({ data: rows.slice(0, n), error: null }) },
        range(from, to) { return Promise.resolve({ data: rows.slice(from, to + 1), error: null }) },
        maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }) },
        update(p) { op = 'update'; patch = p; return q },
        then(resolve, reject) {
          if (op !== 'read') updates.push({ table, op, patch, ids: rows.map((r) => r.id) })
          return Promise.resolve({ data: rows, error: null }).then(resolve, reject)
        },
      }
      return q
    },
  }
}

async function take(lineId) {
  const updates = []
  const uploads = []
  const router = createRecordistRouter({
    getDb: () => stubDb(fixture(), updates),
    logger: { log() {}, info() {}, warn() {}, error() {} },
    s3: {},
    // The upload seam is the money: a refusal must happen BEFORE it is reached.
    handleRecordingUpload: async (innerReq, innerRes) => {
      uploads.push({ courseCode: innerReq.params.courseCode, uuid: innerReq.body.uuid })
      innerRes.json({ success: true, rawKey: 'raw/x' })
    },
  })
  const layer = router.stack.find((l) => l.route && l.route.path === '/voice/:voiceId/take' && l.route.methods.post)
  const handle = layer.route.stack[0].handle
  const out = {}
  const settled = new Promise((resolve) => {
    out.res = {
      status(c) { out.status = c; return out.res },
      json(b) { out.body = b; resolve(); return out.res },
    }
  })
  await handle({
    params: { voiceId: BEA_VOICE }, query: {}, headers: { 'content-type': 'application/json' }, socket: {},
    method: 'POST', originalUrl: `/voice/${BEA_VOICE}/take`,
    body: { lineId, audioData: 'AAAA', mimeType: 'audio/webm' },
  }, out.res)
  await settled
  return { status: out.status, body: out.body, uploads, updates }
}

test('a cast-only voice cannot re-record a rerecord_wanted clip on a sibling course of the same language', async () => {
  const r = await take(SIBLING_CLIP)
  assert.equal(r.status, 403, `expected a refusal, got ${r.status} ${JSON.stringify(r.body)}`)
  assert.equal(r.body.reason, 'not_cast_no_grant')
  assert.equal(r.body.courseCode, 'swa_for_fra')
  assert.deepEqual(r.uploads, [], 'the upload seam is never reached')
  assert.deepEqual(r.updates, [], 'the want on the sibling clip is untouched')
})

test('the same voice still re-records a flagged clip on its own cast course, and the want is retired', async () => {
  const r = await take(OWN_CLIP)
  assert.equal(r.status, undefined, `expected 200, got ${r.status} ${JSON.stringify(r.body)}`)
  assert.equal(r.body.ok, true)
  assert.equal(r.body.kind, 'rerecord')
  assert.equal(r.body.audioId, OWN_CLIP)
  assert.deepEqual(r.uploads, [{ courseCode: 'swa_for_eng', uuid: OWN_CLIP }])
  assert.equal(r.body.wantsRetired, 1)
  assert.deepEqual(r.updates, [{ table: 'course_audio', op: 'update', patch: { rerecord_wanted: null }, ids: [OWN_CLIP] }])
})
