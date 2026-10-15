// A LEGO LINE IN THE BOOTH (job #366, Aran 2026-10-14).
// Run with: node services/voice-engine/recordist-lego-line.test.cjs
//
// A LEGO corrected in a sandbox ('ein rhai ni', South S0181L02) loses its
// target1/target2 clips and had no way back into anybody's booth. Now a LEGO
// row of a LEGO-queue course whose target slot is EMPTY is a line for the voice
// cast on that role; one take fills every empty copy of the text, in that
// role's slot only; a live course's LEGO slots are never queued or linked.
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
process.env.CASTING_ACCESS_LEDGER = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lego-line-')), 'casting-access.jsonl')

const test = require('node:test')
const assert = require('node:assert')
const createRecordistRouter = require('./recordist-router.cjs')
const { buildQueue, resolveRecordist, linkLegoTake, parseLegoLineId, legoLineId } = require('./recordist-queue.cjs')

const DAN = 'human_dan_cym_s'
const ELERI = 'human_eleri_cym_s'
const SV2 = 'cym_sv2_for_eng'
const QUIET = { log() {}, info() {}, warn() {}, error() {} }

function lego(id, course, seed, idx, target, known, extra = {}) {
  return {
    id, course_code: course, seed_number: seed, lego_index: idx,
    lego_id: `S${String(seed).padStart(4, '0')}L${String(idx).padStart(2, '0')}`,
    is_new: true, target_text: target, known_text: known,
    target1_audio_id: null, target2_audio_id: null, presentation_audio_id: null,
    ...extra,
  }
}

function fixture() {
  return {
    language_recording_policy: [
      { language: 'cym', human_only: true, voices: {
        'm:south': { name: 'Dan', gender: 'm', dialect: 'south', voiceId: DAN,
          castOn: [{ courseCode: 'cym_s_live', role: 'target1' }] },
        'f:south': { name: 'Eleri', gender: 'f', dialect: 'south', voiceId: ELERI },
      } },
    ],
    dashboard_users: [],
    courses: [
      { course_code: SV2, target_lang: 'cym', known_lang: 'eng', dialect: 'south',
        voice_config: { voices: { target1: { provider: 'human', voiceId: DAN }, target2: { provider: 'human', voiceId: ELERI } } } },
      // Live South: Dan reads its empty seed slots by castOn — never its LEGOs.
      { course_code: 'cym_s_live', target_lang: 'cym', known_lang: 'eng', dialect: 'south', voice_config: null },
    ],
    listening_pods: [],
    listening_pod_sentences: [],
    course_running_order: [
      { course_code: SV2, seed_number: 190, position: 1 },
      { course_code: SV2, seed_number: 181, position: 2 },
    ],
    course_seeds: [
      { id: 's181', course_code: SV2, seed_number: 181, status: 'draft', target_text: 'Trafod ein rhai ni', known_text: 'To discuss ours', target1_audio_id: 'x1', target2_audio_id: 'x2', known_audio_id: null },
      { id: 's190', course_code: SV2, seed_number: 190, status: 'draft', target_text: 'Ein rhai ni yw e', known_text: 'It is ours', target1_audio_id: 'x3', target2_audio_id: 'x4', known_audio_id: null },
      { id: 's200', course_code: SV2, seed_number: 200, status: 'draft', target_text: 'Heb ei weini', known_text: 'Not served', target1_audio_id: 'x5', target2_audio_id: 'x6', known_audio_id: null },
      { id: 'live1', course_code: 'cym_s_live', seed_number: 1, status: 'released', target_text: 'Shwmae', known_text: 'Hi', target1_audio_id: 'x7', target2_audio_id: null, known_audio_id: null },
    ],
    course_legos: [
      lego('l181a', SV2, 181, 1, 'trafod', 'to discuss', { target1_audio_id: 'old1', target2_audio_id: 'old2' }),
      // THE CASE: corrected, both target slots emptied, presentation relinked.
      lego('l181b', SV2, 181, 2, 'ein rhai ni', 'ours', { presentation_audio_id: 'pres1' }),
      // The same text again, a repeat in an earlier-served seed: one take fills both.
      lego('l190a', SV2, 190, 1, 'ein rhai ni', 'ours', { is_new: false }),
      // Dan's slot filled, Eleri's empty: Eleri's line only.
      lego('l190b', SV2, 190, 2, 'yw e', 'it is', { target1_audio_id: 'dan_old' }),
      // A seed the course does not serve (draft, not in the running order).
      lego('l200a', SV2, 200, 1, 'heb ei weini', 'not served'),
      // A LIVE course's empty LEGO slot: never queued.
      lego('llive', 'cym_s_live', 1, 1, 'shwmae', 'hi'),
    ],
    course_audio: [],
    course_practice_phrases: [],
    phrase_proof_flags: [],
  }
}

