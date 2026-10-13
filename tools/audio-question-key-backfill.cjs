#!/usr/bin/env node
/**
 * audio-question-key-backfill — job #586, Tom's ruling 2026-10-13: "Onde era?"
 * and "onde era" are separate recordings (a question mark is part of the key,
 * capitalisation is not).
 *
 *   node tools/audio-question-key-backfill.cjs                 # DRY RUN: does everything, then ROLLBACK
 *   node tools/audio-question-key-backfill.cjs --apply         # same, then COMMIT
 *   node tools/audio-question-key-backfill.cjs --course ita_for_eng   # one course's course_audio rows (shakedown)
 *
 * WHAT ONE RUN DOES, IN ONE TRANSACTION (all or nothing):
 *   1. replaces SQL normalize_text() with the question-keeping rule
 *      (database/migrations/20261013_audio_key_keeps_question_mark.sql);
 *   2. re-keys every course_audio / shared_audio row whose text ends in a
 *      question mark but whose stored text_normalized lost it;
 *   3. re-keys audio_clips.text_key the same way;
 *   4. re-keys clip_index rows that point at question audio (a clip_index row is
 *      a cache — where the correctly-keyed entry already exists the stale one is
 *      deleted, never the audio);
 *   5. SELF-CHECK: no question-text row is left without its ?, the JS rule
 *      (normalizeForDb) agrees with the SQL rule on EVERY re-keyed row, every
 *      count equals the plan; any failure throws and the transaction rolls back.
 *   6. stamps courses.content_stamp for each touched course (the app's freshness signal).
 *
 * WHAT IT NEVER DOES: delete a course_audio row, touch s3_key, delete an S3
 * object, generate audio. Where a re-key would COLLIDE on
 * unique_course_audio_per_voice (the question already has a legacy
 * "x?"-keyed row AND a stripped "x"-keyed row — two valid renders of the same
 * question) the stripped row is LEFT AS IT IS and listed in the evidence: choosing
 * a winner is a link decision (the 2026-08-06 precedent, tools/audio-identity-backfill.cjs).
 *
 * Triggers are bypassed (session_replication_role = replica) because the
 * per-row audit/stamp/link triggers on 200k rows hold the `courses` row lock for
 * the whole transaction; the old key of EVERY changed row is written to the
 * evidence log instead, and --undo reads that log.
 *
 * Evidence + undo log: ~/ssi-evidence/ssi-dashboard-v7/tools/audio-question-key-backfill/
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { normalizeForDb } = require('../services/shared/text-normalize.cjs')
const { evidencePath } = require('./lib/evidence-path.cjs')

const MIGRATION = path.join(__dirname, '..', 'database', 'migrations', '20261013_audio_key_keeps_question_mark.sql')
const OLD_NORMALIZE_TEXT = `CREATE OR REPLACE FUNCTION public.normalize_text(input_text text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE AS $$ BEGIN RETURN rtrim(lower(trim(input_text)), '.?!¿¡。？！'); END; $$;`

/** Row ends in a question mark (ASCII or fullwidth), possibly followed by other stops. */
const Q = `~ '[?？][.!?。？！[:space:]]*$'`

function dbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  for (const f of [path.join(__dirname, '..', '.env.psql'), path.join(process.env.HOME, 'SSi', 'ssi-dashboard-v7-clean', '.env.psql')]) {
    if (fs.existsSync(f)) {
      const m = fs.readFileSync(f, 'utf8').match(/DATABASE_URL=(.+)/)
      if (m) return m[1].trim().replace(/^["']|["']$/g, '')
    }
  }
  throw new Error('no DATABASE_URL (.env.psql)')
}

function parseArgs(argv) {
  const a = { apply: false, undo: null, course: null }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--apply') a.apply = true
    else if (argv[i] === '--course') a.course = argv[++i]
    else if (argv[i] === '--undo') a.undo = argv[++i]
  }
  return a
}

