/**
 * Phase 8: Audio Generation Service (v13)
 *
 * IMPORTANT: DATABASE-ONLY ARCHITECTURE (January 2026)
 * =====================================================
 * This service reads course data from Supabase and writes audio records
 * directly to the course_audio table (flat, course-owned).
 *
 * Data Sources (all from Supabase):
 * - courses: Course metadata and voice configuration
 * - course_legos: LEGO definitions to generate audio for
 * - course_practice_phrases: Practice phrases to generate audio for
 *
 * JSON files are NOT read. Audio metadata is written to Supabase.
 * Audio files are stored in S3 (ssi-audio-stage bucket).
 *
 * @version 13.0.0
 * @port 3465
 */

require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
const { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const { v4: uuidv4 } = require('uuid')
const { AUDIO_CACHE_CONTROL } = require('../shared/audio-cache-control.cjs')
const fs = require('fs-extra')
const path = require('path')
const os = require('os')
const { bumpCourseVersion, bumpCourseRevalidation } = require('../shared/course-version.cjs')
const { normalizeForAudio, audioKeyCandidates } = require('../shared/text-normalize.cjs')
const { pickPreferredAudioRow } = require('../shared/audio-link-preference.cjs')
const { decideCopy } = require('../shared/clone-copy-match.cjs')
const { buildSourceIndex } = require('../shared/clone-copy-index.cjs')
const createLogger = require('../shared/logger.cjs')
const { identity: buildIdentity } = require('../shared/build-identity.cjs')
const ttsService = require('../tts-service.cjs')
const { toBcp47 } = require('../voice-discovery-service.cjs')
const audioProcessor = require('../audio-processor.cjs')
const genderService = require('../gender-expansion-service.cjs')
const genderHaikuService = require('../gender-haiku-service.cjs')
const veracity = require('../audio-veracity.cjs')

const { claudeChat, HAIKU_MODEL } = require('../shared/claude-cli.cjs')
const presentationAuthor = require('./presentation-author.cjs')
const { emitProgress } = require('../shared/emit-progress.cjs')
const { fulfillAudioPassRequests } = require('../shared/audio-pass-queue.cjs')
const { isHumanVoiceCourse } = require('../shared/human-voice-courses.cjs')
const logger = createLogger('Phase8-Audio-v13')
const { bulkGetRegenerationCounts } = require('../supabase-client.cjs')
const { toIso3, getName: getLangEnglishName, databaseToManifest, getAzureLocale } = require('../language-code-service.cjs')
const {
  canonicalLanguage,
  canonicalVoiceId,
  tryCanonicalLanguage,
  tryCanonicalVoiceId,
  PROVIDER_ALIASES,
} = require('../shared/clip-identity.cjs')

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PHASE8_PORT || 3465  // Always use PHASE8_PORT, not generic PORT
// Bind loopback-only by default. watson-1 has a public IP, so a bare listen()
// (all interfaces) puts this service straight on the internet. Set BIND_HOST
// explicitly if a service ever needs to be reachable off-box — and put it
// behind the tailscale proxy rather than 0.0.0.0.
const HOST = process.env.BIND_HOST || '127.0.0.1'

// =============================================================================
// CLIENTS
// =============================================================================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
)

// S3 uploads were the REAL source of the bulk-pod ECONNRESET cascade (2026-06-08):
// the bare client uses Node's https.globalAgent (keepAlive:true but
// maxSockets:Infinity), so a concurrent fan-out opens unbounded TLS connections
// that flood the router NAT table → resets (provider-agnostic, same family as the
// 2026-06-07 TTS windows). Bound the socket pool + reuse connections, and let the
// SDK retry transient network errors (ECONNRESET) instead of failing the clip.
const https = require('https')
const { NodeHttpHandler } = require('@smithy/node-http-handler')
const s3KeepAliveAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: Number(process.env.S3_MAX_SOCKETS) > 0 ? Math.floor(Number(process.env.S3_MAX_SOCKETS)) : 16,
  maxFreeSockets: 8,
})
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-1',
  maxAttempts: Number(process.env.S3_MAX_ATTEMPTS) > 0 ? Math.floor(Number(process.env.S3_MAX_ATTEMPTS)) : 6,
  requestHandler: new NodeHttpHandler({
    httpsAgent: s3KeepAliveAgent,
    connectionTimeout: 6000,
    requestTimeout: 60000,
  }),
})

/**
 * Get the effective release target for a course.
 * Rule: if a seed has been decomposed (has LEGOs), it needs audio.
 * Uses the actual max decomposed seed_number, not a configured value.
 */
async function getEffectiveReleaseTarget(courseCode, courseSeedCount) {
  const { data } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', courseCode)
    .order('seed_number', { ascending: false })
    .limit(1)
  const maxDecomposed = data?.[0]?.seed_number || 0
  // Use the higher of: actual decomposed seeds vs configured seed_count vs 260 fallback
  return Math.max(maxDecomposed, courseSeedCount || 0, 260)
}
const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'

/**
 * Is the object really in the bucket? A course_audio row is a claim about
 * audio; only storage settles it. Returns true/false, and `null` when the
 * bucket could not be asked at all (network/permissions) — callers must not
 * read a failed question as a missing file.
 */
async function s3ObjectExists(s3Key) {
  if (!s3Key || s3Key.startsWith('pending/')) return false
  try {
    await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }))
    return true
  } catch (e) {
    const status = e?.$metadata?.httpStatusCode
    if (status === 404 || e?.name === 'NotFound' || e?.name === 'NoSuchKey') return false
    logger.warn(`s3ObjectExists(${s3Key}): could not verify (${e?.name || e?.message}) — not treated as missing`)
    return null
  }
}

// =============================================================================
// LANGUAGE NAMES (for presentation templates)
// =============================================================================

// Get the target language name localised into the known language.
// Uses Intl.DisplayNames (488 languages via CLDR) with language-code-service fallback.
// No hardcoded maps — adding a new language Just Works.
// Lives in presentation-author now, so the Script Viewer's edit affordance and
// the audio pipeline name a language identically. Kept as a local alias because
// this file calls it from five places.
const getLocalisedLangName = presentationAuthor.localisedLangName

// Canonical text normalization — see services/shared/text-normalize.cjs
const normalizeText = normalizeForAudio

// ─── clip identity: one spelling for language and voice ──────────────────────
//
// A clip's identity is (language, text_normalized, voice_id)
// (docs/architecture/AUDIO_PIPELINE_CONTENT_ADDRESSED_DESIGN-2026-08-06.md), and
// it only dedups if the same clip is always SPELT the same. Two rules run
// through everything below:
//
//   1. The value that goes to the PROVIDER stays raw. Azure wants
//      'en-GB-SoniaNeural' in its SSML, xAI wants 'leo' — handing either a
//      canonical 'azure_…'/'xai_…' id breaks the render. Only the value that
//      goes into a DB column is canonicalised.
//   2. Reads compare canonical to canonical. Live data still holds both
//      spellings, so a read cannot filter on one of them in SQL and be honest;
//      it fetches the candidates on the drift-free part of the key
//      (course/text/role) and matches the two drifting columns in JS.

/** True when the id already carries a provider prefix clip-identity recognises. */
function hasProviderPrefix(voiceId) {
  const m = String(voiceId == null ? '' : voiceId).trim().match(/^([A-Za-z0-9]+)[_:]/)
  return !!(m && PROVIDER_ALIASES[m[1].toLowerCase()])
}

/**
 * Canonical voice id for a DB write, given a voice from course config.
 *
 * The id's own prefix always wins: a config that carries BOTH a prefixed id
 * and a `provider` key (or a defaulted one — getCourseContext defaults
 * 'azure') would otherwise make canonicalVoiceId throw on the disagreement.
 * The provider hint is only offered when there is no prefix to read.
 *
 * Composites keep their own namespace and are composed part-by-part, never
 * handed in whole: 'comp:<a>+<b>' is a splice recipe, and a spliced explainer
 * must never collapse onto a plain single-voice render of the same text.
 */
function canonicalClipVoiceId(voiceId, provider) {
  const raw = String(voiceId == null ? '' : voiceId).trim()
  if (/^comp:/i.test(raw)) {
    const parts = raw.slice(5).split('+').map(p => p.trim()).filter(Boolean)
    if (!parts.length) throw new Error(`cannot canonicalise voice_id ${JSON.stringify(voiceId)}: composite with no parts`)
    return 'comp:' + parts.map(p => canonicalClipVoiceId(p, provider)).join('+')
  }
  return hasProviderPrefix(raw)
    ? canonicalVoiceId(raw)
    : canonicalVoiceId(raw, { provider })
}

/** Non-throwing canonicalClipVoiceId — null when the value cannot be resolved. */
function tryCanonicalClipVoiceId(voiceId, provider) {
  try {
    return canonicalClipVoiceId(voiceId, provider)
  } catch (_) {
    return null
  }
}

/**
 * Does a stored row's language/voice mean the same clip as the one we are
 * about to render?
 *
 * `permissive` is for the PRECIOUS-AUDIO guard ONLY. There, a stored value we
 * cannot canonicalise ('legacy_import', 'auto', a bare 'human') counts as a
 * match, because the two errors are not symmetric: a false positive costs one
 * skipped TTS render, a false negative writes a TTS twin of a human recording.
 * Dedup reads never pass it — a false positive there links the WRONG audio.
 */
function identityFieldMatches(requested, stored, canon, permissive = false) {
  if (requested === stored) return true
  const cs = canon(stored)
  if (cs == null) return !!permissive
  const cr = canon(requested)
  if (cr == null) return false
  return cr === cs
}

const sameLanguage = (requested, stored, permissive) =>
  identityFieldMatches(requested, stored, tryCanonicalLanguage, permissive)
const sameVoice = (requested, stored, permissive) =>
  identityFieldMatches(requested, stored, v => tryCanonicalClipVoiceId(v), permissive)

/**
 * Get or generate presentation template for a known language.
 * Looks up presentation_templates first; if none exists, uses Haiku to
 * generate one in the known language and caches it for future use.
 *
 * @param {string} knownLang - ISO 639-3 language code for the known language
 * @returns {Promise<string>} The presentation template string
 */
// Presentation template lookup/creation lives in presentation-author.cjs now
// (shared with the one-button authoring path). Same behaviour, same cache.
const getOrCreatePresentationTemplate = (knownLang) =>
  presentationAuthor.getOrCreatePresentationTemplate(supabase, knownLang, getLocalisedLangName(knownLang, 'eng'))

// Punctuation-only filter (single source of truth, shared with production-api)
const { isPunctuationOnly } = require('../shared/text-classification.cjs')

// =============================================================================
// CONCURRENCY SETTINGS
// =============================================================================

// Azure TTS S0 (Standard) tier limits:
// - 200 transactions per second (TPS)
// - 20 concurrent connections max
// Default 20 = max concurrency for paid tier
const CONCURRENCY = parseInt(process.env.AUDIO_CONCURRENCY, 10) || 20

/**
 * Fetch ALL existing audio for a course from course_audio.
 * Avoids pagination entirely — uses a single query with high limit.
 * Supabase PostgREST supports up to ~100k rows per request with select.
 * We deduplicate into a Set anyway, so even if Supabase returns some overlap, it's fine.
 * @param {string} courseCode
 * @returns {Set} Set of "normalizedText|language|role" keys for existing audio
 */
async function getExistingAudioSet(courseCode) {
  // Fetch in one large batch — course_audio per course is typically 10k-30k rows
  // Using .limit() avoids the 1000-row default without needing ORDER BY
  // Fetch raw `text` column so we can normalize it ourselves — text_normalized
  // may have been written by old code that stripped ?! (we now preserve them)
  const { data, error } = await supabase
    .from('course_audio')
    .select('text, language, role, s3_key')
    .eq('course_code', courseCode)
    .not('s3_key', 'like', 'pending/%')
    .limit(100000)

  if (error) throw error

  // Exact matching only. "emin misin?" and "emin misin" are DIFFERENT audio files
  // because ? changes TTS intonation (question vs statement).
  // normalizeForAudio no longer strips trailing ? — so keys are exact.
  // key -> s3_key of the row that satisfies it. Kept alongside the membership
  // set so a caller can ask storage whether that object is actually there —
  // a DB row is a claim about audio, not proof of it.
  const innerSet = new Map()
  for (const a of (data || [])) {
    const norm = normalizeText(a.text)
    const key = `${norm}|${a.language}|${a.role}`
    if (!innerSet.has(key)) innerSet.set(key, a.s3_key)
  }

  const existingSet = {
    has(key) { return innerSet.has(key) },
    s3KeyFor(key) { return innerSet.get(key) || null },
    get size() { return innerSet.size }
  }
  logger.info(`getExistingAudioSet(${courseCode}): ${data?.length || 0} rows, ${innerSet.size} unique keys`)
  return existingSet
}

// =============================================================================
// PRECIOUS-AUDIO GUARD: origin='human' rows are irreplaceable recordings.
// Every TTS write path must check the upsert conflict key
// (course_code,text_normalized,language,role,voice_id) BEFORE writing — a
// human row must never have its s3_key/origin/voice_id overwritten by TTS.
// (A re-recorded row keeps its original — often TTS — voice_id, so the
// conflict key CAN collide with human audio.) Throws on query failure so a
// transient DB error fails the clip instead of silently clobbering (fail-closed).
// Returns the human row if one occupies the key, else null.
// =============================================================================
// Callers pass normalizeForAudio(text). That is NOT how the row is stored: the
// DB trigger rewrites text_normalized with normalize_text(), which also strips
// a trailing '?'. So an .eq() on the JS form could not see any question-ending
// human recording written since March 2026 — 5,090 of them as of 2026-08-06 —
// and the guard returned null, letting the upsert below flip a human take to
// TTS. The guard now matches EITHER stored convention (see
// services/shared/text-normalize.cjs). Widening what the guard can see is
// strictly more protective: a false positive only skips a TTS render.
//
// 2026-08-06, same reasoning applied to the other two key columns: the guard
// used to .eq() ONE spelling of the language and ONE of the voice, so a human
// take registered under 'en-GB'/'en-GB-SoniaNeural' was invisible to a render
// dispatched as 'eng'/'azure_en-GB-SoniaNeural'. Both predicates now leave SQL
// and are compared canonically in JS, permissively — see identityFieldMatches.
async function humanRowAtAudioKey(courseCode, textNormalized, language, role, voiceId) {
  const keys = audioKeyCandidates(textNormalized)
  // Transient undici "TypeError: fetch failed" blips during 8-hour batch runs
  // were failing ~0.04% of clips AFTER the TTS money was already spent
  // (2026-07-28 batch audit). Retry the read a few times before failing the
  // clip; a persistent error still throws (fail-closed, never clobber).
  let lastError
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data, error } = await supabase
        .from('course_audio')
        .select('*')
        .eq('course_code', courseCode)
        .in('text_normalized', keys)
        .eq('role', role)
        .eq('origin', 'human')
      if (error) throw new Error(error.message)
      // Both conventions can hold a row for the same text, so this is a list,
      // not maybeSingle(). Any human row here means "precious audio occupies
      // this key" — pick deterministically for a stable log line and rebind.
      const matches = (data || []).filter(row =>
        sameLanguage(language, row.language, true) && sameVoice(voiceId, row.voice_id, true))
      if (!matches.length) return null
      return matches.reduce((best, row) => pickPreferredAudioRow(best, row), null)
    } catch (e) {
      lastError = e
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 500))
    }
  }
  throw new Error(`precious-audio guard query failed: ${lastError.message}`)
}

/**
 * Cross-course reuse: a rendered clip of this exact text, language, role and
 * voice in ANY other course, whose S3 object we can point a new row at instead
 * of paying to render it again. This is the query the content-addressed design
 * is built on — every miss is a duplicate paid render.
 *
 * It used to .eq() one spelling of language and one of voice, so it could not
 * see a sibling stored under the other spelling; and .limit(1).single() turned
 * "drift produced two rows" into an error the caller discarded as "no sibling",
 * falling straight through to TTS. Both predicates are now canonical JS matches
 * over a small candidate set, and more than one candidate is normal, not fatal.
 *
 * Strict matching (no permissive branch): a false positive here would link the
 * WRONG audio to a learner-facing slot.
 */
async function findSiblingCourseClip(courseCode, text, language, role, voiceId) {
  const { data, error } = await supabase
    .from('course_audio')
    .select('s3_key, duration_ms, word_boundaries, language, voice_id')
    .neq('course_code', courseCode)
    .in('text_normalized', audioKeyCandidates(normalizeForAudio(text)))
    .eq('role', role)
    .not('s3_key', 'like', 'pending/%')
    .limit(200)
  if (error) throw new Error(`sibling-clip lookup failed: ${error.message}`)
  return (data || []).find(row =>
    row.s3_key &&
    sameLanguage(language, row.language) &&
    sameVoice(voiceId, row.voice_id)) || null
}

/**
 * Check whether presentation text has been generated for all new LEGOs and
 * component phrases in the release window. Used to gate `/generate` — the
 * separate "Generate Missing Presentation Text" step (POST /regenerate-presentations)
 * must run first so that each LEGO/component has a row in course_audio with
 * its presentation text (pending or generated). `/generate` then only TTSes,
 * never invents text on the fly.
 *
 * @param {string} courseCode
 * @param {number} releaseTarget - Max seed number
 * @returns {Promise<{ready: boolean, missingLegoPresentations: number, missingComponentPresentations: number, totalMissing: number}>}
 */
async function checkPresentationReadiness(courseCode, releaseTarget, seeds = null) {
  const scopeSeeds = (Array.isArray(seeds) && seeds.length) ? seeds : null
  // 1) New LEGOs (is_new=true) within release_target
  let newLegosQ = supabase
    .from('course_legos')
    .select('lego_id, presentation_audio_id')
    .eq('course_code', courseCode)
    .eq('is_new', true)
    .lte('seed_number', releaseTarget)
  if (scopeSeeds) newLegosQ = newLegosQ.in('seed_number', scopeSeeds)
  const { data: newLegos } = await newLegosQ

  // 2) All presentation rows in course_audio for this course
  //    (pending OR generated — both count as "ready", since /generate will TTS pending ones)
  const { data: presRows } = await supabase
    .from('course_audio')
    .select('lego_id, text_normalized')
    .eq('course_code', courseCode)
    .eq('role', 'presentation')

  const legoIdsWithPres = new Set((presRows || []).map(p => p.lego_id).filter(Boolean))

  // A LEGO is ready iff it has presentation_audio_id bound OR a presentation
  // course_audio row by lego_id (which /generate will pick up and process).
  let missingLegoPresentations = 0
  for (const lego of (newLegos || [])) {
    if (lego.presentation_audio_id) continue
    if (legoIdsWithPres.has(lego.lego_id)) continue
    missingLegoPresentations++
  }

  // 3) Component phrases — they get their own presentation rows by text match.
  //    Each component should have at least one presentation row (any text).
  //    Approximation: count component phrases lacking a `presentation_audio_id`
  //    binding AND whose own text doesn't appear in the existing presentation set.
  //    For now we use the simpler check: component phrases with NULL presentation_audio_id.
  //    /regenerate-presentations creates these rows, so this is a meaningful gate.
  // METHODOLOGY-AWARE: only introduce:true components need a presentation.
  // introduce:false components (e.g. grammatical particles like 才) are never
  // introduced alone, so they must NOT be counted as "missing a presentation".
  let compMissingQ = supabase
    .from('course_practice_phrases')
    .select('id', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .eq('phrase_role', 'component')
    .eq('introduce', true)
    .lte('seed_number', releaseTarget)
    .is('presentation_audio_id', null)
  if (scopeSeeds) compMissingQ = compMissingQ.in('seed_number', scopeSeeds)
  const { count: componentMissingCount } = await compMissingQ

  // But the component's text may have a matching course_audio row even when
  // presentation_audio_id is null on the phrase. So we don't strictly require
  // the per-phrase binding — only that course_audio has *some* row that could match.
  // For the gate, "no component pending rows at all" is the failure mode worth catching.
  const { count: pendingCompPresCount } = await supabase
    .from('course_audio')
    .select('id', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .eq('role', 'presentation')
    .is('lego_id', null)  // component presentations have null lego_id

  // If there are component phrases needing audio but ZERO component presentation
  // rows in course_audio, /regenerate-presentations hasn't been run yet.
  const missingComponentPresentations = (componentMissingCount > 0 && pendingCompPresCount === 0)
    ? componentMissingCount
    : 0

  const totalMissing = missingLegoPresentations + missingComponentPresentations
  return {
    ready: totalMissing === 0,
    missingLegoPresentations,
    missingComponentPresentations,
    totalMissing
  }
}

/**
 * Unified audio needs detection. Single source of truth for /plan, /generate, /needs.
 *
 * 1. Finds all slots (phrases/LEGOs/seeds) with NULL audio_id
 * 2. Checks if matching audio exists in course_audio (can be linked without TTS)
 * 3. Adds pending presentation rows (role='presentation' AND s3_key LIKE 'pending/%') to toGenerate
 * 4. Returns: toLink (audio exists, just bind), toGenerate (needs TTS), readyForGenerate (presentations done?)
 *
 * Pure read — no side effects, no DB writes.
 *
 * @param {string} courseCode
 * @param {number} releaseTarget - Max seed number
 * @param {object} course - Course record with known_lang, target_lang
 * @returns {Promise<{toLink: number, toGenerate: Array, toCopy: Array, stats: object, readyForGenerate: boolean, presentationStatus: object}>}
 */
/**
 * "Clone once, copy everywhere" — language-scoped, not direction-scoped
 * (Tom's ruling). An English clip is an English clip whether it's known-side
 * audio in a X_for_eng course or target-side audio in eng_for_X: same voice,
 * same text, same content. So this splits toGenerate into toCopy for BOTH:
 *   - known-role items,            when course.known_lang === 'eng'
 *   - target1/target2-role items,  when course.target_lang === 'eng'
 * (never both — a course's known_lang and target_lang are never both 'eng').
 * Role is NOT part of the match key (see clone-copy-match.cjs) — a match
 * found in another course's target1 row can satisfy this course's known
 * slot, and vice versa.
 *
 * Read-only (queries course_audio/voices/courses) — getAudioNeeds must stay
 * side-effect-free, so this only classifies; the actual row-insert happens
 * in /generate, never in a plan/needs read.
 *
 * Not hardcoded to the xAI clone specifically — it checks whichever voice_id
 * this course has configured for its English-bearing role(s), so it's a
 * no-op for courses still on a non-clone voice, and activates automatically
 * once a course's voice_config points that role at the clone (gfzdpspr5fdp,
 * Tom's estate-wide English voice). Refuses to source from a voice whose
 * engine isn't verified speed-invariant at render (buildSourceIndex's
 * isTrusted1xEngine check) — legacy Azure clips may have a non-1x rate
 * baked in and can't be verified after the fact, so they're never silently
 * used as canonical sources.
 */
async function classifyEnglishCopyBucket(courseCode, course, uniqueToGenerate) {
  const englishRoles = course.known_lang === 'eng' ? ['known']
    : course.target_lang === 'eng' ? ['target1', 'target2']
    : []
  if (!englishRoles.length) return { toGenerate: uniqueToGenerate, toCopy: [] }

  const englishItems = uniqueToGenerate.filter(i => englishRoles.includes(i.role))
  if (!englishItems.length) return { toGenerate: uniqueToGenerate, toCopy: [] }

  const toCopy = []
  const copyKeys = new Set()
  for (const role of englishRoles) {
    const roleItems = englishItems.filter(i => i.role === role)
    const voiceId = course.voice_config?.voices?.[role]?.voiceId
    // Raw for the source index + decideCopy (those read live rows and the
    // `voices` registry, both of which still hold the config's own spelling);
    // canonical only for the row executeCopyBucket writes.
    const voiceProvider = course.voice_config?.voices?.[role]?.provider
    if (!roleItems.length || !voiceId) continue

    const texts = roleItems.map(i => normalizeText(i.text))
    const { index: sourceIndex, trusted, engine } = await buildSourceIndex(supabase, { voiceId, language: 'eng', texts })
    if (!trusted) {
      logger.info(`classifyEnglishCopyBucket(${courseCode}): voice=${voiceId} (role=${role}) engine=${engine || 'unknown'} not verified speed-invariant at render — skipping copy bucket for this role`)
      continue
    }
    if (!sourceIndex.size) continue

    for (const item of roleItems) {
      const decision = decideCopy({ text: item.text, language: item.language, voiceId, courseCode, role }, sourceIndex)
      if (decision.action === 'COPY') {
        toCopy.push({ ...item, voiceId, voiceProvider, copySource: decision.source })
        copyKeys.add(`${normalizeText(item.text)}|${item.language}|${item.role}`)
      }
    }
  }
  if (!toCopy.length) return { toGenerate: uniqueToGenerate, toCopy: [] }

  const toGenerate = uniqueToGenerate.filter(i => !copyKeys.has(`${normalizeText(i.text)}|${i.language}|${i.role}`))
  logger.info(`classifyEnglishCopyBucket(${courseCode}): ${toCopy.length} English item(s) copyable from another course/role's audio`)
  return { toGenerate, toCopy }
}

/**
 * Execute the copy bucket produced by classifyEnglishCopyBucket: for each
 * item, insert an owned course_audio row for this course pointing at the
 * SAME s3_key as the source (SHARED physical storage — logical ownership is
 * per-course, physical storage is not). This NEVER copies/writes S3 bytes —
 * the immutability rule (canonical mastered/<uuid>.mp3 objects are
 * write-once; a re-master mints a new key and repoints rows explicitly) is
 * what makes sharing a key across courses safe. The upsert is insert-or-noop
 * (ignoreDuplicates) so a race can never repoint an existing owned row.
 * Only called from the /generate write path, never from /plan or /needs
 * (which must stay pure reads) — this is where "copy first, TTS only the
 * remainder" actually happens. Row deletion (not implemented here) never
 * needs to touch the S3 object — course-level operations only ever delete
 * rows, never canonical objects (no refcounting, by design).
 */
async function executeCopyBucket(courseCode, knownLang, toCopy) {
  let copied = 0
  let failed = 0
  for (const item of toCopy) {
    try {
      const { error } = await supabase
        .from('course_audio')
        .upsert({
          course_code: courseCode,
          text: item.text,
          text_normalized: normalizeForAudio(item.text),
          // Identity columns, canonical. A throw here fails this one copy (the
          // catch below logs it) rather than writing a spelling nothing can find.
          language: canonicalLanguage(item.language || knownLang),
          role: item.role,
          voice_id: canonicalClipVoiceId(item.voiceId, item.voiceProvider),
          origin: 'tts',
          s3_key: item.copySource.s3Key, // SHARED physical object — never a new copy
          duration_ms: item.copySource.durationMs,
          file_size_bytes: item.copySource.fileSizeBytes,
          word_boundaries: item.copySource.wordBoundaries,
          // text_stripped is a GENERATED column — writing it fails every copy
          // ("cannot insert a non-DEFAULT value"); the DB derives it from text.
          lego_id: null,
        }, { onConflict: 'course_code,text_normalized,language,role,voice_id', ignoreDuplicates: true })
      if (error) throw new Error(error.message)
      copied++
    } catch (e) {
      failed++
      logger.error(`executeCopyBucket: failed to copy "${(item.text || '').substring(0, 40)}" for ${courseCode} from ${item.copySource?.courseCode}: ${e.message}`)
    }
  }
  return { copied, failed }
}

async function getAudioNeeds(courseCode, releaseTarget, course, forceGenerate = false, seeds = null) {
  const PAGE_SIZE = 1000
  // Optional incremental scope: when `seeds` is a non-empty array, every query is
  // restricted to those seed numbers. Default (null) = full-course behaviour, unchanged.
  const scopeSeeds = (Array.isArray(seeds) && seeds.length) ? seeds : null
  const seedOf = (legoId) => { const m = /S(\d+)L/.exec(legoId || ''); return m ? parseInt(m[1], 10) : null }

  // Step 1: Find all unlinked slots (NULL audio_id)
  const slotDefs = [
    { table: 'course_practice_phrases', textCol: 'known_text', audioCol: 'known_audio_id', lang: course.known_lang, role: 'known' },
    { table: 'course_practice_phrases', textCol: 'target_text', audioCol: 'target1_audio_id', lang: course.target_lang, role: 'target1' },
    { table: 'course_practice_phrases', textCol: 'target_text', audioCol: 'target2_audio_id', lang: course.target_lang, role: 'target2' },
    { table: 'course_legos', textCol: 'known_text', audioCol: 'known_audio_id', lang: course.known_lang, role: 'known' },
    { table: 'course_legos', textCol: 'target_text', audioCol: 'target1_audio_id', lang: course.target_lang, role: 'target1' },
    { table: 'course_legos', textCol: 'target_text', audioCol: 'target2_audio_id', lang: course.target_lang, role: 'target2' },
    { table: 'course_seeds', textCol: 'known_text', audioCol: 'known_audio_id', lang: course.known_lang, role: 'known', statusFilter: 'released' },
    { table: 'course_seeds', textCol: 'target_text', audioCol: 'target1_audio_id', lang: course.target_lang, role: 'target1', statusFilter: 'released' },
    { table: 'course_seeds', textCol: 'target_text', audioCol: 'target2_audio_id', lang: course.target_lang, role: 'target2', statusFilter: 'released' },
  ]

  const unlinked = [] // { text, lang, role, table }
  let ungeneratable = 0

  for (const slot of slotDefs) {
    let offset = 0
    let hasMore = true
    while (hasMore) {
      let query = supabase
        .from(slot.table)
        .select(slot.textCol)
        .eq('course_code', courseCode)
        .is(slot.audioCol, null)
        .lte('seed_number', releaseTarget)
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)

      if (slot.statusFilter) {
        query = query.eq('status', slot.statusFilter)
      }
      if (scopeSeeds) {
        query = query.in('seed_number', scopeSeeds)
      }

      const { data, error } = await query
      if (error) throw error

      for (const row of (data || [])) {
        const text = row[slot.textCol]
        if (isPunctuationOnly(text)) {
          ungeneratable++
          continue
        }
        unlinked.push({ text, lang: slot.lang, role: slot.role, table: slot.table })
      }

      hasMore = (data || []).length === PAGE_SIZE
      offset += PAGE_SIZE
    }
  }

  // Also check presentation audio (uses lego_id, not text matching)
  let newLegosQuery = supabase
    .from('course_legos')
    .select('lego_id, known_text, target_text, seed_number, presentation_audio_id')
    .eq('course_code', courseCode)
    .eq('is_new', true)
    .lte('seed_number', releaseTarget)
  if (scopeSeeds) newLegosQuery = newLegosQuery.in('seed_number', scopeSeeds)
  const { data: newLegos } = await newLegosQuery

  const { data: rawPresentations } = await supabase
    .from('course_audio')
    .select('lego_id, s3_key')
    .eq('course_code', courseCode)
    .eq('role', 'presentation')
  const legoIdsWithPresentation = new Set(
    (rawPresentations || []).filter(p => !p.s3_key || !p.s3_key.startsWith('pending/')).map(p => p.lego_id).filter(Boolean)
  )
  // Intros needing NEW text (no FK, no real audio row, no pending text row):
  // authored (frame judgment) inside /generate — no separate stage. Legos that
  // still carry a pending/% text row are covered by Step 3 below until the
  // pending-row purge; don't double-author them.
  const legoIdsWithPendingPres = new Set(
    (rawPresentations || []).filter(p => p.s3_key && p.s3_key.startsWith('pending/')).map(p => p.lego_id).filter(Boolean)
  )
  let missingPresentation = 0
  const toAuthor = []
  for (const lego of (newLegos || [])) {
    if (!lego.presentation_audio_id && !legoIdsWithPresentation.has(lego.lego_id)) {
      missingPresentation++
      if (!legoIdsWithPendingPres.has(lego.lego_id) && !isPunctuationOnly(lego.known_text)) {
        toAuthor.push({
          lego_id: lego.lego_id,
          chunk: lego.known_text,
          form: lego.target_text,
          seed_number: lego.seed_number
        })
      }
    }
  }
  // Frame-B context = the parent seed sentence
  const authorSeedNums = [...new Set(toAuthor.map(t => t.seed_number).filter(n => n != null))]
  if (authorSeedNums.length) {
    const seedTexts = new Map()
    for (let i = 0; i < authorSeedNums.length; i += 200) {
      const { data: seedRows } = await supabase
        .from('course_seeds')
        .select('seed_number, known_text')
        .eq('course_code', courseCode)
        .in('seed_number', authorSeedNums.slice(i, i + 200))
      for (const r of (seedRows || [])) seedTexts.set(r.seed_number, r.known_text)
    }
    for (const t of toAuthor) t.seed = seedTexts.get(t.seed_number) || null
  }

  // Component intros (introduce:true only — particles are never introduced
  // alone). Authored only when no pending component text rows exist; while
  // they do (pre-purge transition), Step 3 already carries those texts.
  let componentIntroSlots = 0
  const pendingComponentRows = (rawPresentations || [])
    .filter(p => p.s3_key && p.s3_key.startsWith('pending/') && !p.lego_id).length
  if (pendingComponentRows === 0) {
    let compQ = supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text, lego_id, seed_number')
      .eq('course_code', courseCode)
      .eq('phrase_role', 'component')
      .eq('introduce', true)
      .is('presentation_audio_id', null)
      .lte('seed_number', releaseTarget)
    if (scopeSeeds) compQ = compQ.in('seed_number', scopeSeeds)
    const { data: compRows } = await compQ
    componentIntroSlots = (compRows || []).length
    const parentIds = [...new Set((compRows || []).map(c => c.lego_id).filter(Boolean))]
    const parentKnown = new Map()
    for (let i = 0; i < parentIds.length; i += 200) {
      const { data: parents } = await supabase
        .from('course_legos')
        .select('lego_id, known_text')
        .eq('course_code', courseCode)
        .in('lego_id', parentIds.slice(i, i + 200))
      for (const p of (parents || [])) parentKnown.set(p.lego_id, p.known_text)
    }
    for (const c of (compRows || [])) {
      if (isPunctuationOnly(c.known_text)) continue
      toAuthor.push({
        phrase_id: c.id,
        lego_id: null,
        chunk: c.known_text,
        form: c.target_text,
        seed: parentKnown.get(c.lego_id) || null,
        seed_number: c.seed_number
      })
    }
  }

  // Step 2: Check which unlinked items have existing audio (can be linked without TTS)
  // If forceGenerate is true, skip this check — treat everything as needing TTS.
  // Used when link step ran but linked 0 (normalization mismatch prevents linking).
  const existingSet = forceGenerate
    ? { has: () => false, s3KeyFor: () => null, get size() { return 0 } }
    : await getExistingAudioSet(courseCode)

  // A slot whose text already has a row is UNLINKED, not missing — but only if
  // the object that row names is really in storage. Storage is asked here, on
  // the linkable set only (bounded, usually tens), so "missing" on the
  // dashboard means "no audio exists", never "the row was never bound".
  const linkable = []      // { text, lang, role, key, s3Key }
  const toGenerate = []
  for (const item of unlinked) {
    const key = `${normalizeText(item.text)}|${item.lang}|${item.role}`
    if (existingSet.has(key)) {
      linkable.push({ ...item, key, s3Key: existingSet.s3KeyFor(key) })
    } else {
      toGenerate.push({ text: item.text, language: item.lang, role: item.role })
    }
  }

  // HEAD once per distinct object, not once per slot.
  const storageVerdicts = new Map()
  const distinctKeys = [...new Set(linkable.map(l => l.s3Key).filter(Boolean))]
  await processInParallel(distinctKeys, async (s3Key) => {
    storageVerdicts.set(s3Key, await s3ObjectExists(s3Key))
  }, 20)

  let toLinkCount = 0
  let storageBroken = 0
  const brokenBreakdown = { known: 0, target1: 0, target2: 0 }
  const linkableBreakdown = { known: 0, target1: 0, target2: 0 }
  for (const item of linkable) {
    if (item.s3Key && storageVerdicts.get(item.s3Key) === false) {
      // The row claims audio the bucket doesn't have. Truly missing, and worse
      // than an unbound slot — say so instead of promising a free link.
      storageBroken++
      if (brokenBreakdown[item.role] !== undefined) brokenBreakdown[item.role]++
      toGenerate.push({ text: item.text, language: item.lang, role: item.role })
      continue
    }
    toLinkCount++
    if (linkableBreakdown[item.role] !== undefined) linkableBreakdown[item.role]++
  }
  if (storageBroken) {
    logger.warn(`getAudioNeeds(${courseCode}): ${storageBroken} linkable slot(s) point at a course_audio row whose S3 object is gone — counted as missing, not linkable`)
  }

  if (forceGenerate) {
    logger.info(`getAudioNeeds: forceGenerate=true, all ${unlinked.length} unlinked items classified as to-generate`)
  }

  // Step 3: Pending presentation rows — concrete texts in course_audio waiting for TTS.
  // These were created by /regenerate-presentations (the "Generate Missing Presentation Text"
  // button) and have s3_key LIKE 'pending/%'. /generate will TTS them.
  const { data: pendingPresRowsRaw } = await supabase
    .from('course_audio')
    .select('id, text, language, voice_id, lego_id')
    .eq('course_code', courseCode)
    .eq('role', 'presentation')
    .like('s3_key', 'pending/%')
  // Scope pending presentations to the requested seeds.
  // LEGO presentations: parse seed from lego_id. Component presentations have
  // lego_id=null, so scope them by matching their "as in — '<parent>'" context to
  // a LEGO known_text in the scoped seeds — otherwise orphaned/other-seed component
  // presentations (lego_id=null) leak into EVERY scoped run and hog it.
  let scopedKnownSet = null
  if (scopeSeeds) {
    const { data: scopedLegos } = await supabase
      .from('course_legos').select('known_text')
      .eq('course_code', courseCode).in('seed_number', scopeSeeds)
    scopedKnownSet = new Set((scopedLegos || []).map(l => l.known_text))
  }
  const pendingPresRows = scopeSeeds
    ? (pendingPresRowsRaw || []).filter(r => {
        if (r.lego_id != null) return scopeSeeds.includes(seedOf(r.lego_id))
        const m = /as in — '([^']+)'/.exec(r.text || '')
        return m ? scopedKnownSet.has(m[1]) : false  // component pres: only if parent is in scope
      })
    : pendingPresRowsRaw

  // STALENESS GUARD (2026-07-20): pending rows carry text frozen at authoring
  // time. If known_text was edited after the row was created (gloss cleanup,
  // register sweep), TTSing the stored text silently resurrects the old gloss
  // — seen on deu_at as ~25 intros re-tagged "what (interrogative pronoun)"-
  // style after /generate filled "missing" audio. A pending row is fresh only
  // if its quoted {known} slot still matches the CURRENT known_text. Stale
  // rows are dropped from TTS here, returned in stalePendingIds for /generate
  // to purge, and their LEGO is re-authored from live data in the same run.
  const stalePendingIds = []
  let freshPendingRows = pendingPresRows || []
  if (freshPendingRows.length) {
    try {
      const template = await getOrCreatePresentationTemplate(course.known_lang)
      const kIdx = template.indexOf('{known}')
      if (kIdx !== -1) {
        // The chars flanking {known} in the template are its quote marks
        // ('…', 「…」, "…" — language-dependent). Probing for quote+chunk+quote
        // distinguishes "what" from "what (interrogative pronoun)".
        const preQ = kIdx > 0 ? template[kIdx - 1] : ''
        const postQ = template[kIdx + '{known}'.length] || ''
        const quotedProbe = (chunk) => `${preQ}${chunk}${postQ}`

        // Current lego data for pending LEGO rows (always course-scoped —
        // lego_id is NOT unique across courses)
        const pendingLegoIds = [...new Set(freshPendingRows.map(r => r.lego_id).filter(Boolean))]
        const legoById = new Map()
        for (let i = 0; i < pendingLegoIds.length; i += 100) {
          const { data: rows } = await supabase
            .from('course_legos')
            .select('lego_id, known_text, target_text, seed_number')
            .eq('course_code', courseCode)
            .in('lego_id', pendingLegoIds.slice(i, i + 100))
          for (const l of (rows || [])) legoById.set(l.lego_id, l)
        }

        // Component rows have no FK — a row is fresh if ANY current
        // introduce:true component known_text appears quoted in its text.
        let compProbes = []
        if (freshPendingRows.some(r => !r.lego_id)) {
          let compQ2 = supabase
            .from('course_practice_phrases')
            .select('known_text')
            .eq('course_code', courseCode)
            .eq('phrase_role', 'component')
            .eq('introduce', true)
            .lte('seed_number', releaseTarget)
          if (scopeSeeds) compQ2 = compQ2.in('seed_number', scopeSeeds)
          const { data: compTexts } = await compQ2
          compProbes = [...new Set((compTexts || []).map(c => c.known_text).filter(Boolean))].map(quotedProbe)
        }

        const isFreshPending = (r) => {
          const text = r.text || ''
          if (r.lego_id) {
            const lego = legoById.get(r.lego_id)
            if (!lego || !lego.known_text) return false  // orphaned pending row — lego gone
            const variants = [lego.known_text]
            if (lego.known_text.includes(' / ')) {
              // Slash-compounds render only their first option into {known}
              variants.push(lego.known_text.split(' / ')[0].trim())
            }
            return variants.some(v => v && text.includes(quotedProbe(v)))
          }
          return compProbes.some(p => text.includes(p))
        }

        const fresh = []
        const freshLegoIds = new Set()
        const staleLegoIds = new Set()
        for (const r of freshPendingRows) {
          if (isFreshPending(r)) {
            fresh.push(r)
            if (r.lego_id) freshLegoIds.add(r.lego_id)
          } else {
            stalePendingIds.push(r.id)
            if (r.lego_id) staleLegoIds.add(r.lego_id)
          }
        }

        // Re-author stale LEGOs from live data — unless a fresh pending row or
        // a real audio row already covers them. Stale COMPONENT rows just get
        // purged; the existing component-author gate (pendingComponentRows===0)
        // picks their phrases up once the purge lands.
        const toReauthor = [...staleLegoIds].filter(id =>
          !freshLegoIds.has(id) && !legoIdsWithPresentation.has(id) && legoById.has(id)
        )
        if (toReauthor.length) {
          const items = toReauthor
            .map(id => legoById.get(id))
            .filter(l => !isPunctuationOnly(l.known_text))
            .map(l => ({ lego_id: l.lego_id, chunk: l.known_text, form: l.target_text, seed_number: l.seed_number }))
          const seedNums = [...new Set(items.map(t => t.seed_number).filter(n => n != null))]
          const staleSeedTexts = new Map()
          for (let i = 0; i < seedNums.length; i += 200) {
            const { data: seedRows } = await supabase
              .from('course_seeds')
              .select('seed_number, known_text')
              .eq('course_code', courseCode)
              .in('seed_number', seedNums.slice(i, i + 200))
            for (const s of (seedRows || [])) staleSeedTexts.set(s.seed_number, s.known_text)
          }
          for (const t of items) t.seed = staleSeedTexts.get(t.seed_number) || null
          toAuthor.push(...items)
        }
        if (stalePendingIds.length) {
          logger.warn(`getAudioNeeds(${courseCode}): ${stalePendingIds.length} stale pending presentation row(s) — text no longer matches current known_text; dropped from TTS, ${toReauthor.length} LEGO(s) queued for re-authoring`)
        }

        freshPendingRows = fresh
      }
    } catch (staleErr) {
      // Fail open: the staleness check must never block audio status/generation.
      logger.warn(`Pending-presentation staleness check failed (${staleErr.message}) — proceeding with stored texts`)
    }
  }

  for (const pres of freshPendingRows) {
    if (isPunctuationOnly(pres.text)) {
      ungeneratable++
      continue
    }
    toGenerate.push({
      text: pres.text,
      // A pending row carries whatever spelling wrote it; carrying that forward
      // verbatim is how one bad spelling survives every regeneration. Resolve
      // it, and when it cannot be resolved fall back to the COURSE's own known
      // language (presentation intros are known-language audio) — never to the
      // unresolvable value itself.
      language: tryCanonicalLanguage(pres.language) || canonicalLanguage(course.known_lang),
      role: 'presentation',
      lego_id: pres.lego_id || null,
      // null = "resolve from voice_config", which is what /generate does with
      // this field anyway (see the note at the needed[] map).
      voice_id: tryCanonicalClipVoiceId(pres.voice_id) || null
    })
  }

  // Step 4: Deduplicate toGenerate (same text used by multiple phrases)
  const dedupedToGenerate = [...new Map(
    toGenerate.map(n => [`${normalizeText(n.text)}|${n.language}|${n.role}`, n])
  ).values()]

  // Step 4.5: "Clone once, copy everywhere" — pull English items (known-role
  // for X_for_eng, target-role for eng_for_X) that already exist as rendered
  // audio elsewhere out of toGenerate and into a distinct toCopy bucket, so
  // /generate copies them (no TTS) instead of re-rendering. See
  // classifyEnglishCopyBucket() above.
  const { toGenerate: uniqueToGenerate, toCopy } = forceGenerate
    ? { toGenerate: dedupedToGenerate, toCopy: [] }
    : await classifyEnglishCopyBucket(courseCode, course, dedupedToGenerate)

  // Step 5: presentation readiness is informational only now — /generate
  // authors missing intro text itself (frame judgment), so nothing gates on
  // a separate text stage any more.
  const presentationStatus = await checkPresentationReadiness(courseCode, releaseTarget, scopeSeeds)

  // Slot ledger — row counts in learner-noticeable units (slots), alongside
  // the deduped work-item counts the Generate button acts on. One unit per
  // number; the old Total/Generated/Pending mixed all three.
  let contentSlotRows = 0
  for (const slot of slotDefs) {
    let cq = supabase
      .from(slot.table)
      .select('id', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .lte('seed_number', releaseTarget)
    if (slot.statusFilter) cq = cq.eq('status', slot.statusFilter)
    if (scopeSeeds) cq = cq.in('seed_number', scopeSeeds)
    const { count } = await cq
    contentSlotRows += (count || 0)
  }
  const introSlots = (newLegos || []).length + componentIntroSlots
  const inScopeSlots = contentSlotRows + introSlots
  const ledger = {
    inScope: inScopeSlots,
    linked: Math.max(0, inScopeSlots - unlinked.length - ungeneratable - missingPresentation - componentIntroSlots),
    linkable: toLinkCount,
    ttsJobs: uniqueToGenerate.length + toAuthor.length,
    toAuthor: toAuthor.length,
    copyJobs: toCopy.length,
    ungeneratable
  }

  const totalMissing = unlinked.length + missingPresentation
  const stats = {
    totalSlots: unlinked.length + ungeneratable + existingSet.size + missingPresentation,
    existing: existingSet.size,
    missing: totalMissing,
    toLink: toLinkCount,
    toGenerate: uniqueToGenerate.length,
    toCopy: toCopy.length,
    toAuthor: toAuthor.length,
    missingPresentation,
    stalePending: stalePendingIds.length,
    ungeneratable,
    ledger,
    // breakdown = every unbound slot, unchanged (existing consumers).
    // unlinkedBreakdown = the subset whose audio exists AND is in storage.
    // missingBreakdown = breakdown minus that — audio that genuinely isn't
    // anywhere, which is the only number that should be called "missing".
    breakdown: {
      known: unlinked.filter(u => u.role === 'known').length,
      target1: unlinked.filter(u => u.role === 'target1').length,
      target2: unlinked.filter(u => u.role === 'target2').length,
      presentation: missingPresentation,
    },
    unlinkedBreakdown: { ...linkableBreakdown, presentation: 0 },
    missingBreakdown: {
      known: unlinked.filter(u => u.role === 'known').length - linkableBreakdown.known,
      target1: unlinked.filter(u => u.role === 'target1').length - linkableBreakdown.target1,
      target2: unlinked.filter(u => u.role === 'target2').length - linkableBreakdown.target2,
      presentation: missingPresentation,
    },
    // Slots whose row named an object the bucket does not have. Counted as
    // missing above; broken out because it is a different failure.
    storageBroken,
    storageBrokenBreakdown: brokenBreakdown,
  }

  logger.info(`getAudioNeeds(${courseCode}): ${totalMissing} missing (${toLinkCount} to link, ${uniqueToGenerate.length} to generate, ${toAuthor.length} to author, ${toCopy.length} to copy, ${storageBroken} storage-broken, ${ungeneratable} ungeneratable)`)

  return {
    toLink: toLinkCount,
    toCopy,
    toGenerate: uniqueToGenerate,
    toAuthor,
    stalePendingIds,
    stats,
    // The text stage is folded into /generate — never gate on it again.
    readyForGenerate: true,
    presentationStatus
  }
}

