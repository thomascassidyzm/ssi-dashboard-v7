/**
 * THE CAST GATE — the last check before the one TTS door pays a provider.
 *
 * Tom, 2026-10-10 (r-2026-10-10-new-phrase-audio-may-render-only, superseding the
 * 02:36Z Cartesia-only ruling): new-phrase audio may render ONLY
 *
 *   (a) TOM-CAST — the language has a Cartesia cast TOM chose, and the voice is
 *       in it. Read from voice_language_roles (the Voice Lab casting), never
 *       hard-coded here: changing who speaks a language is a row, not a commit.
 *       A row counts only if it is TOM'S (isTomCastRow): not the 2026-09-04
 *       DRAFT casting (#446·E, 124 rows noted "draft casting 2026-09-04 —
 *       mechanical fill … no taste applied"), and authored by Tom's own Voice
 *       Lab account or under a named ruling. The draft rows and the rows a test
 *       identity wrote are not a cast. (#670 counted them, and the 355 release
 *       rendered 403 por_br_for_eng clips in a draft voice on 2026-10-10.)
 *   (b) AZURE-ONLY — the course's existing voices in that language are ALL
 *       Azure, and the new line is in one of those same Azure voices
 *       (azureOnlyAllows). "Existing voices" = the voices of the course's own
 *       known/target1/target2 clips in that language; presentation clips are
 *       judged on their own (an Azure intro voice in a course whose lines are
 *       otherwise allowed keeps its intro voice). Pod roles and the fixed
 *       narration roles (welcome/instruction/…) do not count either way.
 *
 * Everything else renders NOTHING: a draft-cast language, an uncast one, a
 * course whose voices in the language are mixed, a voice outside the cast. xAI
 * is banned outright (Tom 2026-10-10). Reasons, in CastRefusal.reason:
 *   'banned-provider' an xAI voice — never rendered, whatever else is true.
 *   'draft-cast'      the language's only Cartesia rows are draft/unapproved.
 *   'uncast'          the language has no Cartesia cast row at all.
 *   'not-cartesia'    a Tom-cast language asked for a non-Cartesia voice the
 *                     course is not Azure-only in.
 *   'not-in-cast'     a Cartesia voice Tom's cast does not list.
 *
 *   - Only RENDERS are gated. An existing clip in ANY voice answers first — a
 *     recast applies to new content only (Tom 2026-09-26), and a voice change
 *     never re-renders existing audio (2026-09-20). Nothing here deletes a clip
 *     (r-2026-10-10-never-delete-audio-clips).
 *   - A CARTESIA voice the COURSE ALREADY SPEAKS in a Tom-cast language is
 *     allowed for that course (Tom 2026-09-29 10:17Z: existing courses keep
 *     their voice) — unless that voice is one only the draft cast named.
 *   - An audition (door.audition) is exempt: hearing a candidate voice is how a
 *     voice gets cast, and an audition writes no course clip.
 *   - A failed read of the cast or of the course's voices refuses the render.
 *     Not knowing is not permission.
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

/**
 * Tom 2026-10-10 03:49Z (r-2026-10-10-tom-s-cartesia-cast-is-per-language-variety): "Not Canadian
 * French!!! I haven't set that." His cast is per VARIETY. A cast row's key is 'fra' (the base) or
 * 'fra_ca' (a variety); a variety's rows never cover the base and the base's never cover a variety.
 * The course's variety is the side of its code ('fra_ca_for_eng' → target 'fra_ca') whose language
 * is the one being rendered; a plain code side ('fra') is the base. (#700 reduced 'fra_ca' to 'fra'.)
 */
const rowKey = (raw) => String(raw || '').trim().toLowerCase().replace(/-/g, '_')
function castKeyOf(language, courseCode) {
  const m = /^(.+?)_for_(.+)$/.exec(String(courseCode || '').toLowerCase())
  if (m) for (const side of [m[1], m[2]]) if (side.includes('_') && castRowLanguage(side) === language) return side
  return language
}
/** Does this voice_language_roles row belong to cast key `key` — exactly, never by reduction? */
function rowIsForKey(row, key) {
  const k = rowKey(row.language)
  return k.includes('_') ? k === key : (tryCanonicalLanguage(k) || k) === key
}

