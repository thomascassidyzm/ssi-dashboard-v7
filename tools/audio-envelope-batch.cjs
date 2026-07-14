#!/usr/bin/env node
/**
 * Batch-compute + upsert volume-envelope metadata for model-voice audio
 * (course_audio role='target1') into course_audio_envelope — the dashboard-
 * repo half of adaptation-v2 stage 2
 * (ssi-learning-app/docs/adaptation/adaptation-v2-build-spec.md §5.2, WP-7b).
 *
 * Course-agnostic: takes a course_code. Idempotent (skips audio_ids that
 * already have a row at the current extractor_version unless --force) and
 * resumable (each row is a separate DB write; re-running just picks up
 * where a killed run left off).
 *
 * Usage:
 *   node tools/audio-envelope-batch.cjs <course_code> [--dry-run] [--force] [--limit N]
 *
 * Also exported for use as a post-generation hook (see backfillCourse) —
 * services/phases/phase8-audio-v13.cjs calls this fire-and-forget after a
 * successful /generate pass so ongoing mastering stays covered without a
 * separate manual step.
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')
const createLogger = require('../services/shared/logger.cjs')
const { computeEnvelope, CONSTANTS } = require('../services/audio-envelope.cjs')

const logger = createLogger('AudioEnvelopeBatch')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' })
const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'

async function fetchBuffer(s3Key) {
  const resp = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }))
  const chunks = []
  for await (const chunk of resp.Body) chunks.push(chunk)
  return Buffer.concat(chunks)
}

/**
 * Walk a course's target1 (model-voice) audio and upsert envelope rows.
 * @param {string} courseCode
 * @param {object} opts
 * @param {boolean} [opts.dryRun=false]
 * @param {boolean} [opts.force=false] - recompute even if a row already exists at the current version
 * @param {number} [opts.limit=Infinity]
 * @param {number} [opts.concurrency=6]
 */
async function backfillCourse(courseCode, opts = {}) {
  const { dryRun = false, force = false, limit = Infinity, concurrency = 6 } = opts

  const { data: rows, error } = await supabase
    .from('course_audio')
    .select('id, s3_key, duration_ms, text')
    .eq('course_code', courseCode)
    .eq('role', 'target1')
    .order('id')
  if (error) throw new Error(`course_audio fetch failed: ${error.message}`)

  const audioIds = rows.map((r) => r.id)
  const existing = new Map()
  if (!force && audioIds.length) {
    for (let i = 0; i < audioIds.length; i += 200) {
      const batch = audioIds.slice(i, i + 200)
      const { data: existingRows, error: existErr } = await supabase
        .from('course_audio_envelope')
        .select('audio_id, extractor_version')
        .in('audio_id', batch)
      if (existErr) throw new Error(`course_audio_envelope fetch failed: ${existErr.message}`)
      for (const r of existingRows) existing.set(r.audio_id, r.extractor_version)
    }
  }

  const todo = rows
    .filter((r) => force || existing.get(r.id) !== CONSTANTS.version)
    .slice(0, limit)

  logger.info(`${courseCode}: ${rows.length} target1 rows, ${todo.length} to process (${rows.length - todo.length} already at v${CONSTANTS.version})`)

  const result = { total: rows.length, processed: 0, skipped: rows.length - todo.length, failed: 0, errors: [], sample: [] }
  let cursor = 0
  async function worker() {
    while (cursor < todo.length) {
      const row = todo[cursor++]
      try {
        const buffer = await fetchBuffer(row.s3_key)
        const envelope = await computeEnvelope(buffer)
        if (envelope.weight === 0) {
          logger.warn(`${row.id} (${courseCode}): capture-quality gate failed (sampleCount=${envelope.sampleCount}) — skipped`)
          result.skipped++
          continue
        }
        if (result.sample.length < 5) {
          result.sample.push({ audio_id: row.id, text: row.text, dbDurationMs: row.duration_ms, ...envelope })
        }
        if (!dryRun) {
          const { error: upsertErr } = await supabase
            .from('course_audio_envelope')
            .upsert({
              audio_id: row.id,
              duration_ms: envelope.durationMs,
              peak_count: envelope.peakCount,
              peak_to_mean_ratio: envelope.peakToMeanRatio,
              mean_peak_width_ms: envelope.meanPeakWidthMs,
              extractor_version: CONSTANTS.version,
            }, { onConflict: 'audio_id' })
          if (upsertErr) throw new Error(upsertErr.message)
        }
        result.processed++
      } catch (e) {
        result.failed++
        result.errors.push({ audio_id: row.id, s3_key: row.s3_key, error: e.message })
        logger.warn(`${row.id} (${courseCode}) failed: ${e.message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, todo.length) }, worker))

  logger.info(`${courseCode}: done — processed=${result.processed} skipped=${result.skipped} failed=${result.failed}`)
  return result
}

/**
 * Fire-and-forget hook for phase8's /generate: never throws, logs only.
 * Safe to call after any pass that may have minted new target1 audio.
 */
async function backfillCourseSafe(courseCode) {
  try {
    return await backfillCourse(courseCode, {})
  } catch (e) {
    logger.warn(`Envelope backfill hook failed for ${courseCode}: ${e.message}`)
    return null
  }
}

module.exports = { backfillCourse, backfillCourseSafe }

if (require.main === module) {
  const args = process.argv.slice(2)
  const courseCode = args.find((a) => !a.startsWith('--'))
  const dryRun = args.includes('--dry-run')
  const force = args.includes('--force')
  const limitArg = args.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity

  if (!courseCode) {
    console.error('Usage: node tools/audio-envelope-batch.cjs <course_code> [--dry-run] [--force] [--limit=N]')
    process.exit(1)
  }

  backfillCourse(courseCode, { dryRun, force, limit })
    .then((result) => {
      console.log(JSON.stringify({ courseCode, dryRun, force, ...result }, null, 2))
      process.exit(result.failed > 0 ? 1 : 0)
    })
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}
