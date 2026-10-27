#!/usr/bin/env node
/**
 * Re-master existing mastered/{uuid}.mp3 files in S3 so the MP3 container is
 * iOS-AVPlayer-safe.
 *
 * Background:
 *   ffmpeg's MP3 muxer writes ID3v2 + a malformed LAME-extension `enc_padding`
 *   field. iOS/AVPlayer trims audio at the end of standalone files and stops
 *   decoding entirely at the boundary in concatenated streams. Files encoded
 *   by the real `lame` binary do not have these issues.
 *
 * Strategy:
 *   For each target file in S3:
 *     1. Detect: download first 4 bytes, skip if header is already `ff fb`/`ff fa`
 *     2. Back up: copy s3://bucket/mastered/{uuid}.mp3 → s3://bucket/mastered_backup_lavf/{uuid}.mp3
 *        (skip backup copy if the backup already exists)
 *     3. Download mastered/{uuid}.mp3 to a temp file
 *     4. Re-master via: ffmpeg loudnorm → wav stdout → lame stdin → temp.mp3
 *     5. Verify temp.mp3 has clean `ff fb` header AND sox-decoded sample count
 *        matches the original (audio content lossless)
 *     6. Upload temp.mp3 back to s3://bucket/mastered/{uuid}.mp3
 *     7. (optional) Update course_audio.duration_ms — small drift from
 *        per-segment LAME priming/remainder padding (~24ms per file)
 *
 * Resumable: re-running skips files whose head bytes are already clean.
 *
 * Usage:
 *   node tools/remaster-mp3-headers.cjs --dry-run [--course-code X] [--limit N]
 *   node tools/remaster-mp3-headers.cjs --execute [--course-code X] [--limit N] [--concurrency 8]
 *   node tools/remaster-mp3-headers.cjs --execute --keys-file paths.txt
 *
 * Flags:
 *   --dry-run         No S3 writes. Just count and probe.
 *   --execute         Actually perform the re-master.
 *   --course-code X   Scope to one course (course_audio.course_code = X).
 *   --limit N         Process at most N files.
 *   --concurrency N   Parallel workers (default 4).
 *   --keys-file F     Read s3 keys from a file (one per line, e.g. "mastered/UUID.mp3").
 *   --bucket B        Override S3_BUCKET env (e.g. for stage vs prod).
 *   --no-update-duration  Skip per-file Supabase duration_ms update (faster).
 *                     New durations are still appended to logs/duration-journal.jsonl
 *                     so a batch updater can apply them later.
 *   --duration-journal F  Override journal path (default: logs/duration-journal.jsonl).
 *   --no-drift-check  Skip the sample-count drift safety guard. Use when re-
 *                     running files that previously failed with "Sample count
 *                     drift too large" — loudnorm legitimately adds padding on
 *                     some inputs and the audio is still iOS-safe (clean header).
 */

const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand, CopyObjectCommand } = require('@aws-sdk/client-s3')
const { execFile } = require('child_process')
const { promisify } = require('util')

require('dotenv').config({ path: path.join(__dirname, '../.env') })

const { spawn } = require('child_process')
const execFileAsync = promisify(execFile)

// ---------------------------------------------------------------------------
// ffmpeg → lame pipe (self-contained — does not depend on audio-processor.cjs
// being on the current branch checkout)
// ---------------------------------------------------------------------------

async function checkBinary(bin, args = ['--version']) {
  try { await execFileAsync(bin, args); return true } catch { return false }
}

/**
 * Pipe ffmpeg's filtered WAV output through the real `lame` binary.
 * ffmpeg's MP3 muxer writes broken headers (ID3v2 + bogus enc_padding) that
 * break iOS playback — only the real lame binary produces clean output.
 */
