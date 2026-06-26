#!/usr/bin/env node
/**
 * archive-audit-log.cjs — tier content_audit_log: hot in Postgres, cold in S3.
 *
 * Why: content_audit_log is the row-level recovery store (the thing that lets
 * us restore an old_row after a bad bulk write — it's saved the listening pods
 * twice). But at ~690k rows/day it bloats Postgres fast; the operational DB
 * can't hold long history (queries already time out at ~5M rows). The fix is
 * two tiers:
 *
 *   HOT  (Postgres, --hot-days, everything)  → fast, drives the Maintenance UI
 *                                              and same-week "oops" recovery.
 *   COLD (S3, gzipped NDJSON, ~forever)      → cheap, long-horizon recovery.
 *
 * This job archives each day OLDER than the hot window to
 *   s3://<bucket>/audit-archive/dt=YYYY-MM-DD/<table_name>.ndjson.gz
 * (+ a _manifest.json with row counts), verifies the upload, and — only with
 * --prune — then deletes that day's rows from Postgres. Archive ALWAYS happens
 * before any delete, and a day is only pruned after its upload is verified, so
 * a crash can never lose history.
 *
 * Recovery from cold storage: recover-pod-audio-from-audit.cjs --archive reads
 * these same NDJSON files. Round-trips.
 *
 * Scheduling: pg_cron CANNOT write to S3, so run this from an external
 * scheduler (Vercel cron / pm2 / system cron), nightly, e.g.:
 *   node tools/archive-audit-log.cjs --hot-days=14 --prune --execute
 *
 * Usage:
 *   node tools/archive-audit-log.cjs                       # DRY RUN, report only
 *   node tools/archive-audit-log.cjs --execute             # archive to S3 (no delete)
 *   node tools/archive-audit-log.cjs --execute --prune     # archive + delete archived days
 *   node tools/archive-audit-log.cjs --date=2026-05-22 --execute --prune
 *   node tools/archive-audit-log.cjs --hot-days=7 --execute
 *
 * Flags:
 *   --hot-days=N   keep N days hot in DB; archive strictly older days (default 14)
 *   --date=YYYY-MM-DD  archive exactly this UTC day (overrides the hot-days scan)
 *   --max-days=N   when scanning, don't look further back than N days (default 120)
 *   --execute      actually write to S3 (default is a dry run)
 *   --prune        after a verified upload, DELETE that day's rows from Postgres
 *   --bucket=NAME  override S3 bucket (default $S3_BUCKET)
 */

require('dotenv').config()
const zlib = require('zlib')
const { createClient } = require('@supabase/supabase-js')
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
const { Upload } = require('@aws-sdk/lib-storage')
const os = require('os')
const path = require('path')
const fs = require('fs')
const { once } = require('events')

const arg = (name, def) => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : def
}
const flag = (name) => process.argv.includes(`--${name}`)

const HOT_DAYS = Number(arg('hot-days', 14))
const MAX_DAYS = Number(arg('max-days', 120))
const ONE_DATE = arg('date', null)
const EXECUTE = flag('execute')
const PRUNE = flag('prune')
const BUCKET = arg('bucket', process.env.S3_BUCKET)
const PREFIX = 'audit-archive'
const PAGE = 1000
const MIN_SLICE_MS = 30_000
const DELETE_BATCH = 500

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  maxAttempts: 6, // ride out transient resets/timeouts on a flaky uplink
  credentials: {
    accessKeyId: (process.env.AWS_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY || '').trim(),
  },
})

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a)
const dayStr = (d) => d.toISOString().slice(0, 10)

const COLS = 'id, table_name, change_type, changed_at, changed_by_role, changed_by_uid, primary_key, old_row'

// Open a per-table gzip TEMP FILE. We stream rows to disk during the (slow) fetch,
// then upload the finished file afterwards — uploading concurrently with the fetch
// leaves the multipart connection idle and S3 kills it. Disk-bound, not memory-
// bound, so a million-row incident day archives without OOM.
function openTableFile(tmpdir, table) {
  const gzPath = path.join(tmpdir, `${table}.ndjson.gz`)
  const gz = zlib.createGzip()
  const ws = fs.createWriteStream(gzPath)
  const written = new Promise((res, rej) => { ws.on('finish', res); ws.on('error', rej); gz.on('error', rej) })
  gz.pipe(ws)
  return { gzPath, gz, written, count: 0 }
}

// Write one NDJSON row, honouring gzip backpressure so memory stays flat.
async function writeRow(f, row) {
  if (!f.gz.write(JSON.stringify(row) + '\n')) await once(f.gz, 'drain')
  f.count++
}

// Fetch one page, retrying transient failures (statement timeouts under DB load —
// e.g. while a big prune is running — or dropped connections) so a blip doesn't
// kill a long archive run.
async function selectPage(fromIso, toIso, cursor) {
  for (let attempt = 1; ; attempt++) {
    const { data, error } = await sb
      .from('content_audit_log').select(COLS)
      .gte('changed_at', fromIso).lt('changed_at', toIso)
      .gt('id', cursor).order('id', { ascending: true }).limit(PAGE)
    if (!error) return data
    const transient = error.code === '57014' || /timeout|fetch failed|epipe|econnreset|socket/i.test(error.message || '')
    if (!transient || attempt >= 6) throw error
    log(`    ⚠ page retry ${attempt} @cursor ${cursor}: ${error.message}`)
    await new Promise(r => setTimeout(r, 800 * attempt))
  }
}

async function s3Head(key) {
  try { return await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key })) }
  catch (e) { if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) return null; throw e }
}

