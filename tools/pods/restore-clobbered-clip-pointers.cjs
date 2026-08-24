#!/usr/bin/env node
/**
 * restore-clobbered-clip-pointers.cjs — put back the `s3_key` (and the size and
 * duration that go with it) on course_audio rows whose audio pointer was
 * REPOINTED by the 2026-08-24 splice pass without anyone intending it.
 *
 * WHAT HAPPENED, precisely, because the precise version is less alarming than
 * the vague one and it is the version that tells you how to prevent it.
 *
 * The splicer looks up each sentence through phase8's `findExistingAudio`
 * before cutting anything, so an already-rendered clip is REUSED and never
 * re-made. That lookup compares the voice with `sameVoice`, which canonicalises
 * both sides through `tryCanonicalClipVoiceId(v)` — one argument, no provider.
 * A pod cast stores raw voice ids (`bf9fe5b5f981`), while course_audio stores
 * canonical ones (`xai_bf9fe5b5f981`), and without the provider the canonicaliser
 * cannot bridge the two. So the lookup MISSED rows that existed.
 *
 * The write then used the other spelling. `publishPiece` inserts with
 * `canonicalClipVoiceId(voice_id, provider)` — two arguments, so it DOES produce
 * `xai_bf9fe5b5f981` — and the upsert's conflict key is
 * (course_code, text_normalized, language, role, voice_id). That key matched
 * the very row the lookup had just failed to find, so the upsert became an
 * UPDATE: same row, same text, same voice, new `s3_key`.
 *
 * NOTHING WAS DELETED OR OVERWRITTEN IN S3. `publishPiece` uploads to a fresh
 * `mastered/<uuid>.mp3` and never touches an existing object, so all 28
 * original recordings are still exactly where they were. What changed is which
 * object 28 rows POINT AT: a spliced piece instead of the original standalone
 * render. Same sentence, same voice, different take — so nothing a learner
 * hears is wrong, and that is why no gate caught it. It is still an unintended
 * mutation of assets this job was not asked to touch, and make-before-break
 * does not have a "the audio was fine anyway" clause.
 *
 * The old pointers are recoverable exactly: `content_audit_log` keeps
 * `old_row` on every UPDATE, so the original `s3_key`, `duration_ms` and
 * `file_size_bytes` are all still on record. This tool reads them back.
 *
 * THE FIX THAT STOPS IT RECURRING is in splice-sentence-clips.cjs: look up with
 * the SAME canonical voice id the write will use, so the lookup and the
 * conflict key can never disagree again. Note that generatePodAudio has the
 * identical asymmetry — this is a phase8 shape, not something the splicer
 * invented, and it is worth a separate look.
 *
 *   node tools/pods/restore-clobbered-clip-pointers.cjs [--since=<ISO>] [--apply]
 *
 * Read-only without --apply. Verifies the old object still exists in S3 before
 * pointing anything back at it — restoring a row to a dead key would be worse
 * than leaving it. Logs to
 * docs/pods/clobbered-clip-pointer-restore-<date>-{dryrun,applied}-log.json.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const p8 = require('../../services/phases/phase8-audio-v13.cjs')
const { HeadObjectCommand } = require('@aws-sdk/client-s3')

const REPO = path.resolve(__dirname, '../..')
const APPLY = process.argv.includes('--apply')
const SINCE = (process.argv.find((a) => a.startsWith('--since=')) || '').split('=')[1]
  || new Date(Date.now() - 6 * 3600e3).toISOString()

require('dotenv').config({ path: path.join(REPO, '.env.psql'), override: true })

;(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()

  // Every course_audio UPDATE in the window whose s3_key actually changed.
  const { rows } = await db.query(
    `select l.primary_key::text as id,
            l.changed_at,
            l.old_row->>'s3_key'          as old_key,
            (l.old_row->>'duration_ms')::int    as old_duration_ms,
            (l.old_row->>'file_size_bytes')::int as old_size,
            c.s3_key   as current_key,
            c.course_code, c.text, c.voice_id, c.created_at
       from content_audit_log l
       join course_audio c on c.id = l.primary_key::uuid
      where l.table_name = 'course_audio'
        and l.change_type = 'UPDATE'
        and l.changed_at > $1
        and l.old_row->>'s3_key' is distinct from c.s3_key
      order by l.changed_at`, [SINCE])

  const plan = []
  const skipped = []
  for (const r of rows) {
    // Only rows that PRE-DATE the run: a row created by this run legitimately
    // has a new key and must not be "restored" to anything.
    if (new Date(r.created_at) > new Date(SINCE)) { skipped.push({ ...r, why: 'row created in-window' }); continue }
    let exists = false
    try {
      await p8.s3.send(new HeadObjectCommand({ Bucket: p8.S3_BUCKET, Key: r.old_key }))
      exists = true
    } catch (e) { /* gone */ }
    if (!exists) { skipped.push({ id: r.id, old_key: r.old_key, why: 'original object no longer in S3' }); continue }
    plan.push(r)
  }

  const at = new Date().toISOString()
  const log = {
    at, apply: APPLY, since: SINCE,
    candidates: rows.length, restoring: plan.length, skipped: skipped.length,
    skipped_detail: skipped,
    note: 'Restores s3_key/duration_ms/file_size_bytes to the pre-run values from '
      + 'content_audit_log.old_row. The spliced objects are left in S3, orphaned and harmless.',
    rows: plan.map((r) => ({
      id: r.id, course: r.course_code, text: r.text, voice_id: r.voice_id,
      from_key: r.current_key, to_key: r.old_key,
      to_duration_ms: r.old_duration_ms, to_size: r.old_size,
    })),
  }
  const logPath = path.join(REPO, 'docs', 'pods',
    `clobbered-clip-pointer-restore-${at.slice(0, 10)}-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2))

  if (!APPLY) {
    console.log(`[DRY] ${plan.length} rows would be pointed back at their original clip `
      + `(${skipped.length} skipped). Log: ${logPath}`)
    await db.end(); process.exit(0)
  }

  await db.query('begin')
  try {
    let n = 0
    for (const r of plan) {
      const res = await db.query(
        `update course_audio
            set s3_key = $2, duration_ms = $3, file_size_bytes = $4
          where id = $1 and s3_key = $5`,
        [r.id, r.old_key, r.old_duration_ms, r.old_size, r.current_key])
      n += res.rowCount
    }
    await db.query('commit')
    console.log(`[APPLIED] restored ${n} clip pointers. Log: ${logPath}`)
  } catch (e) {
    await db.query('rollback')
    console.error(`ROLLED BACK: ${e.message}`)
    process.exitCode = 1
  }
  await db.end()
  process.exit(process.exitCode || 0)
})().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
