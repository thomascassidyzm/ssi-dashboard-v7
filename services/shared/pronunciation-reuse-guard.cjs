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

const { courseSpokenFor, wordRulesFor, languageKey, RULES, WORD_RULES } = require('./pronunciation-overrides.cjs')

/**
 * True when the asking course renders this line through an override: a line rule of the course, or (given the line's
 * language) a word rule of the language (English Sarah / risotto, job #776). Pure, no I/O.
 */
function overrideApplies(courseCode, text, language) {
  return !!courseSpokenFor({ courseCode, text }) || (!!language && wordRulesFor({ language, text }).length > 0)
}

const dateOf = (iso) => { const t = Date.parse(iso || ''); return Number.isFinite(t) ? t : null }

/** The instant the course's override went live (ms), or null. */
function sinceFor(courseCode) {
  const rule = RULES[courseCode]
  return rule && rule.since ? dateOf(rule.since) : null
}

/**
 * Which clips of this line must prove they were rendered with the override, and from when. A course line rule binds
 * every clip of the line. A WORD rule is Cartesia IPA, sent only to Cartesia (tts-service speak()), so it binds only
 * Cartesia clips: an Azure, xAI or human clip of "Good morning, Sarah!" was never going to be rendered with it, and its
 * date proves nothing either way. A row with no voice_id is bound (fails closed).
 * @returns {null | { since: number|null, appliesTo: (row) => boolean }}
 */
function overrideFor(courseCode, text, language) {
  const line = !!courseSpokenFor({ courseCode, text })
  const words = language ? wordRulesFor({ language, text }).length > 0 : false
  if (!line && !words) return null
  if (line) {
    const a = sinceFor(courseCode)
    const b = words ? dateOf(WORD_RULES[languageKey(language)].since) : null
    // Both apply: a clip must postdate both (null if either has no live date — nothing can be proven).
    const since = a == null || (words && b == null) ? null : Math.max(a, b || 0)
    return { since, appliesTo: () => true }
  }
  return {
    since: dateOf(WORD_RULES[languageKey(language)].since),
    appliesTo: (row) => !row.voice_id || /^cartesia/i.test(String(row.voice_id)),
  }
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
async function allowedForOverride(rows, { courseCode, text, language }, { writtenAt = defaultWrittenAt } = {}) {
  if (!rows || !rows.length) return rows
  // The want's language when it has one; else each row's own (a row of these words in another language is its own line).
  const fixed = language ? overrideFor(courseCode, text, language) : null
  if (language && !fixed) return rows
  const out = []
  for (const row of rows) {
    if (!row) continue
    const rule = fixed || overrideFor(courseCode, text, row.language)
    if (!rule || !rule.appliesTo(row)) { out.push(row); continue }
    if (rule.since == null || !row.s3_key) continue // a listed line with no live date: nothing can be proven rendered with it
    const at = await writtenAt(row.s3_key)
    if (at != null && at >= rule.since) out.push(row)
  }
  return out
}

/** Rows of mixed lines (each row's own `text`), one course: drop the misread clips of that course's listed lines. */
async function filterRowsByOwnText(rows, courseCode, opts = {}) {
  if (!rows || !rows.length) return rows
  const out = []
  for (const row of rows) {
    if (row && overrideApplies(courseCode, row.text, row.language)) {
      if ((await allowedForOverride([row], { courseCode, text: row.text, language: row.language }, opts)).length) out.push(row)
    } else out.push(row)
  }
  return out
}

module.exports = { overrideApplies, overrideFor, sinceFor, allowedForOverride, filterRowsByOwnText, s3WrittenAt, useWrittenAt }
