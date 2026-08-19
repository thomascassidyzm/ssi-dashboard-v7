#!/usr/bin/env node
/**
 * BACKFILL ORPHANED SCRIPT-MODE TAKES
 *
 * The course-content recorder (Autocue Studio, script mode) uploaded takes to
 * S3 and wrote a recording_provenance row, but never wrote the course_audio row
 * that makes a take servable. The fix landed on main at b645b2da
 * (services/script-take-filing.cjs). This script files the MISSING course_audio
 * rows for takes recorded BEFORE that fix, pointing at the EXISTING S3 objects.
 *
 * It uploads nothing, renders nothing, calls no TTS, deletes nothing, and never
 * touches an S3 object. One course_audio upsert per surviving take, through the
 * voice engine's own helper with the same conflict key the live fix uses.
 *
 * Guards — the live fix's, plus one it does not need and this does:
 *   - natural cadence only (slow reads are deliberately never filed)
 *   - text, role, course row (target/known lang) must all be recoverable
 *   - the voice slot must resolve to a HUMAN voice in the course's live
 *     voice_config. The upload path may fall back to the client-sent voiceId;
 *     a backfill must not, or a human recording gets credited to a TTS voice.
 *   - S3 object must exist, be non-zero, and be audio
 *   - retakes collapse to the newest take (that is what the live upsert would
 *     have left behind); superseded takes are logged, never written
 *   - before-state assertion on the exact 5-column conflict key, re-checked
 *     immediately before the write; any drift aborts the whole run
 *
 * REFILING A MIS-SLOTTED TAKE (--refile-from/--refile-to)
 *
 * A recordist can record into the wrong voice slot. deu_at_for_eng is the
 * worked case: Sasha recorded 11 natural takes against target1, but target1
 * still holds Azure's de-AT-IngridNeural, so the human-voice guard above
 * correctly refused all 11. Her voice is cast on target2. Tom's ruling
 * 2026-08-19: target1 does NOT become a second slot for her — the two-slot
 * design exists so learners hear two DIFFERENT voices — so the takes are
 * treated as mis-slotted recordings of the target2 voice.
 *
 * --refile-from <role> --refile-to <role> re-files such takes against the
 * DESTINATION slot's identity (role and voice), leaving the source slot alone.
 * Every guard above still applies, unchanged, and to the destination:
 * the destination slot must itself resolve to a HUMAN voice, so this can never
 * be used to credit a human take to a synthetic slot. The identity-occupied
 * refusal is what stops a refile from overwriting a take the destination slot
 * already owns — an older mis-slotted take never displaces a newer correct one.
 *
 * Usage:  node backfill-orphan-takes.cjs            # DRY RUN (default)
 *         node backfill-orphan-takes.cjs --apply    # writes
 *         [--course fin_for_eng]                    # optional filter
 *         [--refile-from target1 --refile-to target2]
 *         [--probe]                                 # decode-verify bytes in a dry run
 */

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

// Repo root: this file lives at <repo>/tools/recording/. Services and .env come
// from the checkout the script is run from.
const REPO = path.resolve(__dirname, '..', '..')
require('dotenv').config({ path: path.join(REPO, '.env') })

const { Client } = require('pg')
const AWS = require('aws-sdk')
const { resolveTakeVoiceId } = require(path.join(REPO, 'services/recording-upload-helpers.cjs'))
const { planScriptTakeFiling } = require(path.join(REPO, 'services/script-take-filing.cjs'))
const voiceEngineDb = require(path.join(REPO, 'services/voice-engine/db.cjs'))
const supabaseClient = require(path.join(REPO, 'services/supabase-client.cjs'))
const { normalizeForAudio } = require(path.join(REPO, 'services/shared/text-normalize.cjs'))
const { canonicalLanguage, canonicalVoiceId } = require(path.join(REPO, 'services/shared/clip-identity.cjs'))

const APPLY = process.argv.includes('--apply')
const arg = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : null }
const COURSE_FILTER = arg('--course')
const REFILE_FROM = arg('--refile-from')
const REFILE_TO = arg('--refile-to')
const PROBE = process.argv.includes('--probe')
if (!!REFILE_FROM !== !!REFILE_TO) throw new Error('--refile-from and --refile-to must be given together')
if (REFILE_FROM && REFILE_FROM === REFILE_TO) throw new Error('--refile-from and --refile-to must differ')
const BUCKET = 'ssi-audio-stage'
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-west-1',
})

