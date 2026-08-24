#!/usr/bin/env node
/**
 * fleet-remaster.cjs — re-master already-rendered clips through the fixed
 * loudness chain, make-before-break, resumable, and DRY BY DEFAULT.
 *
 * COMMISSIONED 2026-08-24. Tom, having heard that Enzo was quieter than Ara:
 *   "It's probably good to do it now. But I think the A/B test will be good.
 *    It's a no-cost change really so we should almost certainly do it."
 *
 * Pre-approved IN PRINCIPLE. It still does not fire without (1) Tom's ear
 * passing the A/B sample and (2) `--apply`, which is not the default and never
 * will be. There is NO TTS in this tool and no provider is ever called: it
 * re-processes bytes the estate already owns.
 *
 * ── THE FOUR THINGS THAT MAKE THIS SAFE ─────────────────────────────────────
 *
 * 1 · MAKE BEFORE BREAK. A re-mastered clip is uploaded to a NEW s3 key, the
 *     object is HEAD-checked in the bucket, and only then is the row pointed at
 *     it. The old object is never deleted — `swapClipInPlace` records it as
 *     `previous_s3_key`, which is the rollback ledger. The 2026-08-03 French
 *     purge deleted 31,310 rows before re-rendering and left ~2,000 course slots
 *     silent for two days; this is the shape that cannot do that.
 *
 * 2 · THE REVISION IS BUMPED, so the bytes actually reach a learner. Every
 *     write goes through `services/shared/audio-revision-swap.cjs` and never
 *     through a raw UPDATE. A swap that changes `s3_key` without bumping
 *     `audio_revision` changes the bytes behind an address nobody will request
 *     again — the documented cause of "we replaced it and it's still wrong".
 *     That module asserts the bump took rather than trusting the write.
 *
 * 3 · IT IS RESUMABLE, because 2.48 million clips is days of running and a run
 *     that cannot resume will be killed and restarted from zero. Every processed
 *     id is appended to a checkpoint file as it completes; a re-run skips them.
 *
 * 4 · IT SKIPS WHAT IS ALREADY RIGHT. A clip inside tolerance is left completely
 *     alone: no render, no upload, no revision bump, no cache invalidation for
 *     the learner holding it. This is not an optimisation, it is the difference
 *     between changing what needs changing and reissuing the estate.
 *
 * ── WHAT IT DELIBERATELY DOES NOT DO ────────────────────────────────────────
 * No deletes. No text, language, role or voice_id writes. No pod or casting
 * changes. No TTS. It cannot promote, retire or relink anything.
 *
 * USAGE
 *   # dry run, the default — measures and reports, writes nothing
 *   node tools/audio/fleet-remaster.cjs --course=ita_for_eng --limit=200
 *   # for real
 *   node tools/audio/fleet-remaster.cjs --course=ita_for_eng --apply \
 *     --checkpoint=$CS_SCRATCH/ck-ita.jsonl --log=$CS_SCRATCH/ita-applied.jsonl
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
const fs = require('fs')
const os = require('os')
const path = require('path')
const { Client } = require('pg')
const { createClient } = require('@supabase/supabase-js')
const { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const { v4: uuidv4 } = require('uuid')
const audioProcessor = require('../../services/audio-processor.cjs')
const { measure } = require('../../services/audio-intelligence/tiers/loudness.cjs')
const { swapClipInPlace } = require('../../services/shared/audio-revision-swap.cjs')
const { AUDIO_CACHE_CONTROL } = require('../../services/shared/audio-cache-control.cjs')
const { canonicalVoice } = require('./measure-loudness-by-voice.cjs')

// ---------------------------------------------------------------------------
// PURE DECISIONS — tested in fleet-remaster.test.cjs, no ffmpeg or network.
// ---------------------------------------------------------------------------

/**
 * Should this clip be touched at all?
 *
 * THE DEFAULT ANSWER IS NO. Every `true` here costs a learner a re-download of
 * that clip, because the swap changes its address. So the bar is "measurably
 * wrong", not "not perfect", and an unmeasurable clip is NEVER re-mastered — we
 * do not replace bytes we could not read.
 *
 * @param {{measured:boolean, lufs:number|null}} m
 * @param {number} targetLufs
 * @param {number} toleranceDb
 * @returns {{remaster:boolean, reason:string, errorDb:number|null}}
 */
