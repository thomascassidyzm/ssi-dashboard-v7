// AN INTRODUCTION READ WHOLE BECOMES THE LEGO'S INTRO (Aran, 2026-10-29, job #587). Proved through the real take route
// with a stub database that reads and writes: Aran's English voice records `introsentence:<legoRowId>`; the take is
// handed to the upload seam as a PRESENTATION clip under the intro text, in his voice, with the plain words for the
// checks; then it fills the empty North slot and replaces his own spliced intro in the South slot (the same words,
// folded), while a LEGO whose intro is another voice's is never touched. Nothing is deleted.
// Run: node services/voice-engine/intro-sentence-take.test.cjs
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
process.env.CASTING_ACCESS_LEDGER = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'intro-take-')), 'casting-access.jsonl')

const test = require('node:test')
const assert = require('node:assert')
const createRecordistRouter = require('./recordist-router.cjs')
const { buildQueue, resolveRecordist, invalidateIntroSentenceInputs } = require('./recordist-queue.cjs')

const ARAN_ENG = 'human_aran_eng'
const QUIET = { log() {}, info() {}, warn() {}, error: (...a) => process.env.DEBUG_INTRO && console.error(...a) }
const TAKE_ID = '0a0b0c0d-1111-4222-8333-444455556666' // link-clip takes course_audio uuids only
const INTRO = 'The Welsh for <src>I want</src> is <tgt>dw i isio</tgt>.'

const lego = (id, course_code, seed_number, lego_index, known_text, target_text, extra = {}) => ({
  id, course_code, seed_number, lego_index, lego_id: `S${String(seed_number).padStart(4, '0')}L${String(lego_index).padStart(2, '0')}`,
  known_text, target_text, is_new: true, presentation_audio_id: null, known_audio_id: null, target1_audio_id: null, target2_audio_id: null, ...extra,
})

function fixture() {
  return {
    language_recording_policy: [
      { language: 'eng', human_only: false, voices: {
        'm:known': { name: 'Aran', gender: 'm', voiceId: ARAN_ENG, onlyCastOn: true, castOn: [
          { courseCode: 'cym_nv2_for_eng', role: 'known' },
          { courseCode: 'cym_sv2_for_eng', role: 'known' },
        ] },
      } },
    ],
    dashboard_users: [],
    courses: [
      { course_code: 'cym_nv2_for_eng', target_lang: 'cym', known_lang: 'eng', dialect: 'north', content_version: '1.0.0', voice_config: null },
      { course_code: 'cym_sv2_for_eng', target_lang: 'cym', known_lang: 'eng', dialect: 'south', content_version: '1.0.0', voice_config: null },
    ],
    course_seeds: [],
    course_practice_phrases: [],
    course_legos: [
      lego('n1', 'cym_nv2_for_eng', 1, 1, 'I want', 'dw i isio'),
      lego('s1', 'cym_sv2_for_eng', 1, 1, 'I want', 'dw i isio', { presentation_audio_id: 'aran-splice' }),
      lego('n2', 'cym_nv2_for_eng', 1, 2, 'today', 'heddiw', { presentation_audio_id: 'charlotte-intro' }),
    ],
    course_audio: [
      // A real take of his, of something else: it must still be there, untouched, afterwards.
      { id: 'real-take', course_code: 'cym_nv2_for_eng', voice_id: ARAN_ENG, language: 'eng', role: 'known', origin: 'human', text: 'I want', text_normalized: 'i want', s3_key: 'mastered/real.mp3' },
      { id: 'aran-splice', course_code: 'cym_sv2_for_eng', voice_id: ARAN_ENG, language: 'eng', role: 'presentation', origin: 'human', text: INTRO, spliced_from: [{ kind: 'fragment' }], s3_key: 'mastered/splice.mp3' },
      { id: 'charlotte-intro', course_code: 'cym_nv2_for_eng', voice_id: 'charlotte', language: 'eng', role: 'presentation', origin: 'tts', text: 'The Welsh for today…', s3_key: 'mastered/c.mp3' },
    ],
  }
}

/** A stub supabase that reads and WRITES; filters are applied when the query is awaited, as PostgREST does. */
function stubDb(tables, writes) {
  return {
    from(table) {
      const all = tables[table] || (tables[table] = [])
      const filters = []
      let op = 'read', patch = null
      const rowsNow = () => all.filter((r) => filters.every((f) => f(r)))
      const run = () => {
        const rows = rowsNow()
        if (op === 'update') {
          for (const r of rows) Object.assign(r, patch)
          writes.push({ table, patch, ids: rows.map((r) => r.id) })
        }
        return { data: rows, error: null }
      }
      const q = {
        select() { return q },
        update(p) { op = 'update'; patch = p; return q },
        eq(col, val) { filters.push((r) => r[col] === val); return q },
        in(col, vals) { filters.push((r) => vals.includes(r[col])); return q },
        is(col, val) { filters.push((r) => (val === null ? r[col] == null : r[col] === val)); return q },
        not(col, o, val) { if (o === 'is' && val === null) filters.push((r) => r[col] != null); return q },
        ilike(col, val) { const w = String(val).toLowerCase(); filters.push((r) => String(r[col] || '').toLowerCase() === w); return q },
        filter() { return q },
        order() { return q },
        limit(n) { return Promise.resolve({ data: rowsNow().slice(0, n), error: null }) },
        range(from, to) { return Promise.resolve({ data: rowsNow().slice(from, to + 1), error: null }) },
        maybeSingle() { return Promise.resolve({ data: rowsNow()[0] || null, error: null }) },
        single() { const r = run(); return Promise.resolve({ data: r.data[0] || null, error: null }) },
        then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject) },
      }
      return q
    },
  }
}

