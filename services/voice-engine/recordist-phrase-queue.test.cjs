// PRACTICE PHRASES IN THE BOOTH, two passes, in batches — and the switch on a
// slot held only by synthetic speech (job #619, Aran 2026-10-13).
// Run with: node services/voice-engine/recordist-phrase-queue.test.cjs
//
//   - Pass 1 is what the PLAYER plays first per new LEGO: the shortest 4 build and
//     3 use phrases, never the debut's own text. Pass 2 is the rest, served only
//     once pass 1 is read.
//   - Batches are runs of seeds in running order, one cut every voice of a course
//     shares; a reader is served one batch, with the words to say so.
//   - Deduped by exact text; FILL-EMPTY ONLY — a slot already holding somebody
//     else's clip is never work and never overwritten.
//   - Live courses' phrases are never queued or recorded here.
//   - castOn `synthetic: 'queue'` (+ syntheticSeeds) QUEUES a TTS-held or #606-emptied
//     seed slot for Aran. Linking is untouched: live replacement is Tom's job #621.
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
process.env.CASTING_ACCESS_LEDGER = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'phrase-q-')), 'casting-access.jsonl')

const test = require('node:test')
const assert = require('node:assert')
const pq = require('./phrase-queue.cjs')
const createRecordistRouter = require('./recordist-router.cjs')
const { buildQueue, resolveRecordist, linkSeedTake, linkPhraseTake } = require('./recordist-queue.cjs')

const CATRIN = 'human_catrinlliar_cym_n'
const ARAN_CYM = 'human_aran_cym_n'
const ARAN_ENG = 'human_aran_eng'
const DAN = 'human_dan_cym_s'
const QUIET = { log() {}, info() {}, warn() {}, error() {} }
const N = 'cym_nv2_for_eng'
const S = 'cym_sv2_for_eng'

/** A stub supabase: filters collected, applied when awaited, so update().eq().is() is conditional like PostgREST. */
function stubDb(tables, writes = []) {
  return {
    tables,
    from(table) {
      const all = tables[table] || (tables[table] = [])
      const filters = []
      let patch = null
      let single = false
      let window = null
      const run = () => {
        let rows = all.filter((r) => filters.every((f) => f(r)))
        if (patch) {
          for (const r of rows) Object.assign(r, patch)
          writes.push({ table, patch, ids: rows.map((r) => r.id) })
        }
        if (window) rows = rows.slice(window[0], window[1] + 1)
        return { data: single ? (rows[0] || null) : rows, error: null }
      }
      const q = {
        select() { return q },
        update(p) { patch = p; return q },
        eq(col, val) { filters.push((r) => r[col] === val); return q },
        in(col, vals) { filters.push((r) => vals.includes(r[col])); return q },
        is(col, val) { filters.push((r) => (val === null ? r[col] == null : r[col] === val)); return q },
        gte(col, val) { filters.push((r) => r[col] >= val); return q },
        lt(col, val) { filters.push((r) => r[col] < val); return q },
        not(col, op, val) { if (op === 'is' && val === null) filters.push((r) => r[col] != null); return q },
        ilike(col, val) { const w = String(val).toLowerCase(); filters.push((r) => String(r[col] || '').toLowerCase() === w); return q },
        order() { return q },
        limit(n) { window = [0, n - 1]; return q },
        range(from, to) { window = [from, to]; return q },
        maybeSingle() { single = true; return Promise.resolve(run()) },
        then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject) },
      }
      return q
    },
  }
}

function phrase(course, seedN, lego, pos, role, target, known, extra = {}) {
  const tag = { build: 'B', use: 'U', component: 'C' }[role]
  return {
    id: `${course}:S${String(seedN).padStart(4, '0')}L${String(lego).padStart(2, '0')}${tag}${String(pos).padStart(2, '0')}`,
    course_code: course, seed_number: seedN, lego_index: lego, position: pos, phrase_role: role,
    target_text: target, known_text: known,
    known_audio_id: null, target1_audio_id: null, target2_audio_id: null,
    ...extra,
  }
}