/**
 * Process items in parallel with concurrency limit
 * @param {Array} items - Items to process
 * @param {Function} processor - Async function to process each item
 * @param {number} concurrency - Max concurrent operations
 * @returns {Promise<{success: number, failed: number, errors: Array}>}
 */
async function processInParallel(items, processor, concurrency = CONCURRENCY) {
  const results = { success: 0, failed: 0, errors: [] }

  // True worker pool (not batch-barrier): N workers pull from a shared cursor,
  // so a slow item never blocks the other lanes. The old slice-of-N +
  // Promise.allSettled shape paid a "slowest of each batch" tax every round —
  // with TTS renders ranging 1.5–8s that roughly halved effective throughput.
  let cursor = 0
  const worker = async () => {
    while (true) {
      const i = cursor++
      if (i >= items.length) return
      try {
        await processor(items[i])
        results.success++
      } catch (err) {
        results.failed++
        results.errors.push({
          item: items[i],
          error: err?.message || 'Unknown error'
        })
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))

  return results
}

// =============================================================================
// AUDIO MASTERING
// =============================================================================

/**
 * Master audio: normalize loudness and extract duration
 *
 * @param {Buffer} audioBuffer - Raw audio from TTS
 * @param {string} [ttsText] - The text that was synthesised. Needed by the
 *   tail-defect gate to pick the detector mode: texts with scripted internal
 *   silences ([pause], ellipses — pod takes) legitimately go quiet-then-loud
 *   in the tail, so only the burst rule is safe on them.
 * @param {object} [opts]
 * @param {number} [opts.targetLufs=-16.0] - The loudness this clip is mastered
 *   to. ADDITIVE and defaulted to the house number, so every existing caller
 *   masters exactly as it did before. It exists for VOICELAB's Play mode: a
 *   "quieter ↔ louder" slider that only moved the GATE'S band would change the
 *   verdict and not one byte of what you hear, which is the dead-control
 *   failure the lab is built to avoid. The mastering target and the gate band
 *   stay separate numbers on purpose — one is what the clip sounds like, the
 *   other is what would be allowed into the store.
 * @returns {Promise<{buffer: Buffer, durationMs: number}>} Mastered audio and duration
 */
async function masterAudio(audioBuffer, ttsText, opts = {}) {
  const targetLufs = Number.isFinite(Number(opts.targetLufs)) ? Number(opts.targetLufs) : -16.0
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audio-master-'))
  const rawPath = path.join(tempDir, 'raw.mp3')
  const masteredPath = path.join(tempDir, 'mastered.mp3')

  try {
    // Write raw audio to temp file
    await fs.writeFile(rawPath, audioBuffer)

    // Normalize to the house -16 LUFS (broadcast standard) unless a caller asked
    // for another target — see opts.targetLufs above.
    //
    // COMPRESSOR-FREE since 2026-08-17 (Tom's ruling, A-131/A-132). The old
    // normalizeAudio() chain opened with PRE_COMPRESS (8:1 below -24dB) plus a
    // make-up gain, which lifts anything sitting in a clip's tail by roughly
    // 12dB. A blind listening test that day proved the nld pod-0 xAI voice
    // (xai_247783ebdd51) renders a click in the RAW provider bytes, with none of
    // our processing on it — so the compressor was not the source of the click,
    // it was the amplifier that made it audible. Same defect Tom heard from the
    // other side as "that hissy mastering stuff" (2026-07-29), which is why
    // normalizeAudioClean already existed. Pure subtraction: one stage removed,
    // nothing added. Measured cost: output lands 0.8-1.7 LUFS quieter.
    await audioProcessor.normalizeAudioClean(rawPath, masteredPath, targetLufs)

    // Tail-defect FLAG — read-only, never a repair (Tom's ruling 2026-08-05).
    //
    // This used to call audioProcessor.repairTailDefect, which trimmed the clip
    // at the detector's timestamp and re-padded it. At this exact line, that is
    // how deu_for_eng shipped "Ich will jetzt mit dir Deutsch sprechen" without
    // "sprechen" — the detector cannot tell a tail click from a natural
    // mid-sentence pause, and the trim ate every word after the pause. The
    // mutation path is deleted from audio-processor.cjs; this now observes and
    // reports only. The clip ships exactly as rendered, always.
    //
    // The flag is 9% precise by ear, so it is logged for a human and is NOT a
    // gate: it must never reject a render or alter a byte.
    const tail = await audioProcessor.flagTailDefect(masteredPath, { text: ttsText })
    if (tail.defect) {
      logger.warn(`masterAudio: tail flag (${tail.defect.kind} ${tail.defect.peakDb}dB at ${tail.defect.trimSec}s) — SUSPECT ONLY, ${tail.precision}. Clip shipped exactly as rendered.`)
    }

    // Extract duration
    const metadata = await audioProcessor.getAudioMetadata(masteredPath)
    const durationMs = Math.round(metadata.duration * 1000)

    // Read mastered audio back
    const masteredBuffer = await fs.readFile(masteredPath)

    logger.debug(`Mastered audio: ${durationMs}ms, ${masteredBuffer.length} bytes`)

    return { buffer: masteredBuffer, durationMs }
  } finally {
    // Cleanup temp directory
    await fs.remove(tempDir)
  }
}

// =============================================================================
// GLOBAL PROGRESS STATE (for any audio generation)
// =============================================================================

const currentWork = {
  active: false,
  cancelled: false,     // Flag to signal cancellation
  operation: null,      // 'generate' | 'regenerate-role' | 'regenerate-presentations'
  courseCode: null,
  role: null,
  current: 0,
  total: 0,
  success: 0,
  failed: 0,
  startedAt: null,
  lastItem: null,       // Last processed item (for display)
  errors: []            // Recent errors
}

function startWork(operation, courseCode, total, role = null) {
  currentWork.active = true
  currentWork.cancelled = false  // Reset cancellation flag
  currentWork.operation = operation
  currentWork.courseCode = courseCode
  currentWork.role = role
  currentWork.current = 0
  currentWork.total = total
  currentWork.success = 0
  currentWork.failed = 0
  currentWork.startedAt = new Date().toISOString()
  currentWork.lastItem = null
  currentWork.errors = []
  logger.info(`[PROGRESS] Started ${operation} for ${courseCode}${role ? ` (${role})` : ''}: ${total} items`)
}

function cancelWork() {
  if (currentWork.active) {
    currentWork.cancelled = true
    logger.info(`[PROGRESS] Cancellation requested for ${currentWork.operation} on ${currentWork.courseCode}`)
    return true
  }
  return false
}

function updateWork(itemText, success = true, errorMsg = null) {
  currentWork.current++
  if (success) {
    currentWork.success++
  } else {
    currentWork.failed++
    if (errorMsg) {
      currentWork.errors.push({ text: itemText?.substring(0, 50), error: errorMsg })
      if (currentWork.errors.length > 10) currentWork.errors.shift() // Keep last 10
    }
  }
  currentWork.lastItem = itemText?.substring(0, 40)

  // Log progress every 10 items or on completion
  if (currentWork.current % 10 === 0 || currentWork.current === currentWork.total) {
    logger.info(`[PROGRESS] ${currentWork.current}/${currentWork.total} (${currentWork.success} ok, ${currentWork.failed} failed)`)
  }
}

function endWork() {
  logger.info(`[PROGRESS] Completed: ${currentWork.success}/${currentWork.total} success, ${currentWork.failed} failed`)
  currentWork.active = false
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get('/health', (req, res) => {
  // tail_repair_mode is here so "is this render service still mutating audio?"
  // is answerable with one curl from anywhere, rather than by reading the
  // process environment on the box. 'flag' = detect and report only.
  res.json({
    status: 'healthy',
    service: 'phase8-audio-v13',
    port: PORT,
    tail_repair_mode: audioProcessor.TAIL_REPAIR_MODE,
    // Which commit is THIS PROCESS running? Frozen at require time — see
    // services/shared/build-identity.cjs. The staleness watchdog reads it.
    build: buildIdentity()
  })
})

// =============================================================================
// STATUS ENDPOINT - Current work progress
// =============================================================================

app.get('/status', (req, res) => {
  res.json({ ...currentWork })
})

// =============================================================================
// CANCEL ENDPOINT - Stop current work
// =============================================================================

app.post('/cancel', (req, res) => {
  if (!currentWork.active) {
    return res.status(404).json({ error: 'No active job to cancel' })
  }

  const cancelled = cancelWork()
  if (cancelled) {
    res.json({
      success: true,
      message: 'Cancellation requested',
      courseCode: currentWork.courseCode,
      operation: currentWork.operation,
      progress: {
        current: currentWork.current,
        total: currentWork.total,
        success: currentWork.success,
        failed: currentWork.failed
      }
    })
  } else {
    res.status(400).json({ error: 'Failed to cancel job' })
  }
})

// Also support DELETE /cancel/:courseCode for backwards compatibility
app.delete('/cancel/:courseCode', (req, res) => {
  if (!currentWork.active) {
    return res.status(404).json({ error: 'No active job to cancel' })
  }

  if (currentWork.courseCode !== req.params.courseCode) {
    return res.status(400).json({
      error: 'Course code mismatch',
      activeJob: currentWork.courseCode,
      requested: req.params.courseCode
    })
  }

  const cancelled = cancelWork()
  if (cancelled) {
    res.json({
      success: true,
      message: 'Cancellation requested',
      courseCode: currentWork.courseCode
    })
  } else {
    res.status(400).json({ error: 'Failed to cancel job' })
  }
})

// =============================================================================
// GET PLAN - What audio is missing?
// =============================================================================

// =============================================================================
// HELPER: Link audio IDs to phrases/legos/seeds
// =============================================================================
async function linkAudioIds(courseCode) {
  // PRECIOUS-AUDIO PREFERENCE: the SQL RPC fills NULL FKs with a bare LIMIT 1
  // (no origin preference, no ORDER BY). Run a human-first JS pass beforehand
  // so that when a text has both a human and a TTS clip, the human one wins
  // the FK; the RPC then fills whatever is still NULL. Costs one head-count
  // query when the course has no human audio (the common case).
  try {
    const { count: humanCount, error: humanCountErr } = await supabase
      .from('course_audio')
      .select('id', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .eq('origin', 'human')
    if (!humanCountErr && humanCount > 0) {
      const humanResult = await linkAudioIdsBatch(courseCode, { humanOnly: true })
      if (humanResult.total > 0) {
        logger.info(`linkAudioIds: human-first pass linked ${humanResult.total} FKs to human recordings for ${courseCode}`)
      }
    }
  } catch (e) {
    logger.warn(`linkAudioIds: human-first pass failed (${e.message}) — continuing with RPC`)
  }

  // Try RPC first (single DB round-trip, handles normalization correctly)
  const { data, error } = await supabase.rpc('link_all_audio_ids', {
    p_course_code: courseCode
  })

  if (!error) {
    const presResult = await linkPresentationAudio(courseCode)
    const compPresResult = await linkComponentPresentationAudio(courseCode)
    const result = data || {}
    result.presentations = presResult.linked || 0
    result.component_presentations = compPresResult.linked || 0
    const rpcTotal = (result.phrases_known || 0) + (result.phrases_target1 || 0) + (result.phrases_target2 || 0)
      + (result.legos_known || 0) + (result.legos_target1 || 0) + (result.legos_target2 || 0)
      + (result.seeds_known || 0) + (result.seeds_target1 || 0) + (result.seeds_target2 || 0)
    result.total = rpcTotal + (result.presentations || 0) + (result.component_presentations || 0)
    logger.info(`linkAudioIds: linked via RPC for ${courseCode}`, JSON.stringify(result))
    return result
  }

  // RPC timed out — fall back to JS batch linking
  logger.warn(`link_all_audio_ids RPC failed (${error.message}), falling back to JS batch linking`)
  return await linkAudioIdsBatch(courseCode)
}

/**
 * JS fallback for linking audio IDs when the SQL RPC times out on large courses.
 * Loads the audio map, then batch-updates each table's NULL audio_id columns.
 * Uses text_normalized from course_audio (written by SQL normalize_text) for matching.
 * When several rows share a key, pickPreferredAudioRow decides (human > newest >
 * deterministic) — no more arbitrary last-row-wins.
 * opts.humanOnly: link only origin='human' rows (the human-first pre-pass).
 */
async function linkAudioIdsBatch(courseCode, opts = {}) {
  const { humanOnly = false } = opts
  const result = { total: 0 }
  const PAGE_SIZE = 1000
  const BATCH = 200

  // Load audio map keyed by normalizeForAudio(raw text) — which PRESERVES ?/! — so
  // question/exclamation intonation is significant (a "...?" phrase won't link to a
  // "..." recording). origin + created_at let pickPreferredAudioRow favour human > newest.
  let audioQuery = supabase
    .from('course_audio')
    .select('id, text, language, role, s3_key, origin, created_at')
    .eq('course_code', courseCode)
    .not('s3_key', 'like', 'pending/%')
    .limit(100000)
  if (humanOnly) audioQuery = audioQuery.eq('origin', 'human')
  const { data: audioRows, error: audioErr } = await audioQuery
  if (audioErr) throw new Error(`Failed to load course_audio: ${audioErr.message}`)

  if (humanOnly && !(audioRows || []).length) return result

  const audioMap = new Map()
  for (const a of (audioRows || [])) {
    // Key on normalizeForAudio(raw text) so ?/! are preserved; pickPreferredAudioRow
    // resolves collisions (human > newest). Map value is the chosen ROW.
    const norm = normalizeForAudio(a.text)
    if (!norm) continue
    const key = `${norm}|${a.language}|${a.role}`
    audioMap.set(key, pickPreferredAudioRow(audioMap.get(key), a))
  }
  logger.info(`linkAudioIdsBatch${humanOnly ? ' (human-only)' : ''}: loaded ${audioMap.size} audio entries for ${courseCode}`)

  // Helper: link one slot on one table
  async function linkSlot(table, idCol, textCol, audioCol, lang, role) {
    let linked = 0
    let offset = 0
    let more = true
    while (more) {
      const { data: rows, error: err } = await supabase
        .from(table)
        .select(`${idCol}, ${textCol}`)
        .eq('course_code', courseCode)
        .is(audioCol, null)
        .order(idCol, { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)
      if (err) { logger.error(`linkSlot ${table}.${audioCol}: ${err.message}`); break }
      if (!rows?.length) break

      // Collect updates
      const updates = []
      for (const row of rows) {
        const norm = normalizeForAudio(row[textCol])
        if (!norm) continue
        // Key preserves ?/! — a "...?" phrase only matches a "...?" recording; if none
        // exists it stays unlinked → regenerated with correct question intonation. No
        // ?-stripping fallback (it would relink question phrases to flat statement audio).
        const audioRow = audioMap.get(`${norm}|${lang}|${role}`)
        if (audioRow) updates.push({ id: row[idCol], audioId: audioRow.id })
      }

      // Batch update
      for (let i = 0; i < updates.length; i += BATCH) {
        const batch = updates.slice(i, i + BATCH)
        for (const u of batch) {
          const { error: upErr } = await supabase
            .from(table)
            .update({ [audioCol]: u.audioId })
            .eq('course_code', courseCode)
            .eq(idCol, u.id)
          if (!upErr) linked++
        }
      }

      more = rows.length === PAGE_SIZE
      offset += PAGE_SIZE
    }
    return linked
  }

  // Get course languages
  const { data: course } = await supabase
    .from('courses')
    .select('known_lang, target_lang')
    .eq('course_code', courseCode)
    .single()
  if (!course) throw new Error(`Course not found: ${courseCode}`)
  const { known_lang, target_lang } = course

  // Link all slots across all 3 tables
  const slots = [
    ['course_practice_phrases', 'id',      'known_text',  'known_audio_id',   known_lang,  'known'],
    ['course_practice_phrases', 'id',      'target_text', 'target1_audio_id', target_lang, 'target1'],
    ['course_practice_phrases', 'id',      'target_text', 'target2_audio_id', target_lang, 'target2'],
    ['course_legos',            'lego_id', 'known_text',  'known_audio_id',   known_lang,  'known'],
    ['course_legos',            'lego_id', 'target_text', 'target1_audio_id', target_lang, 'target1'],
    ['course_legos',            'lego_id', 'target_text', 'target2_audio_id', target_lang, 'target2'],
    ['course_seeds',            'id',      'known_text',  'known_audio_id',   known_lang,  'known'],
    ['course_seeds',            'id',      'target_text', 'target1_audio_id', target_lang, 'target1'],
    ['course_seeds',            'id',      'target_text', 'target2_audio_id', target_lang, 'target2'],
  ]

  for (const [table, idCol, textCol, audioCol, lang, role] of slots) {
    const n = await linkSlot(table, idCol, textCol, audioCol, lang, role)
    const key = `${table.replace('course_', '')}_${audioCol.replace('_audio_id', '')}`
    result[key] = n
    result.total += n
    if (n > 0) logger.info(`linkAudioIdsBatch: ${key} = ${n}`)
  }

  // Presentation linking is lego_id-keyed (no human/TTS text collision to
  // resolve) and runs in the main pass — skip it in the human-only pre-pass.
  if (humanOnly) return result

  // Presentation audio
  const presResult = await linkPresentationAudio(courseCode)
  result.presentations = presResult.linked || 0
  result.total += result.presentations

  // Component presentation audio
  const compPresResult = await linkComponentPresentationAudio(courseCode)
  result.component_presentations = compPresResult.linked || 0
  result.total += result.component_presentations

  logger.info(`linkAudioIdsBatch: total linked = ${result.total} for ${courseCode}`)
  return result
}

// =============================================================================
// HELPER: Link presentation audio to course_legos
// =============================================================================
// Belt-and-suspenders approach: matches course_audio (role=presentation, lego_id set)
// to course_legos.presentation_audio_id. Runs after any presentation generation.
// =============================================================================
async function linkPresentationAudio(courseCode) {
  // Get all presentation audio that has lego_id set (filter pending client-side)
  const { data: rawPres, error: presError } = await supabase
    .from('course_audio')
    .select('id, lego_id, s3_key')
    .eq('course_code', courseCode)
    .eq('role', 'presentation')
    .not('lego_id', 'is', null)
  const presentations = (rawPres || []).filter(p => !p.s3_key || !p.s3_key.startsWith('pending/'))

  if (presError || !presentations?.length) {
    return { linked: 0, error: presError?.message || null }
  }

  // Get all LEGOs missing presentation_audio_id
  const { data: legosNeedingLink } = await supabase
    .from('course_legos')
    .select('lego_id, presentation_audio_id')
    .eq('course_code', courseCode)
    .eq('is_new', true)

  if (!legosNeedingLink?.length) return { linked: 0 }

  // Build map: lego_id -> presentation course_audio.id
  const presMap = new Map()
  for (const p of presentations) {
    presMap.set(p.lego_id, p.id)
  }

  // Update LEGOs where presentation_audio_id is NULL or doesn't match
  let linked = 0
  for (const lego of legosNeedingLink) {
    const presId = presMap.get(lego.lego_id)
    if (!presId) continue
    if (lego.presentation_audio_id === presId) continue // already correct

    const legoMatch = lego.lego_id.match(/S(\d+)L(\d+)/)
    if (!legoMatch) continue

    const seedNumber = parseInt(legoMatch[1], 10)
    const legoIndex = parseInt(legoMatch[2], 10)

    const { error } = await supabase
      .from('course_legos')
      .update({ presentation_audio_id: presId })
      .eq('course_code', courseCode)
      .eq('seed_number', seedNumber)
      .eq('lego_index', legoIndex)

    if (!error) linked++
  }

  if (linked > 0) {
    logger.info(`linkPresentationAudio: linked ${linked} presentation audio IDs for ${courseCode}`)
  }

  return { linked }
}

/**
 * Link presentation audio IDs to component phrases (course_practice_phrases).
 * Component presentation audio is matched by text_normalized + role.
 * This mirrors linkPresentationAudio but for components instead of LEGOs.
 */
async function linkComponentPresentationAudio(courseCode) {
  // 1. Get component phrases missing presentation_audio_id
  const PAGE_SIZE = 1000
  const components = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, known_text')
      .eq('course_code', courseCode)
      .eq('phrase_role', 'component')
      .is('presentation_audio_id', null)
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1)
    if (error || !data?.length) break
    components.push(...data)
    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  if (components.length === 0) return { linked: 0 }

  // 2. Get course info and presentation template
  const { data: course } = await supabase
    .from('courses')
    .select('known_lang, target_lang')
    .eq('course_code', courseCode)
    .single()
  if (!course) return { linked: 0 }

  const targetLangName = getLocalisedLangName(course.target_lang, course.known_lang)
  const template = await getOrCreatePresentationTemplate(course.known_lang)

  // 3. Load parent M-LEGOs for "as in" context
  const seedNumbers = [...new Set(components.map(c => c.seed_number))]
  const parentMap = new Map()
  for (let i = 0; i < seedNumbers.length; i += 500) {
    const batch = seedNumbers.slice(i, i + 500)
    const { data: parents } = await supabase
      .from('course_legos')
      .select('seed_number, lego_index, known_text')
      .eq('course_code', courseCode)
      .eq('type', 'M')
      .in('seed_number', batch)
    for (const l of (parents || [])) {
      parentMap.set(`${l.seed_number}:${l.lego_index}`, l)
    }
  }

  // 4. Build presentation text for each component and look up audio
  const { data: allPresAudio } = await supabase
    .from('course_audio')
    .select('id, text_normalized, s3_key')
    .eq('course_code', courseCode)
    .eq('role', 'presentation')
    .eq('language', course.known_lang)
    .not('s3_key', 'like', 'pending/%')
    .limit(100000)

  const presAudioMap = new Map()
  for (const a of (allPresAudio || [])) {
    presAudioMap.set(a.text_normalized, a.id)
  }

  // 5. Match and link
  let linked = 0
  for (const comp of components) {
    const parent = parentMap.get(`${comp.seed_number}:${comp.lego_index}`)
    if (!parent) continue

    const presText = template
      .replace('{target_lang_name}', targetLangName)
      .replace('{known}', comp.known_text)
      .replace('{seed}', parent.known_text)

    const norm = normalizeForAudio(presText)
    const audioId = presAudioMap.get(norm)
    if (!audioId) continue

    const { error } = await supabase
      .from('course_practice_phrases')
      .update({ presentation_audio_id: audioId })
      .eq('id', comp.id)

    if (!error) linked++
  }

  if (linked > 0) {
    logger.info(`linkComponentPresentationAudio: linked ${linked} component presentation audio IDs for ${courseCode}`)
  }

  return { linked }
}

// GET /needs/:courseCode — canonical audio-needs endpoint.
// Thin wrapper around getAudioNeeds(). Pure read, no side effects.
// Returns the same shape /generate uses to decide what to TTS, so any other
// counter (dashboard Pending, /plan, /audio-stats) can consume it for parity.
app.get('/needs/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { data: course, error: courseError } = await supabase
      .from('courses').select('*').eq('course_code', courseCode).single()
    if (courseError || !course) return res.status(404).json({ error: 'Course not found' })
    const releaseTarget = await getEffectiveReleaseTarget(courseCode, course.seed_count)
    const needs = await getAudioNeeds(courseCode, releaseTarget, course)
    return res.json({
      courseCode,
      releaseTarget,
      toGenerate: needs.toGenerate.length,
      toAuthor: needs.toAuthor.length,
      toLink: needs.toLink,
      ungeneratable: needs.stats.ungeneratable,
      missingPresentation: needs.stats.missingPresentation,
      totalSlots: needs.stats.totalSlots,
      existing: needs.stats.existing,
      missing: needs.stats.missing,
      breakdown: needs.stats.breakdown,
      unlinkedBreakdown: needs.stats.unlinkedBreakdown,
      missingBreakdown: needs.stats.missingBreakdown,
      toCopy: needs.toCopy.length,
      storageBroken: needs.stats.storageBroken,
      storageBrokenBreakdown: needs.stats.storageBrokenBreakdown,
      ledger: needs.stats.ledger,
      readyForGenerate: needs.readyForGenerate,
      presentationStatus: needs.presentationStatus
    })
  } catch (error) {
    logger.error('/needs error:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /plan - for production-api compatibility (takes courseCode in body)
app.post('/plan', async (req, res) => {
  const { courseCode } = req.body
  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode required' })
  }
  // Redirect to GET handler
  req.params = { courseCode }
  return planHandler(req, res)
})

// GET /plan/:courseCode - direct access
app.get('/plan/:courseCode', planHandler)

async function planHandler(req, res) {
  try {
    const { courseCode } = req.params
    // Optional incremental scope: ?seeds=80,81 (GET) or body.seeds (POST) limits the plan.
    const rawSeeds = req.query?.seeds ?? req.body?.seeds
    const scopeSeeds = rawSeeds
      ? String(rawSeeds).split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n))
      : null

    // Get course info
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('course_code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const releaseTarget = await getEffectiveReleaseTarget(courseCode, course.seed_count)

    // Single source of truth — same enumeration /generate uses.
    const audioNeeds = await getAudioNeeds(courseCode, releaseTarget, course, false, scopeSeeds && scopeSeeds.length ? scopeSeeds : null)

    // Cost estimation — character count of what would actually be TTS'd.
    // toAuthor items have no rendered text yet (authored inside /generate);
    // estimate frame overhead + chunk + optional seed context per item.
    const authorChars = (audioNeeds.toAuthor || []).reduce(
      (sum, n) => sum + 60 + (n.chunk || '').length + (n.seed || '').length, 0)
    const totalChars = audioNeeds.toGenerate.reduce((sum, n) => sum + (n.text || '').length, 0) + authorChars
    const estimatedCost = (totalChars / 1000) * 0.016

    // Unique-text counts for display (counts unique known-side and target-side
    // texts across LEGOs+seeds — NOT the same as TTS work, just informational).
    const { data: allLegos } = await supabase
      .from('course_legos')
      .select('known_text, target_text')
      .eq('course_code', courseCode)
      .lte('seed_number', releaseTarget)
    const { data: allSeeds } = await supabase
      .from('course_seeds')
      .select('known_text, target_text')
      .eq('course_code', courseCode)
      .eq('status', 'released')
      .lte('seed_number', releaseTarget)
    const uniqueTexts = new Set()
    for (const src of [...(allLegos || []), ...(allSeeds || [])]) {
      if (!isPunctuationOnly(src.known_text)) uniqueTexts.add(`known|${normalizeText(src.known_text)}`)
      if (!isPunctuationOnly(src.target_text)) uniqueTexts.add(`target|${normalizeText(src.target_text)}`)
    }
    const uniqueKnownTexts = [...uniqueTexts].filter(k => k.startsWith('known|')).length
    const uniqueTargetTexts = [...uniqueTexts].filter(k => k.startsWith('target|')).length

    // Total presentations needed = is_new LEGOs in window
    const { count: totalPresentationsNeeded } = await supabase
      .from('course_legos')
      .select('id', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .eq('is_new', true)
      .lte('seed_number', releaseTarget)

    // Phrase count for display
    const { count: totalPhrases } = await supabase
      .from('course_practice_phrases')
      .select('id', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .lte('seed_number', releaseTarget)

    res.json({
      courseCode,
      releaseTarget,
      course: {
        displayName: course.display_name,
        knownLang: course.known_lang,
        targetLang: course.target_lang,
        voiceConfig: course.voice_config
      },
      // Truth: missing = what /generate will TTS (existing texts + intros it
      // will author itself in the same run)
      missing: audioNeeds.toGenerate.length + (audioNeeds.toAuthor?.length || 0),
      // Intros /generate will author (frame judgment) before TTS-ing them
      toAuthor: audioNeeds.toAuthor?.length || 0,
      // Free: rows whose audio already exists, just need the audio_id binding
      linkable: audioNeeds.toLink,
      // Clone once, copy everywhere: known-side items /generate will S3-copy
      // from another course's clone-voice audio instead of TTS-ing (0 chars,
      // 0 cost — already excluded from `missing`/estimatedCost above).
      copyable: audioNeeds.toCopy?.length || 0,
      // Dashboard "total" stays the union of slots vs. actual existing
      existing: audioNeeds.stats.existing,
      total: audioNeeds.stats.totalSlots,
      totalPhrases: totalPhrases || 0,
      totalPresentationsNeeded: totalPresentationsNeeded || 0,
      uniqueKnownTexts,
      uniqueTargetTexts,
      estimatedCost: `$${estimatedCost.toFixed(2)}`,
      estimatedChars: totalChars,
      ungeneratable: audioNeeds.stats.ungeneratable,
      readyForGenerate: audioNeeds.readyForGenerate,
      presentationStatus: audioNeeds.presentationStatus,
      breakdown: audioNeeds.stats.breakdown,
      ledger: audioNeeds.stats.ledger
    })
  } catch (error) {
    logger.error('Plan error:', error)
    res.status(500).json({ error: error.message })
  }
}

// =============================================================================
// GET INVENTORY - Audio summary for a course
// =============================================================================

app.get('/inventory/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params

    const { data, error } = await supabase
      .rpc('get_course_audio_summary', { p_course_code: courseCode })

    if (error) throw error

    res.json({
      courseCode,
      inventory: data || []
    })
  } catch (error) {
    logger.error('Inventory error:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// POST GENERATE - Generate missing audio (requires approval)
// =============================================================================

app.post('/generate/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params

    // Human-voice-only courses are never synthesised (Tom 2026-07-25: Welsh
    // cym_* courses are human-recorded). Skip up front with a logged notice
    // rather than letting the render loop error downstream per-clip.
    if (isHumanVoiceCourse(courseCode)) {
      logger.info(`[/generate] SKIP ${courseCode}: human-voice-only course — no TTS generated (Tom's ruling 2026-07-25)`)
      return res.json({ skipped: true, reason: 'human-voice-only-course', courseCode, generated: 0 })
    }

    // Stamped before any render so the post-run audio gate can scope itself to
    // exactly the clips THIS pass minted (see the gate call at completion).
    const runStartedAt = new Date().toISOString()

    const { dryRun = false, limit = 50000, concurrency: requestedConcurrency, roles: requestedRoles, seeds: requestedSeeds, authorScope: requestedAuthorScope } = req.body  // High default for bulk generation
    const authorScope = ['all', 'lego', 'none'].includes(requestedAuthorScope) ? requestedAuthorScope : 'all'
    // Optional incremental scope: restrict generation to specific seed numbers.
    const scopeSeeds = Array.isArray(requestedSeeds) && requestedSeeds.length
      ? requestedSeeds.map(n => parseInt(n, 10)).filter(n => !isNaN(n))
      : null

    // Use requested concurrency if provided, clamped to 1-20, otherwise use env/default
    const concurrencyToUse = requestedConcurrency
      ? Math.max(1, Math.min(20, parseInt(requestedConcurrency, 10) || CONCURRENCY))
      : CONCURRENCY

    // Get course with voice config
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('course_code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const voiceConfig = course.voice_config || {}
    const voices = voiceConfig.voices || voiceConfig  // Support both nested and flat structure
    // Require real voiceIds, not just role objects: deu_at_for_eng had a known
    // voice of empty strings, which sailed past the object check and then
    // failed all 11,606 known items with "voiceId.split is not a function".
    const missingVoiceRoles = ['known', 'target1'].filter(r => !voices[r] || !voices[r].voiceId)
    if (missingVoiceRoles.length) {
      return res.status(400).json({
        error: 'Course missing voice configuration',
        missingRoles: missingVoiceRoles,
        voiceConfig
      })
    }

    // Release target — generate audio for all decomposed seeds
    // Uses actual max decomposed seed_number, not a configured cap
    const releaseTarget = await getEffectiveReleaseTarget(courseCode, course.seed_count)

    const PAGE_SIZE = 1000  // Used by component presentation section below

    // =========================================================================
    // UNIFIED AUDIO NEEDS DETECTION
    // Uses getAudioNeeds() — same source of truth as /plan endpoint.
    // Finds unlinked slots (NULL audio_id), tries to link existing audio,
    // then determines what actually needs TTS generation.
    // =========================================================================

    // Helper to get voice settings from config (supports nested voices structure).
    // ALWAYS canonical: this used to return '<provider>_<id>' when the course's
    // voice_config happened to carry a `provider` key and a BARE id when it did
    // not, which is the main /generate path's share of the 104,728 bare rows —
    // and a bare id also breaks TTS dispatch below, which splits on '_' to find
    // the provider. An unresolvable voice returns null exactly as an absent one
    // does, so the item fails on its own ("No voice configured for role …")
    // instead of taking the whole course's generate down with it.
    const getVoiceForRole = (role) => {
      const v = voices[role]
      if (!v) return null
      const raw = typeof v === 'string' ? v : v.voiceId
      if (!raw) return null // empty voiceId → null, never the config object
      const canonical = tryCanonicalClipVoiceId(raw, typeof v === 'string' ? undefined : v.provider)
      if (!canonical) {
        logger.warn(`getVoiceForRole(${role}): cannot canonicalise voice ${JSON.stringify(raw)} — fix the course voice_config (provider missing/unknown)`)
        return null
      }
      return canonical
    }
    const getSpeedForRole = (role) => voices[role]?.settings?.speed || 1.0

    // Step A: Try to link any unlinked audio before generating
    try {
      const linkResults = await linkAudioIds(courseCode)
      if (linkResults.total > 0) {
        logger.info(`Pre-generate link: bound ${linkResults.total} existing audio records`)
      }
    } catch (linkErr) {
      logger.warn(`Pre-generate link failed: ${linkErr.message}`)
    }

    // Step B: Find what still needs generating (after linking)
    const audioNeeds = await getAudioNeeds(courseCode, releaseTarget, course, false, scopeSeeds)

    // Step B-1: Purge stale pending presentation rows (text frozen before a
    // known_text edit). getAudioNeeds already dropped them from TTS and queued
    // their LEGOs for re-authoring; leaving the rows behind would resurrect
    // the old gloss on the next run. Pending rows are text placeholders only
    // (s3_key 'pending/…', no S3 asset), so this deletes no generated audio.
    if (!dryRun && audioNeeds.stalePendingIds?.length) {
      const staleIds = audioNeeds.stalePendingIds
      for (let i = 0; i < staleIds.length; i += 100) {
        const { error: purgeError } = await supabase
          .from('course_audio')
          .delete()
          .in('id', staleIds.slice(i, i + 100))
        if (purgeError) logger.warn(`Stale pending purge batch failed: ${purgeError.message}`)
      }
      logger.info(`Purged ${staleIds.length} stale pending presentation row(s) for ${courseCode}`)
      emitProgress(supabase, courseCode, `Purged ${staleIds.length} stale presentation placeholder(s) (text predates known_text edits) — re-authoring from current text`, { phase: 'audio', action: 'purge-stale-presentations', count: staleIds.length })
    }

    // Step B0: Author missing introduction text inline (frozen frame +
    // context judgment via Sonnet on the CLI). This replaces the separate
    // "Generate Missing Presentation Text" stage and its readiness gate —
    // one button does author → TTS → bind. dryRun authors nothing (no CLI
    // spend); it reports what WOULD be authored.
    let authoredIntros = []
    let authorFlags = []
    // authorScope narrows which intros may be authored, so a spend approval
    // can be expressed at the call instead of by editing content. 'all'
    // (default) is today's behaviour; 'lego' authors LEGO intros only and
    // leaves component intros untouched; 'none' authors nothing and renders
    // only text that already exists. Used 2026-08-05 to finish the fra
    // re-voice under an approval covering deleted LEGO intros but not the
    // never-authored component-intro backlog.
    if (authorScope !== 'all' && audioNeeds.toAuthor?.length) {
      const before = audioNeeds.toAuthor.length
      audioNeeds.toAuthor = authorScope === 'none'
        ? []
        : audioNeeds.toAuthor.filter(a => a.lego_id)
      logger.info(`authorScope=${authorScope}: ${before} → ${audioNeeds.toAuthor.length} intro(s) eligible for authoring`)
    }
    if (!dryRun && audioNeeds.toAuthor?.length) {
      const template = await getOrCreatePresentationTemplate(course.known_lang)
      const targetLangName = getLocalisedLangName(course.target_lang, course.known_lang)
      const knownLangName = getLocalisedLangName(course.known_lang, 'eng')
      emitProgress(supabase, courseCode, `Authoring ${audioNeeds.toAuthor.length} introductions (frame judgment)…`, { phase: 'audio', action: 'author', total: audioNeeds.toAuthor.length })
      const authored = await presentationAuthor.authorPresentations(supabase, course, audioNeeds.toAuthor, {
        template,
        targetLangName,
        knownLangName,
        onProgress: (done, total) => {
          logger.info(`Authoring intros: ${done}/${total}`)
          // Surface authoring in /status: the batch runner's stall guard reads
          // the progress fingerprint, and authoring can legitimately run for
          // an hour-plus (per-batch CLI timeouts) with no TTS item progress.
          currentWork.active = true
          currentWork.operation = 'author'
          currentWork.courseCode = courseCode
          currentWork.current = done
          currentWork.total = total
        }
      })
      authoredIntros = authored.authored
      authorFlags = authored.flags
      if (authorFlags.length) {
        await presentationAuthor.recordAuthorFlags(supabase, courseCode, authorFlags)
        emitProgress(supabase, courseCode, `Author flagged ${authorFlags.length} possible content issue(s) — see content feedback`, { phase: 'audio', action: 'author-flags', count: authorFlags.length })
      }
      const bCount = authoredIntros.filter(a => a.frame === 'B').length
      emitProgress(supabase, courseCode, `Authored ${authoredIntros.length} introductions (${bCount} with context, ${authoredIntros.length - bCount} bare)`, { phase: 'audio', action: 'authored', total: authoredIntros.length })
    }

    // Step B2: If items are "linkable" but nothing actually linked (link step ran
    // but linked 0), the "linkable" items are stuck — normalization mismatch between
    // JS normalizeForAudio and DB text_normalized prevents the RPC from matching.
    // Reclassify them as "to generate" so TTS runs and creates correct records.
    if (audioNeeds.toLink > 0 && audioNeeds.toGenerate.length === 0) {
      logger.warn(`${audioNeeds.toLink} items stuck as "linkable" — reclassifying all unlinked as "to generate"`)
      // Re-run but skip the existingSet check — treat everything unlinked as needing TTS
      const forceNeeds = await getAudioNeeds(courseCode, releaseTarget, course, true)
      audioNeeds.toGenerate = forceNeeds.toGenerate
      audioNeeds.toLink = 0
      logger.info(`Reclassified: now ${audioNeeds.toGenerate.length} to generate`)
    }

    // Step B3: "Clone once, copy everywhere" — copy first, TTS only the
    // remainder. audioNeeds.toCopy already excludes anything still in
    // audioNeeds.toGenerate (see classifyEnglishCopyBucket), so this can only
    // add coverage, never re-render a phrase the clone already has. Skipped
    // entirely on dryRun — a preview must never write.
    let copyBucketResult = { copied: 0, failed: 0 }
    if (!dryRun && audioNeeds.toCopy?.length) {
      copyBucketResult = await executeCopyBucket(courseCode, course.known_lang, audioNeeds.toCopy)
      logger.info(`Copy bucket for ${courseCode}: ${copyBucketResult.copied} copied, ${copyBucketResult.failed} failed (0 TTS calls for these)`)
    }

    // Add voice config to each item. Always resolve from voice_config — the
    // role determines the voice. Don't trust item.voice_id from pending rows;
    // some flows store it without the provider prefix (e.g. "pt-PT-RaquelNeural"
    // instead of "azure_pt-PT-RaquelNeural"), which breaks TTS dispatch.
    // Presentations get the dedicated resolver: explicit config wins, then
    // the English clone for eng-known courses, then the known-role voice —
    // so courses without voices.presentation no longer fail those items.
    // resolvePresentationVoiceId now returns a canonical id and throws on a
    // config it cannot resolve. Presentation items then fail individually with
    // the usual "No voice configured for role: presentation" instead of the
    // whole course's generate 500-ing on one bad config.
    let presentationVoiceId = null
    try {
      presentationVoiceId = presentationAuthor.resolvePresentationVoiceId(course)
    } catch (voiceErr) {
      logger.warn(`resolvePresentationVoiceId(${courseCode}): ${voiceErr.message} — presentation items will fail until voice_config is fixed`)
    }
    // The language on the item is the identity column. It comes from the course
    // row (known_lang/target_lang) and is normally already canonical; carrying
    // the error on the item rather than throwing here keeps one broken course
    // field from taking every role down with it.
    const withCanonicalLanguage = (item) => {
      const language = tryCanonicalLanguage(item.language)
      if (language) return { ...item, language }
      return { ...item, identityError: `cannot canonicalise language ${JSON.stringify(item.language)} — fix the course's known_lang/target_lang` }
    }
    const needed = audioNeeds.toGenerate.map(item => withCanonicalLanguage({
      ...item,
      voiceId: item.role === 'presentation' ? presentationVoiceId : getVoiceForRole(item.role),
      speed: getSpeedForRole(item.role)
    }))

    // Freshly authored intros join the same TTS queue
    for (const a of authoredIntros) {
      needed.push(withCanonicalLanguage({
        text: a.text,
        language: course.known_lang,
        role: 'presentation',
        lego_id: a.lego_id || null,
        phrase_id: a.phrase_id || null,
        voiceId: presentationVoiceId,
        speed: getSpeedForRole('presentation')
      }))
    }

    logger.info(`Audio needs: ${audioNeeds.stats.missing} missing total, ${audioNeeds.toLink} linkable, ${audioNeeds.toGenerate.length} need TTS, ${authoredIntros.length} freshly authored`)


    // Filter by requested roles if specified (e.g. roles: ['known', 'presentation'])
    if (requestedRoles && Array.isArray(requestedRoles) && requestedRoles.length > 0) {
      const allowedRoles = new Set(requestedRoles)
      const beforeCount = needed.length
      const filtered = needed.filter(n => allowedRoles.has(n.role))
      logger.info(`Role filter [${requestedRoles.join(', ')}]: ${beforeCount} → ${filtered.length} items`)
      needed.length = 0
      needed.push(...filtered)
    }

    // Deduplicate using normalizeText for consistent keys (matches existingSet logic).
    // Presentation items keep their bind target in the key — two intros can
    // render identical text for different LEGOs/components, and collapsing
    // them would silently drop one of the FK binds.
    logger.info(`Before dedup: ${needed.length} items (known=${needed.filter(n=>n.role==='known').length}, target1=${needed.filter(n=>n.role==='target1').length}, target2=${needed.filter(n=>n.role==='target2').length}, presentation=${needed.filter(n=>n.role==='presentation').length})`)
    const uniqueNeeded = [...new Map(
      needed.map(n => [`${normalizeText(n.text)}|${n.language}|${n.role}${n.role === 'presentation' ? `|${n.lego_id || n.phrase_id || ''}` : ''}`, n])
    ).values()].slice(0, limit)
    logger.info(`After dedup: ${uniqueNeeded.length} unique items`)

    // Load pre-computed gender expansions from DB
    let genderMap = new Map()
    if (genderHaikuService.GENDERED_LANGUAGES.includes(course.target_lang) && !dryRun) {
      genderMap = await genderHaikuService.loadGenderMap(courseCode, supabase)
      logger.info(`Loaded ${genderMap.size} gender expansions from DB`)
    }

    if (dryRun) {
      return res.json({
        dryRun: true,
        wouldGenerate: uniqueNeeded.length + (audioNeeds.toAuthor?.length || 0),
        wouldAuthor: audioNeeds.toAuthor?.length || 0,
        wouldCopy: audioNeeds.toCopy?.length || 0,
        wouldPurgeStalePresentations: audioNeeds.stalePendingIds?.length || 0,
        samples: uniqueNeeded.slice(0, 10),
        authorSamples: (audioNeeds.toAuthor || []).slice(0, 5)
      })
    }

    // Start progress tracking
    startWork('generate', courseCode, uniqueNeeded.length)

    // Emit narrative beat
    const roleCounts = {}
    for (const n of uniqueNeeded) roleCounts[n.role] = (roleCounts[n.role] || 0) + 1
    const roleDesc = Object.entries(roleCounts).map(([r, c]) => `${c} ${r}`).join(', ')
    emitProgress(supabase, courseCode, `Audio generation started: ${uniqueNeeded.length} files (${roleDesc})`, { phase: 'audio', action: 'generate', total: uniqueNeeded.length, roles: roleCounts })

    // Process items in parallel with concurrency limit
    logger.info(`Generating ${uniqueNeeded.length} audio files with concurrency=${concurrencyToUse}`)

    const results = { success: 0, failed: 0, errors: [] }
    // Pre-publish veracity gate (services/audio-veracity.cjs). ON by default;
    // announceStatus prints one LOUD line if it is off or cannot run, so
    // "published unchecked" can never be mistaken for "published clean".
    results.veracity = veracity.newStats()
    veracity.announceStatus(logger)

    // Bind presentation audio to its consumers: the course_legos FK AND the
    // lego_introductions projection (both read live by the learning app —
    // cycles.ts reads the FK, useScriptCache reads lego_introductions), or
    // the component phrase FK. One helper so the projections never diverge.
    const bindPresentationAudio = async (item, audioRowId, durationMs) => {
      if (item.lego_id) {
        const legoMatch = item.lego_id.match(/S(\d+)L(\d+)/)
        if (legoMatch) {
          const { error: updateError } = await supabase
            .from('course_legos')
            .update({ presentation_audio_id: audioRowId })
            .eq('course_code', courseCode)
            .eq('seed_number', parseInt(legoMatch[1], 10))
            .eq('lego_index', parseInt(legoMatch[2], 10))
          if (updateError) {
            logger.warn(`Could not update course_legos.presentation_audio_id for ${item.lego_id}: ${updateError.message}`)
          }
        }
        const { error: introError } = await supabase
          .from('lego_introductions')
          .upsert({
            course_code: courseCode,
            lego_id: item.lego_id,
            presentation_audio_id: audioRowId,
            audio_uuid: audioRowId,
            ...(durationMs ? { duration_ms: durationMs } : {})
          }, { onConflict: 'course_code,lego_id', ignoreDuplicates: false })
        if (introError) {
          logger.warn(`Could not upsert lego_introductions for ${item.lego_id}: ${introError.message}`)
        }
      } else if (item.phrase_id) {
        const { error: phraseError } = await supabase
          .from('course_practice_phrases')
          .update({ presentation_audio_id: audioRowId })
          .eq('id', item.phrase_id)
        if (phraseError) {
          logger.warn(`Could not update phrase presentation_audio_id (${item.phrase_id}): ${phraseError.message}`)
        }
      }
    }

    // Helper to generate a single audio item
    const generateItem = async (item) => {
      // An identity we could not compose is a failure of THIS item — never a
      // reason to write a row under a spelling no reader can find.
      if (item.identityError) throw new Error(item.identityError)

      // PRECIOUS-AUDIO GUARD: if a human recording occupies this exact audio key
      // (a re-recorded row keeps its original voice_id), never TTS over it — the
      // upsert below would flip origin back to 'tts' and repoint s3_key.
      // (No voiceId → no upsert key to collide with; the item fails at TTS
      // dispatch below exactly as it always did.)
      if (item.voiceId) {
        const guardedHuman = await humanRowAtAudioKey(
          courseCode, normalizeForAudio(item.text), item.language, item.role, item.voiceId
        )
        if (guardedHuman) {
          updateWork(item.text, true)
          logger.info(`[PreciousAudio] SKIP generate: "${item.text.substring(0, 40)}" (${item.role}) — human recording ${guardedHuman.id} holds this key`)
          return { success: true, item, skippedHuman: true }
        }
      }

      // -----------------------------------------------------------------------
      // Cross-course audio sharing: reuse S3 files from sibling courses
      // If another course already has audio for the same text+language+role+voice,
      // create a new course_audio row pointing to the same S3 file (skip TTS).
      // -----------------------------------------------------------------------
      try {
        const siblingAudio = await findSiblingCourseClip(
          courseCode, item.text, item.language, item.role, item.voiceId)

        if (siblingAudio?.s3_key) {
          // Reuse existing S3 file — just insert a new course_audio row
          const { data: insertedAudio, error: insertError } = await supabase
            .from('course_audio')
            .upsert({
              course_code: courseCode,
              text: item.text,
              text_normalized: normalizeForAudio(item.text),
              language: item.language,
              role: item.role,
              voice_id: item.voiceId,
              origin: 'tts',
              s3_key: siblingAudio.s3_key,
              duration_ms: siblingAudio.duration_ms,
              lego_id: item.lego_id || null,
              word_boundaries: siblingAudio.word_boundaries || null
            }, {
              onConflict: 'course_code,text_normalized,language,role,voice_id'
            })
            .select('id')
            .single()

          if (!insertError && insertedAudio) {
            // Link presentation audio if needed (FK + lego_introductions)
            if (item.role === 'presentation' && insertedAudio.id) {
              await bindPresentationAudio(item, insertedAudio.id, siblingAudio.duration_ms)
            }
            updateWork(item.text, true)
            logger.info(`Shared: ${item.role} - "${item.text.substring(0, 40)}..." (reused from sibling course)`)
            return { success: true, item, shared: true }
          }
        }
      } catch (e) {
        // Not found or error — fall through to normal TTS generation
      }

      // Determine TTS provider from voice config
      // Voice format: azure_es-ES-ElviraNeural or elevenlabs_voiceId
      if (typeof item.voiceId !== 'string' || !item.voiceId) {
        throw new Error(`No voice configured for role ${item.role} — fill in the course voice_config`)
      }
      const [provider, voiceName] = item.voiceId.split('_', 2)

      // Use speed from voice config (everything is a parameter!)
      const speed = item.speed || 1.0

      // Gender expansion for target language audio
      // Pre-computed by Haiku (or regex fallback for marker-based text)
      let textForTTS = item.text
      const genderKey = `${item.text}|${item.language}|${item.role}`
      const genderResult = genderMap.get(genderKey)
      if (genderResult?.wasModified) {
        textForTTS = genderResult.expandedText
        logger.info(`Gender: "${item.text}" → "${textForTTS}" (${item.role})`)
      } else if ((item.role === 'target1' || item.role === 'target2') && genderService.hasGenderMarker(item.text)) {
        // Fallback: text with explicit markers like "cansado(a)" — use regex expander
        const markerResult = genderService.analyzeAndExpand(item.text, item.language, item.role)
        if (markerResult.wasModified) {
          textForTTS = markerResult.expandedText
          logger.info(`Gender (marker): "${item.text}" → "${textForTTS}" (${item.role})`)
        }
      }

      // Render + master ONE attempt. Everything the veracity gate may need to
      // repeat lives in here; nothing outside it is allowed to publish.
      const renderAndMaster = async () => {
        let rawAudioBuffer, wordBoundaries
        if (provider === 'azure') {
          ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'azure', {
            subscriptionKey: process.env.AZURE_SPEECH_KEY,
            region: process.env.AZURE_SPEECH_REGION || 'westeurope',
            voiceName: voiceName,
            speed
          }))
        } else if (provider === 'elevenlabs') {
          ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'elevenlabs', {
            apiKey: process.env.ELEVENLABS_API_KEY,
            voiceId: voiceName,
            speed
          }))
        } else if (provider === 'xai') {
          ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'xai', {
            apiKey: process.env.XAI_API_KEY,
            voiceId: voiceName,
            language: toBcp47(item.language),
          }))
        } else {
          throw new Error(`Unknown TTS provider: ${provider}`)
        }

        // Master audio: normalize loudness and extract duration
        // Note: xAI does not expose an API-level speed parameter, so xAI audio
        // is always generated at natural speed. Downstream cadence playback speed
        // adjustments are applied in the player, not at TTS time.
        const { buffer, durationMs } = await masterAudio(rawAudioBuffer, textForTTS)
        return { buffer, durationMs, wordBoundaries }
      }

      // ── PRE-PUBLISH VERACITY GATE ──────────────────────────────────────────
      // Audio is not staged: the S3 upload and the course_audio row below make
      // this clip learner-facing immediately (Tom, 2026-08-04). So the check
      // happens HERE — after mastering, because mastering is part of what can
      // damage a clip, and before anything is written.
      //
      // Checked against textForTTS, not item.text: the gender-expanded string
      // is what the voice was actually asked to say.
      //
      // A failing clip is re-rendered and re-checked; if it still fails it is
      // quarantined (durable record + the audio, services/audio-veracity.cjs)
      // and this item fails the batch item — never publishes, never silently
      // vanishes from the report.
      const gated = await veracity.renderChecked({
        render: renderAndMaster,
        expectedText: textForTTS,
        language: item.language,
        stats: results.veracity,
        logger,
        meta: {
          courseCode, role: item.role, voiceId: item.voiceId,
          lego_id: item.lego_id || null, phrase_id: item.phrase_id || null,
          originalText: item.text,
        },
      })
      if (!gated.published) {
        throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason}, CER ${gated.verdict?.cer}, heard ${JSON.stringify(String(gated.verdict?.decode || '').slice(0, 60))})`)
      }
      const { buffer: masteredBuffer, durationMs, wordBoundaries } = gated

      // Generate UUID for S3 key (UPPERCASE to match existing S3 convention)
      const audioId = uuidv4().toUpperCase()
      const s3Key = `mastered/${audioId}.mp3`

      // Upload mastered audio to S3
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: masteredBuffer,
        ContentType: 'audio/mpeg',
        CacheControl: AUDIO_CACHE_CONTROL,
      }))

      // Insert into course_audio with duration
      // Include lego_id for presentation audio (needed for /plan matching)
      // Use .select('id') to get the ID back directly for linking
      const { data: insertedAudio, error: insertError } = await supabase
        .from('course_audio')
        .upsert({
          course_code: courseCode,
          text: item.text,
          text_normalized: normalizeForAudio(item.text),
          language: item.language,
          role: item.role,
          voice_id: item.voiceId,
          origin: 'tts',
          s3_key: s3Key,
          duration_ms: durationMs,
          lego_id: item.lego_id || null,
          word_boundaries: wordBoundaries || null,
          // The gate's verdict travels WITH the clip. Without this the only
          // record of a check is a per-run counter in a log, and the listening
          // surface is left inferring quality from created_at — the inference
          // docs/gate-bypass-audit-2026-08-05.md found false for every row it
          // selected. See veracity.verdictColumns for the three-state rule.
          ...veracity.verdictColumns(gated.verdict, {
            checker: 'phase8-generate',
            attempts: gated.attempts,
          })
        }, {
          onConflict: 'course_code,text_normalized,language,role,voice_id'
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      // For presentation audio, immediately bind to its consumers using the
      // ID we just got (course_legos FK + lego_introductions, or phrase FK)
      if (item.role === 'presentation' && insertedAudio?.id) {
        await bindPresentationAudio(item, insertedAudio.id, durationMs)
        logger.info(`Bound presentation audio ${insertedAudio.id} to ${item.lego_id || `phrase ${item.phrase_id}`}`)
      }

      updateWork(item.text, true)
      logger.info(`Generated: ${item.role} - "${item.text.substring(0, 30)}..."`)
      return { success: true, item }
    }

    // Process in parallel batches
    for (let i = 0; i < uniqueNeeded.length; i += concurrencyToUse) {
      // Check for cancellation at the start of each batch
      if (currentWork.cancelled) {
        logger.info(`[PROGRESS] Cancelled after ${currentWork.current}/${currentWork.total} items`)
        break
      }

      const batch = uniqueNeeded.slice(i, i + concurrencyToUse)
      const batchNum = Math.floor(i / concurrencyToUse) + 1
      const totalBatches = Math.ceil(uniqueNeeded.length / concurrencyToUse)

      logger.info(`Processing batch ${batchNum}/${totalBatches} (${batch.length} items)`)

      // Wrap each item with a 120s timeout to prevent hung Supabase/TTS calls from blocking the batch
      const withTimeout = (fn, ms = 120_000) => Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms / 1000}s`)), ms))
      ])
      const batchResults = await Promise.allSettled(batch.map(item => withTimeout(() => generateItem(item))))

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j]
        if (result.status === 'fulfilled') {
          results.success++
        } else {
          results.failed++
          const item = batch[j]
          results.errors.push({
            text: item.text.substring(0, 50),
            role: item.role,
            error: result.reason?.message || 'Unknown error'
          })
          updateWork(item.text, false, result.reason?.message)
          logger.error(`Failed: ${item.role} - "${item.text.substring(0, 30)}...": ${result.reason?.message}`)
        }
      }

      // Emit progress every 10 batches
      if (batchNum % 10 === 0) {
        emitProgress(supabase, courseCode, `Audio: ${results.success}/${uniqueNeeded.length} generated${results.failed > 0 ? ` (${results.failed} failed)` : ''}${results.veracity.quarantined > 0 ? `, ${results.veracity.quarantined} quarantined by the veracity gate` : ''}`, { phase: 'audio', action: 'generate', progress: results.success, total: uniqueNeeded.length, failed: results.failed, veracity: results.veracity })
      }

      // Periodically link audio IDs every 10 batches so progress is visible
      // even if generation is interrupted
      if (batchNum % 10 === 0) {
        try {
          const mid = await linkAudioIds(courseCode)
          if (mid.total > 0) logger.info(`Mid-generation link: bound ${mid.total} audio IDs`)
        } catch (e) {
          logger.warn(`Mid-generation link failed: ${e.message}`)
        }
      }
    }

    const wasCancelled = currentWork.cancelled
    endWork()

    // Auto-link audio IDs to phrases/legos/seeds after generation
    let linked = 0
    if (!wasCancelled) {
      try {
        const linkResults = await linkAudioIds(courseCode)
        linked = linkResults.total
        if (linked > 0) {
          logger.info(`Auto-linked ${linked} audio IDs for ${courseCode}`)
        }
      } catch (linkErr) {
        logger.error(`Auto-link failed for ${courseCode}: ${linkErr.message}`)
      }
    }

    if (!wasCancelled && results.success > 0) {
      await bumpCourseVersion(supabase, courseCode, 'patch')
      // Bump the integer revalidation key once so the learning app
      // auto-detects this freshly generated audio (the course_legos trigger
      // never fires on audio-only runs).
      await bumpCourseRevalidation(supabase, courseCode)
    }

    // A completed pass with no failures fulfils the course's pending
    // audio-pass request (content passes queue these instead of running TTS —
    // see services/shared/audio-pass-queue.cjs). Failures keep the request
    // pending so the backlog stays visible.
    if (!wasCancelled && results.failed === 0) {
      await fulfillAudioPassRequests(supabase, courseCode)
    }

    // Keep model-voice envelope metadata (adaptation-v2 stage 2, see
    // tools/audio-envelope-batch.cjs) fresh for any target1 clips this pass
    // minted. Fire-and-forget: never blocks or fails the /generate response —
    // the batch tool is idempotent, so a missed row here is just picked up by
    // the next run (manual or the next /generate pass).
    if (results.success > 0) {
      require('../../tools/audio-envelope-batch.cjs').backfillCourseSafe(courseCode)
    }

    // Post-batch audio gate: ask the one question this pipeline never asked —
    // "is there actually speech in these clips?" On 2026-08-03 a degrading xAI
    // run answered 539 French requests with empty HTTP 200 bodies; the mastering
    // chain laundered them into well-formed MP3s and duration_ms was computed
    // from those files, so every consistency check in the estate passed and the
    // pass reported success. tts-service.cjs now refuses an empty response at
    // the boundary; this is the independent second net on the OUTPUT, scoped to
    // the clips this run minted. Fire-and-forget and never throws — a gate that
    // can break a completed render pass is worse than no gate. It REPORTS; it
    // never deletes or mutates a row.
    if (results.success > 0) {
      require('../../tools/audio-batch-gate.cjs').gateBatchSafe(courseCode, runStartedAt, logger)
    }

    // Pre-publish veracity gate counts. These go in the completion line and
    // the response because a gate whose result you have to go looking for is a
    // gate nobody reads: n checked / n failed / n re-rendered / n quarantined /
    // n UNCHECKED. The last one is the honest third state — clips that went out
    // without the check running at all.
    const vLine = veracity.formatStats(results.veracity)
    if (results.veracity.quarantined > 0 || results.veracity.unchecked > 0) logger.error(`[audio-veracity] ${courseCode}: ${vLine}`)
    else logger.info(`[audio-veracity] ${courseCode}: ${vLine}`)

    // Emit completion
    const statusWord = wasCancelled ? 'Audio generation cancelled' : 'Audio generation complete'
    emitProgress(supabase, courseCode, `${statusWord}: ${results.success}/${uniqueNeeded.length} generated${results.failed > 0 ? `, ${results.failed} failed` : ''}${linked > 0 ? `, ${linked} audio IDs linked` : ''} — ${vLine}`, { phase: 'audio', action: 'generate-complete', success: results.success, failed: results.failed, linked, veracity: results.veracity })

    res.json({
      status: wasCancelled ? 'cancelled' : 'completed',
      courseCode,
      total: uniqueNeeded.length,
      success: results.success,
      failed: results.failed,
      cancelled: wasCancelled,
      veracity: results.veracity,
      errors: results.errors.slice(0, 10),
      linked,
      copied: copyBucketResult.copied,
      copyFailed: copyBucketResult.failed,
      authored: authoredIntros.length,
      authorFlags: authorFlags.length,
      authorFlagSamples: authorFlags.slice(0, 10).map(f => ({
        lego_id: f.lego_id || null,
        phrase_id: f.phrase_id || null,
        chunk: f.chunk,
        issue: f.issue
      }))
    })

  } catch (error) {
    logger.error('Generate error:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// POST REGENERATE-ROLE - Regenerate all audio for a specific role
// =============================================================================

app.post('/regenerate-role/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    if (isHumanVoiceCourse(courseCode)) {
      logger.info(`[/regenerate-role] SKIP ${courseCode}: human-voice-only course — no TTS (Tom's ruling 2026-07-25)`)
      return res.json({ skipped: true, reason: 'human-voice-only-course', courseCode })
    }
    const { role, dryRun = false, limit, flaggedOnly = false } = req.body

    if (!role) {
      return res.status(400).json({ error: 'Role is required' })
    }

    // Validate role
    const validRoles = ['known', 'target1', 'target2', 'presentation', 'encouragement', 'instruction']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}` })
    }

    // Get course with voice config
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('course_code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const voiceConfig = course.voice_config || {}

    // Get the voice settings for this role.
    // voiceId is the PROVIDER's spelling and is handed to Azure/xAI/ElevenLabs
    // verbatim below — prefixing it there breaks the render. storedVoiceId is
    // the identity spelling and is the only one that reaches a column.
    const voiceSettings = voiceConfig.voices?.[role] || {}
    const voiceId = voiceSettings.voiceId || voiceConfig[role]
    const voiceProvider = voiceSettings.provider || 'azure'  // Default to azure
    let storedVoiceId = null
    if (voiceId) {
      try {
        storedVoiceId = canonicalClipVoiceId(voiceId, voiceSettings.provider)
      } catch (identityErr) {
        return res.status(400).json({ error: `voice for role ${role}: ${identityErr.message}` })
      }
    }

    // Get audio for this role - optionally filter by flagged status
    let audioToRegenerate = []
    let flagRegenCounts = {}  // Map of audio_uuid -> regen_count for TTS variation

    if (flaggedOnly) {
      // Get audio marked for regeneration from audio_flags table (new simplified system)
      const { data: flags, error: flagsError } = await supabase
        .from('audio_flags')
        .select('audio_uuid, regen_count')
        .eq('course_code', courseCode)
        .eq('status', 'flagged')

      if (flagsError) throw flagsError

      const flaggedIds = [...new Set(flags?.map(f => f.audio_uuid).filter(Boolean) || [])]

      // Build map of audio_uuid -> regen_count for variation selection
      for (const f of (flags || [])) {
        if (f.audio_uuid) flagRegenCounts[f.audio_uuid] = f.regen_count || 0
      }

      if (flaggedIds.length === 0) {
        return res.json({
          status: 'no_pending',
          courseCode,
          role,
          flaggedOnly: true,
          message: `No audio pending regeneration for course`
        })
      }

      // Get audio that matches both role AND is flagged (batch to avoid header overflow)
      const BATCH_SIZE = 100
      let existingAudio = []
      for (let i = 0; i < flaggedIds.length; i += BATCH_SIZE) {
        const batch = flaggedIds.slice(i, i + BATCH_SIZE)
        let flaggedQuery = supabase
          .from('course_audio')
          .select('id, text, text_normalized, language, role, voice_id, s3_key, origin')
          .eq('course_code', courseCode)
          .eq('role', role)
          .in('id', batch)

        const { data, error: audioError } = await flaggedQuery
        if (audioError) throw audioError
        if (data) existingAudio = existingAudio.concat(data)
      }
      if (limit) existingAudio = existingAudio.slice(0, limit)
      audioToRegenerate = existingAudio
    } else {
      // Get all audio for this role
      let allQuery = supabase
        .from('course_audio')
        .select('id, text, text_normalized, language, role, voice_id, s3_key, origin')
        .eq('course_code', courseCode)
        .eq('role', role)

      if (limit) allQuery = allQuery.limit(limit)

      const { data: existingAudio, error: audioError } = await allQuery

      if (audioError) throw audioError
      audioToRegenerate = existingAudio || []
    }

    if (audioToRegenerate.length === 0) {
      return res.json({
        status: 'no_audio',
        courseCode,
        role,
        flaggedOnly,
        message: flaggedOnly
          ? `No flagged audio found for role: ${role}`
          : `No audio found for role: ${role}`
      })
    }

    // EXCLUDE pod-linked clips: Listening Pod dialogue shares role='target1'/
    // 'known' with course phrases but is voiced per-CHARACTER from
    // listening_pods.speakers (multi-voice casting). A role-wide regen with the
    // course voice would flatten the whole cast to one voice (this happened
    // 2026-06-07 — 110 pod clips steamrolled to eve). Pod audio is regenerated
    // via /generate-pods, never via role regen.
    {
      const { data: podSents, error: podErr } = await supabase
        .from('listening_pod_sentences')
        .select('target_audio_id, known_audio_id')
        .like('pod_id', `${courseCode}:%`)
      if (podErr) throw podErr
      const podAudioIds = new Set()
      for (const s of (podSents || [])) {
        if (s.target_audio_id) podAudioIds.add(s.target_audio_id)
        if (s.known_audio_id) podAudioIds.add(s.known_audio_id)
      }
      if (podAudioIds.size) {
        const before = audioToRegenerate.length
        audioToRegenerate = audioToRegenerate.filter(a => !podAudioIds.has(a.id))
        const excluded = before - audioToRegenerate.length
        if (excluded) logger.info(`[regenerate-role] excluded ${excluded} pod-linked clips (pod casting is per-character; use /generate-pods)`)
      }
    }

    // PRECIOUS-AUDIO GUARD: never TTS over human recordings. A role-wide regen
    // must leave origin='human' rows untouched (s3_key/origin/voice_id intact).
    let excludedHuman = 0
    {
      const humanRows = audioToRegenerate.filter(a => a.origin === 'human')
      if (humanRows.length) {
        audioToRegenerate = audioToRegenerate.filter(a => a.origin !== 'human')
        excludedHuman = humanRows.length
        logger.info(`[regenerate-role] excluded ${excludedHuman} human-origin clips (precious — human recordings are never regenerated by TTS)`)
        for (const h of humanRows.slice(0, 10)) {
          logger.info(`[regenerate-role]   skipped human: ${h.id} "${(h.text || '').substring(0, 40)}"`)
        }
      }
    }

    // Determine language for this role
    const language = role === 'known' || role === 'presentation' || role === 'encouragement' || role === 'instruction'
      ? course.known_lang
      : course.target_lang

    // Load pre-computed gender expansions from DB
    let genderMap = new Map()
    if ((role === 'target1' || role === 'target2') &&
        genderHaikuService.GENDERED_LANGUAGES.includes(language) &&
        !dryRun) {
      genderMap = await genderHaikuService.loadGenderMap(courseCode, supabase)
      logger.info(`Loaded ${genderMap.size} gender expansions from DB`)
    }

    if (dryRun) {
      return res.json({
        dryRun: true,
        courseCode,
        role,
        flaggedOnly,
        voiceId: voiceId || null,
        voiceConfigured: !!voiceId,
        language,
        count: audioToRegenerate.length,
        excludedHuman,
        sample: audioToRegenerate.slice(0, 5).map(a => ({
          text: a.text.substring(0, 50),
          currentVoice: a.voice_id
        })),
        message: voiceId ? null : `Configure voice for "${role}" role before regenerating`
      })
    }

    // Check voice config for actual regeneration
    if (!voiceId) {
      return res.status(400).json({
        error: `No voice configured for role: ${role}`,
        voiceConfig,
        audioCount: audioToRegenerate.length
      })
    }

    // Start progress tracking
    startWork('regenerate-role', courseCode, audioToRegenerate.length, role)

    // Use flagRegenCounts from audio_flags query (built earlier in flaggedOnly block)
    // This tracks which TTS variation to use (Azure is deterministic)
    const regenerationCounts = flaggedOnly ? flagRegenCounts : {}
    if (flaggedOnly) {
      logger.info(`Got regeneration counts for ${Object.keys(regenerationCounts).length} flagged items`)
    }

    // Process items in parallel with concurrency limit
    logger.info(`Regenerating ${audioToRegenerate.length} ${role} audio files with concurrency=${CONCURRENCY}`)

    const results = { success: 0, failed: 0, errors: [] }
    results.veracity = veracity.newStats()
    veracity.announceStatus(logger)
    // Use speed from voice config (everything is a parameter!)
    const speed = voiceSettings.settings?.speed || 1.0

    // Helper to regenerate a single audio item
    const regenerateItem = async (item) => {
      // Get regeneration attempt count for this item (Azure determinism workaround)
      const regenerationAttempt = (regenerationCounts[item.id] || 0) + 1

      // Gender expansion for target language audio
      // Pre-computed by Haiku (or regex fallback for marker-based text)
      let textForTTS = item.text
      const genderKey = `${item.text}|${language}|${role}`
      const genderResult = genderMap.get(genderKey)
      if (genderResult?.wasModified) {
        textForTTS = genderResult.expandedText
        logger.info(`Gender: "${item.text}" → "${textForTTS}" (${role})`)
      } else if ((role === 'target1' || role === 'target2') && genderService.hasGenderMarker(item.text)) {
        // Fallback: text with explicit markers like "cansado(a)" — use regex expander
        const markerResult = genderService.analyzeAndExpand(item.text, language, role)
        if (markerResult.wasModified) {
          textForTTS = markerResult.expandedText
          logger.info(`Gender (marker): "${item.text}" → "${textForTTS}" (${role})`)
        }
      }

      // Generate TTS audio using provider from voice config
      // One render+master attempt; the veracity gate may repeat it.
      const renderAndMaster = async (attempt = 1) => {
        let rawAudioBuffer, wordBoundaries
        if (voiceProvider === 'azure') {
          ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'azure', {
            subscriptionKey: process.env.AZURE_SPEECH_KEY,
            region: process.env.AZURE_SPEECH_REGION || 'westeurope',
            voiceName: voiceId,
            speed,
            // Azure is deterministic, so a re-render of the same text returns
            // the same bytes unless the attempt number varies it — which is
            // exactly what the gate needs when it rejects a clip.
            regenerationAttempt: regenerationAttempt + (attempt - 1)
          }))
        } else if (voiceProvider === 'elevenlabs') {
          ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'elevenlabs', {
            apiKey: process.env.ELEVENLABS_API_KEY,
            voiceId: voiceId,
            speed
          }))
        } else if (voiceProvider === 'xai') {
          ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'xai', {
            apiKey: process.env.XAI_API_KEY,
            voiceId: voiceId,
            language: toBcp47(language),
          }))
        } else {
          throw new Error(`Unknown TTS provider: ${voiceProvider}`)
        }

        // Master audio: normalize loudness and extract duration
        const { buffer, durationMs } = await masterAudio(rawAudioBuffer, textForTTS)
        return { buffer, durationMs, wordBoundaries }
      }

      // PRE-PUBLISH VERACITY GATE — see the same block in /generate. This path
      // overwrites a live row's s3_key, so a defective render here replaces
      // working audio with broken audio in front of learners.
      const gated = await veracity.renderChecked({
        render: renderAndMaster,
        expectedText: textForTTS,
        language,
        stats: results.veracity,
        logger,
        meta: { courseCode, role, voiceId, audio_id: item.id, originalText: item.text },
      })
      if (!gated.published) {
        throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason}, CER ${gated.verdict?.cer})`)
      }
      const { buffer: masteredBuffer, durationMs, wordBoundaries } = gated

      // Generate new UUID for S3 key (UPPERCASE to match existing S3 convention)
      const audioId = uuidv4().toUpperCase()
      const s3Key = `mastered/${audioId}.mp3`

      // Upload mastered audio to S3
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: masteredBuffer,
        ContentType: 'audio/mpeg',
        CacheControl: AUDIO_CACHE_CONTROL,
      }))

      // Update course_audio record with duration
      const { error: updateError } = await supabase
        .from('course_audio')
        .update({
          voice_id: storedVoiceId,
          origin: 'tts',
          s3_key: s3Key,
          duration_ms: durationMs,
          word_boundaries: wordBoundaries || null,
          // This path REPLACES the bytes an existing row points at, so the old
          // row's verdict — if it had one — is now about audio that no longer
          // exists. Overwriting it is not optional bookkeeping: a stale pass
          // next to fresh audio is exactly the false claim this column set was
          // added to end.
          ...veracity.verdictColumns(gated.verdict, {
            checker: 'phase8-regenerate-role',
            attempts: gated.attempts,
          })
        })
        .eq('id', item.id)

      if (updateError) throw updateError

      updateWork(item.text, true)
      logger.info(`Regenerated: ${role} - "${item.text.substring(0, 30)}..." (${durationMs}ms)`)
      return { success: true, item, audioId }
    }

    // Track successfully regenerated items for review
    const regeneratedItems = []

    // True worker pool + end-of-run retry rounds. The old slice-of-CONCURRENCY
    // + Promise.allSettled barrier paid a slowest-of-each-batch tax (renders
    // range 1.5–8s → effective concurrency ~1/3 of nominal); and failures were
    // only logged, forcing a full manual re-run to converge. Now: N workers
    // pull from a shared cursor (no barrier), failures collect and get up to
    // RETRY_ROUNDS extra passes (transient connection resets usually clear).
    const RETRY_ROUNDS = 2
    const runPool = async (queue, round) => {
      let cursor = 0
      const failures = []
      const worker = async () => {
        while (true) {
          if (currentWork.cancelled) return
          const i = cursor++
          if (i >= queue.length) return
          const item = queue[i]
          try {
            const value = await regenerateItem(item)
            results.success++
            regeneratedItems.push({
              id: value.item.id,
              audioId: value.audioId,
              text: value.item.text,
              role: value.item.role
            })
          } catch (err) {
            failures.push({ item, error: err?.message || 'Unknown error' })
            if (round === 0) {
              logger.warn(`Failed (will retry): ${role} - "${item.text.substring(0, 30)}...": ${err?.message}`)
            }
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))
      return failures
    }

    let pending = audioToRegenerate
    for (let round = 0; round <= RETRY_ROUNDS; round++) {
      if (currentWork.cancelled) {
        logger.info(`[PROGRESS] Cancelled after ${currentWork.current}/${currentWork.total} items`)
        break
      }
      if (round > 0) {
        logger.info(`Retry round ${round}/${RETRY_ROUNDS}: ${pending.length} failed items`)
        await new Promise(r => setTimeout(r, 5000 * round)) // brief breather between rounds
      }
      const failures = await runPool(pending, round)
      if (failures.length === 0) { pending = []; break }
      if (round === RETRY_ROUNDS) {
        // Final round exhausted — record what's still failing
        for (const f of failures) {
          results.failed++
          results.errors.push({
            text: f.item.text.substring(0, 50),
            error: f.error
          })
          updateWork(f.item.text, false, f.error)
          logger.error(`Failed (after ${RETRY_ROUNDS} retries): ${role} - "${f.item.text.substring(0, 30)}...": ${f.error}`)
        }
      }
      pending = failures.map(f => f.item)
    }

    // Note: Flag stays at 'flagged' - user will delete it when satisfied with the audio
    // This allows the regenerate-review-regenerate cycle until happy

    // Increment regen_count for successfully regenerated items (for next TTS variation)
    if (flaggedOnly && regeneratedItems.length > 0) {
      const regeneratedIds = regeneratedItems.map(r => r.id)
      for (const audioUuid of regeneratedIds) {
        const currentCount = flagRegenCounts[audioUuid] || 0
        await supabase
          .from('audio_flags')
          .update({ regen_count: currentCount + 1 })
          .eq('audio_uuid', audioUuid)
          .eq('course_code', courseCode)
      }
      logger.info(`Incremented regen_count for ${regeneratedIds.length} flagged items`)
    }

    // For presentation audio: bind presentation_audio_id to course_legos
    // This is the authoritative binding - the learning app uses this ID directly
    if (role === 'presentation' && regeneratedItems.length > 0) {
      logger.info(`Binding presentation_audio_id for ${regeneratedItems.length} LEGOs...`)

      // Get the lego_id for each regenerated audio (batch to avoid header overflow)
      const audioIds = regeneratedItems.map(r => r.id)
      let audioRecords = []
      for (let i = 0; i < audioIds.length; i += 100) {
        const batch = audioIds.slice(i, i + 100)
        const { data } = await supabase
          .from('course_audio')
          .select('id, lego_id')
          .in('id', batch)
        if (data) audioRecords = audioRecords.concat(data)
      }

      let boundCount = 0
      for (const audio of audioRecords || []) {
        if (!audio.lego_id) continue

        // Parse lego_id (e.g., "S0001L03") to get seed_number and lego_index
        const match = audio.lego_id.match(/S(\d+)L(\d+)/)
        if (!match) continue

        const seedNumber = parseInt(match[1], 10)
        const legoIndex = parseInt(match[2], 10)

        const { error: updateError } = await supabase
          .from('course_legos')
          .update({ presentation_audio_id: audio.id })
          .eq('course_code', courseCode)
          .eq('seed_number', seedNumber)
          .eq('lego_index', legoIndex)

        if (!updateError) boundCount++
      }

      logger.info(`Bound presentation_audio_id for ${boundCount} LEGOs`)
    }

    const wasCancelled = currentWork.cancelled
    endWork()

    // This route generates real audio (presentation/known/target1/target2),
    // but previously bumped NEITHER version column — so regenerated audio went
    // undetected by the learning app. Bump both, once, on a successful run.
    if (!wasCancelled && results.success > 0) {
      await bumpCourseVersion(supabase, courseCode, 'patch')
      // Integer revalidation key — once per run — so the app picks up the
      // regenerated audio.
      await bumpCourseRevalidation(supabase, courseCode)
    }

    // Pre-publish veracity gate counts — see the same block in /generate.
    const vLine = veracity.formatStats(results.veracity)
    if (results.veracity.quarantined > 0 || results.veracity.unchecked > 0) logger.error(`[audio-veracity] ${courseCode}: ${vLine}`)
    else logger.info(`[audio-veracity] ${courseCode}: ${vLine}`)

    res.json({
      status: wasCancelled ? 'cancelled' : 'completed',
      courseCode,
      role,
      voiceId,
      total: audioToRegenerate.length,
      success: results.success,
      failed: results.failed,
      cancelled: wasCancelled,
      veracity: results.veracity,
      excludedHuman,
      errors: results.errors.slice(0, 10),
      regeneratedItems: regeneratedItems.slice(0, 50) // Return up to 50 for review
    })

  } catch (error) {
    logger.error('Regenerate role error:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// POST INSERT - Insert audio record (after TTS or recording)
// =============================================================================

app.post('/insert', async (req, res) => {
  try {
    const {
      courseCode,
      text,
      language,
      role,
      voiceId,
      origin,
      s3Key,
      durationMs
    } = req.body

    if (!courseCode || !text || !language || !role || !voiceId || !origin || !s3Key) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Canonical identity columns. toIso3() used to do the language half and
    // failed OPEN — it returns anything it does not recognise lowercased, so
    // 'pt-BR' became 'pt-br' and 'auto' stayed 'auto'. canonicalLanguage throws
    // instead, and the catch below turns that into a 400 rather than a row
    // nothing can find. Nothing normalised voice_id at all.
    let normalizedLanguage, normalizedVoiceId
    try {
      normalizedLanguage = canonicalLanguage(language)
      normalizedVoiceId = canonicalClipVoiceId(voiceId)
    } catch (identityErr) {
      return res.status(400).json({ error: identityErr.message })
    }

    // PRECIOUS-AUDIO GUARD: a non-human insert must never overwrite a human
    // recording occupying the same conflict key. Return the existing human row
    // instead (the audio for this key already exists — and it is precious).
    if (origin !== 'human') {
      const guardedHuman = await humanRowAtAudioKey(
        courseCode, normalizeForAudio(text), normalizedLanguage, role, normalizedVoiceId
      )
      if (guardedHuman) {
        logger.info(`[PreciousAudio] /insert SKIP: human recording ${guardedHuman.id} holds key for "${text.substring(0, 40)}" (${role}) — returning existing row`)
        return res.json({ success: true, audio: guardedHuman, skipped_human: true })
      }
    }

    const { data, error } = await supabase
      .from('course_audio')
      .upsert({
        course_code: courseCode,
        text,
        text_normalized: normalizeForAudio(text),
        language: normalizedLanguage,
        role,
        voice_id: normalizedVoiceId,
        origin,
        s3_key: s3Key,
        duration_ms: durationMs
      }, {
        onConflict: 'course_code,text_normalized,language,role,voice_id'
      })
      .select()
      .single()

    if (error) throw error

    res.json({ success: true, audio: data })
  } catch (error) {
    logger.error('Insert error:', error)
    res.status(500).json({ error: error.message })
  }
})
// =============================================================================
// POST REGENERATE-PRESENTATIONS - Regenerate presentation text for a course
// =============================================================================

// =========================================================================
// SCOPED, ADDITION-ONLY presentation prep — the incremental/surgical alternative
// to /regenerate-presentations (which is course-wide + delete-on-change).
// Prepares ONLY the missing presentations for the given seeds, INSERT-only
// (never deletes / never rewrites existing), and HONORS introduce:false
// (skips silent particle components — e.g. 才). Safe on a live course.
// POST /prepare-presentations-scoped/:courseCode { seeds:[80], dryRun:true }
// =========================================================================
app.post('/prepare-presentations-scoped/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { seeds, dryRun = true } = req.body
    const scopeSeeds = Array.isArray(seeds) && seeds.length
      ? seeds.map(n => parseInt(n, 10)).filter(n => !isNaN(n)) : null
    if (!scopeSeeds) {
      return res.status(400).json({ error: 'seeds (non-empty array) is required — this endpoint is intentionally scoped' })
    }

    const { data: course } = await supabase.from('courses').select('*').eq('course_code', courseCode).single()
    if (!course) return res.status(404).json({ error: 'Course not found' })

    const knownLang = canonicalLanguage(course.known_lang)
    const targetLangName = getLocalisedLangName(course.target_lang, knownLang)
    const template = await getOrCreatePresentationTemplate(knownLang)
    // Short form (no "as in" context) — same stripping the course-wide endpoint uses.
    const shortTemplate = template
      .replace(/, as in — '\{seed\}',/g, ',')
      .replace(/, as in '\{seed\}'/g, '')
      .replace(/ as in — '\{seed\}' —/g, ' ')
      .replace(/\{seed\}/g, '')
    const voiceConfig = course.voice_config || {}
    // Match the generator's voice_id format exactly (provider_voiceId), else the
    // pending row's voice_id won't reconcile with the generated row → duplicate.
    const presVoice = voiceConfig.voices?.presentation
    const presentationVoiceId = canonicalClipVoiceId(
      presVoice?.voiceId || voiceConfig.presentation || 'azure_en-GB-SoniaNeural',
      presVoice?.voiceId ? presVoice?.provider : undefined)

    // Existing presentation rows — so we ONLY add what's genuinely missing.
    const { data: existingPres } = await supabase.from('course_audio')
      .select('lego_id, text_normalized').eq('course_code', courseCode).eq('role', 'presentation')
    const existingLegoIds = new Set((existingPres || []).map(p => p.lego_id).filter(Boolean))
    const existingTextNorms = new Set((existingPres || []).map(p => p.text_normalized))

    const toInsert = []

    // 1) LEGO presentations: is_new LEGOs in scope, lacking a presentation.
    const { data: legos } = await supabase.from('course_legos')
      .select('lego_id, known_text, presentation_audio_id')
      .eq('course_code', courseCode).eq('is_new', true).in('seed_number', scopeSeeds)
    for (const l of (legos || [])) {
      if (l.presentation_audio_id || existingLegoIds.has(l.lego_id)) continue
      const text = shortTemplate.replace('{target_lang_name}', targetLangName).replace('{known}', l.known_text)
      toInsert.push({ kind: 'lego', lego_id: l.lego_id, known: l.known_text, text })
    }

    // 2) Component presentations: introduce:true components in scope, with a parent
    //    M-LEGO, lacking a presentation. introduce:false (particles) are SKIPPED.
    const { data: comps } = await supabase.from('course_practice_phrases')
      .select('id, seed_number, lego_index, known_text, introduce, presentation_audio_id')
      .eq('course_code', courseCode).eq('phrase_role', 'component').in('seed_number', scopeSeeds)
    const parentMap = new Map()
    if (comps && comps.length) {
      const { data: parents } = await supabase.from('course_legos')
        .select('seed_number, lego_index, known_text')
        .eq('course_code', courseCode).eq('type', 'M').in('seed_number', scopeSeeds)
      for (const p of (parents || [])) parentMap.set(`${p.seed_number}:${p.lego_index}`, p)
    }
    for (const c of (comps || [])) {
      if (c.introduce === false) continue            // METHODOLOGY: never introduce a silent particle
      if (c.presentation_audio_id) continue
      const parent = parentMap.get(`${c.seed_number}:${c.lego_index}`)
      if (!parent) continue
      const text = template.replace('{target_lang_name}', targetLangName)
        .replace('{known}', c.known_text).replace('{seed}', parent.known_text)
      if (existingTextNorms.has(normalizeForAudio(text))) continue
      toInsert.push({ kind: 'component', phrase_id: c.id, known: c.known_text, text })
    }

    if (dryRun) {
      return res.json({ success: true, dryRun: true, courseCode, seeds: scopeSeeds, wouldInsert: toInsert.length, items: toInsert })
    }

    // INSERT-only (ignoreDuplicates). Never deletes, never rewrites existing.
    const rows = toInsert.map(it => ({
      course_code: courseCode, text: it.text, text_normalized: normalizeForAudio(it.text),
      language: knownLang, role: 'presentation', voice_id: presentationVoiceId, origin: 'tts',
      s3_key: `pending/${uuidv4().toUpperCase()}.mp3`, lego_id: it.kind === 'lego' ? it.lego_id : null
    }))
    let inserted = 0
    if (rows.length) {
      const { error } = await supabase.from('course_audio')
        .upsert(rows, { onConflict: 'course_code,text_normalized,language,role,voice_id', ignoreDuplicates: true })
      if (error) return res.status(500).json({ error: error.message })
      inserted = rows.length
    }
    logger.info(`prepare-presentations-scoped(${courseCode}, seeds=${scopeSeeds}): inserted ${inserted} pending presentations`)
    res.json({ success: true, courseCode, seeds: scopeSeeds, inserted, items: toInsert })
  } catch (err) {
    logger.error('/prepare-presentations-scoped error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/regenerate-presentations/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    if (isHumanVoiceCourse(courseCode)) {
      logger.info(`[/regenerate-presentations] SKIP ${courseCode}: human-voice-only course — no TTS (Tom's ruling 2026-07-25)`)
      return res.json({ skipped: true, reason: 'human-voice-only-course', courseCode })
    }
    const { dryRun = true, regenerateAudio = false, regenerateAll = false } = req.body

    logger.info(`Regenerating presentations for ${courseCode} (dryRun=${dryRun}, regenerateAll=${regenerateAll})`)

    // Get course info
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('course_code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const knownLang = canonicalLanguage(course.known_lang)
    const targetLang = canonicalLanguage(course.target_lang)
    const targetLangName = getLocalisedLangName(targetLang, knownLang)

    // Get template for this known language
    const template = await getOrCreatePresentationTemplate(knownLang)
    logger.info(`Using template: ${template}`)

    // Get LEGOs where is_new=true (only new introductions need presentation audio)
    const PAGE_SIZE = 1000
    let allLegos = []
    let legosOffset = 0
    let hasMoreLegos = true

    while (hasMoreLegos) {
      const { data: legosBatch, error: legosError } = await supabase
        .from('course_legos')
        .select('lego_id, known_text, target_text, seed_number')
        .eq('course_code', courseCode)
        .eq('is_new', true)
        .range(legosOffset, legosOffset + PAGE_SIZE - 1)

      if (legosError) throw legosError

      if (legosBatch && legosBatch.length > 0) {
        allLegos.push(...legosBatch)
        hasMoreLegos = legosBatch.length === PAGE_SIZE
        legosOffset += PAGE_SIZE
      } else {
        hasMoreLegos = false
      }
    }

    // If not regenerateAll, filter out LEGOs that already have presentation audio
    let legos = allLegos
    if (!regenerateAll && allLegos.length > 0) {
      const existingPresIds = new Set()
      for (let i = 0; i < allLegos.length; i += PAGE_SIZE) {
        const batch = allLegos.slice(i, i + PAGE_SIZE).map(l => l.lego_id)
        const { data: existing } = await supabase
          .from('course_audio')
          .select('lego_id')
          .eq('course_code', courseCode)
          .eq('role', 'presentation')
          .in('lego_id', batch)
        if (existing) {
          for (const rec of existing) existingPresIds.add(rec.lego_id)
        }
      }
      legos = allLegos.filter(l => !existingPresIds.has(l.lego_id))
      logger.info(`Filtered to ${legos.length} LEGOs missing presentation audio (${existingPresIds.size} already have it)`)
    }

    if (legos.length === 0) {
      return res.json({
        success: true,
        message: 'No LEGOs found for this course',
        count: 0
      })
    }

    // Get all seed sentences for context (paginated in batches of seed numbers)
    const seedNumbers = [...new Set(legos.map(l => l.seed_number).filter(Boolean))]

    let seedMap = {}
    if (seedNumbers.length > 0) {
      // Query seeds in batches to avoid "too many parameters" error
      const SEED_BATCH_SIZE = 500
      for (let i = 0; i < seedNumbers.length; i += SEED_BATCH_SIZE) {
        const seedNumberBatch = seedNumbers.slice(i, i + SEED_BATCH_SIZE)
        const { data: seeds, error: seedsError } = await supabase
          .from('course_seeds')
          .select('seed_number, known_text')
          .eq('course_code', courseCode)
          .in('seed_number', seedNumberBatch)

        if (!seedsError && seeds) {
          for (const s of seeds) {
            seedMap[s.seed_number] = s.known_text
          }
        }
      }
    }

    // Generate presentation text for each LEGO
    // Short template (no "as in" context) for alternating in early seeds
    const shortTemplate = template
      .replace(/, as in — '\{seed\}',/g, ',')
      .replace(/ as in — '\{seed\}' —| como en — '\{seed\}' —| comme dans — '\{seed\}' —| wie in — '\{seed\}' —| como em — '\{seed\}' —| come in — '\{seed\}' —| fel yn — '\{seed\}' —| — 「\{seed\}」のように —| — '\{seed\}'처럼 —| كما في — '\{seed\}' —| kaip — '\{seed\}' —| 如「\{seed\}」—|, as in '\{seed\}'|，如"\{seed\}"|, fel yn '\{seed\}'|, como en '\{seed\}'/g, '')

    // Load USE phrases for context fallback when seed sentence doesn't contain the known_text
    // Group by seed_number + lego_index for efficient lookup
    const usePhraseMap = {}  // "seed_number:lego_index" -> [known_text, ...]
    let usePhraseOffset = 0
    let hasMoreUsePhrases = true
    while (hasMoreUsePhrases) {
      const { data: useBatch, error: useError } = await supabase
        .from('course_practice_phrases')
        .select('seed_number, lego_index, known_text')
        .eq('course_code', courseCode)
        .eq('phrase_role', 'use')
        .order('id')
        .range(usePhraseOffset, usePhraseOffset + PAGE_SIZE - 1)

      if (useError) { logger.warn('Failed to fetch USE phrases:', useError.message); break }
      if (useBatch && useBatch.length > 0) {
        for (const p of useBatch) {
          const key = `${p.seed_number}:${p.lego_index}`
          if (!usePhraseMap[key]) usePhraseMap[key] = []
          usePhraseMap[key].push(p.known_text)
        }
        hasMoreUsePhrases = useBatch.length === PAGE_SIZE
        usePhraseOffset += PAGE_SIZE
      } else {
        hasMoreUsePhrases = false
      }
    }

    // Deterministic hash for weighted random context selection
    // Returns a float 0..1 based on the lego_id string
    function deterministicRand(legoId) {
      let h = 0
      for (let i = 0; i < legoId.length; i++) {
        h = ((h << 5) - h + legoId.charCodeAt(i)) | 0
      }
      return (((h >>> 0) % 10000) / 10000)
    }

    const presentations = []
    let contextFromSeed = 0, contextFromUse = 0, contextNone = 0
    for (const lego of legos) {
      const seedText = seedMap[lego.seed_number] || lego.known_text

      // Parse lego_id to get lego_index (e.g., "S0001L03" → 3)
      const legoIndexMatch = lego.lego_id.match(/L(\d+)$/)
      const legoIndex = legoIndexMatch ? parseInt(legoIndexMatch[1], 10) : 1

      const knownLower = lego.known_text.toLowerCase()
      // For compound known_text like "to listen / to hear", also try each part
      const knownVariants = [knownLower]
      if (knownLower.includes(' / ')) {
        knownVariants.push(...knownLower.split(' / ').map(s => s.trim()))
      }
      const textContainsKnown = (text) => {
        const t = text.toLowerCase()
        return knownVariants.some(v => t.includes(v))
      }

      // Build candidate pool: seed sentence + any USE phrases containing the known_text
      const key = `${lego.seed_number}:${legoIndex}`
      const usePhrases = (usePhraseMap[key] || []).filter(p => textContainsKnown(p))
      const seedValid = textContainsKnown(seedText)

      // Weighted random pick: ~60% USE phrase, ~25% seed, ~15% no context
      // If no USE phrases available, redistribute: ~70% seed, ~30% no context
      const roll = deterministicRand(lego.lego_id)
      let contextText = null
      let contextSource = 'none'

      if (usePhrases.length > 0 && seedValid) {
        // Full pool available
        if (roll < 0.60) {
          // Pick a USE phrase deterministically
          const useIdx = Math.floor(deterministicRand(lego.lego_id + ':use') * usePhrases.length)
          contextText = usePhrases[useIdx]
          contextSource = 'use_phrase'
          contextFromUse++
        } else if (roll < 0.85) {
          contextText = seedText
          contextSource = 'seed'
          contextFromSeed++
        } else {
          contextNone++
        }
      } else if (usePhrases.length > 0) {
        // Only USE phrases (seed doesn't contain known_text)
        if (roll < 0.80) {
          const useIdx = Math.floor(deterministicRand(lego.lego_id + ':use') * usePhrases.length)
          contextText = usePhrases[useIdx]
          contextSource = 'use_phrase'
          contextFromUse++
        } else {
          contextNone++
        }
      } else if (seedValid) {
        // Only seed available
        if (roll < 0.70) {
          contextText = seedText
          contextSource = 'seed'
          contextFromSeed++
        } else {
          contextNone++
        }
      } else {
        // Nothing contains the known_text — no context possible
        contextNone++
      }

      // Skip context if the known text overlaps too much with it (redundant/verbose)
      // e.g. known="I'm happy with how much I've done" context="I'm happy with how much I've done in a short time."
      if (contextText && lego.known_text.length > 0) {
        const overlapRatio = lego.known_text.length / contextText.length
        if (overlapRatio > 0.5) {
          contextText = null
          contextSource = 'none_overlap'
          contextNone++
        }
      }

      const finalTemplate = contextText ? template : shortTemplate

      // For slash-compound known_text like "to listen / to hear", use first option only
      const knownForPresentation = lego.known_text.includes(' / ')
        ? lego.known_text.split(' / ')[0].trim()
        : lego.known_text

      // Fill in template
      let presText = finalTemplate
        .replace('{target_lang_name}', targetLangName)
        .replace('{known}', knownForPresentation)
        .replace('{seed}', contextText || '')

      presentations.push({
        lego_id: lego.lego_id,
        known: lego.known_text,
        target: lego.target_text,
        seed: contextText || '',
        seed_number: lego.seed_number,
        lego_index: legoIndex,
        uses_short_template: !contextText,
        context_source: contextSource,
        presentation_text: presText
      })
    }

    logger.info(`Context sources: ${contextFromSeed} seed, ${contextFromUse} USE phrase, ${contextNone} no context`)

    const contextStats = {
      fromSeed: contextFromSeed,
      fromUsePhrase: contextFromUse,
      noContext: contextNone,
      fullForm: presentations.filter(p => !p.uses_short_template).length,
      shortForm: presentations.filter(p => p.uses_short_template).length
    }

    // =========================================================================
    // COMPONENT PRESENTATIONS - Generate presentation text for M-LEGO components
    // =========================================================================
    const componentPresentations = []

    // Load all component phrases for this course
    const compPhrases = []
    let compOffset = 0
    let hasMoreComps = true
    while (hasMoreComps) {
      const { data: compBatch, error: compError } = await supabase
        .from('course_practice_phrases')
        .select('id, seed_number, lego_index, known_text, target_text')
        .eq('course_code', courseCode)
        .eq('phrase_role', 'component')
        .order('id')
        .range(compOffset, compOffset + PAGE_SIZE - 1)

      if (compError) { logger.warn('Failed to fetch component phrases:', compError.message); break }
      if (compBatch && compBatch.length > 0) {
        compPhrases.push(...compBatch)
        hasMoreComps = compBatch.length === PAGE_SIZE
        compOffset += PAGE_SIZE
      } else {
        hasMoreComps = false
      }
    }

    if (compPhrases.length > 0) {
      // Load parent M-LEGOs for "as in" context
      const compSeedNumbers = [...new Set(compPhrases.map(c => c.seed_number))]
      const parentLegoMap = new Map()

      const COMP_SEED_BATCH = 500
      for (let i = 0; i < compSeedNumbers.length; i += COMP_SEED_BATCH) {
        const seedBatch = compSeedNumbers.slice(i, i + COMP_SEED_BATCH)
        const { data: parentLegos } = await supabase
          .from('course_legos')
          .select('seed_number, lego_index, known_text, target_text')
          .eq('course_code', courseCode)
          .eq('type', 'M')
          .in('seed_number', seedBatch)

        for (const l of (parentLegos || [])) {
          parentLegoMap.set(`${l.seed_number}:${l.lego_index}`, l)
        }
      }

      // Generate presentation text for each component
      for (const comp of compPhrases) {
        const parent = parentLegoMap.get(`${comp.seed_number}:${comp.lego_index}`)
        if (!parent) continue  // Skip components without a parent M-LEGO

        const presText = template
          .replace('{target_lang_name}', targetLangName)
          .replace('{known}', comp.known_text)
          .replace('{seed}', parent.known_text)

        componentPresentations.push({
          phrase_id: comp.id,
          known: comp.known_text,
          target: comp.target_text,
          parent_known: parent.known_text,
          seed_number: comp.seed_number,
          lego_index: comp.lego_index,
          presentation_text: presText
        })
      }

      logger.info(`Generated ${componentPresentations.length} component presentations (from ${compPhrases.length} component phrases)`)
    } else {
      logger.info('No component phrases found for this course')
    }

    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        courseCode,
        template,
        shortTemplate,
        targetLangName,
        count: presentations.length,
        componentCount: componentPresentations.length,
        contextStats,
        sample: presentations.slice(0, 10),  // Show first 10 LEGO presentations
        componentSample: componentPresentations.slice(0, 5)  // Show first 5 component presentations
      })
    }

    // Bulk upsert presentation text to course_audio
    const voiceConfig = course.voice_config || {}
    const presVoice = voiceConfig.voices?.presentation
    const presentationVoiceId = canonicalClipVoiceId(
      presVoice?.voiceId || voiceConfig.presentation || 'azure_en-GB-SoniaNeural',
      presVoice?.voiceId ? presVoice?.provider : undefined)

    const BATCH_SIZE = 200
    const legoIdList = presentations.map(p => p.lego_id)

    // Fetch existing presentation audio to detect text changes
    // (If text changed, we must delete the old record so the new one isn't a duplicate)
    const existingByLegoId = new Map()
    for (let i = 0; i < legoIdList.length; i += BATCH_SIZE) {
      const batch = legoIdList.slice(i, i + BATCH_SIZE)
      const { data: existing } = await supabase
        .from('course_audio')
        .select('id, lego_id, text_normalized, s3_key, origin')
        .eq('course_code', courseCode)
        .eq('role', 'presentation')
        .in('lego_id', batch)
      if (existing) {
        for (const rec of existing) existingByLegoId.set(rec.lego_id, rec)
      }
    }

    // Delete records where text changed (otherwise upsert creates duplicates)
    // PRECIOUS-AUDIO GUARD: human-origin presentations (e.g. the relinked Welsh
    // human intros) are NEVER deleted or replaced — even when the template text
    // differs, the human recording stays the presentation for that lego.
    const idsToDelete = []
    const unchangedLegoIds = new Set()
    let humanPreserved = 0
    for (const pres of presentations) {
      const existing = existingByLegoId.get(pres.lego_id)
      if (!existing) continue
      const newNorm = normalizeForAudio(pres.presentation_text)
      if (existing.origin === 'human') {
        unchangedLegoIds.add(pres.lego_id)  // human → keep, never delete/re-insert
        if (existing.text_normalized !== newNorm) humanPreserved++
      } else if (existing.text_normalized === newNorm) {
        unchangedLegoIds.add(pres.lego_id)  // text same → keep existing record
      } else {
        idsToDelete.push(existing.id)  // text changed → delete old, insert new
      }
    }
    if (humanPreserved > 0) {
      logger.info(`[PreciousAudio] preserved ${humanPreserved} human-origin presentations whose template text changed (human recordings are never deleted)`)
    }

    if (idsToDelete.length > 0) {
      // Collect lego_ids of records being deleted
      const deletedLegoIds = []
      for (const pres of presentations) {
        const existing = existingByLegoId.get(pres.lego_id)
        if (existing && idsToDelete.includes(existing.id)) {
          deletedLegoIds.push(pres.lego_id)
        }
      }
      for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
        const batch = idsToDelete.slice(i, i + BATCH_SIZE)
        await supabase.from('course_audio').delete().in('id', batch)
      }
      // Clear presentation_audio_id so plan/generate picks up the new pending records
      for (const legoId of deletedLegoIds) {
        const m = legoId.match(/S(\d+)L(\d+)/)
        if (!m) continue
        await supabase.from('course_legos')
          .update({ presentation_audio_id: null })
          .eq('course_code', courseCode)
          .eq('seed_number', parseInt(m[1], 10))
          .eq('lego_index', parseInt(m[2], 10))
      }
      logger.info(`Deleted ${idsToDelete.length} stale presentation records, cleared ${deletedLegoIds.length} presentation_audio_id links`)
    }
    logger.info(`Keeping ${unchangedLegoIds.size} unchanged presentation records`)

    // Clean up orphan presentation records with null lego_id (legacy records from before lego_id was set)
    // These can't be matched by the lego_id lookup above, so we delete any that don't match a current text
    const allNewTextsNorm = new Set(presentations.map(p => normalizeForAudio(p.presentation_text)))
    // Also include component presentation texts so we don't accidentally delete those
    const allCompTextsNorm = new Set(componentPresentations.map(cp => normalizeForAudio(cp.presentation_text)))

    let orphanIds = []
    let orphanOffset = 0
    while (true) {
      const { data: orphanBatch } = await supabase
        .from('course_audio')
        .select('id, text_normalized, origin')
        .eq('course_code', courseCode)
        .eq('role', 'presentation')
        .is('lego_id', null)
        .range(orphanOffset, orphanOffset + 999)
      if (!orphanBatch || orphanBatch.length === 0) break
      for (const rec of orphanBatch) {
        // PRECIOUS-AUDIO GUARD: never delete human recordings, even as "orphans"
        if (rec.origin === 'human') {
          logger.info(`[PreciousAudio] keeping human-origin orphan presentation ${rec.id} (human recordings are never deleted)`)
          continue
        }
        if (!allNewTextsNorm.has(rec.text_normalized) && !allCompTextsNorm.has(rec.text_normalized)) {
          orphanIds.push(rec.id)
        }
      }
      if (orphanBatch.length < 1000) break
      orphanOffset += 1000
    }

    if (orphanIds.length > 0) {
      for (let i = 0; i < orphanIds.length; i += BATCH_SIZE) {
        const batch = orphanIds.slice(i, i + BATCH_SIZE)
        await supabase.from('course_audio').delete().in('id', batch)
      }
      logger.info(`Deleted ${orphanIds.length} orphan presentation records (null lego_id, text no longer matches)`)
    }

    // Build records for bulk upsert (skip unchanged — their records already exist)
    const audioRecords = presentations
      .filter(pres => !unchangedLegoIds.has(pres.lego_id))
      .map(pres => ({
        course_code: courseCode,
        text: pres.presentation_text,
        text_normalized: normalizeForAudio(pres.presentation_text),
        language: knownLang,
        role: 'presentation',
        voice_id: presentationVoiceId,
        origin: 'tts',
        s3_key: `pending/${uuidv4().toUpperCase()}.mp3`,
        lego_id: pres.lego_id  // Store directly - no regex parsing needed later
      }))

    // Bulk upsert - ignore conflicts (existing records stay as-is)
    const { error: audioError } = await supabase
      .from('course_audio')
      .upsert(audioRecords, {
        onConflict: 'course_code,text_normalized,language,role,voice_id',
        ignoreDuplicates: true
      })

    if (audioError) {
      logger.error('Bulk audio upsert error:', audioError)
      return res.status(500).json({ error: audioError.message })
    }

    logger.info(`Upserted ${audioRecords.length} presentation texts`)

    // Populate course_legos.presentation_audio_id using lego_id (reliable, no query size limits)
    // Only link non-pending audio (pending = text placeholder, no actual audio yet)
    let allPresAudio = []
    for (let i = 0; i < legoIdList.length; i += BATCH_SIZE) {
      const batch = legoIdList.slice(i, i + BATCH_SIZE)
      const { data: batchData, error: batchError } = await supabase
        .from('course_audio')
        .select('id, lego_id, s3_key')
        .eq('course_code', courseCode)
        .eq('role', 'presentation')
        .in('lego_id', batch)

      if (batchError) {
        logger.warn(`Batch query error at offset ${i}:`, batchError.message)
      } else if (batchData) {
        // Filter pending/ s3_keys client-side
        allPresAudio = allPresAudio.concat(batchData.filter(a => !a.s3_key || !a.s3_key.startsWith('pending/')))
      }
    }

    // For LEGOs that share identical presentation text (e.g. two LEGOs both meaning "so"),
    // the upsert with ignoreDuplicates skips the second record. Find these and link them
    // to the existing audio record by text match.
    const linkedLegoIds = new Set(allPresAudio.map(a => a.lego_id))
    const unlinkedPres = presentations.filter(p => !linkedLegoIds.has(p.lego_id) && !unchangedLegoIds.has(p.lego_id))
    if (unlinkedPres.length > 0) {
      logger.info(`${unlinkedPres.length} LEGOs have duplicate presentation text — linking to shared audio records`)
      const normToPresMap = new Map()
      for (const p of unlinkedPres) {
        normToPresMap.set(normalizeForAudio(p.presentation_text), p)
      }
      const norms = [...normToPresMap.keys()]
      for (let i = 0; i < norms.length; i += BATCH_SIZE) {
        const batch = norms.slice(i, i + BATCH_SIZE)
        const { data: matchedAudio } = await supabase
          .from('course_audio')
          .select('id, text_normalized, s3_key')
          .eq('course_code', courseCode)
          .eq('role', 'presentation')
          .in('text_normalized', batch)
        if (matchedAudio) {
          for (const audio of matchedAudio) {
            if (audio.s3_key && !audio.s3_key.startsWith('pending/')) {
              // Find all unlinked LEGOs with this text
              for (const p of unlinkedPres) {
                if (normalizeForAudio(p.presentation_text) === audio.text_normalized) {
                  allPresAudio.push({ id: audio.id, lego_id: p.lego_id, s3_key: audio.s3_key })
                }
              }
            }
          }
        }
      }
    }

    if (allPresAudio.length > 0) {
      // Build lego_id -> course_audio.id map
      const legoToAudioId = new Map()
      for (const audio of allPresAudio) {
        legoToAudioId.set(audio.lego_id, audio.id)
      }

      // Update course_legos.presentation_audio_id
      let legoUpdates = 0
      for (const pres of presentations) {
        const audioId = legoToAudioId.get(pres.lego_id)
        if (!audioId) continue

        const legoMatch = pres.lego_id.match(/S(\d+)L(\d+)/)
        if (!legoMatch) continue

        const seedNumber = parseInt(legoMatch[1], 10)
        const legoIndex = parseInt(legoMatch[2], 10)

        const { error: updateError } = await supabase
          .from('course_legos')
          .update({ presentation_audio_id: audioId })
          .eq('course_code', courseCode)
          .eq('seed_number', seedNumber)
          .eq('lego_index', legoIndex)

        if (!updateError) legoUpdates++
      }
      logger.info(`Updated ${legoUpdates} course_legos.presentation_audio_id records`)

      // Also populate lego_introductions for legacy compat
      const introRecords = presentations
        .filter(p => legoToAudioId.has(p.lego_id))
        .map(p => ({
          course_code: courseCode,
          lego_id: p.lego_id,
          presentation_audio_id: legoToAudioId.get(p.lego_id),
          audio_uuid: legoToAudioId.get(p.lego_id)
        }))

      if (introRecords.length > 0) {
        const { error: introError } = await supabase
          .from('lego_introductions')
          .upsert(introRecords, {
            onConflict: 'course_code,lego_id',
            ignoreDuplicates: false
          })
        if (introError) {
          logger.warn('Could not upsert lego_introductions:', introError.message)
        } else {
          logger.info(`Populated ${introRecords.length} lego_introductions records`)
        }
      }
    } else {
      logger.warn('No presentation audio found to link after upsert')
    }

    // =========================================================================
    // COMPONENT PRESENTATION UPSERT
    // =========================================================================
    let compNewRecords = 0
    let compTextChanged = 0
    let compTextUnchanged = 0

    if (componentPresentations.length > 0) {
      // Fetch existing component presentation audio by text match
      const compPhraseIds = componentPresentations.map(cp => cp.phrase_id)
      const existingByPhraseId = new Map()

      // Component presentations don't have lego_id — match by text_normalized + role
      const compTextsNorm = componentPresentations.map(cp => normalizeForAudio(cp.presentation_text))
      const uniqueCompTexts = [...new Set(compTextsNorm)]

      for (let i = 0; i < uniqueCompTexts.length; i += BATCH_SIZE) {
        const batch = uniqueCompTexts.slice(i, i + BATCH_SIZE)
        const { data: existing } = await supabase
          .from('course_audio')
          .select('id, text_normalized, s3_key')
          .eq('course_code', courseCode)
          .eq('role', 'presentation')
          .in('text_normalized', batch)

        if (existing) {
          for (const rec of existing) existingByPhraseId.set(rec.text_normalized, rec)
        }
      }

      // Build upsert records for component presentations
      const compUnchangedTexts = new Set()
      const compIdsToDelete = []

      for (const cp of componentPresentations) {
        const norm = normalizeForAudio(cp.presentation_text)
        const existing = existingByPhraseId.get(norm)
        if (existing) {
          // Text already exists — mark as unchanged
          compUnchangedTexts.add(norm)
          compTextUnchanged++
        }
      }

      // Build new records (skip ones that already exist with same text)
      const compAudioRecords = componentPresentations
        .filter(cp => !compUnchangedTexts.has(normalizeForAudio(cp.presentation_text)))
        .map(cp => ({
          course_code: courseCode,
          text: cp.presentation_text,
          text_normalized: normalizeForAudio(cp.presentation_text),
          language: knownLang,
          role: 'presentation',
          voice_id: presentationVoiceId,
          origin: 'tts',
          s3_key: `pending/${uuidv4().toUpperCase()}.mp3`
        }))

      compNewRecords = compAudioRecords.length

      if (compAudioRecords.length > 0) {
        const { error: compAudioError } = await supabase
          .from('course_audio')
          .upsert(compAudioRecords, {
            onConflict: 'course_code,text_normalized,language,role,voice_id',
            ignoreDuplicates: true
          })

        if (compAudioError) {
          logger.error('Component presentation upsert error:', compAudioError)
        } else {
          logger.info(`Upserted ${compAudioRecords.length} component presentation texts`)
        }
      }

      // Link component presentation_audio_id on course_practice_phrases
      // Fetch all presentation audio for this course that match component texts
      const compPresAudioMap = new Map() // text_normalized -> course_audio.id
      // Use small batches — long presentation texts can exceed PostgREST URL limits with .in()
      const COMP_BATCH = 50
      for (let i = 0; i < uniqueCompTexts.length; i += COMP_BATCH) {
        const batch = uniqueCompTexts.slice(i, i + COMP_BATCH)
        const { data: presAudio, error: presErr } = await supabase
          .from('course_audio')
          .select('id, text_normalized, s3_key')
          .eq('course_code', courseCode)
          .eq('role', 'presentation')
          .eq('language', knownLang)
          .in('text_normalized', batch)

        if (presErr) {
          logger.error(`Component pres audio lookup error (batch ${i}): ${presErr.message}`)
          continue
        }

        for (const a of (presAudio || [])) {
          if (!a.s3_key || !a.s3_key.startsWith('pending/')) {
            compPresAudioMap.set(a.text_normalized, a.id)
          }
        }
      }

      // Update presentation_audio_id on matching component phrases
      logger.info(`Component linking: ${compPresAudioMap.size} mastered audio entries, ${componentPresentations.length} components to link`)
      let compLinked = 0
      for (const cp of componentPresentations) {
        const norm = normalizeForAudio(cp.presentation_text)
        const audioId = compPresAudioMap.get(norm)
        if (!audioId) continue

        const { error: linkError } = await supabase
          .from('course_practice_phrases')
          .update({ presentation_audio_id: audioId })
          .eq('id', cp.phrase_id)

        if (!linkError) compLinked++
      }
      if (compLinked > 0) {
        logger.info(`Linked ${compLinked} component presentation_audio_id records`)
      }
    }

    // Bust production-api stats cache so dashboard refreshes
    try {
      await fetch(`http://localhost:3470/api/production/${courseCode}/audio-stats?fresh=1`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
    } catch (e) { /* production-api may not be running */ }

    await bumpCourseVersion(supabase, courseCode, 'patch')
    // Integer revalidation key — once per run. Presentation text changed here,
    // which the round-map/decomposition care about; bump so the app revalidates.
    await bumpCourseRevalidation(supabase, courseCode)

    res.json({
      success: true,
      dryRun: false,
      courseCode,
      template,
      targetLangName,
      total: presentations.length,
      componentTotal: componentPresentations.length,
      textChanged: idsToDelete.length,
      textUnchanged: unchangedLegoIds.size,
      humanPreserved,
      newRecords: audioRecords.length,
      componentNewRecords: compNewRecords,
      componentUnchanged: compTextUnchanged,
      contextStats,
      message: `${presentations.length} LEGO presentations processed (${idsToDelete.length} text changed, ${unchangedLegoIds.size} unchanged, ${presentations.length - idsToDelete.length - unchangedLegoIds.size} new). ${componentPresentations.length} component presentations processed (${compNewRecords} new, ${compTextUnchanged} unchanged). Run regenerate-role with role=presentation to generate audio.`
    })

    emitProgress(supabase, courseCode, `Presentation text regenerated: ${presentations.length} LEGOs, ${componentPresentations.length} components — ready for audio generation`, { phase: 'audio', action: 'regenerate-presentations', legos: presentations.length, components: componentPresentations.length })

  } catch (error) {
    logger.error('Regenerate presentations error:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// POST LINK-AUDIO-IDS - Link audio IDs directly to phrases/legos/seeds
// =============================================================================
// After audio generation, this populates the *_audio_id columns for direct joins
// This eliminates text-matching fragility in the cycle views
// =============================================================================

app.post('/link-audio-ids/:courseCode', async (req, res) => {
  const { courseCode } = req.params
  const { dryRun = false } = req.body

  logger.info(`Link audio IDs request for: ${courseCode} (dryRun: ${dryRun})`)

  try {
    // Get course info
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('course_code, known_lang, target_lang')
      .eq('course_code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: `Course not found: ${courseCode}` })
    }

    const results = {
      practice_phrases: { known: 0, target1: 0, target2: 0 },
      legos: { known: 0, target1: 0, target2: 0 },
      seeds: { known: 0, target1: 0, target2: 0 }
    }

    if (dryRun) {
      // Just count what would be updated
      const { count: ppKnown } = await supabase
        .from('course_practice_phrases')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .is('known_audio_id', null)

      const { count: ppTarget1 } = await supabase
        .from('course_practice_phrases')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .is('target1_audio_id', null)

      const { count: legoKnown } = await supabase
        .from('course_legos')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .is('known_audio_id', null)

      return res.json({
        success: true,
        dryRun: true,
        courseCode,
        wouldUpdate: {
          practice_phrases_missing_known: ppKnown || 0,
          practice_phrases_missing_target1: ppTarget1 || 0,
          legos_missing_known: legoKnown || 0
        },
        message: 'Use dryRun: false to execute'
      })
    }

    const linkResults = await linkAudioIds(courseCode)

    logger.info(`Linked ${linkResults.total} audio IDs for ${courseCode}`)

    res.json({
      success: true,
      dryRun: false,
      courseCode,
      results: linkResults,
      totalLinked: linkResults.total,
      message: `Linked ${linkResults.total} audio IDs`
    })

  } catch (error) {
    logger.error('Link audio IDs error:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// POST LINK-PRESENTATION-AUDIO - Standalone endpoint to fix presentation linking
// =============================================================================
app.post('/link-presentation-audio/:courseCode', async (req, res) => {
  const { courseCode } = req.params
  try {
    const result = await linkPresentationAudio(courseCode)
    res.json({ success: true, courseCode, ...result })
  } catch (error) {
    logger.error('Link presentation audio error:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// POST REGENERATE-SINGLE - Regenerate a single audio file by UUID
// =============================================================================

app.post('/regenerate-single/:courseCode/:audioUuid', async (req, res) => {
  try {
    const { courseCode, audioUuid } = req.params

    if (isHumanVoiceCourse(courseCode)) {
      logger.info(`[/regenerate-single] SKIP ${courseCode}: human-voice-only course — no TTS (Tom's ruling 2026-07-25)`)
      return res.json({ skipped: true, reason: 'human-voice-only-course', courseCode })
    }

    // 1. Lookup the course_audio record
    const { data: audioRecord, error: audioError } = await supabase
      .from('course_audio')
      .select('id, text, role, language, voice_id, s3_key, origin')
      .eq('id', audioUuid)
      .eq('course_code', courseCode)
      .single()

    if (audioError || !audioRecord) {
      return res.status(404).json({ error: `Audio not found: ${audioUuid} in ${courseCode}` })
    }

    // PRECIOUS-AUDIO GUARD: human recordings are irreplaceable — never TTS over them.
    if (audioRecord.origin === 'human') {
      logger.warn(`[Regen Single] SKIP ${audioUuid}: origin=human (precious) — refusing TTS overwrite`)
      return res.status(409).json({
        error: 'This clip is a human recording (origin=human, precious). TTS regeneration is blocked for human audio.',
        origin: 'human',
        audioUuid
      })
    }

    // 2. Get course voice config
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('voice_config, known_lang, target_lang')
      .eq('course_code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const { role, text, language } = audioRecord
    const voiceConfig = course.voice_config || {}
    const voiceSettings = voiceConfig.voices?.[role] || {}
    const voiceId = voiceSettings.voiceId || voiceConfig[role]
    const voiceProvider = voiceSettings.provider || 'azure'
    const speed = voiceSettings.settings?.speed || 1.0

    if (!voiceId) {
      return res.status(400).json({ error: `No voice configured for role: ${role}` })
    }

    // 3. Get regen_count from audio_flags (default 0 if no flag exists)
    const { data: flagRecord } = await supabase
      .from('audio_flags')
      .select('regen_count')
      .eq('audio_uuid', audioUuid)
      .eq('course_code', courseCode)
      .maybeSingle()

    const regenCount = flagRecord?.regen_count || 0

    // 4. Gender expansion
    let textForTTS = text
    const lang = language || (role === 'known' ? course.known_lang : course.target_lang)
    if ((role === 'target1' || role === 'target2') && genderHaikuService.GENDERED_LANGUAGES.includes(lang)) {
      // Try Haiku gender expansion
      try {
        const result = await genderHaikuService.expandGender(text, lang, role)
        if (result?.wasModified) {
          textForTTS = result.expandedText
          logger.info(`Gender: "${text}" → "${textForTTS}" (${role})`)
        }
      } catch (e) {
        logger.warn(`Gender expansion failed, using original text: ${e.message}`)
      }
    }
    // Fallback: marker-based expansion
    if (textForTTS === text && (role === 'target1' || role === 'target2') && genderService.hasGenderMarker(text)) {
      const markerResult = genderService.analyzeAndExpand(text, lang, role)
      if (markerResult.wasModified) {
        textForTTS = markerResult.expandedText
        logger.info(`Gender (marker): "${text}" → "${textForTTS}" (${role})`)
      }
    }

    // 5. TTS generate
    logger.info(`[Regen Single] "${text.substring(0, 40)}..." role=${role} voice=${voiceId} attempt=${regenCount}`)

    let rawAudioBuffer, wordBoundaries
    if (voiceProvider === 'azure') {
      ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'azure', {
        subscriptionKey: process.env.AZURE_SPEECH_KEY,
        region: process.env.AZURE_SPEECH_REGION || 'westeurope',
        voiceName: voiceId,
        speed,
        regenerationAttempt: regenCount
      }))
    } else if (voiceProvider === 'elevenlabs') {
      ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'elevenlabs', {
        apiKey: process.env.ELEVENLABS_API_KEY,
        voiceId: voiceId,
        speed
      }))
    } else if (voiceProvider === 'xai') {
      ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'xai', {
        apiKey: process.env.XAI_API_KEY,
        voiceId: voiceId,
        language: toBcp47(lang),
      }))
    } else {
      throw new Error(`Unknown TTS provider: ${voiceProvider}`)
    }

    // 6. Master audio
    const { buffer: masteredBuffer, durationMs } = await masterAudio(rawAudioBuffer, textForTTS)

    // 7. Upload to S3
    const newAudioId = uuidv4().toUpperCase()
    const newS3Key = `mastered/${newAudioId}.mp3`

    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: newS3Key,
      Body: masteredBuffer,
      ContentType: 'audio/mpeg',
      CacheControl: AUDIO_CACHE_CONTROL,
    }))

    // 8. Update course_audio record
    const { error: updateError } = await supabase
      .from('course_audio')
      .update({
        voice_id: storedVoiceId,
        origin: 'tts',
        s3_key: newS3Key,
        duration_ms: durationMs,
        word_boundaries: wordBoundaries || null
      })
      .eq('id', audioUuid)

    if (updateError) throw updateError

    // 9. Update or create audio_flags with incremented regen_count
    if (flagRecord) {
      // Flag exists — just bump regen_count
      const { error: flagError } = await supabase
        .from('audio_flags')
        .update({ regen_count: regenCount + 1 })
        .eq('audio_uuid', audioUuid)
        .eq('course_code', courseCode)
      if (flagError) logger.warn(`Failed to update regen_count: ${flagError.message}`)
    } else {
      // No flag yet — create one
      const { error: flagError } = await supabase
        .from('audio_flags')
        .insert({
          audio_uuid: audioUuid,
          course_code: courseCode,
          status: 'flagged',
          regen_count: 1,
          reason: 'Inline regeneration',
          flagged_by: 'dashboard_user',
          created_at: new Date().toISOString()
        })
      if (flagError) logger.warn(`Failed to create audio flag: ${flagError.message}`)
    }

    logger.info(`[Regen Single] Done: "${text.substring(0, 30)}..." → ${newS3Key} (${durationMs}ms)`)

    res.json({
      success: true,
      audioUuid,
      newS3Key,
      durationMs,
      regenCount: regenCount + 1
    })

  } catch (error) {
    logger.error('Regenerate single error:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// POST REGENERATE-PRESENTATION - Surgical per-LEGO presentation edit + regen
// =============================================================================
// Single-LEGO scope of /regenerate-presentations. Edits the AUTHORITATIVE text
// store for intro audio (course_audio.text, role='presentation') for ONE lego_id,
// then regenerates JUST that row's TTS. No-op for every other row.
//
// Authority note: course-wide regen sources presentation text from the DB
// (course_legos + template) and writes it to course_audio.text — which the TTS
// step (/generate, /regenerate-role, /regenerate-single) reads verbatim. The S3
// introductions.json written by api/courses/.../introductions/[legoId].js is a
// SEPARATE store that the audio path never reads. So course_audio.text is
// authoritative here, and we follow the same recipe as the bulk path: whole
// presentation line → known-language presentation voice → master → S3 → row.
//
// Body: { text? }  — if provided, becomes the new presentation text (forces regen
//                    even if other content unchanged). If omitted, regenerates the
//                    existing row's text as-is (or computes default text if the row
//                    must be created).
// Returns: { success, lego_id, audio_id, duration_ms }
// =============================================================================
app.post('/regenerate-presentation/:courseCode/:legoId', async (req, res) => {
  const { courseCode, legoId } = req.params
  const { text: providedText } = req.body || {}

  try {
    // 1. Load course + voice config
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('voice_config, known_lang, target_lang')
      .eq('course_code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: `Course not found: ${courseCode}` })
    }

    const knownLang = canonicalLanguage(course.known_lang)
    const voiceConfig = course.voice_config || {}
    const voiceSettings = voiceConfig.voices?.presentation || {}
    const voiceId = voiceSettings.voiceId || voiceConfig.presentation
    const voiceProvider = voiceSettings.provider || 'azure'
    const speed = voiceSettings.settings?.speed || 1.0

    if (!voiceId) {
      return res.status(400).json({ error: 'No voice configured for role: presentation' })
    }
    // Raw voiceId goes to the provider below; storedVoiceId is the identity.
    let storedVoiceId
    try {
      storedVoiceId = canonicalClipVoiceId(voiceId, voiceSettings.provider)
    } catch (identityErr) {
      return res.status(400).json({ error: `presentation voice: ${identityErr.message}` })
    }

    // 2. Parse lego_id → seed_number + lego_index (e.g. "S0001L03")
    const legoMatch = String(legoId).match(/S(\d+)L(\d+)/)
    if (!legoMatch) {
      return res.status(400).json({ error: `Invalid lego_id format: ${legoId}` })
    }
    const seedNumber = parseInt(legoMatch[1], 10)
    const legoIndex = parseInt(legoMatch[2], 10)

    // 3. Find the existing presentation row for THIS lego (the only row we touch)
    const { data: existingRow } = await supabase
      .from('course_audio')
      .select('id, text, s3_key, origin')
      .eq('course_code', courseCode)
      .eq('role', 'presentation')
      .eq('lego_id', legoId)
      .maybeSingle()

    // PRECIOUS-AUDIO GUARD: human recordings are irreplaceable — never TTS over them.
    if (existingRow?.origin === 'human') {
      logger.warn(`[Regen Presentation] SKIP ${courseCode}/${legoId}: origin=human (precious) — refusing TTS overwrite`)
      return res.status(409).json({
        error: `The presentation for ${legoId} is a human recording (origin=human, precious). TTS regeneration is blocked for human audio.`,
        origin: 'human',
        lego_id: legoId
      })
    }

    // 4. Resolve the presentation text to speak.
    //    - explicit text wins (and is persisted as the new authoritative text)
    //    - else reuse the existing row's text
    //    - else compute a default the same way the bulk path does (short template)
    let presentationText = (typeof providedText === 'string' && providedText.trim())
      ? providedText.trim()
      : (existingRow?.text || null)

    if (!presentationText) {
      // No row and no text supplied — compute default from template + lego known_text.
      const { data: lego } = await supabase
        .from('course_legos')
        .select('known_text')
        .eq('course_code', courseCode)
        .eq('seed_number', seedNumber)
        .eq('lego_index', legoIndex)
        .maybeSingle()

      if (!lego) {
        return res.status(404).json({ error: `LEGO not found and no text provided: ${legoId}` })
      }

      // Short form (no "as in" context) — matches the bulk path's no-context branch.
      presentationText = await presentationAuthor.defaultIntroText(supabase, {
        knownLang,
        targetLang: course.target_lang,
        knownText: lego.known_text
      })
    }

    // 5. Generate TTS for the single presentation line (whole line → known voice).
    logger.info(`[Regen Presentation] ${courseCode}/${legoId} voice=${voiceId} "${presentationText.substring(0, 50)}..."`)

    let rawAudioBuffer, wordBoundaries
    if (voiceProvider === 'azure') {
      ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(presentationText, 'azure', {
        subscriptionKey: process.env.AZURE_SPEECH_KEY,
        region: process.env.AZURE_SPEECH_REGION || 'westeurope',
        voiceName: voiceId,
        speed
      }))
    } else if (voiceProvider === 'elevenlabs') {
      ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(presentationText, 'elevenlabs', {
        apiKey: process.env.ELEVENLABS_API_KEY,
        voiceId: voiceId,
        speed
      }))
    } else if (voiceProvider === 'xai') {
      ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(presentationText, 'xai', {
        apiKey: process.env.XAI_API_KEY,
        voiceId: voiceId,
        language: toBcp47(knownLang)
      }))
    } else {
      return res.status(400).json({ error: `Unknown TTS provider: ${voiceProvider}` })
    }

    // 6. Master audio (−16 LUFS, duration)
    const { buffer: masteredBuffer, durationMs } = await masterAudio(rawAudioBuffer, presentationText)

    // 7. Upload mastered audio to S3 (fresh UUID, UPPERCASE to match convention)
    const newAudioId = uuidv4().toUpperCase()
    const newS3Key = `mastered/${newAudioId}.mp3`
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: newS3Key,
      Body: masteredBuffer,
      ContentType: 'audio/mpeg',
      CacheControl: AUDIO_CACHE_CONTROL,
    }))

    // 8. Update the existing row in place, or insert a new one for this lego.
    //    Either way: exactly one course_audio row is written.
    let audioRowId
    if (existingRow) {
      const { error: updateError } = await supabase
        .from('course_audio')
        .update({
          text: presentationText,
          text_normalized: normalizeForAudio(presentationText),
          language: knownLang,
          voice_id: storedVoiceId,
          origin: 'tts',
          s3_key: newS3Key,
          duration_ms: durationMs,
          word_boundaries: wordBoundaries || null
        })
        .eq('id', existingRow.id)
      if (updateError) throw updateError
      audioRowId = existingRow.id
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('course_audio')
        .insert({
          course_code: courseCode,
          text: presentationText,
          text_normalized: normalizeForAudio(presentationText),
          language: knownLang,
          role: 'presentation',
          voice_id: storedVoiceId,
          origin: 'tts',
          s3_key: newS3Key,
          duration_ms: durationMs,
          lego_id: legoId,
          word_boundaries: wordBoundaries || null
        })
        .select('id')
        .single()
      if (insertError) throw insertError
      audioRowId = inserted.id
    }

    // 9. Bind presentation_audio_id on course_legos + lego_introductions (same as
    //    the bulk path) so the learning app resolves the fresh clip for this lego.
    await supabase
      .from('course_legos')
      .update({ presentation_audio_id: audioRowId })
      .eq('course_code', courseCode)
      .eq('seed_number', seedNumber)
      .eq('lego_index', legoIndex)

    const { error: introError } = await supabase
      .from('lego_introductions')
      .upsert({
        course_code: courseCode,
        lego_id: legoId,
        presentation_audio_id: audioRowId,
        audio_uuid: audioRowId
      }, { onConflict: 'course_code,lego_id', ignoreDuplicates: false })
    if (introError) logger.warn(`Could not upsert lego_introductions for ${legoId}: ${introError.message}`)

    // 10. Bust production-api stats cache + bump course version (matches bulk path)
    try {
      await fetch(`http://localhost:3470/api/production/${courseCode}/audio-stats?fresh=1`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
    } catch (e) { /* production-api may not be running */ }
    await bumpCourseVersion(supabase, courseCode, 'patch')

    logger.info(`[Regen Presentation] Done: ${legoId} → ${newS3Key} (${durationMs}ms), audio_id=${audioRowId}`)

    res.json({
      success: true,
      lego_id: legoId,
      audio_id: audioRowId,
      duration_ms: durationMs,
      text: presentationText,
      created: !existingRow
    })

  } catch (error) {
    logger.error('Regenerate presentation error:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// POST REGENERATE-PHRASE - Surgical per-PHRASE text edit + audio regen (auto-approve)
// =============================================================================
// Clones /regenerate-presentation's recipe but targets a course_practice_phrases
// row (component_practice / build / use phrases) instead of presentation intros.
//
// THE LOAD-BEARING TRAP this endpoint exists to avoid:
//   /regenerate-single RE-READS course_audio.text and re-TTSes the OLD text, so it
//   CANNOT be used after a TEXT edit (stale audio under new text = audio/text desync).
//   This endpoint takes the NEW text, TTSes IT, persists course_audio.text +
//   text_normalized = the NEW text, mints a FRESH uuid + S3 key, and rebinds the
//   phrase pointer. No accept step (PODs auto-approve model). Old S3 never deleted.
//
// Roles map to course_practice_phrases columns + voice_config.voices:
//   'known'   → known_text   → known_audio_id    → voices.known   (known_lang)
//   'target1' → target_text  → target1_audio_id  → voices.target1 (target_lang)
//   'target2' → target_text  → target2_audio_id  → voices.target2 (target_lang)
// (target1 & target2 are two voices of the SAME target text.)
//
// Body: { known_text?, target_text?, roles: ['known'|'target1'|'target2', ...] }
//   - Persists known_text/target_text to course_practice_phrases IF passed (so DB
//     text + audio text agree). Idempotent: the UI may also PATCH text separately;
//     we only write text columns that were passed AND actually differ, then rebind.
//   - Regenerates ONLY the requested roles. Untouched roles keep their existing id.
// Returns: { known_audio_id, target1_audio_id, target2_audio_id,
//            durations: { known?, target1?, target2? } }
// =============================================================================

app.post('/regenerate-phrase/:courseCode/:phraseId', async (req, res) => {
  const { courseCode, phraseId } = req.params
  const { known_text: knownText, target_text: targetText, roles } = req.body || {}

  try {
    // 0. Validate roles
    const VALID_ROLES = ['known', 'target1', 'target2']
    const requestedRoles = Array.isArray(roles) ? [...new Set(roles)] : []
    if (requestedRoles.length === 0 || requestedRoles.some(r => !VALID_ROLES.includes(r))) {
      return res.status(400).json({
        error: `roles must be a non-empty subset of ${JSON.stringify(VALID_ROLES)}`
      })
    }

    // 1. Load course + voice config
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('voice_config, known_lang, target_lang')
      .eq('course_code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: `Course not found: ${courseCode}` })
    }
    const knownLang = canonicalLanguage(course.known_lang)
    const targetLang = canonicalLanguage(course.target_lang)
    const voiceConfig = course.voice_config || {}
    const voices = voiceConfig.voices || voiceConfig  // support nested + flat

    // 2. Load the phrase row (PK = id, the deterministic text id e.g. fra_for_eng:S0042L03U05)
    const { data: phrase, error: phraseError } = await supabase
      .from('course_practice_phrases')
      .select('id, course_code, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, seed_number, lego_index, lego_id, phrase_role')
      .eq('id', phraseId)
      .eq('course_code', courseCode)
      .maybeSingle()

    if (phraseError) throw phraseError
    if (!phrase) {
      return res.status(404).json({ error: `Phrase not found: ${phraseId} in ${courseCode}` })
    }

    // 3. Persist edited text FIRST (only columns passed AND actually changed).
    //    Order matters: the course_practice_phrases trigger nulls the matching
    //    *_audio_id when text changes — so we let that fire here, then rebind the
    //    fresh uuid in step 6. Idempotent: a no-op (same text) writes nothing, so
    //    a prior UI PATCH of the same text won't re-null our binding.
    const textPatch = {}
    if (typeof knownText === 'string' && knownText !== phrase.known_text) {
      textPatch.known_text = knownText
    }
    if (typeof targetText === 'string' && targetText !== phrase.target_text) {
      textPatch.target_text = targetText
    }
    if (Object.keys(textPatch).length > 0) {
      const { error: textErr } = await supabase
        .from('course_practice_phrases')
        .update(textPatch)
        .eq('id', phraseId)
        .eq('course_code', courseCode)
      if (textErr) throw textErr
    }

    // Authoritative text to speak per role (explicit body wins, else current row).
    const effectiveKnown = (typeof knownText === 'string') ? knownText : phrase.known_text
    const effectiveTarget = (typeof targetText === 'string') ? targetText : phrase.target_text

    // 4. Regenerate each requested role. Reuses the EXACT recipe of the bulk role
    //    path: gender expansion (target only) → provider TTS → master → S3 → mint
    //    course_audio row with NEW text → rebind phrase pointer.
    const PHRASE_AUDIO_COLUMN = { known: 'known_audio_id', target1: 'target1_audio_id', target2: 'target2_audio_id' }

    // Start with the existing ids so untouched roles round-trip unchanged.
    const result = {
      known_audio_id: phrase.known_audio_id || null,
      target1_audio_id: phrase.target1_audio_id || null,
      target2_audio_id: phrase.target2_audio_id || null,
      durations: {}
    }
    const skippedHumanRoles = []

    for (const role of requestedRoles) {
      const isKnown = role === 'known'
      const text = isKnown ? effectiveKnown : effectiveTarget
      const language = isKnown ? knownLang : targetLang

      if (typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({
          error: `No text available for role "${role}" (need ${isKnown ? 'known_text' : 'target_text'})`
        })
      }

      // Resolve voice for this role (voiceId / provider / speed).
      // course_audio.voice_id is stored PREFIXED — `${provider}_${voiceName}` — because
      // that is what the bulk path's getVoiceForRole writes and what the unique key
      // (course, text_normalized, language, role, voice_id) is keyed on. Writing the
      // bare name here mints a row no link/dedup pass can match to its siblings.
      // Config may hold either form, so normalise both ways: prefixed for storage,
      // bare for TTS dispatch.
      const voiceSettings = voices?.[role] || {}
      const rawVoice = voiceSettings.voiceId || (typeof voices?.[role] === 'string' ? voices[role] : null)
      if (!rawVoice) {
        return res.status(400).json({ error: `No voice configured for role: ${role}` })
      }
      // The hand-rolled version of this took `rawVoice.split('_')[0]` as the
      // provider, which turns an unprefixed name into its own provider. One
      // canonicaliser now decides the stored spelling and the dispatch pair
      // reads back out of it.
      let voiceId
      try {
        voiceId = canonicalClipVoiceId(rawVoice, voiceSettings.provider)
      } catch (identityErr) {
        return res.status(400).json({ error: `voice for role ${role}: ${identityErr.message}` })
      }
      const voiceProvider = voiceId.slice(0, voiceId.indexOf('_'))
      const voiceName = voiceId.slice(voiceProvider.length + 1)
      const speed = voiceSettings.settings?.speed || 1.0

      const column = PHRASE_AUDIO_COLUMN[role]

      // Flagging a role in the edit modal is an EXPLICIT request to regenerate
      // (e.g. apply a changed voice config, or replace a bad take), so we ALWAYS
      // render fresh TTS for every requested role — no dedup reuse-skip. The
      // unique-key collision (reverting to prior text, double-regen of identical
      // text, etc.) is handled by the upsert-on-conflict at the write below, which
      // UPDATES the existing row's s3_key/duration/text in place rather than 500ing.
      const textNormalized = normalizeForAudio(text)

      // PRECIOUS-AUDIO GUARD: if a human recording occupies this exact audio key,
      // the upsert below would flip it back to TTS. Keep the human take — rebind
      // the phrase pointer to it and skip TTS for this role.
      const guardedHuman = await humanRowAtAudioKey(courseCode, textNormalized, language, role, voiceId)
      if (guardedHuman) {
        const { error: humanBindError } = await supabase
          .from('course_practice_phrases')
          .update({ [column]: guardedHuman.id })
          .eq('id', phraseId)
          .eq('course_code', courseCode)
        if (humanBindError) throw humanBindError
        result[column] = guardedHuman.id
        skippedHumanRoles.push(role)
        logger.info(`[Regen Phrase] SKIP ${phraseId} ${role}: human recording ${guardedHuman.id} holds this key — phrase rebound to the human take`)
        continue
      }

      // Gender expansion (target1/target2 only) — Haiku first, marker regex fallback.
      let textForTTS = text
      if ((role === 'target1' || role === 'target2') && genderHaikuService.GENDERED_LANGUAGES.includes(language)) {
        try {
          const gr = await genderHaikuService.expandGender(text, language, role)
          if (gr?.wasModified) {
            textForTTS = gr.expandedText
            logger.info(`Gender: "${text}" → "${textForTTS}" (${role})`)
          }
        } catch (e) {
          logger.warn(`Gender expansion failed, using original text: ${e.message}`)
        }
      }
      if (textForTTS === text && (role === 'target1' || role === 'target2') && genderService.hasGenderMarker(text)) {
        const mr = genderService.analyzeAndExpand(text, language, role)
        if (mr.wasModified) {
          textForTTS = mr.expandedText
          logger.info(`Gender (marker): "${text}" → "${textForTTS}" (${role})`)
        }
      }

      // TTS generate (same provider branches as the bulk path).
      logger.info(`[Regen Phrase] ${courseCode}/${phraseId} role=${role} voice=${voiceId} "${textForTTS.substring(0, 40)}..."`)
      let rawAudioBuffer, wordBoundaries
      if (voiceProvider === 'azure') {
        ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'azure', {
          subscriptionKey: process.env.AZURE_SPEECH_KEY,
          region: process.env.AZURE_SPEECH_REGION || 'westeurope',
          voiceName,
          speed
        }))
      } else if (voiceProvider === 'elevenlabs') {
        ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'elevenlabs', {
          apiKey: process.env.ELEVENLABS_API_KEY,
          voiceId: voiceName,
          speed
        }))
      } else if (voiceProvider === 'xai') {
        ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'xai', {
          apiKey: process.env.XAI_API_KEY,
          voiceId: voiceName,
          language: toBcp47(language)
        }))
      } else {
        return res.status(400).json({ error: `Unknown TTS provider: ${voiceProvider}` })
      }

      // Master audio (−16 LUFS, duration).
      const { buffer: masteredBuffer, durationMs } = await masterAudio(rawAudioBuffer, textForTTS)

      // Upload mastered audio to S3 (fresh UUID, UPPERCASE per convention).
      const newAudioId = uuidv4().toUpperCase()
      const newS3Key = `mastered/${newAudioId}.mp3`
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: newS3Key,
        Body: masteredBuffer,
        ContentType: 'audio/mpeg',
        CacheControl: AUDIO_CACHE_CONTROL,
      }))

      // Mint a course_audio row carrying the NEW text. We checked above that no row
      // exists for this key, so this is a fresh clip — but UPSERT on the unique key
      // (the canonical bulk-path pattern) is belt-and-suspenders against a concurrent
      // write that created the row between our lookup and here, so we never 500 on
      // unique_course_audio_per_voice. On conflict the existing row's id is returned.
      const { data: insertedAudio, error: audioInsertError } = await supabase
        .from('course_audio')
        .upsert({
          course_code: courseCode,
          text,                                   // authoritative NEW text
          text_normalized: textNormalized,
          language,
          role,
          voice_id: voiceId,
          origin: 'tts',
          s3_key: newS3Key,
          duration_ms: durationMs,
          word_boundaries: wordBoundaries || null
        }, {
          onConflict: 'course_code,text_normalized,language,role,voice_id'
        })
        .select('id')
        .single()
      if (audioInsertError) throw audioInsertError
      const audioRowId = insertedAudio.id

      // Rebind the phrase pointer to the fresh uuid (single-column update so the
      // text-change trigger can't fire here and re-null our binding).
      const { error: bindError } = await supabase
        .from('course_practice_phrases')
        .update({ [column]: audioRowId })
        .eq('id', phraseId)
        .eq('course_code', courseCode)
      if (bindError) throw bindError

      result[column] = audioRowId
      result.durations[role] = durationMs
      logger.info(`[Regen Phrase] Done: ${phraseId} ${role} → ${newS3Key} (${durationMs}ms), audio_id=${audioRowId}`)
    }

    // 5. Bust production-api stats cache + bump course version (matches bulk paths).
    try {
      await fetch(`http://localhost:3470/api/production/${courseCode}/audio-stats?fresh=1`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
    } catch (e) { /* production-api may not be running */ }
    await bumpCourseVersion(supabase, courseCode, 'patch')

    // Additive field — only present when a human take was preserved.
    if (skippedHumanRoles.length > 0) result.skipped_human = skippedHumanRoles

    res.json(result)

  } catch (error) {
    logger.error('Regenerate phrase error:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// POST REGENERATE-LEGO - Surgical per-LEGO AUDIO regen (text is LOCKED)
// =============================================================================
// Clones /regenerate-phrase's recipe against course_legos, with the "persist
// edited text" step DELETED ON PURPOSE.
//
// TOM'S RULING, 2026-08-07, verbatim:
//   "we must NOT allow people to edit the lego TEXT - we have done this before -
//    we just add the punctuation to the TTS job, not to the canonical LEGO text"
// Every BUILD phrase contains its LEGO's text, so editing course_legos.known_text
// / target_text would rightly cascade across the course. This endpoint NEVER
// writes those columns. If you are about to add that back: don't — you break the
// cascade guarantee this endpoint exists to hold.
//
// Why it exists: isolated short clips (single LEGO words, fragments like "ob",
// "mit dir") are read by the voice as if they were whole sentences. The
// tts_* overrides let a trailing "." / "," / "…" reach the VOICE ONLY, so the
// reading can be A/B'd by ear without touching course content.
//
// Roles map to course_legos columns + voice_config.voices:
//   'known'   → known_text   → known_audio_id    → voices.known   (known_lang)
//   'target1' → target_text  → target1_audio_id  → voices.target1 (target_lang)
//   'target2' → target_text  → target2_audio_id  → voices.target2 (target_lang)
// (target1 & target2 are two voices of the SAME target text.)
//
// Body: { roles: ['known'|'target1'|'target2', ...], tts_known_text?, tts_target_text? }
//   - tts_* is the SPOKEN text for that side; when absent/blank the LEGO's own
//     canonical text is spoken. This is the ONLY place the override may reach.
// Returns: { known_audio_id, target1_audio_id, target2_audio_id,
//            durations: { known?, target1?, target2? }, spoken: { ... } }
// =============================================================================

app.post('/regenerate-lego/:courseCode/:legoId', async (req, res) => {
  const { courseCode, legoId } = req.params
  const { roles, tts_known_text: ttsKnownText, tts_target_text: ttsTargetText } = req.body || {}

  try {
    // 0. Validate roles
    const VALID_ROLES = ['known', 'target1', 'target2']
    const requestedRoles = Array.isArray(roles) ? [...new Set(roles)] : []
    if (requestedRoles.length === 0 || requestedRoles.some(r => !VALID_ROLES.includes(r))) {
      return res.status(400).json({
        error: `roles must be a non-empty subset of ${JSON.stringify(VALID_ROLES)}`
      })
    }

    if (isHumanVoiceCourse(courseCode)) {
      logger.info(`[/regenerate-lego] SKIP ${courseCode}: human-voice-only course — no TTS (Tom's ruling 2026-07-25)`)
      return res.json({ skipped: true, reason: 'human-voice-only-course', courseCode })
    }

    // 1. Load course + voice config
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('voice_config, known_lang, target_lang')
      .eq('course_code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: `Course not found: ${courseCode}` })
    }
    const knownLang = canonicalLanguage(course.known_lang)
    const targetLang = canonicalLanguage(course.target_lang)
    const voiceConfig = course.voice_config || {}
    const voices = voiceConfig.voices || voiceConfig  // support nested + flat

    // 2. Load the LEGO row (PK column is lego_id, e.g. fra_for_eng:S0042L03)
    const { data: lego, error: legoError } = await supabase
      .from('course_legos')
      .select('lego_id, course_code, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id')
      .eq('lego_id', legoId)
      .eq('course_code', courseCode)
      .maybeSingle()

    if (legoError) throw legoError
    if (!lego) {
      return res.status(404).json({ error: `LEGO not found: ${legoId} in ${courseCode}` })
    }

    // 3. (deliberately absent) NO text persistence — see the ruling above.

    // Spoken text per side: explicit non-blank override wins, else canonical.
    const spokenKnown = (typeof ttsKnownText === 'string' && ttsKnownText.trim())
      ? ttsKnownText : lego.known_text
    const spokenTarget = (typeof ttsTargetText === 'string' && ttsTargetText.trim())
      ? ttsTargetText : lego.target_text

    const LEGO_AUDIO_COLUMN = { known: 'known_audio_id', target1: 'target1_audio_id', target2: 'target2_audio_id' }

    const result = {
      lego_id: legoId,
      known_audio_id: lego.known_audio_id || null,
      target1_audio_id: lego.target1_audio_id || null,
      target2_audio_id: lego.target2_audio_id || null,
      durations: {},
      spoken: {}
    }
    const skippedHumanRoles = []

    for (const role of requestedRoles) {
      const isKnown = role === 'known'
      const text = isKnown ? spokenKnown : spokenTarget
      const language = isKnown ? knownLang : targetLang

      if (typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({
          error: `No text available for role "${role}" (LEGO has no ${isKnown ? 'known_text' : 'target_text'})`
        })
      }

      // PRECIOUS-AUDIO GUARD (currently-bound clip): a human recording is
      // irreplaceable — refuse rather than rebind away from / TTS over it.
      const boundId = lego[LEGO_AUDIO_COLUMN[role]]
      if (boundId) {
        const { data: boundAudio } = await supabase
          .from('course_audio')
          .select('id, origin')
          .eq('id', boundId)
          .maybeSingle()
        if (boundAudio?.origin === 'human') {
          logger.warn(`[Regen Lego] REFUSE ${courseCode}/${legoId} ${role}: bound clip ${boundId} origin=human (precious)`)
          return res.status(409).json({
            error: `The ${role} clip for ${legoId} is a human recording (origin=human, precious). TTS regeneration is blocked for human audio.`,
            origin: 'human',
            lego_id: legoId,
            role
          })
        }
      }

      // Resolve voice for this role (voiceId / provider / speed) — same
      // canonicalisation as /regenerate-phrase, so the stored voice_id matches
      // what every link/dedup pass expects.
      const voiceSettings = voices?.[role] || {}
      const rawVoice = voiceSettings.voiceId || (typeof voices?.[role] === 'string' ? voices[role] : null)
      if (!rawVoice) {
        return res.status(400).json({ error: `No voice configured for role: ${role}` })
      }
      let voiceId
      try {
        voiceId = canonicalClipVoiceId(rawVoice, voiceSettings.provider)
      } catch (identityErr) {
        return res.status(400).json({ error: `voice for role ${role}: ${identityErr.message}` })
      }
      const voiceProvider = voiceId.slice(0, voiceId.indexOf('_'))
      const voiceName = voiceId.slice(voiceProvider.length + 1)
      const speed = voiceSettings.settings?.speed || 1.0

      const column = LEGO_AUDIO_COLUMN[role]
      const textNormalized = normalizeForAudio(text)

      // PRECIOUS-AUDIO GUARD (target key): if a human recording already occupies
      // the key we are about to upsert, keep it — rebind and skip TTS.
      const guardedHuman = await humanRowAtAudioKey(courseCode, textNormalized, language, role, voiceId)
      if (guardedHuman) {
        const { error: humanBindError } = await supabase
          .from('course_legos')
          .update({ [column]: guardedHuman.id })
          .eq('lego_id', legoId)
          .eq('course_code', courseCode)
        if (humanBindError) throw humanBindError
        result[column] = guardedHuman.id
        skippedHumanRoles.push(role)
        logger.info(`[Regen Lego] SKIP ${legoId} ${role}: human recording ${guardedHuman.id} holds this key — LEGO rebound to the human take`)
        continue
      }

      // Gender expansion (target1/target2 only) — Haiku first, marker regex fallback.
      let textForTTS = text
      if ((role === 'target1' || role === 'target2') && genderHaikuService.GENDERED_LANGUAGES.includes(language)) {
        try {
          const gr = await genderHaikuService.expandGender(text, language, role)
          if (gr?.wasModified) {
            textForTTS = gr.expandedText
            logger.info(`Gender: "${text}" → "${textForTTS}" (${role})`)
          }
        } catch (e) {
          logger.warn(`Gender expansion failed, using original text: ${e.message}`)
        }
      }
      if (textForTTS === text && (role === 'target1' || role === 'target2') && genderService.hasGenderMarker(text)) {
        const mr = genderService.analyzeAndExpand(text, language, role)
        if (mr.wasModified) {
          textForTTS = mr.expandedText
          logger.info(`Gender (marker): "${text}" → "${textForTTS}" (${role})`)
        }
      }

      logger.info(`[Regen Lego] ${courseCode}/${legoId} role=${role} voice=${voiceId} "${textForTTS.substring(0, 40)}..."`)
      let rawAudioBuffer, wordBoundaries
      if (voiceProvider === 'azure') {
        ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'azure', {
          subscriptionKey: process.env.AZURE_SPEECH_KEY,
          region: process.env.AZURE_SPEECH_REGION || 'westeurope',
          voiceName,
          speed
        }))
      } else if (voiceProvider === 'elevenlabs') {
        ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'elevenlabs', {
          apiKey: process.env.ELEVENLABS_API_KEY,
          voiceId: voiceName,
          speed
        }))
      } else if (voiceProvider === 'xai') {
        ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'xai', {
          apiKey: process.env.XAI_API_KEY,
          voiceId: voiceName,
          language: toBcp47(language)
        }))
      } else {
        return res.status(400).json({ error: `Unknown TTS provider: ${voiceProvider}` })
      }

      // Master audio (−16 LUFS, duration).
      const { buffer: masteredBuffer, durationMs } = await masterAudio(rawAudioBuffer, textForTTS)

      // Upload mastered audio to S3 (fresh UUID, UPPERCASE per convention).
      // Make-before-break: nothing old is touched, ever — no S3 delete here.
      const newAudioId = uuidv4().toUpperCase()
      const newS3Key = `mastered/${newAudioId}.mp3`
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: newS3Key,
        Body: masteredBuffer,
        ContentType: 'audio/mpeg',
        CacheControl: AUDIO_CACHE_CONTROL,
      }))

      // Mint a course_audio row carrying the SPOKEN text (the punctuated variant),
      // matching the generic path — the audio row stays an honest record of what
      // was actually said.
      //
      // CAVEAT, measured 2026-08-07: the upsert key uses text_normalized, and
      // normalizeForAudio STRIPS a trailing full stop ("I want." → "i want") while
      // KEEPING a comma or ellipsis ("irrid…" → "irrid…"). So a "." variant shares
      // its identity key with the unpunctuated clip: re-rendering the plain text
      // later on the same voice upserts the same row and overwrites the tuned
      // s3_key. "," and "…" get their own rows and survive. Tuning done with "."
      // is therefore not durable against a later course-wide pass — prefer "…"/","
      // if the tuning must stick, until the clip-identity key is revisited.
      const { data: insertedAudio, error: audioInsertError } = await supabase
        .from('course_audio')
        .upsert({
          course_code: courseCode,
          text,
          text_normalized: textNormalized,
          language,
          role,
          voice_id: voiceId,
          origin: 'tts',
          s3_key: newS3Key,
          duration_ms: durationMs,
          word_boundaries: wordBoundaries || null
        }, {
          onConflict: 'course_code,text_normalized,language,role,voice_id'
        })
        .select('id')
        .single()
      if (audioInsertError) throw audioInsertError
      const audioRowId = insertedAudio.id

      // Rebind ONLY this LEGO's own pointer column. No text column is written.
      const { error: bindError } = await supabase
        .from('course_legos')
        .update({ [column]: audioRowId })
        .eq('lego_id', legoId)
        .eq('course_code', courseCode)
      if (bindError) throw bindError

      result[column] = audioRowId
      result.durations[role] = durationMs
      result.spoken[role] = textForTTS
      logger.info(`[Regen Lego] Done: ${legoId} ${role} → ${newS3Key} (${durationMs}ms), audio_id=${audioRowId}`)
    }

    // Bust production-api stats cache + bump course version (matches neighbours).
    try {
      await fetch(`http://localhost:3470/api/production/${courseCode}/audio-stats?fresh=1`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
    } catch (e) { /* production-api may not be running */ }
    await bumpCourseVersion(supabase, courseCode, 'patch')

    if (skippedHumanRoles.length > 0) result.skipped_human = skippedHumanRoles

    res.json(result)

  } catch (error) {
    logger.error('Regenerate lego error:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// POST GENERATE-COMPONENTS - Generate audio for M-LEGO component phrases
// =============================================================================

app.post('/generate-components/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { dryRun = false, concurrency: requestedConcurrency } = req.body

    const concurrencyToUse = requestedConcurrency
      ? Math.max(1, Math.min(20, parseInt(requestedConcurrency, 10) || CONCURRENCY))
      : CONCURRENCY

    if (currentWork.active) {
      return res.status(409).json({
        error: 'Another job is already running',
        activeJob: { operation: currentWork.operation, courseCode: currentWork.courseCode }
      })
    }

    // 1. Load course + voice config
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('course_code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const voiceConfig = course.voice_config || {}
    const voices = voiceConfig.voices || voiceConfig
    const missingVoiceRoles = ['known', 'target1'].filter(r => !voices[r] || !voices[r].voiceId)
    if (missingVoiceRoles.length) {
      return res.status(400).json({ error: 'Course missing voice configuration', missingRoles: missingVoiceRoles, voiceConfig })
    }

    // Canonical, same as /generate. This used to default the provider to
    // 'azure' whenever the config omitted one, which spells a bare xAI voice
    // 'azure_leo' — a voice id that exists nowhere and dispatches to the wrong
    // provider. canonicalClipVoiceId only accepts a provider it can justify.
    const getVoiceForRole = (role) => {
      const v = voices[role]
      if (!v) return null
      const raw = typeof v === 'string' ? v : v.voiceId
      if (!raw) return null // empty voiceId → null, never the config object
      const canonical = tryCanonicalClipVoiceId(raw, typeof v === 'string' ? undefined : v.provider)
      if (!canonical) {
        logger.warn(`[Components] getVoiceForRole(${role}): cannot canonicalise voice ${JSON.stringify(raw)} — fix the course voice_config`)
        return null
      }
      return canonical
    }
    const getSpeedForRole = (role) => voices[role]?.settings?.speed || 1.0

    // Identity columns — canonical from here down, so the guard, the sibling
    // reuse read and the upsert all agree on one spelling.
    const knownLang = canonicalLanguage(course.known_lang)
    const targetLang = canonicalLanguage(course.target_lang)
    const targetLangName = getLocalisedLangName(targetLang, knownLang)

    // 2. Load component phrases
    const { data: components, error: compError } = await supabase
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id')
      .eq('course_code', courseCode)
      .eq('phrase_role', 'component')
      .order('seed_number')
      .order('lego_index')

    if (compError) throw compError
    if (!components?.length) {
      return res.json({ success: true, message: 'No component phrases found', count: 0 })
    }

    logger.info(`[Components] Found ${components.length} component phrases for ${courseCode}`)

    // 3. Load parent M-LEGOs for presentation context
    const parentKeys = [...new Set(components.map(c => `${c.seed_number}:${c.lego_index}`))]
    const parentSeedNumbers = [...new Set(components.map(c => c.seed_number))]
    const parentLegoIndices = [...new Set(components.map(c => c.lego_index))]

    const { data: parentLegos } = await supabase
      .from('course_legos')
      .select('seed_number, lego_index, known_text, target_text')
      .eq('course_code', courseCode)
      .eq('type', 'M')
      .in('seed_number', parentSeedNumbers)

    const parentMap = new Map()
    for (const l of (parentLegos || [])) {
      parentMap.set(`${l.seed_number}:${l.lego_index}`, l)
    }

    // 4. Get (or auto-generate) presentation template
    const presentationTemplate = await getOrCreatePresentationTemplate(knownLang)

    // 5. Collect all unique texts we need audio for
    const needed = []
    const compPresTexts = new Map() // comp.id -> presentation text

    for (const comp of components) {
      const parent = parentMap.get(`${comp.seed_number}:${comp.lego_index}`)

      // known audio
      if (!isPunctuationOnly(comp.known_text)) {
        needed.push({
          text: comp.known_text,
          language: knownLang,
          role: 'known',
          voiceId: getVoiceForRole('known'),
          speed: getSpeedForRole('known'),
          componentId: comp.id
        })
      }

      // target1 + target2 audio
      if (!isPunctuationOnly(comp.target_text)) {
        for (const role of ['target1', 'target2']) {
          needed.push({
            text: comp.target_text,
            language: targetLang,
            role,
            voiceId: getVoiceForRole(role),
            speed: getSpeedForRole(role),
            componentId: comp.id
          })
        }
      }

      // presentation audio
      if (parent) {
        const presText = presentationTemplate
          .replace('{target_lang_name}', targetLangName)
          .replace('{known}', comp.known_text)
          .replace('{seed}', parent.known_text)

        compPresTexts.set(comp.id, presText)

        needed.push({
          text: presText,
          language: knownLang,
          role: 'presentation',
          voiceId: getVoiceForRole('presentation') || getVoiceForRole('known'),
          speed: getSpeedForRole('presentation') || getSpeedForRole('known') || 1.0,
          componentId: comp.id,
          isComponentPresentation: true
        })
      }
    }

    // 6. Dedup against existing course_audio (targeted query by unique texts)
    const uniqueTexts = [...new Set(needed.map(n => normalizeText(n.text)))]

    // Query existing audio in batches of 200 texts
    const existingSet = new Set()
    const TEXT_BATCH = 200
    for (let i = 0; i < uniqueTexts.length; i += TEXT_BATCH) {
      const batch = uniqueTexts.slice(i, i + TEXT_BATCH)
      const { data: existing } = await supabase
        .from('course_audio')
        .select('text_normalized, language, role, s3_key')
        .eq('course_code', courseCode)
        .in('text_normalized', batch)

      for (const a of (existing || [])) {
        if (!a.s3_key || !a.s3_key.startsWith('pending/')) {
          existingSet.add(`${normalizeText(a.text_normalized)}|${a.language}|${a.role}`)
        }
      }
    }

    // Also check sibling courses for cross-course sharing candidates
    // (the generateItem function handles actual sharing, this is just for counting)

    // Filter out items that already have audio
    const missing = needed.filter(n => {
      const key = `${normalizeText(n.text)}|${n.language}|${n.role}`
      return !existingSet.has(key)
    })

    // Deduplicate by text|language|role
    const uniqueNeeded = [...new Map(
      missing.map(n => [`${n.text}|${n.language}|${n.role}`, n])
    ).values()]

    logger.info(`[Components] ${needed.length} total needed, ${existingSet.size} already exist, ${uniqueNeeded.length} to generate`)

    // Breakdown by role
    const byRole = {}
    for (const n of uniqueNeeded) {
      byRole[n.role] = (byRole[n.role] || 0) + 1
    }
    logger.info(`[Components] By role: ${JSON.stringify(byRole)}`)

    if (dryRun) {
      return res.json({
        dryRun: true,
        courseCode,
        totalComponents: components.length,
        alreadyHaveAudio: existingSet.size,
        wouldGenerate: uniqueNeeded.length,
        byRole,
        samples: uniqueNeeded.slice(0, 15).map(n => ({
          text: n.text.substring(0, 80),
          role: n.role,
          language: n.language
        }))
      })
    }

    if (uniqueNeeded.length === 0) {
      // Nothing to generate — just link existing audio
      const linkResult = await linkComponentAudio(courseCode, knownLang, targetLang, components, compPresTexts)
      return res.json({
        status: 'completed',
        courseCode,
        generated: 0,
        message: 'All component audio already exists',
        linked: linkResult
      })
    }

    // 7. Start generation
    startWork('generate-components', courseCode, uniqueNeeded.length)

    // Load gender expansions if needed
    let genderMap = new Map()
    if (genderHaikuService.GENDERED_LANGUAGES.includes(targetLang)) {
      genderMap = await genderHaikuService.loadGenderMap(courseCode, supabase)
      logger.info(`Loaded ${genderMap.size} gender expansions from DB`)
    }

    const results = { success: 0, failed: 0, errors: [] }
    results.veracity = veracity.newStats()
    veracity.announceStatus(logger)

    // Generate items using the same pattern as /generate
    const generateItem = async (item) => {
      // PRECIOUS-AUDIO GUARD: never TTS over a human recording at this key.
      // (No voiceId → no upsert key to collide with; fails at dispatch as before.)
      if (item.voiceId) {
        const guardedHuman = await humanRowAtAudioKey(
          courseCode, normalizeForAudio(item.text), item.language, item.role, item.voiceId
        )
        if (guardedHuman) {
          updateWork(item.text, true)
          logger.info(`[PreciousAudio] SKIP generate-components: "${item.text.substring(0, 40)}" (${item.role}) — human recording ${guardedHuman.id} holds this key`)
          return { success: true, item, skippedHuman: true }
        }
      }

      // Cross-course sharing
      try {
        const siblingAudio = await findSiblingCourseClip(
          courseCode, item.text, item.language, item.role, item.voiceId)

        if (siblingAudio?.s3_key) {
          const { data: insertedAudio, error: insertError } = await supabase
            .from('course_audio')
            .upsert({
              course_code: courseCode,
              text: item.text,
              text_normalized: normalizeForAudio(item.text),
              language: item.language,
              role: item.role,
              voice_id: item.voiceId,
              origin: 'tts',
              s3_key: siblingAudio.s3_key,
              duration_ms: siblingAudio.duration_ms,
              word_boundaries: siblingAudio.word_boundaries || null
            }, {
              onConflict: 'course_code,text_normalized,language,role,voice_id'
            })
            .select('id')
            .single()

          if (!insertError && insertedAudio) {
            updateWork(item.text, true)
            logger.info(`Shared: ${item.role} - "${item.text.substring(0, 40)}..." (sibling)`)
            return { success: true, item, shared: true }
          }
        }
      } catch (e) {
        // Fall through to TTS generation
      }

      // TTS generation
      if (typeof item.voiceId !== 'string' || !item.voiceId) {
        throw new Error(`No voice configured for role ${item.role} — fill in the course voice_config`)
      }
      const [provider, voiceName] = item.voiceId.split('_', 2)
      const speed = item.speed || 1.0

      // Gender expansion
      let textForTTS = item.text
      const genderKey = `${item.text}|${item.language}|${item.role}`
      const genderResult = genderMap.get(genderKey)
      if (genderResult?.wasModified) {
        textForTTS = genderResult.expandedText
      } else if ((item.role === 'target1' || item.role === 'target2') && genderService.hasGenderMarker(item.text)) {
        const markerResult = genderService.analyzeAndExpand(item.text, item.language, item.role)
        if (markerResult.wasModified) textForTTS = markerResult.expandedText
      }

      const renderAndMaster = async () => {
        let rawAudioBuffer, wordBoundaries
        if (provider === 'azure') {
          ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'azure', {
            subscriptionKey: process.env.AZURE_SPEECH_KEY,
            region: process.env.AZURE_SPEECH_REGION || 'westeurope',
            voiceName, speed
          }))
        } else if (provider === 'elevenlabs') {
          ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'elevenlabs', {
            apiKey: process.env.ELEVENLABS_API_KEY,
            voiceId: voiceName, speed
          }))
        } else if (provider === 'xai') {
          ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'xai', {
            apiKey: process.env.XAI_API_KEY,
            voiceId: voiceName,
            language: toBcp47(item.language),
          }))
        } else {
          throw new Error(`Unknown TTS provider: ${provider}`)
        }

        const { buffer, durationMs } = await masterAudio(rawAudioBuffer, textForTTS)
        return { buffer, durationMs, wordBoundaries }
      }

      // PRE-PUBLISH VERACITY GATE — see the same block in /generate.
      const gated = await veracity.renderChecked({
        render: renderAndMaster,
        expectedText: textForTTS,
        language: item.language,
        stats: results.veracity,
        logger,
        meta: { courseCode, role: item.role, voiceId: item.voiceId, originalText: item.text },
      })
      if (!gated.published) {
        throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason}, CER ${gated.verdict?.cer})`)
      }
      const { buffer: masteredBuffer, durationMs, wordBoundaries } = gated

      const audioId = uuidv4().toUpperCase()
      const s3Key = `mastered/${audioId}.mp3`

      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: masteredBuffer,
        ContentType: 'audio/mpeg',
        CacheControl: AUDIO_CACHE_CONTROL,
      }))

      const { data: insertedAudio, error: insertError } = await supabase
        .from('course_audio')
        .upsert({
          course_code: courseCode,
          text: item.text,
          text_normalized: normalizeForAudio(item.text),
          language: item.language,
          role: item.role,
          voice_id: item.voiceId,
          origin: 'tts',
          s3_key: s3Key,
          duration_ms: durationMs,
          word_boundaries: wordBoundaries || null,
          ...veracity.verdictColumns(gated.verdict, {
            checker: 'phase8-generate-components',
            attempts: gated.attempts,
          })
        }, {
          onConflict: 'course_code,text_normalized,language,role,voice_id'
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      updateWork(item.text, true)
      logger.info(`Generated: ${item.role} - "${item.text.substring(0, 30)}..."`)
      return { success: true, item }
    }

    // Process in parallel batches with timeout
    for (let i = 0; i < uniqueNeeded.length; i += concurrencyToUse) {
      if (currentWork.cancelled) break

      const batch = uniqueNeeded.slice(i, i + concurrencyToUse)
      const batchNum = Math.floor(i / concurrencyToUse) + 1
      const totalBatches = Math.ceil(uniqueNeeded.length / concurrencyToUse)
      logger.info(`[Components] Batch ${batchNum}/${totalBatches} (${batch.length} items)`)

      const withTimeout = (fn, ms = 120_000) => Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms / 1000}s`)), ms))
      ])

      const batchResults = await Promise.allSettled(batch.map(item => withTimeout(() => generateItem(item))))

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j]
        if (result.status === 'fulfilled') {
          results.success++
        } else {
          results.failed++
          const item = batch[j]
          results.errors.push({
            text: item.text.substring(0, 50),
            role: item.role,
            error: result.reason?.message || 'Unknown error'
          })
          updateWork(item.text, false, result.reason?.message)
        }
      }
    }

    const wasCancelled = currentWork.cancelled
    endWork()

    // 8. Link audio IDs back to component phrases
    let linkResult = {}
    if (!wasCancelled) {
      linkResult = await linkComponentAudio(courseCode, knownLang, targetLang, components, compPresTexts)
    }

    if (!wasCancelled && results.success > 0) {
      await bumpCourseVersion(supabase, courseCode, 'patch')
      // Integer revalidation key — once per run — so the app picks up the
      // new component audio.
      await bumpCourseRevalidation(supabase, courseCode)
    }

    // Pre-publish veracity gate counts — see the same block in /generate.
    const vLine = veracity.formatStats(results.veracity)
    if (results.veracity.quarantined > 0 || results.veracity.unchecked > 0) logger.error(`[audio-veracity] ${courseCode}: ${vLine}`)
    else logger.info(`[audio-veracity] ${courseCode}: ${vLine}`)

    res.json({
      status: wasCancelled ? 'cancelled' : 'completed',
      courseCode,
      total: uniqueNeeded.length,
      success: results.success,
      failed: results.failed,
      cancelled: wasCancelled,
      veracity: results.veracity,
      errors: results.errors.slice(0, 10),
      linked: linkResult
    })

  } catch (error) {
    logger.error('Generate components error:', error)
    endWork()
    res.status(500).json({ error: error.message })
  }
})