const isCartesiaVoice = (voiceId) => /^cartesia_/.test(String(voiceId || ''))
const isAzureVoice = (voiceId) => /^azure_/.test(String(voiceId || ''))
/** Tom 2026-10-10: xAI is banned outright — no xAI render, ever. */
const isBannedVoice = (voiceId) => /^xai_/.test(String(voiceId || ''))

/**
 * The accounts whose Voice Lab casting IS Tom's casting. The Voice Lab writes
 * assigned_by = the signed-in user (voicelab/router.cjs who(user)).
 */
const TOM_CAST_IDENTITIES = new Set(['thomas.cassidy+ssi@gmail.com'])
const DRAFT_NOTE = /^\s*draft casting\b/i

/**
 * Is this voice_language_roles row a cast Tom chose? Not a draft, and either
 * written from Tom's own Voice Lab account, or recorded under a named ruling
 * ('tom-ruling-2026-09-03', 'kai-ruling-2026-09-23-charlotte-everywhere' — the
 * English casting rulings), or carrying Tom's ruling in its note ("Tom
 * 2026-09-21: cast Aran's clone as the English guide"). A row a test identity
 * wrote with no ruling (ara_eg/ara_lb m1, 2026-10-03) is not Tom's.
 */
function isTomCastRow(row) {
  if (!row) return false
  const notes = String(row.notes || '')
  if (DRAFT_NOTE.test(notes)) return false
  const by = String(row.assigned_by || '').trim().toLowerCase()
  if (TOM_CAST_IDENTITIES.has(by)) return true
  if (/(^|-)ruling-\d{4}-\d{2}-\d{2}/.test(by)) return true
  return /^\s*Tom('s)?\b/.test(notes)
}

const canonVoice = (v) => (v ? (tryCanonicalVoiceId(v) || String(v)) : null)

/**
 * Pure. May a NEW render of `language` use `voiceId` under TOM'S cast (leg a)?
 * @returns {{ allowed: boolean, cast: string[], draftOnly: string[], reason: null|'banned-provider'|'draft-cast'|'uncast'|'not-cartesia'|'not-in-cast' }}
 *   cast = Tom's Cartesia voices for the language; draftOnly = Cartesia voices
 *   only a draft/unapproved row names (the 09-29 held-voice exemption never
 *   reaches these)
 */
function castAllowsVoice(language, voiceId, rows) {
  const mine = (rows || []).filter(r => rowIsForKey(r, language) && isCartesiaVoice(canonVoice(r.voice_id)))
  const cast = [...new Set(mine.filter(isTomCastRow).map(r => canonVoice(r.voice_id)))]
  const draftOnly = [...new Set(mine.filter(r => !isTomCastRow(r)).map(r => canonVoice(r.voice_id)))].filter(v => !cast.includes(v))
  const base = { cast, draftOnly }
  if (isBannedVoice(voiceId)) return { ...base, allowed: false, reason: 'banned-provider' }
  if (!cast.length) return { ...base, allowed: false, reason: draftOnly.length ? 'draft-cast' : 'uncast' }
  if (!isCartesiaVoice(voiceId)) return { ...base, allowed: false, reason: 'not-cartesia' }
  if (!cast.includes(voiceId)) return { ...base, allowed: false, reason: 'not-in-cast' }
  return { ...base, allowed: true, reason: null }
}

/** The course clip roles that define a course's voices in a language (leg b). */
const LINE_ROLES = new Set(['known', 'target1', 'target2'])
const PRESENTATION_ROLES = new Set(['presentation'])
const roleClass = (role) => (PRESENTATION_ROLES.has(role) ? 'presentation' : LINE_ROLES.has(role) ? 'lines' : null)

/**
 * Pure. Fold course_clip_voices rows ({role, voice_id, language, clips}) into
 * { 'lang|lines': Set(voices), 'lang|presentation': Set(voices) }.
 */
function courseVoiceProfile(censusRows) {
  const out = {}
  for (const r of censusRows || []) {
    const cls = roleClass(r.role)
    const lang = castRowLanguage(r.language)
    if (!cls || !lang || !(Number(r.clips) > 0)) continue
    const k = `${lang}|${cls}`
    ;(out[k] = out[k] || new Set()).add(canonVoice(r.voice_id))
  }
  return out
}

const allAzure = (set) => !!set && set.size > 0 && [...set].every(isAzureVoice)

/**
 * Pure. Leg (b): may this course render a new `role` line in `language` in the
 * Azure voice `voiceId`? Yes only when the course's existing voices for that
 * class in that language are ALL Azure and include this one. A presentation
 * line also needs the course's lines in the language to be allowed — Tom-cast
 * (`tomCast`) or themselves Azure-only.
 */
function azureOnlyAllows(profile, language, voiceId, role, tomCast) {
  if (!profile || !isAzureVoice(voiceId)) return false
  const lines = profile[`${language}|lines`]
  if (roleClass(role) === 'presentation') {
    const pres = profile[`${language}|presentation`]
    return allAzure(pres) && pres.has(voiceId) && (tomCast || allAzure(lines))
  }
  return allAzure(lines) && lines.has(voiceId)
}

const TTL_MS = 60_000
let injected = null
let cache = null
let injectedHolder = null
let injectedProfile = null
const profileCache = new Map()

/** Tests inject who holds what; null restores the live read. */
function useCourseVoiceHolder(fn) { injectedHolder = fn }
/** Tests inject a course's census rows: fn(courseCode) → rows; null restores the live read. */
function useCourseVoiceCensus(fn) { injectedProfile = fn; profileCache.clear() }

function liveDb() {
  const { createClient } = require('@supabase/supabase-js')
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('TTS door: cannot read the cast (SUPABASE_URL / SUPABASE_SERVICE_KEY not set) — refusing to render')
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
}

/**
 * Does this course already hold a clip in this language in this voice? A course
 * keeps speaking the voice it already speaks until cloned voices replace it
 * wholesale (Tom, 2026-09-29 10:17Z) — a new line matches, it does not introduce
 * a second English voice beside the first.
 */
async function courseHoldsVoice(courseCode, language, voiceId) {
  if (injectedHolder) return injectedHolder(courseCode, language, voiceId)
  if (process.env.VITEST || !courseCode) return false
  const { data, error } = await liveDb().from('course_audio').select('id').eq('course_code', courseCode).eq('language', language).eq('voice_id', voiceId).limit(1)
  if (error) throw new Error(`TTS door: cannot read the course's clips (${error.message}) — refusing to render`)
  return !!(data && data.length)
}

/** The course's voices per language/role class (leg b), from course_clip_voices() (ops/sql/20261010-course-clip-voices.sql); cached a minute. */
async function courseProfile(courseCode) {
  if (!courseCode) return null
  if (injectedProfile) return courseVoiceProfile(await injectedProfile(courseCode))
  if (process.env.VITEST) return null
  const hit = profileCache.get(courseCode)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.profile
  const { data, error } = await liveDb().rpc('course_clip_voices', { p_course: courseCode })
  if (error) throw new Error(`TTS door: cannot read the course's voices (${error.message}) — refusing to render`)
  const profile = courseVoiceProfile(data || [])
  profileCache.set(courseCode, { at: Date.now(), profile })
  return profile
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
  const { data, error } = await liveDb().from('voice_language_roles').select('language, voice_id, notes, assigned_by')
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
 * May a NEW `role` render of `language` in `voiceId` happen for this course?
 * The single verdict the door (assertCastVoice) and phase8's pre-skip both use,
 * so the plan and the door can never disagree. `via` says which leg allowed it.
 */
async function castVerdict(language, voiceId, { audition = false, courseCode = null, role = null, intro = false } = {}) {
  if (intro) role = 'presentation'   // the door knows the intro SLOT, never a role
  if (audition) return { allowed: true, cast: [], reason: null, via: 'audition' }
  const rows = await castRows()
  if (rows === null) return { allowed: true, cast: [], reason: null, via: 'test' }   // un-injected test only
  voiceId = canonVoice(voiceId)
  const castKey = castKeyOf(language, courseCode)   // 'fra_ca' for a Canadian-French course, 'fra' for plain French
  const v = castAllowsVoice(castKey, voiceId, rows)
  if (v.allowed) return { ...v, castKey, via: 'tom-cast' }
  if (v.reason === 'banned-provider') return { ...v, castKey }
  // Tom 2026-09-29: a course keeps the Cartesia voice it already speaks — never one only the draft named.
  if (v.reason === 'not-in-cast' && courseCode && !v.draftOnly.includes(voiceId) && await courseHoldsVoice(courseCode, language, voiceId)) {
    return { ...v, castKey, allowed: true, reason: null, via: 'held-voice' }
  }
  // Leg (b): the course's existing voices in the language are all Azure, and this is one of them.
  if (isAzureVoice(voiceId) && courseCode) {
    const tomCast = v.cast.length > 0
    if (azureOnlyAllows(await courseProfile(courseCode), language, voiceId, role, tomCast)) return { ...v, allowed: true, reason: null, via: 'azure-only' }
  }
  return { ...v, castKey }
}

function refusalMessage(language, voiceId, { reason, cast, castKey }) {
  language = castKey || language
  const tail = `(Tom 2026-10-10: new audio only in a language he has cast in Cartesia, or in a course whose voices in it are all Azure, in those voices)`
  if (reason === 'banned-provider') return `Voice not cast for ${language} (403): ${voiceId} is an xAI voice — xAI is banned outright (Tom 2026-10-10).`
  if (reason === 'draft-cast') return `Voice not cast for ${language} (403): ${language} has only the 2026-09-04 draft casting, which Tom never chose, so no ${language} clip is rendered (${voiceId} refused) ${tail}.`
  if (reason === 'uncast') return `Voice not cast for ${language} (403): no Cartesia voice is cast for ${language}, so no ${language} clip is rendered (${voiceId} refused) ${tail}.`
  if (reason === 'not-cartesia') return `Voice not cast for ${language} (403): ${voiceId} is not a Cartesia voice and this course's ${language} voices are not all Azure; the ${language} cast is ${cast.join(', ')} ${tail}.`
  return `Voice not cast for ${language} (403): ${voiceId} may not render new ${language} audio; Tom's cast is ${cast.join(', ')}. Cast it in the Voice Lab, or audition it (door.audition).`
}

/** Throws a CastRefusal (403) when a new render is outside Tom's cast and not an Azure-only course voice. */
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
 * rather than once per line. One verdict per distinct (role class, language, voice).
 * An item with no voice or a broken language stays in `cast`: it fails on its own.
 * The uncast items still go to the door — a library clip may answer them for
 * free — and the door refuses the rest (isCastRefusal), which a caller counts
 * as skipped, not failed.
 */
async function partitionByCast(items, courseCode, verdict = castVerdict) {
  const memo = new Map()
  const cast = [], uncast = [], tally = new Map()
  for (const item of items || []) {
    const voiceId = canonVoice(item.voiceId)
    if (!voiceId || !item.language || item.identityError) { cast.push(item); continue }
    const k = `${item.language}|${voiceId}`
    const mk = `${roleClass(item.role) || item.role}|${k}`
    if (!memo.has(mk)) memo.set(mk, await verdict(item.language, voiceId, { courseCode, role: item.role }))
    const v = memo.get(mk)
    if (v.allowed) { cast.push(item); continue }
    uncast.push(item)
    const t = `${item.role}|${k}|${v.reason}`
    if (!tally.has(t)) tally.set(t, { role: item.role, language: item.language, voiceId, reason: v.reason, count: 0 })
    tally.get(t).count++
  }
  return { cast, uncast, summary: [...tally.values()] }
}

/**
 * Pure. Apply a pass's line limit AFTER the cast split, cast lines first (#689):
 * slicing first let a run of uncast lines at the head of the queue fill the
 * whole limit, so every pass re-tried the same refused lines and the cast lines
 * behind them never rendered. Uncast lines still ride along in whatever room is
 * left — the door answers them from the library when a clip exists.
 * `summary` stays the whole queue's tally.
 */
function limitCastFirst({ cast, uncast, summary }, limit) {
  const n = Number.isFinite(Number(limit)) && Number(limit) >= 0 ? Number(limit) : Infinity
  const c = cast.slice(0, n)
  const u = uncast.slice(0, Math.max(0, n - c.length))
  return { items: [...c, ...u], cast: c, uncast: u, summary }
}

module.exports = {
  limitCastFirst, castAllowsVoice, castKeyOf, castVerdict, partitionByCast, castRowLanguage, assertCastVoice, isCastRefusal, isCartesiaVoice, isAzureVoice,
  isTomCastRow, courseVoiceProfile, azureOnlyAllows, CastRefusal, useCastRows, useCourseVoiceHolder, useCourseVoiceCensus,
}