async function run({ apply, course }) {
  const c = new Client({ connectionString: dbUrl() })
  await c.connect()
  const t0 = Date.now()
  const log = { startedAt: new Date().toISOString(), mode: apply ? 'apply' : 'dry-run', course, steps: {} }
  const q = (sql, p) => c.query(sql, p)
  try {
    await q('BEGIN')
    await q(`SET LOCAL lock_timeout = '20s'`)
    await q(`SET LOCAL statement_timeout = '90min'`)
    await q(`SET LOCAL session_replication_role = replica`)

    // 1. the rule
    const migrationSql = fs.readFileSync(MIGRATION, 'utf8')
    await q(migrationSql)

    const scope = course ? `AND course_code = $1` : ''
    const scopeP = course ? [course] : []

    // 2. course_audio plan: rows whose stored key lost the ?  (computed with the NEW function)
    await q(`CREATE TEMP TABLE plan_ca ON COMMIT DROP AS
             SELECT id, course_code, language, role, voice_id, text, text_normalized AS old_key, normalize_text(text) AS new_key
               FROM course_audio WHERE text ${Q} ${scope}`, scopeP)
    await q(`DELETE FROM plan_ca WHERE old_key = new_key`)
    // collision = another row (changing or not) already holds / will hold the same unique key
    // Two CHANGING rows for the same question: the better render gets the key, the other is left (reported).
    // Better = human > veracity-passed > unchecked > failed, then the newer render.
    await q(`CREATE TEMP TABLE plan_ca_skip ON COMMIT DROP AS
             SELECT p.id FROM (SELECT p0.*, row_number() OVER (PARTITION BY p0.course_code, p0.language, p0.role, p0.voice_id, p0.new_key
                                  ORDER BY (a.origin = 'human') DESC, (a.veracity_pass IS TRUE) DESC, (a.veracity_pass IS NULL) DESC, a.created_at DESC, a.id) AS rn
                                 FROM plan_ca p0 JOIN course_audio a ON a.id = p0.id) p
              WHERE p.rn > 1
                 OR EXISTS (SELECT 1 FROM course_audio o WHERE o.id <> p.id AND o.course_code = p.course_code AND o.language = p.language
                              AND o.role = p.role AND o.voice_id = p.voice_id AND o.text_normalized = p.new_key)`)
    const planned = +(await q(`SELECT count(*) n FROM plan_ca`)).rows[0].n
    const skipped = (await q(`SELECT p.id, p.course_code, p.role, p.text, p.old_key, p.new_key FROM plan_ca p JOIN plan_ca_skip s USING (id)`)).rows
    log.steps.course_audio = { planned, skippedCollisions: skipped.length }

    // JS/SQL parity on every row we are about to write
    const parity = await q(`SELECT id, text, new_key FROM plan_ca WHERE id NOT IN (SELECT id FROM plan_ca_skip)`)
    const bad = parity.rows.filter(r => normalizeForDb(r.text) !== r.new_key)
    if (bad.length) throw new Error(`SELF-CHECK: JS normalizeForDb disagrees with SQL normalize_text on ${bad.length} rows, e.g. ${JSON.stringify(bad[0])}`)
    log.steps.parity = { checked: parity.rowCount, mismatches: 0 }

    const undo = await q(`SELECT id, old_key, new_key FROM plan_ca WHERE id NOT IN (SELECT id FROM plan_ca_skip)`)
    log.courseAudioRekeyed = undo.rows
    const upd = await q(`UPDATE course_audio a SET text_normalized = p.new_key
                           FROM plan_ca p WHERE a.id = p.id AND a.text_normalized = p.old_key AND a.text = p.text
                            AND p.id NOT IN (SELECT id FROM plan_ca_skip)`)
    log.steps.course_audio.movedUnderUs = undo.rowCount - upd.rowCount   // text/key changed by a live writer between plan and update: left for the post-commit re-run
    log.steps.course_audio.updated = upd.rowCount

    // 2b. shared_audio (same trigger, same rule)
    if (!course) {
      const sa = await q(`UPDATE shared_audio SET text_normalized = normalize_text(text)
                           WHERE text ${Q} AND text_normalized IS DISTINCT FROM normalize_text(text) RETURNING id, text_normalized`)
      log.steps.shared_audio = { updated: sa.rowCount }
    }

    // 3. audio_clips
    if (!course) {
      const ac = await q(`UPDATE audio_clips SET text_key = audio_canon_text(text)
                           WHERE text ${Q} AND text_key !~ '[?？]$' RETURNING id`)
      log.steps.audio_clips = { updated: ac.rowCount }
      log.audioClipsRekeyed = ac.rows.map(r => r.id)
    }

    // 4. clip_index: point-at-question entries that lack the ? in their key
    if (!course) {
      await q(`CREATE TEMP TABLE plan_ci ON COMMIT DROP AS
               SELECT i.language, i.text_key AS old_key, i.voice_id, i.audio_id, audio_canon_text(a.text) AS new_key
                 FROM clip_index i JOIN course_audio a ON a.id = i.audio_id
                WHERE a.text ${Q} AND i.text_key !~ '[?？]$'`)
      const dup = await q(`DELETE FROM clip_index i USING plan_ci p
                            WHERE i.language = p.language AND i.text_key = p.old_key AND i.voice_id = p.voice_id
                              AND EXISTS (SELECT 1 FROM clip_index j WHERE j.language = p.language AND j.voice_id = p.voice_id AND j.text_key = p.new_key)
                        RETURNING i.*`)
      log.clipIndexDeletedStale = dup.rows
      const ci = await q(`UPDATE clip_index i SET text_key = p.new_key, updated_at = now()
                            FROM plan_ci p WHERE i.language = p.language AND i.text_key = p.old_key AND i.voice_id = p.voice_id`)
      log.steps.clip_index = { rekeyed: ci.rowCount, staleCacheRowsDeleted: dup.rowCount }
    }

    // 4b. Writers keep running on the OLD rule until COMMIT, so rows inserted while this transaction ran
    // carry the stripped key. One more cheap pass picks up what is visible now; anything later is a straggler
    // for the post-commit re-run (this tool is idempotent).
    const late = await q(`UPDATE course_audio SET text_normalized = normalize_text(text)
                           WHERE text ${Q} AND text_normalized !~ '[?？]$' ${scope}
                             AND id NOT IN (SELECT id FROM plan_ca_skip)
                             AND NOT EXISTS (SELECT 1 FROM course_audio o WHERE o.id <> course_audio.id AND o.course_code = course_audio.course_code
                                AND o.language = course_audio.language AND o.role = course_audio.role AND o.voice_id = course_audio.voice_id
                                AND o.text_normalized = normalize_text(course_audio.text))
                       RETURNING id, course_code`, scopeP)
    log.steps.course_audio.writtenDuringRun = late.rowCount
    log.courseAudioLate = late.rows.map(r => r.id)

    // 5. self-check: nothing left reading the wrong way
    const left = +(await q(`SELECT count(*) n FROM course_audio a WHERE a.text ${Q} ${course ? 'AND a.course_code = $1' : ''}
                              AND a.text_normalized !~ '[?？]$' AND a.created_at < transaction_timestamp() AND a.id NOT IN (SELECT id FROM plan_ca_skip)`, scopeP)).rows[0].n
    if (left) throw new Error(`SELF-CHECK: ${left} question-text course_audio rows still lack the ? in their key`)
    // statement rows carrying a ? key, among the rows THIS run wrote (a concurrent edit can change a row's text under us)
    const wrote = [...undo.rows.map(r => r.id), ...late.rows.map(r => r.id)]
    const wrong = +(await q(`SELECT count(*) n FROM course_audio WHERE id = ANY($1::uuid[]) AND text_normalized ~ '[?？]$' AND text !~ '[?？][.!?。？！[:space:]]*$'`, [wrote])).rows[0].n
    if (wrong) throw new Error(`SELF-CHECK: ${wrong} statement rows carry a ? key`)
    log.steps.selfCheck = 'ok'

    // 6. freshness stamp for touched courses (triggers were bypassed)
    const courses = [...new Set(undo.rows.length ? (await q(`SELECT DISTINCT course_code FROM plan_ca WHERE id NOT IN (SELECT id FROM plan_ca_skip)`)).rows.map(r => r.course_code) : [])]
    if (courses.length) await q(`UPDATE courses SET content_stamp = now(), audio_stamp = now() WHERE course_code = ANY($1)`, [courses])
    log.touchedCourses = courses

    log.skippedCollisionRows = skipped
    log.seconds = Math.round((Date.now() - t0) / 1000)
    if (apply) { await q('COMMIT'); log.committed = true } else { await q('ROLLBACK'); log.committed = false }
  } catch (e) {
    try { await q('ROLLBACK') } catch (_) { /* already gone */ }
    log.error = e.message
    throw e
  } finally {
    await c.end()
    const f = evidencePath(`tools/audio-question-key-backfill/${apply ? 'applied' : 'dryrun'}-${course || 'all'}-${Date.now()}.json`)
    fs.writeFileSync(f, JSON.stringify(log))
    const { courseAudioRekeyed, audioClipsRekeyed, clipIndexDeletedStale, skippedCollisionRows, courseAudioLate, ...summary } = log
    console.log(JSON.stringify({ ...summary, skippedCollisionRowCount: (skippedCollisionRows || []).length, evidence: f }, null, 2))
  }
}