/**
 * Link audio IDs from course_audio to component phrases
 * Targeted linking — only touches component rows, not all phrases
 */
async function linkComponentAudio(courseCode, knownLang, targetLang, components, compPresTexts) {
  const result = { known: 0, target1: 0, target2: 0, presentation: 0 }

  // Build audio lookup from ALL course_audio for this course
  // Using .in('text_normalized', batch) with long Unicode strings can exceed
  // PostgREST URL length limits, causing silent failures. Instead, fetch all
  // audio for the relevant roles and build the map locally.
  const audioMap = new Map() // "normalized|lang|role" -> preferred course_audio row

  for (const role of ['known', 'target1', 'target2', 'presentation']) {
    let offset = 0
    while (true) {
      const { data, error } = await supabase
        .from('course_audio')
        .select('id, text_normalized, language, role, s3_key, origin, created_at')
        .eq('course_code', courseCode)
        .eq('role', role)
        .not('s3_key', 'like', 'pending/%')
        .range(offset, offset + 999)
      if (error || !data?.length) break
      for (const a of data) {
        // human > newest > deterministic — never arbitrary when keys collide
        const key = `${normalizeText(a.text_normalized)}|${a.language}|${a.role}`
        audioMap.set(key, pickPreferredAudioRow(audioMap.get(key), a))
      }
      if (data.length < 1000) break
      offset += 1000
    }
  }

  logger.info(`[LinkComponents] Audio map has ${audioMap.size} entries`)

  // Update each component phrase
  for (const comp of components) {
    const updates = {}

    const knownAudioId = audioMap.get(`${normalizeText(comp.known_text)}|${knownLang}|known`)?.id
    if (knownAudioId && comp.known_audio_id !== knownAudioId) {
      updates.known_audio_id = knownAudioId
      result.known++
    }

    const t1AudioId = audioMap.get(`${normalizeText(comp.target_text)}|${targetLang}|target1`)?.id
    if (t1AudioId && comp.target1_audio_id !== t1AudioId) {
      updates.target1_audio_id = t1AudioId
      result.target1++
    }

    const t2AudioId = audioMap.get(`${normalizeText(comp.target_text)}|${targetLang}|target2`)?.id
    if (t2AudioId && comp.target2_audio_id !== t2AudioId) {
      updates.target2_audio_id = t2AudioId
      result.target2++
    }

    const presText = compPresTexts.get(comp.id)
    if (presText) {
      const presAudioId = audioMap.get(`${normalizeText(presText)}|${knownLang}|presentation`)?.id
      if (presAudioId && comp.presentation_audio_id !== presAudioId) {
        updates.presentation_audio_id = presAudioId
        result.presentation++
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('course_practice_phrases')
        .update(updates)
        .eq('id', comp.id)
    }
  }

  logger.info(`[LinkComponents] Linked: known=${result.known}, target1=${result.target1}, target2=${result.target2}, presentation=${result.presentation}`)
  return result
}

// =============================================================================
// COMPONENT AUDIO SPLICING — extract component words from parent M-LEGO audio
// =============================================================================

/**
 * Download an audio file from S3 and return as Buffer
 * @param {string} s3Key - S3 key (e.g. "mastered/UUID.mp3")
 * @returns {Promise<Buffer>}
 */
async function downloadFromS3(s3Key) {
  const response = await s3.send(new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key
  }))
  const chunks = []
  for await (const chunk of response.Body) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

