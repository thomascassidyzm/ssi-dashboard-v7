// THE POLICY-SIDE SEED CAST — `castOn` on a language_recording_policy voice
// (job #588, Aran 2026-10-13). Run with: node services/voice-engine/recordist-cast-on.test.cjs
//
// Two real needs, one rule:
//   - Aran records the ENGLISH (known) side of the Welsh courses' seeds. An 'eng'
//     policy voice, `onlyCastOn`, casts itself on each course's known side.
//   - Dan and Eleri fill the live Southern course's EMPTY seed slots. That course
//     casts nobody in voice_config, and casting it there would also displace the
//     original (legacy_import) recordings it already serves.
// A castOn cast is FILL-ONLY: it never asks for, and never links into, a slot
// that already holds a clip. Queue, linker and take route all read it through
// seedCastEntry, so the three cannot disagree.
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
process.env.CASTING_ACCESS_LEDGER = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cast-on-')), 'casting-access.jsonl')

const test = require('node:test')
const assert = require('node:assert')
const createRecordistRouter = require('./recordist-router.cjs')
const { buildQueue, resolveRecordist, linkSeedTake, seedCastEntry, policyVoiceList } = require('./recordist-queue.cjs')

const ARAN_ENG = 'human_aran_eng'
const DAN = 'human_dan_cym_s'
const ARAN_CYM = 'human_aran_cym_n'
const QUIET = { log() {}, info() {}, warn() {}, error() {} }

function seed(id, course, n, target, known, extra = {}) {
  return {
    id, course_code: course, seed_number: n, status: 'released',
    target_text: target, known_text: known,
    known_audio_id: null, target1_audio_id: null, target2_audio_id: null,
    ...extra,
  }
}

function fixture() {
  return {
    language_recording_policy: [
      { language: 'cym', human_only: true, voices: {
        m: { name: 'Aran', voiceId: ARAN_CYM, dialect: 'north' },
        'm:south': { name: 'Dan', gender: 'm', dialect: 'south', voiceId: DAN,
          castOn: [{ courseCode: 'cym_s_live', role: 'target1' }] },
        // A Northern voice cast on a Southern course: refused by the dialect rule.
        'm:wrong': { name: 'Kai', gender: 'm', dialect: 'north', voiceId: 'human_kai_cym_n',
          castOn: [{ courseCode: 'cym_s_live', role: 'target2' }] },
      } },
      { language: 'eng', human_only: false, voices: {
        'm:known': { name: 'Aran', gender: 'm', voiceId: ARAN_ENG, onlyCastOn: true, castOn: [
          { courseCode: 'cym_n_live', role: 'known' },
          { courseCode: 'cym_nv2', role: 'known' },
          // A course whose known side is NOT English is never an English cast.
          { courseCode: 'cym_for_jpn', role: 'known' },
        ] },
      } },
    ],
    dashboard_users: [],
    courses: [
      { course_code: 'cym_n_live', target_lang: 'cym', known_lang: 'eng', dialect: 'north',
        voice_config: { voices: { target2: { provider: 'human', voiceId: ARAN_CYM }, known: { provider: 'azure', voiceId: '' } } } },
      { course_code: 'cym_nv2', target_lang: 'cym', known_lang: 'eng', dialect: 'north',
        voice_config: { voices: { target2: { provider: 'human', voiceId: ARAN_CYM } } } },
      { course_code: 'cym_s_live', target_lang: 'cym', known_lang: 'eng', dialect: 'south', voice_config: null },
      { course_code: 'cym_for_jpn', target_lang: 'cym', known_lang: 'jpn', dialect: 'north', voice_config: null },
      // An English-TARGET course with a gender-only male pod cast. Without
      // onlyCastOn its line would route to Aran's English voice.
      { course_code: 'eng_for_jpn', target_lang: 'eng', known_lang: 'jpn',
        voice_config: { podCast: { Ken: { gender: 'm' } } } },
    ],
    listening_pods: [{ id: 'p1', course_code: 'eng_for_jpn', slug: 'pod-1', title: 'Pod 1' }],
    listening_pod_sentences: [
      { id: 'ps1', pod_id: 'p1', global_order: 1, speaker: 'Ken', target_text: 'Good morning.', known_text: 'Ohayo.' },
    ],
    course_running_order: [
      // The sandbox serves seed 7 first and seed 5 second; 9 is a DRAFT it serves.
      { course_code: 'cym_nv2', seed_number: 7, position: 1 },
      { course_code: 'cym_nv2', seed_number: 5, position: 2 },
      { course_code: 'cym_nv2', seed_number: 9, position: 3 },
    ],
    course_seeds: [
      // Live North, served in seed order (no running order).
      seed('n1', 'cym_n_live', 2, 'Dw i isio', 'I want'),
      seed('n3', 'cym_n_live', 3, 'Helo', 'Hello', { known_audio_id: 'tts1' }),   // English held by TTS
      seed('n4', 'cym_n_live', 4, 'Diolch', 'Thank you'),                          // has a usable human take
      seed('n6', 'cym_n_live', 6, 'Nos da', 'Good night', { status: 'draft' }),   // unserved draft
      // Sandbox North.
      seed('v5', 'cym_nv2', 5, 'Dw i isio', 'I want'),         // same English as n1: one reading
      seed('v7', 'cym_nv2', 7, 'Bore da', 'Good morning'),      // position 1: first in the queue
      seed('v8', 'cym_nv2', 8, 'Hwyl', 'Bye'),                  // released but not served: last
      seed('v9', 'cym_nv2', 9, 'Ia', 'Yes', { status: 'draft' }), // a served draft is recordable
      seed('v3', 'cym_nv2', 3, 'Helo', 'Hello'),                // empty here, TTS on n3
      // Live South: nobody cast in voice_config; Dan by castOn, fill-only.
      seed('s1', 'cym_s_live', 1, 'Dw i moyn', 'I want', { target1_audio_id: 'legacy1' }),
      seed('s2', 'cym_s_live', 2, 'Shwmae', 'Hi'),
      // Japanese-known course: its known side is nobody's English.
      seed('j1', 'cym_for_jpn', 1, 'Helo', 'Konnichiwa'),
    ],
    course_audio: [
      { id: 'tts1', voice_id: 'cartesia_x', language: 'eng', role: 'known', origin: 'tts', text_normalized: 'hello', file_size_bytes: 9000, duration_ms: 900 },
      { id: 'legacy1', voice_id: 'legacy_import', language: 'cym', role: 'target1', origin: 'human', text_normalized: 'dw i moyn', file_size_bytes: 9000, duration_ms: 900 },
      { id: 'h4', course_code: 'cym_n_live', voice_id: 'legacy_import', language: 'eng', role: 'known', origin: 'human', text_normalized: 'thank you', file_size_bytes: 9000, duration_ms: 900 },
      // A dead human take (a known size under 2000 bytes) is not usable: "I want" is still owed.
      { id: 'dead', course_code: 'cym_n_live', voice_id: 'legacy_import', language: 'eng', role: 'known', origin: 'human', text_normalized: 'i want', file_size_bytes: 800, duration_ms: 900 },
      // The original recordings carry NO file size: unknown is not dead.
      { id: 'h7', course_code: 'cym_nv2', voice_id: 'legacy_import', language: 'eng', role: 'known', origin: 'human', text_normalized: 'bye', file_size_bytes: null, duration_ms: 700 },
    ],
  }
}

