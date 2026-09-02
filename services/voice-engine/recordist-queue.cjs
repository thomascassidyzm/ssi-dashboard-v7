/**
 * recordist-queue.cjs — the ONE recording queue, derived BY LANGUAGE.
 *
 * Tom, 2026-08-14: "we only need the PODS recorded by language, not by course
 * from now on". Human recording exists for the languages we decide we have no
 * TTS voice for; which languages those are, and who reads them, lives in ONE
 * place — the `language_recording_policy` table (ops/sql/20260814-language-
 * recording-policy.sql). There is deliberately no per-course and no per-pod
 * toggle anywhere in this file.
 *
 * WHAT A RECORDIST'S QUEUE IS
 *
 *   1. voiceId → (language, gender, dialect) from language_recording_policy.voices.
 *   2. every pod sentence in EVERY course whose canonicalLanguage(target_lang)
 *      is that language — cym_n_for_eng and cym_s_for_eng are one Welsh queue,
 *      not two.
 *   3. kept when the sentence's speaker maps, through that course's own
 *      voice_config.podCast, to the recordist's GENDER, AND the course's own
 *      dialect is the recordist's dialect. Gender is not the voice id: a course
 *      cast naming human_aran_cym_s and a policy naming human_aran_cym_n are the
 *      same man reading Welsh.
 *
 *      DIALECT IS THE SECOND FILTER (Tom, 2026-08-19). Rule 2 is what makes one
 *      Welsh queue out of two Welsh courses, and until this filter existed that
 *      was the whole story: 197 SOUTHERN pod lines sat in the two NORTHERN
 *      speakers' lists, waiting to be read in the wrong accent, and nothing
 *      flagged it because the queue was working exactly as built
 *      (docs/welsh-south-pulled-from-northern-queues-2026-08-19.md). The fix is
 *      not to split the queue by course — cym_n and cym_s still share one, and
 *      still collapse a shared line into one recording. It is that a line's
 *      DIALECT, a durable fact of the course's content (`courses.dialect`), must
 *      equal the reading voice's own dialect tag.
 *
 *      Dialect is NOT keyed on the casting. Reading it off "who is cast" is what
 *      re-encodes the course fact indirectly, and that indirection is the
 *      original bug: cym_s_for_eng was cast to Aran and Catrin, so by that logic
 *      it WAS Northern. The course says what it is; the cast does not.
 *
 *      Every language but Welsh has one dialect and every one of its courses and
 *      voices carries the same default tag, so the match is trivially true and
 *      this changes nothing for them — a no-op by construction, not by a special
 *      case (services/shared/dialect.cjs).
 *   4. COLLAPSED BY CLIP IDENTITY. A clip's identity is
 *      (language, text_normalized, voice_id) — services/shared/clip-identity.cjs
 *      — and course_code is not in it here BY DESIGN: the same sentence in three
 *      courses is ONE recording. That collapse is the entire point of the
 *      canonical identity work; without it a recordist reads the same line
 *      three times.
 *   5. recorded = a course_audio row exists under (language, text_normalized,
 *      voice) for ANY spelling of that voice. Aran's 111 Welsh takes are split
 *      across human_aran_cym_n and human_aran_cym_n_2; a lookup that asks for
 *      one spelling would ask him to record 42 clips he has already given us.
 *      Reads widen, writes narrow (services/shared/clip-identity-lookup.cjs).
 *   6. UNLESS THE TAKE IS WANTED AGAIN. "A clip exists" and "the clip is good"
 *      are different facts, and until 2026-08-16 this queue only knew the first
 *      one — so the 90 re-record wants written for T-20 were invisible here and
 *      Aran's link showed 71 of his lines as done when every one of them was
 *      queued for a re-record. A want makes a line outstanding WITHOUT
 *      unlinking anything: the old take stays linked and playable until the new
 *      one lands, which is make-before-break by construction
 *      (docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b).
 *      Two places carry a want, and both are honoured:
 *        - listening_pod_sentences.rerecord_wanted — {kind: voiceId}, the pod
 *          line's own flag, shared with the per-course studio (pods-plan.cjs)
 *          so the two surfaces cannot disagree about what is outstanding;
 *        - course_audio.rerecord_wanted — the clip's flag, which is the only
 *          one that can reach content types that are not pod dialogue.
 *
 *   7. SEED SENTENCES — the third source (2026-09-02). A seed sentence
 *      (course_seeds) is a real audio unit: the row carries its own
 *      known_audio_id / target1_audio_id / target2_audio_id and the player walks
 *      the table directly. Welsh North is at 2.8% on that column — 649 of 668
 *      seeds have no target1 take — because it cannot fall back on TTS. Seeds
 *      ride source (2)'s precedent rather than a bespoke path.
 *
 *      CAST, NEVER GUESSED. A pod line knows who reads it because the pod has a
 *      SPEAKER and voice_config.podCast maps that speaker to a gender. A seed
 *      sentence has no speaker. So it is cast from the course's own
 *      voice_config.voices.target1/.target2 — the same slots the rest of the
 *      pipeline reads — and a course that casts no human voice for a role puts
 *      its seeds in NOBODY's queue and counts as `uncast`. That is the rule this
 *      file already applies to a pod speaker with no cast entry, and it matters:
 *      cym_n_for_eng currently casts neither target slot, and inventing a rule
 *      ("the man takes target1") would hand 649 lines to somebody nobody chose.
 *
 * TARGET SIDE ONLY — WITH ONE EXCEPTION, AND IT STOPS AT THE TEST FIXTURE.
 * The known side of every one of these courses is English, 'eng' is not
 * human_only, and so it never enters a queue. known_text rides along on each
 * line as the recordist's crib, never as something to record.
 *
 * Tom, 2026-09-02: "just so I can record the English and perhaps also record the
 * X." So on a TEST FIXTURE course — and only there, checked by
 * isTestFixtureCourse() below, server-side, because the booth is a no-login
 * surface — a seed's KNOWN side also enters the queue, as a role:'known' line
 * that links course_seeds.known_audio_id. No live language gains a known-side
 * queue: not Welsh, not any other. The exception exists so the process can be
 * driven end to end by one person on a course with no learners.
 *
 * A speaker with no podCast gender entry is NOT guessed at and NOT silently
 * dropped: it lands in neither queue and is counted as `uncast` on the coverage
 * endpoint, where a human can see it and cast it.
 */

'use strict'

const { canonicalLanguage, canonicalVoiceId, tryCanonicalVoiceId } = require('../shared/clip-identity.cjs')
const { voiceSpellings } = require('../shared/clip-identity-lookup.cjs')
const { normalizeForDb, audioKeyCandidates } = require('../shared/text-normalize.cjs')
const { canonicalSpeakerName } = require('./pods-registration.cjs')
const { canonicalDialect, courseDialect, bucketKey } = require('../shared/dialect.cjs')
const { buildLegoQuarry, DEFAULT_MAX_SEED } = require('./lego-quarry.cjs')
const langService = require('../language-code-service.cjs')

/**
 * Is this course a TEST FIXTURE rather than something a learner is being served?
 *
 * Tom's standing ruling on the zzz courses: "it is a TEST course so it can have
 * any rules we like." That relaxation is for CONTENT and PEDAGOGY rules only —
 * consent and data safety bind everywhere — and the one thing hanging off it
 * here is inline text editing from the recording booth (2026-09-02). Editing a
 * LIVE pod line in place is forbidden by the content-change migration protocol
 * (docs/pods/pod-migration-protocol.md): progress is filed under a sentence's
 * slot, so an in-place edit silently credits a learner with a sentence they
 * never heard. A test fixture has no learners, so on a test fixture that
 * objection does not exist.
 *
 * The `zzz_` prefix IS the estate's test-course convention, and it is checked
 * SERVER-SIDE on every write: the booth is a no-login surface, so a client-side
 * flag would be a suggestion, not a gate.
 */