/**
 * Find word boundary entries matching component text within parent word boundaries.
 * Handles multi-word components by finding consecutive matching boundaries.
 *
 * @param {string} componentText - The component word/phrase to find (e.g. "speak")
 * @param {Array<{text: string, offset: number, duration: number}>} wordBoundaries - Parent word boundaries
 * @returns {{startMs: number, endMs: number}|null} Start and end timestamps, or null if not found
 */
function findComponentBoundaries(componentText, wordBoundaries) {
  if (!wordBoundaries?.length || !componentText) return null

  const compWords = componentText.trim().toLowerCase().split(/\s+/)

  // Try exact multi-word match first
  for (let i = 0; i <= wordBoundaries.length - compWords.length; i++) {
    let allMatch = true
    for (let j = 0; j < compWords.length; j++) {
      const wbText = wordBoundaries[i + j].text.toLowerCase()
      if (wbText !== compWords[j]) {
        allMatch = false
        break
      }
    }
    if (allMatch) {
      const first = wordBoundaries[i]
      const last = wordBoundaries[i + compWords.length - 1]
      return {
        startMs: first.offset,
        endMs: last.offset + last.duration
      }
    }
  }

  // Fallback: single-word component, try partial match (e.g. punctuation differences)
  if (compWords.length === 1) {
    const target = compWords[0].replace(/[^\p{L}\p{N}]/gu, '')
    for (const wb of wordBoundaries) {
      const wbClean = wb.text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
      if (wbClean === target) {
        return { startMs: wb.offset, endMs: wb.offset + wb.duration }
      }
    }
  }

  return null
}

