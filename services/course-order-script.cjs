// services/course-order-script.cjs
//
// THE COURSE, READ IN COURSE ORDER, ONE ITEM AT A TIME.
//
// Kai's ruling, 2026-08-21: a take recorded in this mode is filed and attached
// AS-IS as the audio for one item — no chunk extraction, no splicing, no
// alignment. That single decision is what makes this module exist rather than
// the coverage optimiser.
//
// The optimiser (tools/recording-optimizer/generate-recording-script.cjs) picks
// the FEWEST lines whose LEGO chunks can be spliced into everything else. Its
// 480 lines are only worth recording if the splicer then assembles the other
// ~11,400 items out of them. Take the splicing away and those 480 lines buy
// audio for 480 items and nothing more — the remaining items would stay
// TTS-voiced forever, and no amount of recording in that mode would ever reach
// them. So in this mode the reading list is the COURSE ITSELF:
//
//   for each seed, from seed 1 to the end:
//     the seed sentence
//     then, for each of its LEGOs in order:
//       the LEGO
//       then every practice phrase built on that LEGO, in position order
//
// That is Kai's sequence verbatim. Component rows are excluded: they are the
// per-sentence tiling glosses and are never played to a learner.
//
// Repeated text is read ONCE. The same target sentence can appear as a seed and
// again as a USE phrase; TTS renders such text once and links the one clip to
// every item that shares it (phase8 link_all_audio_ids), so reading it twice
// would ask the recordist for a second take that the same unique key
// (course_code, text_normalized, language, role, voice_id) would immediately
// collapse onto the first. First occurrence in course order wins.
//
// No I/O in buildCourseOrderItems — the ordering rules are testable without a
// database.

const { normalizeForAudio } = require('./shared/text-normalize.cjs')
const { voiceSpellings } = require('./shared/clip-identity-lookup.cjs')

// Component rows are tiling glosses, not learner-facing lines. Everything else
// a course carries (build, use, and any role added later) is read.
const SKIPPED_PHRASE_ROLES = new Set(['component'])

// Sort key for a seed's contents. The seed sentence is the sentence its LEGOs
// were cut from, so it reads first; then each LEGO, then the phrases built on
// it. Phrases with no lego_index sort after every LEGO of their seed rather
// than silently vanishing.
const NO_LEGO_INDEX = Number.MAX_SAFE_INTEGER

// The house estimate for a read: 6 seconds a line, the same rate the recording
// script endpoint has always quoted. Not measured per course — named, so a
// number on screen can be traced to it.
const SECONDS_PER_LINE = 6

/**
 * Order rows into Kai's reading sequence.
 *
 * @param {object} args
 * @param {Array} args.seeds   - course_seeds rows (id, seed_number, target_text, known_text)
 * @param {Array} args.legos   - course_legos rows (id, lego_id, seed_number, lego_index, target_text, known_text, type)
 * @param {Array} args.phrases - course_practice_phrases rows (id, seed_number, lego_index, position, phrase_role, target_text, known_text)
 * @returns {Array} items: { kind, itemId, seedNumber, legoIndex, position, target, known, legoId }
 */
function buildCourseOrderItems({ seeds = [], legos = [], phrases = [] } = {}) {
  const rows = []

  for (const s of seeds) {
    if (!s?.target_text) continue
    rows.push({
      kind: 'seed', itemId: s.id, seedNumber: s.seed_number ?? null,
      legoIndex: -1, position: -1,
      target: s.target_text, known: s.known_text || '', legoId: '',
    })
  }

  for (const l of legos) {
    if (!l?.target_text) continue
    rows.push({
      kind: 'lego', itemId: l.lego_id || l.id, seedNumber: l.seed_number ?? null,
      legoIndex: l.lego_index ?? NO_LEGO_INDEX, position: -1,
      target: l.target_text, known: l.known_text || '', legoId: l.lego_id || '',
    })
  }

  for (const p of phrases) {
    if (!p?.target_text) continue
    if (SKIPPED_PHRASE_ROLES.has(p.phrase_role)) continue
    rows.push({
      kind: 'phrase', itemId: p.id, seedNumber: p.seed_number ?? null,
      legoIndex: p.lego_index ?? NO_LEGO_INDEX, position: p.position ?? 0,
      target: p.target_text, known: p.known_text || '', legoId: p.lego_id || '',
      phraseRole: p.phrase_role || '',
    })
  }

  // seed → lego → (the LEGO itself before its phrases) → position.
  // A seed with no seed_number sorts last rather than jumping to the front,
  // which is what a null would do numerically.
  const seedKey = (r) => (r.seedNumber == null ? NO_LEGO_INDEX : r.seedNumber)
  rows.sort((a, b) =>
    seedKey(a) - seedKey(b) ||
    a.legoIndex - b.legoIndex ||
    a.position - b.position ||
    String(a.target).localeCompare(String(b.target))
  )

  // Read each distinct line once — see the header. The FIRST occurrence keeps
  // its own identity, which is the earliest item in the course that needs it.
  const seen = new Set()
  const items = []
  for (const r of rows) {
    const key = normalizeForAudio(r.target)
    if (!key || seen.has(key)) continue
    seen.add(key)
    items.push(r)
  }
  return items
}

