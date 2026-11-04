/**
 * THE LIBRARY MAY NOT HAND BACK A MISREAD CLIP OF AN OVERRIDE LINE (job #262·AD, follow-up to #250·AD).
 *
 * A pronunciation override (shared/pronunciation-overrides.cjs) changes what the provider is told to SAY for a listed
 * line; the stored words do not change. The clip library and every reuse path key a clip on (language, words), so the
 * clips rendered BEFORE the override — zho 得 read "de/duh" where it means děi — share their words exactly with the
 * fixed ones, and a render or fill of the line could be answered with an old one, silently. Those old objects are kept
 * in the bucket on purpose (make-before-break; nothing is deleted here), so they must be refused, not removed.
 *
 * THE RULE: for a line its asking course lists, a clip may be reused only if its bytes were rendered WITH the override,
 * i.e. its S3 object was written at or after the rule went live (`since` on the rule). This is a fact about the bytes,
 * not the row: `mastered/<uuid>.mp3` is write-once (a re-master or re-record mints a new key), and a pointer row made
 * later still names the old key, so a row's created_at proves nothing and the object's LastModified proves exactly
 * what we need. After `since` every render of a listed line goes through the override at the one TTS door, so a new
 * object of these words is an override render. The same evidence basis the library reconcile uses ("s3-written-before-
 * expansion", tools/voices/reconcile-library.cjs).
 *
 * Fails CLOSED: an object whose date cannot be read is not reused (a fresh render costs a few characters; a wrong clip
 * costs a learner a misreading). A line the asking course does not list is passed through untouched, with no I/O.
 *
 * Applied where the candidates are picked, so every reuse path gets it: clip-index resolveClip (the TTS door's library,
 * the render route's library-first link, phase8 /generate's fill-pass reuse, reuseSiblingIntoCourse), the door's
 * candidates path for libraries without an index, phase8's own-course closing linker (linkAudioIdsBatch), and the
 * reuse planner (/reuse-plan, /reuse-apply).
 */

const { spokenFor, RULES } = require('./pronunciation-overrides.cjs')

/** True when the asking course renders this line through an override. Pure, no I/O. */
function overrideApplies(courseCode, text) {
  return !!spokenFor({ courseCode, text })
}

/** The instant the course's override went live (ms), or null. */
function sinceFor(courseCode) {
  const rule = RULES[courseCode]
  if (!rule || !rule.since) return null
  const t = Date.parse(rule.since)
  return Number.isFinite(t) ? t : null
}

// mastered/<uuid>.mp3 is write-once, so a key's date never changes: cache it for the process.
const writtenCache = new Map()
let s3Client = null

/** LastModified of an object in the audio bucket, as ms; null when it cannot be read. */
async function s3WrittenAt(s3Key) {
  if (!s3Key) return null
  if (writtenCache.has(s3Key)) return writtenCache.get(s3Key)
  const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3')
  if (!s3Client) s3Client = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' })
  let at = null
  try {
    const h = await s3Client.send(new HeadObjectCommand({ Bucket: process.env.S3_BUCKET || 'ssi-audio-stage', Key: s3Key }))
    at = h && h.LastModified ? new Date(h.LastModified).getTime() : null
  } catch (e) {
    console.warn(`[pronunciation-reuse-guard] cannot date ${s3Key} (${e.name || e.message}) — not reused`)
    return null // not cached: a transient failure should not stick
  }
  writtenCache.set(s3Key, at)
  return at
}

let defaultWrittenAt = s3WrittenAt
/** Tests inject a dater; nothing else should. */
function useWrittenAt(fn) { defaultWrittenAt = fn || s3WrittenAt; writtenCache.clear() }

/**
 * The rows that may answer `text` for `courseCode`. Untouched (same array) when the course does not list the line.
 * @param {object[]} rows   candidate clip rows ({ s3_key, ... })
 * @param {{courseCode: string, text: string}} want
 * @param {{writtenAt?: (s3Key: string) => Promise<number|null>}} [opts]
 */
async function allowedForOverride(rows, { courseCode, text }, { writtenAt = defaultWrittenAt } = {}) {
  if (!rows || !rows.length || !overrideApplies(courseCode, text)) return rows
  const since = sinceFor(courseCode)
  if (since == null) return [] // a listed line with no live date: nothing can be proven rendered with it
  const out = []
  for (const row of rows) {
    if (!row || !row.s3_key) continue
    const at = await writtenAt(row.s3_key)
    if (at != null && at >= since) out.push(row)
  }
  return out
}

/** Rows of mixed lines (each row's own `text`), one course: drop the misread clips of that course's listed lines. */
async function filterRowsByOwnText(rows, courseCode, opts = {}) {
  if (!rows || !rows.length || !RULES[courseCode]) return rows
  const out = []
  for (const row of rows) {
    if (row && overrideApplies(courseCode, row.text)) {
      if ((await allowedForOverride([row], { courseCode, text: row.text }, opts)).length) out.push(row)
    } else out.push(row)
  }
  return out
}

module.exports = { overrideApplies, sinceFor, allowedForOverride, filterRowsByOwnText, s3WrittenAt, useWrittenAt }