/**
 * Splice a segment from parent audio using ffmpeg.
 * Uses simple volume normalization (not loudnorm) to avoid minimum-duration issues.
 *
 * @param {Buffer} parentAudioBuffer - Full parent audio
 * @param {number} startMs - Start offset in milliseconds
 * @param {number} endMs - End offset in milliseconds
 * @param {number} paddingMs - Padding to add before/after the splice (default 20ms)
 * @returns {Promise<{buffer: Buffer, durationMs: number}>}
 */
async function spliceAudio(parentAudioBuffer, startMs, endMs, paddingMs = 20) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audio-splice-'))
  const parentPath = path.join(tempDir, 'parent.mp3')
  const splicedPath = path.join(tempDir, 'spliced.mp3')

  try {
    await fs.writeFile(parentPath, parentAudioBuffer)

    // Add padding but don't go below 0
    const actualStart = Math.max(0, startMs - paddingMs)
    const durationMs = (endMs + paddingMs) - actualStart

    // Extract the segment and encode via the real LAME binary. ffmpeg's MP3
    // muxer writes an ID3v2 + bogus LAME-extension header that breaks
    // iOS/AVPlayer playback — every other encode site pipes ffmpeg→lame for
    // this reason; this splicer was the last one still using the bad muxer.
    // Trim with atrim (sample-accurate) and no loudnorm: component words can be
    // shorter than loudnorm's ~400ms minimum, and the slice must keep the
    // parent's level so it matches how the word sounds inside its phrase.
    // ANTI_CLICK_FADE: both cut points land mid-waveform in the parent, so
    // without the 8ms boundary fades every splice starts/ends on a step.
    const startSec = actualStart / 1000
    const endSec = (actualStart + durationMs) / 1000
    await audioProcessor.ffmpegFilterToLameMp3(parentPath, splicedPath, {
      filterChain: `atrim=start=${startSec}:end=${endSec},asetpts=PTS-STARTPTS,${audioProcessor.ANTI_CLICK_FADE}`
    })

    // Get actual duration from the spliced file
    const metadata = await audioProcessor.getAudioMetadata(splicedPath)
    const actualDurationMs = Math.round(metadata.duration * 1000)

    const splicedBuffer = await fs.readFile(splicedPath)

    return { buffer: splicedBuffer, durationMs: actualDurationMs }
  } finally {
    await fs.remove(tempDir)
  }
}