function fixture() {
  return {
    language_recording_policy: [
      { language: 'cym', human_only: true, voices: {
        f: { name: 'Catrin', voiceId: CATRIN, dialect: 'north' },
        m: { name: 'Aran', voiceId: ARAN_CYM, dialect: 'north' },
        'm:south': { name: 'Dan', gender: 'm', dialect: 'south', voiceId: DAN },
      } },
      { language: 'eng', human_only: false, voices: {
        'm:known': { name: 'Aran', gender: 'm', voiceId: ARAN_ENG, onlyCastOn: true, castOn: [
          { courseCode: N, role: 'known' }, { courseCode: S, role: 'known' },
        ] },
      } },
    ],
    dashboard_users: [],
    courses: [
      { course_code: N, target_lang: 'cym', known_lang: 'eng', dialect: 'north',
        voice_config: { voices: { target1: { voiceId: CATRIN }, target2: { voiceId: ARAN_CYM } } } },
      { course_code: S, target_lang: 'cym', known_lang: 'eng', dialect: 'south',
        voice_config: { voices: { target1: { voiceId: DAN } } } },
      // A LIVE course cast to the same readers: its phrases must never be queued.
      { course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', dialect: 'north',
        voice_config: { voices: { target1: { voiceId: CATRIN }, target2: { voiceId: ARAN_CYM } } } },
    ],
    listening_pods: [],
    listening_pod_sentences: [],
    course_seeds: [],
    // Seed 1001 is served FIRST, then seed 2. Seed 3 is not served.
    course_running_order: [
      { course_code: N, seed_number: 1001, position: 1 },
      { course_code: N, seed_number: 2, position: 2 },
      { course_code: S, seed_number: 1001, position: 1 },
    ],
    course_legos: [
      { course_code: N, seed_number: 1001, lego_index: 1, is_new: true, target_text: 'mor aml', known_text: 'as often' },
      { course_code: N, seed_number: 1001, lego_index: 2, is_new: false, target_text: 'siarad', known_text: 'to speak' },
      { course_code: N, seed_number: 2, lego_index: 1, is_new: true, target_text: 'heno', known_text: 'tonight' },
      { course_code: N, seed_number: 3, lego_index: 1, is_new: true, target_text: 'yfory', known_text: 'tomorrow' },
      { course_code: S, seed_number: 1001, lego_index: 1, is_new: true, target_text: 'mor aml', known_text: 'as often' },
    ],
    course_practice_phrases: [
      // S1001 L01 (new): 6 builds, 5 uses, one component. Syllables decide the order.
      phrase(N, 1001, 1, 1, 'build', 'mor aml', 'as often'),                                  // the debut's own text: never played
      phrase(N, 1001, 1, 2, 'build', 'siarad mor aml â phosib heddiw', 'to speak as often as possible today'),
      phrase(N, 1001, 1, 3, 'build', 'mor aml rŵan', 'as often now'),
      phrase(N, 1001, 1, 4, 'build', 'ymarfer mor aml', 'to practise as often'),
      phrase(N, 1001, 1, 5, 'build', 'mor aml heno', 'as often tonight'),
      phrase(N, 1001, 1, 6, 'build', 'dw i isio ymarfer mor aml â phosib', 'I want to practise as often as possible'),
      phrase(N, 1001, 1, 7, 'build', 'mor aml yma', 'as often here', { target1_audio_id: 'legacy_t1' }), // Catrin's slot held by an original
      phrase(N, 1001, 1, 8, 'use', 'dw i isio siarad mor aml â phosib', 'I want to speak as often as possible'),
      phrase(N, 1001, 1, 9, 'use', 'mor aml â hynny', 'as often as that'),
      phrase(N, 1001, 1, 10, 'use', 'fedra i ddim mor aml', "I can't as often"),
      phrase(N, 1001, 1, 11, 'use', 'mor aml rŵan', 'as often now'),                           // same text as a build: one line
      phrase(N, 1001, 1, 12, 'use', 'rhaid i mi ymarfer siarad mor aml â phosib heno', 'I must practise speaking as often as possible tonight'),
      phrase(N, 1001, 1, 13, 'component', 'aml', 'often'),
      // S1001 L02 is NOT new: its phrases are not queued.
      phrase(N, 1001, 2, 1, 'build', 'siarad heno', 'to speak tonight'),
      // S0002 L01 (new), served second.
      phrase(N, 2, 1, 1, 'build', 'heno dw i', 'tonight I'),
      phrase(N, 2, 1, 2, 'use', 'mor aml heno', 'as often tonight'),                           // a pass-1 text of seed 1001: same line
      // S0003 is not in the running order.
      phrase(N, 3, 1, 1, 'build', 'yfory dw i', 'tomorrow I'),
      // South: the English "as often now" is read once for both courses.
      phrase(S, 1001, 1, 1, 'build', 'mor aml nawr', 'as often now'),
      // Live course phrase, empty, cast to Catrin: never a phrase line.
      phrase('cym_n_for_eng', 1001, 1, 1, 'build', 'mor aml byw', 'as often live'),
    ],
    phrase_proof_flags: [],
    course_audio: [
      { id: 'legacy_t1', voice_id: 'legacy_import', language: 'cym', role: 'target1', origin: 'human', text_normalized: 'mor aml yma' },
    ],
  }
}