function shouldRemaster (m, targetLufs, toleranceDb) {
  if (!m || !m.measured || !Number.isFinite(m.lufs)) {
    return { remaster: false, reason: 'not measurable — refusing to replace bytes we cannot read', errorDb: null }
  }
  const errorDb = Math.round((targetLufs - m.lufs) * 100) / 100
  if (Math.abs(errorDb) <= toleranceDb) {
    return { remaster: false, reason: `already within ${toleranceDb} dB (${m.lufs} LUFS)`, errorDb }
  }
  return { remaster: true, reason: `${errorDb} dB from target (${m.lufs} LUFS)`, errorDb }
}

/**
 * Did the row move under us between the read and the write?
 *
 * Multiple writers touch course_audio and a re-master that lands on top of
 * somebody else's fresh render would silently undo it. Compared on the two
 * fields that decide identity of the bytes.
 */
function rowUnchanged (before, now) {
  if (!now) return { ok: false, why: 'row disappeared' }
  if (now.s3_key !== before.s3_key) return { ok: false, why: `s3_key moved (${before.s3_key} -> ${now.s3_key})` }
  if ((now.audio_revision ?? 1) !== (before.audio_revision ?? 1)) {
    return { ok: false, why: `audio_revision moved (${before.audio_revision} -> ${now.audio_revision})` }
  }
  return { ok: true, why: null }
}

/** Read a checkpoint file of newline-delimited JSON into a Set of done ids. */
function loadCheckpoint (file) {
  const done = new Set()
  if (!file || !fs.existsSync(file)) return done
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try { done.add(JSON.parse(line).id) } catch { /* a torn final line is expected after a kill */ }
  }
  return done
}

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

const S3_BUCKET = process.env.S3_AUDIO_BUCKET || process.env.S3_BUCKET || 'ssi-audio-stage'
const REGION = process.env.AWS_REGION || 'eu-west-1'

async function mapLimit (items, limit, worker) {
  let next = 0
  const out = new Array(items.length)
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      out[i] = await worker(items[i], i)
    }
  }))
  return out
}

const streamToBuffer = async (body) => {
  const chunks = []
  for await (const c of body) chunks.push(c)
  return Buffer.concat(chunks)
}