/**
 * POST /splice-components/:courseCode
 *
 * For each component phrase missing target1/target2 audio:
 * 1. Find the parent M-LEGO's course_audio record (has word_boundaries)
 * 2. Download the parent audio from S3
 * 3. Find the component word(s) in word_boundaries
 * 4. Splice out the segment with ffmpeg
 * 5. Upload splice to S3, create course_audio record
 * 6. Link audio ID to the component phrase
 */
app.post('/splice-components/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { dryRun = false, roles = ['target1', 'target2'] } = req.body || {}

    if (currentWork.active) {
      return res.status(409).json({
        error: 'Another job is already running',
        activeJob: { operation: currentWork.operation, courseCode: currentWork.courseCode }
      })
    }

    // 1. Load course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('course_code, known_lang, target_lang')
      .eq('course_code', courseCode)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const { target_lang: targetLang } = course

    // 2. Load component phrases missing audio for requested roles
    const { data: components, error: compError } = await supabase
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, known_text, target_text, target1_audio_id, target2_audio_id')
      .eq('course_code', courseCode)
      .eq('phrase_role', 'component')
      .order('seed_number')
      .order('lego_index')

    if (compError) throw compError
    if (!components?.length) {
      return res.json({ success: true, message: 'No component phrases found', spliced: 0 })
    }

    // Filter to those actually missing audio
    const needsSplice = components.filter(c => {
      if (roles.includes('target1') && !c.target1_audio_id) return true
      if (roles.includes('target2') && !c.target2_audio_id) return true
      return false
    })

    if (!needsSplice.length) {
      return res.json({ success: true, message: 'All component phrases already have audio', spliced: 0 })
    }

    // 3. Load parent M-LEGOs for these components
    const parentSeedNumbers = [...new Set(needsSplice.map(c => c.seed_number))]
    const { data: parentLegos } = await supabase
      .from('course_legos')
      .select('seed_number, lego_index, target_text, type')
      .eq('course_code', courseCode)
      .eq('type', 'M')
      .in('seed_number', parentSeedNumbers)

    const parentMap = new Map()
    for (const l of (parentLegos || [])) {
      parentMap.set(`${l.seed_number}:${l.lego_index}`, l)
    }

    // 4. Load parent M-LEGO audio records (with word boundaries)
    const parentTexts = [...new Set([...(parentLegos || [])].map(l => normalizeForAudio(l.target_text)))]

    // Batch query parent audio
    const parentAudioMap = new Map() // normalizedText -> {s3_key, word_boundaries}
    const BATCH = 200
    for (let i = 0; i < parentTexts.length; i += BATCH) {
      const batch = parentTexts.slice(i, i + BATCH)
      for (const role of roles) {
        const { data: audioRows } = await supabase
          .from('course_audio')
          .select('text_normalized, s3_key, word_boundaries')
          .eq('course_code', courseCode)
          .eq('language', targetLang)
          .eq('role', role)
          .not('s3_key', 'like', 'pending/%')
          .not('word_boundaries', 'is', null)
          .in('text_normalized', batch)

        for (const row of (audioRows || [])) {
          parentAudioMap.set(`${row.text_normalized}|${role}`, row)
        }
      }
    }

    // 5. Build splice plan
    const splicePlan = []
    const skipped = { noParent: 0, noParentAudio: 0, noBoundaries: 0, noMatch: 0 }

    for (const comp of needsSplice) {
      const parent = parentMap.get(`${comp.seed_number}:${comp.lego_index}`)
      if (!parent) { skipped.noParent++; continue }

      const parentTextNorm = normalizeForAudio(parent.target_text)

      for (const role of roles) {
        // Skip if this component already has audio for this role
        if (role === 'target1' && comp.target1_audio_id) continue
        if (role === 'target2' && comp.target2_audio_id) continue

        const parentAudio = parentAudioMap.get(`${parentTextNorm}|${role}`)
        if (!parentAudio) { skipped.noParentAudio++; continue }
        if (!parentAudio.word_boundaries?.length) { skipped.noBoundaries++; continue }

        const bounds = findComponentBoundaries(comp.target_text, parentAudio.word_boundaries)
        if (!bounds) { skipped.noMatch++; continue }

        splicePlan.push({
          componentId: comp.id,
          componentText: comp.target_text,
          parentText: parent.target_text,
          parentS3Key: parentAudio.s3_key,
          parentWordBoundaries: parentAudio.word_boundaries,
          role,
          language: targetLang,
          startMs: bounds.startMs,
          endMs: bounds.endMs
        })
      }
    }

    logger.info(`[Splice] Plan: ${splicePlan.length} splices, skipped: ${JSON.stringify(skipped)}`)

    if (dryRun) {
      return res.json({
        dryRun: true,
        courseCode,
        totalComponents: components.length,
        needingSplice: needsSplice.length,
        wouldSplice: splicePlan.length,
        skipped,
        samples: splicePlan.slice(0, 15).map(s => ({
          component: s.componentText,
          parent: s.parentText.substring(0, 60),
          role: s.role,
          startMs: s.startMs,
          endMs: s.endMs,
          durationMs: s.endMs - s.startMs
        }))
      })
    }

    if (!splicePlan.length) {
      return res.json({
        success: true,
        message: 'No spliceable components found',
        spliced: 0,
        skipped
      })
    }

    // 6. Execute splices
    startWork('splice-components', courseCode, splicePlan.length)

    // Cache downloaded parent audio to avoid re-downloading the same file
    const parentAudioCache = new Map() // s3Key -> Buffer
    const results = { success: 0, failed: 0, errors: [] }

    // Process sequentially to manage memory (parent audio files can be large)
    for (const splice of splicePlan) {
      if (currentWork.cancelled) break

      try {
        // PRECIOUS-AUDIO GUARD: if a human recording occupies this component's
        // audio key, keep it — link the phrase to the human take, never splice over.
        const guardedHuman = await humanRowAtAudioKey(
          courseCode, normalizeForAudio(splice.componentText), splice.language, splice.role, 'spliced'
        )
        if (guardedHuman) {
          const humanAudioCol = splice.role === 'target1' ? 'target1_audio_id' : 'target2_audio_id'
          await supabase
            .from('course_practice_phrases')
            .update({ [humanAudioCol]: guardedHuman.id })
            .eq('id', splice.componentId)
          results.success++
          updateWork(`${splice.componentText} (${splice.role})`, true)
          logger.info(`[PreciousAudio] SKIP splice: "${splice.componentText}" (${splice.role}) — human recording ${guardedHuman.id} holds this key, linked instead`)
          continue
        }

        // Download parent audio (with cache)
        let parentBuffer = parentAudioCache.get(splice.parentS3Key)
        if (!parentBuffer) {
          parentBuffer = await downloadFromS3(splice.parentS3Key)
          parentAudioCache.set(splice.parentS3Key, parentBuffer)
        }

        // Splice out the component
        const { buffer: splicedBuffer, durationMs } = await spliceAudio(
          parentBuffer, splice.startMs, splice.endMs
        )

        // Upload to S3
        const audioId = uuidv4().toUpperCase()
        const s3Key = `mastered/${audioId}.mp3`

        await s3.send(new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: splicedBuffer,
          ContentType: 'audio/mpeg',
          CacheControl: AUDIO_CACHE_CONTROL,
        }))

        // Insert course_audio record
        const { data: insertedAudio, error: insertError } = await supabase
          .from('course_audio')
          .upsert({
            course_code: courseCode,
            text: splice.componentText,
            text_normalized: normalizeForAudio(splice.componentText),
            language: splice.language,
            role: splice.role,
            voice_id: 'spliced',
            origin: 'tts',
            s3_key: s3Key,
            duration_ms: durationMs
          }, {
            onConflict: 'course_code,text_normalized,language,role,voice_id'
          })
          .select('id')
          .single()

        if (insertError) throw insertError

        // Link audio ID directly to the component phrase
        const audioCol = splice.role === 'target1' ? 'target1_audio_id' : 'target2_audio_id'
        await supabase
          .from('course_practice_phrases')
          .update({ [audioCol]: insertedAudio.id })
          .eq('id', splice.componentId)

        results.success++
        updateWork(`${splice.componentText} (${splice.role})`, true)
        logger.info(`[Splice] OK: "${splice.componentText}" from "${splice.parentText.substring(0, 30)}..." (${splice.role}, ${durationMs}ms)`)

      } catch (err) {
        results.failed++
        results.errors.push({
          component: splice.componentText,
          parent: splice.parentText.substring(0, 50),
          role: splice.role,
          error: err.message
        })
        updateWork(`${splice.componentText} (${splice.role})`, false, err.message)
        logger.error(`[Splice] FAIL: "${splice.componentText}" - ${err.message}`)
      }
    }

    const wasCancelled = currentWork.cancelled
    endWork()

    if (!wasCancelled && results.success > 0) {
      await bumpCourseVersion(supabase, courseCode, 'patch')
      // Integer revalidation key — once per run — so the app picks up the
      // spliced component audio.
      await bumpCourseRevalidation(supabase, courseCode)
    }

    res.json({
      status: wasCancelled ? 'cancelled' : 'completed',
      courseCode,
      total: splicePlan.length,
      success: results.success,
      failed: results.failed,
      skipped,
      errors: results.errors.slice(0, 20)
    })

  } catch (err) {
    endWork()
    logger.error('[Splice] Error:', err)
    res.status(500).json({ error: err.message })
  }
})