test('pass 1 is what the player plays first: the shortest 4 build and 3 use phrases, never the debut', () => {
  const t = fixture()
  const lego = t.course_legos[0]
  const ps = t.course_practice_phrases.filter((p) => p.course_code === N && p.seed_number === 1001 && p.lego_index === 1)
  const { pass1, pass2, unplayed } = pq.splitLegoPhrases(lego, ps)
  assert.deepEqual(unplayed.map((p) => p.target_text).sort(), ['mor aml', 'mor aml rŵan'].sort(),
    'the debut text and a use already claimed by a build never play')
  assert.deepEqual(pass1.filter((p) => p.phrase_role === 'build').map((p) => p.target_text),
    ['mor aml rŵan', 'mor aml heno', 'mor aml yma', 'ymarfer mor aml'], 'four builds, shortest first, stable on position')
  assert.deepEqual(pass1.filter((p) => p.phrase_role === 'use').map((p) => p.target_text),
    ['mor aml â hynny', 'fedra i ddim mor aml', 'dw i isio siarad mor aml â phosib'], 'three uses, shortest first')
  assert.deepEqual(pass2.map((p) => p.target_text).sort(), [
    'dw i isio ymarfer mor aml â phosib', 'rhaid i mi ymarfer siarad mor aml â phosib heno', 'siarad mor aml â phosib heddiw',
  ].sort())
})

test('the batch cut is a run of seeds, shared by every role, closed before any role passes the size', () => {
  const line = (role, position) => ({ role, pass: 1, position })
  const byRole = {
    target1: [line('target1', 1), line('target1', 1), line('target1', 2), line('target1', 3), line('target1', 3)],
    target2: [line('target2', 1), line('target2', 2), line('target2', 2), line('target2', 2), line('target2', 3)],
  }
  const { batchOf, batches } = pq.cutBatches(byRole, ['target1', 'target2'], 1, 3)
  // pos1: t1=2 t2=1; +pos2 would make t2=4 > 3 → new batch; pos2 t1=1 t2=3; +pos3 t1=3 t2=4 → new batch.
  assert.deepEqual([...batchOf.entries()], [[1, 1], [2, 2], [3, 3]])
  assert.equal(batches, 3)
})

test('a Welsh reader is served pass 1, batch 1, in running order, deduped, fill-empty only, live courses never', async () => {
  const db = stubDb(fixture())
  const catrin = await resolveRecordist(db, CATRIN)
  const q = await buildQueue(db, catrin, { includeRecorded: true })
  const lines = q.lines.filter((l) => l.kind === 'phrase')
  assert.deepEqual(lines.map((l) => l.text), [
    'mor aml rŵan', 'mor aml heno', 'ymarfer mor aml',
    'mor aml â hynny', 'fedra i ddim mor aml', 'dw i isio siarad mor aml â phosib',
    'heno dw i',
  ], 'S1001 first (running order), then S0002; "mor aml yma" is an original\'s slot; "mor aml heno" read once')
  assert.ok(lines.every((l) => l.courseCode === N), 'no live-course phrase, no South phrase')
  assert.ok(lines.every((l) => l.phrasePass === 1 && l.phraseBatch === 1 && l.role === 'target1'))
  assert.equal(lines.find((l) => l.text === 'mor aml heno').alsoFills, 1, 'one take fills the S0002 use copy too')
  assert.equal(q.phrases.pass, 1)
  assert.equal(q.phrases.passes, 2)
  assert.equal(q.phrases.batch, 1)
  assert.equal(q.phrases.batches, 1)
  assert.equal(q.phrases.courseLabel, 'North')
  assert.equal(q.phrases.laterPassLines, 3, 'the reader is told how many phrases the second pass holds')
  assert.equal(lines.some((l) => /yfory/.test(l.text)), false, 'an unserved seed is not queued')
})