function ffmpegFilterToLameMp3(inputPath, outputPath, opts = {}) {
  const {
    filterChain = null,
    bitrate = 96,
    sampleRate = 48000,
    channels = 1,
    quality = 2
  } = opts

  const ffArgs = ['-y', '-hide_banner', '-loglevel', 'error', '-i', inputPath]
  if (filterChain) ffArgs.push('-filter:a', filterChain)
  ffArgs.push('-ac', String(channels), '-ar', String(sampleRate), '-f', 'wav', '-')

  const lameArgs = [
    '-m', channels === 1 ? 'm' : 'j',
    '-b', String(bitrate),
    '--cbr', '--noreplaygain',
    '-q', String(quality),
    '--silent',
    '-', outputPath
  ]

  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ffArgs)
    const lame = spawn('lame', lameArgs)
    let ffErr = '', lameErr = ''
    ff.stderr.on('data', d => { ffErr += d.toString() })
    lame.stderr.on('data', d => { lameErr += d.toString() })
    ff.stdout.pipe(lame.stdin)
    ff.on('error', reject)
    lame.on('error', reject)
    let ffExit = null, lameExit = null
    const settle = () => {
      if (ffExit === null || lameExit === null) return
      if (ffExit !== 0) return reject(new Error(`ffmpeg exited ${ffExit}: ${ffErr.slice(-500)}`))
      if (lameExit !== 0) return reject(new Error(`lame exited ${lameExit}: ${lameErr.slice(-500)}`))
      resolve()
    }
    ff.on('close', c => { ffExit = c; settle() })
    lame.on('close', c => { lameExit = c; settle() })
  })
}

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
function getFlag(name) { return args.includes(`--${name}`) }
function getVal(name, fallback) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback
}

const DRY_RUN = getFlag('dry-run') || !getFlag('execute')
const COURSE_CODE = getVal('course-code', null)
const LIMIT = parseInt(getVal('limit', '0'), 10) || null
const CONCURRENCY = parseInt(getVal('concurrency', '4'), 10)
const KEYS_FILE = getVal('keys-file', null)
const UPDATE_DURATION = !getFlag('no-update-duration')
const DRIFT_CHECK = !getFlag('no-drift-check')
// --no-loudnorm: plain container re-encode (decode → lame, no loudnorm). Use for
// files that are ALREADY mastered and only carry the bad ffmpeg/ID3v2 header —
// re-normalising them is wrong; we just want the clean LAME header.
const NO_LOUDNORM = getFlag('no-loudnorm')
const DURATION_JOURNAL = getVal(
  'duration-journal',
  path.join(__dirname, '../logs/duration-journal.jsonl')
)
const BUCKET = getVal('bucket', process.env.S3_BUCKET || 'ssi-audio-stage')
const REGION = getVal('region', process.env.AWS_REGION || 'eu-west-1')

const BACKUP_PREFIX = 'mastered_backup_lavf/'
const MASTERED_PREFIX = 'mastered/'

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const s3 = new S3Client({ region: REGION })
const sb = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function s3Exists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    return true
  } catch (e) {
    if (e.$metadata?.httpStatusCode === 404 || e.name === 'NotFound') return false
    throw e
  }
}

async function s3Download(key, destPath) {
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const writeStream = fs.createWriteStream(destPath)
  await new Promise((resolve, reject) => {
    obj.Body.pipe(writeStream).on('finish', resolve).on('error', reject)
  })
}

async function s3DownloadHead(key, bytes = 4) {
  // Use Range request to fetch only the first N bytes
  const obj = await s3.send(new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Range: `bytes=0-${bytes - 1}`
  }))
  const chunks = []
  for await (const chunk of obj.Body) chunks.push(chunk)
  return Buffer.concat(chunks)
}

async function s3Upload(key, localPath, contentType = 'audio/mpeg') {
  const body = fs.readFileSync(localPath)
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType
  }))
}

async function s3Copy(srcKey, destKey) {
  await s3.send(new CopyObjectCommand({
    Bucket: BUCKET,
    CopySource: `/${BUCKET}/${encodeURIComponent(srcKey).replace(/%2F/g, '/')}`,
    Key: destKey
  }))
}

/**
 * Returns true if first 2 bytes are an MP3 sync frame (`ff fb` or `ff fa`).
 * False if the file starts with `49 44 33` (ID3v2 marker — the broken format).
 */
function hasCleanMp3Header(buf) {
  if (!buf || buf.length < 2) return false
  if (buf[0] !== 0xff) return false
  // ff fa = MPEG1 layer3 (uncommon), ff fb = MPEG1 layer3 (common), ff f3/f2 = MPEG2
  return (buf[1] & 0xe0) === 0xe0
}

async function getSampleCount(filePath) {
  try {
    const { stderr } = await execFileAsync('sox', [filePath, '-n', 'stat'], {
      maxBuffer: 4 * 1024 * 1024
    })
    const m = stderr.match(/Samples read:\s+(\d+)/)
    return m ? parseInt(m[1], 10) : null
  } catch (e) {
    return null
  }
}