// .env.psql is provisioned per machine (gitignored) and may live in a sibling
// checkout — DATABASE_URL in the environment wins if it is set.
const DB_URL = process.env.DATABASE_URL || (() => {
  const candidates = [path.join(REPO, '.env.psql'), path.join(REPO, '..', 'ssi-dashboard-v7-clean', '.env.psql')]
  for (const f of candidates) {
    if (!fs.existsSync(f)) continue
    const m = fs.readFileSync(f, 'utf8').match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)
    if (m) return m[1].trim()
  }
  throw new Error('no DATABASE_URL: set it in the environment or provide .env.psql')
})()

const log = []
const record = (take, verdict, reason, extra = {}) => {
  log.push({
    audio_uuid: take.audio_uuid,
    course_code: take.ctx.course_code,
    recorded_by: take.recorded_by,
    recorded_at: take.created_at,
    cadence: take.ctx.cadence,
    role: take.ctx.role,
    text: take.ctx.text,
    s3_key: take.ctx.s3_key,
    verdict, reason, ...extra,
  })
}

async function headObject(key) {
  try {
    const r = await s3.headObject({ Bucket: BUCKET, Key: key }).promise()
    return { exists: true, size: r.ContentLength, contentType: r.ContentType }
  } catch (err) {
    return { exists: false, error: err.code || err.message }
  }
}

// Duration for the course_audio row, measured from the bytes already in S3.
// Read-only: a GET, ffprobe on a temp copy, then the copy is removed.
async function probeDuration(key) {
  const tmp = path.join(require('os').tmpdir(), '.probe' + process.pid + path.extname(key || '.mp3'))
  try {
    const obj = await s3.getObject({ Bucket: BUCKET, Key: key }).promise()
    fs.writeFileSync(tmp, obj.Body)
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', tmp], { encoding: 'utf8' }).trim()
    const secs = parseFloat(out)
    return Number.isFinite(secs) && secs > 0 ? Math.round(secs * 1000) : null
  } catch {
    return null
  } finally {
    try { fs.unlinkSync(tmp) } catch {}
  }
}