function isTestFixtureCourse(courseCode) {
  return /^zzz_/.test(String(courseCode || ''))
}

/** Display name for a canonical database_code, falling back to the code itself. */
function languageName(language) {
  try {
    return langService.getName(language) || language
  } catch {
    return language
  }
}

/**
 * Every course whose TARGET language canonicalises to `language`.
 * Canonicalisation is JS-side (clip-identity.cjs owns it), so this reads the
 * course list once and filters in memory rather than guessing in SQL.
 */
async function coursesForLanguage(db, language) {
  const { data, error } = await db
    .from('courses')
    // `dialect` rides along on every read of this list: it is a property of the
    // course's content, and every consumer here routes on it.
    .select('course_code, target_lang, known_lang, voice_config, dialect')
  if (error) throw new Error(`course list failed: ${error.message}`)
  return (data || []).filter((c) => {
    try {
      return canonicalLanguage(c.target_lang) === language
    } catch {
      return false
    }
  })
}

/**
 * Merge every course's voice_config.podCastAliases into one
 * canonical voice id → [older spellings] map.
 *
 * cym_n_for_eng carries {"human_aran_cym_n": ["human_aran_cym_n_2",
 * "human_aranv3_cym_n"], ...}. The map is estate-wide because a recordist's
 * link is estate-wide: Aran's old per-course link must keep resolving to him.
 */
async function loadAliasMap(db) {
  const { data, error } = await db.from('courses').select('course_code, voice_config')
  if (error) throw new Error(`alias map load failed: ${error.message}`)
  const map = new Map()
  for (const row of data || []) {
    const aliases = row.voice_config && row.voice_config.podCastAliases
    if (!aliases || typeof aliases !== 'object') continue
    for (const [canonical, list] of Object.entries(aliases)) {
      const set = map.get(canonical) || new Set()
      for (const a of Array.isArray(list) ? list : []) set.add(a)
      map.set(canonical, set)
    }
  }
  return map
}

/** All policy rows, newest schema shape: {language, human_only, voices, notes}. */
async function loadPolicies(db, { humanOnlyOnly = false } = {}) {
  let q = db.from('language_recording_policy').select('*').order('language')
  if (humanOnlyOnly) q = q.eq('human_only', true)
  const { data, error } = await q
  if (error) throw new Error(`language_recording_policy read failed: ${error.message}`)
  return data || []
}

/**
 * Resolve a link's :voiceId to the person behind it.
 *
 * LINK IS IDENTITY: there is no login here. The voice id in the URL IS the
 * claim, and it is checked against language_recording_policy — the only place
 * that says who reads a language. Alias spellings resolve to their canonical
 * voice so a link handed out weeks ago still opens the right queue.
 *
 * @returns {Promise<null | {voiceId, displayName, email, gender, language, languageName, spellings: string[]}>}
 */
async function resolveRecordist(db, voiceIdParam) {
  const asked = String(voiceIdParam || '').trim()
  if (!asked) return null

  const [policies, aliasMap] = await Promise.all([loadPolicies(db), loadAliasMap(db)])

  // An alias in the URL → the canonical voice it stands for.
  let canonical = asked
  for (const [canon, aliases] of aliasMap.entries()) {
    if (aliases.has(asked)) { canonical = canon; break }
  }

  for (const policy of policies) {
    const voices = policy.voices || {}
    // The key is a SLOT, not the gender. It was the gender when a language could
    // hold one voice per gender; a two-dialect language holds four, so the slot
    // is spelt 'm' / 'f' for the single-dialect default and 'm:south' / 'f:south'
    // when it has to be distinguished. The authoritative gender and dialect are
    // the entry's own fields — `gender` falls back to the slot's leading token
    // precisely so every row written before this change keeps meaning what it
    // meant, including Finnish's free-form 'test' slot.
    for (const slot of Object.keys(voices)) {
      const entry = voices[slot] || {}
      if (!entry.voiceId) continue
      const gender = String(entry.gender || slot.split(':')[0] || '').toLowerCase()
      const dialect = canonicalDialect(entry.dialect)
      // The policy row's own `aliases` are the FIRST source of truth — the
      // per-language decision lives in one table, so the older spellings of a
      // recordist's voice belong beside the voice, not scattered per course.
      // voice_config.podCastAliases is still merged in, because links handed
      // out before the policy existed must keep opening the right queue.
      const declared = new Set(Array.isArray(entry.aliases) ? entry.aliases : [])
      const matches = entry.voiceId === canonical || entry.voiceId === asked ||
        declared.has(asked) || (aliasMap.get(entry.voiceId) || new Set()).has(asked)
      if (!matches) continue
      for (const a of declared) {
        const set = aliasMap.get(entry.voiceId) || new Set()
        set.add(a)
        aliasMap.set(entry.voiceId, set)
      }
      return {
        voiceId: entry.voiceId,
        displayName: entry.name || entry.voiceId,
        email: entry.email || null,
        gender,
        dialect,
        slot,
        language: policy.language,
        languageName: languageName(policy.language),
        humanOnly: !!policy.human_only,
        spellings: recordedSpellings(entry.voiceId, aliasMap),
      }
    }
  }
  return null
}

/**
 * Which recording voices belong to a LOGGED-IN Popty identity.
 *
 * The link-is-identity surface (/r/:voiceId) needs no login, but a recordist who
 * signs in should not have to hold a link to find their own work. The mapping
 * from a person to a voice is already modelled, in two places, and both are
 * real: `dashboard_users.voice_id` is the login's own voice (Catrin), and
 * `language_recording_policy.voices[slot].email` is the language's record of who
 * reads it (Aran, whose dashboard row is an admin with no voice_id). Neither
 * alone covers both people, so this reads both and unions them.
 *
 * Every candidate is then resolved through resolveRecordist, which is the ONE
 * gate on whether a voice is live: a stale dashboard_users.voice_id naming a
 * voice no policy mentions resolves to null and is dropped, so this can never
 * conjure a queue the recordist surface itself would 404.
 *
 * @returns {Promise<Array>} resolveRecordist shapes, deduped by voiceId
 */
async function voicesForEmail(db, email) {
  const norm = String(email || '').trim().toLowerCase()
  if (!norm) return []

  const candidates = new Set()

  // 1. the login's own voice. `ilike` because dashboard_users.email is stored
  //    as typed (Eoghan's row is mixed-case) while a JWT email arrives lowercased.
  const { data: rows, error } = await db
    .from('dashboard_users').select('voice_id').ilike('email', norm)
  if (error) throw new Error(`dashboard_users read failed: ${error.message}`)
  for (const row of rows || []) if (row.voice_id) candidates.add(row.voice_id)

  // 2. every policy voice that names this person.
  for (const policy of await loadPolicies(db)) {
    const voices = policy.voices || {}
    for (const slot of Object.keys(voices)) {
      const entry = voices[slot] || {}
      if (!entry.voiceId) continue
      if (String(entry.email || '').trim().toLowerCase() === norm) candidates.add(entry.voiceId)
    }
  }

  const out = []
  const seen = new Set()
  for (const voiceId of candidates) {
    const recordist = await resolveRecordist(db, voiceId)
    if (!recordist || seen.has(recordist.voiceId)) continue
    seen.add(recordist.voiceId)
    out.push(recordist)
  }
  return out
}