// =============================================================================
// POD AUDIO GENERATION (Layer 2 listening pods)
// =============================================================================
// Uses the same masterAudio + S3 + course_audio pipeline as course audio.
// Pod sentences live in listening_pod_sentences. Both target and known audio
// use per-speaker voice assignments from listening_pods.speakers (set by
// pod-sync, sourced from app_config.pod_voice_pools).
//
// Pod speakers schema (set by tools/pod-sync.cjs):
//   { [speaker]: { gender, target: {provider,voice_id,name}, known: {...} } }
// Legacy shape (pre-2026-05-05 pods) had `{ provider, voice_id, gender }`
// with no known assignment. Those fall through to ctx.knownVoice for known
// audio — preserves existing audio on previously-shipped pods.

// xAI's published rate, docs.x.ai/docs/pricing (checked 2026-07-28): Text to
// Speech $15.00 / 1M chars. The old value here was $4.20/1M — the figure from
// launch press coverage, never a billed rate — which under-estimated every xAI
// cost projection in the repo by 3.6x. Azure S0 is $4/1M by comparison
// (services/audio-generation-planner.cjs), so xAI is ~3.75x Azure, NOT
// "near-identical" as the old comment claimed.
const POD_CHARS_TO_COST = 15.00 / 1_000_000

// Safe ceiling for concurrent xAI TTS calls during pod generation. xAI's
// /v1/tts throws intermittent 500 "Timeout expired" / ECONNRESET under heavy
// fan-out, so we keep the worker pool small. The /generate-pods endpoint
// clamps any caller-supplied concurrency to this ceiling.
const POD_GEN_CONCURRENCY_DEFAULT = 5
const POD_GEN_CONCURRENCY_MAX = 6

// Default Azure neural voice per Azure locale, used as the safety-net voice
// when xAI synthesis fails for a clip and we fall back to Azure. These are
// standard, broadly-available neural voices; the map covers the SSi launch
// languages plus Croatian. Unlisted locales fall through to a null lookup and
// the clip is left for xAI to retry on a later run (no silent wrong-voice).
const DEFAULT_AZURE_VOICE_BY_LOCALE = {
  'en-GB': 'en-GB-SoniaNeural',
  'en-US': 'en-US-JennyNeural',
  'cy-GB': 'cy-GB-NiaNeural',
  'es-ES': 'es-ES-ElviraNeural',
  'es-MX': 'es-MX-DaliaNeural',
  'fr-FR': 'fr-FR-DeniseNeural',
  'de-DE': 'de-DE-KatjaNeural',
  'it-IT': 'it-IT-ElsaNeural',
  'pt-PT': 'pt-PT-RaquelNeural',
  'pt-BR': 'pt-BR-FranciscaNeural',
  'nl-NL': 'nl-NL-ColetteNeural',
  'pl-PL': 'pl-PL-ZofiaNeural',
  'tr-TR': 'tr-TR-EmelNeural',
  'hr-HR': 'hr-HR-GabrijelaNeural',
}

/**
 * Pick the Azure safety-net voice for a clip whose primary (xAI) provider
 * failed after all retries.
 *
 * Resolution order:
 *   1. A course-configured Azure voice for this track, if one is Azure already
 *      (known track → ctx.knownVoice; either track → the course voice_config
 *      role voice). This reuses the voice the course author actually chose.
 *   2. A standard default Azure neural voice for the clip's language locale
 *      (DEFAULT_AZURE_VOICE_BY_LOCALE).
 *
 * Returns { voice_id, provider:'azure', gender } or null if no Azure voice can
 * be determined (caller then leaves the clip unsynthesised rather than guess).
 *
 * @param {object} ctx - course context from getCourseContext (knownVoice, voiceConfig)
 * @param {('target'|'known')} track - which pod track failed
 * @param {string} language - the clip's language code (target or known lang)
 */
function pickAzureFallbackVoice(ctx, track, language) {
  // 1a. Known track: the course's known voice is often already Azure.
  if (track === 'known' && ctx.knownVoice && (ctx.knownVoice.provider || 'azure') === 'azure' && ctx.knownVoice.voice_id) {
    return { voice_id: ctx.knownVoice.voice_id, provider: 'azure', gender: ctx.knownVoice.gender || 'n' }
  }

  // 1b. Either track: if the course voice_config role voice is Azure, reuse it.
  const voices = (ctx.voiceConfig && (ctx.voiceConfig.voices || ctx.voiceConfig)) || {}
  const roleVoice = track === 'target' ? (voices.target1 || voices.target) : voices.known
  if (roleVoice && (roleVoice.provider || 'azure') === 'azure') {
    const vid = roleVoice.voiceId || roleVoice.voice_id
    if (vid) return { voice_id: vid, provider: 'azure', gender: roleVoice.gender || 'n' }
  }

  // 2. Standard default Azure neural voice for the language's Azure locale.
  let locale = null
  try {
    locale = getAzureLocale(language)
  } catch (_) {
    locale = null  // language not Azure-configured
  }
  const voiceId = locale ? DEFAULT_AZURE_VOICE_BY_LOCALE[locale] : null
  if (voiceId) {
    return { voice_id: voiceId, provider: 'azure', gender: 'n' }
  }

  return null
}

// Canonical speaker name = parens stripped. Mirrors tools/pod-sync.cjs so the
// same key collapses timed/gendered variants ("Susjed (08:00)" / "Susjed (M)"
// → "Susjed") into one voice assignment.
function canonicalSpeakerName(speaker) {
  return (speaker || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Resolve the voice for a pod sentence's audio on a given track.
 * track: 'target' | 'known'
 * Returns { voice_id, provider, gender } or null if unresolvable for this track.
 */
function resolvePodSpeakerVoice(podSpeakers, speaker, track) {
  const mapping = podSpeakers || {}
  // Try canonical first (new pods), fall back to raw key (legacy pods that
  // stored raw speaker names), fall back to _default.
  const canon = canonicalSpeakerName(speaker)
  const entry = mapping[canon] || mapping[speaker] || mapping._default
  if (!entry) return null

  // New shape (per-track). `locale` is the explicit TTS handle the coverage map
  // resolved (e.g. pt-PT for European Portuguese, es-MX, native fr, Azure hr-HR);
  // it overrides the default toBcp47() mapping in buildPodTTSConfig so regional
  // variants render correctly instead of collapsing to the base language.
  if (entry[track] && entry[track].voice_id) {
    return {
      voice_id: entry[track].voice_id,
      provider: entry[track].provider || 'azure',
      gender: entry.gender || 'n',
      locale: entry[track].locale || null,
    }
  }
  // Legacy shape only carries the target voice
  if (track === 'target' && entry.voice_id) {
    return {
      voice_id: entry.voice_id,
      provider: entry.provider || 'xai',
      gender: entry.gender || 'n',
    }
  }
  return null
}

/**
 * Build the TTS config for a single audio generation call.
 */
function buildPodTTSConfig(voice, language, courseCode) {
  // courseCode is carried into the TTS config so tts-service's chokepoint can
  // refuse human-voice-only courses (assertNotHumanVoiceCourse) — defence in
  // depth behind the entry-point guards.
  const base = { voiceId: voice.voice_id, speed: 1.0, courseCode }
  if (voice.provider === 'xai') {
    base.apiKey = process.env.XAI_API_KEY
    // Prefer the coverage-map locale carried on the voice (pt-PT, es-MX, ar-EG,
    // native fr/zh, …). toBcp47() strips region (pt-PT→pt=Brazilian), so only
    // use it as the fallback when a voice has no explicit locale.
    base.language = voice.locale || toBcp47(language)
  } else if (voice.provider === 'elevenlabs') {
    base.apiKey = process.env.ELEVENLABS_API_KEY
  } else {
    // azure (or unspecified)
    base.subscriptionKey = process.env.AZURE_SPEECH_KEY
    base.region = process.env.AZURE_SPEECH_REGION || 'westeurope'
    base.voiceName = voice.voice_id
  }
  return base
}

/**
 * Look up existing course_audio by (course_code, text_normalized, language, role, voice_id).
 * Returns the audio row's id if a match exists, else null.
 */
async function findExistingAudio(courseCode, text, language, role, voiceId) {
  const textNorm = normalizeForAudio(text)
  const { data, error } = await supabase
    .from('course_audio')
    .select('id, language, voice_id')
    .eq('course_code', courseCode)
    .in('text_normalized', audioKeyCandidates(textNorm))
    .eq('role', role)
    .limit(200)
  if (error) {
    // Fail CLOSED: a swallowed lookup error used to fall through to the upsert,
    // which on a key conflict would overwrite the existing row (including a
    // precious origin='human' one). Failing the clip is recoverable; a clobbered
    // human recording is not.
    throw new Error(`[Pod] findExistingAudio failed: ${error.message}`)
  }
  // Language and voice are matched canonically, in JS: an .eq() on one spelling
  // could not see the same clip stored under the other, and "clip does not
  // exist" here means a second paid render. Strict — a false positive would
  // relink a pod line to the wrong audio.
  const match = (data || []).find(row =>
    sameLanguage(language, row.language) && sameVoice(voiceId, row.voice_id))
  return match?.id || null
}

/**
 * Split a pod TURN into its sentences, for the pause-cue insertion below.
 *
 * This expression is deliberately IDENTICAL to the one the splicer cuts on
 * (tools/pods/splice-sentence-clips.cjs SENTENCE_SPLIT, and the same in
 * tools/render-sentence-takes.cjs). Whatever puts the pause cue IN and whatever
 * cuts ON it must agree, or the splicer looks for a silence the generator never
 * engineered — which is exactly the bug this replaces: the old Latin-only
 * /(?<=[.!?…])\s+/ has neither the CJK terminals 。！？ nor a way to fire
 * without following whitespace, so NO Chinese or Japanese turn ever received a
 * pause cue. The 2026-08-24 Pod 1 splice pass had to withdraw 3 Chinese turns
 * because of it: with no engineered sentence pause, the splice margin could not
 * tell a comma pause from a sentence end (1.75 broken vs 1.65 fine).
 *
 * CJK terminals split with or without a following space; Latin marks keep
 * requiring whitespace, so "3.5" and abbreviations stay safe; Arabic ؟ behaves
 * like a Latin ?. Korean uses Latin marks with spaces and was never affected.
 *
 * NOT handled, deliberately: the Devanagari danda ।/॥ — the splicer does not
 * handle it either, and consistency between the two is worth more than a
 * unilateral improvement here. Changing both in one commit is the follow-up.
 *
 * Exported purely so it can be unit-tested without standing up TTS and S3.
 *
 * @param {string} text
 * @returns {string[]} trimmed, non-empty sentences
 */
function splitPodTurnSentences (text) {
  return String(text || '')
    .split(/(?<=[。！？])\s*(?=\S)|(?<=[.!?…؟])\s+(?=\S)/)
    .map(s => s.trim())
    .filter(Boolean)
}

/**
 * Generate one audio clip and insert into course_audio. Returns the audio_id.
 *
 * Resilience: the primary voice (often xAI for known/English clips) is tried
 * first via generateWithRetry (backoff + jitter on transient 5xx/ECONNRESET).
 * If it still fails after all retries AND the primary was xAI, we fall back to
 * an Azure voice for that one clip so it generates rather than staying NULL.
 * The Azure voice is chosen by pickAzureFallbackVoice (course voice → default).
 *
 * IDENTITY vs TTS CUE — one parameter used to do both jobs, and that is where
 * `language='auto'` came from on 7,847 course_audio rows across 36 courses (all
 * of them role='pod_explainer'). `language` was handed to buildPodTTSConfig as
 * the xAI language CUE — where 'auto', 'fr' and 'pt-PT' are legitimate,
 * Tom-validated tuning (tools/pod-voice-coverage.cjs resolveExplainerLanguage,
 * 2026-06-07) — and written verbatim into the identity column, where 'auto' is
 * not a language at all. They are now two parameters:
 *
 *   language        the clip's IDENTITY. Canonicalised; throws on 'auto'.
 *                   Callers resolve it from the course, never from the cue.
 *   ttsLanguageCue  what the provider is told. Unvalidated, passed through
 *                   untouched. Defaults to `language` so every caller that
 *                   never had a cue keeps its exact current behaviour.
 *
 * Nothing about the rendered audio changes: the cue that reaches the provider
 * is the same string it was before.
 *
 * @param {object} args
 * @param {string} args.language - the clip's identity language (canonical)
 * @param {string} [args.ttsLanguageCue] - provider language cue; defaults to `language`
 * @param {object} [args.ctx] - course context (for Azure fallback voice pick)
 * @param {('target'|'known')} [args.track] - which pod track this clip is
 * @param {string} [args.sentenceId] - pod sentence id (for the fallback log line)
 */
async function generatePodAudio({ courseCode, text, language, ttsLanguageCue, role, voice, ctx, track, sentenceId, force }) {
  const identityLanguage = canonicalLanguage(language)
  const cue = (ttsLanguageCue === undefined || ttsLanguageCue === null) ? language : ttsLanguageCue
  // Pod TURN whole-takes: insert a pause cue (" … ") between sentences so the
  // engine PAUSES at each boundary, making the take cleanly splittable per
  // sentence (the newer ElevenLabs/xAI voices otherwise run sentences together,
  // leaving silence-detect nothing to cut on). ONE generation → no cross-sentence
  // voice drift (Tom 2026-06-30). Only multi-sentence target/known turns are
  // affected — atom slices / single-sentence clips are untouched. The pause cue
  // is the canonical text for the clip (dedup + storage below), so a paused take
  // never collides with an old un-paused one; pod display text comes from
  // listening_pod_sentences, not course_audio, so it stays clean.
  let ttsText = text
  if (track === 'target' || track === 'known') {
    const sents = splitPodTurnSentences(text)
    if (sents.length > 1) ttsText = sents.join(' … ')
  }

  // Reuse by text+voice hash — keyed on the ACTUAL synthesised text.
  // force: re-synthesise even when the row exists — the upsert below hits the
  // same conflict key, so the row (and every link to its id) is kept and just
  // gets fresh audio + word_boundaries. Used by the Take G rescue pass.
  const existing = await findExistingAudio(courseCode, ttsText, identityLanguage, role, voice.voice_id)
  if (existing && !force) return { id: existing, reused: true }

  let provider = voice.provider || 'azure'
  let activeVoice = voice
  let audioBuffer, wordBoundaries
  try {
    const ttsConfig = buildPodTTSConfig(activeVoice, cue, courseCode)
    ;({ audioBuffer, wordBoundaries } = await ttsService.generateWithRetry(ttsText, provider, ttsConfig))
  } catch (primaryErr) {
    // xAI is PRIMARY (more natural voices); Azure is the safety net. Only fall
    // back when the primary was xAI — Azure failing has nowhere better to go,
    // and elevenlabs failures aren't in scope for this safety net.
    if (provider !== 'xai') { primaryErr.message = `[STAGE=tts:${provider}] ${primaryErr.message}`; throw primaryErr }

    const kind = track || (role === 'known' ? 'known' : 'target')
    // The fallback voice is picked from a real language, never from the cue —
    // getAzureLocale('auto') has no answer, and that is how an explainer that
    // lost xAI used to fall back to a voice chosen without a locale at all.
    const azureVoice = ctx ? pickAzureFallbackVoice(ctx, kind, identityLanguage) : null
    if (!azureVoice) {
      // No Azure voice determinable — surface the original xAI failure so the
      // clip is recorded as failed (not silently wrong-voiced).
      primaryErr.message = `[STAGE=tts:xai,no-azure-fallback] ${primaryErr.message}`; throw primaryErr
    }

    logger.info(`[Pods] fallback xAI→Azure for ${sentenceId || '?'} ${kind} voice=${azureVoice.voice_id} (${primaryErr.message})`)
    provider = 'azure'
    activeVoice = azureVoice
    const azureConfig = buildPodTTSConfig(activeVoice, cue, courseCode)
    try {
      ;({ audioBuffer, wordBoundaries } = await ttsService.generateWithRetry(ttsText, 'azure', azureConfig))
    } catch (e) { e.message = `[STAGE=tts:azure-fallback,xai-also-failed] ${e.message}`; throw e }
  }
  voice = activeVoice  // course_audio row records the voice that actually produced the clip
  let masteredBuffer, durationMs
  try {
    ;({ buffer: masteredBuffer, durationMs } = await masterAudio(audioBuffer, ttsText))
  } catch (e) {
    // Empty/corrupt TTS buffer (buflen=0) usually means a cross-language voice
    // mismatch (e.g. an English voice handed non-English text) — keep prov/voice
    // /buflen so the failure is self-diagnosing.
    e.message = `[STAGE=master prov=${provider} voice=${voice?.voice_id} lang=${identityLanguage} cue=${cue} buflen=${audioBuffer ? audioBuffer.length : -1}] ${e.message}`
    throw e
  }

  const audioId = uuidv4().toUpperCase()
  const s3Key = `mastered/${audioId}.mp3`
  // Retry the upload: after a long TTS synthesis the pooled S3 socket can
  // come back with a transient ECONNRESET — losing a paid render to that is
  // worse than a second attempt on a fresh connection.
  for (let attempt = 1; ; attempt++) {
    try {
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: masteredBuffer,
        ContentType: 'audio/mpeg',
        CacheControl: AUDIO_CACHE_CONTROL,
      }))
      break
    } catch (e) {
      if (attempt >= 3) { e.message = `[STAGE=s3 after ${attempt} attempts] ${e.message}`; throw e }
      await new Promise((r) => setTimeout(r, 600 * attempt))
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('course_audio')
    .upsert({
      course_code: courseCode,
      text: ttsText,
      text_normalized: normalizeForAudio(ttsText),
      language: identityLanguage,
      role,
      // The voice that actually produced the clip, canonically spelt. The raw
      // id above is what the provider was handed; this is what the identity is.
      voice_id: canonicalClipVoiceId(voice.voice_id, voice.provider || provider),
      origin: 'tts',
      s3_key: s3Key,
      duration_ms: durationMs,
      word_boundaries: wordBoundaries && wordBoundaries.length ? wordBoundaries : null,
    }, {
      onConflict: 'course_code,text_normalized,language,role,voice_id',
    })
    .select('id')
    .single()

  if (insertError) throw new Error(`course_audio insert failed: ${insertError.message}`)
  return { id: inserted.id, reused: false, bytes: masteredBuffer.length, chars: text.length }
}

/**
 * Load pod(s) + their sentences for a course. If podIds specified, filter.
 */
async function loadPodsForPlan(courseCode, podIds) {
  let podQuery = supabase.from('listening_pods').select('*').eq('course_code', courseCode)
  if (podIds && podIds.length) podQuery = podQuery.in('id', podIds)
  const { data: pods, error: podsErr } = await podQuery
  if (podsErr) throw new Error(`load pods: ${podsErr.message}`)

  // Load sentences for these pods in one go
  if (!pods || pods.length === 0) return []
  const { data: sentences, error: sErr } = await supabase
    .from('listening_pod_sentences')
    .select('*')
    .in('pod_id', pods.map(p => p.id))
    .order('pod_id').order('global_order')
  if (sErr) throw new Error(`load sentences: ${sErr.message}`)

  const byPod = {}
  for (const p of pods) byPod[p.id] = { ...p, sentences: [] }
  for (const s of sentences) byPod[s.pod_id]?.sentences.push(s)
  return Object.values(byPod)
}

/**
 * Get the course's known/target languages + known voice config.
 */
async function getCourseContext(courseCode) {
  const { data: course, error } = await supabase
    .from('courses').select('known_lang, target_lang, voice_config').eq('course_code', courseCode).single()
  if (error) throw new Error(`course not found: ${error.message}`)
  const vc = course.voice_config || {}
  const knownVoiceRaw = vc.voices?.known || {}
  // voice_id stays RAW here: this object is handed to the TTS providers, which
  // want their own spelling ('en-GB-SoniaNeural' in Azure's SSML, 'leo' at
  // xAI). The canonical spelling is composed at the DB boundary in
  // generatePodAudio, so the bare default below no longer reaches a column.
  const knownVoice = {
    voice_id: knownVoiceRaw.voiceId || knownVoiceRaw.voice_id || 'en-GB-SoniaNeural',
    provider: knownVoiceRaw.provider || 'azure',
    gender: knownVoiceRaw.gender || 'f',
  }
  return {
    knownLang: course.known_lang,
    targetLang: course.target_lang,
    knownVoice,
    voiceConfig: vc,  // raw voice_config — pickAzureFallbackVoice reads role voices for the Azure safety net
  }
}

// =============================================================================
// GET /plan-pods/:courseCode — what pod audio needs generating
// =============================================================================

app.get('/plan-pods/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const podIds = req.query.pods ? req.query.pods.split(',') : null

    const ctx = await getCourseContext(courseCode)
    const pods = await loadPodsForPlan(courseCode, podIds)

    const podPlans = []
    let totalChars = 0
    let totalMissing = 0

    for (const pod of pods) {
      const missing = { target: [], known: [] }
      for (const s of pod.sentences) {
        if (!s.target_audio_id) {
          const voice = resolvePodSpeakerVoice(pod.speakers, s.speaker, 'target')
          missing.target.push({ id: s.id, speaker: s.speaker, voice_id: voice?.voice_id, chars: (s.target_text || '').length })
        }
        if (!s.known_audio_id) {
          // Per-speaker known voice from app_config.pod_voice_pools (via pod-sync).
          // Legacy pods without a known assignment fall through to ctx.knownVoice.
          const voice = resolvePodSpeakerVoice(pod.speakers, s.speaker, 'known') || ctx.knownVoice
          missing.known.push({ id: s.id, speaker: s.speaker, voice_id: voice.voice_id, chars: (s.known_text || '').length })
        }
      }
      const podChars = missing.target.reduce((a, b) => a + b.chars, 0) + missing.known.reduce((a, b) => a + b.chars, 0)
      podPlans.push({
        pod_id: pod.id,
        title: pod.title,
        pod_type: pod.pod_type,
        total_sentences: pod.sentences.length,
        sentences_needing_target: missing.target.length,
        sentences_needing_known: missing.known.length,
        chars: podChars,
        estimated_cost_usd: +(podChars * POD_CHARS_TO_COST).toFixed(4),
        distinct_speakers: [...new Set(pod.sentences.map(s => s.speaker))],
      })
      totalChars += podChars
      totalMissing += missing.target.length + missing.known.length
    }

    res.json({
      course_code: courseCode,
      course_context: { known_lang: ctx.knownLang, target_lang: ctx.targetLang, known_voice: ctx.knownVoice },
      total_clips_to_generate: totalMissing,
      total_chars: totalChars,
      estimated_cost_usd: +(totalChars * POD_CHARS_TO_COST).toFixed(4),
      pods: podPlans,
    })
  } catch (err) {
    logger.error(`[Pods /plan-pods] ${err.message}`)
    res.status(500).json({ error: err.message })
  }
})