test('pass 2 opens only once pass 1 is read; a flagged phrase is held, not served', async () => {
  const t = fixture()
  // Every pass-1 text of Catrin's already has a take by her.
  for (const text of ['mor aml rŵan', 'mor aml heno', 'ymarfer mor aml', 'mor aml â hynny', 'fedra i ddim mor aml', 'dw i isio siarad mor aml â phosib', 'heno dw i']) {
    t.course_audio.push({ id: `c_${text}`, voice_id: CATRIN, language: 'cym', role: 'target1', origin: 'human', text_normalized: text })
  }
  t.phrase_proof_flags.push({ course_code: N, phrase_id: `${N}:S1001L01B02`, flagged: true })
  const db = stubDb(t)
  const q = await buildQueue(db, await resolveRecordist(db, CATRIN), { includeRecorded: true })
  const lines = q.lines.filter((l) => l.kind === 'phrase')
  assert.equal(q.phrases.pass, 2)
  assert.deepEqual(lines.map((l) => l.text).sort(), ['dw i isio ymarfer mor aml â phosib', 'rhaid i mi ymarfer siarad mor aml â phosib heno'].sort(),
    'the flagged "siarad mor aml â phosib heddiw" is held back')
  assert.equal(q.phrases.batchHeld, 1)
  assert.equal(q.phrases.passRecorded[1], 7)
})

test('the English known side is one line per text across North and South', async () => {
  const db = stubDb(fixture())
  const aran = await resolveRecordist(db, ARAN_ENG)
  const q = await buildQueue(db, aran, { includeRecorded: true })
  const lines = q.lines.filter((l) => l.kind === 'phrase')
  assert.ok(lines.every((l) => l.role === 'known'))
  const asOftenNow = lines.find((l) => l.text === 'as often now')
  assert.equal(asOftenNow.courseCode, N, 'North batch 1 is served before South batch 1')
  assert.equal(asOftenNow.alsoFills, 1, 'one take fills the South copy as well')
  assert.equal(lines.some((l) => l.courseCode === S), false, 'South batch 1 waits for North batch 1')
})

test('a phrase take fills EMPTY copies only — a slot that gained a clip is never overwritten', async () => {
  const t = fixture()
  const db = stubDb(t)
  const catrin = await resolveRecordist(db, CATRIN)
  await buildQueue(db, catrin)  // builds the plan
  // The S0002 copy of "mor aml heno" gains somebody's clip after the plan was read.
  const later = t.course_practice_phrases.find((p) => p.id === `${N}:S0002L01U02`)
  later.target1_audio_id = 'someone_else'
  const out = await linkPhraseTake({ db, recordist: catrin, phraseId: `${N}:S1001L01B05`, role: 'target1', audioId: 'catrin_new', logger: QUIET })
  assert.deepEqual(out.linked.map((l) => l.phraseId), [`${N}:S1001L01B05`])
  assert.equal(later.target1_audio_id, 'someone_else')
  assert.equal(t.course_practice_phrases.find((p) => p.id === `${N}:S1001L01B05`).target1_audio_id, 'catrin_new')
})