/** A stub supabase that reads and WRITES, so a link is asserted rather than inferred. */
function stubDb(tables, writes = []) {
  return {
    tables,
    from(table) {
      const all = tables[table] || (tables[table] = [])
      let rows = all.slice()
      let op = 'read', patch = null
      const q = {
        select() { return q },
        update(p) { op = 'update'; patch = p; return q },
        eq(col, val) {
          rows = rows.filter((r) => r[col] === val)
          if (op === 'update') {
            for (const r of rows) Object.assign(r, patch)
            writes.push({ table, patch, ids: rows.map((r) => r.id) })
            return Promise.resolve({ data: rows, error: null })
          }
          return q
        },
        in(col, vals) { rows = rows.filter((r) => vals.includes(r[col])); return q },
        ilike(col, val) { const w = String(val).toLowerCase(); rows = rows.filter((r) => String(r[col] || '').toLowerCase() === w); return q },
        not(col, op2, val) { if (op2 === 'is' && val === null) rows = rows.filter((r) => r[col] != null); return q },
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

test('the English voice\'s queue: every known line with no usable take, once per text, in served order', async () => {
  const db = stubDb(fixture())
  const aran = await resolveRecordist(db, ARAN_ENG)
  assert.equal(aran.language, 'eng')
  assert.deepEqual(aran.castCourses.sort(), ['cym_for_jpn', 'cym_n_live', 'cym_nv2'], 'confined to its castOn courses')
  const q = await buildQueue(db, aran)
  const lines = q.lines.map((l) => `${l.role}:${l.text}`)
  // Good morning (nv2 position 1) < I want (live #2, nv2 position 2) < Yes (served draft, pos 3)
  // < Hello (nv2 seed 3 is NOT in the running order: after everything served).
  assert.deepEqual(lines, ['known:Good morning', 'known:I want', 'known:Yes', 'known:Hello'])
  const iWant = q.lines.find((l) => l.text === 'I want')
  assert.equal(iWant.alsoFills, 1, 'one take of "I want" fills both courses')
  assert.equal(q.lines.some((l) => l.text === 'Thank you'), false, 'a usable human take exists: a link to make, not a line to read')
  assert.equal(q.lines.some((l) => l.text === 'Bye'), false, 'an original recording with no stored size is still usable')
  assert.equal(q.lines.some((l) => l.text === 'Good night'), false, 'an unserved draft is not asked for')
  assert.equal(q.lines.some((l) => l.text === 'Konnichiwa'), false, 'a Japanese known side is never English work')
  assert.equal(q.lines.some((l) => l.kind === 'pod'), false, 'no eng_for_* pod line reaches a cast-on-only voice')
})

test('the English take fills every EMPTY known slot of that text and moves nothing', async () => {
  const tables = fixture()
  tables.course_audio.push({ id: 'new_hello', voice_id: ARAN_ENG, language: 'eng', role: 'known', origin: 'human', text_normalized: 'hello' })
  const db = stubDb(tables)
  const aran = await resolveRecordist(db, ARAN_ENG)
  const out = await linkSeedTake({ db, recordist: aran, seedId: 'v3', role: 'known', audioId: 'new_hello', logger: QUIET })
  assert.deepEqual(out.linked.map((l) => l.seedId), ['v3'])
  const byId = new Map(tables.course_seeds.map((s) => [s.id, s]))
  assert.equal(byId.get('v3').known_audio_id, 'new_hello')
  assert.equal(byId.get('n3').known_audio_id, 'tts1', 'fill-only: the TTS-held live slot is left alone')

  const out2 = await linkSeedTake({ db, recordist: aran, seedId: 'n1', role: 'known', audioId: 'new_iwant', logger: QUIET })
  assert.deepEqual(out2.linked.map((l) => l.seedId).sort(), ['n1', 'v5'], 'one take, both courses')
})

test('Dan fills the live Southern course\'s EMPTY target1 slots only; a Northern castOn there is refused', async () => {
  const tables = fixture()
  const db = stubDb(tables)
  const dan = await resolveRecordist(db, DAN)
  assert.equal(dan.castCourses, undefined, 'Dan stays a language-wide policy voice')
  const q = await buildQueue(db, dan)
  assert.deepEqual(q.lines.filter((l) => l.kind === 'seed').map((l) => `${l.role}:${l.text}`), ['target1:Shwmae'],
    'the legacy-held seed is not work; the empty one is')

  const cast = seedCastEntry(tables.courses.find((c) => c.course_code === 'cym_s_live'),
    policyVoiceList(tables.language_recording_policy[0]))
  assert.equal(cast.target1.voiceId, DAN)
  assert.equal(cast.target1.fillOnly, true)
  assert.equal(cast.target2, undefined, 'a North voice castOn a South course is not obeyed')

  tables.course_audio.push({ id: 'dan_take', voice_id: DAN, language: 'cym' })
  tables.course_seeds.push(seed('s9', 'cym_s_live', 9, 'Dw i moyn', 'I want'))
  const out = await linkSeedTake({ db, recordist: dan, seedId: 's9', role: 'target1', audioId: 'dan_take', logger: QUIET })
  assert.deepEqual(out.linked.map((l) => l.seedId), ['s9'])
  assert.equal(tables.course_seeds.find((s) => s.id === 's1').target1_audio_id, 'legacy1', 'the original recording is not displaced')
})

async function take(voiceId, lineId, tables = fixture()) {
  const uploads = []
  const router = createRecordistRouter({
    getDb: () => stubDb(tables),
    logger: QUIET,
    s3: {},
    handleRecordingUpload: async (innerReq, innerRes) => {
      uploads.push({ voiceId: innerReq.recordistVoiceId, courseCode: innerReq.params.courseCode, role: innerReq.body.metadata.role, metaVoice: innerReq.body.metadata.voiceId })
      innerRes.json({ success: true, s3Key: 'mastered/x.mp3', rawKey: 'raw/x', filing: null })
    },
  })
  const layer = router.stack.find((l) => l.route && l.route.path === '/voice/:voiceId/take' && l.route.methods.post)
  const out = {}
  const settled = new Promise((resolve) => {
    out.res = { status(c) { out.status = c; return out.res }, json(b) { out.body = b; resolve(); return out.res } }
  })
  await layer.route.stack[0].handle({
    params: { voiceId }, query: {}, headers: { 'content-type': 'application/json' }, socket: {},
    method: 'POST', originalUrl: `/voice/${voiceId}/take`,
    body: { lineId, audioData: 'AAAA', mimeType: 'audio/webm' },
  }, out.res)
  await settled
  return { status: out.status, body: out.body, uploads }
}

test('the take route: an English castOn known line is accepted and filed as the English voice', async () => {
  const r = await take(ARAN_ENG, 'seed:n1:known')
  assert.equal(r.status, undefined, `expected 200, got ${r.status} ${JSON.stringify(r.body)}`)
  assert.deepEqual(r.uploads, [{ voiceId: ARAN_ENG, courseCode: 'cym_n_live', role: 'known', metaVoice: ARAN_ENG }])
})

test('the take route: a known side nobody casts is still refused, and the English voice reads no Welsh slot', async () => {
  const welshKnown = await take(ARAN_CYM, 'seed:n1:known')
  assert.equal(welshKnown.status, 403)
  assert.equal(welshKnown.body.reason, 'known_side_live_course')
  const jpn = await take(ARAN_ENG, 'seed:j1:known')
  assert.equal(jpn.status, 403, 'a Japanese known side is not English')
  const t2 = await take(ARAN_ENG, 'seed:n1:target2')
  assert.equal(t2.status, 403)
  assert.equal(t2.body.reason, 'wrong_language')
  for (const r of [welshKnown, jpn, t2]) assert.deepEqual(r.uploads, [])
})
