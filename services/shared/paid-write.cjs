/**
 * A RENDER THAT HAS BEEN PAID FOR MUST NOT BE LOST TO A LOCK (job #140, 2026-10-27).
 *
 * The specimen: on 2026-10-27 spa_for_eng renders were paid for and then their
 * course_audio upsert was cancelled at the 8 s statement timeout, so the bytes sat
 * in S3 with no row and every retry paid again. The freeze recorder showed why:
 * each insert was waiting (Lock/transactionid) on an edit-batch transaction for the
 * same course that stayed open 40-100 s. Every content write stamps
 * courses.content_stamp (touch_course_content_stamp), so a batch holds that course's
 * courses row until it commits, and every course_audio insert for the course queues
 * behind it. That is a wait, not a fault: the write succeeds once the batch commits.
 *
 * So the write-back after a paid render RETRIES transient lock/timeout errors for a
 * few minutes (writeAfterPaid). If it still cannot land, the clip is RECORDED
 * (recordPaidUnsaved) with everything needed to file it later, and the route's
 * adoptS3Key path files it from S3 without calling a provider again.
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

// statement timeout / query cancelled, lock_not_available, deadlock, serialization failure
const TRANSIENT_CODES = new Set(['57014', '55P03', '40P01', '40001'])
const TRANSIENT_TEXT = /statement timeout|lock timeout|canceling statement|deadlock detected|could not serialize|fetch failed|ECONNRESET|ETIMEDOUT|socket hang up/i

/** Waits between attempts. A course's edit-batch transaction was seen open ~100 s; this outlasts it (~3 min of waiting). */
const DEFAULT_DELAYS_MS = [2000, 5000, 10000, 20000, 30000, 30000, 30000, 30000, 30000]

/** True when the error is a wait that a later attempt can get past (lock queue, timeout, dropped connection). */
function isTransientWriteError(err) {
  if (!err) return false
  if (err.code && TRANSIENT_CODES.has(String(err.code))) return true
  return TRANSIENT_TEXT.test(String(err.message || err))
}

/**
 * Run `attempt` until it returns { data } with no transient error. `attempt` resolves
 * to supabase-js's { data, error } shape. A non-transient error returns at once; the
 * last result is returned after the delays run out, so the caller decides what fails.
 */
async function writeAfterPaid(attempt, { delaysMs = DEFAULT_DELAYS_MS, sleep = (ms) => new Promise(r => setTimeout(r, ms)), log = null, label = 'write' } = {}) {
  let out = await attempt()
  for (let i = 0; i < delaysMs.length && out && out.error && isTransientWriteError(out.error); i++) {
    if (log && log.warn) log.warn(`[paid-write] ${label}: ${out.error.message} — retry ${i + 1}/${delaysMs.length} in ${delaysMs[i]} ms (the render is paid for; never re-rendered)`)
    await sleep(delaysMs[i])
    out = await attempt()
  }
  return out
}

/** Where paid-but-unsaved clips are written down. Next to the spend ledger: the same service writes both. */
function paidUnsavedPath() {
  if (process.env.PAID_UNSAVED_LEDGER) return process.env.PAID_UNSAVED_LEDGER
  return path.join(process.env.HOME || os.homedir(), '.local', 'state', 'ssi-tts-spend', 'paid-unsaved.jsonl')
}

/** Append one record. Never throws: failing to write the note must not hide the original error. */
function recordPaidUnsaved(entry, { file = paidUnsavedPath(), log = null } = {}) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.appendFileSync(file, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n')
    return true
  } catch (e) {
    if (log && log.error) log.error(`[paid-write] could not record paid-unsaved clip ${entry && entry.s3Key}: ${e.message}`)
    return false
  }
}

/** The newest record for this S3 key, or null. */
function findPaidUnsaved(s3Key, { file = paidUnsavedPath() } = {}) {
  let text
  try { text = fs.readFileSync(file, 'utf8') } catch { return null }
  let hit = null
  for (const line of text.split('\n')) {
    if (!line.includes(s3Key)) continue
    try { const r = JSON.parse(line); if (r.s3Key === s3Key) hit = r } catch { /* a torn line is skipped */ }
  }
  return hit
}

/** Only an object phase8 itself mastered can be adopted: mastered/<UPPER-CASE UUID>.mp3. */
const ADOPTABLE_KEY = /^mastered\/[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}\.mp3$/
function isAdoptableKey(key) { return ADOPTABLE_KEY.test(String(key || '')) }

module.exports = { isTransientWriteError, writeAfterPaid, recordPaidUnsaved, findPaidUnsaved, paidUnsavedPath, isAdoptableKey, DEFAULT_DELAYS_MS }