/**
 * Every voice_id spelling a stored clip of this recordist might carry.
 *
 * Three sources, all read-side only (nothing here is ever written):
 *   - the canonical id and its bare/prefixed twins (voiceSpellings)
 *   - the podCastAliases this estate records for it
 *   - each alias's own twins
 * Missing one of these is not cosmetic: it is a recordist being asked to
 * re-read clips they already recorded.
 */
function recordedSpellings(voiceId, aliasMap) {
  const out = new Set(voiceSpellings(voiceId))
  for (const alias of aliasMap.get(voiceId) || []) {
    for (const s of voiceSpellings(alias)) out.add(s)
  }
  return [...out]
}

/**
 * The cast entry governing a pod sentence, by the same rule the recording path
 * uses (pods-registration.resolvePodCastVoiceId): canonical speaker name first,
 * raw key as the safety net.
 */
function castEntryFor(podCast, speaker) {
  if (!podCast) return null
  return podCast[canonicalSpeakerName(speaker)] || podCast[speaker] || null
}

/**
 * Does this pod sentence want its TARGET track recorded again?
 *
 * listening_pod_sentences.rerecord_wanted is {kind: voiceId} — e.g.
 * {"target": "human_aran_cym_n"}. Only the target track is ever read here: the
 * known side of every human_only course is English and never enters a queue
 * (see the header). Voice-blind on purpose — the queue is already partitioned
 * by the CAST's gender, and a want written against an older spelling of the
 * same person's voice must not be lost to a string comparison.
 */
function targetRerecordWanted(sentence) {
  const wanted = sentence && sentence.rerecord_wanted
  if (!wanted || typeof wanted !== 'object') return false
  return !!wanted.target
}

/**
 * Every pod line of a language, partitioned by (DIALECT, GENDER) — the dialect
 * its own course declares and the gender its own course cast names — collapsed
 * by clip identity, computed ONCE per language.
 *
 * Both the recordist's queue and the coverage bar read this, so the number on
 * Tom's bar and the number on Aran's page cannot drift apart. It also means
 * `uncast` is what it actually is — a property of the LANGUAGE's pods, visible
 * even for a language that has no cast at all yet (bre, pdc), where every line
 * is uncast and the old per-voice loop would have reported a flat zero.
 *
 * THE COLLAPSE IS PER BUCKET, and that is the point rather than a side effect:
 * two courses of the SAME dialect sharing a line are still one recording, and
 * two courses of DIFFERENT dialects sharing a spelling are not — a Northern take
 * filed into a Southern pod is the same defect as a Northern queue holding a
 * Southern line, one step further down the pipe. It is what `alsoFills` used to
 * promise across cym_n and cym_s.
 *
 * @returns {Promise<{byBucket: Map<string, Array>, uncast, duplicatesCollapsed, courses: string[]}>}
 */

/** The synthetic line id a seed sentence wears on the wire. */
const SEED_LINE_PREFIX = 'seed:'

/** ROLES a seed sentence can be read in. `known` is fixture-only (see header). */
const SEED_TARGET_ROLES = ['target1', 'target2']

/**
 * Parse a seed line id back into (seedId, role). Returns null for anything that
 * is not one — which is how the router keeps its branch cheap and total.
 */
function parseSeedLineId(lineId) {
  const raw = String(lineId || '')
  if (!raw.startsWith(SEED_LINE_PREFIX)) return null
  const rest = raw.slice(SEED_LINE_PREFIX.length)
  const at = rest.lastIndexOf(':')
  if (at <= 0) return null
  const seedId = rest.slice(0, at)
  const role = rest.slice(at + 1)
  if (!seedId || !['known', 'target1', 'target2'].includes(role)) return null
  return { seedId, role }
}

function seedLineId(seedId, role) { return `${SEED_LINE_PREFIX}${seedId}:${role}` }

/**
 * THE MINIMAL SET's line ids.
 *
 *   quarry:<courseCode>:lego:<legoId>
 *   quarry:<courseCode>:word:<normalised word>
 *
 * A quarry piece is not a row anybody owns — a fallback word is a span of a
 * sentence and nothing more — so the id has to carry the course and the piece
 * rather than point at a primary key. Parsed server-side on the take route, for
 * the same reason the seed route parses its own: the booth has no login, so a
 * client's word for what it is recording is a suggestion.
 */
const QUARRY_LINE_PREFIX = 'quarry:'
function quarryLineId(courseCode, source, key) { return `${QUARRY_LINE_PREFIX}${courseCode}:${source}:${key}` }
function parseQuarryLineId(lineId) {
  const raw = String(lineId || '')
  if (!raw.startsWith(QUARRY_LINE_PREFIX)) return null
  const rest = raw.slice(QUARRY_LINE_PREFIX.length)
  const first = rest.indexOf(':')
  if (first <= 0) return null
  const courseCode = rest.slice(0, first)
  const after = rest.slice(first + 1)
  const second = after.indexOf(':')
  if (second <= 0) return null
  const source = after.slice(0, second)
  const key = after.slice(second + 1)
  if (!['lego', 'word'].includes(source) || !key) return null
  return { courseCode, source, key }
}

/**
 * Which POLICY voice, if any, this course casts to a given target/known slot.
 *
 * Read off voice_config.voices[role].voiceId and matched against the language's
 * policy voices (including their declared aliases), so a course naming an older
 * spelling still routes to the right person. Anything that is not a policy voice
 * — a TTS voice id, an empty string, a name nobody recognises — is NOT a human
 * recordist and returns null.
 */
function seedCastEntry(course, policyVoices) {
  const out = {}
  const voices = (course.voice_config && course.voice_config.voices) || {}
  for (const role of Object.keys(voices)) {
    const declared = String((voices[role] || {}).voiceId || '').trim()
    if (!declared) continue
    for (const entry of policyVoices) {
      const aliases = new Set(Array.isArray(entry.aliases) ? entry.aliases : [])
      if (entry.voiceId === declared || aliases.has(declared)) { out[role] = entry; break }
    }
  }
  return out
}

/** The language's policy voices, flattened to {voiceId, gender, dialect, aliases}. */
function policyVoiceList(policy) {
  const voices = (policy && policy.voices) || {}
  const out = []
  for (const slot of Object.keys(voices)) {
    const entry = voices[slot] || {}
    if (!entry.voiceId) continue
    out.push({
      voiceId: entry.voiceId,
      gender: String(entry.gender || slot.split(':')[0] || '').toLowerCase(),
      dialect: canonicalDialect(entry.dialect),
      aliases: Array.isArray(entry.aliases) ? entry.aliases : [],
    })
  }
  return out
}

/** Page through course_seeds for a set of courses. */
async function fetchSeeds(db, courseCodes) {
  if (!courseCodes.length) return []
  const PAGE = 1000
  const out = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('course_seeds')
      .select('id, course_code, seed_number, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id')
      .in('course_code', courseCodes)
      .order('course_code', { ascending: true })
      .order('seed_number', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`seed read failed: ${error.message}`)
    out.push(...(data || []))
    if ((data || []).length < PAGE) break
  }
  return out
}

