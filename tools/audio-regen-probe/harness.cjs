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
async function getAudioNeeds(db, courseCode, { storageOk = () => true } = {}) {
  const slotDefs = [
    { table: 'course_practice_phrases', textCol: 'known_text', audioCol: 'known_audio_id', role: 'known' },
    { table: 'course_practice_phrases', textCol: 'target_text', audioCol: 'target1_audio_id', role: 'target1' },
    { table: 'course_legos', textCol: 'known_text', audioCol: 'known_audio_id', role: 'known' },
    { table: 'course_legos', textCol: 'target_text', audioCol: 'target1_audio_id', role: 'target1' },
    { table: 'course_seeds', textCol: 'known_text', audioCol: 'known_audio_id', role: 'known' },
    { table: 'course_seeds', textCol: 'target_text', audioCol: 'target1_audio_id', role: 'target1' },
  ]
  const unlinked = []
  for (const s of slotDefs) {
    const r = await db.query(
      `SELECT ${s.textCol} AS text FROM ${s.table} WHERE course_code = $1 AND ${s.audioCol} IS NULL`,
      [courseCode])
    for (const row of r.rows) if (row.text) unlinked.push({ text: row.text, role: s.role, table: s.table })
  }
  // getExistingAudioSet(): every course_audio row for this course, keyed the
  // same way the slot is keyed.
  const ex = await db.query(
    `SELECT id, text_normalized, role, s3_key FROM course_audio WHERE course_code = $1`, [courseCode])
  const existing = new Map()
  for (const a of ex.rows) existing.set(`${a.text_normalized}|${a.role}`, a)

  const toLink = [], toGenerate = []
  for (const item of unlinked) {
    const hit = existing.get(`${normalizeForAudio(item.text)}|${item.role}`)
    if (hit && storageOk(hit.s3_key)) toLink.push({ ...item, audioId: hit.id, s3Key: hit.s3_key })
    else toGenerate.push(item)
  }
  return { unlinkedCount: unlinked.length, toLink, toGenerate }
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------
async function createFixture() {
  const db = await PGlite.create()
  await db.exec(SCHEMA)
  await db.query(
    `INSERT INTO courses (course_code, known_lang, target_lang, seed_count) VALUES ($1,'en','es',10)`,
    [COURSE])
  return db
}

/** Insert a course_audio row directly, as an already-existing (possibly BAD) clip. */
async function seedAudio(db, {
  text, role = 'target1', language = 'es', voiceId = 'azure_es-ES-ElviraNeural',
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
  seedAudio, seedLego, legoRow, audioRows,
}