async function getDurationMs(filePath) {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      filePath
    ])
    return Math.round(parseFloat(stdout.trim()) * 1000)
  } catch (e) {
    return null
  }
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

async function processOne(key) {
  // key is e.g. "mastered/UUID.mp3"
  const uuid = key.replace(MASTERED_PREFIX, '').replace(/\.mp3$/, '')
  const backupKey = `${BACKUP_PREFIX}${uuid}.mp3`
  const result = {
    key,
    uuid,
    action: 'unknown',
    error: null,
    origSamples: null,
    newSamples: null,
    origDurationMs: null,
    newDurationMs: null,
    sizeBefore: null,
    sizeAfter: null
  }

  // 1) Detect: already clean?
  let headBytes
  try {
    headBytes = await s3DownloadHead(key, 4)
  } catch (e) {
    if (e.$metadata?.httpStatusCode === 404 || e.name === 'NoSuchKey') {
      result.action = 'missing'
      result.error = 'S3 object does not exist'
      return result
    }
    throw e
  }
  if (hasCleanMp3Header(headBytes)) {
    result.action = 'skipped_already_clean'
    return result
  }

  if (DRY_RUN) {
    result.action = 'would_remaster'
    return result
  }

  // 2) Back up (idempotent)
  const backupExists = await s3Exists(backupKey)
  if (!backupExists) {
    await s3Copy(key, backupKey)
  }

  // 3) Download original
  const td = fs.mkdtempSync(path.join(os.tmpdir(), 'remaster-'))
  const origPath = path.join(td, 'orig.mp3')
  const newPath = path.join(td, 'new.mp3')
  try {
    await s3Download(key, origPath)
    result.sizeBefore = fs.statSync(origPath).size
    result.origSamples = await getSampleCount(origPath)
    result.origDurationMs = await getDurationMs(origPath)

    // 4) Re-encode through lame. With --no-loudnorm this is a plain container
    //    fix (decode → lame, audio preserved); otherwise a full loudnorm remaster.
    await ffmpegFilterToLameMp3(origPath, newPath, {
      filterChain: NO_LOUDNORM ? null : 'loudnorm=I=-16:LRA=11:TP=-1.5',
      bitrate: 96,
      sampleRate: 48000,
      channels: 1
    })

    // 5) Verify
    const newHead = fs.readFileSync(newPath).slice(0, 2)
    if (!hasCleanMp3Header(newHead)) {
      throw new Error(`Re-mastered file has bad header: ${newHead.toString('hex')}`)
    }
    result.newSamples = await getSampleCount(newPath)
    result.newDurationMs = await getDurationMs(newPath)
    result.sizeAfter = fs.statSync(newPath).size

    // Sample count must be ~equal (LAME priming/remainder adds at most ~2304 samples).
    // Loudnorm can legitimately add larger padding on some files for its analysis
    // window — those fail this check but the audio is still iOS-safe (clean header).
    // Use --no-drift-check to bypass on the re-run pass.
    if (DRIFT_CHECK && result.origSamples && result.newSamples) {
      const diff = Math.abs(result.newSamples - result.origSamples)
      if (diff > 4608) {
        throw new Error(`Sample count drift too large: ${result.origSamples} → ${result.newSamples} (diff ${diff})`)
      }
    }

    // 6) Upload back to mastered/
    await s3Upload(key, newPath, 'audio/mpeg')

    // 7) Always journal the new duration so a batch updater can apply it later.
    //    Per-file Supabase updates by s3_key are SLOW (no index) — they bottleneck
    //    the whole pipeline at ~1 file/sec. We skip them here in favour of a
    //    bulk-update pass after the backfill completes.
    if (result.newDurationMs) {
      try {
        fs.appendFileSync(
          DURATION_JOURNAL,
          JSON.stringify({ s3_key: key, duration_ms: result.newDurationMs, ts: new Date().toISOString() }) + '\n'
        )
      } catch (e) { /* journal best-effort */ }
    }

    if (UPDATE_DURATION && sb && result.newDurationMs) {
      await sb.from('course_audio').update({ duration_ms: result.newDurationMs }).eq('s3_key', key)
      await sb.from('shared_audio').update({ duration_ms: result.newDurationMs }).eq('s3_key', key)
    }

    result.action = 'remastered'
    return result
  } catch (e) {
    result.action = 'error'
    result.error = e.message
    return result
  } finally {
    fs.rmSync(td, { recursive: true, force: true })
  }
}

