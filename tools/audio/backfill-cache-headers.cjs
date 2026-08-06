#!/usr/bin/env node
/**
 * backfill-cache-headers — put the immutable Cache-Control on EXISTING audio
 * objects in S3.
 *
 * New uploads carry `public, max-age=31536000, immutable` from
 * services/shared/audio-cache-control.cjs. The estate's ~2.5M already-uploaded
 * clips carry no Cache-Control at all, so every play revalidates. This walks a
 * prefix and rewrites the metadata of each audio object with a self-copy
 * (CopyObject onto its own key, MetadataDirective=REPLACE) — the only way S3
 * offers to change headers without re-uploading bytes.
 *
 * Safety, by construction:
 *   - DRY RUN unless --apply is passed. Nothing is written without it.
 *   - It NEVER deletes. The only mutating call is CopyObject.
 *   - Objects that already carry the target header are skipped (idempotent:
 *     a second run over the same prefix does nothing).
 *   - Non-audio objects are skipped by content type, never by guesswork.
 *   - Every key it touches (or would touch) is written to a JSON log.
 *
 * A self-copy on a version-enabled bucket creates a NEW version of the object
 * and leaves the old version in place, so the bytes are recoverable either way.
 *
 * Usage:
 *   node tools/audio/backfill-cache-headers.cjs --prefix mastered/ --limit 20
 *   node tools/audio/backfill-cache-headers.cjs --prefix mastered/ --limit 20 --apply
 *
 * Flags:
 *   --prefix <p>   key prefix to walk            (default: mastered/)
 *   --limit <n>    max objects to consider       (default: 100, 0 = no limit)
 *   --apply        actually write                (default: dry run)
 *   --bucket <b>   override S3_BUCKET
 *   --log <path>   log file (default: docs/audio/cache-header-backfill-{dryrun,applied}.json)
 *   --concurrency  parallel copies               (default: 8)
 */

const fs = require('fs')
const path = require('path')
require('dotenv').config()

const {
  S3Client, ListObjectsV2Command, HeadObjectCommand, CopyObjectCommand,
} = require('@aws-sdk/client-s3')
const { AUDIO_CACHE_CONTROL, isAudioContentType } = require('../../services/shared/audio-cache-control.cjs')

// ── args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const arg = (name, fallback = undefined) => {
  const i = argv.indexOf(name)
  return i === -1 ? fallback : argv[i + 1]
}
const APPLY = argv.includes('--apply')
const PREFIX = arg('--prefix', 'mastered/')
const LIMIT = Number(arg('--limit', '100'))
const BUCKET = arg('--bucket', process.env.S3_BUCKET || 'ssi-audio-stage')
const REGION = process.env.AWS_REGION || process.env.S3_REGION || 'eu-west-1'
const CONCURRENCY = Math.max(1, Number(arg('--concurrency', '8')))
const LOG_PATH = arg('--log', path.join(__dirname, '..', '..', 'docs', 'audio',
  `cache-header-backfill-${APPLY ? 'applied' : 'dryrun'}.json`))

if (!Number.isFinite(LIMIT) || LIMIT < 0) {
  console.error('--limit must be a non-negative number (0 = no limit)')
  process.exit(1)
}

const s3 = new S3Client({ region: REGION })

// ── work ─────────────────────────────────────────────────────────────────────

/** Head an object and decide what, if anything, this tool should do to it. */
async function classify(key) {
  const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
  const contentType = head.ContentType || ''
  if (!isAudioContentType(contentType)) {
    return { key, action: 'skip', reason: `not audio (${contentType || 'no content-type'})` }
  }
  if (head.CacheControl === AUDIO_CACHE_CONTROL) {
    return { key, action: 'skip', reason: 'already immutable' }
  }
  return {
    key,
    action: 'set-cache-control',
    contentType,
    bytes: head.ContentLength ?? null,
    cacheControlBefore: head.CacheControl ?? null,
    cacheControlAfter: AUDIO_CACHE_CONTROL,
  }
}