async function take(voiceId, lineId, tables) {
  const uploads = []
  const router = createRecordistRouter({
    getDb: () => stubDb(tables),
    logger: QUIET,
    s3: {},
    handleRecordingUpload: async (innerReq, innerRes) => {
      uploads.push({ voiceId: innerReq.recordistVoiceId, courseCode: innerReq.params.courseCode, role: innerReq.body.metadata.role, phraseId: innerReq.body.metadata.phraseId })
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

test('the take route: a cast reader records a sandbox phrase; a live phrase and the wrong reader are refused', async () => {
  const ok = await take(CATRIN, `phrase:${N}:S1001L01B03:target1`, fixture())
  assert.equal(ok.status, undefined, `expected 200, got ${ok.status} ${JSON.stringify(ok.body)}`)
  assert.deepEqual(ok.uploads, [{ voiceId: CATRIN, courseCode: N, role: 'target1', phraseId: `${N}:S1001L01B03` }])
  const live = await take(CATRIN, 'phrase:cym_n_for_eng:S1001L01B01:target1', fixture())
  assert.equal(live.status, 403)
  assert.equal(live.body.reason, 'phrase_course_not_queued')
  const wrong = await take(ARAN_CYM, `phrase:${N}:S1001L01B03:target1`, fixture())
  assert.equal(wrong.status, 403)
  assert.equal(wrong.body.reason, 'not_your_slot')
  const eng = await take(ARAN_ENG, `phrase:${S}:S1001L01B01:known`, fixture())
  assert.equal(eng.status, undefined, `expected 200, got ${eng.status} ${JSON.stringify(eng.body)}`)
  for (const r of [live, wrong]) assert.deepEqual(r.uploads, [])
})

// ── TASK B: a live English prompt held only by synthetic speech ─────────────
function syntheticFixture(mode) {
  return {
    language_recording_policy: [
      { language: 'eng', human_only: false, voices: {
        'm:known': { name: 'Aran', gender: 'm', voiceId: ARAN_ENG, onlyCastOn: true, castOn: [
          { courseCode: 'cym_n_for_eng', role: 'known', ...(mode ? { synthetic: mode } : {}) },
        ] },
      } },
    ],
    dashboard_users: [],
    courses: [{ course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', dialect: 'north', voice_config: null }],
    listening_pods: [],
    listening_pod_sentences: [],
    course_running_order: [],
    course_seeds: [
      { id: 'n1', course_code: 'cym_n_for_eng', seed_number: 1, status: 'released', target_text: 'Helo', known_text: 'Hello', known_audio_id: 'tom006', target1_audio_id: null, target2_audio_id: null },
      { id: 'n2', course_code: 'cym_n_for_eng', seed_number: 2, status: 'released', target_text: 'Diolch', known_text: 'Thank you', known_audio_id: 'human_old', target1_audio_id: null, target2_audio_id: null },
    ],
    course_audio: [
      { id: 'tom006', course_code: 'cym_n_for_eng', voice_id: 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9', language: 'eng', role: 'known', origin: 'tts', text_normalized: 'hello', duration_ms: 800 },
      { id: 'human_old', course_code: 'cym_n_for_eng', voice_id: 'legacy_import', language: 'eng', role: 'known', origin: 'human', text_normalized: 'thank you', duration_ms: 800 },
      // Another speaker's human take of "Hello" elsewhere: the synthetic slot is still Aran's work.
      { id: 'other', course_code: 'cym_n_for_eng', voice_id: 'legacy_import', language: 'eng', role: 'known', origin: 'human', text_normalized: 'hello', file_size_bytes: 9000, duration_ms: 800 },
    ],
  }
}

test('synthetic: absent → plain fill-only, the TTS-held slot is nobody\'s work', async () => {
  const db = stubDb(syntheticFixture(null))
  const q = await buildQueue(db, await resolveRecordist(db, ARAN_ENG))
  assert.deepEqual(q.lines.map((l) => l.text), [])
})

test('synthetic: queue → the TTS-held line is queued, the take never moves the slot, and the line then counts as recorded', async () => {
  const t = syntheticFixture('queue')
  const db = stubDb(t)
  const aran = await resolveRecordist(db, ARAN_ENG)
  const q = await buildQueue(db, aran)
  assert.deepEqual(q.lines.map((l) => `${l.role}:${l.text}`), ['known:Hello'], 'a human-held slot is still not work')
  t.course_audio.push({ id: 'aran_hello', course_code: 'cym_n_for_eng', voice_id: ARAN_ENG, language: 'eng', role: 'known', origin: 'human', text_normalized: 'hello' })
  const out = await linkSeedTake({ db, recordist: aran, seedId: 'n1', role: 'known', audioId: 'aran_hello', logger: QUIET })
  assert.deepEqual(out.linked, [], 'switch off: nothing relinked')
  assert.equal(t.course_seeds[0].known_audio_id, 'tom006')
  const after = await buildQueue(stubDb(t), aran)
  assert.deepEqual(after.lines.map((l) => l.text), [], 'recorded by its text: never asked for twice')
})

test('syntheticSeeds: a slot #606 EMPTIED of synthetic speech is queued for Aran, even beside another speaker\'s take', async () => {
  const t = syntheticFixture('queue')
  t.language_recording_policy[0].voices['m:known'].castOn[0].syntheticSeeds = ['n1']
  t.course_seeds[0].known_audio_id = null   // emptied by #606 on Tom's GO
  const db = stubDb(t)
  const q = await buildQueue(db, await resolveRecordist(db, ARAN_ENG))
  assert.deepEqual(q.lines.map((l) => l.text), ['Hello'], 'queued although "other" (legacy) holds a usable take of Hello')

  const plain = syntheticFixture(null)
  plain.course_seeds[0].known_audio_id = null
  const db3 = stubDb(plain)
  const q3 = await buildQueue(db3, await resolveRecordist(db3, ARAN_ENG))
  assert.deepEqual(q3.lines.map((l) => l.text), [], 'without the list, a usable take elsewhere makes it a link, not a line (#588)')
})