/** A stub supabase whose updates honour every filter (including `.is(col, null)`). */
function stubDb(tables) {
  return {
    tables,
    from(table) {
      const all = tables[table] || (tables[table] = [])
      const filters = []
      let patch = null
      const run = () => {
        const rows = all.filter((r) => filters.every((f) => f(r)))
        if (patch) for (const r of rows) Object.assign(r, patch)
        return { data: rows.map((r) => ({ ...r })), error: null }
      }
      const q = {
        select() { return q },
        update(p) { patch = p; return q },
        eq(col, val) { filters.push((r) => r[col] === val); return q },
        in(col, vals) { filters.push((r) => vals.includes(r[col])); return q },
        is(col, val) { filters.push((r) => (val === null ? r[col] == null : r[col] === val)); return q },
        not(col, op, val) { if (op === 'is' && val === null) filters.push((r) => r[col] != null); return q },
        gte(col, val) { filters.push((r) => r[col] >= val); return q },
        lt(col, val) { filters.push((r) => r[col] < val); return q },
        ilike(col, val) { const w = String(val).toLowerCase(); filters.push((r) => String(r[col] || '').toLowerCase() === w); return q },
        order() { return q },
        limit(n) { const out = run(); return Promise.resolve({ data: out.data.slice(0, n), error: null }) },
        range(from, to) { const out = run(); return Promise.resolve({ data: out.data.slice(from, to + 1), error: null }) },
        maybeSingle() { const out = run(); return Promise.resolve({ data: out.data[0] || null, error: null }) },
        then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject) },
      }
      return q
    },
  }
}

test('lego line ids round-trip, target roles only', () => {
  assert.deepEqual(parseLegoLineId(legoLineId('l181b', 'target2')), { legoRowId: 'l181b', role: 'target2' })
  assert.equal(parseLegoLineId('lego:l181b:known'), null)
  assert.equal(parseLegoLineId('seed:l181b:target1'), null)
})

test("Dan's queue: one target1 LEGO line per empty text, in course order; live and unserved LEGOs are not his", async () => {
  const db = stubDb(fixture())
  const dan = await resolveRecordist(db, DAN)
  const q = await buildQueue(db, dan)
  const legos = q.lines.filter((l) => l.kind === 'lego')
  assert.deepEqual(legos.map((l) => `${l.role}:${l.text}`), ['target1:ein rhai ni'])
  const line = legos[0]
  // Seed 190 is served first, so its copy is the representative; 181 rides along.
  assert.equal(line.id, 'lego:l190a:target1')
  assert.equal(line.alsoFills, 1)
  assert.equal(line.courseCode, SV2)
  assert.equal(line.legoId, 'S0190L01')
  assert.equal(line.knownText, 'ours')
  assert.equal(line.recorded, false)
  assert.equal(line.canEditText, false)
  assert.equal(line.readStyle, 'natural')
})

test("Eleri's queue: target2 lines, including the LEGO whose target1 is already filled", async () => {
  const db = stubDb(fixture())
  const eleri = await resolveRecordist(db, ELERI)
  const q = await buildQueue(db, eleri)
  assert.deepEqual(q.lines.filter((l) => l.kind === 'lego').map((l) => `${l.role}:${l.text}`),
    ['target2:ein rhai ni', 'target2:yw e'])
})