/**
 * voice_id of each of a set of course_audio rows, in one paged read.
 *
 * PAGE is 100, not 500, and that is not a taste call. PostgREST echoes the
 * whole `id=in.(...)` filter back in a response header, so a page of 500 uuids
 * returns ~22KB of headers and undici rejects it with UND_ERR_HEADERS_OVERFLOW
 * ("TypeError: fetch failed") before any row is read. Welsh is the live case:
 * cym_n + cym_s carry 504 seed-clip ids between them, so the FIRST page failed
 * and the entire Welsh recordist queue 500'd. 100 uuids is ~4.5KB — well inside
 * the 16KB default with room for the rest of the response's headers.
 */
async function audioVoicesById(db, ids) {
  const wanted = [...new Set(ids.filter(Boolean))]
  const out = new Map()
  const PAGE = 100
  for (let i = 0; i < wanted.length; i += PAGE) {
    const { data, error } = await db
      .from('course_audio').select('id, voice_id').in('id', wanted.slice(i, i + PAGE))
    if (error) throw new Error(`seed clip voice read failed: ${error.message}`)
    for (const row of data || []) out.set(row.id, row.voice_id)
  }
  return out
}

async function buildLanguageLines(db, language, { quarryMaxSeed = DEFAULT_MAX_SEED } = {}) {
  const courses = await coursesForLanguage(db, language)
  const byCourse = new Map(courses.map((c) => [c.course_code, c]))
  const empty = { byBucket: new Map(), uncast: 0, duplicatesCollapsed: 0, courses: [...byCourse.keys()] }
  if (!courses.length) return empty

  const { data: pods, error: podErr } = await db
    .from('listening_pods')
    .select('id, course_code, slug')
    .in('course_code', [...byCourse.keys()])
  if (podErr) throw new Error(`pod list failed: ${podErr.message}`)
  const podById = new Map((pods || []).map((p) => [p.id, p]))
  // A language whose courses have no pods still has SEEDS (pdc_for_eng is the
  // live case: 668 seeds, no pod). Returning early here used to be safe because
  // pods were the only source; it is not any more.
  const sentences = podById.size ? await fetchAllSentences(db, [...podById.keys()]) : []

  // Deterministic and stable, oldest-needed first: course, then pod, then the
  // line's own order within the pod. The recordist's queue must not reshuffle
  // between two loads of the same page.
  sentences.sort((a, b) => {
    const pa = podById.get(a.pod_id), pb = podById.get(b.pod_id)
    return (pa.course_code).localeCompare(pb.course_code) ||
      String(pa.slug || pa.id).localeCompare(String(pb.slug || pb.id)) ||
      (a.global_order - b.global_order) ||
      String(a.id).localeCompare(String(b.id))
  })

  const byBucket = new Map()
  const seen = new Map()   // bucket -> Map(normalized text -> representative line)
  let uncast = 0
  let duplicatesCollapsed = 0

  for (const s of sentences) {
    const text = (s.target_text || '').trim()
    if (!text) continue
    const pod = podById.get(s.pod_id)
    const course = byCourse.get(pod.course_code)
    const entry = castEntryFor(course.voice_config && course.voice_config.podCast, s.speaker)
    const gender = entry && entry.gender ? String(entry.gender).toLowerCase() : null
    if (!gender) {
      // Never guessed, never silently dropped — surfaced as `uncast`.
      uncast += 1
      continue
    }
    // From the COURSE, never from the cast — the whole ruling in one line.
    const bucket = bucketKey(courseDialect(course), gender)
    if (!byBucket.has(bucket)) { byBucket.set(bucket, []); seen.set(bucket, new Map()) }
    const key = normalizeForDb(text)
    const seenForGender = seen.get(bucket)
    if (seenForGender.has(key)) {
      // One recording, not three. The duplicate is remembered against the
      // representative so a finished take can fill every course's pod.
      const rep = seenForGender.get(key)
      rep.duplicateOf.push({ sentenceId: s.id, podId: s.pod_id, courseCode: pod.course_code })
      // A want on ANY copy of this text wants the one recording that fills them
      // all — the collapse is by clip identity, so the flag has to collapse with
      // it or a want on cym_s's copy would be silently dropped.
      if (targetRerecordWanted(s)) rep.rerecordWanted = true
      duplicatesCollapsed += 1
      continue
    }
    const line = {
      id: s.id,
      podId: s.pod_id,
      order: s.global_order,
      text,
      knownText: s.known_text || null,
      speaker: s.speaker,
      courseCode: pod.course_code,
      textNormalized: key,
      duplicateOf: [],
      rerecordWanted: targetRerecordWanted(s),
    }
    seenForGender.set(key, line)
    byBucket.get(bucket).push(line)
  }

  // ── SECOND SOURCE: anything else that needs re-recording ──────────────────
  //
  // Tom, 2026-08-14: the 18 failing LEGO-narration clips should "just ride the
  // new queue's existing design, since it's content-type-agnostic by language
  // and voice role" — explicitly NOT a bespoke path on the old system.
  //
  // So a queue item is not "a pod sentence". It is "a piece of this language
  // that needs a human voice". course_audio.rerecord_wanted carries the second
  // kind: any clip of any content type — presentation narration, encouragement,
  // instruction, course audio — flagged as needing a new take.
  //
  // ROUTED BY REQUIRED VOICE, NOT BY AUTHORSHIP. Who recorded the original is
  // frequently unknowable (presentation narration is stored under the shared
  // untagged voice 'human'), but which voice the REPLACEMENT needs is always
  // known, and that is what rerecord_wanted.voice_gender states. Guessing at
  // authorship is how a clip gets filed under the wrong person.
  //
  // These deliberately share the dedupe map above: if a wanted re-record has the
  // same normalised text as a pod line, it is the same clip identity and one
  // take serves both.
  const wanted = await fetchRerecordWanted(db, [...byCourse.keys()])
  for (const w of wanted) {
    const text = (w.text || '').trim()
    if (!text) continue
    const gender = String(w.rerecord_wanted.voice_gender || '').toLowerCase()
    if (gender !== 'm' && gender !== 'f') {
      // No required voice stated — the one thing that would have to be guessed.
      uncast += 1
      continue
    }
    // A clip belongs to a course, and the course states the dialect. Nothing is
    // read off the clip itself: a presentation clip is stored under the shared
    // untagged voice 'human', so it carries no dialect of its own to trust.
    const course = byCourse.get(w.course_code)
    const bucket = bucketKey(courseDialect(course), gender)
    if (!byBucket.has(bucket)) { byBucket.set(bucket, []); seen.set(bucket, new Map()) }
    const key = normalizeForDb(text)
    const seenForGender = seen.get(bucket)
    if (seenForGender.has(key)) {
      // Same clip identity as a pod line already in the queue: the want belongs
      // to that line. This is the path that carries "re-record everything you
      // already recorded" — the text IS a live pod line, a take of it exists, and
      // without propagating the flag here finishQueue would score it recorded.
      const rep = seenForGender.get(key)
      rep.duplicateOf.push({ audioId: w.id, courseCode: w.course_code })
      rep.rerecordWanted = true
      if (!rep.rerecordReason && w.rerecord_wanted.reason) rep.rerecordReason = w.rerecord_wanted.reason
      duplicatesCollapsed += 1
      continue
    }
    const line = {
      id: w.id,
      podId: null,
      order: Number.MAX_SAFE_INTEGER,   // after the pod lines, stably
      text,
      knownText: null,
      speaker: null,
      courseCode: w.course_code,
      textNormalized: key,
      duplicateOf: [],
      // `kind` tells the surface how to READ this line. Narration text carries
      // <src>/<tgt> markup — it must be rendered, never read aloud as tags.
      kind: 'rerecord',
      role: w.role,
      rerecordWanted: true,
      rerecordReason: w.rerecord_wanted.reason || null,
    }
    seenForGender.set(key, line)
    byBucket.get(bucket).push(line)
  }

  // ---- THIRD SOURCE: SEED SENTENCES ---------------------------------------
  //
  // See point 7 in the header. A seed is a real audio unit with its own FK, it
  // is CAST from voice_config.voices rather than guessed at, and on a TEST
  // FIXTURE its known (English) side is recordable too.
  //
  // Collapsed by clip identity in their OWN namespace, per role. Two things
  // hang on that. Welsh has 668 seed rows carrying 306 distinct sentences, so
  // the collapse is most of the work: one take fills every copy. And a seed line
  // must NOT collapse into a pod line that happens to read the same, because a
  // pod take links a pod sentence FK and would leave the seed's own FK empty --
  // the two look identical on screen and are different rows to fill.
  const policy = (await loadPolicies(db)).find((row) => {
    try { return canonicalLanguage(row.language) === language } catch { return false }
  })
  const policyVoices = policyVoiceList(policy)
  if (policyVoices.length) {
    const seeds = await fetchSeeds(db, [...byCourse.keys()])
    const seedsByCourse = new Map()
    for (const seed of seeds) {
      if (!seedsByCourse.has(seed.course_code)) seedsByCourse.set(seed.course_code, [])
      seedsByCourse.get(seed.course_code).push(seed)
    }

    // One read for every clip a seed slot already points at, so "recorded" is
    // decided by the SLOT being filled by THIS voice -- not by "some clip of
    // this text exists somewhere", which is what the pod path can afford and a
    // seed cannot: a known-side take is filed under language 'eng' and would
    // never appear in a zzz recordist's own recorded-text set.
    const linkedIds = []
    for (const seed of seeds) {
      linkedIds.push(seed.known_audio_id, seed.target1_audio_id, seed.target2_audio_id)
    }
    const clipVoice = await audioVoicesById(db, linkedIds)

    const seedSeen = new Map()   // bucket -> Map(namespaced key -> representative)
    for (const [courseCode, course] of byCourse.entries()) {
      const cast = seedCastEntry(course, policyVoices)
      const roles = [...SEED_TARGET_ROLES]
      // The one exception, and it is checked here rather than trusted from a
      // client: a fixture course's KNOWN side is recordable.
      if (isTestFixtureCourse(courseCode)) roles.push('known')
      const courseSeeds = seedsByCourse.get(courseCode) || []
      if (!courseSeeds.length) continue

      for (const role of roles) {
        const voice = cast[role]
        if (!voice || !voice.gender) {
          // Not cast to a human recordist. Counted ONCE per (course, role) --
          // the uncast thing is the slot, not each of 668 sentences.
          uncast += 1
          continue
        }
        const bucket = bucketKey(courseDialect(course), voice.gender)
        if (!byBucket.has(bucket)) byBucket.set(bucket, [])
        if (!seedSeen.has(bucket)) seedSeen.set(bucket, new Map())
        const seenHere = seedSeen.get(bucket)

        for (const seed of courseSeeds) {
          const text = String((role === 'known' ? seed.known_text : seed.target_text) || '').trim()
          if (!text) continue
          const fkVoice = clipVoice.get(seed[`${role}_audio_id`]) || null
          const key = `${role} ${normalizeForDb(text)}`
          if (seenHere.has(key)) {
            const rep = seenHere.get(key)
            rep.duplicateOf.push({ seedId: seed.id, courseCode, role })
            // Recorded means EVERY copy's slot is filled by this voice. A rep
            // that is linked while its duplicate is not would otherwise read as
            // done and leave the duplicate empty for good.
            rep.seedFilledBy.push(fkVoice)
            duplicatesCollapsed += 1
            continue
          }
          const line = {
            id: seedLineId(seed.id, role),
            podId: null,
            // After every pod line and every wanted re-record, in seed order,
            // stably: a recordist's list must not reshuffle between loads.
            order: Number.MAX_SAFE_INTEGER,
            seedOrder: seed.seed_number,
            text,
            // The crib. On the known-side line the target is the crib, and on a
            // target line the known side is -- each says what the other is.
            knownText: role === 'known'
              ? (seed.target_text || null)
              : (seed.known_text || null),
            speaker: null,
            courseCode,
            textNormalized: normalizeForDb(text),
            duplicateOf: [],
            kind: 'seed',
            role,
            seedId: seed.id,
            seedNumber: seed.seed_number,
            seedFilledBy: [fkVoice],
            rerecordWanted: false,
          }
          seenHere.set(key, line)
          byBucket.get(bucket).push(line)
        }
      }
    }

    // ── THE MINIMAL PHRASE SET ──────────────────────────────────────────────
    // Tom, 2026-09-02: "ideally I just want the minimal phrase set, that I can
    // record so we can test the dice and splice approach."
    //
    // The smallest set of pieces that, spliced, regenerates every practice
    // phrase up to a seed ceiling: the covering LEGOs, plus the single words no
    // LEGO covers. Computed by services/voice-engine/lego-quarry.cjs, which is
    // also what the measurement report calls, so the count on the screen and
    // the count in the report cannot drift apart.
    //
    // TEST FIXTURES ONLY, and that gate is the point rather than caution. This
    // is an experiment about whether spliced audio is acceptable at all; Aran
    // and Catrin must not open their Welsh link tomorrow to find a section
    // nobody asked them to read. Same gate as the known-side exception.
    //
    // Cast like a seed's target1 — a quarry piece is target-side by
    // construction, and it belongs to whoever reads that course's target.
    for (const [courseCode, course] of byCourse.entries()) {
      if (!isTestFixtureCourse(courseCode)) continue
      const voice = seedCastEntry(course, policyVoices).target1
      if (!voice || !voice.gender) continue
      let quarry = null
      try {
        quarry = await buildLegoQuarry(db, courseCode, { maxSeed: quarryMaxSeed })
      } catch (err) {
        // A queue that 500s is a recordist who cannot record anything. The
        // minimal set is an addition to this screen, so it fails as an absence.
        console.warn(`[Recordist] minimal set unavailable for ${courseCode}: ${err.message}`)
        continue
      }
      if (!quarry) continue
      const bucket = bucketKey(courseDialect(course), voice.gender)
      if (!byBucket.has(bucket)) byBucket.set(bucket, [])

      quarry.pieces.forEach((piece, i) => {
        byBucket.get(bucket).push({
          id: quarryLineId(courseCode, piece.source, piece.key),
          podId: null,
          // Between the re-records and the seed sentences: it is new reading,
          // but it is the one thing Tom came here to do tonight.
          order: Number.MAX_SAFE_INTEGER - 1,
          // Longest first, preserved: the hardest reads happen while the voice
          // is fresh and the single words are the easy tail.
          seedOrder: i,
          text: piece.text,
          // A LEGO carries its own English; a fallback word is a span of a
          // sentence and has no gloss of its own. Nothing is invented for it.
          knownText: piece.knownText,
          speaker: null,
          courseCode,
          textNormalized: normalizeForDb(piece.text),
          duplicateOf: [],
          kind: 'quarry',
          role: 'target1',
          // THE SPEED. This is what stops the booth advancing off the line
          // while he is still mid-piece: a gapped read is full of pauses that
          // look exactly like the end of a take.
          readStyle: piece.readStyle,
          quarrySource: piece.source,
          legoId: piece.legoId,
          rerecordWanted: false,
        })
      })

      // The seed sentences of a fixture course are ALREADY in this queue as
      // 'seed' lines, read whole at natural pace — which is exactly the second
      // speed of the minimal set. They are not duplicated here.
    }

    // Seed lines sort after everything else, then by seed number, then by role
    // -- stable across reloads, which is the only property that matters here.
    for (const lines of byBucket.values()) {
      lines.sort((a, b) => (a.order - b.order) ||
        ((a.seedOrder || 0) - (b.seedOrder || 0)) ||
        String(a.role || '').localeCompare(String(b.role || '')) ||
        String(a.id).localeCompare(String(b.id)))
    }
  }

  return { byBucket, uncast, duplicatesCollapsed, courses: [...byCourse.keys()] }
}

