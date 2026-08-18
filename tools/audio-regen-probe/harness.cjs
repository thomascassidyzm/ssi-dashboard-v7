/**
 * Isolated reproduction harness for the "generate re-links the OLD clip" claim.
 *
 * REAL POSTGRES, IN PROCESS. PGlite (@electric-sql/pglite) runs a genuine
 * PostgreSQL server compiled to wasm — the ON CONFLICT resolution, the BEFORE
 * UPDATE triggers and the AFTER INSERT autolink are executed by Postgres itself,
 * not simulated in JS. Nothing here touches the live database, S3, or any TTS
 * provider: `fakeTts()` is the only thing that ever "renders" a clip.
 *
 * The schema comes from tools/audio-regen-probe/schema.sql, dumped verbatim out
 * of the live DB by dump-live-schema.cjs.
 */
const fs = require('fs')
const path = require('path')
const { PGlite } = require('@electric-sql/pglite')

const SCHEMA = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')

const COURSE = 'xxx_for_test'

// ---------------------------------------------------------------------------
// PostgREST upsert semantics, expressed as the SQL supabase-js actually causes.
//
//   .upsert(rows, { onConflict: 'a,b', ignoreDuplicates: true })
//     -> Prefer: resolution=ignore-duplicates  -> INSERT ... ON CONFLICT (a,b) DO NOTHING
//   .upsert(rows, { onConflict: 'a,b' })                    (ignoreDuplicates defaults false)
//     -> Prefer: resolution=merge-duplicates   -> INSERT ... ON CONFLICT (a,b)
//                                                 DO UPDATE SET <every payload column> = EXCLUDED.<col>
// ---------------------------------------------------------------------------
async function upsert(db, table, rows, { onConflict, ignoreDuplicates = false, returning = null } = {}) {
  const list = Array.isArray(rows) ? rows : [rows]
  if (!list.length) return []
  const cols = [...new Set(list.flatMap(r => Object.keys(r)))]
  const values = []
  const tuples = list.map(r => {
    const ph = cols.map(c => { values.push(r[c] === undefined ? null : r[c]); return `$${values.length}` })
    return `(${ph.join(', ')})`
  })
  let sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES ${tuples.join(', ')}`
  if (onConflict) {
    const target = onConflict.split(',').map(s => s.trim())
    sql += ignoreDuplicates
      ? ` ON CONFLICT (${target.join(', ')}) DO NOTHING`
      : ` ON CONFLICT (${target.join(', ')}) DO UPDATE SET ` +
        cols.map(c => `${c} = EXCLUDED.${c}`).join(', ')
  }
  if (returning) sql += ` RETURNING ${returning}`
  const res = await db.query(sql, values)
  return res.rows
}

// ---------------------------------------------------------------------------
// The only "TTS". Deterministic, offline, free.
// ---------------------------------------------------------------------------
let ttsCalls = 0
function fakeTts(text, tag = 'new') {
  ttsCalls++
  const id = `${tag.toUpperCase()}-${String(ttsCalls).padStart(4, '0')}`
  return { s3Key: `mastered/${id}.mp3`, durationMs: 1000 + text.length, ttsCallNumber: ttsCalls }
}
const ttsCallCount = () => ttsCalls
const resetTts = () => { ttsCalls = 0 }

// ---------------------------------------------------------------------------
// normalizeForAudio, as phase8 computes it client-side. Mirrors normalize_text().
// ---------------------------------------------------------------------------
const normalizeForAudio = t => (t || '').trim().toLowerCase().replace(/[.?!¿¡。？！]+$/, '')

// ---------------------------------------------------------------------------
// Replicas of the two phase8 write shapes, kept structurally identical to the
// call sites so a reader can diff them against the file.
// ---------------------------------------------------------------------------

/** phase8-audio-v13.cjs ~2417 — the MAIN /generate render loop. No ignoreDuplicates. */
async function phase8MainGenerateUpsert(db, item) {
  const { s3Key, durationMs } = fakeTts(item.text, item.tag || 'regen')
  const rows = await upsert(db, 'course_audio', {
    course_code: item.courseCode,
    text: item.text,
    text_normalized: normalizeForAudio(item.text),
    language: item.language,
    role: item.role,
    voice_id: item.voiceId,
    origin: 'tts',
    s3_key: s3Key,
    duration_ms: durationMs,
    lego_id: item.lego_id || null,
  }, { onConflict: 'course_code,text_normalized,language,role,voice_id', returning: 'id' })
  return { rows, s3Key }
}

/** phase8-audio-v13.cjs ~3791 (and ~3288, ~3980, ~607) — ignoreDuplicates: true. */
async function phase8IgnoreDuplicatesUpsert(db, item) {
  const { s3Key, durationMs } = fakeTts(item.text, item.tag || 'regen')
  const rows = await upsert(db, 'course_audio', {
    course_code: item.courseCode,
    text: item.text,
    text_normalized: normalizeForAudio(item.text),
    language: item.language,
    role: item.role,
    voice_id: item.voiceId,
    origin: 'tts',
    s3_key: s3Key,
    duration_ms: durationMs,
    lego_id: item.lego_id || null,
  }, {
    onConflict: 'course_code,text_normalized,language,role,voice_id',
    ignoreDuplicates: true,
    returning: 'id',
  })
  return { rows, s3Key }
}

/**
 * getAudioNeeds() Step 1 + Step 2, phase8-audio-v13.cjs 618-795.
 *
 *   Step 1: a slot is a candidate ONLY if its *_audio_id column IS NULL.
 *   Step 2: a candidate whose text already has a course_audio row is classified
 *           `toLink` (bind the existing row, no TTS), otherwise `toGenerate`.
 *
 * The S3 HEAD check of step 2 is replaced by `storageOk`, a caller-supplied
 * predicate — the fixture has no bucket.
 */
async function getAudioNeeds(db, courseCode, { storageOk = () => true, forceGenerate = false } = {}) {
  // courses.known_lang / target_lang are 3-letter estate-wide (146/146 rows), and
  // course_audio.language is canonicalised to the same 3-letter form by the
  // course_audio_canonical_identity trigger — so these keys really do meet.
  const KNOWN = 'eng', TARGET = 'spa'
  const slotDefs = [
    { table: 'course_practice_phrases', textCol: 'known_text', audioCol: 'known_audio_id', role: 'known', lang: KNOWN },
    { table: 'course_practice_phrases', textCol: 'target_text', audioCol: 'target1_audio_id', role: 'target1', lang: TARGET },
    { table: 'course_legos', textCol: 'known_text', audioCol: 'known_audio_id', role: 'known', lang: KNOWN },
    { table: 'course_legos', textCol: 'target_text', audioCol: 'target1_audio_id', role: 'target1', lang: TARGET },
    { table: 'course_seeds', textCol: 'known_text', audioCol: 'known_audio_id', role: 'known', lang: KNOWN },
    { table: 'course_seeds', textCol: 'target_text', audioCol: 'target1_audio_id', role: 'target1', lang: TARGET },
  ]
  const unlinked = []
  for (const s of slotDefs) {
    const r = await db.query(
      `SELECT ${s.textCol} AS text FROM ${s.table} WHERE course_code = $1 AND ${s.audioCol} IS NULL`,
      [courseCode])
    for (const row of r.rows) if (row.text) unlinked.push({ text: row.text, role: s.role, lang: s.lang, table: s.table })
  }
  // getExistingAudioSet(): every course_audio row for this course, keyed the
  // same way the slot is keyed — normalizeText(text)|language|role, phase8:295.
  const ex = await db.query(
    `SELECT id, text, text_normalized, language, role, s3_key FROM course_audio
      WHERE course_code = $1 AND s3_key NOT LIKE 'pending/%'`, [courseCode])
  const existing = new Map()
  for (const a of ex.rows) {
    const key = `${normalizeForAudio(a.text)}|${a.language}|${a.role}`
    if (!existing.has(key)) existing.set(key, a)
  }

  const toLink = [], toGenerate = []
  for (const item of unlinked) {
    const hit = forceGenerate ? null : existing.get(`${normalizeForAudio(item.text)}|${item.lang}|${item.role}`)
    if (hit && storageOk(hit.s3_key)) toLink.push({ ...item, audioId: hit.id, s3Key: hit.s3_key })
    else toGenerate.push(item)
  }
  return { unlinkedCount: unlinked.length, toLink, toGenerate }
}

/**
 * /generate Step A, phase8-audio-v13.cjs:1985 — linkAudioIds(courseCode), which
 * is `supabase.rpc('link_all_audio_ids', ...)`. The function body in schema.sql
 * is pg_get_functiondef output from the live database, so Postgres itself
 * decides which row a NULL slot gets bound to.
 *
 * Returns BOTH the raw jsonb the RPC emits and `loggedTotal` — the number
 * phase8:1396-1399 actually computes from it and shows the operator.
 */
async function linkAudioIdsStepA(db, courseCode) {
  const r = await db.query(`SELECT link_all_audio_ids($1) AS result`, [courseCode])
  const raw = r.rows[0].result
  // phase8:1396-1398, verbatim key names.
  const rpcTotal = (raw.phrases_known || 0) + (raw.phrases_target1 || 0) + (raw.phrases_target2 || 0)
    + (raw.legos_known || 0) + (raw.legos_target1 || 0) + (raw.legos_target2 || 0)
    + (raw.seeds_known || 0) + (raw.seeds_target1 || 0) + (raw.seeds_target2 || 0)
  const actuallyLinked = ['legos', 'phrases', 'seeds']
    .reduce((n, t) => n + Object.values(raw[t] || {}).reduce((a, b) => a + b, 0), 0)
  return { raw, loggedTotal: rpcTotal, actuallyLinked }
}

/**
 * The whole /generate flow, in the order phase8 runs it:
 *   Step A  linkAudioIds RPC                        :1985-1992
 *   Step B  getAudioNeeds                           :1995
 *   Step B2 stuck-linkable escape hatch             :2073-2079
 *   render  phase8MainGenerateUpsert per item       :2417
 */
async function runGenerate(db, courseCode, { storageOk = () => true, voiceId = 'azure_es-ES-ElviraNeural' } = {}) {
  const ttsBefore = ttsCallCount()
  const stepA = await linkAudioIdsStepA(db, courseCode)
  let needs = await getAudioNeeds(db, courseCode, { storageOk })
  let escapeHatchFired = false
  if (needs.toLink.length > 0 && needs.toGenerate.length === 0) {
    escapeHatchFired = true
    needs = await getAudioNeeds(db, courseCode, { storageOk, forceGenerate: true })
  }
  const rendered = []
  for (const item of needs.toGenerate) {
    const r = await phase8MainGenerateUpsert(db, {
      courseCode, text: item.text, language: item.lang, role: item.role, voiceId, tag: 'regen',
    })
    rendered.push({ text: item.text, role: item.role, s3Key: r.s3Key })
  }
  return { stepA, needs, escapeHatchFired, rendered, ttsCalls: ttsCallCount() - ttsBefore }
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------
async function createFixture() {
  const db = await PGlite.create()
  await db.exec(SCHEMA)
  await db.query(
    `INSERT INTO courses (course_code, known_lang, target_lang, seed_count) VALUES ($1,'eng','spa',10)`,
    [COURSE])
  return db
}

/** Insert a course_audio row directly, as an already-existing (possibly BAD) clip. */
async function seedAudio(db, {
  text, role = 'target1', language = 'spa', voiceId = 'azure_es-ES-ElviraNeural',
  s3Key = 'mastered/OLD-BAD-0001.mp3', origin = 'tts', createdAt = '2026-01-01T00:00:00Z',
  legoId = null, durationMs = 1234,
}) {
  const r = await db.query(
    `INSERT INTO course_audio
       (course_code, text, text_normalized, language, role, voice_id, origin, s3_key, duration_ms, created_at, lego_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id, s3_key, created_at`,
    [COURSE, text, normalizeForAudio(text), language, role, voiceId, origin, s3Key, durationMs, createdAt, legoId])
  return r.rows[0]
}

async function seedLego(db, { seed = 1, index = 1, legoId = 'S0001L01', knownText, targetText }) {
  const r = await db.query(
    `INSERT INTO course_legos (course_code, seed_number, lego_index, lego_id, known_text, target_text)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [COURSE, seed, index, legoId, knownText, targetText])
  return r.rows[0].id
}

async function legoRow(db, id) {
  const r = await db.query(
    `SELECT l.id, l.known_text, l.target_text, l.target1_audio_id, l.known_audio_id,
            a.s3_key AS target1_s3_key, a.text AS target1_clip_text, a.created_at AS target1_created_at
       FROM course_legos l LEFT JOIN course_audio a ON a.id = l.target1_audio_id
      WHERE l.id = $1`, [id])
  return r.rows[0]
}

async function audioRows(db, role = 'target1') {
  const r = await db.query(
    `SELECT id, text, text_normalized, role, voice_id, s3_key, duration_ms, created_at
       FROM course_audio WHERE course_code = $1 AND role = $2 ORDER BY created_at, id`, [COURSE, role])
  return r.rows
}

module.exports = {
  COURSE, createFixture, upsert, fakeTts, ttsCallCount, resetTts, normalizeForAudio,
  phase8MainGenerateUpsert, phase8IgnoreDuplicatesUpsert, getAudioNeeds,
  linkAudioIdsStepA, runGenerate,
  seedAudio, seedLego, legoRow, audioRows,
}
