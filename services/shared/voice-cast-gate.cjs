/**
 * THE CAST GATE — the last check before the one TTS door pays a provider.
 *
 * Tom, 2026-10-10 02:36Z (r-2026-10-10-no-clip-is-rendered-in-any): "No clips
 * should be being made in ANY course I haven't set Cartesia voices for." So a
 * NEW render happens only in a CARTESIA voice that the language's cast lists
 * (voice_language_roles — the casting Tom does in the Voice Lab). Read from that
 * table, never hard-coded here: changing who speaks English is a row, not a
 * commit. Every other case renders NOTHING — there is no Azure/xAI fallback that
 * fills the gap:
 *
 *   - 'uncast'        the language has no Cartesia cast row at all. (Until
 *                     2026-10-10 such a language was ungated and rendered in its
 *                     stored config — that is how eng_for_sin and eng_for_urd got
 *                     669 Azure known clips on 2026-10-10 under job #355.)
 *   - 'not-cartesia'  the voice asked for is Azure / xAI / ElevenLabs / anything
 *                     but Cartesia — even a voice the course already speaks.
 *   - 'not-in-cast'   a Cartesia voice the cast does not list.
 *
 *   - Only RENDERS are gated. An existing clip in ANY voice, cast or not,
 *     answers first — a recast applies to new content only (Tom, 2026-09-26,
 *     r-2026-09-26-a-recast-applies-to-new-content; a voice change never
 *     re-renders existing audio, 2026-09-20), so the old clips stay as they are.
 *   - A CARTESIA voice the COURSE ALREADY SPEAKS in that language is allowed for
 *     that course (Tom, 2026-09-29 10:17Z: existing courses keep their voice).
 *     That exemption no longer reaches a non-Cartesia voice: an Azure-English
 *     course's new lines are skipped, not rendered in Azure (2026-10-10).
 *   - An audition (door.audition) is exempt: hearing a candidate voice is how a
 *     voice gets cast in the first place, and an audition writes no course clip.
 *   - A failed read of the cast refuses the render. Not knowing the cast is not
 *     permission.
 *
 * A refusal is a CastRefusal (code VOICE_NOT_CAST, status 403, .reason), logged
 * as one line, so a caller filling a course (phase8 /generate) can count it as
 * a skip rather than a failure.
 */

const { tryCanonicalLanguage, tryCanonicalVoiceId } = require('./clip-identity.cjs')
const logger = require('./logger.cjs')('CastGate')

/** 'cym_n' / 'eng' / 'en-GB' → canonical language; dialect keys reduce to their language. */
function castRowLanguage(raw) {
  return tryCanonicalLanguage(raw) || tryCanonicalLanguage(String(raw || '').split('_')[0])
}

/** The one provider a new render may use (Tom, 2026-10-10). */
const isCartesiaVoice = (voiceId) => /^cartesia_/.test(String(voiceId || ''))

/**
 * Pure. May a NEW render of `language` use `voiceId`?
 * @returns {{ allowed: boolean, cast: string[], reason: null|'uncast'|'not-cartesia'|'not-in-cast' }}
 *   cast = the Cartesia voices the language lists
 */
function castAllowsVoice(language, voiceId, rows) {
  const mine = (rows || []).filter(r => castRowLanguage(r.language) === language)
  // A cast id that cannot be canonicalised is kept as spelt; only Cartesia rows
  // count as a cast — a language whose only rows are some other provider is uncast.
  const cast = [...new Set(mine.map(r => tryCanonicalVoiceId(r.voice_id) || String(r.voice_id)))].filter(isCartesiaVoice)
  if (!cast.length) return { allowed: false, cast, reason: 'uncast' }
  if (!isCartesiaVoice(voiceId)) return { allowed: false, cast, reason: 'not-cartesia' }
  if (!cast.includes(voiceId)) return { allowed: false, cast, reason: 'not-in-cast' }
  return { allowed: true, cast, reason: null }
}

const TTL_MS = 60_000
let injected = null
let cache = null
let injectedHolder = null

/** Tests inject who holds what; null restores the live read. */
function useCourseVoiceHolder(fn) { injectedHolder = fn }

/**
 * Does this course already hold a clip in this language in this voice? A course
 * keeps speaking the voice it already speaks until cloned voices replace it
 * wholesale (Tom, 2026-09-29 10:17Z) — a new line matches, it does not introduce
 * a second English voice beside the first.
 */
async function courseHoldsVoice(courseCode, language, voiceId) {
  if (injectedHolder) return injectedHolder(courseCode, language, voiceId)
  if (process.env.VITEST || !courseCode) return false
  const { createClient } = require('@supabase/supabase-js')
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  const { data, error } = await db.from('course_audio').select('id').eq('course_code', courseCode).eq('language', language).eq('voice_id', voiceId).limit(1)
  if (error) throw new Error(`TTS door: cannot read the course's clips (${error.message}) — refusing to render`)
  return !!(data && data.length)
}

