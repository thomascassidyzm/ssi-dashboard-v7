// A CAST-ONLY VOICE IS CONFINED TO ITS OWN LINES ON ITS OWN CAST COURSES AT
// EVERY DOOR -- the queue, the pod-line take, the link arrival, and the
// propagation that runs AFTER a take lands (job #336, reconciling #333's
// REFUTED against #334's VERIFIED on #329). Three of the four doors #333 named
// were real on main at 4ec389f7c; each test here failed there and passes with
// the fix.
//
// The cast: Swahili, NO language_recording_policy row. swa_for_eng casts Bea
// and Amina (both female) and Kofi; swa_for_fra casts Zawadi (female). Bea and
// Zawadi read the SAME words on their own courses -- the exact shape the
// language-wide collapse was built for with POLICY voices, and the shape a
// per-course cast must NOT collapse across.
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
process.env.CASTING_ACCESS_LEDGER = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cast-reconcile-')), 'casting-access.jsonl')

const test = require('node:test')
const assert = require('node:assert')
const { buildQueue, resolveRecordist, propagateTakeToDuplicates } = require('./recordist-queue.cjs')
const { boothArrival } = require('./casting-rights.cjs')
const createRecordistRouter = require('./recordist-router.cjs')

const BEA = 'bea@example.com', BEA_VOICE = 'human_bea_swa'
const AMINA_VOICE = 'human_amina_swa'
const ZAWADI_VOICE = 'human_zawadi_swa'

function fixture({ zawadiEmail = 'zawadi@example.com' } = {}) {
  return {
    language_recording_policy: [],
    dashboard_users: [],
    courses: [
      { course_code: 'swa_for_eng', target_lang: 'swa', known_lang: 'eng', voice_config: { podCast: {
        Bea: { name: 'Bea', gender: 'f', voiceId: BEA_VOICE, email: BEA },
        Amina: { name: 'Amina', gender: 'f', voiceId: AMINA_VOICE, email: 'amina@example.com' },
        Kofi: { name: 'Kofi', gender: 'm', voiceId: 'human_kofi_swa', email: 'kofi@example.com' },
      } } },
      { course_code: 'swa_for_fra', target_lang: 'swa', known_lang: 'fra', voice_config: { podCast: {
        Zawadi: { name: 'Zawadi', gender: 'f', voiceId: ZAWADI_VOICE, email: zawadiEmail },
      } } },
    ],
    listening_pods: [
      { id: 'p1', course_code: 'swa_for_eng', slug: 'pod-1', title: 'Pod 1' },
      { id: 'p2', course_code: 'swa_for_fra', slug: 'pod-1', title: 'Pod 1' },
    ],
    // Ordered by id, as fetchAllSentences reads them: Zawadi's copy of
    // "Habari." (s0) is met BEFORE Bea's (s1), so a text-only collapse makes
    // Zawadi's line the representative of Bea's words.
    listening_pod_sentences: [
      { id: 's0', pod_id: 'p2', global_order: 1, speaker: 'Zawadi', target_text: 'Habari.', known_text: 'Bonjour.' },
      { id: 's1', pod_id: 'p1', global_order: 1, speaker: 'Bea', target_text: 'Habari.', known_text: 'Hello.' },
      { id: 's2', pod_id: 'p1', global_order: 2, speaker: 'Amina', target_text: 'Asante.', known_text: 'Thanks.' },
      { id: 's3', pod_id: 'p1', global_order: 3, speaker: 'Kofi', target_text: 'Nzuri.', known_text: 'Fine.' },
    ],
    course_audio: [],
  }
}

function stubDb(tables, writes = []) {
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
        single() { return Promise.resolve({ data: op === 'upsert' ? { id: `new-${writes.length}`, ...patch } : rows[0] || null, error: null }) },
        update(p) { op = 'update'; patch = p; return q },
        upsert(p) { op = 'upsert'; patch = p; writes.push({ table, op, row: p }); return q },
        then(resolve, reject) {
          if (op === 'update') writes.push({ table, op, patch, ids: rows.map((r) => r.id) })
          return Promise.resolve({ data: rows, error: null }).then(resolve, reject)
        },
      }
      return q
    },
  }
}

const quiet = { log() {}, info() {}, warn() {}, error() {} }

// ── #333 claim 2: queue dedup collapses across cast voices before the voice filter ──
test('two cast-only voices reading the same words on sibling courses each see their OWN line', async () => {
  const db = stubDb(fixture())
  const bea = await resolveRecordist(db, BEA_VOICE, { course: 'swa_for_eng' })
  const zawadi = await resolveRecordist(db, ZAWADI_VOICE, { course: 'swa_for_fra' })
  const qBea = await buildQueue(db, bea, { includeRecorded: true })
  const qZawadi = await buildQueue(db, zawadi, { includeRecorded: true })
  assert.deepStrictEqual(qBea.lines.map((l) => [l.id, l.courseCode]), [['s1', 'swa_for_eng']], `Bea's queue: ${JSON.stringify(qBea.lines.map((l) => l.id))}`)
  assert.deepStrictEqual(qZawadi.lines.map((l) => [l.id, l.courseCode]), [['s0', 'swa_for_fra']], `Zawadi's queue: ${JSON.stringify(qZawadi.lines.map((l) => l.id))}`)
  assert.strictEqual(qBea.duplicatesCollapsed, 0, 'nothing of a per-course cast collapses across courses')
})