/** Self-copy with REPLACE — rewrites headers, keeps the bytes and the key. */
async function applyOne(item) {
  await s3.send(new CopyObjectCommand({
    Bucket: BUCKET,
    Key: item.key,
    CopySource: `${BUCKET}/${encodeURIComponent(item.key).replace(/%2F/g, '/')}`,
    MetadataDirective: 'REPLACE',
    ContentType: item.contentType,
    CacheControl: AUDIO_CACHE_CONTROL,
  }))
}

/** Run `fn` over `items` with a fixed number of workers. */
async function mapLimit(items, limit, fn) {
  const out = []
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i])
    }
  }))
  return out
}

async function* listKeys(prefix, limit) {
  let token
  let seen = 0
  do {
    const page = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET, Prefix: prefix, ContinuationToken: token,
      MaxKeys: limit > 0 ? Math.min(1000, limit - seen) : 1000,
    }))
    for (const obj of page.Contents || []) {
      if (obj.Key.endsWith('/')) continue     // prefix placeholder, not an object
      yield obj
      seen++
      if (limit > 0 && seen >= limit) return
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (token)
}

async function main() {
  console.log(`backfill-cache-headers ${APPLY ? '(APPLY — writing headers)' : '(DRY RUN — no writes)'}`)
  console.log(`  bucket:   s3://${BUCKET} (${REGION})`)
  console.log(`  prefix:   ${PREFIX}`)
  console.log(`  limit:    ${LIMIT === 0 ? 'none' : LIMIT}`)
  console.log(`  header:   ${AUDIO_CACHE_CONTROL}`)
  console.log(`  log:      ${LOG_PATH}\n`)

  const keys = []
  for await (const obj of listKeys(PREFIX, LIMIT)) keys.push(obj.Key)
  console.log(`  listed ${keys.length} object(s)\n`)

  const classified = await mapLimit(keys, CONCURRENCY, async (key) => {
    try {
      return await classify(key)
    } catch (err) {
      return { key, action: 'error', reason: err.message }
    }
  })

  const todo = classified.filter((c) => c.action === 'set-cache-control')
  const skipped = classified.filter((c) => c.action === 'skip')
  const errors = classified.filter((c) => c.action === 'error')

  if (APPLY) {
    await mapLimit(todo, CONCURRENCY, async (item) => {
      try {
        await applyOne(item)
        item.applied = true
      } catch (err) {
        item.applied = false
        item.error = err.message
      }
    })
  }

  for (const item of todo) {
    console.log(`  ${APPLY ? (item.applied ? 'SET  ' : 'FAIL ') : 'WOULD SET'} ${item.key}` +
      `  ${item.cacheControlBefore === null ? '(no cache-control)' : `(was: ${item.cacheControlBefore})`}`)
  }
  for (const item of errors) console.log(`  ERROR ${item.key}: ${item.reason}`)

  const log = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'applied' : 'dry-run',
    bucket: BUCKET,
    region: REGION,
    prefix: PREFIX,
    limit: LIMIT,
    cacheControl: AUDIO_CACHE_CONTROL,
    counts: {
      listed: keys.length,
      toSet: todo.length,
      skipped: skipped.length,
      errors: errors.length,
      applied: APPLY ? todo.filter((t) => t.applied).length : 0,
      applyFailures: APPLY ? todo.filter((t) => t.applied === false).length : 0,
    },
    items: [...todo, ...skipped, ...errors],
  }
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true })
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2))

  console.log(`\n  listed ${keys.length} | ${APPLY ? 'set' : 'would set'} ${todo.length} | ` +
    `skipped ${skipped.length} | errors ${errors.length}`)
  if (!APPLY && todo.length) {
    console.log('  DRY RUN — nothing was written. Re-run with --apply to write these headers.')
  }
  console.log(`  log written: ${LOG_PATH}`)

  if (errors.length || (APPLY && log.counts.applyFailures)) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