/** Tests (and dry runs) inject the rows; null restores the live read. */
function useCastRows(rows) { injected = rows; cache = null }

async function castRows() {
  if (injected) return injected
  // A test never reads live config. An un-injected test gets null: the gate is
  // not in play, so tests of other door mechanics need not stage a cast. A test
  // OF the gate injects rows (and [] is a real, empty cast: everything refused).
  if (process.env.VITEST) return null
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows
  const { createClient } = require('@supabase/supabase-js')
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('TTS door: cannot read the language cast (SUPABASE_URL / SUPABASE_SERVICE_KEY not set) — refusing to render')
  }
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  const { data, error } = await db.from('voice_language_roles').select('language, voice_id')
  if (error) throw new Error(`TTS door: cannot read the language cast (${error.message}) — refusing to render`)
  cache = { at: Date.now(), rows: data || [] }
  return cache.rows
}

class CastRefusal extends Error {
  constructor(message, reason, language, voiceId) {
    super(message); this.code = 'VOICE_NOT_CAST'; this.status = 403; this.reason = reason; this.language = language; this.voiceId = voiceId
  }
}

/**
 * May a NEW render of `language` in `voiceId` happen for this course? The
 * single verdict the door (assertCastVoice) and phase8's pre-skip both use, so
 * the plan and the door can never disagree.
 */
async function castVerdict(language, voiceId, { audition = false, courseCode = null } = {}) {
  if (audition) return { allowed: true, cast: [], reason: null }
  const rows = await castRows()
  if (rows === null) return { allowed: true, cast: [], reason: null }   // un-injected test only
  const v = castAllowsVoice(language, voiceId, rows)
  // Tom 2026-09-29: a course keeps the voice it already speaks — Cartesia only (2026-10-10).
  if (v.reason === 'not-in-cast' && courseCode && await courseHoldsVoice(courseCode, language, voiceId)) return { ...v, allowed: true, reason: null }
  return v
}

function refusalMessage(language, voiceId, { reason, cast }) {
  if (reason === 'uncast') return `Voice not cast for ${language} (403): no Cartesia voice is cast for ${language}, so no ${language} clip is rendered (${voiceId} refused; Tom 2026-10-10: no clip in a course he has not cast in Cartesia). Cast it in the Voice Lab.`
  if (reason === 'not-cartesia') return `Voice not cast for ${language} (403): ${voiceId} is not a Cartesia voice — no Azure/xAI/other render fills a gap (Tom 2026-10-10); the ${language} cast is ${cast.join(', ')}.`
  return `Voice not cast for ${language} (403): ${voiceId} may not render new ${language} audio; the cast is ${cast.join(', ')}. Cast it in the Voice Lab, or audition it (door.audition).`
}

/** Throws a CastRefusal (403) when a new render would use a voice the language's Cartesia cast does not list. */
async function assertCastVoice(language, voiceId, opts = {}) {
  const v = await castVerdict(language, voiceId, opts)
  if (v.allowed) return
  const msg = refusalMessage(language, voiceId, v)
  logger.warn(`skip ${opts.courseCode || '-'} ${language} ${voiceId}: ${v.reason}`)
  throw new CastRefusal(msg, v.reason, language, voiceId)
}

const isCastRefusal = (err) => !!err && err.code === 'VOICE_NOT_CAST'

/**
 * Split a fill pass's items { role, language, voiceId } into those the gate lets
 * render and those it will refuse, BEFORE the pass — so a plan (dry run) counts
 * only what can be rendered, and the skip is logged once per role/language/voice
 * rather than once per line. One verdict per distinct (language, voice).
 * An item with no voice or a broken language stays in `cast`: it fails on its own.
 * The uncast items still go to the door — a library clip may answer them for
 * free — and the door refuses the rest (isCastRefusal), which a caller counts
 * as skipped, not failed.
 */
async function partitionByCast(items, courseCode, verdict = castVerdict) {
  const memo = new Map()
  const cast = [], uncast = [], tally = new Map()
  for (const item of items || []) {
    const voiceId = item.voiceId ? (tryCanonicalVoiceId(item.voiceId) || String(item.voiceId)) : null
    if (!voiceId || !item.language || item.identityError) { cast.push(item); continue }
    const k = `${item.language}|${voiceId}`
    if (!memo.has(k)) memo.set(k, await verdict(item.language, voiceId, { courseCode }))
    const v = memo.get(k)
    if (v.allowed) { cast.push(item); continue }
    uncast.push(item)
    const t = `${item.role}|${k}|${v.reason}`
    if (!tally.has(t)) tally.set(t, { role: item.role, language: item.language, voiceId, reason: v.reason, count: 0 })
    tally.get(t).count++
  }
  return { cast, uncast, summary: [...tally.values()] }
}

module.exports = { castAllowsVoice, castVerdict, partitionByCast, castRowLanguage, assertCastVoice, isCastRefusal, isCartesiaVoice, CastRefusal, useCastRows, useCourseVoiceHolder }