async function main () {
  const arg = (n, d) => {
    const a = process.argv.find((x) => x.startsWith(`--${n}=`))
    return a ? a.split('=').slice(1).join('=') : d
  }
  const flag = (n) => process.argv.includes(`--${n}`)

  const course = arg('course')
  const apply = flag('apply')
  const target = Number(arg('target', '-15.5'))
  const tolerance = Number(arg('tolerance', '0.5'))
  const concurrency = parseInt(arg('concurrency', '4'), 10)
  const limit = parseInt(arg('limit', '0'), 10) || null
  const checkpointFile = arg('checkpoint')
  const logFile = arg('log')
  if (!course) { console.error('FAILED: --course=<code> is required'); process.exit(1) }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
  const s3 = new S3Client({ region: REGION })
  const pg = new Client({ connectionString: process.env.DATABASE_URL })
  await pg.connect()
  const { rows } = await pg.query(
    `select id, course_code, s3_key, voice_id, language, role, audio_revision, duration_ms, text
       from course_audio where course_code = $1 and s3_key is not null order by created_at`,
    [course])
  await pg.end()

  const done = loadCheckpoint(checkpointFile)
  const todo = (limit ? rows.slice(0, limit) : rows).filter((r) => !done.has(r.id))
  console.error(`[fleet] ${course}: ${rows.length} clips, ${done.size} already done, ${todo.length} to consider`)
  console.error(`[fleet] target ${target} LUFS +/-${tolerance}, mode ${apply ? 'APPLY (writes)' : 'DRY RUN (no writes)'}`)

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-remaster-'))
  const stats = { considered: 0, skippedInBand: 0, skippedUnmeasurable: 0, remastered: 0, drift: 0, failed: 0 }
  const append = (file, obj) => { if (file) fs.appendFileSync(file, JSON.stringify(obj) + '\n') }

  await mapLimit(todo, concurrency, async (row, i) => {
    const inPath = path.join(tmp, `${i}.in.mp3`)
    const outPath = path.join(tmp, `${i}.out.mp3`)
    try {
      stats.considered++
      // Read the CURRENT bytes straight from the bucket. Not the learner proxy:
      // a fleet run must not put 2.5M requests through the delivery path.
      const obj = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: row.s3_key }))
      const buf = await streamToBuffer(obj.Body)

      const m = await measure(buf)
      const decision = shouldRemaster(m, target, tolerance)
      if (!decision.remaster) {
        if (m.measured) stats.skippedInBand++; else stats.skippedUnmeasurable++
        append(checkpointFile, { id: row.id, action: 'skip', reason: decision.reason })
        append(logFile, { id: row.id, action: 'skip', lufs: m.lufs, reason: decision.reason })
        return
      }

      fs.writeFileSync(inPath, buf)
      const conv = await audioProcessor.normalizeAudioConverging(inPath, outPath, target, {
        toleranceDb: tolerance, maxPasses: 3,
      })
      const mastered = fs.readFileSync(outPath)

      const record = {
        id: row.id, course: row.course_code, voice: canonicalVoice(row.voice_id),
        beforeLufs: m.lufs, afterLufs: conv.outputLUFS, gainDb: conv.gainDb,
        passes: conv.passes, converged: conv.converged, oldS3Key: row.s3_key,
      }

      if (!apply) {
        stats.remastered++
        append(logFile, { ...record, action: 'would-remaster' })
        return
      }

      // --- from here the run writes ------------------------------------------
      // Drift check: has anyone touched this row since we read it?
      const { data: nowRow } = await supabase.from('course_audio')
        .select('id, s3_key, audio_revision').eq('id', row.id).single()
      const drift = rowUnchanged(row, nowRow)
      if (!drift.ok) {
        stats.drift++
        append(logFile, { ...record, action: 'abort-drift', why: drift.why })
        return
      }

      const newKey = `mastered/${uuidv4().toUpperCase()}.mp3`
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET, Key: newKey, Body: mastered,
        ContentType: 'audio/mpeg', CacheControl: AUDIO_CACHE_CONTROL,
      }))

      const swap = await swapClipInPlace({
        supabase,
        audioId: row.id,
        newS3Key: newKey,
        durationMs: row.duration_ms,
        fileSizeBytes: mastered.length,
        source: 'fleet-remaster-2026-08-24',
        acceptedBy: 'loudness-similarity-pass',
        reason: `re-master ${m.lufs} -> ${conv.outputLUFS} LUFS (target ${target})`,
        // Make before break: the row is not pointed at the new object until the
        // object is provably in the bucket.
        verifyObject: async (key) => {
          try { await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key })); return true }
          catch { return false }
        },
      })

      stats.remastered++
      append(checkpointFile, { id: row.id, action: 'remastered' })
      append(logFile, { ...record, action: 'remastered', newS3Key: newKey, revision: swap.revision })
    } catch (e) {
      stats.failed++
      append(logFile, { id: row.id, action: 'failed', error: e.message })
      console.error(`[fleet] FAILED ${row.id}: ${e.message}`)
    } finally {
      for (const f of [inPath, outPath]) { try { fs.unlinkSync(f) } catch {} }
      if (stats.considered % 250 === 0) console.error(`[fleet] ${stats.considered}/${todo.length} — ${JSON.stringify(stats)}`)
    }
  })

  fs.rmSync(tmp, { recursive: true, force: true })
  console.log(`\n${apply ? 'APPLIED' : 'DRY RUN'} — ${course}`)
  console.table([stats])
  if (!apply) console.log('\nNothing was written. Re-run with --apply to write, once Tom has passed the A/B.')
}

module.exports = { shouldRemaster, rowUnchanged, loadCheckpoint, mapLimit }

if (require.main === module) {
  main().catch((e) => { console.error(`FAILED: ${e.message}`); process.exit(1) })
}