/**
 * Clips flagged as needing a new take, for the given courses. Paged, because the
 * flag is deliberately not limited to any one content type and a bad day could
 * flag thousands.
 */
async function fetchRerecordWanted(db, courseCodes) {
  if (!courseCodes.length) return []
  const out = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('course_audio')
      .select('id, course_code, role, text, rerecord_wanted')
      .in('course_code', courseCodes)
      .not('rerecord_wanted', 'is', null)
      .order('course_code', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`rerecord_wanted read failed: ${error.message}`)
    const rows = (data || []).filter((r) => r && r.rerecord_wanted)
    out.push(...rows)
    if ((data || []).length < PAGE) break
  }
  return out
}

/**
 * Build the language-wide queue for one recordist.
 *
 * @param {object} db supabase client
 * @param {object} recordist from resolveRecordist()
 * @param {object} [opts]
 * @param {boolean} [opts.includeRecorded] keep already-recorded lines in `lines`
 *        (they are always counted; this only decides whether they are listed).
 * @returns {Promise<{lines: Array, total, recorded, remaining, uncast, duplicatesCollapsed}>}
 */
async function buildQueue(db, recordist, { includeRecorded = false, quarryMaxSeed } = {}) {
  const language = await buildLanguageLines(db, recordist.language, { quarryMaxSeed })
  const mine = language.byBucket.get(bucketKey(recordist.dialect, recordist.gender)) || []
  return finishQueue(db, recordist, mine, language, { includeRecorded })
}