// ── #333 claim 1: propagation fills a sibling course's line cast to another voice ──
test('a cast-only voice\'s take never propagates to a sibling course\'s line cast to somebody else', async () => {
  const writes = []
  const db = stubDb(fixture(), writes)
  const bea = await resolveRecordist(db, BEA_VOICE, { course: 'swa_for_eng' })
  const out = await propagateTakeToDuplicates({ db, recordist: bea, sentenceId: 's1', text: 'Habari.', s3Key: 'mastered/x.mp3', logger: quiet })
  assert.deepStrictEqual(out.linked, [], `Bea's take landed on ${JSON.stringify(out.linked)}`)
  assert.deepStrictEqual(writes, [], 'no course_audio row for swa_for_fra, no FK moved on Zawadi\'s line')
})

// ── #333 claim 3: the take route checks the course, never the sentence's cast voice ──
async function take(tables, voiceId, lineId, query = {}) {
  const writes = []
  const uploads = []
  const router = createRecordistRouter({
    getDb: () => stubDb(tables, writes),
    logger: quiet,
    s3: {},
    handleRecordingUpload: async (innerReq, innerRes) => {
      uploads.push({ courseCode: innerReq.params.courseCode, sentenceId: innerReq.body.metadata.sentenceId, voiceId: innerReq.recordistVoiceId })
      innerRes.json({ success: true, uuid: 'AUDIO-1', s3Key: 'mastered/AUDIO-1.mp3', rawKey: 'raw/x' })
    },
  })
  const layer = router.stack.find((l) => l.route && l.route.path === '/voice/:voiceId/take' && l.route.methods.post)
  const handle = layer.route.stack[0].handle
  const out = {}
  const settled = new Promise((resolve) => {
    out.res = { status(c) { out.status = c; return out.res }, json(b) { out.body = b; resolve(); return out.res } }
  })
  await handle({
    params: { voiceId }, query, headers: { 'content-type': 'application/json' }, socket: {},
    method: 'POST', originalUrl: `/voice/${voiceId}/take`,
    body: { lineId, audioData: 'AAAA', mimeType: 'audio/webm' },
  }, out.res)
  await settled
  return { status: out.status, body: out.body, uploads, writes }
}

test('a cast-only voice cannot record a line of its OWN course that is cast to another voice', async () => {
  const r = await take(fixture(), BEA_VOICE, 's2')
  assert.strictEqual(r.status, 403, `expected 403, got ${r.status} ${JSON.stringify(r.body)}`)
  assert.strictEqual(r.body.reason, 'not_cast_on_line')
  assert.deepStrictEqual(r.uploads, [], 'the upload seam is never reached')
})

test('a cast-only voice cannot record a sibling course\'s line by uuid, and still records its own line', async () => {
  const sibling = await take(fixture(), BEA_VOICE, 's0')
  assert.strictEqual(sibling.status, 403, `expected 403, got ${sibling.status} ${JSON.stringify(sibling.body)}`)
  assert.deepStrictEqual(sibling.uploads, [])
  const own = await take(fixture(), BEA_VOICE, 's1')
  assert.strictEqual(own.status, undefined, `expected 200, got ${own.status} ${JSON.stringify(own.body)}`)
  assert.strictEqual(own.body.ok, true)
  assert.deepStrictEqual(own.uploads, [{ courseCode: 'swa_for_eng', sentenceId: 's1', voiceId: BEA_VOICE }])
  assert.strictEqual(own.body.alsoFilled, 0, 'and the take stays on swa_for_eng: Zawadi\'s copy is not filled')
})

// ── #333 claim 4: boothArrival admits by everything the email holds, not this voice's cast ──
test('a link for one voice is judged by THAT voice\'s cast, even when its email is cast elsewhere as another voice', async () => {
  // The same person cast as Bea on swa_for_eng and as Zawadi on swa_for_fra.
  const db = stubDb(fixture({ zawadiEmail: BEA }))
  const bea = await resolveRecordist(db, BEA_VOICE, { course: 'swa_for_eng' })
  assert.deepStrictEqual(bea.castCourses, ['swa_for_eng'])
  const arrival = await boothArrival({ db, recordist: bea, courseCodes: ['swa_for_fra'], path: `/r/${BEA_VOICE}?course=swa_for_fra`, logger: quiet })
  assert.deepStrictEqual(arrival.reached, [], `the Bea voice reached ${JSON.stringify(arrival.reached)}`)
  assert.strictEqual(arrival.refused.length, 1)
  // Their Zawadi link still works on swa_for_fra.
  const zawadi = await resolveRecordist(db, ZAWADI_VOICE, { course: 'swa_for_fra' })
  const ok = await boothArrival({ db, recordist: zawadi, courseCodes: ['swa_for_fra'], path: '/r', logger: quiet })
  assert.deepStrictEqual(ok.reached, ['swa_for_fra'])
})