/**
 * The recording burden at each of several seed volumes, in ONE pass over the
 * course.
 *
 * Tom, 2026-09-02: "I'd LIKE to do it for any SEED volume - i.e. 30 SEEDS,
 * 50/100/150/300 — just to see wha the scope was". The question behind it is
 * whether recording a community course is an afternoon or a week, so the answer
 * has to be in lines and minutes, not seeds.
 *
 * Counting a PREFIX of the whole-course item list gives exactly what
 * ?maxSeed=V returns: the cap filters rows by seed_number and the ordering is
 * by seed, so the deduped list under a cap is the prefix of the uncapped one.
 * That is what lets six volumes cost one load instead of six.
 *
 * @returns {Array<{maxSeed:number|null, seeds:number, legos:number,
 *   phrases:number, lines:number, estimatedMinutes:number}>}
 */
function buildVolumeBreakdown({ seeds = [], legos = [], phrases = [] } = {}, volumes = []) {
  const items = buildCourseOrderItems({ seeds, legos, phrases })
  const upTo = (rows, v) => rows.filter(r => v == null || (r.seed_number ?? Infinity) <= v).length

  return volumes.map((v) => {
    const lines = items.filter(i => v == null || (i.seedNumber ?? Infinity) <= v).length
    return {
      maxSeed: v == null ? null : v,
      seeds: upTo(seeds, v),
      legos: upTo(legos, v),
      // Component rows are tiling glosses and are never read — counting them
      // here would overstate the job by roughly a fifth.
      phrases: upTo(phrases.filter(p => !SKIPPED_PHRASE_ROLES.has(p.phrase_role)), v),
      lines,
      estimatedMinutes: Math.round((lines * SECONDS_PER_LINE) / 60),
    }
  })
}

/** Read-only: the volume breakdown for a course. */
async function loadVolumeBreakdown(supabase, courseCode, volumes) {
  return buildVolumeBreakdown(await fetchCourseRows(supabase, courseCode, null), volumes)
}

/**
 * Load the course and order it. Read-only.
 *
 * @param {object} supabase - an initialised supabase client
 * @param {string} courseCode
 * @param {object} opts
 * @param {number|null} opts.maxSeed - cap to seeds 1..N (null = whole course)
 * @param {string|null} opts.role - voice slot to build the script FOR
 * @param {string|null} opts.voiceId - the human voice recording that slot.
 *   Omitted, it is read from the course's own cast (voice_config.voices[role]).
 *   No cast voice = nothing is pruned; see fetchRecordedKeys.
 * @param {boolean} opts.excludeRecorded - drop lines this VOICE has recorded
 * @returns {{items, totalInCourse, alreadyRecorded, voiceId}} voiceId is the
 *   voice the count is ABOUT, so a caller can say whose it is — or that no
 *   voice is cast — rather than reporting a bare number.
 */
async function loadCourseOrderScript(supabase, courseCode, opts = {}) {
  const { maxSeed = null, role = 'target1', excludeRecorded = true } = opts

  const voiceId = opts.voiceId !== undefined
    ? opts.voiceId
    : await castVoiceId(supabase, courseCode, role)

  let items = buildCourseOrderItems(await fetchCourseRows(supabase, courseCode, maxSeed))
  const totalInCourse = items.length

  let alreadyRecorded = 0
  if (excludeRecorded) {
    const recorded = await fetchRecordedKeys(supabase, courseCode, role, voiceId)
    const before = items.length
    items = items.filter(i => !recorded.has(recordedKey(voiceId, i.target)))
    alreadyRecorded = before - items.length
  }

  return { items, totalInCourse, alreadyRecorded, voiceId }
}

/**
 * How much of this course this voice slot has already recorded — WITHOUT
 * building a script. Read-only, and deliberately independent of which reading
 * order the session is in: the number of lines in the can is a fact about the
 * course and the voice, not about the script the recordist happens to be
 * holding. That is what lets the coverage-order screen show the same count the
 * course-order screen shows, instead of showing nothing (Sascha, 2026-08-23:
 * a coverage-order screen with no already-recorded stat read as a fresh start
 * to someone who had 225 clips recorded).
 *
 * @returns {{ totalInCourse: number, alreadyRecorded: number, voiceId: string|null }}
 */
async function loadRecordedProgress(supabase, courseCode, opts = {}) {
  const { maxSeed = null, role = 'target1' } = opts
  const voiceId = opts.voiceId !== undefined
    ? opts.voiceId
    : await castVoiceId(supabase, courseCode, role)
  const [rows, recorded] = await Promise.all([
    fetchCourseRows(supabase, courseCode, maxSeed),
    fetchRecordedKeys(supabase, courseCode, role, voiceId),
  ])
  const items = buildCourseOrderItems(rows)
  let alreadyRecorded = 0
  for (const i of items) {
    if (recorded.has(recordedKey(voiceId, i.target))) alreadyRecorded++
  }
  return { totalInCourse: items.length, alreadyRecorded, voiceId }
}

