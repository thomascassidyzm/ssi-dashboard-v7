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
 *   1. voiceId → (language, gender) from language_recording_policy.voices.
 *   2. every pod sentence in EVERY course whose canonicalLanguage(target_lang)
 *      is that language — cym_n_for_eng and cym_s_for_eng are one Welsh queue,
 *      not two.
 *   3. kept when the sentence's speaker maps, through that course's own
 *      voice_config.podCast, to the recordist's GENDER. Gender is the filter,
 *      not the voice id: a course cast naming human_aran_cym_s and a policy
 *      naming human_aran_cym_n are the same man reading Welsh.
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
 *
 * TARGET SIDE ONLY. The known side of every one of these courses is English,
 * 'eng' is not human_only, and so it never enters a queue. known_text rides
 * along on each line as the recordist's crib, never as something to record.
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
const langService = require('../language-code-service.cjs')

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
    .select('course_code, target_lang, known_lang, voice_config')
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
    for (const gender of Object.keys(voices)) {
      const entry = voices[gender] || {}
      if (!entry.voiceId) continue
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
 * Every pod line of a language, partitioned by the gender its course cast
 * names, collapsed by clip identity — computed ONCE per language.
 *
 * Both the recordist's queue and the coverage bar read this, so the number on
 * Tom's bar and the number on Aran's page cannot drift apart. It also means
 * `uncast` is what it actually is — a property of the LANGUAGE's pods, visible
 * even for a language that has no cast at all yet (bre, pdc), where every line
 * is uncast and the old per-voice loop would have reported a flat zero.
 *
 * @returns {Promise<{byGender: Map<string, Array>, uncast, duplicatesCollapsed, courses: string[]}>}
 */
async function buildLanguageLines(db, language) {
  const courses = await coursesForLanguage(db, language)
  const byCourse = new Map(courses.map((c) => [c.course_code, c]))
  const empty = { byGender: new Map(), uncast: 0, duplicatesCollapsed: 0, courses: [...byCourse.keys()] }
  if (!courses.length) return empty

  const { data: pods, error: podErr } = await db
    .from('listening_pods')
    .select('id, course_code, slug')
    .in('course_code', [...byCourse.keys()])
  if (podErr) throw new Error(`pod list failed: ${podErr.message}`)
  const podById = new Map((pods || []).map((p) => [p.id, p]))
  if (!podById.size) return empty

  const sentences = await fetchAllSentences(db, [...podById.keys()])

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

  const byGender = new Map()
  const seen = new Map()   // gender -> Map(normalized text -> representative line)
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
    if (!byGender.has(gender)) { byGender.set(gender, []); seen.set(gender, new Map()) }
    const key = normalizeForDb(text)
    const seenForGender = seen.get(gender)
    if (seenForGender.has(key)) {
      // One recording, not three. The duplicate is remembered against the
      // representative so a finished take can fill every course's pod.
      seenForGender.get(key).duplicateOf.push({ sentenceId: s.id, podId: s.pod_id, courseCode: pod.course_code })
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
    }
    seenForGender.set(key, line)
    byGender.get(gender).push(line)
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
    if (!byGender.has(gender)) { byGender.set(gender, []); seen.set(gender, new Map()) }
    const key = normalizeForDb(text)
    const seenForGender = seen.get(gender)
    if (seenForGender.has(key)) {
      seenForGender.get(key).duplicateOf.push({ audioId: w.id, courseCode: w.course_code })
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
      rerecordReason: w.rerecord_wanted.reason || null,
    }
    seenForGender.set(key, line)
    byGender.get(gender).push(line)
  }

  return { byGender, uncast, duplicatesCollapsed, courses: [...byCourse.keys()] }
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
async function buildQueue(db, recordist, { includeRecorded = false } = {}) {
  const language = await buildLanguageLines(db, recordist.language)
  const mine = language.byGender.get(recordist.gender) || []
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
    // Both conventions on both sides — the queue's text and the stored key are
    // each widened, so neither spelling of the same sentence can hide the other.
    const isRecorded = audioKeyCandidates(line.text).some((k) => recordedKeys.has(k))
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
        // Playback of the STORED bytes, never a local blob (route 3).
        clipUrl: isRecorded ? `/api/recording/voice/${encodeURIComponent(recordist.voiceId)}/line/${line.id}/clip` : null,
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
      .select('id, pod_id, global_order, speaker, target_text, known_text, target_audio_id')
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
  const out = []
  for (const policy of policies) {
    const voices = policy.voices || {}
    // ONE pass over the language's pods, whatever the cast size — and it runs
    // even when the language has no cast at all, which is the only way pdc's
    // and bre's uncast lines are visible rather than reported as a flat zero.
    const language = await buildLanguageLines(db, policy.language)
    const entry = {
      language: policy.language,
      languageName: languageName(policy.language),
      humanOnly: true,
      total: 0,
      recorded: 0,
      uncast: language.uncast,
      pct: 0,
      voices: [],
    }
    for (const gender of Object.keys(voices)) {
      const recordist = await resolveRecordist(db, voices[gender].voiceId)
      if (!recordist) continue
      const q = await finishQueue(db, recordist, language.byGender.get(recordist.gender) || [], language, { includeRecorded: true })
      entry.total += q.total
      entry.recorded += q.recorded
      entry.voices.push({
        voiceId: recordist.voiceId,
        name: recordist.displayName,
        gender: recordist.gender,
        total: q.total,
        recorded: q.recorded,
      })
    }
    entry.pct = entry.total ? Math.round((entry.recorded / entry.total) * 1000) / 10 : 0
    out.push(entry)
  }
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
      return entry && String(entry.gender || '').toLowerCase() === recordist.gender
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

module.exports = {
  languageName,
  loadPolicies,
  loadAliasMap,
  coursesForLanguage,
  resolveRecordist,
  recordedSpellings,
  castEntryFor,
  buildLanguageLines,
  buildQueue,
  buildCoverage,
  recordedTextKeys,
  propagateTakeToDuplicates,
  tryCanonicalVoiceId,
}