;(async () => {
  const pg = new Client({ connectionString: DB_URL })
  await pg.connect()

  // ---- 1. CENSUS: script-mode provenance rows with no course_audio row
  const { rows } = await pg.query(
    `select audio_uuid, recorded_by, recorded_at, created_at, quality_notes
       from recording_provenance order by created_at`)
  const takes = []
  for (const r of rows) {
    let ctx = null
    try { ctx = JSON.parse(r.quality_notes) } catch {}
    if (!ctx || ctx.mode !== 'script') continue
    if (COURSE_FILTER && ctx.course_code !== COURSE_FILTER) continue
    takes.push({ ...r, ctx })
  }
  const keys = takes.map(t => t.ctx.s3_key).filter(Boolean)
  const existingByKey = new Map()
  if (keys.length) {
    const q = await pg.query(`select id, s3_key, course_code, text, language, role, voice_id, origin
                                from course_audio where s3_key = any($1)`, [keys])
    for (const r of q.rows) existingByKey.set(r.s3_key, r)
  }
  const byUuid = await pg.query(`select id from course_audio where id::text = any($1)`,
    [takes.map(t => t.audio_uuid)])
  const filedUuids = new Set(byUuid.rows.map(r => r.id))

  const orphans = takes.filter(t => !existingByKey.has(t.ctx.s3_key) && !filedUuids.has(t.audio_uuid))
  console.log(`script-mode takes: ${takes.length}   already servable: ${takes.length - orphans.length}   ORPHANS: ${orphans.length}`)

  // ---- 2. course rows (live voice_config is the authority on the voice slot)
  const courseCodes = [...new Set(orphans.map(t => t.ctx.course_code))]
  const cq = await pg.query(
    `select course_code, target_lang, known_lang, voice_config from courses where course_code = any($1)`, [courseCodes])
  const courses = new Map(cq.rows.map(r => [r.course_code, r]))

  // ---- 3. per-take plan
  const candidates = []
  for (const t of orphans) {
    // Refile mode acts only on takes recorded against the named source slot.
    if (REFILE_FROM && t.ctx.role !== REFILE_FROM) continue

    const course = courses.get(t.ctx.course_code) || null
    // The slot the take is FILED AGAINST: its own, or the refile destination.
    const targetRole = REFILE_FROM ? REFILE_TO : t.ctx.role
    const metadata = { cadence: t.ctx.cadence || 'natural', text: t.ctx.text, role: targetRole, voiceId: t.ctx.voice_id }

    // Voice: slot-resolved, human-only. No client fallback in a backfill.
    // Resolved for the DESTINATION slot, so a refile can no more credit a human
    // take to a synthetic voice than a plain backfill can.
    const slot = course?.voice_config?.voices?.[targetRole] || null
    const resolved = resolveTakeVoiceId({ voiceConfig: course?.voice_config || null, role: targetRole, clientVoiceId: null })
    const humanVoiceId = (slot && slot.provider === 'human' && slot.voiceId) ? resolved.voiceId : null

    const plan = planScriptTakeFiling({ metadata, voiceId: humanVoiceId, course })
    if (!plan.file) {
      const detail = plan.filing.reason === 'no_voice' && slot
        ? `slot ${targetRole} is provider=${slot.provider} voiceId=${slot.voiceId} (not human)`
        : (plan.filing.reason === 'no_voice' ? `slot ${targetRole} not present in voice_config` : null)
      record(t, 'refused', plan.filing.reason, { detail, deliberate: plan.filing.deliberate, refiled_to: REFILE_FROM ? targetRole : undefined })
      continue
    }
    if (!t.ctx.s3_key) { record(t, 'refused', 'no_s3_key'); continue }
    candidates.push({ take: t, plan, course })
  }

  // ---- 4. bytes must be real
  const alive = []
  for (const c of candidates) {
    const head = await headObject(c.take.ctx.s3_key)
    if (!head.exists) { record(c.take, 'refused', 'object_missing', { detail: head.error }); continue }
    if (!head.size) { record(c.take, 'refused', 'object_zero_length'); continue }
    if (head.contentType && !/^audio\//.test(head.contentType)) {
      record(c.take, 'refused', 'object_not_audio', { detail: head.contentType }); continue
    }
    if (PROBE) {
      // Decode-verify: HEAD proves bytes exist, ffprobe proves they are audio.
      const ms = await probeDuration(c.take.ctx.s3_key)
      if (!ms) { record(c.take, 'refused', 'object_not_decodable', { detail: 'ffprobe read no duration' }); continue }
      c.probedMs = ms
    }
    c.head = head
    alive.push(c)
  }
  console.log(`plan-passed: ${candidates.length}   bytes verified alive: ${alive.length}`)

  // ---- 5. retakes collapse to the newest take, exactly as the live upsert would
  const groups = new Map()
  for (const c of alive) {
    const key = [
      c.take.ctx.course_code,
      normalizeForAudio(c.plan.text),
      canonicalLanguage(c.plan.language),
      c.plan.role,
      canonicalVoiceId(c.plan.voiceId, {}),
    ].join(' ')
    c.identityKey = key
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(c)
  }
  const winners = []
  for (const [key, list] of groups) {
    list.sort((a, b) => new Date(a.take.created_at) - new Date(b.take.created_at))
    const winner = list[list.length - 1]
    for (const loser of list.slice(0, -1)) {
      record(loser.take, 'skipped', 'superseded_retake', { supersededBy: winner.take.audio_uuid })
    }
    winners.push(winner)
  }
  console.log(`identity groups: ${groups.size}   takes to file: ${winners.length}   superseded retakes skipped: ${alive.length - winners.length}`)

  // ---- 6. before-state assertion on the exact conflict key
  const toWrite = []
  for (const w of winners) {
    const [course_code, text_normalized, language, role, voice_id] = w.identityKey.split(' ')
    const q = await pg.query(
      `select id, s3_key, origin from course_audio
        where course_code=$1 and text_normalized=$2 and language=$3 and role=$4 and voice_id=$5`,
      [course_code, text_normalized, language, role, voice_id])
    w.before = q.rows[0] || null
    if (w.before) {
      // Somebody already owns this identity with different bytes. Not ours to overwrite.
      // Take selection is newest-take-wins, so name both dates: an incumbent
      // recorded LATER than this take is the take the recordist meant to keep.
      const incumbentUuid = (w.before.s3_key || '').split('/').pop().replace(/\.[^.]+$/, '')
      let incumbentRecordedAt = null
      try {
        const p = await pg.query('select created_at from recording_provenance where audio_uuid = $1', [incumbentUuid])
        incumbentRecordedAt = p.rows[0]?.created_at || null
      } catch {}
      record(w.take, 'refused', 'identity_occupied', {
        detail: `course_audio ${w.before.id} origin=${w.before.origin} already holds this key with s3_key=${w.before.s3_key}`
          + (incumbentRecordedAt ? ` (incumbent take recorded ${new Date(incumbentRecordedAt).toISOString()}, this take ${new Date(w.take.created_at).toISOString()} — ${new Date(incumbentRecordedAt) > new Date(w.take.created_at) ? 'incumbent is NEWER, it wins' : 'this take is newer; a deliberate replacement is a separate, verified swap'})` : ''),
        incumbent_course_audio_id: w.before.id,
        incumbent_recorded_at: incumbentRecordedAt,
        refiled_to: REFILE_FROM ? REFILE_TO : undefined,
      })
      continue
    }
    toWrite.push(w)
  }

  // ---- 7. summary before any write
  const tally = (list, fn) => list.reduce((a, x) => { const k = fn(x) ?? 'null'; a[k] = (a[k] || 0) + 1; return a }, {})
  console.log('\n--- PLAN ---')
  if (REFILE_FROM) console.log(`REFILE MODE: takes recorded against ${REFILE_FROM} are filed against ${REFILE_TO}'s identity`)
  console.log('would file:', toWrite.length)
  console.log('  by course:', tally(toWrite, w => w.take.ctx.course_code))
  console.log('  by voice:', tally(toWrite, w => w.plan.voiceId))
  console.log('  by recordist:', tally(toWrite, w => w.take.recorded_by))
  console.log('  by date:', tally(toWrite, w => new Date(w.take.created_at).toISOString().slice(0, 10)))
  const refusals = log.filter(l => l.verdict === 'refused')
  console.log('refused:', refusals.length, tally(refusals, l => l.reason))
  console.log('skipped (superseded retakes):', log.filter(l => l.verdict === 'skipped').length)

  // ---- 8. write
  if (APPLY) {
    if (!supabaseClient.isInitialized()) throw new Error('Supabase not initialised — refusing to write')
    const sb = supabaseClient.getClient()
    for (const w of toWrite) {
      const [course_code, text_normalized, language, role, voice_id] = w.identityKey.split(' ')
      // drift re-check immediately before the write
      const re = await pg.query(
        `select id, s3_key from course_audio
          where course_code=$1 and text_normalized=$2 and language=$3 and role=$4 and voice_id=$5`,
        [course_code, text_normalized, language, role, voice_id])
      if (re.rows.length) {
        record(w.take, 'aborted', 'drift_before_write', { detail: `row ${re.rows[0].id} appeared` })
        console.error('DRIFT — aborting run at', w.take.audio_uuid)
        break
      }
      const durationMs = await probeDuration(w.take.ctx.s3_key)
      try {
        const id = await voiceEngineDb.upsertHumanCourseAudio(sb, {
          courseCode: w.take.ctx.course_code,
          text: w.plan.text,
          language: w.plan.language,
          role: w.plan.role,
          voiceId: w.plan.voiceId,
          s3Key: w.take.ctx.s3_key,
          durationMs,
        })
        record(w.take, 'filed', null, { course_audio_id: id, voice_id: w.plan.voiceId, language: w.plan.language, duration_ms: durationMs, bytes: w.head.size })
        console.log(`filed ${id}  ${w.take.ctx.course_code} ${w.plan.role} ${w.plan.voiceId}  "${w.plan.text.slice(0, 45)}"`)
      } catch (err) {
        record(w.take, 'failed', 'write_failed', { detail: err.message })
        console.error('WRITE FAILED', w.take.audio_uuid, err.message)
      }
    }
  } else {
    for (const w of toWrite) {
      record(w.take, 'would_file', null, {
        voice_id: w.plan.voiceId, language: w.plan.language, role: w.plan.role, bytes: w.head.size, contentType: w.head.contentType,
        probed_duration_ms: w.probedMs, refiled_to: REFILE_FROM ? REFILE_TO : undefined,
      })
    }
  }

  const outFile = path.join(process.env.BACKFILL_LOG_DIR || __dirname, APPLY ? 'backfill-applied-log.json' : 'backfill-dryrun-log.json')
  fs.writeFileSync(outFile, JSON.stringify({ apply: APPLY, at: new Date().toISOString(), rows: log }, null, 2))
  console.log('\nlog:', outFile)
  await pg.end()
})().catch(e => { console.error(e); process.exit(1) })