async function take(lineId, text, tables, writes) {
  const uploads = []
  const router = createRecordistRouter({
    getDb: () => stubDb(tables, writes),
    logger: QUIET,
    s3: {},
    handleRecordingUpload: async (innerReq, innerRes) => {
      uploads.push({ courseCode: innerReq.params.courseCode, metadata: innerReq.body.metadata, ownVoice: innerReq.libraryArtistVoiceId || null })
      // What the real seam does with this metadata (script-take-filing.cjs): a NEW presentation clip row of his voice.
      tables.course_audio.push({ id: TAKE_ID, course_code: innerReq.params.courseCode, voice_id: ARAN_ENG, language: 'eng', role: 'presentation', origin: 'human', text: innerReq.body.metadata.text, s3_key: 'mastered/take.mp3' })
      innerRes.json({ success: true, s3Key: 'mastered/take.mp3', rawKey: 'raw/take', filing: { filed: true, courseAudioId: TAKE_ID } })
    },
  })
  const layer = router.stack.find((l) => l.route && l.route.path === '/voice/:voiceId/take' && l.route.methods.post)
  const out = {}
  const settled = new Promise((resolve) => {
    out.res = { status(c) { out.status = c; return out.res }, json(b) { out.body = b; resolve(); return out.res }, on() {}, setHeader() {} }
  })
  await layer.route.stack[0].handle({
    params: { voiceId: ARAN_ENG }, query: {}, headers: { 'content-type': 'application/json' }, socket: {},
    method: 'POST', originalUrl: `/voice/${ARAN_ENG}/take`,
    body: { lineId, text, audioData: 'AAAA', mimeType: 'audio/webm' },
  }, out.res)
  await settled
  return { status: out.status, body: out.body, uploads }
}

test('his English booth carries ONE Introductions card: North and South folded, another voice\'s intro left off', async () => {
  invalidateIntroSentenceInputs()
  const tables = fixture()
  const db = stubDb(tables, [])
  const aran = await resolveRecordist(db, ARAN_ENG)
  const q = await buildQueue(db, aran, { includeRecorded: true })
  const intros = q.lines.filter((l) => l.kind === 'introsentence')
  assert.deepEqual(intros.map((l) => [l.id, l.text, l.alsoFills, l.recorded]), [['introsentence:n1', INTRO, 1, false]])
  assert.equal(q.lines.some((l) => l.kind === 'intro' || (l.kind === 'lego' && l.role === 'known')), false, 'the splice cards are gone')
})

test('the take is filed as the LEGO intro and linked into every copy; real takes and other voices are untouched', async () => {
  invalidateIntroSentenceInputs()
  const tables = fixture()
  const writes = []
  const r = await take('introsentence:n1', INTRO, tables, writes)
  assert.equal(r.status, undefined, `expected 200, got ${r.status} ${JSON.stringify(r.body)}`)
  assert.equal(r.uploads.length, 1)
  const u = r.uploads[0]
  assert.equal(u.courseCode, 'cym_nv2_for_eng')
  assert.equal(u.ownVoice, ARAN_ENG, 'filed under his voice whatever the slot casts')
  assert.deepEqual({ role: u.metadata.role, kind: u.metadata.kind, text: u.metadata.text, spokenText: u.metadata.spokenText },
    { role: 'presentation', kind: 'intro-sentence', text: INTRO, spokenText: 'The Welsh for I want is dw i isio.' })
  assert.equal(r.body.introLinked, 2)
  const byId = new Map(tables.course_legos.map((l) => [l.id, l]))
  assert.equal(byId.get('n1').presentation_audio_id, TAKE_ID, 'the empty North slot is filled')
  assert.equal(byId.get('s1').presentation_audio_id, TAKE_ID, 'his South splice is replaced by the whole-sentence take')
  assert.equal(byId.get('n2').presentation_audio_id, 'charlotte-intro', 'another voice\'s intro is never displaced')
  const ids = tables.course_audio.map((a) => a.id).sort()
  assert.deepEqual(ids, [TAKE_ID, 'aran-splice', 'charlotte-intro', 'real-take'].sort(), 'no clip is deleted')
  assert.equal(tables.course_audio.find((a) => a.id === 'real-take').s3_key, 'mastered/real.mp3')
  assert.ok(writes.every((w) => w.table !== 'course_audio' || w.ids.every((id) => id === TAKE_ID)), 'only the new take\'s row is written')
  assert.deepEqual(tables.courses.map((c) => c.content_version), ['1.0.1', '1.0.1'], 'phones see the new intro')
})

test('a stale line text is refused before anything is stored; a line that is not his is 404', async () => {
  invalidateIntroSentenceInputs()
  const tables = fixture()
  const stale = await take('introsentence:n1', 'The Welsh for <src>I want</src> is <tgt>rydw i eisiau</tgt>.', tables, [])
  assert.equal(stale.status, 409)
  assert.deepEqual(stale.uploads, [])
  const nope = await take('introsentence:nope', INTRO, tables, [])
  assert.equal(nope.status, 404)
  assert.deepEqual(nope.uploads, [])
})