test('a LEGO take fills every EMPTY copy of its text, in its own role slot only', async () => {
  const tables = fixture()
  const db = stubDb(tables)
  const dan = await resolveRecordist(db, DAN)
  const out = await linkLegoTake({ db, recordist: dan, legoRowId: 'l181b', role: 'target1', audioId: 'dan_new', logger: QUIET })
  assert.deepEqual(out.linked.map((l) => l.legoRowId).sort(), ['l181b', 'l190a'])
  const byId = new Map(tables.course_legos.map((l) => [l.id, l]))
  assert.equal(byId.get('l181b').target1_audio_id, 'dan_new')
  assert.equal(byId.get('l190a').target1_audio_id, 'dan_new')
  assert.equal(byId.get('l181b').target2_audio_id, null, "Eleri's slot is untouched")
  assert.equal(byId.get('l181b').presentation_audio_id, 'pres1', 'the presentation clip is untouched')
  assert.equal(byId.get('l181a').target1_audio_id, 'old1', 'a different text is untouched')

  // And the line has left his OUTSTANDING queue (job #791: it stays on the full list, recorded).
  tables.course_audio.push({ id: 'dan_new', voice_id: DAN })
  const q = await buildQueue(stubDb(tables), await resolveRecordist(stubDb(tables), DAN))
  assert.equal(q.lines.some((l) => l.kind === 'lego'), false)
})

// ── job #791 (Aran, 2026-10-15): "it shows me as NOT having recorded any of the batches" ──
test('a LEGO filled by the cast voice stays on the full list as RECORDED, so its section can count it', async () => {
  const tables = fixture()
  const before = await buildQueue(stubDb(tables), await resolveRecordist(stubDb(tables), DAN), { includeRecorded: true })
  const beforeLegos = before.lines.filter((l) => l.kind === 'lego')
  assert.equal(beforeLegos.length, 1)
  assert.equal(beforeLegos[0].recorded, false)

  const dan = await resolveRecordist(stubDb(tables), DAN)
  await linkLegoTake({ db: stubDb(tables), recordist: dan, legoRowId: 'l181b', role: 'target1', audioId: 'dan_new', logger: QUIET })
  tables.course_audio.push({ id: 'dan_new', voice_id: DAN })

  const after = await buildQueue(stubDb(tables), await resolveRecordist(stubDb(tables), DAN), { includeRecorded: true })
  const legos = after.lines.filter((l) => l.kind === 'lego')
  assert.deepEqual(legos.map((l) => [l.id, l.recorded]), [['lego:l190a:target1', true]],
    'the same line, same id, now recorded — not gone')
  assert.ok(legos[0].clipUrl, 'and his take can be played back')
  // The home summary counts it: total unchanged, recorded up by one.
  const boothHome = require('./booth-home.cjs')
  const track = boothHome.buildHomeTracks(after.lines, after.phrases, after.phraseBatches).find((t) => t.kind === 'lego')
  assert.equal(track.total, 1)
  assert.equal(track.recorded, 1)
})

test('one silent copy of the text keeps the LEGO line open; a slot held by another voice is still not his', async () => {
  const tables = fixture()
  // Seed 190's copy is his take, seed 181's copy is still empty.
  tables.course_legos.find((l) => l.id === 'l190a').target1_audio_id = 'dan_take'
  // yw e's target1 slot (dan_old) is somebody else's clip: still not work, still not listed.
  tables.course_audio.push({ id: 'dan_take', voice_id: DAN }, { id: 'dan_old', voice_id: 'cartesia_someone' })
  const q = await buildQueue(stubDb(tables), await resolveRecordist(stubDb(tables), DAN), { includeRecorded: true })
  const legos = q.lines.filter((l) => l.kind === 'lego')
  assert.deepEqual(legos.map((l) => [l.text, l.recorded]), [['ein rhai ni', false]])
})