/** Archive (and optionally prune) one UTC day. Streams to disk, then uploads. */
async function archiveDay(day) {
  const fromIso = `${day}T00:00:00.000Z`
  const toIso = new Date(Date.parse(fromIso) + 86_400_000).toISOString()

  // Resume-safe: if the day's manifest already exists the archive is done — skip
  // re-uploading, but still run the prune (covers a crash between the two steps).
  let alreadyArchived = false
  if (EXECUTE) {
    const m = await s3Head(`${PREFIX}/dt=${day}/_manifest.json`)
    alreadyArchived = !!(m && m.ContentLength > 0)
  }

  const writing = EXECUTE && !alreadyArchived
  const tmpdir = writing ? fs.mkdtempSync(path.join(os.tmpdir(), 'auditarch-')) : null
  const counts = {}
  const files = new Map()
  let cursor = 0, total = 0
  try {
    // 1. Stream the whole day by ID cursor (robust to any volume / same-instant
    //    bursts — the old time-window bisect silently capped at 1000 rows/slice)
    //    into per-table gzip temp files on disk.
    for (;;) {
      const data = await selectPage(fromIso, toIso, cursor)
      if (!data || data.length === 0) break
      for (const row of data) {
        total++
        counts[row.table_name] = (counts[row.table_name] || 0) + 1
        if (writing) {
          let f = files.get(row.table_name)
          if (!f) { f = openTableFile(tmpdir, row.table_name); files.set(row.table_name, f) }
          await writeRow(f, row)
        }
      }
      cursor = data[data.length - 1].id
      if (data.length < PAGE) break
    }

    if (total === 0) { if (tmpdir) fs.rmSync(tmpdir, { recursive: true, force: true }); return { day, total: 0, tables: 0, skipped: true } }
    log(`  ${day}: ${total} rows across ${Object.keys(counts).length} tables${alreadyArchived ? ' (already archived — prune only)' : ''}`)

    // 2. Upload each FINISHED temp file (multipart) and VERIFY before any prune.
    if (writing) {
      for (const [table, f] of files) {
        f.gz.end(); await f.written
        const key = `${PREFIX}/dt=${day}/${table}.ndjson.gz`
        await new Upload({
          client: s3,
          params: { Bucket: BUCKET, Key: key, Body: fs.createReadStream(f.gzPath), ContentType: 'application/x-ndjson', ContentEncoding: 'gzip' },
          queueSize: 4, partSize: 8 * 1024 * 1024,
        }).done()
        const head = await s3Head(key)
        if (!head || head.ContentLength === 0) throw new Error(`verify failed for ${key}`)
        log(`    ${table.padEnd(28)} ${String(f.count).padStart(8)} rows → ${key} (${head.ContentLength}b)`)
      }
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET, Key: `${PREFIX}/dt=${day}/_manifest.json`,
        Body: Buffer.from(JSON.stringify({ day, archived_at: new Date().toISOString(), tables: counts }, null, 2)),
        ContentType: 'application/json',
      }))
    } else if (!EXECUTE) {
      for (const [t, n] of Object.entries(counts)) log(`    [dry] ${t.padEnd(28)} ${String(n).padStart(8)} rows`)
    }
  } finally {
    if (tmpdir) { try { fs.rmSync(tmpdir, { recursive: true, force: true }) } catch {} }
  }

  // 3. Prune — only after a verified archive (or a confirmed pre-existing one).
  //    Batched + committed per batch via PostgREST so a stall can't roll it back.
  let deleted = 0
  if (PRUNE && EXECUTE) {
    for (;;) {
      const { data, error } = await sb.from('content_audit_log').select('id')
        .gte('changed_at', fromIso).lt('changed_at', toIso).limit(DELETE_BATCH)
      if (error) throw error
      if (!data || !data.length) break
      const { error: derr } = await sb.from('content_audit_log').delete().in('id', data.map(r => r.id))
      if (derr) { log(`    ⚠ delete batch failed: ${derr.message}`); break }
      deleted += data.length
      if (data.length < DELETE_BATCH) break
    }
    log(`    pruned ${deleted} rows from DB`)
  } else if (PRUNE) {
    log(`    [dry] would prune ${total} rows from DB`)
  }

  return { day, total, tables: Object.keys(counts).length, deleted }
}

async function main() {
  if (!BUCKET) throw new Error('No S3 bucket (set S3_BUCKET or --bucket=)')
  log(`archive-audit-log → s3://${BUCKET}/${PREFIX}/  (${EXECUTE ? 'EXECUTE' : 'DRY RUN'}${PRUNE ? ', PRUNE' : ''})`)

  // Build the list of UTC days to archive.
  let days = []
  if (ONE_DATE) {
    days = [ONE_DATE]
  } else {
    // Everything strictly older than the hot window, scanning back max-days.
    const cutoff = new Date(Date.now() - HOT_DAYS * 86_400_000)
    cutoff.setUTCHours(0, 0, 0, 0)
    for (let i = 1; i <= MAX_DAYS; i++) {
      days.push(dayStr(new Date(cutoff.getTime() - i * 86_400_000)))
    }
    days.reverse() // oldest first
    log(`hot window = ${HOT_DAYS}d; archiving days older than ${dayStr(cutoff)} (scanning back ${MAX_DAYS}d)`)
  }

  const summaries = []
  for (const day of days) {
    const s = await archiveDay(day)
    if (!s.skipped) summaries.push(s)
  }

  const rows = summaries.reduce((n, s) => n + s.total, 0)
  const del = summaries.reduce((n, s) => n + (s.deleted || 0), 0)
  log(`\nDONE: ${summaries.length} day(s) with data, ${rows} rows archived${PRUNE && EXECUTE ? `, ${del} pruned` : ''}.`)
  if (!EXECUTE) log('(dry run — re-run with --execute to write S3' + (PRUNE ? ' and prune' : '') + ')')
}

main().catch(e => { console.error(e); process.exit(1) })
