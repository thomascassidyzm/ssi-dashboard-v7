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
  credentials: {
    accessKeyId: (process.env.AWS_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY || '').trim(),
  },
})

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a)
const dayStr = (d) => d.toISOString().slice(0, 10)

/**
 * Fetch every audit row whose changed_at is in [fromMs, toMs), robust against
 * the bloated table: adaptively bisect the window on timeout or page-cap so
 * each leaf query stays small. Same pattern as recover-pod-audio-from-audit.
 */
async function fetchRange(fromMs, toMs, sink) {
  const { data, error } = await sb
    .from('content_audit_log')
    .select('id, table_name, change_type, changed_at, changed_by_role, changed_by_uid, primary_key, old_row')
    .gte('changed_at', new Date(fromMs).toISOString())
    .lt('changed_at', new Date(toMs).toISOString())
    .order('changed_at', { ascending: false })
    .limit(PAGE)

  if (error || (data && data.length === PAGE)) {
    if (toMs - fromMs <= MIN_SLICE_MS) {
      if (error) { log(`  ⚠ range stuck (${error.message}) — skipping ${new Date(fromMs).toISOString()}`); return }
      // sub-30s window with >1000 rows: take what we got (rare; same-instant burst)
    } else {
      const mid = fromMs + Math.floor((toMs - fromMs) / 2)
      await fetchRange(mid, toMs, sink)
      await fetchRange(fromMs, mid, sink)
      return
    }
  }
  for (const row of data || []) sink(row)
}

async function s3Head(key) {
  try { return await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key })) }
  catch (e) { if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) return null; throw e }
}

/** Archive (and optionally prune) one UTC day. Returns a summary. */
async function archiveDay(day) {
  const fromMs = Date.parse(`${day}T00:00:00.000Z`)
  const toMs = fromMs + 86_400_000

  // 1. Pull the whole day, grouped by table.
  const byTable = new Map()
  let total = 0
  await fetchRange(fromMs, toMs, (row) => {
    total++
    if (!byTable.has(row.table_name)) byTable.set(row.table_name, [])
    byTable.get(row.table_name).push(row)
  })

  if (total === 0) return { day, total: 0, tables: 0, skipped: true }
  log(`  ${day}: ${total} rows across ${byTable.size} tables`)
  if (total > 1_000_000) log(`  ⚠ ${day} is large (${total}); held in memory — fine for now, stream if days grow`)

  // 2. One gzipped NDJSON per table + a day manifest.
  const manifest = { day, archived_at: new Date().toISOString(), tables: {} }
  for (const [table, rows] of byTable) {
    manifest.tables[table] = rows.length
    const key = `${PREFIX}/dt=${day}/${table}.ndjson.gz`
    if (EXECUTE) {
      const existing = await s3Head(key)
      if (existing && existing.ContentLength > 0) {
        log(`    ${table.padEnd(28)} ${String(rows.length).padStart(7)} rows — already archived, skip upload`)
      } else {
        const ndjson = rows.map(r => JSON.stringify(r)).join('\n') + '\n'
        const gz = zlib.gzipSync(Buffer.from(ndjson, 'utf8'))
        await s3.send(new PutObjectCommand({
          Bucket: BUCKET, Key: key, Body: gz,
          ContentType: 'application/x-ndjson', ContentEncoding: 'gzip',
        }))
        const head = await s3Head(key) // verify before any prune
        if (!head || head.ContentLength === 0) throw new Error(`verify failed for ${key}`)
        log(`    ${table.padEnd(28)} ${String(rows.length).padStart(7)} rows → ${key} (${gz.length}b)`)
      }
    } else {
      log(`    [dry] ${table.padEnd(28)} ${String(rows.length).padStart(7)} rows → ${key}`)
    }
  }
  if (EXECUTE) {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: `${PREFIX}/dt=${day}/_manifest.json`,
      Body: Buffer.from(JSON.stringify(manifest, null, 2)), ContentType: 'application/json',
    }))
  }

  // 3. Prune (only after verified archive, only with --prune).
  let deleted = 0
  if (PRUNE && EXECUTE) {
    const ids = []
    for (const rows of byTable.values()) for (const r of rows) ids.push(r.id)
    for (let i = 0; i < ids.length; i += DELETE_BATCH) {
      const chunk = ids.slice(i, i + DELETE_BATCH)
      const { error } = await sb.from('content_audit_log').delete().in('id', chunk)
      if (error) { log(`    ⚠ delete batch failed: ${error.message}`); break }
      deleted += chunk.length
    }
    log(`    pruned ${deleted}/${ids.length} rows from DB`)
  } else if (PRUNE) {
    log(`    [dry] would prune ${total} rows from DB`)
  }

  return { day, total, tables: byTable.size, deleted }
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