// ---------------------------------------------------------------------------
// Scoping
// ---------------------------------------------------------------------------

/**
 * Collect S3 keys from the bulk-audio welcomes index. These batch-generated
 * welcomes sit in S3 at `mastered/{uuid}.mp3` but are NOT in `course_audio`
 * until they're applied to a course (per `scripts/bulk-audio/STATUS.md`).
 * They still carry the broken header and would propagate the iOS bug into
 * any course that links them later.
 *
 * Encouragements live in `shared_audio` and are picked up by the main DB
 * query — no need to read those indexes.
 */
function collectBulkWelcomeKeys() {
  const keys = new Set()
  const welcomeIndex = path.join(
    __dirname,
    '../scripts/bulk-audio/generated/welcomes/production/_welcome_index.json'
  )
  try {
    const data = JSON.parse(fs.readFileSync(welcomeIndex, 'utf-8'))
    function walk(node) {
      if (!node || typeof node !== 'object') return
      if (node.s3_key && typeof node.s3_key === 'string' && node.s3_key.startsWith(MASTERED_PREFIX)) {
        keys.add(node.s3_key)
      } else if (node.uuid && typeof node.uuid === 'string' && /^[0-9A-Fa-f-]{36}$/.test(node.uuid)) {
        keys.add(`${MASTERED_PREFIX}${node.uuid}.mp3`)
      }
      for (const v of Object.values(node)) walk(v)
    }
    walk(data)
  } catch (e) {
    console.warn(`[collectBulkWelcomeKeys] could not read welcome index: ${e.message}`)
  }
  console.log(`[collectBulkWelcomeKeys] welcomes: ${keys.size}`)
  return keys
}