/**
 * Score a gender's lines against what this recordist has already recorded, and
 * shape them for the wire. Split out so buildQueue and buildCoverage share one
 * definition of `recorded`.
 */
async function finishQueue(db, recordist, mine, language, { includeRecorded = false } = {}) {
  const recordedKeys = await recordedTextKeys(db, recordist)

  let recorded = 0
  const lines = []
  for (const line of mine) {
    // A SEED line is scored by its own SLOT, not by "a clip of this text exists".
    // Two reasons, both load-bearing. The known-side line is filed under the
    // course's KNOWN language ('eng'), so it can never appear in a zzz or cym
    // recordist's own recorded-text set and would read as outstanding forever.
    // And a seed's target1 and target2 are two different slots holding the same
    // words: a text-keyed check cannot tell the filled one from the empty one.
    // `seedFilledBy` carries the voice on every copy's FK, so the line is done
    // only when EVERY copy this take would fill is filled, by THIS voice.
    const hasTake = line.kind === 'seed'
      ? (line.seedFilledBy || []).length > 0 &&
        (line.seedFilledBy || []).every((v) => v && recordist.spellings.includes(v))
      // Both conventions on both sides — the queue's text and the stored key are
      // each widened, so neither spelling of the same sentence can hide the other.
      : audioKeyCandidates(line.text).some((k) => recordedKeys.has(k))
    // A wanted line is outstanding even though a take exists. The take is not
    // touched — it stays linked and playable, and the recordist can A/B it on
    // this very page — it simply stops counting as done.
    const isRecorded = hasTake && !line.rerecordWanted
    if (isRecorded) recorded += 1
    if (!isRecorded || includeRecorded) {
      lines.push({
        id: line.id,
        order: line.order,
        text: line.text,
        knownText: line.knownText,
        speaker: line.speaker,
        courseCode: line.courseCode,
        recorded: isRecorded,
        // Playback of the STORED bytes, never a local blob (route 3). Keyed off
        // hasTake, NOT isRecorded: a line queued for a re-record still has an
        // old take, and hearing it is the whole point of re-recording it.
        clipUrl: hasTake ? `/api/recording/voice/${encodeURIComponent(recordist.voiceId)}/line/${encodeURIComponent(line.id)}/clip` : null,
        // There is an existing take AND we are asking for it again — the surface
        // badges these as "re-record" rather than "not recorded yet", and it is
        // the flag the A/B preview hangs off.
        rerecordWanted: !!(hasTake && line.rerecordWanted),
        // How many other pod lines, in any course of this language, this one
        // recording also fills.
        alsoFills: line.duplicateOf.length,
        // What KIND of thing this is to read. 'pod' is dialogue; 'rerecord' is
        // any other content type flagged as needing a new take — narration,
        // encouragement, instruction. The surface needs this because narration
        // text carries <src>/<tgt> markup that must be RENDERED, never read
        // aloud as tags, and because a re-record deserves to say why.
        kind: line.kind || 'pod',
        role: line.role || null,
        rerecordReason: line.rerecordReason || null,
        // Which seed sentence this is, for the surface to say so in words. Null
        // on every other kind of line.
        seedNumber: line.seedNumber || null,
        // HOW THIS LINE IS READ. 'gapped' — naturally but slowly, with dead
        // space around the words so a cut lands in silence — or 'natural', a
        // whole sentence at speaking pace. The booth draws it AND acts on it:
        // a gapped read's pauses would otherwise trip auto-advance mid-piece.
        readStyle: line.readStyle || (line.kind === 'quarry' ? 'gapped' : 'natural'),
        // Which kind of quarry piece: a LEGO of the course, or a single word no
        // LEGO covers. Null on every other kind of line.
        quarrySource: line.quarrySource || null,
        // May the recordist rewrite this line's text from the booth? True only
        // on a test fixture, and the server checks it again on the write — this
        // is what the screen draws, never what the write trusts.
        // A SEED sentence is course content — its text is changed on the admin
        // side, under the content-change protocol. Saying so here rather than
        // only on the write is what stops the booth drawing an Edit button that
        // can only ever answer 403.
        // A quarry piece is a SPAN of course content, not a line of its own:
        // editing it here would edit nothing, so the booth is not offered it.
        canEditText: line.kind !== 'seed' && line.kind !== 'quarry' && isTestFixtureCourse(line.courseCode),
      })
    }
  }

  return {
    lines,
    total: mine.length,
    recorded,
    remaining: mine.length - recorded,
    uncast: language.uncast,
    duplicatesCollapsed: language.duplicatesCollapsed,
    courses: language.courses,
  }
}

/** Page through listening_pod_sentences — PostgREST caps a single read at 1000. */
async function fetchAllSentences(db, podIds) {
  const PAGE = 1000
  const out = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('listening_pod_sentences')
      .select('id, pod_id, global_order, speaker, target_text, known_text, target_audio_id, rerecord_wanted')
      .in('pod_id', podIds)
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`pod sentence read failed: ${error.message}`)
    out.push(...(data || []))
    if (!data || data.length < PAGE) break
  }
  return out
}