// =============================================================================
// POST /generate-pods/:courseCode — actually generate missing audio
// =============================================================================
// Body: { pod_ids?: string[], roles?: ('target'|'known')[], concurrency?: number,
//         sample_limit?: number }
// Default: all pods for the course, both roles, concurrency=5.
//
// SAMPLE-FIRST HARD GATE (Tom's ruling, 2026-08-07). Two modes, and the run
// says which one it is in its first log line:
//
//   SAMPLE — body.sample_limit is a positive integer (capped at
//     POD_SAMPLE_LIMIT_MAX server-side). Skips the approval check and TRUNCATES
//     the work queue to that many clips, picking distinct voices first so the
//     sample actually exercises the casting you are being asked to approve.
//     Always allowed: without it the gate would be unopenable.
//
//   BULK — anything else, INCLUDING a run narrowed by pod_ids or roles. Refused
//     with HTTP 409 unless app_config.pod_voice_approvals holds an approval for
//     this course whose cast_fingerprint equals the live casting. Recast the
//     course and the fingerprint moves, so a stale approval stops counting on
//     its own (services/pod-voice-approvals.cjs; tests alongside it).
//
// Why: 16 eng_for_* courses are cast with Chinese voices on English targets
// right now (docs/pods/pod-redo-scope-2026-08-07.md §4a). A bulk run on that
// casting fails 100% and burns ~19 hours of whisper for nothing.

const POD_SAMPLE_LIMIT_MAX = 10
const podApprovals = require('../pod-voice-approvals.cjs')

app.post('/generate-pods/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const body = req.body || {}
    const podIds = body.pod_ids || null
    const roles = body.roles || ['target', 'known']

    // --- Mode resolution ----------------------------------------------------
    const modeDecision = podApprovals.parseSampleLimit(body.sample_limit, POD_SAMPLE_LIMIT_MAX)
    if (modeDecision.mode === 'error') return res.status(400).json({ error: modeDecision.message })
    const sampleLimit = modeDecision.mode === 'sample' ? modeDecision.limit : null

    if (sampleLimit === null) {
      const gate = await podApprovals.checkApproval(supabase, courseCode)
      if (!gate.ok) {
        logger.warn(`[Pods] BULK REFUSED ${courseCode}: ${gate.reason} (live cast ${gate.live_fingerprint})`)
        return res.status(409).json({
          error: 'pod_voices_not_approved',
          reason: gate.reason,
          message: gate.message,
          course_code: courseCode,
          live_cast_fingerprint: gate.live_fingerprint,
          approval: gate.approval,
          sample_first: {
            how: `POST /generate-pods/${courseCode} with {"sample_limit": 5}`,
            max: POD_SAMPLE_LIMIT_MAX,
          },
        })
      }
      logger.info(`[Pods] BULK mode ${courseCode}: approved by ${gate.approval.approved_by} at ${gate.approval.approved_at}, cast ${gate.live_fingerprint}`)
    } else {
      logger.info(`[Pods] SAMPLE mode ${courseCode}: limit ${sampleLimit} clip(s), approval check skipped`)
    }
    // Cap fan-out: xAI TTS is flaky under heavy concurrency, so clamp to a
    // small safe ceiling (POD_GEN_CONCURRENCY_MAX) regardless of caller input.
    const concurrency = Math.max(1, Math.min(POD_GEN_CONCURRENCY_MAX, body.concurrency || POD_GEN_CONCURRENCY_DEFAULT))

    const ctx = await getCourseContext(courseCode)

    // Optional per-run voice overrides. Useful when you want pod audio to use
    // a different provider (e.g. xAI) than the course's canonical voice_config.
    // Shape: { voice_id: string, provider: 'xai'|'azure'|'elevenlabs', gender?: string }
    if (body.known_voice) {
      ctx.knownVoice = { ...ctx.knownVoice, ...body.known_voice }
      logger.info(`[Pods] Known voice override: ${JSON.stringify(ctx.knownVoice)}`)
    }

    const pods = await loadPodsForPlan(courseCode, podIds)

    // Build a flat work queue: each item is one audio clip to generate.
    const workQueue = []
    for (const pod of pods) {
      for (const s of pod.sentences) {
        if (roles.includes('target') && !s.target_audio_id) {
          workQueue.push({
            kind: 'target',
            sentence_id: s.id,
            pod_id: pod.id,
            text: s.target_text,
            language: ctx.targetLang,
            role: 'target1',
            voice: resolvePodSpeakerVoice(pod.speakers, s.speaker, 'target'),
            link_column: 'target_audio_id',
          })
        }
        if (roles.includes('known') && !s.known_audio_id) {
          // Per-speaker known voice from pod.speakers (new shape), or course-wide
          // ctx.knownVoice for legacy pods that haven't been re-synced.
          const knownVoice = resolvePodSpeakerVoice(pod.speakers, s.speaker, 'known') || ctx.knownVoice
          workQueue.push({
            kind: 'known',
            sentence_id: s.id,
            pod_id: pod.id,
            text: s.known_text,
            language: ctx.knownLang,
            role: 'known',
            voice: knownVoice,
            link_column: 'known_audio_id',
          })
        }
      }
    }

    // SAMPLE truncation. Take the first clip of each distinct
    // (voice, provider, track) before any second clip of a voice already
    // covered — a 5-clip sample that happened to be five lines from one
    // character would approve nothing about the rest of the cast.
    const queuedBeforeSample = workQueue.length
    if (sampleLimit !== null) {
      const sample = podApprovals.selectSample(workQueue, sampleLimit)
      workQueue.length = 0
      workQueue.push(...sample)
      logger.info(`[Pods] SAMPLE ${courseCode}: truncated ${queuedBeforeSample} → ${workQueue.length} clip(s)`)
    }

    logger.info(`[Pods] ${sampleLimit === null ? 'BULK' : 'SAMPLE'} ${courseCode}: ${workQueue.length} clips queued across ${pods.length} pod(s) at concurrency ${concurrency}`)

    const startMs = Date.now()
    let generated = 0, reused = 0, failed = 0
    const errors = []

    // Simple parallel batch processor — process `concurrency` items at a time
    async function worker(items) {
      for (const item of items) {
        try {
          const result = await generatePodAudio({
            courseCode,
            text: item.text,
            language: item.language,
            role: item.role,
            voice: item.voice,
            ctx,                  // enables Azure fallback when xAI fails
            track: item.kind,     // 'target' | 'known'
            sentenceId: item.sentence_id,
          })

          // Link the audio onto the pod sentence
          const { error: linkErr } = await supabase
            .from('listening_pod_sentences')
            .update({ [item.link_column]: result.id })
            .eq('id', item.sentence_id)
          if (linkErr) throw new Error(`link: ${linkErr.message}`)

          if (result.reused) reused++; else generated++
        } catch (err) {
          failed++
          errors.push({ sentence_id: item.sentence_id, kind: item.kind, error: err.message })
          logger.warn(`[Pods] ${item.sentence_id} ${item.kind}: ${err.message}`)
        }
      }
    }

    // Distribute work across N workers (round-robin)
    const buckets = Array.from({ length: concurrency }, () => [])
    workQueue.forEach((item, i) => buckets[i % concurrency].push(item))
    await Promise.all(buckets.map(b => worker(b)))

    const elapsedMs = Date.now() - startMs
    logger.info(`[Pods] ${courseCode}: ${generated} generated, ${reused} reused, ${failed} failed in ${(elapsedMs / 1000).toFixed(1)}s`)

    res.json({
      course_code: courseCode,
      mode: sampleLimit === null ? 'bulk' : 'sample',
      sample_limit: sampleLimit,
      queued_before_sample: queuedBeforeSample,
      generated,
      reused,
      failed,
      total: workQueue.length,
      elapsed_ms: elapsedMs,
      errors: errors.slice(0, 20),
    })
  } catch (err) {
    logger.error(`[Pods /generate-pods] ${err.message}`)
    res.status(500).json({ error: err.message })
  }
})

// =============================================================================
// REUSE-FIRST REGENERATION
// =============================================================================
// Tom's rule, 2026-08-07, verbatim:
//   "set aside all clips for the first 10 ROUNDS / does this voice x text x
//    lang combination exist already? / find it / then generate all missing clips"
//
// The decision logic lives in services/audio-reuse-planner.cjs (no TTS, no S3,
// unit-tested). This file supplies the two things only phase 8 owns: storage
// verification and the renderer. Nothing here deletes anything — the planner has
// no delete path at all, and neither does this.
//
//   GET  /reuse-plan/:courseCode?rounds=10   read-only, generates nothing
//   POST /reuse-apply/:courseCode            { rounds, dryRun, confirm }
//   GET  /reuse-run/:runId                   result of a finished run
// =============================================================================

const reusePlanner = require('../audio-reuse-planner.cjs')

const REUSE_ARTIFACT_DIR = path.join(__dirname, '..', '..', 'docs', 'audio-repair-2026-08-07')

// A persistent veracity-verdict store, so a band never re-decodes a question an
// earlier band already answered. Bands are disjoint in ROUNDS but not in CLIPS —
// review offsets reach back as far as 2584 rounds, and 35.7% of a rounds-201-210
// plan is clips that rounds 1-200 also plays (measured 2026-08-07). Whisper is the
// dominant cost of the whole exercise, so that overlap is the single cheapest hour
// to buy back.
//
// Safe to keep forever, and deliberately never invalidated: mastered/<uuid>.mp3 is
// WRITE-ONCE (a re-master mints a new key), so the key names the same bytes for all
// time. It is keyed across courses on purpose — the same object answers the same
// question whoever is asking.
//
// Set AUDIO_VERACITY_CACHE=0 to turn it off; it is on by default because a cache
// that cannot go stale has no failure mode worth a flag.
const VERDICT_CACHE_PATH = process.env.AUDIO_VERACITY_CACHE_PATH
  || path.join(os.homedir(), '.audio-veracity-verdicts.json')

function loadVerdictCache() {
  if (process.env.AUDIO_VERACITY_CACHE === '0') return null
  let m = new Map()
  try {
    if (fs.existsSync(VERDICT_CACHE_PATH)) {
      m = new Map(Object.entries(fs.readJsonSync(VERDICT_CACHE_PATH)))
      logger.info(`[ReuseFirst] verdict cache: ${m.size} remembered decodes from ${VERDICT_CACHE_PATH}`)
    }
  } catch (e) {
    // A corrupt cache is a cost problem, never a correctness one — start empty.
    logger.warn(`[ReuseFirst] verdict cache unreadable (${e.message}) — starting empty`)
    m = new Map()
  }
  let dirty = 0
  const flush = () => {
    if (!dirty) return
    try {
      fs.outputJsonSync(VERDICT_CACHE_PATH, Object.fromEntries(m))
      dirty = 0
    } catch (e) { logger.warn(`[ReuseFirst] verdict cache write failed: ${e.message}`) }
  }
  return {
    get: (k) => m.get(k),
    // Flushed every 200 new verdicts so a killed run keeps most of its listening,
    // which is the whole point: the in-memory listen result dies with the process.
    set: (k, v) => { m.set(k, v); if (++dirty >= 200) flush() },
    flush,
    get size() { return m.size },
  }
}
const reuseRuns = new Map()   // runId -> run record (in-process; artifact on disk is durable)

// A full course is one round per is_new LEGO — fra_for_eng alone is 1,529 — so
// the old cap of 500 was below the size of a real scope, not above it. The cap
// is a runaway guard, nothing else; the thing that keeps a big scope safe is
// BANDING (fromRound), not a small ceiling.
const MAX_ROUNDS = 5000

/** HEAD an S3 object. Never throws for "missing"; a failed QUESTION is `null`. */
async function reuseHeadObject(s3Key) {
  if (!s3Key || s3Key.startsWith('pending/')) return { exists: false, size: null }
  try {
    const r = await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }))
    return { exists: true, size: r.ContentLength ?? null }
  } catch (e) {
    const code = e?.$metadata?.httpStatusCode
    if (e?.name === 'NotFound' || code === 404) return { exists: false, size: null }
    return { exists: null, size: null, error: e?.name || e?.message || 'head failed' }
  }
}

/** The bytes at an S3 key, as a Buffer — for the incumbent veracity pass. */
async function reuseFetchObject(s3Key) {
  const r = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }))
  const chunks = []
  for await (const chunk of r.Body) chunks.push(chunk)
  return Buffer.concat(chunks)
}

/**
 * Render ONE clip from the plan. Deliberately the same recipe /generate uses —
 * gender expansion, master, PRE-PUBLISH VERACITY GATE, S3, course_audio upsert —
 * and reading the COURSE text the planner supplied, never course_audio.text.
 * The precious-audio guard is honoured: a human recording at this key is never
 * overwritten.
 */
async function reuseRenderClip(courseCode, clip, stats) {
  const guardedHuman = await humanRowAtAudioKey(
    courseCode, normalizeForAudio(clip.text), clip.language, clip.role, clip.voiceId
  )
  if (guardedHuman) {
    logger.info(`[ReuseFirst] SKIP render: human recording ${guardedHuman.id} holds this key`)
    return { audioId: guardedHuman.id, s3Key: null, durationMs: null, skippedHuman: true }
  }

  const [provider, voiceName] = String(clip.voiceId).split('_', 2)
  let textForTTS = clip.text
  if ((clip.role === 'target1' || clip.role === 'target2') && genderService.hasGenderMarker(clip.text)) {
    const marker = genderService.analyzeAndExpand(clip.text, clip.language, clip.role)
    if (marker.wasModified) textForTTS = marker.expandedText
  }

  const renderAndMaster = async () => {
    let rawAudioBuffer, wordBoundaries
    if (provider === 'azure') {
      ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'azure', {
        subscriptionKey: process.env.AZURE_SPEECH_KEY,
        region: process.env.AZURE_SPEECH_REGION || 'westeurope',
        voiceName, speed: 1.0,
      }))
    } else if (provider === 'elevenlabs') {
      ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'elevenlabs', {
        apiKey: process.env.ELEVENLABS_API_KEY, voiceId: voiceName, speed: 1.0,
      }))
    } else if (provider === 'xai') {
      ({ audioBuffer: rawAudioBuffer, wordBoundaries } = await ttsService.generateWithRetry(textForTTS, 'xai', {
        apiKey: process.env.XAI_API_KEY, voiceId: voiceName, language: toBcp47(clip.language),
      }))
    } else {
      throw new Error(`Unknown TTS provider: ${provider} (voice ${clip.voiceId})`)
    }
    const { buffer, durationMs } = await masterAudio(rawAudioBuffer, textForTTS)
    return { buffer, durationMs, wordBoundaries }
  }

  const gated = await veracity.renderChecked({
    render: renderAndMaster,
    expectedText: textForTTS,
    language: clip.language,
    stats,
    logger,
    meta: { courseCode, role: clip.role, voiceId: clip.voiceId, lego_id: clip.legoId || null, originalText: clip.text },
  })
  if (!gated.published) {
    throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason}, CER ${gated.verdict?.cer})`)
  }

  const audioId = uuidv4().toUpperCase()
  const s3Key = `mastered/${audioId}.mp3`
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET, Key: s3Key, Body: gated.buffer,
    ContentType: 'audio/mpeg', CacheControl: AUDIO_CACHE_CONTROL,
  }))

  // ── THE VERSIONED, NO-HOLES SWAP ───────────────────────────────────────
  // When this render replaces a clip that already exists, it must NOT upsert
  // over the row's s3_key in place. Doing that changes the bytes behind an
  // unchanged learner ref, and `/api/audio/:id` serves
  // `max-age=31536000, immutable` — so every learner who has already played
  // the clip keeps the old audio for a YEAR, and the offline IndexedDB cache
  // (keyed by the ref string) keeps it forever. That is the documented cause
  // of "we kept replacing clips and got the same clip"
  // (docs/audio/per-clip-versioned-urls-census-2026-08-06.md).
  //
  // Instead: same row id, bumped audio_revision, history row written. The
  // learner ref becomes `<uuid>.v<N>`, which is a new URL and a new cache key
  // in both layers, and because the ROW ID never moves, no holder FK is
  // touched and the course cannot reference a missing clip at any instant.
  // The superseded S3 object is retained — nothing is ever deleted.
  const swapTargetAudioId = clip.reuseSource?.swapTargetAudioId
  if (swapTargetAudioId) {
    // Make before break: prove the new bytes are really in the bucket BEFORE
    // the row is pointed at them.
    const head = await reuseHeadObject(s3Key)
    if (!head.exists) throw new Error(`new object ${s3Key} not in bucket — refusing to swap`)

    const { data: row, error: readErr } = await supabase
      .from('course_audio')
      .select('id, course_code, s3_key, duration_ms, audio_revision')
      .eq('id', swapTargetAudioId)
      .single()
    if (readErr || !row) throw new Error(`swap target ${swapTargetAudioId} not readable: ${readErr?.message || 'no row'}`)

    const previousRevision = row.audio_revision ?? 1
    const revision = previousRevision + 1

    // History first — a swap that is not recorded is worse than one that does
    // not happen. This is the rollback ledger.
    const { error: histErr } = await supabase
      .from('course_audio_revisions')
      .insert({
        audio_id: row.id,
        course_code: row.course_code,
        revision,
        previous_revision: previousRevision,
        previous_s3_key: row.s3_key,
        new_s3_key: s3Key,
        previous_duration_ms: row.duration_ms,
        new_duration_ms: gated.durationMs,
        source: 'reuse-first-rebuild',
        accepted_by: 'phase8 /reuse-apply',
        reason: 'rounds rebuild on the chosen voice',
      })
    if (histErr) throw new Error(`writing revision history: ${histErr.message}`)

    // text/text_normalized/language/role/voice_id are deliberately NOT in the
    // patch: leaving them alone keeps unique_course_audio_per_voice satisfied
    // and keeps the id stable, which is what makes this hole-free.
    const { error: swapErr } = await supabase
      .from('course_audio')
      .update({
        s3_key: s3Key,
        duration_ms: gated.durationMs,
        audio_revision: revision,
        word_boundaries: gated.wordBoundaries || null,
        origin: 'tts',
      })
      .eq('id', row.id)
    if (swapErr) throw new Error(`swapping clip ${row.id}: ${swapErr.message}`)

    logger.info(`[ReuseFirst] swapped ${row.id} -> revision ${revision} (${row.s3_key} superseded, retained)`)
    return {
      audioId: row.id, s3Key, durationMs: gated.durationMs,
      revision, previousS3Key: row.s3_key, swappedInPlace: true,
    }
  }

  const { data: inserted, error } = await supabase
    .from('course_audio')
    .upsert({
      course_code: courseCode,
      text: clip.text,
      text_normalized: normalizeForAudio(clip.text),
      language: clip.language,
      role: clip.role,
      voice_id: clip.voiceId,
      origin: 'tts',
      s3_key: s3Key,
      duration_ms: gated.durationMs,
      lego_id: clip.legoId || null,
      word_boundaries: gated.wordBoundaries || null,
    }, { onConflict: 'course_code,text_normalized,language,role,voice_id' })
    .select('id')
    .single()
  if (error) throw new Error(`course_audio upsert: ${error.message}`)

  // Presentation audio also needs its FK on course_legos — the planner's holder
  // list already carries that column, so relinkHolders covers it.
  return { audioId: inserted.id, s3Key, durationMs: gated.durationMs }
}

/**
 * Voice aliases: groups of voice_id strings a caller ASSERTS are one voice.
 * Off by default. The estate carries legacy bare ids (`eve`) alongside
 * provider-prefixed ones (`xai_eve`) and whether those are the same voice is a
 * voice-identity call, so it is opt-in per request and recorded on every clip
 * that used it.
 */
function parseVoiceAliases(raw) {
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed)) return []
    return parsed.filter(g => Array.isArray(g) && g.length > 1)
  } catch { return [] }
}

/** Courses queried FIRST as reuse sources for a given course, before the
 *  generic estate sweep. Tom, 2026-08-07: deu_for_eng is a PRIMARY source for
 *  the English known side of fra_for_eng, "not an afterthought behind a generic
 *  estate-wide lookup". Same-known-language courses rebuilt most recently. */
const PREFERRED_SOURCES = {
  fra_for_eng: ['deu_for_eng', 'spa_for_eng', 'fra_ca_for_eng'],
  deu_for_eng: ['fra_for_eng', 'spa_for_eng'],
}
/** Roles that must never be borrowed from another course. Default: intros. */
function parseFreshRoles(raw) {
  if (raw === undefined || raw === null || raw === '') return ['presentation']
  const list = Array.isArray(raw) ? raw : String(raw).split(',')
  return list.map(s => s.trim()).filter(Boolean)
}

function preferredSourcesFor(courseCode, raw) {
  if (raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (Array.isArray(parsed)) return parsed.filter(s => typeof s === 'string')
    } catch { /* fall through to the default */ }
  }
  return PREFERRED_SOURCES[courseCode] || []
}

// THE COVERAGE TABLE — a first-class deliverable, not an internal step.
// Read-only: measures which voice already has the most of what these rounds
// need, so the voice can be chosen on evidence rather than on habit.
app.get('/reuse-coverage/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const rounds = Math.max(1, Math.min(MAX_ROUNDS, parseInt(req.query.rounds, 10) || 10))
    const fromRound = Math.max(1, Math.min(rounds, parseInt(req.query.fromRound, 10) || 1))
    const voiceAliases = parseVoiceAliases(req.query.voiceAliases)
    const layers = req.query.layers ? String(req.query.layers).split(',') : undefined
    const table = await reusePlanner.buildCoverageTable(supabase, courseCode, rounds, {
      voiceAliases, fromRound,
      codeService: { getName: getLangEnglishName },
      preferredSourceCourses: preferredSourcesFor(courseCode, req.query.preferredSources),
      ...(layers ? { layers } : {}),
    })
    res.json(table)
  } catch (e) {
    logger.error(`[ReuseFirst /reuse-coverage] ${e.message}`)
    res.status(500).json({ ok: false, error: e.message })
  }
})

app.get('/reuse-plan/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const rounds = Math.max(1, Math.min(MAX_ROUNDS, parseInt(req.query.rounds, 10) || 10))
    const fromRound = Math.max(1, Math.min(rounds, parseInt(req.query.fromRound, 10) || 1))
    const crossRole = req.query.crossRole !== 'false'
    const voiceAliases = parseVoiceAliases(req.query.voiceAliases)
    const verifyBytes = req.query.verifyBytes !== 'false'

    const plan = await reusePlanner.buildReusePlan(supabase, courseCode, rounds, {
      crossRole, voiceAliases, fromRound,
      freshRoles: parseFreshRoles(req.query.freshRoles),
      codeService: { getName: getLangEnglishName },
      preferredSourceCourses: preferredSourcesFor(courseCode, req.query.preferredSources),
    })
    if (verifyBytes) await reusePlanner.verifyPlanBytes(plan, { headObject: reuseHeadObject })

    res.json(plan)
  } catch (e) {
    logger.error(`[ReuseFirst /reuse-plan] ${e.message}`)
    res.status(500).json({ ok: false, error: e.message })
  }
})

app.post('/reuse-apply/:courseCode', async (req, res) => {
  const { courseCode } = req.params
  const rounds = Math.max(1, Math.min(MAX_ROUNDS, parseInt(req.body?.rounds, 10) || 10))
  const fromRound = Math.max(1, Math.min(rounds, parseInt(req.body?.fromRound, 10) || 1))
  const dryRun = req.body?.dryRun !== false
  const crossRole = req.body?.crossRole !== false
  const rebuild = req.body?.rebuild === true
  const voiceAliases = parseVoiceAliases(req.body?.voiceAliases)

  // A live run SPENDS MONEY on TTS. Typed confirmation, same shape the rest of
  // the dashboard uses for expensive/irreversible actions.
  if (!dryRun && req.body?.confirm !== courseCode) {
    return res.status(400).json({
      ok: false,
      error: `a live run renders audio and costs money — send confirm:"${courseCode}" to proceed`,
    })
  }
  if (!dryRun && currentWork.active) {
    return res.status(409).json({ ok: false, error: `phase 8 is busy (${currentWork.operation} on ${currentWork.courseCode})` })
  }

  const runId = `reuse-${courseCode}-r${fromRound === 1 ? rounds : `${fromRound}to${rounds}`}-${Date.now()}`
  const run = {
    runId, courseCode, rounds, fromRound, dryRun,
    startedAt: new Date().toISOString(), finishedAt: null,
    state: 'running', summary: null, log: null, artifactPath: null, error: null,
  }
  reuseRuns.set(runId, run)

  const execute = async () => {
    try {
      const plan = await reusePlanner.buildReusePlan(supabase, courseCode, rounds, {
        crossRole, voiceAliases, rebuild, fromRound,
        freshRoles: parseFreshRoles(req.body?.freshRoles),
        codeService: { getName: getLangEnglishName },
        preferredSourceCourses: preferredSourcesFor(courseCode, req.body?.preferredSources),
      })
      await reusePlanner.verifyPlanBytes(plan, { headObject: reuseHeadObject })
      // Optional: LISTEN to the clips the plan means to keep, against the
      // course's own text, and promote the damaged ones to RENDER. Off by
      // default because it costs a whisper decode per incumbent clip; on for
      // the fra_for_eng last-word repair, which is the only way a clip that is
      // present, alive and wrong gets caught (Tom, 2026-08-07).
      if (req.body?.verifyIncumbents === true) {
        const verdictCache = loadVerdictCache()
        const heard = await reusePlanner.verifyPlanVeracity(plan, {
          fetchObject: reuseFetchObject, veracity, logger, verdictCache,
          concurrency: Number(process.env.AUDIO_VERACITY_CONCURRENCY || 4),
        })
        verdictCache?.flush()
        logger.info(`[ReuseFirst] listened to ${heard.checked} incumbent clips — ${heard.failed} damaged, ${heard.unknown} unknown, ${heard.cached || 0} from cache, reasons ${JSON.stringify(heard.byReason)}`)
      }
      run.plan = { shape: plan.shape, summary: plan.summary, byLayer: plan.byLayer, estimate: plan.estimate, voices: plan.voices, bytes: plan.bytes, heard: plan.heard || null }

      const actionable = plan.clips.filter(c => c.decision !== 'SATISFIED' && c.decision !== 'BLOCKED').length
      if (!dryRun) startWork('reuse-first', courseCode, actionable)

      // newStats(), not {} — recordVerdict's UNCHECKED branch writes into
      // stats.uncheckedReasons, so a bare object throws
      // "Cannot read properties of undefined" and the clip is logged FAILED.
      // Latent until a verdict comes back unchecked, which is why it survived:
      // the checked branch only touches flat counters. It fires whenever the
      // gate is off OR whisper is unavailable — and whisper is off PATH on
      // watson-1 — so a missing binary turned every render into a failure
      // instead of an honest "published unchecked". Found 2026-08-08 by the
      // probe before the overnight run: 34 of 45 clips FAILED this way.
      const veracityStats = veracity.newStats()
      const log = await reusePlanner.applyReusePlan(supabase, plan, {
        runId,
        dryRun,
        headObject: reuseHeadObject,
        renderClip: (clip) => reuseRenderClip(courseCode, clip, veracityStats),
        // Serial by default. A 200-round scope is ~1,500 actionable clips and
        // ~4.5s each, which is two hours of wall-clock for work that has no
        // ordering constraint at all — so the caller can ask for more hands.
        concurrency: Math.max(1, Math.min(8, parseInt(req.body?.concurrency, 10) || 1)),
        onProgress: ({ clip, outcome }) => { if (!dryRun) updateWork(`${clip} [${outcome}]`, outcome !== 'failed') },
      })
      if (!dryRun) endWork()

      // Artifact: standing sweep hygiene — every decision, per clip, on disk.
      await fs.ensureDir(REUSE_ARTIFACT_DIR)
      const artifactPath = path.join(REUSE_ARTIFACT_DIR, `${courseCode}-rounds${fromRound}-${rounds}-reuse-${dryRun ? 'dryrun' : 'applied'}-log.json`)
      await fs.writeJson(artifactPath, { ...log, plan: run.plan }, { spaces: 2 })

      run.log = log
      run.summary = log.counts
      run.artifactPath = artifactPath
      run.state = 'done'
      run.finishedAt = new Date().toISOString()
      logger.info(`[ReuseFirst] ${runId} finished: ${JSON.stringify(log.counts)} (${log.errors.length} errors, ${log.deletionsPerformed} deletions)`)
    } catch (e) {
      if (!dryRun && currentWork.active) endWork()
      run.state = 'failed'
      run.error = e.message
      run.finishedAt = new Date().toISOString()
      logger.error(`[ReuseFirst] ${runId} failed: ${e.message}`)
    }
  }

  // A dry run is cheap enough to await, so the caller gets the plan straight
  // back; a live run is long and is polled from /status + /reuse-run/:runId.
  if (dryRun) {
    await execute()
    return res.json({ ok: run.state === 'done', started: false, runId, ...run })
  }
  execute()
  res.status(202).json({ ok: true, started: true, runId, courseCode, rounds, fromRound })
})

app.get('/reuse-run/:runId', (req, res) => {
  const run = reuseRuns.get(req.params.runId)
  if (!run) return res.status(404).json({ ok: false, error: `no run ${req.params.runId} in this process` })
  res.json({ ok: true, ...run })
})

// =============================================================================
// START SERVER (suppressed when require()d as a library)
// =============================================================================
// Gated on PHASE8_NO_LISTEN so other tools (e.g. the pod-explainer overnight
// runner) can require this file purely for its named helpers — masterAudio,
// generatePodAudio etc. — without triggering EADDRINUSE on PORT 3465.
//
// We use an explicit env-var rather than `require.main === module` because
// PM2's ProcessContainerFork loads the script via _load() and require.main
// points at PM2's wrapper, not this file — so the require.main gate would
// silently skip app.listen under PM2 and the service would crash-loop.

if (!process.env.PHASE8_NO_LISTEN) {
  app.listen(PORT, HOST, () => {
    logger.info(`Phase 8 Audio Service (v13) running on ${HOST}:${PORT}`)
    logger.info(`Supabase: ${process.env.SUPABASE_URL ? 'configured' : 'NOT configured'}`)
    logger.info(`S3 Bucket: ${S3_BUCKET}`)
  })
}

module.exports = app
// Named exports for reuse from other audio-generation paths.
module.exports.masterAudio = masterAudio
module.exports.findExistingAudio = findExistingAudio
module.exports.generatePodAudio = generatePodAudio
// Pure helper behind generatePodAudio's pause cue — exported for unit tests.
module.exports.splitPodTurnSentences = splitPodTurnSentences
module.exports.s3 = s3
module.exports.S3_BUCKET = S3_BUCKET
// Human-first FK link pass (G2 pre-pass + RPC) — the voice engine's link
// step calls this instead of the bare RPC so fresh human rows win links.
module.exports.linkAudioIds = linkAudioIds
// PRECIOUS-AUDIO GUARD helper (G1) — exported so the pods recording stream can
// unit-test that TTS paths refuse to write over human pod rows (additive).
module.exports.humanRowAtAudioKey = humanRowAtAudioKey
// Shared with pod-explainer-composite so the composite recipe's parts are spelt
// exactly the way every other voice id in a course_audio row is.
module.exports.canonicalClipVoiceId = canonicalClipVoiceId
module.exports.findSiblingCourseClip = findSiblingCourseClip
module.exports.resolvePodSpeakerVoice = resolvePodSpeakerVoice
// Clone-once-copy-everywhere: exported so the copy-pass tool/tests can drive
// the exact same classification the live /generate and /plan routes use.
module.exports.getAudioNeeds = getAudioNeeds
module.exports.classifyEnglishCopyBucket = classifyEnglishCopyBucket
module.exports.executeCopyBucket = executeCopyBucket