test('a re-read of a recorded LEGO moves his own slot to the new take, and never anybody else’s', async () => {
  const tables = fixture()
  tables.course_legos.find((l) => l.id === 'l190a').target1_audio_id = 'dan_take'
  tables.course_legos.find((l) => l.id === 'l181b').target1_audio_id = 'other_take'
  tables.course_audio.push({ id: 'dan_take', voice_id: DAN }, { id: 'other_take', voice_id: 'cartesia_someone' })
  const dan = await resolveRecordist(stubDb(tables), DAN)
  const out = await linkLegoTake({ db: stubDb(tables), recordist: dan, legoRowId: 'l190a', role: 'target1', audioId: 'dan_again', logger: QUIET })
  assert.deepEqual(out.linked.map((l) => l.legoRowId), ['l190a'])
  const byId = new Map(tables.course_legos.map((l) => [l.id, l]))
  assert.equal(byId.get('l190a').target1_audio_id, 'dan_again')
  assert.equal(byId.get('l181b').target1_audio_id, 'other_take', "another voice's clip is never moved")
})

test("a LEGO take is refused on another voice's slot and on a live course", async () => {
  const tables = fixture()
  const db = stubDb(tables)
  const eleri = await resolveRecordist(db, ELERI)
  const wrong = await linkLegoTake({ db, recordist: eleri, legoRowId: 'l181b', role: 'target1', audioId: 'e1', logger: QUIET })
  assert.deepEqual(wrong.linked, [])
  const dan = await resolveRecordist(db, DAN)
  const live = await linkLegoTake({ db, recordist: dan, legoRowId: 'llive', role: 'target1', audioId: 'd1', logger: QUIET })
  assert.deepEqual(live.linked, [])
  assert.equal(tables.course_legos.find((l) => l.id === 'llive').target1_audio_id, null)
})

async function take(voiceId, lineId, tables = fixture(), text) {
  const uploads = []
  const router = createRecordistRouter({
    getDb: () => stubDb(tables),
    logger: QUIET,
    s3: {},
    handleRecordingUpload: async (innerReq, innerRes) => {
      uploads.push({ courseCode: innerReq.params.courseCode, ...innerReq.body.metadata })
      innerRes.json({ success: true, s3Key: 'mastered/x.mp3', rawKey: 'raw/x', filing: { courseAudioId: 'filed1' } })
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
    body: { lineId, audioData: 'AAAA', mimeType: 'audio/webm', text },
  }, out.res)
  await settled
  return { status: out.status, body: out.body, uploads }
}

test('the take route: a LEGO line is filed as the cast voice and linked into its slot', async () => {
  const tables = fixture()
  const r = await take(DAN, 'lego:l181b:target1', tables, 'ein rhai ni')
  assert.equal(r.status, undefined, `expected 200, got ${r.status} ${JSON.stringify(r.body)}`)
  assert.equal(r.body.kind, 'lego')
  assert.equal(r.body.alsoFilled, 1)
  assert.equal(r.uploads.length, 1)
  assert.equal(r.uploads[0].courseCode, SV2)
  assert.equal(r.uploads[0].legoId, 'S0181L02')
  assert.equal(r.uploads[0].voiceId, DAN)
  assert.equal(tables.course_legos.find((l) => l.id === 'l181b').target1_audio_id, 'filed1')
})

test('the take route refuses: the other voice, a live course, changed text', async () => {
  const eleri = await take(ELERI, 'lego:l181b:target1')
  assert.equal(eleri.status, 403)
  assert.equal(eleri.body.reason, 'not_your_slot')
  const live = await take(DAN, 'lego:llive:target1')
  assert.equal(live.status, 403)
  assert.equal(live.body.reason, 'lego_course_not_queued')
  const stale = await take(DAN, 'lego:l181b:target1', fixture(), 'ein rhai')
  assert.equal(stale.status, 409)
  for (const r of [eleri, live, stale]) assert.deepEqual(r.uploads, [])
})