/** The three content tables a course's reading list is built from. Read-only. */
async function fetchCourseRows(supabase, courseCode, maxSeed = null) {
  const cap = (q) => (maxSeed ? q.lte('seed_number', maxSeed) : q)
  const [seeds, legos, phrases] = await Promise.all([
    fetchAll(() => cap(supabase.from('course_seeds')
      .select('id, seed_number, target_text, known_text')
      .eq('course_code', courseCode))),
    fetchAll(() => cap(supabase.from('course_legos')
      .select('id, lego_id, seed_number, lego_index, type, target_text, known_text')
      .eq('course_code', courseCode))),
    fetchAll(() => cap(supabase.from('course_practice_phrases')
      .select('id, seed_number, lego_index, position, phrase_role, lego_id, target_text, known_text')
      .eq('course_code', courseCode))),
  ])
  return { seeds, legos, phrases }
}

/**
 * THE KEY IS (VOICE, TEXT). NOT TEXT.
 *
 * A recorded key names WHO read the line as well as WHAT the line was, so a
 * lookup cannot ask "is this text recorded" without naming a voice — which is
 * the shape of the bug this replaced. The old match was (course_code, role,
 * origin=human) alone, so ANY human clip in that slot counted as this
 * recordist's own work:
 *
 *   - cym_n_for_eng target2 was pruned by 6,375 `legacy_import` clips, so
 *     Aran's script showed the course as all but recorded when he had read 89
 *     lines of it;
 *   - cym_s_for_eng, which casts no human at all, was pruned by 6,685 more —
 *     a whole Southern course reading as recorded with not one Southern take
 *     in it;
 *   - and 152 of Aran's NORTHERN clips counted towards Catrin's target1 pool.
 *
 * A dialect is its own language on this estate. A take from one voice never
 * satisfies another's slot, and the only way to say that in a lookup is to put
 * the voice in the key.
 *
 * NO CAST VOICE = NOTHING IS PRUNED, and that is the honest answer rather than
 * a regression: nobody is recording that slot, so nobody has recorded any of
 * it. The rule that a screen must never tell a recordist they have recorded
 * nothing (Sascha, 2026-08-23) is about a recordist WITH clips — hers are filed
 * under her own voice_id and still prune, as do Kai's, Aran's, Catrin's and
 * Tom's. Only imports and other people's takes stop counting.
 *
 * Human origin only: a TTS clip is exactly what this session exists to replace.
 * Voice ids widen to every spelling a stored row may carry
 * (clip-identity-lookup) — the estate is mid-canonicalisation and a narrow read
 * loses real takes.
 */
async function fetchRecordedKeys(supabase, courseCode, role, voiceId) {
  if (!voiceId) return new Set()
  const rows = await fetchAll(() => supabase.from('course_audio')
    .select('text')
    .eq('course_code', courseCode)
    .eq('role', role)
    .eq('origin', 'human')
    .in('voice_id', voiceSpellings(voiceId)))
  const keys = new Set()
  for (const r of rows) {
    const k = recordedKey(voiceId, r.text)
    if (k) keys.add(k)
  }
  return keys
}

/**
 * One line, read by one voice. NUL-joined because neither a voice id nor a line
 * of course text can contain it, so no two different (voice, line) pairs
 * collide. Empty text gives '' so an empty key is never stored or looked up.
 */
function recordedKey(voiceId, text) {
  const k = normalizeForAudio(text)
  return k ? `${voiceId}\u0000${k}` : ''
}

/**
 * The human voice a course casts in a slot — the course's own answer to "whose
 * takes are these?", read from courses.voice_config.voices[role].
 *
 * Null when the course casts nobody there, or casts a synthetic voice: a TTS
 * voice has no takes to prune with, and pretending otherwise is how a slot ends
 * up "recorded" by a machine.
 */
async function castVoiceId(supabase, courseCode, role) {
  const { data, error } = await supabase.from('courses')
    .select('voice_config')
    .eq('course_code', courseCode)
    .maybeSingle()
  if (error) throw new Error(error.message)
  const entry = data && data.voice_config && data.voice_config.voices
    ? data.voice_config.voices[role]
    : null
  if (!entry || !entry.voiceId) return null
  if (entry.provider && String(entry.provider).toLowerCase() !== 'human') return null
  return entry.voiceId
}

/** Page through a supabase query — courses run to five figures of rows. */
async function fetchAll(makeQuery, pageSize = 1000) {
  const out = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await makeQuery().range(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    out.push(...(data || []))
    if (!data || data.length < pageSize) break
  }
  return out
}

module.exports = {
  buildCourseOrderItems,
  fetchRecordedKeys,
  recordedKey,
  castVoiceId,
  buildVolumeBreakdown,
  loadVolumeBreakdown,
  SECONDS_PER_LINE,
  loadCourseOrderScript,
  loadRecordedProgress,
  SKIPPED_PHRASE_ROLES
}