/**
 * Which of these texts this recordist has ALREADY recorded, as normalised keys.
 *
 * Matched on (language, voice_id) with the voice widened to every spelling
 * (see recordedSpellings), then reduced to normalised text keys in JS.
 * course_code is deliberately NOT part of this match: a Welsh line recorded
 * against cym_n_for_eng is recorded for Welsh.
 *
 * The filter is deliberately BROAD — the voice's whole body of work, not the
 * queue's texts. Asking `text_normalized IN (<every line>)` builds a query
 * string long enough to fail the request outright, and a human voice's clip
 * count is small by definition (this exists for languages we have no TTS for),
 * so one paged read is both cheaper and less brittle. Normalising each stored
 * key again on the way in makes the match reach both of the conventions that
 * column holds.
 */
async function recordedTextKeys(db, recordist) {
  const keys = new Set()
  const PAGE = 1000
  const page = (from) => db
    .from('course_audio')
    .select('text_normalized')
    .eq('language', recordist.language)
    .in('voice_id', recordist.spellings)
    .order('text_normalized')
    .range(from, from + PAGE - 1)

  for (let from = 0; ; from += PAGE) {
    let { data, error } = await page(from)
    // course_audio is ~2.5M rows and this read has been seen to lose a race
    // with the statement timeout on a cold cache (it plans at ~150ms warm).
    // One retry, because the failure mode otherwise is a recordist opening
    // their link to a broken page.
    if (error && /timeout/i.test(error.message || '')) {
      ;({ data, error } = await page(from))
    }
    if (error) throw new Error(`recorded lookup failed: ${error.message}`)
    for (const row of data || []) {
      for (const key of audioKeyCandidates(row.text_normalized)) keys.add(key)
    }
    if (!data || data.length < PAGE) break
  }
  return keys
}

/**
 * Per-language coverage for every human_only language: the bar Tom reads.
 * Built from the same derivation as the queues, so the numbers on the bar and
 * the numbers in a recordist's page can never disagree.
 */
async function buildCoverage(db) {
  const policies = await loadPolicies(db, { humanOnlyOnly: true })

  // CONCURRENTLY, because this is Tom's dashboard and it was costing him the
  // page. Done language-by-language it took 7.7s cold against the live estate —
  // inside the estate's own 8s statement budget by a hair, which is to say it
  // failed for whoever loaded it first with a cold cache. The languages share no
  // state, so the wall clock should be the slowest ONE, not the sum of all of
  // them. Same reasoning for the two voices inside a language.
  const out = await Promise.all(policies.map(async (policy) => {
    const voices = policy.voices || {}
    // ONE pass over the language's pods, whatever the cast size — and it runs
    // even when the language has no cast at all, which is the only way pdc's
    // and bre's uncast lines are visible rather than reported as a flat zero.
    const language = await buildLanguageLines(db, policy.language)

    const claimed = new Set()
    const perVoice = (await Promise.all(Object.keys(voices).map(async (slot) => {
      const recordist = await resolveRecordist(db, voices[slot].voiceId)
      if (!recordist) return null
      const bucket = bucketKey(recordist.dialect, recordist.gender)
      claimed.add(bucket)
      const q = await finishQueue(db, recordist, language.byBucket.get(bucket) || [], language, { includeRecorded: true })
      return {
        voiceId: recordist.voiceId,
        name: recordist.displayName,
        gender: recordist.gender,
        dialect: recordist.dialect,
        total: q.total,
        recorded: q.recorded,
      }
    }))).filter(Boolean)

    // Ordered so the bar does not reshuffle between two loads. Dialect first,
    // because a two-dialect language reads as two pairs, not four voices.
    perVoice.sort((a, b) =>
      String(a.dialect).localeCompare(String(b.dialect)) ||
      String(a.gender).localeCompare(String(b.gender)))

    // Lines that ARE cast to a gender, in a dialect this language has no voice
    // for. Before dialects existed these could not occur; now they are exactly
    // the Southern Welsh backlog, and counting them is what stops the fix from
    // hiding what it moved. They are NOT folded into `uncast`, which means
    // something different and narrower — no gender on the speaker at all.
    let unrouted = 0
    for (const [bucket, lines] of language.byBucket.entries()) {
      if (!claimed.has(bucket)) unrouted += lines.length
    }

    const total = perVoice.reduce((n, v) => n + v.total, 0)
    const recorded = perVoice.reduce((n, v) => n + v.recorded, 0)
    return {
      language: policy.language,
      languageName: languageName(policy.language),
      humanOnly: true,
      total,
      recorded,
      uncast: language.uncast,
      unrouted,
      pct: total ? Math.round((recorded / total) * 1000) / 10 : 0,
      voices: perVoice,
    }
  }))

  // Stable order for the dashboard.
  out.sort((a, b) => a.language.localeCompare(b.language))
  return out
}

/**
 * After a take lands: fill the SAME line in every other course of this language.
 *
 * The queue collapsed those lines into one recording, so this is the other half
 * of that promise — without it, cym_s pods stay silent while their recordist is
 * told the work is done. One course_audio row per affected course (course_code
 * IS part of a stored clip's identity on this estate) pointing at the SAME s3
 * object: one read, no re-render, no duplicate bytes.
 *
 * MAKE BEFORE BREAK: the take is already stored and verified by the time this
 * runs, nothing old is deleted, and each sentence's previous audio id is
 * returned so the move is reversible.
 */
async function propagateTakeToDuplicates({ db, recordist, sentenceId, text, s3Key, durationMs = null, fileSizeBytes = null, role = 'target1', logger = console }) {
  const textNormalized = normalizeForDb(text)
  const courses = await coursesForLanguage(db, recordist.language)
  const byCourse = new Map(courses.map((c) => [c.course_code, c]))
  if (!byCourse.size) return { linked: [], skipped: 0 }

  const { data: pods } = await db.from('listening_pods').select('id, course_code').in('course_code', [...byCourse.keys()])
  const podById = new Map((pods || []).map((p) => [p.id, p]))
  if (!podById.size) return { linked: [], skipped: 0 }

  const sentences = await fetchAllSentences(db, [...podById.keys()])
  const targets = sentences.filter((s) =>
    s.id !== sentenceId &&
    normalizeForDb((s.target_text || '').trim()) === textNormalized &&
    (() => {
      const course = byCourse.get(podById.get(s.pod_id).course_code)
      const entry = castEntryFor(course.voice_config && course.voice_config.podCast, s.speaker)
      if (!entry || String(entry.gender || '').toLowerCase() !== recordist.gender) return false
      // The same filter as the queue, for the same reason. The queue only ever
      // collapsed lines within one dialect, so this is the other half of that
      // promise: without it a Northern take would be filed straight into the
      // Southern pods it was deliberately never queued for.
      return courseDialect(course) === canonicalDialect(recordist.dialect)
    })()
  )

  const linked = []
  for (const s of targets) {
    const courseCode = podById.get(s.pod_id).course_code
    const row = {
      course_code: courseCode,
      text: text,
      text_normalized: textNormalized,
      language: recordist.language,
      role,
      voice_id: canonicalVoiceId(recordist.voiceId),
      origin: 'human',
      s3_key: s3Key,
      // Explicit: this upsert lands on the SAME clip identity as the take it
      // replaces, so an omitted column would leave the old row's want in place
      // and re-queue a line the recordist has just finished.
      rerecord_wanted: null,
    }
    if (durationMs) row.duration_ms = durationMs
    if (fileSizeBytes) row.file_size_bytes = fileSizeBytes
    const { data: audioRow, error: upsertErr } = await db
      .from('course_audio')
      .upsert(row, { onConflict: 'course_code,text_normalized,language,role,voice_id' })
      .select()
      .single()
    if (upsertErr) {
      logger.error(`[Recordist] propagation upsert failed for ${courseCode}/${s.id}: ${upsertErr.message}`)
      continue
    }
    const previous = s.target_audio_id || null
    const { error: linkErr } = await db
      .from('listening_pod_sentences')
      .update({ target_audio_id: audioRow.id })
      .eq('id', s.id)
    if (linkErr) {
      logger.error(`[Recordist] propagation link failed for ${s.id}: ${linkErr.message}`)
      continue
    }
    linked.push({ sentenceId: s.id, courseCode, audioId: audioRow.id, replacedAudioId: previous })
  }
  if (linked.length) {
    logger.log(`[Recordist] one take filled ${linked.length} duplicate line(s) in ${new Set(linked.map((l) => l.courseCode)).size} course(s)`)
  }
  return { linked, skipped: targets.length - linked.length }
}