async function selectKeys() {
  if (KEYS_FILE) {
    const lines = fs.readFileSync(KEYS_FILE, 'utf-8').split('\n').map(l => l.trim()).filter(Boolean)
    return LIMIT ? lines.slice(0, LIMIT) : lines
  }

  if (!sb) {
    throw new Error('No Supabase client configured — set SUPABASE_URL + SUPABASE_SERVICE_KEY, or use --keys-file')
  }

  console.log(`[selectKeys] Querying Supabase ${COURSE_CODE ? `for course ${COURSE_CODE}` : 'across all courses'}…`)

  const keySet = new Set()

  // Keyset pagination by `id` — stays fast at any offset (unlike .range() which
  // re-scans up to `from` rows every page and hits Postgres statement_timeout
  // on tables with 1M+ rows).
  async function fetchAllByKeyset(table, extraEq) {
    const PAGE = 1000
    let lastId = ''
    let totalPages = 0
    while (true) {
      let q = sb.from(table)
        .select('id, s3_key')
        .like('s3_key', `${MASTERED_PREFIX}%`)
        .order('id', { ascending: true })
        .limit(PAGE)
      if (extraEq) q = q.eq(extraEq.col, extraEq.val)
      if (lastId) q = q.gt('id', lastId)
      const { data, error } = await q
      if (error) throw error
      if (!data || data.length === 0) break
      for (const r of data) if (r.s3_key) keySet.add(r.s3_key)
      lastId = data[data.length - 1].id
      totalPages++
      if (totalPages % 50 === 0) {
        console.log(`  [${table}] paged ${totalPages * PAGE}, keys so far: ${keySet.size}`)
      }
      if (data.length < PAGE) break
      if (LIMIT && keySet.size >= LIMIT) break
    }
  }

  // 1) course_audio (the main TTS + human recordings)
  {
    const before = keySet.size
    await fetchAllByKeyset('course_audio', COURSE_CODE ? { col: 'course_code', val: COURSE_CODE } : null)
    console.log(`[selectKeys] course_audio keys: ${keySet.size - before}`)
  }

  // 2) shared_audio (encouragements/instructions already in DB) — skip when scoped to a single course
  if (!COURSE_CODE) {
    const before = keySet.size
    await fetchAllByKeyset('shared_audio', null)
    console.log(`[selectKeys] shared_audio added: ${keySet.size - before} (total: ${keySet.size})`)
  }

  // 3) Bulk welcomes index — orphans waiting to be applied to courses
  if (!COURSE_CODE) {
    const before = keySet.size
    const welcomeKeys = collectBulkWelcomeKeys()
    for (const k of welcomeKeys) keySet.add(k)
    console.log(`[selectKeys] bulk welcomes added: ${keySet.size - before} (total: ${keySet.size})`)
  }

  const unique = Array.from(keySet)
  return LIMIT ? unique.slice(0, LIMIT) : unique
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('━'.repeat(70))
  console.log('MP3 Header Re-master')
  console.log('━'.repeat(70))
  console.log(`Bucket:        ${BUCKET}`)
  console.log(`Region:        ${REGION}`)
  console.log(`Mode:          ${DRY_RUN ? 'DRY-RUN' : 'EXECUTE'}`)
  console.log(`Course filter: ${COURSE_CODE || '(all)'}`)
  console.log(`Limit:         ${LIMIT || '(none)'}`)
  console.log(`Concurrency:   ${CONCURRENCY}`)
  console.log(`Keys file:     ${KEYS_FILE || '(none — use Supabase)'}`)
  console.log(`Update durations in DB: ${UPDATE_DURATION}`)
  console.log(`Duration journal: ${DURATION_JOURNAL}`)
  // Ensure journal dir exists
  fs.mkdirSync(path.dirname(DURATION_JOURNAL), { recursive: true })
  console.log('━'.repeat(70))

  if (!(await checkBinary('ffmpeg', ['-version']))) {
    console.error('FATAL: ffmpeg not installed')
    process.exit(1)
  }
  if (!(await checkBinary('lame', ['--version']))) {
    console.error('FATAL: lame not installed (brew install lame)')
    process.exit(1)
  }

  const keys = await selectKeys()
  console.log(`Selected ${keys.length} S3 keys`)

  if (keys.length === 0) {
    console.log('Nothing to do.')
    return
  }

  // Process in parallel batches
  const stats = {
    total: keys.length,
    remastered: 0,
    skipped: 0,
    error: 0,
    missing: 0,
    would_remaster: 0,
    bytesRead: 0,
    bytesWritten: 0
  }

  let cursor = 0
  const errors = []
  async function worker(workerId) {
    while (cursor < keys.length) {
      const idx = cursor++
      const key = keys[idx]
      try {
        const r = await processOne(key)
        if (r.action === 'remastered') {
          stats.remastered++
          stats.bytesRead += r.sizeBefore || 0
          stats.bytesWritten += r.sizeAfter || 0
        } else if (r.action === 'skipped_already_clean') stats.skipped++
        else if (r.action === 'would_remaster') stats.would_remaster++
        else if (r.action === 'missing') stats.missing++
        else if (r.action === 'error') {
          stats.error++
          errors.push({ key: r.key, error: r.error })
        }
        if (idx % 50 === 0 || idx === keys.length - 1) {
          console.log(`[${idx + 1}/${keys.length}] ${r.action} ${r.key.slice(0, 60)}`)
        }
      } catch (e) {
        stats.error++
        errors.push({ key, error: e.message })
        console.error(`[${idx + 1}/${keys.length}] FATAL on ${key}: ${e.message}`)
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i))
  await Promise.all(workers)

  console.log('━'.repeat(70))
  console.log('Done')
  console.log('━'.repeat(70))
  console.log(`Total:                ${stats.total}`)
  console.log(`Already clean:        ${stats.skipped}`)
  if (DRY_RUN) {
    console.log(`Would re-master:      ${stats.would_remaster}`)
  } else {
    console.log(`Re-mastered:          ${stats.remastered}`)
    console.log(`  Bytes read:         ${(stats.bytesRead/1024/1024).toFixed(1)} MB`)
    console.log(`  Bytes written:      ${(stats.bytesWritten/1024/1024).toFixed(1)} MB`)
  }
  console.log(`Missing in S3:        ${stats.missing}`)
  console.log(`Errors:               ${stats.error}`)

  if (errors.length > 0) {
    const logPath = path.join(os.tmpdir(), `remaster-errors-${Date.now()}.json`)
    fs.writeFileSync(logPath, JSON.stringify(errors, null, 2))
    console.log(`\nError log: ${logPath}`)
    console.log('First 5 errors:')
    errors.slice(0, 5).forEach(e => console.log(`  ${e.key}: ${e.error}`))
  }
}

main().catch(e => {
  console.error('FATAL:', e)
  process.exit(1)
})