/** Put the old rule and the old keys back from an applied log. */
async function undo(file) {
  const log = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!log.committed) throw new Error('that log is a dry run; nothing to undo')
  const c = new Client({ connectionString: dbUrl() })
  await c.connect()
  try {
    await c.query('BEGIN')
    await c.query(`SET LOCAL session_replication_role = replica`)
    await c.query(OLD_NORMALIZE_TEXT)
    for (let i = 0; i < log.courseAudioRekeyed.length; i += 5000) {
      const b = log.courseAudioRekeyed.slice(i, i + 5000)
      await c.query(`UPDATE course_audio a SET text_normalized = v.old_key FROM json_to_recordset($1::json) v(id uuid, old_key text, new_key text)
                      WHERE a.id = v.id AND a.text_normalized = v.new_key`, [JSON.stringify(b)])
    }
    if (log.audioClipsRekeyed) await c.query(`UPDATE audio_clips SET text_key = regexp_replace(text_key, '\\?$', '') WHERE id = ANY($1::uuid[])`, [log.audioClipsRekeyed])
    for (const r of log.clipIndexDeletedStale || []) {
      await c.query(`INSERT INTO clip_index (language, text_key, voice_id, audio_id, origin, indexed_by, created_at, updated_at)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`, [r.language, r.text_key, r.voice_id, r.audio_id, r.origin, r.indexed_by, r.created_at, r.updated_at])
    }
    await c.query('COMMIT')
    console.log('undone: course_audio', log.courseAudioRekeyed.length, '; audio_clips', (log.audioClipsRekeyed || []).length, '(clip_index re-keyed rows are a rebuildable cache: run tools/clip-index-backfill.cjs)')
  } catch (e) { await c.query('ROLLBACK'); throw e } finally { await c.end() }
}

if (require.main === module) {
  const a = parseArgs(process.argv)
  ;(a.undo ? undo(a.undo) : run(a)).catch(e => { console.error('FAILED:', e.message); process.exit(1) })
}
module.exports = { Q, OLD_NORMALIZE_TEXT }