/**
 * After a take lands: retire the wants it satisfies.
 *
 * The other half of rule 6. A want makes a line outstanding; without this the
 * line would stay outstanding forever, because the new take upserts onto the
 * SAME clip identity as the old one (propagateTakeToDuplicates' onConflict) and
 * would inherit its own re-record flag.
 *
 * Retired by CLIP IDENTITY, not by row id — the same reason the queue collapses
 * by identity in the first place. One take of a text satisfies every want on
 * that text across every course of the language, which is exactly what the
 * recordist was promised when the queue showed them the line once.
 *
 * MAKE BEFORE BREAK: called only after the take is stored and linked, and it
 * clears a flag rather than deleting anything. A failure here leaves a line
 * queued a second time — visible and harmless — so it never fails the take.
 */
/**
 * Point a seed's own audio slot at a take that ALREADY EXISTS -- and every
 * duplicate of that seed across the language, which is the other half of the
 * queue's collapse promise.
 *
 * MAKE-BEFORE-BREAK BY CONSTRUCTION. The course_audio row is filed by the upload
 * seam before this runs; nothing is deleted and nothing is unlinked. A slot
 * already pointing at ANOTHER voice's clip is left exactly as it is -- that
 * voice's course keeps working -- and only a slot that is empty, or already this
 * voice's own earlier take, moves.
 *
 * Why this is explicit rather than left to the audio_autolink trigger: the
 * trigger refuses to link when the course names no configured voice for the role
 * (audio_configured_voice), which is the case on cym_n_for_eng, where both
 * target slots are the empty string. Pod sentence FKs are re-pointed explicitly
 * for the same class of reason.
 *
 * @returns {Promise<{linked: Array<{seedId, courseCode, from}>}>}
 */
async function linkSeedTake({ db, recordist, seedId, role, audioId, logger = console }) {
  const out = { linked: [] }
  if (!audioId) return out

  const { data: seed, error: seedErr } = await db
    .from('course_seeds').select('id, course_code, known_text, target_text').eq('id', seedId).maybeSingle()
  if (seedErr) throw new Error(`seed read failed: ${seedErr.message}`)
  if (!seed) return out

  const text = String((role === 'known' ? seed.known_text : seed.target_text) || '').trim()
  if (!text) return out
  const key = normalizeForDb(text)

  const courses = await coursesForLanguage(db, recordist.language)
  const siblings = await fetchSeeds(db, courses.map((c) => c.course_code))
  const owners = new Map()
  const candidates = siblings.filter((row) => {
    const rowText = String((role === 'known' ? row.known_text : row.target_text) || '').trim()
    return rowText && normalizeForDb(rowText) === key
  })
  const held = candidates.map((row) => row[`${role}_audio_id`]).filter(Boolean)
  if (held.length) {
    const voices = await audioVoicesById(db, held)
    for (const [id, voice] of voices.entries()) owners.set(id, voice)
  }

  for (const row of candidates) {
    const current = row[`${role}_audio_id`]
    if (current === audioId) continue
    if (current && !recordist.spellings.includes(owners.get(current))) {
      // Somebody else's clip is in that slot. Not ours to move.
      logger.warn(`[Recordist] seed ${row.id} ${role} already holds ${owners.get(current) || 'an unknown voice'} -- left alone`)
      continue
    }
    const { error } = await db
      .from('course_seeds').update({ [`${role}_audio_id`]: audioId }).eq('id', row.id)
    if (error) { logger.error(`[Recordist] seed link failed for ${row.id}: ${error.message}`); continue }
    out.linked.push({ seedId: row.id, courseCode: row.course_code, from: current || null })
  }
  return out
}

async function clearRerecordWants({ db, recordist, text, sentenceId = null, logger = console }) {
  const keys = audioKeyCandidates(String(text || '').trim())
  const cleared = { clips: 0, sentences: 0 }
  if (!keys.length) return cleared

  // 1. The clip flag, for every course of this language and every spelling of
  //    this voice — the widened read, narrow write rule.
  const { data: clips, error: clipErr } = await db
    .from('course_audio')
    .select('id')
    .eq('language', recordist.language)
    .in('voice_id', recordist.spellings)
    .in('text_normalized', keys)
    .not('rerecord_wanted', 'is', null)
  if (clipErr) {
    logger.error(`[Recordist] want lookup failed: ${clipErr.message}`)
  } else if (clips && clips.length) {
    const { error } = await db
      .from('course_audio')
      .update({ rerecord_wanted: null })
      .in('id', clips.map((c) => c.id))
    if (error) logger.error(`[Recordist] clip want clear failed: ${error.message}`)
    else cleared.clips = clips.length
  }

  // 2. The pod line's own flag, on every copy of this line in the language.
  //    Only the 'target' key is dropped: a want on the known track belongs to
  //    the known-language (English) queue cast under __explainer__ and is not
  //    this recordist's to retire.
  const courses = await coursesForLanguage(db, recordist.language)
  const { data: pods } = await db
    .from('listening_pods').select('id').in('course_code', courses.map((c) => c.course_code))
  const podIds = (pods || []).map((p) => p.id)
  if (podIds.length) {
    const normalized = new Set(keys)
    const sentences = await fetchAllSentences(db, podIds)
    const hits = sentences.filter((s) =>
      s.rerecord_wanted && s.rerecord_wanted.target &&
      (s.id === sentenceId || audioKeyCandidates((s.target_text || '').trim()).some((k) => normalized.has(k))))
    for (const s of hits) {
      const { target: _retired, ...rest } = s.rerecord_wanted
      const next = Object.keys(rest).length ? rest : null
      const { error } = await db
        .from('listening_pod_sentences').update({ rerecord_wanted: next }).eq('id', s.id)
      if (error) logger.error(`[Recordist] line want clear failed for ${s.id}: ${error.message}`)
      else cleared.sentences += 1
    }
  }

  if (cleared.clips || cleared.sentences) {
    logger.log(`[Recordist] retired re-record wants: ${cleared.clips} clip(s), ${cleared.sentences} line(s)`)
  }
  return cleared
}

module.exports = {
  clearRerecordWants,
  isTestFixtureCourse,
  quarryLineId,
  parseQuarryLineId,
  targetRerecordWanted,
  languageName,
  loadPolicies,
  loadAliasMap,
  coursesForLanguage,
  resolveRecordist,
  voicesForEmail,
  recordedSpellings,
  castEntryFor,
  buildLanguageLines,
  linkSeedTake,
  seedCastEntry,
  policyVoiceList,
  parseSeedLineId,
  seedLineId,
  SEED_LINE_PREFIX,
  buildQueue,
  buildCoverage,
  recordedTextKeys,
  propagateTakeToDuplicates,
  tryCanonicalVoiceId,
}
